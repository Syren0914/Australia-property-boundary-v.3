# Quick PMTiles Setup - GitHub Releases (5 minutes)

## Step 1: Create GitHub Repository

1. Go to [github.com](https://github.com)
2. Create a new repository called `pmtiles-data`
3. Make it public

## Step 2: Upload PMTiles to GitHub Releases

1. Go to your new repository
2. Click "Releases" on the right side
3. Click "Create a new release"
4. Tag version: `v1.0.0`
5. Title: `PMTiles Data Release`
6. Upload your `output.pmtiles` file (drag and drop)
7. Click "Publish release"

## Step 3: Get Your PMTiles URL

Your PMTiles will be available at:
```
https://github.com/[your-username]/pmtiles-data/releases/download/v1.0.0/output.pmtiles
```

## Step 4: Update Your App

Replace the PMTiles URL in your `App.tsx`:

```typescript
// Find this line in App.tsx (around line 150):
const pmtilesUrl = 'output.pmtiles';

// Replace it with:
const pmtilesUrl = 'https://github.com/[your-username]/pmtiles-data/releases/download/v1.0.0/output.pmtiles';
```

## Step 5: Test Locally

```bash
npm run dev
```

Check the browser console to make sure the PMTiles loads without errors.

## Step 6: Deploy to Vercel

```bash
vercel --prod
```

## Alternative: Cloudflare R2 (More Professional)

If you want a more professional setup:

### 1. Install Wrangler
```bash
npm install -g wrangler
```

### 2. Login and Create Bucket
```bash
wrangler login
wrangler r2 bucket create pmtiles-data
```

### 3. Upload PMTiles
```bash
wrangler r2 object put pmtiles-data/output.pmtiles --file=public/output.pmtiles
```

### 4. Get Your URL
Your URL will be: `https://pub-[hash].r2.dev/pmtiles-data/output.pmtiles`

### 5. Update App.tsx
```typescript
const pmtilesUrl = 'https://pub-[your-hash].r2.dev/pmtiles-data/output.pmtiles';
```

## Why This Works

- **GitHub Releases**: Free, unlimited storage, global CDN
- **Cloudflare R2**: Professional, fast, reliable
- **Your App**: Stays small (< 100MB) for Vercel deployment
- **PMTiles**: Loads from CDN when needed

## Testing

After setup, test that your property boundaries load correctly:

1. Open your app
2. Look for property boundaries on the map
3. Click on properties to see measurements
4. Check browser network tab for PMTiles requests

## Troubleshooting

### PMTiles Not Loading
- Check the URL is correct
- Verify the file uploaded to GitHub/Cloudflare
- Check browser console for errors

### CORS Issues
- GitHub Releases should work without CORS issues
- For Cloudflare R2, you may need to configure CORS headers

### Slow Loading
- GitHub Releases: Good for development
- Cloudflare R2: Better for production (faster)

## Next Steps

1. Choose GitHub Releases (quick) or Cloudflare R2 (professional)
2. Upload your PMTiles file
3. Update the URL in your app
4. Deploy to Vercel
5. Test the complete functionality

Your app will now work perfectly with all the property boundary data! 🎉 