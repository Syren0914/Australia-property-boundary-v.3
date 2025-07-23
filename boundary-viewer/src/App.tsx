import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import MaplibreGeocoder from '@maplibre/maplibre-gl-geocoder';
import 'maplibre-gl/dist/maplibre-gl.css';
import '@maplibre/maplibre-gl-geocoder/dist/maplibre-gl-geocoder.css';
import { Protocol } from 'pmtiles';
import * as turf from '@turf/turf';
import { ElevationProfile } from './ElevationProfile';

// Function to create elevation profile between two points
const createElevationProfile = async (map: maplibregl.Map, pointA: [number, number], pointB: [number, number]) => {
  try {
    console.log('Creating elevation profile...');
    
    // Create a line between the two points
    const line = turf.lineString([pointA, pointB]);
    const distance = turf.length(line, { units: 'meters' });
    
    // Sample points along the line (every 20 meters to reduce API calls)
    const numSamples = Math.max(3, Math.floor(distance / 20));
    const distances: number[] = [];
    const elevations: number[] = [];
    const coordinates: [number, number][] = [];
    
    for (let i = 0; i <= numSamples; i++) {
      const fraction = i / numSamples;
      const point = turf.along(line, distance * fraction, { units: 'meters' });
      const coord = point.geometry.coordinates as [number, number];
      
      distances.push(distance * fraction);
      coordinates.push(coord);
    }
    
    // Rate limiting helper
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    // Try multiple elevation data providers with better error handling
    const getElevationData = async (lat: number, lng: number, attempt: number = 0): Promise<number> => {
      const providers = [
        // MapTiler (your current provider) - try first since it's your API key
        {
          url: `https://api.maptiler.com/elevation/${lat},${lng}.json?key=s9pdXU8BxZTbUAwzlkhL`,
          name: 'MapTiler',
          parser: (data: any) => data.elevation?.[0]
        },
        // Open-Elevation (free, global coverage) - with CORS workaround
        {
          url: `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`,
          name: 'Open-Elevation',
          parser: (data: any) => data.results?.[0]?.elevation,
          options: { 
            mode: 'cors' as RequestMode,
            headers: {
              'Accept': 'application/json'
            }
          }
        },
        // OpenTopoData (free, global coverage) - with CORS workaround
        {
          url: `https://api.opentopodata.org/v1/aster30m?locations=${lat},${lng}`,
          name: 'OpenTopoData',
          parser: (data: any) => data.results?.[0]?.elevation,
          options: { mode: 'cors' as RequestMode }
        }
      ];

      for (const provider of providers) {
        try {
          console.log(`Trying ${provider.name}...`);
          
          // Add delay between requests to avoid rate limiting
          if (attempt > 0) {
            await delay(1000 * attempt); // Exponential backoff
          }
          
          const response = await fetch(provider.url, provider.options || {});
          
          if (response.ok) {
            const data = await response.json();
            const elevation = provider.parser(data);
            
            if (elevation !== undefined && elevation !== null) {
              console.log(`✅ ${provider.name} succeeded: ${elevation}m`);
              return elevation;
            }
          } else if (response.status === 429) {
            console.log(`⚠️ ${provider.name} rate limited, will retry...`);
            if (attempt < 2) {
              await delay(2000); // Wait 2 seconds before retry
              return getElevationData(lat, lng, attempt + 1);
            }
          }
        } catch (error) {
          console.log(`❌ ${provider.name} failed:`, error instanceof Error ? error.message : 'Unknown error');
          continue;
        }
      }
      
      console.log('❌ All providers failed, using default elevation');
      return 0; // Default if all providers fail
    };

    try {
      console.log('Fetching elevation data along the path...');
      
      // Get elevation data for key points along the path with rate limiting
      const elevationResults: Array<{ index: number; elevation: number } | null> = [];
      
      for (let i = 0; i < coordinates.length; i++) {
        // Sample fewer points to avoid rate limiting
        if (i === 0 || i === coordinates.length - 1 || i % Math.max(3, Math.floor(coordinates.length / 5)) === 0) {
          console.log(`Fetching elevation for point ${i + 1}/${coordinates.length}`);
          const elevation = await getElevationData(coordinates[i][1], coordinates[i][0]);
          elevationResults.push({ index: i, elevation });
          
          // Add delay between requests to avoid rate limiting
          if (i < coordinates.length - 1) {
            await delay(500); // 500ms delay between requests
          }
        } else {
          elevationResults.push(null);
        }
      }
      
      const validResults = elevationResults.filter(result => result !== null);
      console.log(`Got elevation data for ${validResults.length} points along the path`);
      
      // Interpolate between the sampled points
      for (let i = 0; i < coordinates.length; i++) {
        // Find the nearest sampled points
        const beforeIndex = validResults.findIndex(result => result!.index >= i);
        const afterIndex = beforeIndex >= 0 ? beforeIndex : validResults.length - 1;
        const before = validResults[beforeIndex >= 0 ? beforeIndex : validResults.length - 1];
        const after = validResults[afterIndex];
        
        if (before && after && before.index !== after.index) {
          // Linear interpolation between two sampled points
          const fraction = (i - before.index) / (after.index - before.index);
          const interpolatedElevation = before.elevation + (after.elevation - before.elevation) * fraction;
          elevations.push(interpolatedElevation);
        } else if (before) {
          // Use the single available point
          elevations.push(before.elevation);
        } else {
          // Fallback to 0 if no data
          elevations.push(0);
        }
      }
      
      console.log(`Elevation range: ${Math.min(...elevations)}m to ${Math.max(...elevations)}m`);
      
    } catch (error) {
      console.log('All elevation providers failed, using flat profile');
      // If all providers fail, create a flat profile
      for (let i = 0; i < coordinates.length; i++) {
        elevations.push(0);
      }
    }
    
    // Add line to map
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
            coordinates: coordinates
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
        'line-color': '#00ff00',
        'line-width': 3,
        'line-dasharray': [2, 2]
      }
    });
    
    // Add start and end markers
    ['elevation-start', 'elevation-end'].forEach((id, index) => {
      if (map.getSource(id)) {
        map.removeLayer(id);
        map.removeSource(id);
      }
      
      const point = index === 0 ? pointA : pointB;
      map.addSource(id, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: { type: 'Point', coordinates: point },
            properties: { label: index === 0 ? 'Start' : 'End' }
          }]
        }
      });
      
      map.addLayer({
        id,
        type: 'circle',
        source: id,
        paint: {
          'circle-radius': 8,
          'circle-color': index === 0 ? '#ff0000' : '#0000ff',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2
        }
      });
    });
    
    console.log('Elevation profile data:', { distances, elevations });
    
    // Check if we got meaningful elevation data
    const hasElevationData = elevations.some(elev => elev > 0);
    
    if (!hasElevationData) {
      console.log('No elevation data available, showing distance profile only');
      // Create a simple distance profile with flat elevation
      const flatElevations = distances.map(() => 0);
      return { distances, elevations: flatElevations };
    }
    
    return { distances, elevations };
    
  } catch (error) {
    console.error('Error creating elevation profile:', error);
    alert('Error creating elevation profile. Please try again.');
    return null;
  }
};

function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const [style, setStyle] = useState('default');
  const [elevationMode, setElevationMode] = useState(false);
  const [elevationPoints, setElevationPoints] = useState<[number, number][]>([]);
  const [showElevationProfile, setShowElevationProfile] = useState(false);
  const [elevationData, setElevationData] = useState<{
    distances: number[];
    elevations: number[];
  } | null>(null);
  
  // Local variable for elevation points (accessible throughout the component)
  let elevationPointsLocal: [number, number][] = [];

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

    new (MaplibreGeocoder as any)({
      forwardGeocode: async (config: any) => {
        const response = await fetch(
          `https://api.maptiler.com/geocoding/${encodeURIComponent(config.query)}.json?key=s9pdXU8BxZTbUAwzlkhL`
        );
        const data = await response.json();
        return data.features || [];
      }
    }, map);

    const pmtilesUrl = 'output.pmtiles'; // ✅ From /public/output.pmtiles
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

    // Elevation measurement click handler
    let elevationPointsLocal: [number, number][] = [];
    
    map.on('click', async (e) => {
      if (elevationMode) {
        console.log('Elevation mode click detected');
        
        const newPoint: [number, number] = [e.lngLat.lng, e.lngLat.lat];
        elevationPointsLocal.push(newPoint);
        const pointIndex = elevationPointsLocal.length;
        
        console.log(`Adding point ${pointIndex}:`, newPoint);
        console.log('Current points:', elevationPointsLocal);

        // Add point marker with unique ID
        const pointId = `elevation-point-${Date.now()}-${pointIndex}`;
        
        // Check if source already exists and remove it
        if (map.getSource(pointId)) {
          map.removeLayer(pointId);
          map.removeSource(pointId);
        }
        
        map.addSource(pointId, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              geometry: { type: 'Point', coordinates: newPoint },
              properties: { label: `Point ${pointIndex}` }
            }]
          }
        });

        map.addLayer({
          id: pointId,
          type: 'circle',
          source: pointId,
          paint: {
            'circle-radius': 8,
            'circle-color': pointIndex === 1 ? '#ff0000' : '#0000ff',
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2
          }
        });

        // Update React state
        setElevationPoints([...elevationPointsLocal]);

        // If we have 2 points, create elevation profile
        if (elevationPointsLocal.length === 2) {
          console.log('Creating elevation profile with 2 points');
          const profileData = await createElevationProfile(map, elevationPointsLocal[0], elevationPointsLocal[1]);
          if (profileData) {
            console.log('Profile data received, showing chart');
            setElevationData(profileData);
            setShowElevationProfile(true);
            console.log('Chart should now be visible');
          } else {
            console.log('No profile data received');
          }
          setElevationMode(false);
          elevationPointsLocal = [];
          setElevationPoints([]);
        }
      }
    });

    // Property click handler (only when not in elevation mode)
    map.on('click', 'parcel-fill', (e) => {
      if (elevationMode) return; // Skip if in elevation mode
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['parcel-fill'],
      });

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

    // Add keyboard listener to cancel elevation mode with Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && elevationMode) {
        setElevationMode(false);
        setElevationPoints([]);
        elevationPointsLocal = [];
        // Clear markers
        const map = mapRef.current;
        if (map) {
          const layerIds = map.getStyle().layers?.map(layer => layer.id) || [];
          const sourceIds = Object.keys(map.getStyle().sources || {});
          
          layerIds.forEach(id => {
            if (id.includes('elevation-point-') || id.includes('elevation-line') || id.includes('elevation-start') || id.includes('elevation-end')) {
              try {
                map.removeLayer(id);
              } catch (e) {
                console.log('Layer already removed:', id);
              }
            }
          });
          
          sourceIds.forEach(id => {
            if (id.includes('elevation-point-') || id.includes('elevation-line') || id.includes('elevation-start') || id.includes('elevation-end')) {
              try {
                map.removeSource(id);
              } catch (e) {
                console.log('Source already removed:', id);
              }
            }
          });
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      map.remove();
      maplibregl.removeProtocol('pmtiles');
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [style, elevationMode]);

  return (
    <div className="w-screen h-screen flex flex-col">
      <div className="p-4 bg-gray-800 text-white z-10 relative">
        <h1 className="text-2xl font-bold">Property Viewer</h1>
        <div className="mt-2 space-x-2">
          <button
            onClick={() => setStyle('default')}
            className={`px-3 py-1 rounded ${style === 'default' ? 'bg-white text-black' : 'bg-gray-700'}`}
          >
            Default
          </button>
          <button
            onClick={() => setStyle('satellite')}
            className={`px-3 py-1 rounded ${style === 'satellite' ? 'bg-white text-black' : 'bg-gray-700'}`}
          >
            Satellite
          </button>
          <button
            onClick={() => {
              if (elevationMode) {
                // Cancel elevation mode
                setElevationMode(false);
                setElevationPoints([]);
                // Clear elevation markers
                const map = mapRef.current;
                if (map) {
                  // Remove all elevation-related layers and sources
                  const layerIds = map.getStyle().layers?.map(layer => layer.id) || [];
                  const sourceIds = Object.keys(map.getStyle().sources || {});
                  
                  layerIds.forEach(id => {
                    if (id.includes('elevation-point-') || id.includes('elevation-line') || id.includes('elevation-start') || id.includes('elevation-end')) {
                      try {
                        map.removeLayer(id);
                      } catch (e) {
                        console.log('Layer already removed:', id);
                      }
                    }
                  });
                  
                  sourceIds.forEach(id => {
                    if (id.includes('elevation-point-') || id.includes('elevation-line') || id.includes('elevation-start') || id.includes('elevation-end')) {
                      try {
                        map.removeSource(id);
                      } catch (e) {
                        console.log('Source already removed:', id);
                      }
                    }
                  });
                }
                // Reset local points array
                elevationPointsLocal = [];
              } else {
                // Start elevation mode
                setElevationMode(true);
                setElevationPoints([]);
              }
            }}
            className={`px-3 py-1 rounded ${elevationMode ? 'bg-red-600 text-white' : 'bg-gray-700'}`}
          >
            {elevationMode ? 'Cancel Elevation' : 'Elevation Profile'}
          </button>
        </div>
        {elevationMode && (
          <div className="mt-2 text-sm text-yellow-300">
            {elevationPoints.length === 0 && "Click two points on the map to create an elevation profile"}
            {elevationPoints.length === 1 && "Click the second point to complete the elevation profile"}
            {elevationPoints.length === 2 && "Creating elevation profile..."}
          </div>
        )}
      </div>
      <div className="flex-1 relative">
        <div 
          ref={mapContainer} 
          className="absolute inset-0 w-full h-full" 
          style={{ width: '100%', height: '100%', minHeight: '400px' }}
        />
      </div>
      
      <ElevationProfile
        isVisible={showElevationProfile}
        onClose={() => setShowElevationProfile(false)}
        elevationData={elevationData}
      />
    </div>
  );
}

export default App;
  