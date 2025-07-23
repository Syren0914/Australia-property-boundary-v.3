import React, { useState } from 'react';

interface UsageData {
  searches: number;
  elevationProfiles: number;
  apiCalls: number;
  maxSearches: number;
  maxApiCalls: number;
}

interface UsageTrackerProps {
  currentPlan: string;
  usage: UsageData;
  onUpgrade: () => void;
}

export const UsageTracker: React.FC<UsageTrackerProps> = ({
  currentPlan,
  usage,
  onUpgrade
}) => {
  const [isVisible, setIsVisible] = useState(false);

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

  const limits = getPlanLimits(currentPlan);
  const searchPercentage = limits.searches > 0 ? (usage.searches / limits.searches) * 100 : 0;
  const apiPercentage = limits.apiCalls > 0 ? (usage.apiCalls / limits.apiCalls) * 100 : 0;

  const isNearLimit = (percentage: number) => percentage > 80;
  const isOverLimit = (percentage: number) => percentage > 100;

  return (
    <>
      {/* Usage Indicator */}
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="bg-white rounded-lg shadow-lg p-3 border border-gray-200 hover:shadow-xl transition-shadow"
        >
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-sm font-medium text-gray-700">Usage</span>
          </div>
        </button>
      </div>

      {/* Usage Panel */}
      {isVisible && (
        <div className="fixed bottom-16 right-4 z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-80">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Usage Summary</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            {/* Plan Info */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Current Plan</span>
                <span className="text-sm font-semibold text-gray-900 capitalize">{currentPlan}</span>
              </div>
            </div>

            {/* Search Usage */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Searches</span>
                <span className="text-sm text-gray-500">
                  {usage.searches} / {limits.searches === -1 ? '∞' : limits.searches}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    isOverLimit(searchPercentage)
                      ? 'bg-red-500'
                      : isNearLimit(searchPercentage)
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(searchPercentage, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* API Usage */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">API Calls</span>
                <span className="text-sm text-gray-500">
                  {usage.apiCalls} / {limits.apiCalls === -1 ? '∞' : limits.apiCalls}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    isOverLimit(apiPercentage)
                      ? 'bg-red-500'
                      : isNearLimit(apiPercentage)
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(apiPercentage, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Elevation Profiles */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Elevation Profiles</span>
                <span className="text-sm font-semibold text-gray-900">{usage.elevationProfiles}</span>
              </div>
            </div>

            {/* Upgrade Button */}
            {currentPlan !== 'enterprise' && (
              <button
                onClick={onUpgrade}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
              >
                Upgrade Plan
              </button>
            )}

            {/* Warning Messages */}
            {isOverLimit(searchPercentage) && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">
                  You've exceeded your search limit. Please upgrade your plan to continue.
                </p>
              </div>
            )}

            {isNearLimit(searchPercentage) && !isOverLimit(searchPercentage) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-700">
                  You're approaching your search limit. Consider upgrading your plan.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}; 