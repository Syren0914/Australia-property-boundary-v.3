import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import * as turf from '@turf/turf';
import { EnhancedElevationChart } from './components/ui/enhanced-elevation-chart';
import { ModernSidebar } from './components/ui/enhanced-sidebar';
import { AIInsightDashboard } from './components/ui/ai-insight-dashboard';
import { SubscriptionProvider, useSubscription } from './contexts/SubscriptionContext';
import { SubscriptionModal } from './components/SubscriptionModal';
import { Analytics } from '@vercel/analytics/react';
import { usePropertyValueEstimator } from './services/property-value-estimator';

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

// DEV: hits Vite proxy → ArcGIS directly
async function getElevationsMultiDev(pointsLngLat: [number, number][]) {
  const params = new URLSearchParams({
    f: "json",
    geometry: JSON.stringify({ points: pointsLngLat, spatialReference: { wkid: 4326 } }),
    geometryType: "esriGeometryMultipoint",
    returnFirstValueOnly: "true",
    sampleCount: "1",
    pixelSize: JSON.stringify({ x: 1, y: 1, spatialReference: { wkid: 3857 } }),
    mosaicRule: JSON.stringify({ mosaicMethod: "NorthWest" }),
  });
  const url = `/arcgis/rest/services/Elevation/DEM_TimeSeries_AllUsers/ImageServer/getSamples?${params}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  if (!data?.samples) throw new Error("No samples (dev)");
  return data.samples.map((s: any) => Number(s.value));
}

// PROD: hits your Supabase edge function (POST)
async function getElevationsMultiProd(pointsLngLat: [number, number][]) {
  const url = import.meta.env.VITE_SUPABASE_FUNC_URL as string;
  if (!url) throw new Error("Missing VITE_SUPABASE_FUNC_URL env");

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ points: pointsLngLat }),
  });

  if (!resp.ok) throw new Error(`Proxy error ${resp.status}`);
  const data = await resp.json();
  if (!data?.samples) throw new Error("No samples (prod)");
  return data.samples.map((s: any) => Number(s.value));
}
// Dispatcher
async function getElevationsMulti(points: [number, number][]) {
  return import.meta.env.DEV
    ? getElevationsMultiDev(points)   // Vite proxy → ArcGIS (local dev)
    : getElevationsMultiProd(points); // Supabase function (prod)
}

// Public API: build a profile every N meters (default 5 m), batched
export async function createElevationProfile(
  lineLngLat: [number, number][],
  stepMeters = 5,
  chunkSize = 400
): Promise<{ distances: number[]; elevations: number[] }> {
  if (lineLngLat.length < 2) throw new Error("Need at least 2 points");

  const line = turf.lineString(lineLngLat);
  const totalKm = turf.length(line, { units: "kilometers" });
  const totalM = totalKm * 1000;

  const coords: [number, number][] = [];
  const distances: number[] = [];

  for (let d = 0; d <= totalM; d += stepMeters) {
    const pt = turf.along(line, d / 1000, { units: "kilometers" }) as any;
    const [lng, lat] = pt.geometry.coordinates as [number, number];
    coords.push([lng, lat]);
    distances.push(d);
  }

  const elevations: number[] = [];
  for (let i = 0; i < coords.length; i += chunkSize) {
    const chunk = coords.slice(i, i + chunkSize);
    const vals = await getElevationsMulti(chunk);
    elevations.push(...vals);
  }

  return { distances, elevations: movingAverage(elevations, 5) }; // light smoothing
}

function movingAverage(arr: number[], w: number) {
  if (w <= 1) return arr;
  const out: number[] = [];
  const half = Math.floor(w / 2);
  for (let i = 0; i < arr.length; i++) {
    let s = 0, c = 0;
    for (let j = i - half; j <= i + half; j++) {
      if (j >= 0 && j < arr.length) { s += arr[j]; c++; }
    }
    out.push(s / c);
  }
  return out;
}




function AppContent() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const isMobile = useMobileDetection();
  const { generateSampleData, estimateSingleProperty } = usePropertyValueEstimator();
  
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

  // AI Dashboard state
  const [showAIDashboard, setShowAIDashboard] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);

  // Property value overlay state
  const [showPropertyValues, setShowPropertyValues] = useState(false);
  const [propertyValueData, setPropertyValueData] = useState<any[]>([]);

  // Generate property value data for overlay
  const generatePropertyValueData = () => {
    // Use the property value estimator to generate realistic data
    const estimatedProperties = generateSampleData(mapCenter);
    setPropertyValueData(estimatedProperties);
  };

  // Toggle property value visibility
  const togglePropertyValues = () => {
    setShowPropertyValues(!showPropertyValues);
    if (mapRef.current) {
      const map = mapRef.current;
      const labelsLayer = map.getLayer('property-value-labels');
      const circlesLayer = map.getLayer('property-value-circles');
      
      if (labelsLayer && circlesLayer) {
        const visibility = !showPropertyValues ? 'visible' : 'none';
        map.setLayoutProperty('property-value-labels', 'visibility', visibility);
        map.setLayoutProperty('property-value-circles', 'visibility', visibility);
      }
    }
  };

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
      minZoom: isMobile ? 10 : 6,
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
        // On mobile, show property boundaries at zoom 10+ for better performance
        if (isMobile) {
          return currentZoom >= 10; // Show at zoom 10+ on mobile
        }
        return true; // Show at all zoom levels on desktop
      };
      
      // Always add property boundaries on desktop, regardless of zoom
      const shouldAlwaysAddOnDesktop = () => {
        return !isMobile; // Always add on desktop
      };

      // Function to add property value labels
      const addPropertyValueLabels = () => {
        if (!map.getSource('property-values')) {
          // Generate property value data
          generatePropertyValueData();
          
          // Create GeoJSON data for property value labels
          const propertyValueFeatures = propertyValueData.map(property => ({
            type: 'Feature' as const,
            geometry: {
              type: 'Point' as const,
              coordinates: property.center
            },
            properties: {
              id: property.id,
              value: property.value,
              area: property.area,
              type: property.type,
              formattedValue: `$${(property.value / 1000).toFixed(0)}k`
            }
          }));

          map.addSource('property-values', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: propertyValueFeatures
            }
          });

          // Add property value labels layer
          map.addLayer({
            id: 'property-value-labels',
            type: 'symbol',
            source: 'property-values',
            minzoom: 12, // Only show at higher zoom levels
            layout: {
              'text-field': ['get', 'formattedValue'],
              'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
              'text-size': [
                'interpolate',
                ['linear'],
                ['zoom'],
                12, 10,
                16, 14,
                20, 18
              ],
              'text-offset': [0, 0],
              'text-anchor': 'center',
              'text-allow-overlap': false,
              'text-ignore-placement': false
            },
            paint: {
              'text-color': '#ffffff',
              'text-halo-color': '#000000',
              'text-halo-width': 2,
              'text-halo-blur': 1
            }
          });

          // Add property value background circles
          map.addLayer({
            id: 'property-value-circles',
            type: 'circle',
            source: 'property-values',
            minzoom: 12,
            paint: {
              'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                12, 8,
                16, 12,
                20, 16
              ],
              'circle-color': [
                'case',
                ['==', ['get', 'type'], 'commercial'], '#ff6b35',
                ['==', ['get', 'type'], 'residential'], '#4ecdc4',
                '#95a5a6'
              ],
              'circle-opacity': 0.8,
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 2,
              'circle-stroke-opacity': 1
            }
          });

          // Set initial visibility
          if (!showPropertyValues) {
            map.setLayoutProperty('property-value-labels', 'visibility', 'none');
            map.setLayoutProperty('property-value-circles', 'visibility', 'none');
          }

          // Add click handler for property value labels
          map.on('click', 'property-value-labels', (e) => {
            const feature = e.features?.[0];
            if (feature && feature.geometry.type === 'Point') {
              const properties = feature.properties;
              const coordinates = (feature.geometry as any).coordinates;
              setSelectedProperty({
                id: properties?.id,
                value: properties?.value,
                area: properties?.area,
                type: properties?.type,
                center: coordinates
              });
              setShowAIDashboard(true);
            }
          });

          // Add hover effects
          map.on('mouseenter', 'property-value-labels', () => {
            map.getCanvas().style.cursor = 'pointer';
          });

          map.on('mouseleave', 'property-value-labels', () => {
            map.getCanvas().style.cursor = '';
          });
        }
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
             const fillLayerConfig: any = {
               id: 'parcel-fill',
               type: 'fill',
               source: sourceId,
               'source-layer': 'property_boundaries',
               minzoom: isMobile ? 10 : 6,
               paint: {
                 'fill-color': '#A259FF',
                 'fill-opacity': isMobile ? 0.1 : 0.2, // Lower opacity on mobile
               },
             };
             
             // Only add maxzoom for mobile
             if (isMobile) {
               fillLayerConfig.maxzoom = 18;
             }
             
             map.addLayer(fillLayerConfig);

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
             const outlineLayerConfig: any = {
               id: 'parcel-outline',
               type: 'line',
               source: sourceId,
               'source-layer': 'property_boundaries',
               minzoom: isMobile ? 10 : 7,
               paint: {
                 'line-color': '#7000FF',
                 'line-width': isMobile ? 0.5 : 1, // Thinner lines on mobile
                 'line-opacity': isMobile ? 0.6 : 1, // Lower opacity on mobile
               },
             };
             
             // Only add maxzoom for mobile
             if (isMobile) {
               outlineLayerConfig.maxzoom = 18;
             }
             
             map.addLayer(outlineLayerConfig);

            // Add property value labels layer
            addPropertyValueLabels();

            console.log('PMTiles loaded with mobile optimizations!');
          } catch (error) {
            console.error('Error loading PMTiles:', error);
          }
        }
      };

      // Add property boundaries if zoom level is appropriate
      console.log('Current zoom level:', map.getZoom(), 'isMobile:', isMobile);
      if (shouldShowPropertyBoundaries() || shouldAlwaysAddOnDesktop()) {
        console.log('Adding property boundaries...');
        addPropertyBoundaries();
      } else {
        console.log('Not adding property boundaries - zoom level too low');
      }

      // Listen for zoom changes to show/hide property boundaries on mobile
      map.on('zoomend', () => {
        const currentZoom = map.getZoom();
        const hasSource = map.getSource(sourceId);
        
        console.log('Zoom changed to:', currentZoom, 'isMobile:', isMobile, 'hasSource:', !!hasSource);
        
        if ((shouldShowPropertyBoundaries() || shouldAlwaysAddOnDesktop()) && !hasSource) {
          console.log('Adding property boundaries on zoom change...');
          addPropertyBoundaries();
        } else if (!shouldShowPropertyBoundaries() && !shouldAlwaysAddOnDesktop() && hasSource) {
          // Remove property boundaries on mobile when zoomed out too far
          console.log('Removing property boundaries on zoom change...');
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
        showAIDashboard={showAIDashboard}
        setShowAIDashboard={setShowAIDashboard}
        selectedProperty={selectedProperty}
        setSelectedProperty={setSelectedProperty}
        showPropertyValues={showPropertyValues}
        togglePropertyValues={togglePropertyValues}
      />
      
      <EnhancedElevationChart
        isVisible={showElevationChart}
        onClose={() => setShowElevationChart(false)}
        elevationData={elevationData}
      />

      {/* AI Insight Dashboard */}
      {showAIDashboard && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            width: '90%',
            height: '90%',
            backgroundColor: 'white',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden',
            position: 'relative',
          }}>
            <AIInsightDashboard
              selectedProperty={selectedProperty}
              elevationData={elevationData || undefined}
              mapCenter={mapCenter}
            />
            <button
              onClick={() => setShowAIDashboard(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#f3f4f6',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '18px',
                color: '#6b7280',
                zIndex: 1001,
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

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
      <Analytics />
    </SubscriptionProvider>
  );
}

export default App;
  