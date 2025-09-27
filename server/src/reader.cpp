#include <reader.h>
#include <read.hpp>
#include <global.hpp>

#include <gdal_priv.h>
#include <ogrsf_frmts.h>
#include <ogr_spatialref.h>

#include <gdal_utils.h>     // GDALVectorTranslate
#include <cpl_conv.h>     // CPLFree, CPLMalloc, CPLGenerateTempFilename
#include <cpl_error.h>    // CPL error handlers
#include <cpl_string.h>     // CSL* helpers
#include <cpl_vsi.h>        // VSIUnlink

#include <algorithm>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <memory>
#include <vector>
#include <string>
#include <omp.h>

const char* targetEPSG = "EPSG:5070";
States states{0, nullptr};

namespace {

class WarningSilencer {
public:
    WarningSilencer()  { CPLPushErrorHandler(&WarningSilencer::handler); }
    ~WarningSilencer() { CPLPopErrorHandler(); }

private:
    static void handler(CPLErr eErr, int err_no, const char* msg) {
        if (eErr == CE_Warning && msg) {
            if (std::strstr(msg, "Lossy conversion occurred") ||
                std::strstr(msg, "integer overflow occurred")) {
                return;
            }
        }
        CPLDefaultErrorHandler(eErr, err_no, msg);
    }
};

static void keep_only_real_fields(OGRLayer* L, bool includeLists = false) {
    if (!L) return;
    if (!L->TestCapability(OLCIgnoreFields)) return; // driver must support it

    OGRFeatureDefn* defn = L->GetLayerDefn();
    if (!defn) return;

    std::vector<const char*> ignore;
    ignore.reserve(defn->GetFieldCount() + 2);

    for (int i = 0; i < defn->GetFieldCount(); ++i) {
        OGRFieldDefn* fd = defn->GetFieldDefn(i);
        OGRFieldType t = fd->GetType();
        const bool isReal = (t == OFTReal) || (includeLists && t == OFTRealList);
        if (!isReal) {
            ignore.push_back(fd->GetNameRef()); // ignore everything not REAL
        }
    }
    ignore.push_back("OGR_STYLE");
    ignore.push_back(nullptr);

    L->SetIgnoredFields(ignore.data());
}

static OGRLayer* geometry_only_sql(GDALDataset* ds, OGRLayer* base, bool wantFID=true) {
    std::string sql = "SELECT ";
    if (wantFID) sql += "FID, ";
    sql += "OGR_GEOMETRY FROM \""; sql += base->GetName(); sql += "\"";
    // Force OGRSQL (don’t let the driver choose a different dialect)
    return ds->ExecuteSQL(sql.c_str(), nullptr, "OGRSQL");
}

using CT   = OGRCoordinateTransformation;
using CTUP = std::unique_ptr<CT, decltype(&CT::DestroyCT)>;

static CTUP make_transform(OGRLayer* layer, const OGRSpatialReference& dst)
{
    CTUP transform(nullptr, &CT::DestroyCT);
    if (!layer) return transform;

    if (OGRSpatialReference* src = layer->GetSpatialRef()) {
        if (!src->IsSame(&dst)) {
            transform.reset(OGRCreateCoordinateTransformation(src, &dst));
        }
    }
    return transform;
}

static void collect_layer_aabbs(GDALDataset* ds,
                                OGRLayer* base,
                                const OGRSpatialReference& dst,
                                std::vector<AABB>& out)
{
    if (!base) return;

    keep_only_real_fields(base);
    CTUP toMeters = make_transform(base, dst);

    OGRLayer* layer = geometry_only_sql(ds, base, /*wantFID=*/false);
    const bool used_sql = (layer != nullptr);
    if (!layer) layer = base;
    if (layer != base) keep_only_real_fields(layer);

    layer->ResetReading();

    while (OGRFeature* f = layer->GetNextFeature()) {
        OGRGeometry* g = f->GetGeometryRef();
        if (!g) { OGRFeature::DestroyFeature(f); continue; }

        std::unique_ptr<OGRGeometry> owned;
        OGRGeometry* geom = g;
        if (toMeters) {
            owned.reset(g->clone());
            if (!owned || owned->transform(toMeters.get()) != OGRERR_NONE) {
                OGRFeature::DestroyFeature(f);
                continue;
            }
            geom = owned.get();
        }

        OGREnvelope e; geom->getEnvelope(&e);
        if (!std::isfinite(e.MinX) || !std::isfinite(e.MinY) ||
            !std::isfinite(e.MaxX) || !std::isfinite(e.MaxY)) {
            OGRFeature::DestroyFeature(f);
            continue;
        }

        AABB box;
        box.min[0] = e.MinX;  box.min[1] = e.MinY;
        box.max[0] = e.MaxX;  box.max[1] = e.MaxY;

        #ifdef AABB_HAS_FID
        box.fid = f->GetFID();
        #endif

        out.push_back(box);
        OGRFeature::DestroyFeature(f);
    }

    if (used_sql) ds->ReleaseResultSet(layer);
}

static void read_file_aabbs_once(
    const char* path, const char* targetEPSG, std::vector<AABB>& outVec)
{
    WarningSilencer guard;

    GDALDataset* ds = static_cast<GDALDataset*>(
        GDALOpenEx(path, GDAL_OF_READONLY | GDAL_OF_VECTOR, nullptr, nullptr, nullptr));
    if (!ds) {
        std::fprintf(stderr, "open failed: %s\n", path);
        return;
    }

    OGRSpatialReference dst;
    dst.SetFromUserInput(targetEPSG);

    const int layerCount = ds->GetLayerCount();
    size_t estimate = 0;
    for (int li = 0; li < layerCount; ++li) {
        if (OGRLayer* L = ds->GetLayer(li)) {
            const auto n = L->GetFeatureCount(true);
            if (n > 0) estimate += static_cast<size_t>(n);
        }
    }
    if (estimate) outVec.reserve(outVec.size() + estimate);

    for (int li = 0; li < layerCount; ++li) {
        collect_layer_aabbs(ds, ds->GetLayer(li), dst, outVec);
    }

    GDALClose(ds);
}

} // namespace

void init_reader_meters(int N, const char* const* file_paths, int threads = 32) {
    GDALAllRegister();

    std::vector<std::vector<AABB>> perFile(N);

    #pragma omp parallel for schedule(dynamic) num_threads(threads)
    for (int i = 0; i < N; ++i) {
        read_file_aabbs_once(file_paths[i], targetEPSG, perFile[i]);
    }

    size_t total = 0;
    for (int i = 0; i < N; ++i) total += perFile[i].size();

    states.prop_count = total;
    states.props = static_cast<AABB*>(std::malloc(total * sizeof(AABB)));
    if (!states.props) {
        std::fprintf(stderr, "malloc failed for %zu AABBs\n", total);
        states.prop_count = 0;
        return;
    }

    size_t off = 0;
    for (int i = 0; i < N; ++i) {
        const auto& v = perFile[i];
        if (!v.empty()) {
            std::memcpy(states.props + off, v.data(), v.size() * sizeof(AABB));
            off += v.size();
        }
    }
}
