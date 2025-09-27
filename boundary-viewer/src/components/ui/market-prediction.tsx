import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  MapPin, 
  Calculator,
  Building,
  DollarSign,
  Calendar,
  Target,
  AlertCircle,
  CheckCircle,
  Info,
  Zap,
  Activity,
  Users,
  Home,
  Landmark,
  Car,
  TreePine
} from 'lucide-react';
import { EnhancedButton } from './enhanced-button';
import { EnhancedCard } from './enhanced-card';
import { StatCard } from './enhanced-card';

interface MarketPredictionProps {
  selectedProperty?: any;
  elevationData?: { distances: number[]; elevations: number[] };
  mapCenter: [number, number];
}

interface MarketTrend {
  category: string;
  currentValue: number;
  predictedValue: number;
  changePercent: number;
  timeframe: string;
  confidence: number;
  factors: string[];
}

interface MarketPrediction {
  id: string;
  category: 'property_value' | 'rental_yield' | 'development_cost' | 'market_demand' | 'infrastructure';
  title: string;
  description: string;
  currentValue: number;
  predictedValue: number;
  changePercent: number;
  timeframe: string;
  confidence: number;
  probability: number;
  factors: {
    positive: string[];
    negative: string[];
    neutral: string[];
  };
  riskLevel: 'low' | 'medium' | 'high';
  recommendation: string;
  impact: string;
}

interface MarketData {
  averagePropertyValue: number;
  rentalYield: number;
  populationGrowth: number;
  infrastructureScore: number;
  amenityScore: number;
  transportScore: number;
  schoolScore: number;
  employmentRate: number;
  medianIncome: number;
  developmentActivity: number;
}

export const MarketPrediction: React.FC<MarketPredictionProps> = ({
  selectedProperty,
  elevationData,
  mapCenter
}) => {
  const [predictions, setPredictions] = useState<MarketPrediction[]>([]);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'predictions' | 'factors' | 'comparison'>('overview');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1year' | '3years' | '5years' | '10years'>('3years');

  const timeframes = [
    { id: '1year', label: '1 Year', icon: Calendar },
    { id: '3years', label: '3 Years', icon: Target },
    { id: '5years', label: '5 Years', icon: TrendingUp },
    { id: '10years', label: '10 Years', icon: Building },
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'predictions', label: 'Predictions', icon: TrendingUp },
    { id: 'factors', label: 'Market Factors', icon: Activity },
    { id: 'comparison', label: 'Comparison', icon: PieChart },
  ];

  // Simulate market data analysis
  const generateMarketData = useMemo(() => {
    if (!mapCenter) return null;

    // Simulate realistic market data based on location
    const baseValue = 450000 + (Math.random() * 200000); // Base property value
    const locationMultiplier = mapCenter[1] > -27 ? 1.2 : 0.8; // North vs South QLD
    
    return {
      averagePropertyValue: baseValue * locationMultiplier,
      rentalYield: 4.2 + (Math.random() * 2), // 4.2-6.2%
      populationGrowth: 1.5 + (Math.random() * 2), // 1.5-3.5%
      infrastructureScore: 70 + (Math.random() * 20), // 70-90
      amenityScore: 65 + (Math.random() * 25), // 65-90
      transportScore: 60 + (Math.random() * 30), // 60-90
      schoolScore: 75 + (Math.random() * 15), // 75-90
      employmentRate: 85 + (Math.random() * 10), // 85-95%
      medianIncome: 65000 + (Math.random() * 15000), // $65k-$80k
      developmentActivity: 30 + (Math.random() * 40), // 30-70%
    };
  }, [mapCenter]);

  const generateMarketPredictions = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);

    // Simulate AI analysis progress
    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setIsAnalyzing(false);
          return 100;
        }
        return prev + 12;
      });
    }, 200);

    // Simulate market analysis time
    setTimeout(() => {
      const timeframeMultipliers = {
        '1year': { value: 1.05, volatility: 0.8 },
        '3years': { value: 1.15, volatility: 1.0 },
        '5years': { value: 1.28, volatility: 1.2 },
        '10years': { value: 1.45, volatility: 1.5 },
      };

      const multiplier = timeframeMultipliers[selectedTimeframe];
      const baseData = generateMarketData!;

      const marketPredictions: MarketPrediction[] = [
        {
          id: '1',
          category: 'property_value',
          title: 'Property Value Forecast',
          description: `Based on market trends, infrastructure development, and demographic changes in the area.`,
          currentValue: baseData.averagePropertyValue,
          predictedValue: baseData.averagePropertyValue * multiplier.value,
          changePercent: (multiplier.value - 1) * 100,
          timeframe: selectedTimeframe,
          confidence: 78 + Math.random() * 15,
          probability: 0.75 + Math.random() * 0.2,
          factors: {
            positive: [
              'Population growth in the area',
              'New infrastructure projects planned',
              'Proximity to employment centers',
              'School district improvements'
            ],
            negative: [
              'Potential interest rate increases',
              'Economic uncertainty',
              'Oversupply in some segments'
            ],
            neutral: [
              'Government policy changes',
              'Climate change considerations',
              'Technology disruption'
            ]
          },
          riskLevel: multiplier.volatility > 1.1 ? 'medium' : 'low',
          recommendation: multiplier.value > 1.2 ? 'Strong buy opportunity' : 'Moderate growth expected',
          impact: `Potential ${((multiplier.value - 1) * 100).toFixed(1)}% appreciation over ${selectedTimeframe.replace('years', ' years').replace('year', ' year')}`
        },
        {
          id: '2',
          category: 'rental_yield',
          title: 'Rental Yield Prediction',
          description: `Projected rental income and yield based on local rental market trends and property characteristics.`,
          currentValue: baseData.rentalYield,
          predictedValue: baseData.rentalYield + (Math.random() * 2 - 1),
          changePercent: ((baseData.rentalYield + (Math.random() * 2 - 1)) - baseData.rentalYield) / baseData.rentalYield * 100,
          timeframe: selectedTimeframe,
          confidence: 72 + Math.random() * 18,
          probability: 0.7 + Math.random() * 0.25,
          factors: {
            positive: [
              'Growing rental demand',
              'Limited new supply',
              'Student population growth',
              'Tourism industry expansion'
            ],
            negative: [
              'Rising property prices',
              'Increased competition',
              'Regulatory changes'
            ],
            neutral: [
              'Economic cycles',
              'Demographic shifts',
              'Technology impact'
            ]
          },
          riskLevel: 'low',
          recommendation: 'Stable rental income expected',
          impact: 'Consistent cash flow with moderate growth'
        },
        {
          id: '3',
          category: 'development_cost',
          title: 'Development Cost Forecast',
          description: `Estimated development costs including construction, permits, and infrastructure based on current market conditions.`,
          currentValue: 180000,
          predictedValue: 180000 * (1 + (Math.random() * 0.3 - 0.1)),
          changePercent: (Math.random() * 30 - 10),
          timeframe: selectedTimeframe,
          confidence: 85 + Math.random() * 10,
          probability: 0.8 + Math.random() * 0.15,
          factors: {
            positive: [
              'Material cost stabilization',
              'Efficient construction methods',
              'Government incentives'
            ],
            negative: [
              'Labor shortage',
              'Material price inflation',
              'Regulatory complexity'
            ],
            neutral: [
              'Technology advancement',
              'Supply chain changes',
              'Environmental requirements'
            ]
          },
          riskLevel: 'medium',
          recommendation: 'Monitor cost trends closely',
          impact: 'Moderate cost increases expected'
        },
        {
          id: '4',
          category: 'market_demand',
          title: 'Market Demand Analysis',
          description: `Analysis of buyer demand patterns and market activity in the local area.`,
          currentValue: baseData.developmentActivity,
          predictedValue: baseData.developmentActivity * (1 + (Math.random() * 0.4 - 0.1)),
          changePercent: (Math.random() * 40 - 10),
          timeframe: selectedTimeframe,
          confidence: 68 + Math.random() * 20,
          probability: 0.65 + Math.random() * 0.25,
          factors: {
            positive: [
              'Population growth',
              'Employment opportunities',
              'Lifestyle amenities',
              'Transportation improvements'
            ],
            negative: [
              'Affordability constraints',
              'Economic uncertainty',
              'Competition from other areas'
            ],
            neutral: [
              'Demographic changes',
              'Technology trends',
              'Policy impacts'
            ]
          },
          riskLevel: 'medium',
          recommendation: 'Strong demand fundamentals',
          impact: 'Growing buyer interest expected'
        },
        {
          id: '5',
          category: 'infrastructure',
          title: 'Infrastructure Development',
          description: `Predicted infrastructure improvements and their impact on property values in the area.`,
          currentValue: baseData.infrastructureScore,
          predictedValue: Math.min(100, baseData.infrastructureScore + (Math.random() * 15)),
          changePercent: ((Math.min(100, baseData.infrastructureScore + (Math.random() * 15)) - baseData.infrastructureScore) / baseData.infrastructureScore * 100),
          timeframe: selectedTimeframe,
          confidence: 82 + Math.random() * 13,
          probability: 0.8 + Math.random() * 0.15,
          factors: {
            positive: [
              'Road network improvements',
              'Public transport expansion',
              'Utility upgrades',
              'Digital infrastructure'
            ],
            negative: [
              'Construction disruptions',
              'Funding delays',
              'Environmental constraints'
            ],
            neutral: [
              'Government priorities',
              'Community input',
              'Technical challenges'
            ]
          },
          riskLevel: 'low',
          recommendation: 'Infrastructure improvements likely',
          impact: 'Enhanced connectivity and amenities'
        }
      ];

      setPredictions(marketPredictions);
      setMarketData(baseData);
    }, 2500);
  };

  useEffect(() => {
    if (selectedProperty && elevationData && generateMarketData) {
      generateMarketPredictions();
    }
  }, [selectedProperty, elevationData, generateMarketData, selectedTimeframe]);

  const getTrendIcon = (changePercent: number) => {
    return changePercent > 0 ? TrendingUp : TrendingDown;
  };

  const getTrendColor = (changePercent: number) => {
    return changePercent > 0 ? 'green' : changePercent < -5 ? 'red' : 'yellow';
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'green';
      case 'medium': return 'yellow';
      case 'high': return 'red';
      default: return 'blue';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return '#16a34a';
    if (confidence >= 65) return '#ca8a04';
    return '#dc2626';
  };

  return (
    <EnhancedCard
      title="Market Prediction Analysis"
      subtitle="AI-powered market forecasting and investment insights"
      icon={TrendingUp}
      variant="elevated"
    >
      {/* Timeframe Selection */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
          Prediction Timeframe
        </h4>
        <div style={{ display: 'flex', gap: '8px' }}>
          {timeframes.map(timeframe => (
            <EnhancedButton
              key={timeframe.id}
              onClick={() => setSelectedTimeframe(timeframe.id as any)}
              variant={selectedTimeframe === timeframe.id ? 'primary' : 'ghost'}
              size="sm"
              icon={timeframe.icon}
              style={{ borderRadius: '8px', flex: 1 }}
            >
              {timeframe.label}
            </EnhancedButton>
          ))}
        </div>
      </div>

      {/* Analysis Progress */}
      {isAnalyzing && (
        <div style={{
          backgroundColor: '#f0f9ff',
          border: '1px solid #0ea5e9',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <Zap size={20} color="#0ea5e9" />
            <span style={{ fontSize: '16px', fontWeight: '600', color: '#0c4a6e' }}>
              AI Market Analysis in Progress
            </span>
          </div>
          <div style={{
            width: '100%',
            height: '12px',
            backgroundColor: '#e0f2fe',
            borderRadius: '6px',
            overflow: 'hidden',
            marginBottom: '8px',
          }}>
            <div style={{
              width: `${analysisProgress}%`,
              height: '100%',
              backgroundColor: '#0ea5e9',
              borderRadius: '6px',
              transition: 'width 0.3s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#0c4a6e' }}>
            <span>Analyzing market trends, demographics, and economic factors...</span>
            <span>{analysisProgress}%</span>
          </div>
        </div>
      )}

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

      {/* Overview Tab */}
      {activeTab === 'overview' && marketData && (
        <div>
          <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
            Market Overview
          </h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            <StatCard
              title="Avg Property Value"
              value={`$${(marketData.averagePropertyValue / 1000).toFixed(0)}k`}
              icon={Home}
              color="blue"
            />
            <StatCard
              title="Rental Yield"
              value={`${marketData.rentalYield.toFixed(1)}%`}
              icon={DollarSign}
              color="green"
            />
            <StatCard
              title="Population Growth"
              value={`${marketData.populationGrowth.toFixed(1)}%`}
              icon={Users}
              color="purple"
            />
            <StatCard
              title="Infrastructure Score"
              value={`${marketData.infrastructureScore.toFixed(0)}/100`}
              icon={Landmark}
              color="yellow"
            />
          </div>

          {/* Market Health Indicators */}
          <div style={{
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid #e5e7eb',
          }}>
            <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>
              Market Health Indicators
            </h5>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Amenities</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>{marketData.amenityScore.toFixed(0)}/100</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Transport</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>{marketData.transportScore.toFixed(0)}/100</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Schools</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>{marketData.schoolScore.toFixed(0)}/100</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Employment</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>{marketData.employmentRate.toFixed(0)}%</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Predictions Tab */}
      {activeTab === 'predictions' && (
        <div>
          <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
            Market Predictions
          </h4>
          
          {predictions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
              <TrendingUp size={48} />
              <p style={{ marginTop: '12px' }}>No predictions available</p>
              <p style={{ fontSize: '12px', marginTop: '4px' }}>
                Select a property to generate market predictions
              </p>
            </div>
          ) : (
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {predictions.map(prediction => {
                const TrendIcon = getTrendIcon(prediction.changePercent);
                const trendColor = getTrendColor(prediction.changePercent);
                const riskColor = getRiskColor(prediction.riskLevel);
                
                return (
                  <div
                    key={prediction.id}
                    style={{
                      backgroundColor: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '16px',
                      marginBottom: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        backgroundColor: trendColor === 'green' ? '#f0fdf4' : 
                                         trendColor === 'red' ? '#fef2f2' : '#fefce8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: trendColor === 'green' ? '#16a34a' : 
                               trendColor === 'red' ? '#dc2626' : '#ca8a04',
                        flexShrink: 0,
                      }}>
                        <TrendingUp size={20} />
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <h5 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: 0 }}>
                            {prediction.title}
                          </h5>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              fontSize: '11px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backgroundColor: getConfidenceColor(prediction.confidence),
                              color: 'white',
                            }}>
                              {prediction.confidence.toFixed(0)}%
                            </span>
                            <span style={{
                              fontSize: '11px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backgroundColor: riskColor === 'green' ? '#f0fdf4' : 
                                             riskColor === 'red' ? '#fef2f2' : '#fefce8',
                              color: riskColor === 'green' ? '#16a34a' : 
                                    riskColor === 'red' ? '#dc2626' : '#ca8a04',
                            }}>
                              {prediction.riskLevel} risk
                            </span>
                          </div>
                        </div>
                        
                        <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 12px 0', lineHeight: '1.5' }}>
                          {prediction.description}
                        </p>
                        
                        {/* Value Prediction */}
                        <div style={{
                          backgroundColor: '#f0f9ff',
                          borderRadius: '8px',
                          padding: '12px',
                          marginBottom: '12px',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '12px', color: '#0c4a6e', fontWeight: '500' }}>Current</span>
                            <span style={{ fontSize: '12px', color: '#0c4a6e', fontWeight: '500' }}>Predicted</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                              ${prediction.currentValue.toLocaleString()}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <TrendIcon size={16} color={trendColor === 'green' ? '#16a34a' : trendColor === 'red' ? '#dc2626' : '#ca8a04'} />
                              <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                                ${prediction.predictedValue.toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', marginTop: '4px' }}>
                            <span style={{
                              fontSize: '12px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: trendColor === 'green' ? '#f0fdf4' : 
                                             trendColor === 'red' ? '#fef2f2' : '#fefce8',
                              color: trendColor === 'green' ? '#16a34a' : 
                                    trendColor === 'red' ? '#dc2626' : '#ca8a04',
                            }}>
                              {prediction.changePercent > 0 ? '+' : ''}{prediction.changePercent.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        
                        {/* Recommendation */}
                        <div style={{
                          backgroundColor: '#f0fdf4',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          marginBottom: '8px',
                        }}>
                          <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: '500', marginBottom: '2px' }}>
                            Recommendation
                          </div>
                          <div style={{ fontSize: '13px', color: '#15803d' }}>
                            {prediction.recommendation}
                          </div>
                        </div>
                        
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          <strong>Impact:</strong> {prediction.impact}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Market Factors Tab */}
      {activeTab === 'factors' && (
        <div>
          <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
            Market Factors Analysis
          </h4>
          
          {predictions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
              <Activity size={48} />
              <p style={{ marginTop: '12px' }}>No factor analysis available</p>
            </div>
          ) : (
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {predictions.map(prediction => (
                <div
                  key={prediction.id}
                  style={{
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '12px',
                  }}
                >
                  <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>
                    {prediction.title}
                  </h5>
                  
                  {/* Positive Factors */}
                  {prediction.factors.positive.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <CheckCircle size={14} color="#16a34a" />
                        <span style={{ fontSize: '12px', fontWeight: '500', color: '#16a34a' }}>
                          Positive Factors
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {prediction.factors.positive.map((factor, index) => (
                          <span
                            key={index}
                            style={{
                              fontSize: '11px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#f0fdf4',
                              color: '#16a34a',
                              border: '1px solid #bbf7d0',
                            }}
                          >
                            {factor}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Negative Factors */}
                  {prediction.factors.negative.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <AlertCircle size={14} color="#dc2626" />
                        <span style={{ fontSize: '12px', fontWeight: '500', color: '#dc2626' }}>
                          Risk Factors
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {prediction.factors.negative.map((factor, index) => (
                          <span
                            key={index}
                            style={{
                              fontSize: '11px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#fef2f2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                            }}
                          >
                            {factor}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Neutral Factors */}
                  {prediction.factors.neutral.length > 0 && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <Info size={14} color="#6b7280" />
                        <span style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>
                          Monitoring Factors
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {prediction.factors.neutral.map((factor, index) => (
                          <span
                            key={index}
                            style={{
                              fontSize: '11px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#f3f4f6',
                              color: '#6b7280',
                              border: '1px solid #d1d5db',
                            }}
                          >
                            {factor}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Comparison Tab */}
      {activeTab === 'comparison' && (
        <div>
          <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
            Market Comparison
          </h4>
          
          <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
            <PieChart size={48} />
            <p style={{ marginTop: '12px' }}>Compare with similar properties</p>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>
              Analyze performance against market benchmarks
            </p>
            <EnhancedButton
              variant="primary"
              size="md"
              icon={Target}
              style={{ marginTop: '16px' }}
            >
              Load Comparison Data
            </EnhancedButton>
          </div>
        </div>
      )}
    </EnhancedCard>
  );
};
