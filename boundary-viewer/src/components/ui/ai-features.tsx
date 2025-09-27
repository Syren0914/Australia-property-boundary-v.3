import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Zap, 
  Search, 
  Lightbulb, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Info,
  Sparkles,
  Target,
  BarChart3,
  MapPin,
  Calculator,
  Eye
} from 'lucide-react';
import { EnhancedButton } from './enhanced-button';
import { EnhancedCard } from './enhanced-card';
import { StatCard } from './enhanced-card';

interface AIFeaturesProps {
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
}

interface AIPrediction {
  category: string;
  prediction: string;
  confidence: number;
  factors: string[];
  timeframe: string;
}

export const AIFeatures: React.FC<AIFeaturesProps> = ({
  selectedProperty,
  elevationData,
  mapCenter
}) => {
  const [activeTab, setActiveTab] = useState<'insights' | 'predictions' | 'recommendations' | 'analysis'>('insights');
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [predictions, setPredictions] = useState<AIPrediction[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  const tabs = [
    { id: 'insights', label: 'AI Insights', icon: Brain },
    { id: 'predictions', label: 'Predictions', icon: TrendingUp },
    { id: 'recommendations', label: 'Recommendations', icon: Lightbulb },
    { id: 'analysis', label: 'Deep Analysis', icon: BarChart3 },
  ];

  const generateAIInsights = async () => {
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
        return prev + 10;
      });
    }, 200);

    // Simulate AI processing time
    setTimeout(() => {
      const generatedInsights: AIInsight[] = [
        {
          id: '1',
          type: 'opportunity',
          title: 'High Solar Potential',
          description: 'Based on orientation and slope analysis, this property has excellent potential for solar panel installation with estimated 85% efficiency.',
          confidence: 92,
          category: 'Renewable Energy',
          actionable: true,
          priority: 'high',
        },
        {
          id: '2',
          type: 'warning',
          title: 'Drainage Concerns',
          description: 'The terrain analysis suggests potential drainage issues in the northern section. Consider implementing proper drainage solutions.',
          confidence: 78,
          category: 'Infrastructure',
          actionable: true,
          priority: 'medium',
        },
        {
          id: '3',
          type: 'recommendation',
          title: 'Optimal Building Placement',
          description: 'AI analysis recommends building placement in the southeastern corner for maximum sun exposure and minimal wind impact.',
          confidence: 85,
          category: 'Development',
          actionable: true,
          priority: 'high',
        },
        {
          id: '4',
          type: 'prediction',
          title: 'Property Value Trend',
          description: 'Based on local market data and property characteristics, this property is predicted to appreciate by 12-15% over the next 3 years.',
          confidence: 73,
          category: 'Market Analysis',
          actionable: false,
          priority: 'medium',
        },
      ];

      const generatedPredictions: AIPrediction[] = [
        {
          category: 'Development Cost',
          prediction: 'Estimated development cost: $180,000 - $220,000',
          confidence: 82,
          factors: ['Terrain complexity', 'Access requirements', 'Utility connections'],
          timeframe: '6-12 months',
        },
        {
          category: 'Environmental Impact',
          prediction: 'Low environmental impact with proper planning',
          confidence: 89,
          factors: ['Existing vegetation', 'Water runoff patterns', 'Wildlife corridors'],
          timeframe: 'Long-term',
        },
        {
          category: 'Market Demand',
          prediction: 'High demand expected for properties in this area',
          confidence: 76,
          factors: ['Location proximity', 'Infrastructure development', 'Population growth'],
          timeframe: '2-3 years',
        },
      ];

      setInsights(generatedInsights);
      setPredictions(generatedPredictions);
    }, 2000);
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'recommendation': return Lightbulb;
      case 'prediction': return TrendingUp;
      default: return Info;
    }
  };

  const getInsightColor = (type: string, priority: string) => {
    if (type === 'warning') return 'red';
    if (type === 'opportunity') return 'green';
    if (priority === 'high') return 'yellow';
    return 'blue';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return '#16a34a';
    if (confidence >= 60) return '#ca8a04';
    return '#dc2626';
  };

  useEffect(() => {
    if (selectedProperty && elevationData) {
      generateAIInsights();
    }
  }, [selectedProperty, elevationData]);

  return (
    <EnhancedCard
      title="AI-Powered Analysis"
      subtitle="Advanced insights and predictions"
      icon={Brain}
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

      {/* Analysis Progress */}
      {isAnalyzing && (
        <div style={{
          backgroundColor: '#f0f9ff',
          border: '1px solid #0ea5e9',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Sparkles size={16} color="#0ea5e9" />
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#0c4a6e' }}>
              AI Analysis in Progress
            </span>
          </div>
          <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: '#e0f2fe',
            borderRadius: '4px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${analysisProgress}%`,
              height: '100%',
              backgroundColor: '#0ea5e9',
              borderRadius: '4px',
              transition: 'width 0.3s ease',
            }} />
          </div>
          <p style={{ fontSize: '12px', color: '#0c4a6e', margin: '8px 0 0 0' }}>
            {analysisProgress}% complete
          </p>
        </div>
      )}

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
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {insights.map(insight => {
                const IconComponent = getInsightIcon(insight.type);
                const color = getInsightColor(insight.type, insight.priority);
                
                return (
                  <div
                    key={insight.id}
                    style={{
                      backgroundColor: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '16px',
                      marginBottom: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
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
                        <IconComponent size={16} />
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: 0 }}>
                            {insight.title}
                          </h5>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              fontSize: '11px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#f3f4f6',
                              color: '#6b7280',
                            }}>
                              {insight.category}
                            </span>
                            <span style={{
                              fontSize: '11px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: getConfidenceColor(insight.confidence),
                              color: 'white',
                            }}>
                              {insight.confidence}%
                            </span>
                          </div>
                        </div>
                        
                        <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 8px 0', lineHeight: '1.4' }}>
                          {insight.description}
                        </p>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <span style={{
                              fontSize: '11px',
                              padding: '2px 6px',
                              borderRadius: '4px',
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
                                padding: '2px 6px',
                                borderRadius: '4px',
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
                    borderRadius: '8px',
                    padding: '16px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: 0 }}>
                      {prediction.category}
                    </h5>
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: getConfidenceColor(prediction.confidence),
                      color: 'white',
                    }}>
                      {prediction.confidence}%
                    </span>
                  </div>
                  
                  <p style={{ fontSize: '13px', color: '#111827', margin: '0 0 8px 0', fontWeight: '500' }}>
                    {prediction.prediction}
                  </p>
                  
                  <div style={{ marginBottom: '8px' }}>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0' }}>
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
              Based on property analysis and market data
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

      {/* Deep Analysis Tab */}
      {activeTab === 'analysis' && (
        <div>
          <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
            Deep Analysis
          </h4>
          
          <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
            <BarChart3 size={48} />
            <p style={{ marginTop: '12px' }}>Comprehensive property analysis</p>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>
              Advanced AI-powered analysis including market trends, environmental factors, and development potential
            </p>
            <EnhancedButton
              variant="primary"
              size="md"
              icon={Eye}
              style={{ marginTop: '16px' }}
            >
              Run Deep Analysis
            </EnhancedButton>
          </div>
        </div>
      )}
    </EnhancedCard>
  );
};
