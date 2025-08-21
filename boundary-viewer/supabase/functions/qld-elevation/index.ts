// supabase/functions/qld-elevation/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// allow your site in CORS
const cors = {
  "access-control-allow-origin": "*",              // or your domain
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  // accept either GET ?geometry=... params or JSON body { points: [[lng,lat], ...] }
  let params: URLSearchParams;
  if (req.method === "GET") {
    params = new URL(req.url).searchParams;
  } else {
    const body = await req.json();
    params = new URLSearchParams({
      f: "json",
      geometry: JSON.stringify(
        body.geometry ??
          { points: body.points, spatialReference: { wkid: 4326 } }
      ),
      geometryType: body.geometryType ?? "esriGeometryMultipoint",
      returnFirstValueOnly: "true",
      sampleCount: "1",
      pixelSize: JSON.stringify({ x: 1, y: 1, spatialReference: { wkid: 3857 } }),
      mosaicRule: JSON.stringify({ mosaicMethod: "NorthWest" }),
    });
  }

  const url =
    "https://spatial-img.information.qld.gov.au/arcgis/rest/services/Elevation/DEM_TimeSeries_AllUsers/ImageServer/getSamples";

  // Use POST to avoid URL-length issues on big multipoints
  const upstream = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=3600", // 1h cache (tweak)
      ...cors,
    },
  });
});
