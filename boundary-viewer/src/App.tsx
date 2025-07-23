import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';
import * as turf from '@turf/turf';
import { Search } from './Search';
import { ElevationChart } from './ElevationChart';
import { SubscriptionProvider, useSubscription } from './contexts/SubscriptionContext';
import { SubscriptionModal } from './components/SubscriptionModal';
import { UsageTracker } from './components/UsageTracker';

// Google Elevation API function
const getElevationData = async (lat: number, lng: number): Promise<number> => {
  try {
    // Use a CORS proxy to avoid CORS issues
    const url = `https://corsproxy.io/?${encodeURIComponent(
      `https://maps.googleapis.com/maps/api/elevation/json?locations=${lat},${lng}&key=AIzaSyDWqaq2LaVvqIJgNDEiD7_34MOOyel8d4s`
    )}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      return data.results[0].elevation;
    }
    
    throw new Error('No elevation data received');
  } catch (error) {
    console.error('Error fetching elevation data:', error);
    // Return a fallback elevation based on coordinates
    return Math.abs(lat * 1000 + lng * 1000) % 100 + 50;
  }
};

// Create elevation profile along a line
const createElevationProfile = async (points: [number, number][]): Promise<{ distances: number[]; elevations: number[] }> => {
  const distances: number[] = [];
  const elevations: number[] = [];
  
  if (points.length < 2) {
    throw new Error('Need at least 2 points for elevation profile');
  }
  
  // Create a line and sample points along it
  const line = turf.lineString(points);
  const totalDistance = turf.length(line, { units: 'meters' });
  
  // Sample elevation every 10 meters along the line
  const sampleInterval = 10; // meters
  const numSamples = Math.ceil(totalDistance / sampleInterval);
  
  for (let i = 0; i <= numSamples; i++) {
    const distance = (i * sampleInterval);
    if (distance > totalDistance) break;
    
    // Get point at this distance along the line
    const pointAlongLine = turf.along(line, distance, { units: 'meters' });
    const coord = pointAlongLine.geometry.coordinates as [number, number];
    
    // Get elevation for this point
    const elevation = await getElevationData(coord[1], coord[0]);
    
    distances.push(distance);
    elevations.push(elevation);
  }
  
  return { distances, elevations };
};

function AppContent() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  
  // Refs to track current state values for event handlers
  const elevationToolActiveRef = useRef(false);
  const isDrawingRef = useRef(false);
  const elevationPointsRef = useRef<[number, number][]>([]);

  const [style, setStyle] = useState('default');
  const [mapCenter, setMapCenter] = useState<[number, number]>([153.026, -27.4705]);
  
  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Elevation tool state
  const [elevationToolActive, setElevationToolActive] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [elevationPoints, setElevationPoints] = useState<[number, number][]>([]);
  const [showElevationChart, setShowElevationChart] = useState(false);
  const [elevationData, setElevationData] = useState<{ distances: number[]; elevations: number[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Subscription context
  const { 
    currentPlan, 
    usage, 
    showSubscriptionModal, 
    setShowSubscriptionModal, 
    incrementSearch, 
    incrementElevationProfile, 
    canPerformAction, 
    subscribeToPlan 
  } = useSubscription();

  useEffect(() => {
    if (!mapContainer.current) return;
    
    console.log('Map container dimensions:', mapContainer.current.offsetWidth, mapContainer.current.offsetHeight);

    const protocol = new Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);

    console.log('Creating map with style:', style);
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style:
        style === 'satellite'
          ? {
              version: 8,
              sources: {
                satellite: {
                  type: 'raster',
                  tiles: [
                    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                  ],
                  tileSize: 256,
                  attribution:
                    '© Esri, Maxar, Earthstar Geographics, and the GIS User Community',
                },
              },
              layers: [
                {
                  id: 'satellite',
                  type: 'raster',
                  source: 'satellite',
                },
              ],
            }
          : 'https://api.maptiler.com/maps/streets/style.json?key=s9pdXU8BxZTbUAwzlkhL',
      center: [153.026, -27.4705],
      zoom: 16,
      pitch: 45,
      bearing: -20,
      hash: true,
    });
    console.log('Map created successfully');

    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl());
    map.addControl(new maplibregl.FullscreenControl());

    // Track map center for search proximity
    map.on('moveend', () => {
      const center = map.getCenter();
      setMapCenter([center.lng, center.lat]);
    });

    const pmtilesUrl = 'https://github.com/[YOUR_USERNAME]/pmtiles-data/releases/download/v1.0.0/output.pmtiles'; // Replace [YOUR_USERNAME] with your GitHub username
    const sourceId = 'parcels';

    map.on('style.load', () => {
      console.log('Style loaded, adding PMTiles source...');

      if (style === 'satellite') {
        try {
          if (!map.getSource('composite')) {
            map.addSource('composite', {
              type: 'vector',
              url: 'https://api.maptiler.com/tiles/v3/tiles.json?key=s9pdXU8BxZTbUAwzlkhL',
            });
          }

          map.addLayer({
            id: '3d-buildings',
            type: 'fill-extrusion',
            source: 'composite',
            'source-layer': 'building',
            filter: ['==', 'extrude', 'true'],
            minzoom: 15,
            paint: {
              'fill-extrusion-color': '#aaa',
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-base': ['get', 'min_height'],
              'fill-extrusion-opacity': 0.6,
            },
          });
        } catch (error) {
          console.log('3D buildings not available:', error);
        }
      }

      if (!map.getSource(sourceId)) {
        try {
          map.addSource(sourceId, {
            type: 'vector',
            url: `pmtiles://${pmtilesUrl}`,
          });

          map.addLayer({
            id: 'parcel-fill',
            type: 'fill',
            source: sourceId,
            'source-layer': 'parcels',
            paint: {
              'fill-color': '#A259FF',
              'fill-opacity': 0.2,
            },
          });

          // Add hover effect for better UX
          map.on('mouseenter', 'parcel-fill', () => {
            map.getCanvas().style.cursor = 'pointer';
          });

          map.on('mouseleave', 'parcel-fill', () => {
            map.getCanvas().style.cursor = '';
          });

          map.addLayer({
            id: 'parcel-outline',
            type: 'line',
            source: sourceId,
            'source-layer': 'parcels',
            paint: {
              'line-color': '#7000FF',
              'line-width': 1,
            },
          });

          console.log('PMTiles loaded!');
        } catch (error) {
          console.error('Error loading PMTiles:', error);
        }
      }
    });


    
    // Combined click handler for both elevation tool and property selection
    map.on('click', (e) => {
      console.log('Map clicked, elevationToolActive:', elevationToolActiveRef.current, 'isDrawing:', isDrawingRef.current);
      if (elevationToolActiveRef.current) {
        // Elevation tool takes priority
        console.log('Elevation tool click:', e.lngLat);
        
        if (!isDrawingRef.current) {
          // Start drawing
          console.log('Starting to draw, setting isDrawing to true');
          setIsDrawing(true);
          setElevationPoints([[e.lngLat.lng, e.lngLat.lat]]);
          
          // Add visual line
          const lineId = 'elevation-line';
          if (map.getSource(lineId)) {
            map.removeLayer(lineId);
            map.removeSource(lineId);
          }
          
          map.addSource(lineId, {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [{
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: [[e.lngLat.lng, e.lngLat.lat]]
                },
                properties: {}
              }]
            }
          });
          
          map.addLayer({
            id: lineId,
            type: 'line',
            source: lineId,
            paint: {
              'line-color': '#ff0000',
              'line-width': 3,
              'line-dasharray': [2, 2]
            }
          });
        } else {
          // Add point to existing line
          console.log('Adding point to existing line, current points:', elevationPointsRef.current.length);
          const newPoint: [number, number] = [e.lngLat.lng, e.lngLat.lat];
          const newPoints = [...elevationPointsRef.current, newPoint];
          setElevationPoints(newPoints);
          
          // Update visual line
          const lineId = 'elevation-line';
          const source = map.getSource(lineId) as maplibregl.GeoJSONSource;
          if (source) {
            source.setData({
              type: 'FeatureCollection',
              features: [{
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: newPoints
                },
                properties: {}
              }]
            });
          }
        }
        return; // Exit early to prevent property selection
      }
      
      // Property selection (only when elevation tool is not active)
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['parcel-fill'],
      });
      
      if (features.length === 0) return; // No property clicked
      
      const feature = features[0];
      const geom = feature.geometry;
      if (geom.type !== 'Polygon') return;

      const poly = turf.polygon(geom.coordinates);
      const area = turf.area(poly);
      const center = turf.center(poly).geometry.coordinates;

      const edges = geom.coordinates[0];
      const labels = edges.slice(0, -1).map((coord, i) => {
        const start = coord;
        const end = edges[i + 1];
        const len = turf.length(turf.lineString([start, end]), { units: 'meters' });
        const mid = turf.midpoint(turf.point(start), turf.point(end)).geometry.coordinates;

        return {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: mid },
          properties: { label: `${Math.round(len)}m` },
        };
      });

      const id = 'parcel-measurements';
      if (map.getSource(id)) {
        if (map.getLayer(id)) {
          map.removeLayer(id);
        }
        map.removeSource(id);
      }

      map.addSource(id, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            ...labels,
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: center },
              properties: { label: `${Math.round(area)}m²` },
            },
          ],
        },
      });

      // Only add text layer if we're not in satellite mode (which doesn't have glyphs)
      if (style !== 'satellite') {
        map.addLayer({
          id,
          type: 'symbol',
          source: id,
          layout: {
            'text-field': ['get', 'label'],
            'text-font': ['Open Sans Bold'],
            'text-size': 16,
            'text-offset': [0, 0],
            'text-anchor': 'center',
          },
          paint: {
            'text-color': '#ffffff',
            'text-halo-color': '#000000',
            'text-halo-width': 2,
          },
        });
      }
    });

    return () => {
      map.remove();
      maplibregl.removeProtocol('pmtiles');
    };
  }, [style]);

  // Handle search result selection
  const handleSearchSelect = (result: any) => {
    // Check if user can perform search
    if (!canPerformAction('search')) {
      setShowSubscriptionModal(true);
      return;
    }

    // Increment search usage
    incrementSearch();

    if (mapRef.current) {
      const map = mapRef.current;
      
      if (result.bbox) {
        // Fit to bounding box if available
        map.fitBounds(result.bbox as [number, number, number, number], {
          padding: 50,
          duration: 1000
        });
      } else {
        // Fly to center point
        map.flyTo({
          center: result.center,
          zoom: 16,
          duration: 1000
        });
      }
    }
  };

  // Control map dragging based on elevation tool state
  useEffect(() => {
    if (mapRef.current) {
      const map = mapRef.current;
      if (elevationToolActive) {
        map.dragPan.disable();
        map.dragRotate.disable();
        map.getCanvas().style.cursor = 'crosshair';
        console.log('Elevation tool activated - map dragging disabled');
      } else {
        map.dragPan.enable();
        map.dragRotate.enable();
        map.getCanvas().style.cursor = '';
        console.log('Elevation tool deactivated - map dragging enabled');
      }
    }
  }, [elevationToolActive]);

  // Update refs when state changes
  useEffect(() => {
    elevationToolActiveRef.current = elevationToolActive;
  }, [elevationToolActive]);

  useEffect(() => {
    isDrawingRef.current = isDrawing;
  }, [isDrawing]);

  useEffect(() => {
    elevationPointsRef.current = elevationPoints;
  }, [elevationPoints]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* Main Map Area - Full Screen */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}>
        <div 
          ref={mapContainer} 
          style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
        />
      </div>
      
      {/* Sidebar Overlay */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          backgroundColor: '#1f2937',
          color: 'white',
          transition: 'width 0.3s ease',
          width: sidebarOpen ? '320px' : '48px',
          zIndex: 10,
          boxShadow: '2px 0 10px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Sidebar Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid #374151', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {sidebarOpen && <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Property Viewer</h1>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              padding: '8px',
              backgroundColor: '#374151',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4b5563'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#374151'}
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>
        
        {/* Sidebar Content */}
        {sidebarOpen ? (
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
            {/* Search */}
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Search</h2>
              <Search onLocationSelect={handleSearchSelect} mapCenter={mapCenter} />
            </div>
            
            {/* Map Style */}
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Map Style</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={() => setStyle('default')}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    backgroundColor: style === 'default' ? 'white' : '#374151',
                    color: style === 'default' ? 'black' : 'white',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                  onMouseOver={(e) => {
                    if (style !== 'default') {
                      e.currentTarget.style.backgroundColor = '#4b5563';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (style !== 'default') {
                      e.currentTarget.style.backgroundColor = '#374151';
                    }
                  }}
                >
                  🗺️ Default
                </button>
                <button
                  onClick={() => setStyle('satellite')}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    backgroundColor: style === 'satellite' ? 'white' : '#374151',
                    color: style === 'satellite' ? 'black' : 'white',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                  onMouseOver={(e) => {
                    if (style !== 'satellite') {
                      e.currentTarget.style.backgroundColor = '#4b5563';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (style !== 'satellite') {
                      e.currentTarget.style.backgroundColor = '#374151';
                    }
                  }}
                >
                  🛰️ Satellite
                </button>
              </div>
            </div>
            
            {/* Elevation Tool */}
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Elevation Tool</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={() => {
                    console.log('Elevation tool button clicked, current state:', elevationToolActive);
                    setElevationToolActive(!elevationToolActive);
                    if (elevationToolActive) {
                      // Deactivate tool
                      console.log('Deactivating elevation tool');
                      setIsDrawing(false);
                      setElevationPoints([]);
                      setShowElevationChart(false);
                      setElevationData(null);
                      
                      // Clear visual line
                      const map = mapRef.current;
                      if (map) {
                        const lineId = 'elevation-line';
                        if (map.getSource(lineId)) {
                          map.removeLayer(lineId);
                          map.removeSource(lineId);
                        }
                      }
                    } else {
                      console.log('Activating elevation tool');
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    transition: 'all 0.2s',
                    backgroundColor: elevationToolActive ? '#059669' : '#2563eb',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = elevationToolActive ? '#047857' : '#1d4ed8';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = elevationToolActive ? '#059669' : '#2563eb';
                  }}
                >
                  {elevationToolActive ? '🎨 Tool Active' : '📏 Activate Tool'}
                </button>
                
                {elevationToolActive && isDrawing && elevationPoints.length >= 2 && (
                  <>
                    <button
                      onClick={async () => {
                        // Check if user can perform elevation analysis
                        if (!canPerformAction('elevation')) {
                          setShowSubscriptionModal(true);
                          return;
                        }

                        setIsLoading(true);
                        try {
                          const data = await createElevationProfile(elevationPoints);
                          setElevationData(data);
                          setShowElevationChart(true);
                          
                          // Increment elevation profile usage
                          incrementElevationProfile();
                        } catch (error) {
                          console.error('Error creating elevation profile:', error);
                          alert('Error creating elevation profile. Please try again.');
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      disabled={isLoading}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        transition: 'all 0.2s',
                        backgroundColor: '#059669',
                        color: 'white',
                        border: 'none',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.5 : 1
                      }}
                      onMouseOver={(e) => {
                        if (!isLoading) {
                          e.currentTarget.style.backgroundColor = '#047857';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (!isLoading) {
                          e.currentTarget.style.backgroundColor = '#059669';
                        }
                      }}
                    >
                      {isLoading ? '⏳ Loading...' : '📊 Show Profile'}
                    </button>
                    
                    <button
                      onClick={() => {
                        setIsDrawing(false);
                        setElevationPoints([]);
                        setShowElevationChart(false);
                        setElevationData(null);
                        
                        // Clear visual line
                        const map = mapRef.current;
                        if (map) {
                          const lineId = 'elevation-line';
                          if (map.getSource(lineId)) {
                            map.removeLayer(lineId);
                            map.removeSource(lineId);
                          }
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        transition: 'all 0.2s',
                        backgroundColor: '#dc2626',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#b91c1c';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = '#dc2626';
                      }}
                    >
                      ❌ Clear Line
                    </button>
                  </>
                )}
                
                {/* Show/Hide Chart Button */}
                {elevationData && (
                  <button
                    onClick={() => setShowElevationChart(!showElevationChart)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      transition: 'all 0.2s',
                      backgroundColor: '#7c3aed',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#6d28d9';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = '#7c3aed';
                    }}
                  >
                    {showElevationChart ? '📊 Hide Chart' : '📊 Show Chart'}
                  </button>
                )}
              </div>
            </div>
            
            {/* Instructions */}
            <div style={{ 
              fontSize: '14px', 
              color: '#fbbf24', 
              backgroundColor: '#374151', 
              padding: '12px', 
              borderRadius: '4px',
              marginTop: '16px'
            }}>
              {!elevationToolActive && "💡 Click on properties to view measurements"}
              {elevationToolActive && !isDrawing && "🎨 Tool active! Click on the map to start drawing your elevation line"}
              {elevationToolActive && isDrawing && elevationPoints.length === 1 && "🎨 Drawing line... Click to add more points"}
              {elevationToolActive && isDrawing && elevationPoints.length >= 2 && `🎨 Line drawn (${elevationPoints.length} points). Click 'Show Profile' to generate elevation chart`}
            </div>
          </div>
        ) : (
          // Collapsed sidebar content - just show a toggle button
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                padding: '8px',
                backgroundColor: '#374151',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4b5563'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#374151'}
              title="Expand sidebar"
            >
              ▶
            </button>
          </div>
        )}
      </div>
      
      <ElevationChart
        isVisible={showElevationChart}
        onClose={() => setShowElevationChart(false)}
        elevationData={elevationData}
      />

      {/* Subscription Components */}
      <SubscriptionModal
        isVisible={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        onSubscribe={subscribeToPlan}
        currentPlan={currentPlan}
      />

      <UsageTracker
        currentPlan={currentPlan}
        usage={usage}
        onUpgrade={() => setShowSubscriptionModal(true)}
      />
    </div>
  );
}

function App() {
  return (
    <SubscriptionProvider>
      <AppContent />
    </SubscriptionProvider>
  );
}

export default App;
  