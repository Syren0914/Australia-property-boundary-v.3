// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const cors = {
  "access-control-allow-origin": "*", // or your domain
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  // Expect body: { points: [[lng,lat], ...] }
  const { points } = await req.json();

  const upstreamUrl =
    "https://spatial-img.information.qld.gov.au/arcgis/rest/services/Elevation/DEM_TimeSeries_AllUsers/ImageServer/getSamples";

  const params = new URLSearchParams({
    f: "json",
    geometry: JSON.stringify({ points, spatialReference: { wkid: 4326 } }),
    geometryType: "esriGeometryMultipoint",
    returnFirstValueOnly: "true",
    sampleCount: "1",
    pixelSize: JSON.stringify({ x: 1, y: 1, spatialReference: { wkid: 3857 } }),
    mosaicRule: JSON.stringify({ mosaicMethod: "NorthWest" }),
  });

  // POST to avoid very long URLs
  const r = await fetch(upstreamUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const text = await r.text();
  return new Response(text, {
    status: r.status,
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=600", // cache 10 min
      ...cors,
    },
  });
});
