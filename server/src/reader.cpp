#include <reader.h>
#include <read.hpp>
#include <global.hpp>

#include <gdal_priv.h>
#include <ogrsf_frmts.h>
#include <ogr_spatialref.h>

#include <algorithm>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <memory>
#include <vector>
#include <omp.h>

const char* targetEPSG = "EPSG:5070";

States states{0, nullptr};

static std::size_t count_features(const char* path) {
    GDALDataset* ds = static_cast<GDALDataset*>(
        GDALOpenEx(path, GDAL_OF_READONLY | GDAL_OF_VECTOR, nullptr, nullptr, nullptr));
    if (!ds) {
        std::fprintf(stderr, "open failed: %s\n", path);
        return 0;
    }

    std::size_t total = 0;
    const int layers = ds->GetLayerCount();
    for (int li = 0; li < layers; ++li) {
        if (OGRLayer* L = ds->GetLayer(li)) {
            const auto n = L->GetFeatureCount(true);
            if (n >= 0) {
                total += static_cast<std::size_t>(n);
            } else {
                L->ResetReading();
                while (OGRFeature* f = L->GetNextFeature()) {
                    ++total;
                    OGRFeature::DestroyFeature(f);
                }
            }
        }
    }

    GDALClose(ds);
    return total;
}

static std::size_t fill_aabbs_meters(const char* path, const char* targetEPSG,
                                     AABB* out, std::size_t cap) {
    GDALDataset* ds = static_cast<GDALDataset*>(
        GDALOpenEx(path, GDAL_OF_READONLY | GDAL_OF_VECTOR, nullptr, nullptr, nullptr));
    if (!ds) { std::fprintf(stderr, "open failed: %s\n", path); return 0; }

    OGRSpatialReference dst; dst.SetFromUserInput(targetEPSG);

    using CT = OGRCoordinateTransformation;
    using CTUP = std::unique_ptr<CT, decltype(&CT::DestroyCT)>;

    std::size_t written = 0;
    const int layers = ds->GetLayerCount();

    for (int li = 0; li < layers; ++li) {
        OGRLayer* layer = ds->GetLayer(li);
        if (!layer) continue;

        OGRSpatialReference* src = layer->GetSpatialRef();

        CTUP toMeters(nullptr, &CT::DestroyCT);
        if (src && !src->IsSame(&dst)) {
            toMeters.reset(OGRCreateCoordinateTransformation(src, &dst));
        }

        layer->ResetReading();
        while (OGRFeature* f = layer->GetNextFeature()) {
            if (written >= cap) { OGRFeature::DestroyFeature(f); break; }

            OGRGeometry* g = f->GetGeometryRef();
            if (!g) { OGRFeature::DestroyFeature(f); continue; }

            std::unique_ptr<OGRGeometry> gc(toMeters ? g->clone() : nullptr);
            OGRGeometry* geom = toMeters ? gc.get() : g;

            if (toMeters && geom) {
                if (geom->transform(toMeters.get()) != OGRERR_NONE) {
                    OGRFeature::DestroyFeature(f); continue;
                }
            }

            OGREnvelope e; geom->getEnvelope(&e);
            if (!std::isfinite(e.MinX) || !std::isfinite(e.MinY) ||
                !std::isfinite(e.MaxX) || !std::isfinite(e.MaxY)) {
                OGRFeature::DestroyFeature(f); continue;
            }

            out[written].min[0] = e.MinX;  // meters
            out[written].min[1] = e.MinY;
            out[written].max[0] = e.MaxX;
            out[written].max[1] = e.MaxY;
            #ifdef AABB_HAS_FID
            out[written].fid    = f->GetFID();
            #endif
            ++written;

            OGRFeature::DestroyFeature(f);
        }
    }
    GDALClose(ds);
    return written;
}

void init_reader_meters(int N, const char* files[N], int threads = 4) {
    GDALAllRegister();

    std::vector<std::size_t> counts(N, 0);
    #pragma omp parallel for schedule(dynamic) num_threads(threads)
    for (int i = 0; i < N; ++i) counts[i] = count_features(files[i]);

    std::vector<std::size_t> offsets(N, 0);
    std::size_t total = 0;

    for (int i = 0; i < N; ++i) {
        offsets[i] = total; total += counts[i];
    }

    states.prop_count = total;
    states.props = static_cast<AABB*>(std::malloc(total * sizeof(AABB)));
    if (!states.props) {
        std::fprintf(stderr, "malloc failed for %zu AABBs\n", total);
        states.prop_count = 0;
        return;
    }

    #pragma omp parallel for schedule(dynamic) num_threads(threads)
    for (int i = 0; i < N; ++i) {
        AABB* base = states.props + offsets[i];
        (void)fill_aabbs_meters(files[i], targetEPSG, base, counts[i]);
    }
}
