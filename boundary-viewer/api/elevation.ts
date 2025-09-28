// POST /api/elevation
// Body: { points: [ [lng,lat], ... ] }
// Returns: { elevations: number[] }

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const points: [number, number][] = Array.isArray(body.points) ? body.points : [];
    if (!points.length) return res.status(200).json({ error: 'missing_points' });

    const key = (process.env.GOOGLE_MAPS_KEY || process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_KEY) as string | undefined;
    if (!key) return res.status(200).json({ error: 'missing_google_key' });

    // Google Elevation API allows many points; chunk conservatively
    const chunkSize = 200;
    const elevations: number[] = [];
    for (let i = 0; i < points.length; i += chunkSize) {
      const slice = points.slice(i, i + chunkSize);
      const locations = slice.map(([lng, lat]) => `${lat},${lng}`).join('|');
      const url = `https://maps.googleapis.com/maps/api/elevation/json?locations=${encodeURIComponent(locations)}&key=${key}`;
      const r = await fetch(url);
      if (!r.ok) return res.status(200).json({ error: 'google_http_error', status: r.status });
      const data = await r.json();
      if (data.status !== 'OK' || !Array.isArray(data.results)) {
        return res.status(200).json({ error: 'google_api_error', detail: data.status || 'unknown' });
      }
      elevations.push(...data.results.map((x: any) => Number(x.elevation)));
    }

    return res.status(200).json({ elevations });
  } catch (e: any) {
    return res.status(200).json({ error: 'internal_error', detail: String(e && e.message || e) });
  }
}


