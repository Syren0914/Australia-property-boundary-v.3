#include <reader.h>
#include <read.hpp>
#include <global.hpp>

#include <gdal_priv.h>
#include <ogrsf_frmts.h>
#include <ogr_spatialref.h>

#include <gdal_utils.h>     // GDALVectorTranslate
#include <cpl_conv.h>     // CPLFree, CPLMalloc, CPLGenerateTempFilename
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

static void keep_only_real_fields(OGRLayer* L, bool includeLists = false) {
    if (!L) return;
    if (!L->TestCapability(OLCIgnoreFields)) return; // driver must support it

    OGRFeatureDefn* defn = L->GetLayerDefn();
    std::vector<const char*> ignore;
    ignore.reserve(defn->GetFieldCount() + 2);

    for (int i = 0; i < defn->GetFieldCount(); ++i) {
        OGRFieldDefn* fd = defn->GetFieldDefn(i);
        OGRFieldType t = fd->GetType();
        const bool isReal = (t == OFTReal) || (includeLists && t == OFTRealList);
        if (!isReal) {
            ignore.push_back(fd->GetNameRef()); // ignore non-REAL fields
        }
    }
    ignore.push_back("OGR_STYLE");
    ignore.push_back(nullptr);
    L->SetIgnoredFields(ignore.data());
}


static void ignore_all_attrs(OGRLayer* L) {
    if (!L) return;
    OGRFeatureDefn* defn = L->GetLayerDefn();
    if (!defn) return;
    std::vector<const char*> ignore;
    ignore.reserve(defn->GetFieldCount() + 2);
    for (int i = 0; i < defn->GetFieldCount(); ++i)
        ignore.push_back(defn->GetFieldDefn(i)->GetNameRef());
    ignore.push_back("OGR_STYLE");
    ignore.push_back(nullptr);
    L->SetIgnoredFields(ignore.data());
}

static OGRLayer* make_geom_only_sql_layer(GDALDataset* ds, OGRLayer* base, bool wantFID) {
    // NOTE: quoting layer name covers most simple cases
    std::string sql = "SELECT ";
    if (wantFID) sql += "FID, ";
    sql += "OGR_GEOMETRY FROM \""; sql += base->GetName(); sql += "\"";
    return ds->ExecuteSQL(sql.c_str(), nullptr, nullptr);
}

static void read_file_aabbs_once(
    const char* path, const char* targetEPSG, std::vector<AABB>& outVec)
{
    using CT = OGRCoordinateTransformation;
    using CTUP = std::unique_ptr<CT, decltype(&CT::DestroyCT)>;

    const char* drvlist[] = {"PMTiles", nullptr};
    GDALDataset* ds = static_cast<GDALDataset*>(
        GDALOpenEx(path, GDAL_OF_READONLY | GDAL_OF_VECTOR, drvlist, nullptr, nullptr));
    if (!ds) { std::fprintf(stderr, "open failed: %s\n", path); return; }

    OGRSpatialReference dst; dst.SetFromUserInput(targetEPSG);

    const int layers = ds->GetLayerCount();
    size_t reserveN = 0;
    for (int li = 0; li < layers; ++li) {
        keep_only_real_fields(L);

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

    for (int li = 0; li < layers; ++li) {
        OGRLayer* base = ds->GetLayer(li);
        if (!base) continue;

        bool used_sql = false;
        OGRLayer* layer = base;

        if (base->TestCapability(OLCIgnoreFields)) {
            keep_only_real_fields(base);
        } else {
            if (OGRLayer* sqlL = make_geom_only_sql_layer(ds, base,
                /*wantFID=*/true)) {
                layer = sqlL;
                used_sql = true;
            }
        }

        OGRSpatialReference* src = layer->GetSpatialRef();
        CTUP toMeters(nullptr, &CT::DestroyCT);
        if (src && !src->IsSame(&dst)) {
            toMeters.reset(OGRCreateCoordinateTransformation(src, &dst));
        }

        layer->ResetReading();

        // --------- SINGLE MATERIALIZATION LOOP ----------
        OGRFeature* f = nullptr;
        while ((f = layer->GetNextFeature())) {
            /*
            OGRGeometry* g = f->GetGeometryRef();
            if (!g) { OGRFeature::DestroyFeature(f); continue; }

            std::unique_ptr<OGRGeometry> gc(toMeters ? g->clone() : nullptr);
            OGRGeometry* geom = toMeters ? gc.get() : g;

            if (toMeters && geom && geom->transform(toMeters.get()) != OGRERR_NONE) {
                OGRFeature::DestroyFeature(f); continue;
            }

            OGREnvelope e; geom->getEnvelope(&e);
            if (!std::isfinite(e.MinX) || !std::isfinite(e.MinY) ||
                !std::isfinite(e.MaxX) || !std::isfinite(e.MaxY)) {
                OGRFeature::DestroyFeature(f); continue;
            }

            AABB box;
            box.min[0] = e.MinX;  box.min[1] = e.MinY;
            box.max[0] = e.MaxX;  box.max[1] = e.MaxY;

            #ifdef AABB_HAS_FID
            // Prefer true source FID if present in SQL projection
            // (field name "FID" exists only if we asked for it)
            int fidIdx = f->GetFieldIndex("FID");
            if (fidIdx >= 0) {
                box.fid = static_cast<long long>(f->GetFieldAsInteger64(fidIdx));
            } else {
                // fallback (may be -1 / rowid of result set)
                box.fid = f->GetFID();
            }
            #endif

            outVec.push_back(box);
        */
            OGRFeature::DestroyFeature(f);
        }
        // -----------------------------------------------

        if (used_sql) ds->ReleaseResultSet(layer);
    }

    GDALClose(ds);
}

static std::string translate_promote_ints_to_real(const char* srcPath) {
    GDALDataset* src = static_cast<GDALDataset*>(
        GDALOpenEx(srcPath, GDAL_OF_READONLY | GDAL_OF_VECTOR, nullptr, nullptr, nullptr));
    if (!src) {
        std::fprintf(stderr, "translate: cannot open source: %s\n", srcPath);
        return {};
    }

    // Make a unique temp filename (on disk; GPKG needs a real file)
    char* tmp = CPLStrdup(CPLGenerateTempFilename("aabb_fix"));
    std::string dstPath = std::string(tmp) + ".gpkg";
    CPLFree(tmp);

    char** argv = nullptr;
    argv = CSLAddString(argv, "-f");
    argv = CSLAddString(argv, "GPKG");
    argv = CSLAddString(argv, "-mapFieldType");
    argv = CSLAddString(argv, "Integer=Real,Integer64=Real");

    int usageError = FALSE;
    GDALVectorTranslateOptions* opts = GDALVectorTranslateOptionsNew(argv, nullptr);
    CSLDestroy(argv);

    GDALDatasetH outH = GDALVectorTranslate(
        dstPath.c_str(), /*hDstDS*/ nullptr,
        /*nSrcCount*/ 1, /*pahSrcDS*/ reinterpret_cast<GDALDatasetH*>(&src),
        opts, &usageError);

    GDALVectorTranslateOptionsFree(opts);
    GDALClose(src);

    if (!outH || usageError) {
        std::fprintf(stderr, "translate: vector translate failed for %s\n", srcPath);
        if (outH) GDALClose(outH);
        // Clean up any partial file
        VSIUnlink(dstPath.c_str());
        return {};
    }

    GDALClose(outH);
    return dstPath;
}


void init_reader_meters(int N, const char* const* file_paths, int threads = 4) {
    GDALAllRegister();

    std::vector<std::string> fixed_paths(N);
    std::vector<bool>        is_temp(N, false);

    for (int i = 0; i < N; ++i) {
        std::string fixed = translate_promote_ints_to_real(file_paths[i]);
        if (!fixed.empty()) {
            fixed_paths[i] = std::move(fixed);
            is_temp[i] = true;
        } else {
            // Fallback: use original if translate failed (driver missing, etc.)
            fixed_paths[i] = file_paths[i];
            is_temp[i] = false;
        }
    }

    std::vector<std::size_t> counts(N, 0);
    #pragma omp parallel for schedule(dynamic) num_threads(threads)
    for (int i = 0; i < N; ++i) {
        counts[i] = count_features(fixed_paths[i].c_str());
    }

    std::vector<std::size_t> offsets(N, 0);
    std::size_t total = 0;
    for (int i = 0; i < N; ++i) { offsets[i] = total; total += counts[i]; }

    states.prop_count = total;
    states.props = static_cast<AABB*>(std::malloc(total * sizeof(AABB)));
    if (!states.props) {
        std::fprintf(stderr, "malloc failed for %zu AABBs\n", total);
        states.prop_count = 0;

        for (int i = 0; i < N; ++i) if (is_temp[i]) VSIUnlink(fixed_paths[i].c_str());
        return;
    }

    #pragma omp parallel for schedule(dynamic) num_threads(threads)
    for (int i = 0; i < N; ++i) {
        AABB* base = states.props + offsets[i];
        (void)fill_aabbs_meters(fixed_paths[i].c_str(), targetEPSG, base, counts[i]);
    }

    // 5) Cleanup temp files
    for (int i = 0; i < N; ++i) {
        if (is_temp[i]) {
            VSIUnlink(fixed_paths[i].c_str());
        }
    }
}
