import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Zap, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Lightbulb,
  Target,
  BarChart3,
  MapPin,
  Calculator,
  Eye,
  Sparkles
} from 'lucide-react';
import { EnhancedButton } from './enhanced-button';
import { EnhancedCard } from './enhanced-card';
import { StatCard } from './enhanced-card';

interface AIPropertyAnalysisProps {
  selectedProperty?: any;
  elevationData?: { distances: number[]; elevations: number[] };
  mapCenter: [number, number];
}

interface AIInsight {
  id: string;
  type: 'opportunity' | 'warning' | 'recommendation' | 'prediction';
  title: string;
  description: string;
  confidence: number;
  category: string;
  actionable: boolean;
  priority: 'high' | 'medium' | 'low';
  impact: string;
  cost?: string;
  timeframe?: string;
}

interface AIPrediction {
  category: string;
  prediction: string;
  confidence: number;
  factors: string[];
  timeframe: string;
  probability: number;
}

export const AIPropertyAnalysis: React.FC<AIPropertyAnalysisProps> = ({
  selectedProperty,
  elevationData,
  mapCenter
}) => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [predictions, setPredictions] = useState<AIPrediction[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<'insights' | 'predictions' | 'recommendations' | 'market'>('insights');

  // AI-powered property analysis
  const analyzePropertyWithAI = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);

    // Simulate AI processing with progress updates
    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setIsAnalyzing(false);
          return 100;
        }
        return prev + 15;
      });
    }, 300);

    // Simulate AI analysis time
    setTimeout(() => {
      const aiInsights: AIInsight[] = [
        {
          id: '1',
          type: 'opportunity',
          title: 'Solar Panel Installation',
          description: 'Based on orientation analysis, this property has 92% solar efficiency potential. Optimal placement identified in southeastern section.',
          confidence: 94,
          category: 'Renewable Energy',
          actionable: true,
          priority: 'high',
          impact: 'Reduce energy costs by 60-80%',
          cost: '$15,000 - $25,000',
          timeframe: '3-6 months',
        },
        {
          id: '2',
          type: 'warning',
          title: 'Drainage Risk Assessment',
          description: 'AI detected potential flooding risk in northern quadrant. Slope analysis shows water accumulation patterns during heavy rainfall.',
          confidence: 87,
          category: 'Infrastructure',
          actionable: true,
          priority: 'high',
          impact: 'Prevent property damage',
          cost: '$5,000 - $12,000',
          timeframe: '1-3 months',
        },
        {
          id: '3',
          type: 'recommendation',
          title: 'Optimal Building Placement',
          description: 'AI recommends building placement 15m from southeastern corner for maximum sun exposure and minimal wind impact.',
          confidence: 91,
          category: 'Development',
          actionable: true,
          priority: 'high',
          impact: 'Increase property value by 15-20%',
          cost: 'Planning only',
          timeframe: 'Design phase',
        },
        {
          id: '4',
          type: 'prediction',
          title: 'Property Value Forecast',
          description: 'AI predicts 18-25% appreciation over next 3 years based on local development trends and infrastructure projects.',
          confidence: 78,
          category: 'Market Analysis',
          actionable: false,
          priority: 'medium',
          impact: 'Investment opportunity',
        },
        {
          id: '5',
          type: 'opportunity',
          title: 'Water Harvesting Potential',
          description: 'Property slope and rainfall patterns suggest excellent potential for rainwater harvesting system.',
          confidence: 82,
          category: 'Sustainability',
          actionable: true,
          priority: 'medium',
          impact: 'Reduce water bills by 40%',
          cost: '$3,000 - $8,000',
          timeframe: '2-4 months',
        },
      ];

      const aiPredictions: AIPrediction[] = [
        {
          category: 'Development Cost',
          prediction: 'Total development cost: $185,000 - $245,000',
          confidence: 85,
          factors: ['Terrain complexity', 'Access requirements', 'Utility connections', 'Permit costs'],
          timeframe: '6-12 months',
          probability: 0.85,
        },
        {
          category: 'Environmental Impact',
          prediction: 'Low environmental impact with proper planning',
          confidence: 89,
          factors: ['Existing vegetation', 'Wildlife corridors', 'Water runoff patterns', 'Soil composition'],
          timeframe: 'Long-term',
          probability: 0.89,
        },
        {
          category: 'Market Demand',
          prediction: 'High demand expected for properties in this area',
          confidence: 76,
          factors: ['Population growth', 'Infrastructure development', 'Proximity to amenities', 'Transportation access'],
          timeframe: '2-3 years',
          probability: 0.76,
        },
        {
          category: 'ROI Projection',
          prediction: 'Expected ROI: 12-18% annually',
          confidence: 71,
          factors: ['Market trends', 'Development costs', 'Rental potential', 'Appreciation rates'],
          timeframe: '5-10 years',
          probability: 0.71,
        },
      ];

      setInsights(aiInsights);
      setPredictions(aiPredictions);
    }, 2500);
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'recommendation': return Lightbulb;
      case 'prediction': return TrendingUp;
      default: return Brain;
    }
  };

  const getInsightColor = (type: string, priority: string) => {
    if (type === 'warning') return 'red';
    if (type === 'opportunity') return 'green';
    if (priority === 'high') return 'yellow';
    return 'blue';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return '#16a34a';
    if (confidence >= 70) return '#ca8a04';
    return '#dc2626';
  };

  useEffect(() => {
    if (selectedProperty && elevationData) {
      analyzePropertyWithAI();
    }
  }, [selectedProperty, elevationData]);

  const tabs = [
    { id: 'insights', label: 'AI Insights', icon: Brain },
    { id: 'predictions', label: 'Predictions', icon: TrendingUp },
    { id: 'recommendations', label: 'Recommendations', icon: Lightbulb },
    { id: 'market', label: 'Market Analysis', icon: BarChart3 },
  ];

  return (
    <EnhancedCard
      title="AI Property Analysis"
      subtitle="Intelligent insights powered by machine learning"
      icon={Brain}
      variant="elevated"
    >
      {/* AI Analysis Progress */}
      {isAnalyzing && (
        <div style={{
          backgroundColor: '#f0f9ff',
          border: '1px solid #0ea5e9',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <Sparkles size={20} color="#0ea5e9" />
            <span style={{ fontSize: '16px', fontWeight: '600', color: '#0c4a6e' }}>
              AI Analysis in Progress
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
            <span>Analyzing terrain, market data, and environmental factors...</span>
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

      {/* AI Insights Tab */}
      {activeTab === 'insights' && (
        <div>
          <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
            AI-Generated Insights
          </h4>
          
          {insights.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
              <Brain size={48} />
              <p style={{ marginTop: '12px' }}>No insights available</p>
              <p style={{ fontSize: '12px', marginTop: '4px' }}>
                Select a property to generate AI insights
              </p>
            </div>
          ) : (
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {insights.map(insight => {
                const IconComponent = getInsightIcon(insight.type);
                const color = getInsightColor(insight.type, insight.priority);
                
                return (
                  <div
                    key={insight.id}
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
                        backgroundColor: color === 'red' ? '#fef2f2' : 
                                         color === 'green' ? '#f0fdf4' : 
                                         color === 'yellow' ? '#fefce8' : '#eff6ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: color === 'red' ? '#dc2626' : 
                               color === 'green' ? '#16a34a' : 
                               color === 'yellow' ? '#ca8a04' : '#3b82f6',
                        flexShrink: 0,
                      }}>
                        <IconComponent size={20} />
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <h5 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: 0 }}>
                            {insight.title}
                          </h5>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              fontSize: '11px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#f3f4f6',
                              color: '#6b7280',
                            }}>
                              {insight.category}
                            </span>
                            <span style={{
                              fontSize: '11px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backgroundColor: getConfidenceColor(insight.confidence),
                              color: 'white',
                            }}>
                              {insight.confidence}%
                            </span>
                          </div>
                        </div>
                        
                        <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 12px 0', lineHeight: '1.5' }}>
                          {insight.description}
                        </p>
                        
                        {/* Impact and Cost Information */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', marginBottom: '8px' }}>
                          {insight.impact && (
                            <div style={{
                              backgroundColor: '#f0f9ff',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                            }}>
                              <strong>Impact:</strong> {insight.impact}
                            </div>
                          )}
                          {insight.cost && (
                            <div style={{
                              backgroundColor: '#f0fdf4',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                            }}>
                              <strong>Cost:</strong> {insight.cost}
                            </div>
                          )}
                          {insight.timeframe && (
                            <div style={{
                              backgroundColor: '#fefce8',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                            }}>
                              <strong>Timeframe:</strong> {insight.timeframe}
                            </div>
                          )}
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <span style={{
                              fontSize: '11px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backgroundColor: insight.priority === 'high' ? '#fef2f2' : 
                                             insight.priority === 'medium' ? '#fefce8' : '#f0fdf4',
                              color: insight.priority === 'high' ? '#dc2626' : 
                                    insight.priority === 'medium' ? '#ca8a04' : '#16a34a',
                            }}>
                              {insight.priority} priority
                            </span>
                            {insight.actionable && (
                              <span style={{
                                fontSize: '11px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                backgroundColor: '#eff6ff',
                                color: '#3b82f6',
                              }}>
                                Actionable
                              </span>
                            )}
                          </div>
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

      {/* Predictions Tab */}
      {activeTab === 'predictions' && (
        <div>
          <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
            AI Predictions
          </h4>
          
          {predictions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
              <TrendingUp size={48} />
              <p style={{ marginTop: '12px' }}>No predictions available</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {predictions.map((prediction, index) => (
                <div
                  key={index}
                  style={{
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '16px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: 0 }}>
                      {prediction.category}
                    </h5>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: getConfidenceColor(prediction.confidence),
                        color: 'white',
                      }}>
                        {prediction.confidence}%
                      </span>
                      <span style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: '#f0fdf4',
                        color: '#16a34a',
                      }}>
                        {(prediction.probability * 100).toFixed(0)}% probability
                      </span>
                    </div>
                  </div>
                  
                  <p style={{ fontSize: '13px', color: '#111827', margin: '0 0 12px 0', fontWeight: '500' }}>
                    {prediction.prediction}
                  </p>
                  
                  <div style={{ marginBottom: '8px' }}>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 6px 0' }}>
                      <strong>Key Factors:</strong>
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {prediction.factors.map((factor, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#f3f4f6',
                            color: '#6b7280',
                          }}
                        >
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                    <strong>Timeframe:</strong> {prediction.timeframe}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recommendations Tab */}
      {activeTab === 'recommendations' && (
        <div>
          <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
            AI Recommendations
          </h4>
          
          <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
            <Lightbulb size={48} />
            <p style={{ marginTop: '12px' }}>Personalized recommendations</p>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>
              Based on property analysis, market data, and environmental factors
            </p>
            <EnhancedButton
              variant="primary"
              size="md"
              icon={Target}
              style={{ marginTop: '16px' }}
            >
              Generate Recommendations
            </EnhancedButton>
          </div>
        </div>
      )}

      {/* Market Analysis Tab */}
      {activeTab === 'market' && (
        <div>
          <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
            Market Analysis
          </h4>
          
          <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
            <BarChart3 size={48} />
            <p style={{ marginTop: '12px' }}>Market trends and analysis</p>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>
              AI-powered market insights and trend analysis
            </p>
            <EnhancedButton
              variant="primary"
              size="md"
              icon={Eye}
              style={{ marginTop: '16px' }}
            >
              Analyze Market Trends
            </EnhancedButton>
          </div>
        </div>
      )}
    </EnhancedCard>
  );
};
