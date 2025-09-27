// API Configuration
// Add your API keys here or use environment variables

export const API_CONFIG = {
  // CoreLogic API (Most accurate, paid)
  CORELOGIC: {
    enabled: false, // Set to true when you have an API key
    apiKey: process.env.REACT_APP_CORELOGIC_API_KEY || '',
    baseUrl: 'https://api.corelogic.com.au',
    rateLimit: 1000, // requests per hour
    cost: 'High - Enterprise pricing'
  },

  // Domain API (Good accuracy, paid)
  DOMAIN: {
    enabled: false, // Set to true when you have an API key
    apiKey: process.env.REACT_APP_DOMAIN_API_KEY || '',
    baseUrl: 'https://api.domain.com.au',
    rateLimit: 500, // requests per hour
    cost: 'Medium - Pay per use'
  },

  // Realestate.com.au API (Good accuracy, paid)
  REALESTATE: {
    enabled: false, // Set to true when you have an API key
    apiKey: process.env.REACT_APP_REALESTATE_API_KEY || '',
    baseUrl: 'https://api.realestate.com.au',
    rateLimit: 500, // requests per hour
    cost: 'Medium - Pay per use'
  },

  // Government Data APIs (Free)
  GOVERNMENT: {
    enabled: true, // Always enabled - free
    baseUrl: 'https://data.gov.au/api/v1',
    rateLimit: 10000, // requests per hour
    cost: 'Free'
  },

  // Google Places API (Limited property data, paid)
  GOOGLE_PLACES: {
    enabled: false, // Set to true when you have an API key
    apiKey: process.env.REACT_APP_GOOGLE_PLACES_API_KEY || '',
    baseUrl: 'https://maps.googleapis.com/maps/api',
    rateLimit: 1000, // requests per day
    cost: 'Low - Pay per use'
  }
};

// Environment Variables Template
// Add these to your .env file:
/*
REACT_APP_CORELOGIC_API_KEY=your_corelogic_api_key_here
REACT_APP_DOMAIN_API_KEY=your_domain_api_key_here
REACT_APP_REALESTATE_API_KEY=your_realestate_api_key_here
REACT_APP_GOOGLE_PLACES_API_KEY=your_google_places_api_key_here
*/

export const getEnabledAPIs = () => {
  return Object.entries(API_CONFIG)
    .filter(([_, config]) => config.enabled)
    .map(([name, config]) => ({ name: name.toLowerCase(), ...config }));
};

export const getAPICost = () => {
  const enabled = getEnabledAPIs();
  const costs = enabled.map(api => api.cost);
  
  if (costs.includes('High - Enterprise pricing')) {
    return 'High - Enterprise APIs enabled';
  } else if (costs.includes('Medium - Pay per use')) {
    return 'Medium - Pay per use APIs enabled';
  } else if (costs.includes('Low - Pay per use')) {
    return 'Low - Pay per use APIs enabled';
  } else {
    return 'Free - Government APIs only';
  }
};
