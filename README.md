# Property Boundary Viewer – Monorepo

An interactive web app for exploring property boundaries, elevation analysis, and value insights. This repository includes the React frontend, sample data, and optional tooling.

## Repository Layout

- `boundary-viewer/` – Main React + TypeScript + Vite app (MapLibre, PMTiles, charts)
- `public/` – Example datasets at the repo root (not used by the app build)
- `prediction/` – Python example for price prediction (`main.py`)
- `server/` – Native build artifacts (not required for the web app)
- `tippecanoe/` – Tippecanoe sources/binaries for generating vector tiles

## Key Features

- Interactive map (MapLibre GL) with satellite/street layers
- Elevation drawing with detailed statistics and charts
- Property boundaries visualization and measurements (PMTiles/GeoJSON)
- Global address search (Google Geocoding)
- Insight panels and basic value estimation examples
- Iframe embeddable

## Quick Start (Frontend)

1) Prerequisites

- Node.js 18+ (20+ recommended)
- npm (or pnpm/yarn)

2) Install and run

```bash
cd boundary-viewer
npm install
npm run dev
```

Open `http://localhost:5173`.

3) Production build

```bash
npm run build
```

Build output: `boundary-viewer/dist/`.

## Environment Variables

Create `boundary-viewer/.env` (Vite loads `VITE_*`).

```env
# Map tiles (MapTiler or provider)
VITE_MAPTILER_KEY=your_maptiler_key

# Google APIs (search/elevation)
VITE_GOOGLE_MAPS_KEY=your_google_maps_api_key
VITE_GOOGLE_ELEVATION_KEY=your_google_elevation_api_key

# Optional examples
VITE_CORELOGIC_API_KEY=your_corelogic_key
VITE_DOMAIN_API_KEY=your_domain_key
```

Notes:
- Search is global (no regional restrictions). Uses Google Geocoding with `address` and `key`.
- Prefer `VITE_*` vars with Vite.

## Vercel Deployment

Configured for static hosting via Vite:

- Build: `npm run build`
- Output: `dist`
- SPA rewrites and headers: see `boundary-viewer/vercel.json`

Steps:

1) Push repo to GitHub
2) Import into Vercel (framework: Vite detected)
3) Add env vars in Vercel dashboard
4) Deploy

Troubleshooting:
- Fetch `params` error: use query strings (`URLSearchParams`) not axios-style `params`.
- `framer-motion` resolution error: the app no longer uses it; remove imports or install if reintroduced.
- Large bundle warnings: use dynamic imports or manual chunking in `vite.config.ts`.

## Data & PMTiles

- Place `.pmtiles`/`.geojson` in `boundary-viewer/public/` for static serving.
- See `boundary-viewer/PMTILES_HOSTING.md` and `boundary-viewer/QUICK_PMTILES_SETUP.md`.

## Optional Components

- `tippecanoe/`: build vector tiles (not required for frontend)
- `prediction/`: Python example (not part of the web build)

## Dev Notes

- Stack: React, TypeScript, Vite, MapLibre GL, Recharts/Chart.js, Tailwind utilities
- Lint: `npm run lint` inside `boundary-viewer`
- Build: use Vite build for local and Vercel

## Embedding

Embed the app via iframe; see `boundary-viewer/README.md` for detailed examples. Ensure headers in `vercel.json` allow embedding when hosted on Vercel.

## License

MIT (adjust as needed).

## Support

Open an issue in your repository or contact the maintainer.
