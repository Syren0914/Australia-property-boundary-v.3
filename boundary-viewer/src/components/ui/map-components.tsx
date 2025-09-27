import React from 'react';
import { Loader2, MapPin, Layers, Navigation, Zap } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = '#3b82f6',
  text
}) => {
  const sizeStyles = {
    sm: { width: '16px', height: '16px' },
    md: { width: '24px', height: '24px' },
    lg: { width: '32px', height: '32px' },
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
    }}>
      <Loader2 
        size={sizeStyles[size].width} 
        style={{ 
          color,
          animation: 'spin 1s linear infinite'
        }} 
      />
      {text && (
        <p style={{
          fontSize: size === 'sm' ? '12px' : size === 'md' ? '14px' : '16px',
          color: '#6b7280',
          margin: 0,
          textAlign: 'center',
        }}>
          {text}
        </p>
      )}
    </div>
  );
};

interface MapLoadingOverlayProps {
  isLoading: boolean;
  loadingText?: string;
  progress?: number;
}

export const MapLoadingOverlay: React.FC<MapLoadingOverlayProps> = ({
  isLoading,
  loadingText = 'Loading map data...',
  progress
}) => {
  if (!isLoading) return null;

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      gap: '20px',
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        minWidth: '300px',
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <MapPin size={24} color="#3b82f6" />
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#111827',
            margin: '0 0 8px 0',
          }}>
            {loadingText}
          </h3>
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            margin: 0,
          }}>
            Please wait while we load the map data
          </p>
        </div>

        {progress !== undefined && (
          <div style={{ width: '100%' }}>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#e5e7eb',
              borderRadius: '4px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: '#3b82f6',
                borderRadius: '4px',
                transition: 'width 0.3s ease',
              }} />
            </div>
            <p style={{
              fontSize: '12px',
              color: '#6b7280',
              textAlign: 'center',
              margin: '8px 0 0 0',
            }}>
              {progress.toFixed(0)}% complete
            </p>
          </div>
        )}

        <LoadingSpinner size="md" />
      </div>
    </div>
  );
};

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  isActive?: boolean;
  onClick?: () => void;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  isActive = false,
  onClick
}) => {
  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: isActive ? '#eff6ff' : 'white',
        border: `2px solid ${isActive ? '#3b82f6' : '#e5e7eb'}`,
        borderRadius: '12px',
        padding: '20px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '12px',
        minHeight: '140px',
        justifyContent: 'center',
      }}
      onMouseOver={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 8px 15px rgba(0, 0, 0, 0.1)';
        }
      }}
      onMouseOut={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
    >
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        backgroundColor: isActive ? '#3b82f6' : '#f3f4f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: isActive ? 'white' : '#6b7280',
      }}>
        {icon}
      </div>
      <h4 style={{
        fontSize: '16px',
        fontWeight: '600',
        color: '#111827',
        margin: 0,
      }}>
        {title}
      </h4>
      <p style={{
        fontSize: '14px',
        color: '#6b7280',
        margin: 0,
        lineHeight: '1.4',
      }}>
        {description}
      </p>
    </div>
  );
};

interface MapControlsProps {
  onToggleLayers?: () => void;
  onToggleNavigation?: () => void;
  onToggleTerrain?: () => void;
  layersVisible?: boolean;
  navigationVisible?: boolean;
  terrainVisible?: boolean;
}

export const MapControls: React.FC<MapControlsProps> = ({
  onToggleLayers,
  onToggleNavigation,
  onToggleTerrain,
  layersVisible = true,
  navigationVisible = true,
  terrainVisible = false,
}) => {
  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      zIndex: 1000,
    }}>
      {onToggleLayers && (
        <button
          onClick={onToggleLayers}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: layersVisible ? '#3b82f6' : 'white',
            color: layersVisible ? 'white' : '#6b7280',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="Toggle Layers"
        >
          <Layers size={20} />
        </button>
      )}

      {onToggleNavigation && (
        <button
          onClick={onToggleNavigation}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: navigationVisible ? '#3b82f6' : 'white',
            color: navigationVisible ? 'white' : '#6b7280',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="Toggle Navigation"
        >
          <Navigation size={20} />
        </button>
      )}

      {onToggleTerrain && (
        <button
          onClick={onToggleTerrain}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: terrainVisible ? '#3b82f6' : 'white',
            color: terrainVisible ? 'white' : '#6b7280',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="Toggle Terrain"
        >
          <Zap size={20} />
        </button>
      )}
    </div>
  );
};

