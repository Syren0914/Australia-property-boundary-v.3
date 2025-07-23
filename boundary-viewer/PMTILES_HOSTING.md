# PMTiles Hosting Guide

## Why PMTiles Need Special Hosting

Your `output.pmtiles` file (426MB) contains the property boundary data that makes your app special. Vercel has a 100MB file size limit, so we need to host it separately on a CDN.

## Option 1: Cloudflare R2 (Recommended)

### Step 1: Create Cloudflare Account
1. Go to [cloudflare.com](https://cloudflare.com)
2. Sign up for a free account
3. Add your domain (or use a subdomain)

### Step 2: Set Up R2 Storage
1. In Cloudflare dashboard, go to "R2 Object Storage"
2. Create a new bucket called `pmtiles-data`
3. Upload your `output.pmtiles` file
4. Make the bucket public

### Step 3: Get Your PMTiles URL
Your PMTiles will be available at:
```
https://pub-[hash].r2.dev/pmtiles-data/output.pmtiles
```

### Step 4: Update Your App
Replace the PMTiles URL in your code:

```typescript
// In App.tsx, change this line:
const pmtilesUrl = 'https://pub-[your-hash].r2.dev/pmtiles-data/output.pmtiles';
```

## Option 2: AWS S3 + CloudFront

### Step 1: Create S3 Bucket
1. Go to AWS S3 console
2. Create a new bucket (e.g., `my-pmtiles-bucket`)
3. Upload `output.pmtiles`
4. Make it public

### Step 2: Set Up CloudFront
1. Create CloudFront distribution
2. Point to your S3 bucket
3. Get your CloudFront URL

### Step 3: Update Your App
```typescript
const pmtilesUrl = 'https://[your-cloudfront-domain].cloudfront.net/output.pmtiles';
```

## Option 3: GitHub Releases (Free)

### Step 1: Create GitHub Release
1. Go to your GitHub repository
2. Create a new release
3. Upload `output.pmtiles` as an asset
4. Get the download URL

### Step 2: Update Your App
```typescript
const pmtilesUrl = 'https://github.com/[username]/[repo]/releases/download/v1.0.0/output.pmtiles';
```

## Option 4: PMTiles Server (Self-Hosted)

### Step 1: Set Up PMTiles Server
```bash
# Install PMTiles server
npm install -g @protomaps/pmtiles

# Serve your PMTiles file
pmtiles serve output.pmtiles --port 8080
```

### Step 2: Deploy PMTiles Server
Deploy the server to:
- Railway
- Render
- Heroku
- DigitalOcean

### Step 3: Update Your App
```typescript
const pmtilesUrl = 'https://your-pmtiles-server.railway.app/output.pmtiles';
```

## Recommended Setup: Cloudflare R2

Here's the complete setup for Cloudflare R2:

### 1. Create R2 Bucket
```bash
# Install Wrangler (Cloudflare CLI)
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create bucket
wrangler r2 bucket create pmtiles-data

# Upload PMTiles file
wrangler r2 object put pmtiles-data/output.pmtiles --file=public/output.pmtiles
```

### 2. Update Your App Code
```typescript
// In App.tsx
const pmtilesUrl = 'https://pub-[your-hash].r2.dev/pmtiles-data/output.pmtiles';
```

### 3. Deploy to Vercel
Now your app can be deployed to Vercel without the large file!

## Cost Comparison

| Service | Storage | Bandwidth | Cost for 426MB |
|---------|---------|-----------|----------------|
| Cloudflare R2 | 10GB free | 1M requests free | $0/month |
| AWS S3 | 5GB free | 15GB free | ~$0.01/month |
| GitHub Releases | Unlimited | Unlimited | $0/month |
| Self-hosted | Varies | Varies | $5-20/month |

## Testing Your Setup

After uploading to CDN, test your PMTiles:

```bash
# Test if PMTiles is accessible
curl -I https://your-cdn-url.com/output.pmtiles

# Should return 200 OK
```

## Troubleshooting

### PMTiles Not Loading
1. Check if URL is accessible
2. Verify CORS headers
3. Check browser network tab

### Slow Loading
1. Use a CDN with edge locations
2. Enable compression
3. Consider splitting large files

### CORS Issues
Add CORS headers to your CDN:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, HEAD
Access-Control-Allow-Headers: Range
```

## Next Steps

1. Choose your hosting option (recommend Cloudflare R2)
2. Upload your PMTiles file
3. Update the URL in your app
4. Deploy to Vercel
5. Test the complete functionality

Your app will now work perfectly with the property boundary data! 🎉 