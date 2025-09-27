import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Trash2, 
  Ruler, 
  Satellite, 
  BarChart3, 
  Menu, 
  X, 
  Map, 
  Settings,
  Navigation,
  Download,
  Share2,
  Info,
  Activity,
  TrendingUp,
  Zap,
  Brain,
  Sparkles,
  DollarSign
} from 'lucide-react';
import { EnhancedButton } from './enhanced-button';
import { EnhancedCard } from './enhanced-card';
import { StatCard } from './enhanced-card';
import { EnhancedSearch } from './enhanced-search';

interface ModernSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  style: string;
  setStyle: (style: string) => void;
  elevationToolActive: boolean;
  setElevationToolActive: (active: boolean) => void;
  isDrawing: boolean;
  setIsDrawing: (drawing: boolean) => void;
  elevationPoints: [number, number][];
  setElevationPoints: (points: [number, number][]) => void;
  showElevationChart: boolean;
  setShowElevationChart: (show: boolean) => void;
  elevationData: { distances: number[]; elevations: number[] } | null;
  setElevationData: (data: { distances: number[]; elevations: number[] } | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  selectedLocation: { center: [number, number]; place_name: string } | null;
  setSelectedLocation: (location: { center: [number, number]; place_name: string } | null) => void;
  mapCenter: [number, number];
  mapRef: React.MutableRefObject<any>;
  handleSearchSelect: (result: any) => void;
  clearPinpointMarker: () => void;
  createElevationProfile: (
    points: [number, number][],
    stepMeters?: number,
    chunkSize?: number
  ) => Promise<{ distances: number[]; elevations: number[] }>;
  canPerformAction: (action: "search" | "elevation" | "api") => boolean;
  setShowSubscriptionModal: (show: boolean) => void;
  incrementElevationProfile: () => void;
  showAIDashboard: boolean;
  setShowAIDashboard: (show: boolean) => void;
  selectedProperty: any;
  setSelectedProperty: (property: any) => void;
  showPropertyValues: boolean;
  togglePropertyValues: () => void;
  parcelSelected: boolean;
}

export const ModernSidebar: React.FC<ModernSidebarProps> = ({
  sidebarOpen,
  setSidebarOpen,
  style,
  setStyle,
  elevationToolActive,
  setElevationToolActive,
  isDrawing,
  setIsDrawing,
  elevationPoints,
  setElevationPoints,
  showElevationChart,
  setShowElevationChart,
  elevationData,
  setElevationData,
  isLoading,
  setIsLoading,
  selectedLocation,
  mapCenter,
  mapRef,
  handleSearchSelect,
  clearPinpointMarker,
  createElevationProfile,
  canPerformAction,
  setShowSubscriptionModal,
  incrementElevationProfile,
  showAIDashboard,
  setShowAIDashboard,
  selectedProperty,
  setSelectedProperty,
  showPropertyValues,
  togglePropertyValues,
  parcelSelected
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    tools: true,
    layers: false,
    analytics: false,
  });
  const currentProfileAbort = useRef<AbortController | null>(null);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showMobileMenu && !target.closest('.mobile-menu-container')) {
        setShowMobileMenu(false);
      }
    };

    if (showMobileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMobileMenu]);


  const handleElevationToolToggle = () => {
    console.log('Elevation tool button clicked, current state:', elevationToolActive);
    setElevationToolActive(!elevationToolActive);
    if (elevationToolActive) {
      console.log('Deactivating elevation tool');
      setIsDrawing(false);
      setElevationPoints([]);
      setShowElevationChart(false);
      setElevationData(null);
      
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
      clearPinpointMarker();
    }
  };

  const handleGenerateProfile = async () => {
    if (!canPerformAction('elevation')) {
      setShowSubscriptionModal(true);
      return;
    }
    if (elevationPoints.length < 2) {
      alert('Add at least two points before generating a profile.');
      return;
    }

    currentProfileAbort.current?.abort();
    const controller = new AbortController();
    currentProfileAbort.current = controller;

    setIsLoading(true);
    try {
      const data = await createElevationProfile(elevationPoints, 5, 400);
      if (controller.signal.aborted) return;

      setElevationData(data);
      setShowElevationChart(true);
      incrementElevationProfile();
    } catch (error: any) {
      if (error?.name === 'AbortError') return;
      console.error('Error creating elevation profile:', error);
      alert(`Error creating elevation profile: ${error?.message ?? 'Please try again.'}`);
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  };

  const clearElevationLine = () => {
    setIsDrawing(false);
    setElevationPoints([]);
    setShowElevationChart(false);
    setElevationData(null);
    
    const map = mapRef.current;
    if (map) {
      const lineId = 'elevation-line';
      if (map.getSource(lineId)) {
        map.removeLayer(lineId);
        map.removeSource(lineId);
      }
    }
  };

  // Calculate elevation statistics
  const elevationStats = elevationData ? {
    totalDistance: elevationData.distances[elevationData.distances.length - 1] || 0,
    minElevation: Math.min(...elevationData.elevations),
    maxElevation: Math.max(...elevationData.elevations),
    avgElevation: elevationData.elevations.reduce((sum, elev) => sum + elev, 0) / elevationData.elevations.length,
    elevationGain: Math.max(...elevationData.elevations) - Math.min(...elevationData.elevations),
  } : null;

  return (
    <>
      {/* Logo - Only show on desktop */}
      {!isMobile && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginRight: '10px',
          backgroundColor: 'white',
          bottom: '10px',
          left: '10px',
          position: 'fixed',
          height: '45px',
          borderRadius: '52px',
          padding: '10px 16px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          zIndex: 1000,
        }}>
          <img 
            src="/looplet-dark.png" 
            alt="Looplet" 
            style={{
              width: '120px',
              height: 'auto',
            }} 
          />
        </div>
      )}

      {/* Enhanced Top Bar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: isMobile ? '64px' : '72px',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        padding: isMobile ? '0 16px' : '0 20px',
        backgroundColor: 'transparent',
        
      }}>
        
        {/* Mobile Menu Button */}
        {isMobile && (
          <EnhancedButton
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            variant="ghost"
            size="sm"
            style={{
              marginRight: '12px',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
            }}
          >
            {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
          </EnhancedButton>
        )}

        {/* Enhanced Search Bar */}
        <div style={{
          flex: 1,
          maxWidth: isMobile ? 'none' : '400px',
          position: 'relative',
          marginRight: isMobile ? '0' : '100px',
        }}>
          <EnhancedSearch 
            onLocationSelect={handleSearchSelect}
            placeholder="Search Queensland addresses..."
            showRecentSearches={true}
            maxSuggestions={6}
          />
        </div>

        {/* Enhanced Tools Section - Desktop Only */}
        {!isMobile && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginLeft: '20px'
          }}>
            {/* Map Style Toggle */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#f8f9fa',
              borderRadius: '24px',
              padding: '4px',
              border: '1px solid #e5e7eb',
            }}>
              <EnhancedButton
                onClick={() => setStyle('default')}
                variant={style === 'default' ? 'primary' : 'ghost'}
                size="sm"
                style={{
                  borderRadius: '20px',
                  minWidth: '80px',
                }}
              >
                <Map size={16} />
                Map
              </EnhancedButton>
              <EnhancedButton
                onClick={() => setStyle('satellite')}
                variant={style === 'satellite' ? 'primary' : 'ghost'}
                size="sm"
                style={{
                  borderRadius: '20px',
                  minWidth: '80px',
                }}
              >
                <Satellite size={16} />
                Satellite
              </EnhancedButton>
            </div>

            {/* Elevation Tool Button */}
            <EnhancedButton
              onClick={handleElevationToolToggle}
              variant={elevationToolActive ? 'success' : 'secondary'}
              size="md"
              icon={Ruler}
              style={{
                borderRadius: '24px',
                minWidth: '120px',
              }}
            >
              {elevationToolActive ? 'Active' : 'Elevation'}
            </EnhancedButton>

            {/* Floorplan 3D Button (show only when a parcel is selected) */}
            {/* {parcelSelected && (
              <EnhancedButton
                onClick={() => setShowFloorplanModal(true)}
                variant={"secondary"}
                size="md"
                icon={Layers}
                style={{
                  borderRadius: '24px',
                  minWidth: '140px',
                }}
              >
                Floorplan 3D
              </EnhancedButton>
            )} */}

            {/* AI Dashboard Button */}
            {/* <EnhancedButton
              onClick={() => {
                setSelectedProperty({
                  center: mapCenter,
                  elevationData: elevationData,
                  points: elevationPoints,
                  location: selectedLocation
                });
                setShowAIDashboard(true);
              }}
              variant="primary"
              size="md"
              icon={Brain}
              style={{
                borderRadius: '24px',
                minWidth: '120px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                color: 'white',
              }}
            >
              <Sparkles size={16} style={{ marginRight: '6px' }} />
              AI Insights
            </EnhancedButton> */}

            {/* Property Values Toggle Button */}
            {/* <EnhancedButton
              onClick={togglePropertyValues}
              variant={showPropertyValues ? 'success' : 'secondary'}
              size='md'
              icon={DollarSign}
              style={{
                borderRadius: '24px',
                minWidth: '120px',
              }}
            >
              {showPropertyValues ? 'Hide Values' : 'Show Values'}
            </EnhancedButton> */}

            {/* Settings Button */}
            {/* <EnhancedButton
              onClick={() => setSidebarOpen(!sidebarOpen)}
              variant="ghost"
              size="sm"
              icon={Settings}
              style={{
                borderRadius: '50%',
                backgroundColor: 'white',
                width: '40px',
                height: '40px',
              }}
            >
              Settings
            </EnhancedButton> */}
          </div>
        )}
      </div>

      {/* Enhanced Mobile Menu */}
      {isMobile && showMobileMenu && (
        <div 
          className="mobile-menu-container"
          style={{
            position: 'fixed',
            top: '64px',
            left: '16px',
            right: '16px',
            backgroundColor: 'white',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            zIndex: 1002,
            border: '1px solid #e5e7eb',
            padding: '20px',
            maxHeight: '80vh',
            overflowY: 'auto',
          }}
        >
          {/* Map Style Section */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
              Map Style
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <EnhancedButton
                onClick={() => {
                  setStyle('default');
                  setShowMobileMenu(false);
                }}
                variant={style === 'default' ? 'primary' : 'ghost'}
                size="sm"
                icon={Map}
                fullWidth
              >
                Default
              </EnhancedButton>
              <EnhancedButton
                onClick={() => {
                  setStyle('satellite');
                  setShowMobileMenu(false);
                }}
                variant={style === 'satellite' ? 'primary' : 'ghost'}
                size="sm"
                icon={Satellite}
                fullWidth
              >
                Satellite
              </EnhancedButton>
            </div>
          </div>

          {/* Tools Section */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
              Tools
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <EnhancedButton
                onClick={() => {
                  handleElevationToolToggle();
                  setShowMobileMenu(false);
                }}
                variant={elevationToolActive ? 'success' : 'secondary'}
                size="md"
                icon={Ruler}
                fullWidth
              >
                {elevationToolActive ? 'Deactivate' : 'Activate'} Elevation Tool
              </EnhancedButton>
              
              {/* Floorplan 3D removed (mobile) */}

              <EnhancedButton
                onClick={() => {
                  setSelectedProperty({
                    center: mapCenter,
                    elevationData: elevationData,
                    points: elevationPoints,
                    location: selectedLocation
                  });
                  setShowAIDashboard(true);
                  setShowMobileMenu(false);
                }}
                variant="primary"
                size="md"
                icon={Brain}
                fullWidth
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  color: 'white',
                }}
              >
                <Sparkles size={16} style={{ marginRight: '6px' }} />
                AI Insights Dashboard
              </EnhancedButton>
              
              <EnhancedButton
                onClick={() => {
                  togglePropertyValues();
                  setShowMobileMenu(false);
                }}
                variant={showPropertyValues ? 'success' : 'secondary'}
                size="md"
                icon={DollarSign}
                fullWidth
              >
                {showPropertyValues ? 'Hide Property Values' : 'Show Property Values'}
              </EnhancedButton>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
              Quick Actions
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <EnhancedButton
                variant="ghost"
                size="sm"
                icon={Share2}
                fullWidth
              >
                Share
              </EnhancedButton>
              <EnhancedButton
                variant="ghost"
                size="sm"
                icon={Download}
                fullWidth
              >
                Export
              </EnhancedButton>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Logo */}
      {isMobile && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          zIndex: 1000,
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}>
          <img 
            src="/looplet-dark.png" 
            alt="Looplet" 
            style={{
              width: '80px',
              height: 'auto',
            }} 
          />
        </div>
      )}

      {/* Mobile Elevation Controls */}
      {isMobile && elevationToolActive && isDrawing && elevationPoints.length >= 2 && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <EnhancedButton
            onClick={handleGenerateProfile}
            disabled={isLoading}
            loading={isLoading}
            variant="primary"
            size="md"
            icon={BarChart3}
            style={{
              borderRadius: '12px',
              minWidth: '160px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
          >
            {isLoading ? 'Loading...' : 'Show Profile'}
          </EnhancedButton>
          
          <EnhancedButton
            onClick={clearElevationLine}
            variant="danger"
            size="md"
            icon={Trash2}
            style={{
              borderRadius: '12px',
              minWidth: '160px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
          >
            Clear Line
          </EnhancedButton>
        </div>
      )}

      {/* Mobile Chart Toggle */}
      {isMobile && elevationData && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1000
        }}>
          <EnhancedButton
            onClick={() => setShowElevationChart(!showElevationChart)}
            variant="info"
            size="md"
            icon={BarChart3}
            style={{
              borderRadius: '12px',
              minWidth: '160px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
          >
            {showElevationChart ? 'Hide Chart' : 'Show Chart'}
          </EnhancedButton>
        </div>
      )}

      {/* Enhanced Desktop Sidebar */}
      {sidebarOpen && !isMobile && (
        <div style={{
          position: 'fixed',
          top: '72px',
          left: 0,
          width: '360px',
          height: 'calc(100vh - 72px)',
          backgroundColor: 'transparent',
          backdropFilter: 'none',
          zIndex: 999,
          overflowY: 'auto',
        }}>
          <div style={{ padding: '24px' }}>
            
            {/* Selected Location Card */}
            {selectedLocation && (
              <EnhancedCard
                title="Selected Location"
                subtitle={selectedLocation.place_name}
                icon={MapPin}
                variant="elevated"
                style={{ marginBottom: '20px' }}
              >
                <EnhancedButton
                  onClick={clearPinpointMarker}
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                  fullWidth
                >
                  Clear Marker
                </EnhancedButton>
              </EnhancedCard>
            )}

            {/* Elevation Tool Section */}
            {elevationToolActive && (
              <EnhancedCard
                title="Elevation Tool"
                subtitle={`${elevationPoints.length} points drawn`}
                icon={Ruler}
                variant="elevated"
                style={{ marginBottom: '20px' }}
              >
                {isDrawing && elevationPoints.length >= 2 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <EnhancedButton
                      onClick={handleGenerateProfile}
                      disabled={isLoading}
                      loading={isLoading}
                      variant="primary"
                      size="md"
                      icon={BarChart3}
                      fullWidth
                    >
                      {isLoading ? 'Generating...' : 'Generate Profile'}
                    </EnhancedButton>
                    
                    <EnhancedButton
                      onClick={clearElevationLine}
                      variant="danger"
                      size="md"
                      icon={Trash2}
                      fullWidth
                    >
                      Clear Line
                    </EnhancedButton>
                  </div>
                )}
                
                {elevationData && (
                  <EnhancedButton
                    onClick={() => setShowElevationChart(!showElevationChart)}
                    variant="info"
                    size="md"
                    icon={BarChart3}
                    fullWidth
                    style={{ marginTop: '12px' }}
                  >
                    {showElevationChart ? 'Hide Chart' : 'Show Chart'}
                  </EnhancedButton>
                )}

                {/* Instructions */}
                <div style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  backgroundColor: '#fef3c7',
                  padding: '12px',
                  borderRadius: '8px',
                  marginTop: '16px',
                  border: '1px solid #fbbf24',
                }}>
                  {!isDrawing && "Click on the map to start drawing your elevation line"}
                  {isDrawing && elevationPoints.length === 1 && "Click to add more points to your line"}
                  {isDrawing && elevationPoints.length >= 2 && `Line drawn (${elevationPoints.length} points). Click 'Generate Profile' to create chart`}
                </div>
              </EnhancedCard>
            )}

            {/* Elevation Statistics */}
            {elevationStats && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
                  Elevation Statistics
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <StatCard
                    title="Distance"
                    value={`${elevationStats.totalDistance.toFixed(1)}m`}
                    icon={Navigation}
                    color="blue"
                  />
                  <StatCard
                    title="Elevation Gain"
                    value={`${elevationStats.elevationGain.toFixed(1)}m`}
                    icon={TrendingUp}
                    color="green"
                  />
                  <StatCard
                    title="Min Elevation"
                    value={`${elevationStats.minElevation.toFixed(1)}m`}
                    icon={Activity}
                    color="yellow"
                  />
                  <StatCard
                    title="Max Elevation"
                    value={`${elevationStats.maxElevation.toFixed(1)}m`}
                    icon={Zap}
                    color="red"
                  />
                </div>
              </div>
            )}

            {/* General Instructions */}
            {/* {!elevationToolActive && (
              <EnhancedCard
                title="How to Use"
                subtitle="Interactive property boundary viewer"
                icon={Info}
                variant="filled"
              >
                <div style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.5' }}>
                  <p style={{ margin: '0 0 8px 0' }}>
                    • Click on properties to view measurements
                  </p>
                  <p style={{ margin: '0 0 8px 0' }}>
                    • Use the elevation tool to analyze terrain profiles
                  </p>
                  <p style={{ margin: '0' }}>
                    • Search for specific addresses in Queensland
                  </p>
                </div>
              </EnhancedCard>
            )} */}
          </div>
        </div>
      )}
    </>
  );
};