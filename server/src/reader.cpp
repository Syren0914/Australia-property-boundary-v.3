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
#include <limits>

const char* targetEPSG = "EPSG:5070";
States states{0, nullptr};
std::size_t props_data_bytes = 0;

using VertexList = std::vector<Vertex>;
using PropertyList = std::vector<VertexList>;

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

static void append_ring_vertices(const OGRLinearRing* ring, VertexList& out)
{
    if (!ring) return;

    int count = ring->getNumPoints();
    if (count <= 0) return;

    const bool closed = ring->get_IsClosed();
    if (closed && count > 0) {
        --count; // skip the duplicated closing vertex
    }

    out.reserve(out.size() + static_cast<std::size_t>(count));
    for (int i = 0; i < count; ++i) {
        Vertex v{ ring->getX(i), ring->getY(i) };
        if (!std::isfinite(v.x) || !std::isfinite(v.y)) continue;
        out.push_back(v);
    }
}

static bool collect_geometry_vertices(OGRGeometry* geom, VertexList& coords)
{
    if (!geom || geom->IsEmpty()) return false;

    const OGRwkbGeometryType type = wkbFlatten(geom->getGeometryType());

    switch (type) {
        case wkbPolygon: {
            OGRPolygon* poly = geom->toPolygon();
            if (!poly) return false;
            append_ring_vertices(poly->getExteriorRing(), coords);
            const int holeCount = poly->getNumInteriorRings();
            for (int i = 0; i < holeCount; ++i) {
                append_ring_vertices(poly->getInteriorRing(i), coords);
            }
            break;
        }
        case wkbMultiPolygon: {
            OGRMultiPolygon* multi = geom->toMultiPolygon();
            if (!multi) return false;
            const int geomCount = multi->getNumGeometries();
            for (int i = 0; i < geomCount; ++i) {
                OGRGeometry* subGeom = multi->getGeometryRef(i);
                if (!subGeom) continue;
                OGRPolygon* poly = subGeom->toPolygon();
                if (!poly) continue;
                append_ring_vertices(poly->getExteriorRing(), coords);
                const int holeCount = poly->getNumInteriorRings();
                for (int h = 0; h < holeCount; ++h) {
                    append_ring_vertices(poly->getInteriorRing(h), coords);
                }
            }
            break;
        }
        default:
            return false;
    }

    return !coords.empty();
}

static void collect_layer_props(GDALDataset* ds,
                                OGRLayer* base,
                                const OGRSpatialReference& dst,
                                std::vector<VertexList>& out)
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

        VertexList coords;
        if (!collect_geometry_vertices(geom, coords)) {
            OGRFeature::DestroyFeature(f);
            continue;
        }

        out.push_back(std::move(coords));
        OGRFeature::DestroyFeature(f);
    }

    if (used_sql) ds->ReleaseResultSet(layer);
}

static void read_file_props_once(
    const char* path, const char* targetEPSG, std::vector<VertexList>& outVec)
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
        collect_layer_props(ds, ds->GetLayer(li), dst, outVec);
    }

    GDALClose(ds);
}

} // namespace

void init_reader_meters(int N, const char* const* file_paths, int threads = 4) {
    GDALAllRegister();

    if (states.props) {
        std::free(states.props);
        states.props = nullptr;
    }
    props_data_bytes = 0;
    states.prop_count = 0;

    std::vector<PropertyList> perFile(N);

    #pragma omp parallel for schedule(dynamic) num_threads(threads)
    for (int i = 0; i < N; ++i) {
        read_file_props_once(file_paths[i], targetEPSG, perFile[i]);
    }

    size_t totalProps = 0;
    size_t totalBytes = 0;
    const size_t align = alignof(Props);

    for (const auto& fileProps : perFile) {
        totalProps += fileProps.size();
        for (const auto& coords : fileProps) {
            const size_t coordCount = coords.size();
            size_t bytes = sizeof(Props) + coordCount * sizeof(Vertex);
            // keep each instance aligned for safe traversal later
            totalBytes += (bytes + (align - 1)) & ~(align - 1);
        }
    }

    if (totalProps > static_cast<size_t>(std::numeric_limits<int>::max())) {
        std::fprintf(stderr, "too many properties (%zu) to fit into States::prop_count\n", totalProps);
        return;
    }

    states.prop_count = static_cast<int>(totalProps);
    if (states.prop_count == 0) {
        return;
    }

    if (totalBytes == 0) {
        totalBytes = static_cast<size_t>(states.prop_count) * sizeof(Props);
    }

    states.props = static_cast<Props*>(std::malloc(totalBytes));
    if (!states.props) {
        std::fprintf(stderr, "malloc failed for %zu bytes of Props data\n", totalBytes);
        states.prop_count = 0;
        props_data_bytes = 0;
        return;
    }

    unsigned char* cursor = reinterpret_cast<unsigned char*>(states.props);
    unsigned char* const end = cursor + totalBytes;

    for (const auto& fileProps : perFile) {
        for (const auto& coords : fileProps) {
            Props* prop = reinterpret_cast<Props*>(cursor);

            if (coords.size() > static_cast<size_t>(std::numeric_limits<int>::max())) {
                std::fprintf(stderr, "property has too many vertices (%zu)\n", coords.size());
                prop->coords_count = 0;
            } else {
                prop->coords_count = static_cast<int>(coords.size());
                if (!coords.empty()) {
                    std::memcpy(prop->coords, coords.data(), coords.size() * sizeof(Vertex));
                }
            }

            const size_t coordCount = coords.size();
            size_t bytes = sizeof(Props) + coordCount * sizeof(Vertex);
            bytes = (bytes + (align - 1)) & ~(align - 1);
            cursor += bytes;
        }
    }

    if (cursor != end) {
        // Should never happen, but guard against accounting mistakes.
        std::fprintf(stderr, "reader accounting mismatch: allocated %zu bytes, used %zu\n",
                     static_cast<size_t>(end - reinterpret_cast<unsigned char*>(states.props)),
                     static_cast<size_t>(cursor - reinterpret_cast<unsigned char*>(states.props)));
        states.prop_count = 0;
        std::free(states.props);
        states.props = nullptr;
        props_data_bytes = 0;
        return;
    }

    props_data_bytes = totalBytes;
}
