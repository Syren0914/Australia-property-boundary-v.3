// deno run --allow-net
const CORS = {
    "Access-Control-Allow-Origin": "*", // or your domain
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
  };
  
  Deno.serve(async (req) => {
    // Handle preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }
  
    // (Optional) Read/inspect the auth header (Supabase verifies the JWT for you)
    const auth = req.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401,
        headers: { ...CORS, "content-type": "application/json" },
      });
    }
  
    try {
      const { points } = await req.json(); // [[lng,lat],...]
      if (!Array.isArray(points) || points.length === 0) {
        return new Response(JSON.stringify({ error: "No points" }), {
          status: 400,
          headers: { ...CORS, "content-type": "application/json" },
        });
      }
  
      // Forward to QLD ArcGIS
      const params = new URLSearchParams({
        f: "json",
        geometry: JSON.stringify({ points, spatialReference: { wkid: 4326 } }),
        geometryType: "esriGeometryMultipoint",
        returnFirstValueOnly: "true",
        sampleCount: "1",
        pixelSize: JSON.stringify({ x: 1, y: 1, spatialReference: { wkid: 3857 } }),
        mosaicRule: JSON.stringify({ mosaicMethod: "NorthWest" }),
      });
  
      const upstream = await fetch(
        "https://spatial-img.information.qld.gov.au/arcgis/rest/services/Elevation/DEM_TimeSeries_AllUsers/ImageServer/getSamples?" +
          params.toString()
      );
  
      if (!upstream.ok) {
        return new Response(JSON.stringify({ error: `Upstream ${upstream.status}` }), {
          status: 502,
          headers: { ...CORS, "content-type": "application/json" },
        });
      }
  
      const data = await upstream.json();
  
      // Return raw samples to the client
      return new Response(JSON.stringify(data), {
        headers: { ...CORS, "content-type": "application/json" },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), {
        status: 500,
        headers: { ...CORS, "content-type": "application/json" },
      });
    }
  });
  