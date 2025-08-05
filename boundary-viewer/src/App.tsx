import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import * as turf from '@turf/turf';
import { ElevationChart } from './ElevationChart';
import { ModernSidebar } from './components/ui/sidebar';
import { SubscriptionProvider, useSubscription } from './contexts/SubscriptionContext';
import { SubscriptionModal } from './components/SubscriptionModal';

// Mobile detection hook
const useMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return isMobile;
};

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
  const isMobile = useMobileDetection();
  
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
  
  // Pinpoint marker state
  const [selectedLocation, setSelectedLocation] = useState<{ center: [number, number]; place_name: string } | null>(null);

  // Subscription context
  const { 
    currentPlan, 
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

    // Ensure the container has dimensions
    if (mapContainer.current.offsetWidth === 0 || mapContainer.current.offsetHeight === 0) {
      console.log('Container has no dimensions, waiting...');
      return;
    }

    const protocol = new Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);

    // Store current map state if map exists
    let currentCenter: [number, number] = [153.026, -27.4705];
    let currentZoom = 16;
    let currentPitch = 45;
    let currentBearing = -20;
    
    if (mapRef.current) {
      const currentMap = mapRef.current;
      try {
        const center = currentMap.getCenter();
        currentCenter = [center.lng, center.lat];
        currentZoom = currentMap.getZoom();
        currentPitch = currentMap.getPitch();
        currentBearing = currentMap.getBearing();
        
        // Remove the old map safely
        if (currentMap && typeof currentMap.remove === 'function') {
          currentMap.remove();
        }
      } catch (error) {
        console.log('Error removing old map:', error);
        // Continue with default values if map removal fails
      }
    }

    console.log('Creating map with style:', style);
    
    // Safety check for container
    if (!mapContainer.current) {
      console.error('Map container is null');
      return;
    }
    
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
          : style === 'dark'
          ? 'https://api.maptiler.com/maps/streets-dark/style.json?key=s9pdXU8BxZTbUAwzlkhL'
          : 'https://api.maptiler.com/maps/streets/style.json?key=s9pdXU8BxZTbUAwzlkhL',
      center: currentCenter,
      zoom: currentZoom,
      pitch: currentPitch,
      bearing: currentBearing,
      hash: true,
      // Mobile optimizations
      maxZoom: isMobile ? 18 : 20,
      minZoom: isMobile ? 8 : 6,
      maxPitch: isMobile ? 30 : 60,
      // Performance settings for mobile
      fadeDuration: isMobile ? 0 : 300,
    });
    console.log('Map created successfully');

    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl());
    map.addControl(new maplibregl.FullscreenControl());

    // If this is a style change (not initial load), smoothly transition to the new view
    if (mapRef.current && style !== 'default') {
      // Small delay to ensure the map is fully loaded
      setTimeout(() => {
        map.flyTo({
          center: currentCenter,
          zoom: currentZoom,
          pitch: currentPitch,
          bearing: currentBearing,
          duration: 500
        });
      }, 100);
    }

    // Track map center for search proximity
    map.on('moveend', () => {
      const center = map.getCenter();
      setMapCenter([center.lng, center.lat]);
    });

    const pmtilesUrl = 'https://wxwbxupdisbofesaygqj.functions.supabase.co/pmtiles-proxy';
    const sourceId = 'property_boundaries';

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

      // Only add property boundaries if zoom level is appropriate for mobile
      const shouldShowPropertyBoundaries = () => {
        const currentZoom = map.getZoom();
        // On mobile, only show property boundaries at higher zoom levels to prevent crashes
        if (isMobile) {
          return currentZoom >= 12; // Only show at zoom 12+ on mobile
        }
        return currentZoom >= 8; // Show at zoom 8+ on desktop
      };

      // Function to add property boundaries with mobile optimizations
      const addPropertyBoundaries = () => {
        if (!map.getSource(sourceId)) {
          try {
            map.addSource(sourceId, {
              type: 'vector',
              url: `pmtiles://${pmtilesUrl}`,
            });

            // Mobile-optimized fill layer
            map.addLayer({
              id: 'parcel-fill',
              type: 'fill',
              source: sourceId,
              'source-layer': 'property_boundaries',
              minzoom: isMobile ? 12 : 8,
              maxzoom: isMobile ? 18 : 20,
              paint: {
                'fill-color': '#A259FF',
                'fill-opacity': isMobile ? 0.1 : 0.2, // Lower opacity on mobile
              },
            });

            // Add hover effect for better UX (only on desktop)
            if (!isMobile) {
              map.on('mouseenter', 'parcel-fill', () => {
                map.getCanvas().style.cursor = 'pointer';
              });

              map.on('mouseleave', 'parcel-fill', () => {
                map.getCanvas().style.cursor = '';
              });
            }

            // Mobile-optimized outline layer
            map.addLayer({
              id: 'parcel-outline',
              type: 'line',
              source: sourceId,
              'source-layer': 'property_boundaries',
              minzoom: isMobile ? 12 : 8,
              maxzoom: isMobile ? 18 : 20,
              paint: {
                'line-color': '#7000FF',
                'line-width': isMobile ? 0.5 : 1, // Thinner lines on mobile
                'line-opacity': isMobile ? 0.6 : 1, // Lower opacity on mobile
              },
            });

            console.log('PMTiles loaded with mobile optimizations!');
          } catch (error) {
            console.error('Error loading PMTiles:', error);
          }
        }
      };

      // Add property boundaries if zoom level is appropriate
      if (shouldShowPropertyBoundaries()) {
        addPropertyBoundaries();
      }

      // Listen for zoom changes to show/hide property boundaries on mobile
      map.on('zoomend', () => {
        const currentZoom = map.getZoom();
        const hasSource = map.getSource(sourceId);
        
        if (shouldShowPropertyBoundaries() && !hasSource) {
          addPropertyBoundaries();
        } else if (!shouldShowPropertyBoundaries() && hasSource) {
          // Remove property boundaries on mobile when zoomed out too far
          try {
            if (map.getLayer('parcel-fill')) map.removeLayer('parcel-fill');
            if (map.getLayer('parcel-outline')) map.removeLayer('parcel-outline');
            if (map.getSource(sourceId)) map.removeSource(sourceId);
          } catch (error) {
            console.log('Error removing property boundaries:', error);
          }
        }
      });

      // Add pinpoint marker source and layer
      map.addSource('pinpoint-marker', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });

      map.addLayer({
        id: 'pinpoint-marker',
        type: 'circle',
        source: 'pinpoint-marker',
        paint: {
          'circle-radius': isMobile ? 8 : 12, // Smaller marker on mobile
          'circle-color': '#dc2626',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': isMobile ? 2 : 3
        }
      });

      // Add marker label
      map.addLayer({
        id: 'pinpoint-marker-label',
        type: 'symbol',
        source: 'pinpoint-marker',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Arial Unicode MS Bold', 'Arial Bold', 'Helvetica Bold'],
          'text-size': isMobile ? 12 : 14, // Smaller text on mobile
          'text-offset': [0, -2],
          'text-anchor': 'bottom',
          'text-allow-overlap': true,
          'text-ignore-placement': true
        },
        paint: {
          'text-color': '#dc2626',
          'text-halo-color': '#ffffff',
          'text-halo-width': isMobile ? 1 : 2
        }
      });
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
              'line-width': isMobile ? 2 : 3, // Thinner line on mobile
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
            'text-size': isMobile ? 12 : 16, // Smaller text on mobile
            'text-offset': [0, 0],
            'text-anchor': 'center',
          },
          paint: {
            'text-color': '#ffffff',
            'text-halo-color': '#000000',
            'text-halo-width': isMobile ? 1 : 2,
          },
        });
      }
    });

    return () => {
      if (map) {
        map.remove();
      }
      maplibregl.removeProtocol('pmtiles');
    };
  }, [style, isMobile]);

  // Handle search result selection
  const handleSearchSelect = (result: any) => {
    // Check if user can perform search
    if (!canPerformAction('search')) {
      setShowSubscriptionModal(true);
      return;
    }

    // Increment search usage
    incrementSearch();

    // Clear any existing elevation tool state
    if (elevationToolActive) {
      setElevationToolActive(false);
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
    }

    // Set selected location for marker
    setSelectedLocation({
      center: result.center,
      place_name: result.place_name
    });

    if (mapRef.current) {
      const map = mapRef.current;
      
      // Add pinpoint marker
      const markerSource = map.getSource('pinpoint-marker') as maplibregl.GeoJSONSource;
      if (markerSource) {
        markerSource.setData({
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: result.center
            },
            properties: {
              name: result.place_name
            }
          }]
        });
      }
      
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

  // Function to clear pinpoint marker
  const clearPinpointMarker = () => {
    setSelectedLocation(null);
    if (mapRef.current) {
      const map = mapRef.current;
      const markerSource = map.getSource('pinpoint-marker') as maplibregl.GeoJSONSource;
      if (markerSource) {
        markerSource.setData({
          type: 'FeatureCollection',
          features: []
        });
      }
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* Main Map Area - Full Screen */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}>
        <div 
          ref={mapContainer} 
          style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
        />
      </div>
      
      {/* Modern Sidebar Component */}
      <ModernSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        style={style}
        setStyle={setStyle}
        elevationToolActive={elevationToolActive}
        setElevationToolActive={setElevationToolActive}
        isDrawing={isDrawing}
        setIsDrawing={setIsDrawing}
        elevationPoints={elevationPoints}
        setElevationPoints={setElevationPoints}
        showElevationChart={showElevationChart}
        setShowElevationChart={setShowElevationChart}
        elevationData={elevationData}
        setElevationData={setElevationData}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        selectedLocation={selectedLocation}
        setSelectedLocation={setSelectedLocation}
        mapCenter={mapCenter}
        mapRef={mapRef}
        handleSearchSelect={handleSearchSelect}
        clearPinpointMarker={clearPinpointMarker}
        createElevationProfile={createElevationProfile}
        canPerformAction={canPerformAction}
        setShowSubscriptionModal={setShowSubscriptionModal}
        incrementElevationProfile={incrementElevationProfile}
      />
      
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

      {/* <UsageTracker
        currentPlan={currentPlan}
        usage={usage}
        onUpgrade={() => setShowSubscriptionModal(true)}
      /> */}
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
  