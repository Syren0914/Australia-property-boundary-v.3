import React from 'react';
import { Search } from '../../Search';
import { ThemeToggle } from './theme-toggle';
import { MapPin, Trash2, Ruler, Satellite, BarChart3 } from 'lucide-react';

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
  createElevationProfile: (points: [number, number][]) => Promise<{ distances: number[]; elevations: number[] }>;
  canPerformAction: (action: "search" | "elevation" | "api") => boolean;
  setShowSubscriptionModal: (show: boolean) => void;
  incrementElevationProfile: () => void;
}

export const ModernSidebar: React.FC<ModernSidebarProps> = ({
  sidebarOpen,

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
  incrementElevationProfile
}) => {
  return (
    <>
      {/* Top Bar - Google Maps Style */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '64px',
        
        
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        
      }}>
        {/* Menu Button */}
        <img src="/looplet-dark.png" alt="Looplet" style={{width:'160px', marginRight:'10px', display: style === 'dark' ? 'none' : 'block'}} />
        <img src="/looplet.png" alt="Looplet" style={{width:'140px', marginRight:'15px', display: style === 'dark' ? 'block' : 'none'}} />

        


        {/* <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
        >
        <div style={{width: '20px', height: '20px', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <Menu />
          </div>
        </button> */}

        {/* Search Bar */}
        <div style={{
          flex: 1,
          maxWidth: '500px',
          position: 'relative',
          marginRight: '50px',
        }}>
          <Search onLocationSelect={handleSearchSelect} mapCenter={mapCenter} />
        </div>

        {/* Tools Section */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginLeft: '16px'
        }}>
                     {/* Theme Toggle */}
           <div style={{
             display: 'flex',
             alignItems: 'center',
             justifyContent: 'center',
             padding: '6px 12px',
             backgroundColor: '#f8f9fa',
             borderRadius: '20px',
             height: '32px',
             minWidth: '80px',
             border: '1px solid #e0e0e0',
             boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
           }}>
             <ThemeToggle 
               isDark={style === 'dark'} 
               onToggle={(isDark) => setStyle(isDark ? 'dark' : 'default')} 
             />
           </div>

          {/* Satellite Button */}
          <button
            onClick={() => setStyle('satellite')}
            style={{
              padding: '8px 12px',
              borderRadius: '20px',
              border: '1px solid #e0e0e0',
              backgroundColor: style === 'satellite' ? '#4285f4' : '#f8f9fa',
              color: style === 'satellite' ? 'white' : '#666',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              if (style !== 'satellite') {
                e.currentTarget.style.backgroundColor = '#f0f0f0';
              }
            }}
            onMouseOut={(e) => {
              if (style !== 'satellite') {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
              }
            }}
          >
            <Satellite style={{ width: '16px', height: '16px' }} />
            Satellite
          </button>

          {/* Elevation Tool Button */}
          <button
            onClick={() => {
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
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '20px',
              border: '1px solid #e0e0e0',
              backgroundColor: elevationToolActive ? '#34a853' : '#f8f9fa',
              color: elevationToolActive ? 'white' : '#666',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              if (!elevationToolActive) {
                e.currentTarget.style.backgroundColor = '#f0f0f0';
              }
            }}
            onMouseOut={(e) => {
              if (!elevationToolActive) {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
              }
            }}
          >
            <Ruler style={{ width: '16px', height: '16px' }} />
            Elevation
          </button>
        </div>
      </div>

      {/* Sidebar Panel */}
      {sidebarOpen && (
        <div style={{
          position: 'fixed',
          top: '64px',
          left: 0,
          width: '320px',
          height: 'calc(100vh - 64px)',
            
          zIndex: 999,
          overflowY: 'auto',

        }}>
          <div style={{ padding: '16px' }}>
            {/* Selected Location */}
            {selectedLocation && (
              <div style={{
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
                border: '1px solid #e0e0e0'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px'
                }}>
                  <MapPin style={{ width: '16px', height: '16px', color: '#4285f4' }} />
                  <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: '#333' }}>
                    Selected Location
                  </h3>
                </div>
                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 12px 0' }}>
                  {selectedLocation.place_name}
                </p>
                <button
                  onClick={clearPinpointMarker}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '4px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#c82333'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#dc3545'}
                >
                  <Trash2 style={{ width: '14px', height: '14px' }} />
                  Clear Marker
                </button>
              </div>
            )}

            {/* Elevation Tool Controls */}
            {elevationToolActive && (
              <div style={{
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
                border: '1px solid #e0e0e0'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 12px 0', color: '#333' }}>
                  Elevation Tool
                </h3>
                
                {isDrawing && elevationPoints.length >= 2 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                      disabled={isLoading}
                      onClick={async () => {
                        if (!canPerformAction('elevation')) {
                          setShowSubscriptionModal(true);
                          return;
                        }

                        setIsLoading(true);
                        try {
                          const data = await createElevationProfile(elevationPoints);
                          setElevationData(data);
                          setShowElevationChart(true);
                          incrementElevationProfile();
                        } catch (error) {
                          console.error('Error creating elevation profile:', error);
                          alert('Error creating elevation profile. Please try again.');
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        borderRadius: '4px',
                        backgroundColor: '#4285f4',
                        color: 'white',
                        border: 'none',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        opacity: isLoading ? 0.6 : 1,
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => {
                        if (!isLoading) {
                          e.currentTarget.style.backgroundColor = '#3367d6';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (!isLoading) {
                          e.currentTarget.style.backgroundColor = '#4285f4';
                        }
                      }}
                    >
                      <BarChart3 style={{ width: '16px', height: '16px' }} />
                      {isLoading ? 'Loading...' : 'Show Elevation Profile'}
                    </button>
                    
                    <button
                      onClick={() => {
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
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        borderRadius: '4px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#c82333'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#dc3545'}
                    >
                      <Trash2 style={{ width: '16px', height: '16px' }} />
                      Clear Line
                    </button>
                  </div>
                )}
                
                {elevationData && (
                  <button
                    onClick={() => setShowElevationChart(!showElevationChart)}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      borderRadius: '4px',
                      backgroundColor: '#6f42c1',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#5a32a3'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6f42c1'}
                  >
                    <BarChart3 style={{ width: '16px', height: '16px' }} />
                    {showElevationChart ? 'Hide Chart' : 'Show Chart'}
                  </button>
                )}

                {/* Instructions */}
                <div style={{
                  fontSize: '12px',
                  color: '#666',
                  backgroundColor: '#fff3cd',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  marginTop: '12px',
                  border: '1px solid #ffeaa7'
                }}>
                  {!isDrawing && "Click on the map to start drawing your elevation line"}
                  {isDrawing && elevationPoints.length === 1 && "Click to add more points to your line"}
                  {isDrawing && elevationPoints.length >= 2 && `Line drawn (${elevationPoints.length} points). Click 'Show Elevation Profile' to generate chart`}
                </div>
              </div>
            )}

            {/* General Instructions */}
            {!elevationToolActive && (
              <div style={{
                backgroundColor: '#e3f2fd',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid #bbdefb'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 8px 0', color: '#1976d2' }}>
                  💡 How to use
                </h3>
                <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
                  Click on properties to view measurements, or use the elevation tool to analyze terrain profiles.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}; 