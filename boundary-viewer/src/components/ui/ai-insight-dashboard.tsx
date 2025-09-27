import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  TrendingUp, 
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
  TreePine,
  Sparkles,
  Eye,
  Download,
  Share2,
  RefreshCw,
  Settings,
  Filter,
  Search,
  Layers,
  Compass
} from 'lucide-react';
import { EnhancedButton } from './enhanced-button';
import { EnhancedCard } from './enhanced-card';
import { StatCard } from './enhanced-card';
import { AIPropertyAnalysis } from './ai-property-analysis';
import { MarketPrediction } from './market-prediction';

interface AIInsightDashboardProps {
  selectedProperty?: any;
  elevationData?: { distances: number[]; elevations: number[] };
  mapCenter: [number, number];
}

interface DashboardStats {
  totalInsights: number;
  highConfidencePredictions: number;
  actionableRecommendations: number;
  riskFactors: number;
  opportunities: number;
  marketTrends: number;
}

interface AIInsight {
  id: string;
  category: 'property' | 'market' | 'environmental' | 'financial' | 'development';
  type: 'opportunity' | 'warning' | 'recommendation' | 'prediction';
  title: string;
  description: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
  impact: string;
  timeframe: string;
  cost?: string;
  roi?: string;
}

export const AIInsightDashboard: React.FC<AIInsightDashboardProps> = ({
  selectedProperty,
  elevationData,
  mapCenter
}) => {
  const [activeView, setActiveView] = useState<'overview' | 'property' | 'market' | 'combined'>('overview');
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalInsights: 0,
    highConfidencePredictions: 0,
    actionableRecommendations: 0,
    riskFactors: 0,
    opportunities: 0,
    marketTrends: 0,
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [selectedFilters, setSelectedFilters] = useState({
    categories: ['property', 'market', 'environmental', 'financial', 'development'],
    priorities: ['high', 'medium', 'low'],
    timeframes: ['immediate', 'short-term', 'long-term'],
  });

  const views = [
    { id: 'overview', label: 'Overview', icon: BarChart3, description: 'AI insights summary' },
    { id: 'property', label: 'Property Analysis', icon: Home, description: 'Terrain and development insights' },
    { id: 'market', label: 'Market Predictions', icon: TrendingUp, description: 'Market trends and forecasts' },
    { id: 'combined', label: 'Combined Analysis', icon: Brain, description: 'Integrated AI insights' },
  ];

  const categories = [
    { id: 'property', label: 'Property', icon: Home, color: 'blue' },
    { id: 'market', label: 'Market', icon: TrendingUp, color: 'green' },
    { id: 'environmental', label: 'Environmental', icon: TreePine, color: 'green' },
    { id: 'financial', label: 'Financial', icon: DollarSign, color: 'yellow' },
    { id: 'development', label: 'Development', icon: Building, color: 'purple' },
  ];

  // Simulate comprehensive AI analysis
  const runComprehensiveAnalysis = async () => {
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
        return prev + 8;
      });
    }, 200);

    // Simulate comprehensive analysis time
    setTimeout(() => {
      setDashboardStats({
        totalInsights: 23,
        highConfidencePredictions: 8,
        actionableRecommendations: 12,
        riskFactors: 3,
        opportunities: 15,
        marketTrends: 6,
      });
    }, 3000);
  };

  useEffect(() => {
    if (selectedProperty && elevationData) {
      runComprehensiveAnalysis();
    }
  }, [selectedProperty, elevationData]);

  const getCategoryIcon = (category: string) => {
    const cat = categories.find(c => c.id === category);
    return cat ? cat.icon : Brain;
  };

  const getCategoryColor = (category: string) => {
    const cat = categories.find(c => c.id === category);
    return cat ? cat.color : 'blue';
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            backgroundColor: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
          }}>
            <Brain size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
              AI Insight Dashboard
            </h2>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
              Intelligent property and market analysis
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <EnhancedButton
            variant="ghost"
            size="sm"
            icon={RefreshCw}
            onClick={runComprehensiveAnalysis}
            disabled={isAnalyzing}
          >
            Refresh
          </EnhancedButton>
          <EnhancedButton
            variant="ghost"
            size="sm"
            icon={Download}
          >
            Export
          </EnhancedButton>
          <EnhancedButton
            variant="ghost"
            size="sm"
            icon={Share2}
          >
            Share
          </EnhancedButton>
        </div>
      </div>

      {/* View Selection */}
      <div style={{
        backgroundColor: '#f9fafb',
        borderBottom: '1px solid #e5e7eb',
        padding: '12px 20px',
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {views.map(view => (
            <EnhancedButton
              key={view.id}
              onClick={() => setActiveView(view.id as any)}
              variant={activeView === view.id ? 'primary' : 'ghost'}
              size="sm"
              icon={view.icon}
              style={{ borderRadius: '8px' }}
            >
              {view.label}
            </EnhancedButton>
          ))}
        </div>
      </div>

      {/* Analysis Progress */}
      {isAnalyzing && (
        <div style={{
          backgroundColor: '#f0f9ff',
          borderBottom: '1px solid #0ea5e9',
          padding: '16px 20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Sparkles size={16} color="#0ea5e9" />
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#0c4a6e' }}>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#0c4a6e', marginTop: '4px' }}>
            <span>Analyzing property data, market trends, and environmental factors...</span>
            <span>{analysisProgress}%</span>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
        {activeView === 'overview' && (
          <div>
            {/* Dashboard Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <StatCard
                title="Total Insights"
                value={dashboardStats.totalInsights.toString()}
                icon={Brain}
                color="blue"
                subtitle="AI-generated insights"
              />
              <StatCard
                title="High Confidence"
                value={dashboardStats.highConfidencePredictions.toString()}
                icon={CheckCircle}
                color="green"
                subtitle="Predictions >80% confidence"
              />
              <StatCard
                title="Actionable Items"
                value={dashboardStats.actionableRecommendations.toString()}
                icon={Target}
                color="yellow"
                subtitle="Immediate actions"
              />
              <StatCard
                title="Opportunities"
                value={dashboardStats.opportunities.toString()}
                icon={TrendingUp}
                color="green"
                subtitle="Growth potential"
              />
              <StatCard
                title="Risk Factors"
                value={dashboardStats.riskFactors.toString()}
                icon={AlertCircle}
                color="red"
                subtitle="Areas of concern"
              />
              <StatCard
                title="Market Trends"
                value={dashboardStats.marketTrends.toString()}
                icon={BarChart3}
                color="purple"
                subtitle="Trending factors"
              />
            </div>

            {/* Category Breakdown */}
            <EnhancedCard
              title="Insights by Category"
              subtitle="Distribution of AI insights across different analysis areas"
              icon={PieChart}
              variant="elevated"
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                {categories.map(category => {
                  const IconComponent = category.icon;
                  const count = Math.floor(Math.random() * 8) + 2; // Simulate counts
                  
                  return (
                    <div
                      key={category.id}
                      style={{
                        backgroundColor: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        backgroundColor: category.color === 'blue' ? '#eff6ff' :
                                       category.color === 'green' ? '#f0fdf4' :
                                       category.color === 'yellow' ? '#fefce8' :
                                       category.color === 'purple' ? '#faf5ff' : '#f3f4f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: category.color === 'blue' ? '#3b82f6' :
                               category.color === 'green' ? '#16a34a' :
                               category.color === 'yellow' ? '#ca8a04' :
                               category.color === 'purple' ? '#9333ea' : '#6b7280',
                      }}>
                        <IconComponent size={16} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827' }}>
                          {category.label}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>
                          {count} insights
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </EnhancedCard>

            {/* Quick Actions */}
            <EnhancedCard
              title="Quick Actions"
              subtitle="Common AI analysis tasks"
              icon={Zap}
              variant="elevated"
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <EnhancedButton
                  variant="outline"
                  size="md"
                  icon={Home}
                  onClick={() => setActiveView('property')}
                  style={{ justifyContent: 'flex-start', height: 'auto', padding: '12px' }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '13px', fontWeight: '500' }}>Property Analysis</div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>Terrain and development insights</div>
                  </div>
                </EnhancedButton>
                
                <EnhancedButton
                  variant="outline"
                  size="md"
                  icon={TrendingUp}
                  onClick={() => setActiveView('market')}
                  style={{ justifyContent: 'flex-start', height: 'auto', padding: '12px' }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '13px', fontWeight: '500' }}>Market Predictions</div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>Value and trend forecasts</div>
                  </div>
                </EnhancedButton>
                
                <EnhancedButton
                  variant="outline"
                  size="md"
                  icon={Brain}
                  onClick={() => setActiveView('combined')}
                  style={{ justifyContent: 'flex-start', height: 'auto', padding: '12px' }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '13px', fontWeight: '500' }}>Combined Analysis</div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>Integrated AI insights</div>
                  </div>
                </EnhancedButton>
                
                <EnhancedButton
                  variant="outline"
                  size="md"
                  icon={Download}
                  style={{ justifyContent: 'flex-start', height: 'auto', padding: '12px' }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '13px', fontWeight: '500' }}>Export Report</div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>Generate comprehensive report</div>
                  </div>
                </EnhancedButton>
              </div>
            </EnhancedCard>
          </div>
        )}

        {activeView === 'property' && (
          <AIPropertyAnalysis
            selectedProperty={selectedProperty}
            elevationData={elevationData}
            mapCenter={mapCenter}
          />
        )}

        {activeView === 'market' && (
          <MarketPrediction
            selectedProperty={selectedProperty}
            elevationData={elevationData}
            mapCenter={mapCenter}
          />
        )}

        {activeView === 'combined' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <AIPropertyAnalysis
              selectedProperty={selectedProperty}
              elevationData={elevationData}
              mapCenter={mapCenter}
            />
            <MarketPrediction
              selectedProperty={selectedProperty}
              elevationData={elevationData}
              mapCenter={mapCenter}
            />
          </div>
        )}
      </div>
    </div>
  );
};

