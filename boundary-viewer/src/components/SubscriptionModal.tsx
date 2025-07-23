import React, { useState } from 'react';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  features: string[];
  popular?: boolean;
  maxUsage: number;
  apiCalls: number;
}

interface SubscriptionModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSubscribe: (planId: string) => void;
  currentPlan?: string;
}

const plans: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'forever',
    features: [
      'Basic map viewing',
      'Up to 10 searches per day',
      'Basic elevation profiles',
      'Community support'
    ],
    maxUsage: 10,
    apiCalls: 100
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 9.99,
    period: 'month',
    features: [
      'Everything in Free',
      'Up to 100 searches per day',
      'Advanced elevation analysis',
      'Export data to CSV',
      'Email support'
    ],
    maxUsage: 100,
    apiCalls: 1000
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 29.99,
    period: 'month',
    features: [
      'Everything in Starter',
      'Unlimited searches',
      'Advanced analytics',
      'API access',
      'Priority support',
      'Custom integrations'
    ],
    popular: true,
    maxUsage: -1, // unlimited
    apiCalls: 10000
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99.99,
    period: 'month',
    features: [
      'Everything in Professional',
      'White-label solution',
      'Dedicated support',
      'Custom features',
      'SLA guarantee',
      'On-premise deployment'
    ],
    maxUsage: -1,
    apiCalls: -1 // unlimited
  }
];

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isVisible,
  onClose,
  onSubscribe,
  currentPlan = 'free'
}) => {
  const [selectedPlan] = useState<string>(currentPlan);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isVisible) return null;

  const handleSubscribe = async (planId: string) => {
    setIsProcessing(true);
    try {
      // Here you would integrate with your payment processor (Stripe, etc.)
      console.log('Subscribing to plan:', planId);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      onSubscribe(planId);
    } catch (error) {
      console.error('Subscription error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Choose Your Plan</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative border rounded-lg p-6 transition-all ${
                  selectedPlan === plan.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${plan.popular ? 'ring-2 ring-blue-500' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-gray-900">
                      ${plan.price}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-gray-500">/{plan.period}</span>
                    )}
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <svg
                        className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-sm text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isProcessing || currentPlan === plan.id}
                  className={`w-full py-2 px-4 rounded-lg font-semibold transition-colors ${
                    currentPlan === plan.id
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : selectedPlan === plan.id
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : currentPlan === plan.id ? (
                    'Current Plan'
                  ) : (
                    plan.price === 0 ? 'Get Started' : 'Subscribe'
                  )}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center text-sm text-gray-500">
            <p>All plans include a 14-day free trial. Cancel anytime.</p>
            <p className="mt-2">
              Need a custom plan? <a href="#" className="text-blue-500 hover:underline">Contact us</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}; 