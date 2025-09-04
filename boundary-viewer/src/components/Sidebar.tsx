import React from 'react';
import { Search } from '../Search';

import { ThemeToggle } from './ui/theme-toggle';

interface SidebarProps {
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
  mapRef: React.MutableRefObject<any>;
  handleSearchSelect: (result: any) => void;
  clearPinpointMarker: () => void;
  createElevationProfile: (points: [number, number][]) => Promise<{ distances: number[]; elevations: number[] }>;
  canPerformAction: (action: "search" | "elevation" | "api") => boolean;
  setShowSubscriptionModal: (show: boolean) => void;
  incrementElevationProfile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
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

  mapRef,
  handleSearchSelect,
  clearPinpointMarker,
  createElevationProfile,
  canPerformAction,
  setShowSubscriptionModal,
  incrementElevationProfile
}) => {
  return (
    <div 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        height: '100%',
        backgroundColor: 'black',
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
            backgroundColor: 'black',
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
            <Search onLocationSelect={handleSearchSelect} />
            
            {/* Selected Location Display */}
            {selectedLocation && (
              <div style={{ marginTop: '12px' }}>
                <div style={{
                  padding: '8px 12px',
                  backgroundColor: '#059669',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: 'white',
                  marginBottom: '8px'
                }}>
                  📍 {selectedLocation.place_name}
                </div>
                <button
                  onClick={clearPinpointMarker}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    backgroundColor: '#dc2626',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '12px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                >
                  🗑️ Clear Marker
                </button>
              </div>
            )}
          </div>
          
          {/* Map Style */}
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Map Style</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Theme Toggle */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '8px 12px',
                backgroundColor: '#374151',
                borderRadius: '4px'
              }}>
                <span style={{ fontSize: '14px' }}>🌙 Dark Mode</span>
                <ThemeToggle 
                  isDark={style === 'dark'} 
                  onToggle={(isDark) => setStyle(isDark ? 'dark' : 'default')} 
                />
              </div>
              
              {/* Satellite Button */}
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
                    // Clear pinpoint marker when activating elevation tool
                    clearPinpointMarker();
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
  );
}; 