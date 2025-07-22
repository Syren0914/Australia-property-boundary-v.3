import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import MaplibreGeocoder from '@maplibre/maplibre-gl-geocoder';
import 'maplibre-gl/dist/maplibre-gl.css';
import '@maplibre/maplibre-gl-geocoder/dist/maplibre-gl-geocoder.css';
import { Protocol } from 'pmtiles';
import * as turf from '@turf/turf';

// Function to measure elevation between two points
const measureElevation = async (map: maplibregl.Map, pointA: [number, number], pointB: [number, number]) => {
  try {
    console.log('Starting elevation measurement...');
    
    // Calculate distance first (this should work)
    const distance = turf.distance(pointA, pointB, { units: 'meters' });
    console.log('Distance calculated:', distance);
    
    // Add line between points
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
            coordinates: [pointA, pointB]
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
    
    // Add measurement label
    const midPoint = turf.midpoint(pointA, pointB).geometry.coordinates;
    const labelId = 'elevation-label';
    if (map.getSource(labelId)) {
      map.removeLayer(labelId);
      map.removeSource(labelId);
    }
    
    map.addSource(labelId, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'Point', coordinates: midPoint },
          properties: {
            label: `Distance: ${Math.round(distance)}m`
          }
        }]
      }
    });
    
    map.addLayer({
      id: labelId,
      type: 'symbol',
      source: labelId,
      layout: {
        'text-field': ['get', 'label'],
        'text-font': ['Open Sans Bold'],
        'text-size': 14,
        'text-anchor': 'center'
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#000000',
        'text-halo-width': 2
      }
    });
    
    console.log('Basic measurement completed');
    
    // Try to get elevation data
    try {
      const responseA = await fetch(
        `https://api.maptiler.com/elevation/${pointA[1]},${pointA[0]}.json?key=s9pdXU8BxZTbUAwzlkhL`
      );
      const responseB = await fetch(
        `https://api.maptiler.com/elevation/${pointB[1]},${pointB[0]}.json?key=s9pdXU8BxZTbUAwzlkhL`
      );
      
      const dataA = await responseA.json();
      const dataB = await responseB.json();
      
      const elevationA = dataA.elevation[0];
      const elevationB = dataB.elevation[0];
      const elevationDiff = elevationB - elevationA;
      const slopePercent = (elevationDiff / distance) * 100;
      
      console.log(`Elevation data: A=${elevationA}m, B=${elevationB}m, Diff=${elevationDiff}m, Slope=${slopePercent.toFixed(1)}%`);
      
    } catch (elevationError) {
      console.log('Elevation API failed, showing distance only:', elevationError);
    }
    
  } catch (error) {
    console.error('Error in measurement:', error);
    alert('Error measuring distance. Please try again.');
  }
};

function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const [style, setStyle] = useState('default');
  const [elevationMode, setElevationMode] = useState(false);
  const [elevationPoints, setElevationPoints] = useState<[number, number][]>([]);

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
    map.on('click', (e) => {
      if (elevationMode) {
        const newPoint: [number, number] = [e.lngLat.lng, e.lngLat.lat];
        const updatedPoints = [...elevationPoints, newPoint];
        setElevationPoints(updatedPoints);

        // Add point marker
        const pointId = `elevation-point-${updatedPoints.length}`;
        map.addSource(pointId, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              geometry: { type: 'Point', coordinates: newPoint },
              properties: { label: `Point ${updatedPoints.length}` }
            }]
          }
        });

        map.addLayer({
          id: pointId,
          type: 'circle',
          source: pointId,
          paint: {
            'circle-radius': 8,
            'circle-color': '#ff0000',
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2
          }
        });

        // If we have 2 points, measure elevation
        if (updatedPoints.length === 2) {
          measureElevation(map, updatedPoints[0], updatedPoints[1]);
          setElevationMode(false);
          setElevationPoints([]);
        }
      }
    });

    map.on('click', 'parcel-fill', (e) => {
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
        map.removeLayer(id);
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
    });

    return () => {
      map.remove();
      maplibregl.removeProtocol('pmtiles');
    };
  }, [style]);

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
              setElevationMode(!elevationMode);
              setElevationPoints([]);
              if (elevationMode) {
                // Clear elevation markers when turning off
                const map = mapRef.current;
                if (map) {
                  ['elevation-point-1', 'elevation-point-2', 'elevation-line', 'elevation-label'].forEach(id => {
                    if (map.getLayer(id)) map.removeLayer(id);
                    if (map.getSource(id)) map.removeSource(id);
                  });
                }
              }
            }}
            className={`px-3 py-1 rounded ${elevationMode ? 'bg-green-600 text-white' : 'bg-gray-700'}`}
          >
            {elevationMode ? 'Cancel Elevation' : 'Measure Elevation'}
          </button>
        </div>
        {elevationMode && (
          <div className="mt-2 text-sm text-yellow-300">
            Click two points on the map to measure elevation difference
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
    </div>
  );
}

export default App;
  