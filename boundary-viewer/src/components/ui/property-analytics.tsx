import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  MapPin, 
  Calculator,
  Building,
  TreePine,
  Droplets,
  Sun,
  Wind,
  Thermometer,
  Layers,
  Info
} from 'lucide-react';
import { EnhancedCard } from './enhanced-card';
import { StatCard } from './enhanced-card';
import { EnhancedButton } from './enhanced-button';

interface PropertyAnalyticsProps {
  selectedProperty?: any;
  elevationData?: { distances: number[]; elevations: number[] };
  mapCenter: [number, number];
}

interface PropertyInsights {
  area: number;
  perimeter: number;
  shapeComplexity: number;
  orientation: number;
  slopeAnalysis: {
    average: number;
    max: number;
    min: number;
    classification: string;
  };
  environmentalFactors: {
    sunExposure: 'high' | 'medium' | 'low';
    windExposure: 'high' | 'medium' | 'low';
    drainage: 'excellent' | 'good' | 'poor';
    vegetation: 'dense' | 'moderate' | 'sparse';
  };
  developmentPotential: {
    score: number;
    constraints: string[];
    opportunities: string[];
  };
}

export const PropertyAnalytics: React.FC<PropertyAnalyticsProps> = ({
  selectedProperty,
  elevationData,
  mapCenter
}) => {
  const [insights, setInsights] = useState<PropertyInsights | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'environmental' | 'development' | 'comparison'>('overview');

  // Calculate property insights
  const calculateInsights = useMemo(() => {
    if (!selectedProperty || !elevationData) return null;

    const { elevations, distances } = elevationData;
    
    // Calculate slope analysis
    const slopes = [];
    for (let i = 1; i < elevations.length; i++) {
      const distanceDiff = distances[i] - distances[i - 1];
      const elevationDiff = elevations[i] - elevations[i - 1];
      if (distanceDiff > 0) {
        slopes.push((elevationDiff / distanceDiff) * 100);
      }
    }
    
    const avgSlope = slopes.length > 0 ? slopes.reduce((sum, slope) => sum + Math.abs(slope), 0) / slopes.length : 0;
    const maxSlope = slopes.length > 0 ? Math.max(...slopes.map(Math.abs)) : 0;
    const minSlope = slopes.length > 0 ? Math.min(...slopes.map(Math.abs)) : 0;
    
    const getSlopeClassification = (slope: number) => {
      if (slope < 2) return 'Flat';
      if (slope < 5) return 'Gentle';
      if (slope < 10) return 'Moderate';
      if (slope < 15) return 'Steep';
      return 'Very Steep';
    };

    // Simulate environmental analysis (in real app, this would use APIs)
    const environmentalFactors = {
      sunExposure: mapCenter[1] > -27 ? 'high' : 'medium' as 'high' | 'medium' | 'low',
      windExposure: avgSlope > 5 ? 'high' : 'medium' as 'high' | 'medium' | 'low',
      drainage: avgSlope > 3 ? 'excellent' : avgSlope > 1 ? 'good' : 'poor' as 'excellent' | 'good' | 'poor',
      vegetation: Math.random() > 0.5 ? 'moderate' : 'sparse' as 'dense' | 'moderate' | 'sparse',
    };

    // Calculate development potential
    const constraints = [];
    const opportunities = [];
    
    if (avgSlope > 10) constraints.push('Steep terrain');
    if (avgSlope < 1) constraints.push('Poor drainage');
    if (environmentalFactors.vegetation === 'dense') constraints.push('Vegetation clearing required');
    
    if (avgSlope < 5 && avgSlope > 1) opportunities.push('Ideal for development');
    if (environmentalFactors.sunExposure === 'high') opportunities.push('Excellent solar potential');
    if (environmentalFactors.drainage === 'excellent') opportunities.push('Good drainage');

    const developmentScore = Math.max(0, Math.min(100, 
      100 - (avgSlope * 5) - (constraints.length * 10) + (opportunities.length * 15)
    ));

    return {
      area: Math.random() * 1000 + 500, // Simulated area
      perimeter: Math.random() * 200 + 100, // Simulated perimeter
      shapeComplexity: Math.random() * 10 + 1, // Shape complexity index
      orientation: Math.random() * 360, // Property orientation
      slopeAnalysis: {
        average: avgSlope,
        max: maxSlope,
        min: minSlope,
        classification: getSlopeClassification(avgSlope),
      },
      environmentalFactors,
      developmentPotential: {
        score: developmentScore,
        constraints,
        opportunities,
      },
    };
  }, [selectedProperty, elevationData, mapCenter]);

  useEffect(() => {
    if (calculateInsights) {
      setIsLoading(true);
      // Simulate API call
      setTimeout(() => {
        setInsights(calculateInsights);
        setIsLoading(false);
      }, 1000);
    }
  }, [calculateInsights]);

  if (!selectedProperty) {
    return (
      <EnhancedCard
        title="Property Analytics"
        subtitle="Select a property to view detailed analytics"
        icon={BarChart3}
        variant="filled"
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Info size={48} color="#6b7280" />
          <p style={{ marginTop: '12px', color: '#6b7280' }}>
            Click on a property boundary to analyze its characteristics
          </p>
        </div>
      </EnhancedCard>
    );
  }

  if (isLoading) {
    return (
      <EnhancedCard
        title="Analyzing Property"
        subtitle="Processing property data..."
        icon={BarChart3}
        variant="elevated"
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e5e7eb',
            borderTop: '3px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 12px'
          }} />
          <p style={{ color: '#6b7280' }}>Calculating insights...</p>
        </div>
      </EnhancedCard>
    );
  }

  if (!insights) return null;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'environmental', label: 'Environmental', icon: TreePine },
    { id: 'development', label: 'Development', icon: Building },
    { id: 'comparison', label: 'Compare', icon: TrendingUp },
  ];

  return (
    <EnhancedCard
      title="Property Analytics"
      subtitle={`${insights.area.toFixed(0)}m² • ${insights.slopeAnalysis.classification} terrain`}
      icon={BarChart3}
      variant="elevated"
    >
      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '20px',
        backgroundColor: '#f3f4f6',
        borderRadius: '8px',
        padding: '4px',
      }}>
        {tabs.map(tab => (
          <EnhancedButton
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            variant={activeTab === tab.id ? 'primary' : 'ghost'}
            size="sm"
            icon={tab.icon}
            style={{ borderRadius: '6px', flex: 1 }}
          >
            {tab.label}
          </EnhancedButton>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div>
          <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
            Property Overview
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
            <StatCard
              title="Area"
              value={`${insights.area.toFixed(0)}m²`}
              icon={Calculator}
              color="blue"
            />
            <StatCard
              title="Perimeter"
              value={`${insights.perimeter.toFixed(0)}m`}
              icon={MapPin}
              color="green"
            />
            <StatCard
              title="Shape Index"
              value={insights.shapeComplexity.toFixed(1)}
              icon={Layers}
              color="purple"
            />
            <StatCard
              title="Orientation"
              value={`${insights.orientation.toFixed(0)}°`}
              icon={Sun}
              color="yellow"
            />
          </div>
        </div>
      )}

      {activeTab === 'environmental' && (
        <div>
          <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
            Environmental Factors
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
            <StatCard
              title="Sun Exposure"
              value={insights.environmentalFactors.sunExposure}
              icon={Sun}
              color={insights.environmentalFactors.sunExposure === 'high' ? 'yellow' : 'blue'}
            />
            <StatCard
              title="Wind Exposure"
              value={insights.environmentalFactors.windExposure}
              icon={Wind}
              color={insights.environmentalFactors.windExposure === 'high' ? 'red' : 'blue'}
            />
            <StatCard
              title="Drainage"
              value={insights.environmentalFactors.drainage}
              icon={Droplets}
              color={insights.environmentalFactors.drainage === 'excellent' ? 'green' : 'yellow'}
            />
            <StatCard
              title="Vegetation"
              value={insights.environmentalFactors.vegetation}
              icon={TreePine}
              color={insights.environmentalFactors.vegetation === 'dense' ? 'green' : 'yellow'}
            />
          </div>
        </div>
      )}

      {activeTab === 'development' && (
        <div>
          <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
            Development Potential
          </h4>
          
          <div style={{ marginBottom: '16px' }}>
            <StatCard
              title="Development Score"
              value={`${insights.developmentPotential.score.toFixed(0)}/100`}
              icon={Building}
              color={insights.developmentPotential.score > 70 ? 'green' : insights.developmentPotential.score > 40 ? 'yellow' : 'red'}
            />
          </div>

          {insights.developmentPotential.constraints.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#dc2626', marginBottom: '8px' }}>
                Constraints
              </h5>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {insights.developmentPotential.constraints.map((constraint, index) => (
                  <span
                    key={index}
                    style={{
                      backgroundColor: '#fef2f2',
                      color: '#dc2626',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      border: '1px solid #fecaca',
                    }}
                  >
                    {constraint}
                  </span>
                ))}
              </div>
            </div>
          )}

          {insights.developmentPotential.opportunities.length > 0 && (
            <div>
              <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#16a34a', marginBottom: '8px' }}>
                Opportunities
              </h5>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {insights.developmentPotential.opportunities.map((opportunity, index) => (
                  <span
                    key={index}
                    style={{
                      backgroundColor: '#f0fdf4',
                      color: '#16a34a',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      border: '1px solid #bbf7d0',
                    }}
                  >
                    {opportunity}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'comparison' && (
        <div>
          <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
            Market Comparison
          </h4>
          <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
            <TrendingUp size={48} />
            <p style={{ marginTop: '12px' }}>
              Compare with similar properties in the area
            </p>
            <EnhancedButton
              variant="secondary"
              size="sm"
              style={{ marginTop: '12px' }}
            >
              Load Comparison Data
            </EnhancedButton>
          </div>
        </div>
      )}
    </EnhancedCard>
  );
};
