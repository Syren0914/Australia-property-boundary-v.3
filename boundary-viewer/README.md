# Property Boundary Viewer

An interactive map viewer with elevation analysis, property boundaries, and subscription-based usage tracking. Built with React, TypeScript, MapLibre GL, and Chart.js.

## Features

- 🗺️ **Interactive Map**: Full-screen map with satellite and street view options
- 📏 **Elevation Analysis**: Draw lines and generate elevation profiles with detailed statistics
- 🏠 **Property Boundaries**: View and measure property boundaries with area calculations
- 🔍 **Global Search**: Search for locations worldwide with autocomplete suggestions
- 💳 **Subscription Model**: Usage tracking with different plan tiers (Free, Starter, Professional, Enterprise)
- 📊 **Usage Analytics**: Real-time usage tracking with visual indicators
- 🔗 **Iframe Integration**: Easy embedding in other applications
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Subscription Plans

| Plan | Price | Searches/Day | API Calls | Features |
|------|-------|--------------|-----------|----------|
| **Free** | $0 | 10 | 100 | Basic map viewing, elevation profiles |
| **Starter** | $9.99/month | 100 | 1,000 | Export data, email support |
| **Professional** | $29.99/month | Unlimited | 10,000 | API access, priority support |
| **Enterprise** | $99.99/month | Unlimited | Unlimited | White-label, custom features |

## Quick Start

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd boundary-viewer

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

## Deployment to Vercel

### Option 1: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. **Follow the prompts** and your app will be deployed!

### Option 2: Deploy via GitHub

1. **Push your code to GitHub**
2. **Connect your repository to Vercel**
3. **Vercel will automatically deploy** on every push

### Option 3: Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will automatically detect the Vite configuration and deploy

## Iframe Integration

### Basic Integration

```html
<iframe 
  src="https://your-vercel-app-url.vercel.app" 
  width="100%" 
  height="600px" 
  frameborder="0"
  allowfullscreen>
</iframe>
```

### React Component

```jsx
import React from 'react';

const MapViewer = () => {
  return (
    <div style={{ width: '100%', height: '600px', position: 'relative' }}>
      <iframe
        src="https://your-vercel-app-url.vercel.app"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
        title="Property Boundary Viewer"
        allowFullScreen
      />
    </div>
  );
};

export default MapViewer;
```

### Advanced Integration with Communication

```jsx
import React, { useRef, useEffect } from 'react';

const MapViewer = () => {
  const iframeRef = useRef(null);

  useEffect(() => {
    // Listen for messages from the iframe
    const handleMessage = (event) => {
      if (event.origin !== 'https://your-vercel-app-url.vercel.app') return;
      
      console.log('Message from iframe:', event.data);
      
      switch(event.data.type) {
        case 'subscription_required':
          // Handle subscription requirement
          break;
        case 'usage_limit_reached':
          // Handle usage limit
          break;
        case 'location_selected':
          // Handle location selection
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const sendMessageToIframe = (message) => {
    if (iframeRef.current) {
      iframeRef.current.contentWindow.postMessage(message, 'https://your-vercel-app-url.vercel.app');
    }
  };

  return (
    <iframe
      ref={iframeRef}
      src="https://your-vercel-app-url.vercel.app"
      style={{ width: '100%', height: '600px', border: 'none' }}
      title="Property Boundary Viewer"
      allowFullScreen
    />
  );
};
```

## API Integration

### Message Types

#### From Parent to Iframe
- `focus`: Focus on specific location
- `reset`: Reset map view
- `toggleSidebar`: Toggle sidebar visibility

#### From Iframe to Parent
- `subscription_required`: When subscription is needed
- `usage_limit_reached`: When usage limit is exceeded
- `location_selected`: When user selects a location

### Example Usage

```javascript
// Send message to iframe
iframe.contentWindow.postMessage({
  type: 'focus',
  location: [153.026, -27.4705],
  zoom: 16
}, 'https://your-vercel-app-url.vercel.app');

// Listen for messages from iframe
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://your-vercel-app-url.vercel.app') return;
  
  console.log('Message from iframe:', event.data);
});
```

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_MAPTILER_KEY=your_maptiler_key
VITE_GOOGLE_ELEVATION_KEY=your_google_elevation_key
```

### Customization

- **Map Styles**: Modify map styles in `App.tsx`
- **Subscription Plans**: Update plans in `SubscriptionModal.tsx`
- **Usage Limits**: Adjust limits in `SubscriptionContext.tsx`
- **API Endpoints**: Update API URLs in respective components

## File Structure

```
src/
├── components/
│   ├── SubscriptionModal.tsx    # Subscription plans modal
│   ├── UsageTracker.tsx         # Usage tracking component
│   └── ElevationChart.tsx       # Elevation profile chart
├── contexts/
│   └── SubscriptionContext.tsx  # Subscription state management
├── App.tsx                      # Main application component
├── Search.tsx                   # Search functionality
└── main.tsx                     # Application entry point
```

## Technologies Used

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **MapLibre GL** - Map rendering
- **Chart.js** - Elevation profile charts
- **Turf.js** - Geospatial analysis
- **Tailwind CSS** - Styling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support and questions:
- Create an issue in the repository
- Contact: your-email@example.com

## Roadmap

- [ ] Payment integration (Stripe)
- [ ] User authentication
- [ ] Advanced analytics dashboard
- [ ] Mobile app
- [ ] API rate limiting
- [ ] Custom branding options
- [ ] Export to PDF
- [ ] 3D visualization
