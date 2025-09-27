#include <reader.h>
#include <read.hpp>
#include <global.hpp>

static void computeAABBsForFile(const char* path, StateList& states) {
  GDALDatasetUniquePtr ds(GDALDataset::Open(path, GA_ReadOnly));

  if (!ds) {
      std::fprintf(stderr, "Failed to open %s\n", path);
      return;
  }

  OGRSpatialReference wgs84;
  wgs84.SetWellKnownGeogCS("WGS84")

  for(int li = 0; li < ds->GetLayerCount(); ++li) {
    OGRLayer* layer = ds->GetLayer(li);
    if (!layer) continue;

    OGRSpatialReference* layerSRS = layer->GetSpatialRef();
    std::unique_ptr<OGRCoordinateTransformation, void(*)(OGRCoordinateTransformation*)> toWGS84(nullptr, OCTDestroyCoordinateTransformation);

    if (layerSRS && !layerSRS->IsSame(&wgs84)) {
        toWGS84.reset(OCTNewCoordinateTransformation(layerSRS, &wgs84));
    }

    layer->ResetReading();

    std::vector<AABB> local;
    local.reserve(10000);

    while (OGRFeature* f = layer->GetNextFeature()) {
        OGRGeometry* g = f->GetGeometryRef();
        if (!g) { OGRFeature::DestroyFeature(f); continue; }

        // Work on a clone if we need to transform; avoid mutating shared geometry behind OGR
        std::unique_ptr<OGRGeometry> gc(
            toWGS84 ? g->clone() : nullptr
        );
        OGRGeometry* geom = toWGS84 ? gc.get() : g;

        if (toWGS84 && geom) {
            if (geom->transform(toWGS84.get()) != OGRERR_NONE) {
                OGRFeature::DestroyFeature(f);
                continue;
            }
        }

        OGREnvelope env;
        geom->getEnvelope(&env);

        // Skip empty/invalid envelopes
        if (!std::isfinite(env.MinX) || !std::isfinite(env.MinY) ||
            !std::isfinite(env.MaxX) || !std::isfinite(env.MaxY)) {
            OGRFeature::DestroyFeature(f);
            continue;
        }

        // Ensure lon [-180,180] wrap is handled (simple normalize)
        auto normLon = [](double lon) {
            while (lon < -180.0) lon += 360.0;
            while (lon >  180.0) lon -= 360.0;
            return lon;
        };

        double minLon = normLon(env.MinX);
        double maxLon = normLon(env.MaxX);
        double minLat = std::max(-90.0, std::min( 90.0, env.MinY));
        double maxLat = std::max(-90.0, std::min( 90.0, env.MaxY));

        // If bbox spans antimeridian (rare in parcel data), you may split it; here we keep as-is.

        AABB box{minLon, minLat, maxLon, maxLat, f->GetFID()};
        local.push_back(box);

        OGRFeature::DestroyFeature(f);
    }

    State localState;
    localState.aabb = new AABB[local.size()];
    localState.aabb = std::move(local.data());

    states.add(local);
}

void init_reader(int N, const char** filenames) {
  GDALAllRegister();

  #pragma omp parallel for schedule(dynamic)
  for (int i=0; i<N; ++i) {
  }
}
