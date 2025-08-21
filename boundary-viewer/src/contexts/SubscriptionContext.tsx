import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';


interface UsageData {
  searches: number;
  elevationProfiles: number;
  apiCalls: number;
  maxSearches: number;
  maxApiCalls: number;
}

interface SubscriptionContextType {
  currentPlan: string;
  usage: UsageData;
  showSubscriptionModal: boolean;
  setShowSubscriptionModal: (show: boolean) => void;
  incrementSearch: () => void;
  incrementElevationProfile: () => void;
  incrementApiCall: () => void;
  canPerformAction: (action: 'search' | 'elevation' | 'api') => boolean;
  subscribeToPlan: (planId: string) => void;
  resetUsage: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [usage, setUsage] = useState<UsageData>({
    searches: 0,
    elevationProfiles: 0,
    apiCalls: 0,
    maxSearches: 10,
    maxApiCalls: 100
  });

  // Load subscription data from localStorage on mount
  useEffect(() => {
    const savedPlan = localStorage.getItem('subscription_plan') || 'free';
    const savedUsage = localStorage.getItem('subscription_usage');
    
    setCurrentPlan(savedPlan);
    
    if (savedUsage) {
      try {
        const parsedUsage = JSON.parse(savedUsage);
        setUsage(parsedUsage);
      } catch (error) {
        console.error('Error parsing saved usage:', error);
      }
    }
  }, []);

  // Save usage to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('subscription_usage', JSON.stringify(usage));
  }, [usage]);

  // Reset usage daily
  useEffect(() => {
    const lastReset = localStorage.getItem('last_usage_reset');
    const today = new Date().toDateString();
    
    if (lastReset !== today) {
      resetUsage();
      localStorage.setItem('last_usage_reset', today);
    }
  }, []);

  const getPlanLimits = (plan: string) => {
    switch (plan) {
      case 'free':
        return { searches: 10, apiCalls: 100 };
      case 'starter':
        return { searches: 100, apiCalls: 1000 };
      case 'professional':
        return { searches: -1, apiCalls: 10000 };
      case 'enterprise':
        return { searches: -1, apiCalls: -1 };
      default:
        return { searches: 10, apiCalls: 100 };
    }
  };

  const incrementSearch = () => {
    setUsage(prev => ({
      ...prev,
      searches: prev.searches + 1
    }));
  };

  const incrementElevationProfile = () => {
    setUsage(prev => ({
      ...prev,
      elevationProfiles: prev.elevationProfiles + 1
    }));
  };

  const incrementApiCall = () => {
    setUsage(prev => ({
      ...prev,
      apiCalls: prev.apiCalls + 1
    }));
  };

  const canPerformAction = (action: 'search' | 'elevation' | 'api'): boolean => {
    const limits = getPlanLimits(currentPlan);
    
    switch (action) {
      case 'search':
        return limits.searches === -1 || usage.searches < limits.searches;
      case 'elevation':
        return true; // No limit on elevation profiles
      case 'api':
        return limits.apiCalls === -1 || usage.apiCalls < limits.apiCalls;
      default:
        return true;
    }
  };

  const subscribeToPlan = (planId: string) => {
    setCurrentPlan(planId);
    localStorage.setItem('subscription_plan', planId);
    setShowSubscriptionModal(false);
    
    // Update limits based on new plan
    const limits = getPlanLimits(planId);
    setUsage(prev => ({
      ...prev,
      maxSearches: limits.searches,
      maxApiCalls: limits.apiCalls
    }));
  };

  const resetUsage = () => {
    setUsage(prev => ({
      ...prev,
      searches: 0,
      elevationProfiles: 0,
      apiCalls: 0
    }));
  };

  const value: SubscriptionContextType = {
    currentPlan,
    usage,
    showSubscriptionModal,
    setShowSubscriptionModal,
    incrementSearch,
    incrementElevationProfile,
    incrementApiCall,
    canPerformAction,
    subscribeToPlan,
    resetUsage
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
      
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = (): SubscriptionContextType => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}; 