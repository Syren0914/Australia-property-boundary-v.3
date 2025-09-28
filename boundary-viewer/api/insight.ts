// POST /api/insight
// Body: { address: string }
// Returns JSON: { address, current_estimate, yoy_pct, forecast:[{year,value},{year,value}], market_summary }

import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const address = String(body.address || '').trim();
    if (!address) return res.status(200).json({ error: 'missing_address' });

    const key = process.env.GEMINI_API_KEY as string | undefined;
    if (!key) return res.status(200).json({ error: 'missing_gemini_key' });

    const ai = new GoogleGenAI({ apiKey: key });
    const tools = [ { googleSearch: {} } ];
    const config = { thinkingConfig: { thinkingBudget: -1 }, tools } as any;
      const model = 'gemini-flash-latest';
      const prompt = [
        'You are a real-estate analyst. Using realtor platforms, return ONLY JSON with fields:',
        'address, current_estimate (number), yoy_pct (number),',
        'forecast (array of exactly 2 objects {year:number,value:number}) where years are the next two consecutive calendar years after the latest known history year and values follow realistic YoY bounded within ±10% around current_estimate,',
        'market_summary (string). Use null when unknown. No extra text.',
        'platform_estimates (array of objects {source:string,price:number}). Use null when unknown. No extra text.',
        `Address: ${address}`
      ].join(' ');

    const stream = await (ai as any).models.generateContentStream({ model, config, contents: [{ role:'user', parts: [{ text: prompt }] }] });
    let text = '';
    for await (const chunk of stream) {
      text += chunk.text || '';
    }
    text = text.trim();
    if (text.startsWith('```')) text = text.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
    try {
      const json = JSON.parse(text);
      // Post-process to keep forecasts close to current_estimate
      const now = new Date().getFullYear();
      const current = typeof json.current_estimate === 'number' ? Number(json.current_estimate) : undefined;
      let g = typeof json.yoy_pct === 'number' ? Number(json.yoy_pct) / 100 : undefined;
      if (typeof g !== 'number' || Number.isNaN(g)) g = undefined;
      // Clamp YoY growth to a realistic band (-10% .. +10%)
      if (typeof g === 'number') {
        if (g > 0.10) g = 0.10;
        if (g < -0.10) g = -0.10;
      }
      const fallbackG = 0.04; // gentle default
      if (current && (!Array.isArray(json.forecast) || json.forecast.length < 2)) {
        const gg = (typeof g === 'number' ? g : fallbackG);
        json.forecast = [
          { year: now + 1, value: Math.round(current * (1 + gg)) },
          { year: now + 2, value: Math.round(current * Math.pow(1 + gg, 2)) }
        ];
      } else if (current && Array.isArray(json.forecast)) {
        // Adjust any wildly off forecast points to remain close to current and growth band
        const gg = (typeof g === 'number' ? g : fallbackG);
        json.forecast = json.forecast.slice(0, 2).map((f: any, idx: number) => {
          const target = current * Math.pow(1 + gg, idx + 1);
          // If model value deviates more than 25%, pull it toward target
          let v = Number(f?.value);
          if (!Number.isFinite(v)) v = target;
          const maxDev = 0.25 * target;
          if (Math.abs(v - target) > maxDev) {
            v = target + Math.sign(v - target) * maxDev;
          }
          return { year: (f?.year || now + 1 + idx), value: Math.round(v) };
        });
      }
      return res.status(200).json(json);
    } catch {
      return res.status(200).json({ error: 'gemini_parse_failed', raw: text });
    }
  } catch (e: any) {
    return res.status(200).json({ error: 'internal_error', detail: String(e && e.message || e) });
  }
}


