// Vercel serverless function: POST /api/enrich
// Body: { address: string }
// Requires env: GEMINI_API_KEY and either SERPAPI_KEY or (GOOGLE_CSE_ID & GOOGLE_SEARCH_KEY)

type Snippet = { site: string; url: string; text: string };

const MAX_RESULTS = 4;
const MAX_SNIPPETS = 3;

function sitesForAddress(address: string): { list: string[]; region: 'US'|'AU'|'GLOBAL' } {
  const a = address.toLowerCase();
  const isAU = a.includes('australia') || a.match(/\bnsw\b|\bvic\b|\bqld\b|\bsa\b|\bwa\b|\bnt\b|\btas\b|\bact\b/);
  if (isAU) {
    return { list: ['realestate.com.au', 'domain.com.au', 'onthehouse.com.au'], region: 'AU' };
  }
  const isUS = a.includes('united states') || a.match(/\b[A-Z]{2}\s*\d{5}\b/);
  if (isUS) {
    return { list: ['zillow.com', 'realtor.com', 'redfin.com'], region: 'US' };
  }
  return { list: ['zillow.com', 'realtor.com', 'redfin.com', 'realestate.com.au', 'domain.com.au'], region: 'GLOBAL' };
}

function shortAddress(address: string): string {
  // keep first 3 comma parts to avoid over-specific long addresses
  const parts = address.split(',').map(s => s.trim()).filter(Boolean);
  return parts.slice(0, Math.min(3, parts.length)).join(', ');
}

function removeStreetNumber(addr: string): string {
  return addr.replace(/^\s*\d+\s+/, '').trim();
}

async function searchResults(address: string): Promise<{ site: string; url: string }[]> {
  const serp = process.env.SERPAPI_KEY;
  const { list: sites, region } = sitesForAddress(address);
  const addrShort = shortAddress(address);
  const siteFilter = sites.map(s => `site:${s}`).join(' OR ');
  const regionParams = region === 'AU' ? { gl: 'au', hl: 'en', location: 'Australia' } : region === 'US' ? { gl: 'us', hl: 'en', location: 'United States' } : {} as any;
  if (serp) {
    // First attempt: quoted address + site filters
    let q = `"${addrShort}" ${siteFilter}`;
    let params = new URLSearchParams({ engine: 'google', q, num: String(MAX_RESULTS), api_key: serp, ...regionParams } as any);
    const r = await fetch(`https://serpapi.com/search?${params.toString()}`);
    let results: { site: string; url: string }[] = [];
    if (r.ok) {
      const j = await r.json();
      const items = (j.organic_results ?? []) as any[];
      results = items.slice(0, MAX_RESULTS).map((it) => ({ site: String(it.source || ''), url: String(it.link || '') }));
    }
    if (results.length) return results;
    // Fallback: unquoted address, still site-filtered
    q = `${addrShort} ${siteFilter}`;
    params = new URLSearchParams({ engine: 'google', q, num: String(MAX_RESULTS), api_key: serp, ...regionParams } as any);
    const r2 = await fetch(`https://serpapi.com/search?${params.toString()}`);
    if (r2.ok) {
      const j2 = await r2.json();
      const items2 = (j2.organic_results ?? []) as any[];
      results = items2.slice(0, MAX_RESULTS).map((it) => ({ site: String(it.source || ''), url: String(it.link || '') }));
    }
    if (results.length) return results;
    // Attempt 3: remove street number
    const noNum = removeStreetNumber(addrShort);
    if (noNum && noNum !== addrShort) {
      let q3 = `"${noNum}" ${siteFilter}`;
      let params3 = new URLSearchParams({ engine: 'google', q: q3, num: String(MAX_RESULTS), api_key: serp, ...regionParams } as any);
      const r3 = await fetch(`https://serpapi.com/search?${params3.toString()}`);
      if (r3.ok) {
        const j3 = await r3.json();
        const items3 = (j3.organic_results ?? []) as any[];
        results = items3.slice(0, MAX_RESULTS).map((it) => ({ site: String(it.source || ''), url: String(it.link || '') }));
      }
      if (results.length) return results;
    }
    // Final fallback: generic real estate query without site filter
    const q4 = `${addrShort} real estate`;
    const params4 = new URLSearchParams({ engine: 'google', q: q4, num: String(MAX_RESULTS), api_key: serp, ...regionParams } as any);
    const r4 = await fetch(`https://serpapi.com/search?${params4.toString()}`);
    if (r4.ok) {
      const j4 = await r4.json();
      const items4 = (j4.organic_results ?? []) as any[];
      results = items4.slice(0, MAX_RESULTS).map((it) => ({ site: String(it.source || ''), url: String(it.link || '') }));
    }
    return results;
  }
  const cseId = process.env.GOOGLE_CSE_ID;
  const cseKey = process.env.GOOGLE_SEARCH_KEY;
  if (cseId && cseKey) {
    // Attempt 1: quoted + site filters
    let q = `"${addrShort}" (${sites.map(s => `site:${s}`).join(' OR ')})`;
    let params = new URLSearchParams({ q, cx: cseId, key: cseKey, num: String(MAX_RESULTS) });
    let r = await fetch(`https://www.googleapis.com/customsearch/v1?${params.toString()}`);
    let out: { site: string; url: string }[] = [];
    if (r.ok) {
      const j = await r.json();
      const items = (j.items ?? []) as any[];
      out = items.slice(0, MAX_RESULTS).map((it) => ({ site: String(it.displayLink || ''), url: String(it.link || '') }));
    }
    if (out.length) return out;
    // Attempt 2: unquoted, site filters
    q = `${addrShort} (${sites.map(s => `site:${s}`).join(' OR ')})`;
    params = new URLSearchParams({ q, cx: cseId, key: cseKey, num: String(MAX_RESULTS) });
    r = await fetch(`https://www.googleapis.com/customsearch/v1?${params.toString()}`);
    if (r.ok) {
      const j = await r.json();
      const items = (j.items ?? []) as any[];
      out = items.slice(0, MAX_RESULTS).map((it) => ({ site: String(it.displayLink || ''), url: String(it.link || '') }));
    }
    if (out.length) return out;
    // Attempt 3: remove street number
    const noNum = removeStreetNumber(addrShort);
    if (noNum && noNum !== addrShort) {
      let q3 = `"${noNum}" (${sites.map(s => `site:${s}`).join(' OR ')})`;
      let params3 = new URLSearchParams({ q: q3, cx: cseId, key: cseKey, num: String(MAX_RESULTS) });
      let r3 = await fetch(`https://www.googleapis.com/customsearch/v1?${params3.toString()}`);
      if (r3.ok) {
        const j3 = await r3.json();
        const items3 = (j3.items ?? []) as any[];
        out = items3.slice(0, MAX_RESULTS).map((it) => ({ site: String(it.displayLink || ''), url: String(it.link || '') }));
      }
      if (out.length) return out;
    }
    // Final fallback: generic query without site filter
    const q4 = `${addrShort} real estate`;
    const params4 = new URLSearchParams({ q: q4, cx: cseId, key: cseKey, num: String(MAX_RESULTS) });
    const r4 = await fetch(`https://www.googleapis.com/customsearch/v1?${params4.toString()}`);
    if (r4.ok) {
      const j4 = await r4.json();
      const items4 = (j4.items ?? []) as any[];
      out = items4.slice(0, MAX_RESULTS).map((it) => ({ site: String(it.displayLink || ''), url: String(it.link || '') }));
    }
    return out;
  }
  return [];
}

function stripHtml(html: string): string {
  html = html.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  html = html.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  html = html.replace(/<[^>]+>/g, ' ');
  html = html.replace(/\s+/g, ' ').trim();
  return html.slice(0, 10000);
}

async function fetchText(url: string): Promise<string> {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'parcel-viewer/1.0' } });
    if (!r.ok) return '';
    const html = await r.text();
    return stripHtml(html);
  } catch {
    return '';
  }
}

async function geminiSynthesize(address: string, snippets: Snippet[]) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { error: 'missing_gemini_key' };
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const prompt =
    `You are a real estate data synthesizer. Using the provided snippets from multiple realtor websites, ` +
    `produce a single JSON object with best-guess values. If unknown, use null. Fields: ` +
    `address, est_price, price_range:{low,high}, bedrooms, bathrooms, lot_size_sq_m, building_area_sq_m, ` +
    `last_sold:{date,price}, year_built, sources:[{site,url}]. Only output JSON.\n` +
    `Address query: ${address}\n\n` +
    snippets
      .map((s) => `Source: ${s.site} (${s.url})\n\n${s.text.slice(0, 1800)}`)
      .join('\n\n');
  const resp = await model.generateContent(prompt);
  let text = (resp.response.text() || '').trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
  }
  try {
    return JSON.parse(text);
  } catch {
    return { error: 'gemini_parse_failed', raw: text };
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  try {
    // Support body as object or JSON string
    const raw = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const address = String((raw.address ?? '')).trim();
    if (!address) return res.status(200).json({ error: 'missing_address' });

    const results = await searchResults(address);
    if (!results.length) return res.status(200).json({ error: 'no_results', debug: { address } });

    const snippets: Snippet[] = [];
    for (const r of results) {
      if (snippets.length >= MAX_SNIPPETS) break;
      if (!r.url) continue;
      const text = await fetchText(r.url);
      if (text) snippets.push({ site: r.site, url: r.url, text });
    }
    if (!snippets.length) return res.status(200).json({ error: 'no_snippets', debug: { results } });

    const data = await geminiSynthesize(address, snippets);
    return res.status(200).json(data);
  } catch (e: any) {
    return res.status(200).json({ error: 'internal_error', detail: String(e && e.message || e) });
  }
}


