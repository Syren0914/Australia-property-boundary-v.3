# Vercel Deployment Guide

## Step-by-Step Deployment Instructions

### 1. Prepare Your Repository

Make sure your code is pushed to a GitHub repository:

```bash
git add .
git commit -m "Add subscription model and iframe integration"
git push origin main
```

### 2. Deploy to Vercel

#### Option A: Via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will automatically detect it's a Vite project
5. Click "Deploy"

#### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow the prompts:
# - Set up and deploy? Y
# - Which scope? [your-account]
# - Link to existing project? N
# - What's your project's name? boundary-viewer
# - In which directory is your code located? ./
# - Want to override the settings? N
```

### 3. Configure Environment Variables (Optional)

In your Vercel dashboard:
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add:
   - `VITE_MAPTILER_KEY` = your MapTiler API key
   - `VITE_GOOGLE_ELEVATION_KEY` = your Google Elevation API key

### 4. Get Your Deployment URL

After deployment, you'll get a URL like:
`https://boundary-viewer-abc123.vercel.app`

### 5. Test Your Deployment

1. Visit your deployment URL
2. Test all features:
   - Map loading
   - Search functionality
   - Elevation tool
   - Subscription modal
   - Usage tracking

### 6. Iframe Integration

Once deployed, you can embed your app using:

```html
<iframe 
  src="https://your-vercel-app-url.vercel.app" 
  width="100%" 
  height="600px" 
  frameborder="0"
  allowfullscreen>
</iframe>
```

## Troubleshooting

### Common Issues

1. **Build Fails**: Check the build logs in Vercel dashboard
2. **Map Not Loading**: Verify your MapTiler API key
3. **Elevation API Errors**: Check your Google Elevation API key
4. **CORS Issues**: The `vercel.json` file should handle this

### Performance Optimization

1. **Enable Caching**: Vercel automatically caches static assets
2. **CDN**: Your app is served from Vercel's global CDN
3. **Compression**: Assets are automatically compressed

## Next Steps

1. **Custom Domain**: Add a custom domain in Vercel settings
2. **Analytics**: Enable Vercel Analytics for usage insights
3. **Monitoring**: Set up error monitoring
4. **CI/CD**: Every push to main will auto-deploy

## Support

- Vercel Documentation: [vercel.com/docs](https://vercel.com/docs)
- Vercel Support: [vercel.com/support](https://vercel.com/support) 