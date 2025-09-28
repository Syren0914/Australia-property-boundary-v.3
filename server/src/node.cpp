#include <global.hpp>
#include <cam.hpp>

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstdio>
#include <fstream>
#include <limits>
#include <vector>

#ifdef _OPENMP
#include <omp.h>
#endif

std::vector<Node> all_nodes;

namespace {

constexpr std::size_t kLeafSize = 16;

std::vector<PropRef> prop_refs;

constexpr double kPi = 3.14159265358979323846;

static inline double tile_x_to_lon(uint32_t x, uint8_t z) {
    const double n = std::ldexp(1.0, z); // 2^z
    return x / n * 360.0 - 180.0;
}

static inline double tile_y_to_lat(uint32_t y, uint8_t z) {
    const double n = std::ldexp(1.0, z);
    const double t = kPi - 2.0 * kPi * static_cast<double>(y) / n;
    return std::atan(std::sinh(t)) * 180.0 / kPi;
}

static inline std::size_t aligned_stride(std::size_t coordCount) noexcept {
    const std::size_t align = alignof(Props);
    std::size_t bytes = sizeof(Props) + coordCount * sizeof(Vertex);
    return (bytes + (align - 1)) & ~(align - 1);
}

static inline PropRef make_prop_ref(const Props* prop) {
    PropRef ref{};
    ref.props = prop;

    if (!prop || prop->coords_count <= 0) {
        ref.box.min[0] = ref.box.min[1] = 0.0;
        ref.box.max[0] = ref.box.max[1] = -0.0;
        return ref;
    }

    double minx = +std::numeric_limits<double>::infinity();
    double miny = +std::numeric_limits<double>::infinity();
    double maxx = -std::numeric_limits<double>::infinity();
    double maxy = -std::numeric_limits<double>::infinity();

    const Vertex* verts = prop->coords;
    const int count = prop->coords_count;
    for (int i = 0; i < count; ++i) {
        const double x = verts[i].x;
        const double y = verts[i].y;
        if (!std::isfinite(x) || !std::isfinite(y)) continue;
        if (x < minx) minx = x;
        if (y < miny) miny = y;
        if (x > maxx) maxx = x;
        if (y > maxy) maxy = y;
    }

    if (minx <= maxx && miny <= maxy) {
        ref.box.min[0] = minx;
        ref.box.min[1] = miny;
        ref.box.max[0] = maxx;
        ref.box.max[1] = maxy;
    } else {
        ref.box.min[0] = ref.box.min[1] = 0.0;
        ref.box.max[0] = ref.box.max[1] = -0.0;
    }

    return ref;
}

static inline AABB range_bounds(PropRef* begin, PropRef* end) {
    AABB result;
    bool initialized = false;

    for (PropRef* it = begin; it != end; ++it) {
        if (!it->box.valid()) continue;
        if (!initialized) {
            result = it->box;
            initialized = true;
        } else {
            result = AABB::unite(result, it->box);
        }
    }

    if (!initialized) {
        result.min[0] = result.min[1] = 0.0;
        result.max[0] = result.max[1] = -0.0;
    }

    return result;
}

static inline double centroid(const AABB& box, int axis) {
    return 0.5 * (box.min[axis] + box.max[axis]);
}

static Node* build_recursive(PropRef* begin, PropRef* end) {
    Node& node = all_nodes.emplace_back();
    node.left = nullptr;
    node.right = nullptr;
    node.prop_begin = begin;
    node.prop_end = end;

    const std::size_t count = static_cast<std::size_t>(end - begin);
    if (count == 0) {
        node.box.min[0] = node.box.min[1] = 0.0;
        node.box.max[0] = node.box.max[1] = -0.0;
        return &node;
    }

    node.box = range_bounds(begin, end);
    if (count <= kLeafSize) {
        return &node;
    }

    double min_c[2] = { +std::numeric_limits<double>::infinity(), +std::numeric_limits<double>::infinity() };
    double max_c[2] = { -std::numeric_limits<double>::infinity(), -std::numeric_limits<double>::infinity() };

    for (PropRef* it = begin; it != end; ++it) {
        if (!it->box.valid()) continue;

        const double cx = centroid(it->box, 0);
        const double cy = centroid(it->box, 1);

        if (cx < min_c[0]) min_c[0] = cx;
        if (cy < min_c[1]) min_c[1] = cy;
        if (cx > max_c[0]) max_c[0] = cx;
        if (cy > max_c[1]) max_c[1] = cy;
    }

    const double extent_x = max_c[0] - min_c[0];
    const double extent_y = max_c[1] - min_c[1];
    const int axis = (extent_x >= extent_y) ? 0 : 1;

    PropRef* mid = begin + (count / 2);
    std::nth_element(begin, mid, end, [axis](const PropRef& a, const PropRef& b) {
        return centroid(a.box, axis) < centroid(b.box, axis);
    });

    node.left = build_recursive(begin, mid);
    node.right = build_recursive(mid, end);
    node.box = AABB::unite(node.left->box, node.right->box);
    return &node;
}

} // namespace

void Node::build_tree(int threads) {
#ifndef _OPENMP
    (void)threads;
#endif

    const std::size_t prop_count = static_cast<std::size_t>(states.prop_count);

    all_nodes.clear();
    prop_refs.clear();

    if (prop_count == 0 || !states.props || props_data_bytes == 0) {
        return;
    }

    prop_refs.assign(prop_count, PropRef{});
    all_nodes.reserve(std::max<std::size_t>(1, 2 * prop_count));

    const unsigned char* const base = reinterpret_cast<const unsigned char*>(states.props);
    const unsigned char* cursor = base;
    const unsigned char* const end = base + props_data_bytes;

    std::vector<std::size_t> offsets;
    offsets.reserve(prop_count);

    for (std::size_t i = 0; i < prop_count; ++i) {
        offsets.push_back(static_cast<std::size_t>(cursor - base));

        const Props* prop = reinterpret_cast<const Props*>(cursor);
        const std::size_t coords_count = (prop && prop->coords_count > 0)
            ? static_cast<std::size_t>(prop->coords_count)
            : 0;
        cursor += aligned_stride(coords_count);
        if (cursor > end) {
            std::fprintf(stderr, "node traversal exceeded props buffer (prop %zu)\n", i);
            all_nodes.clear();
            prop_refs.clear();
            return;
        }
    }

    if (cursor != end) {
        std::fprintf(stderr,
                     "node traversal ended at %zu bytes, expected %zu\n",
                     static_cast<size_t>(cursor - reinterpret_cast<const unsigned char*>(states.props)),
                     props_data_bytes);
        all_nodes.clear();
        prop_refs.clear();
        return;
    }

#ifdef _OPENMP
    const bool can_parallel = threads > 1;
    #pragma omp parallel for schedule(static) if(can_parallel) num_threads(threads)
    for (std::ptrdiff_t i = 0; i < static_cast<std::ptrdiff_t>(prop_count); ++i) {
        const std::size_t offset = offsets[static_cast<std::size_t>(i)];
        const Props* prop = reinterpret_cast<const Props*>(base + offset);
        prop_refs[static_cast<std::size_t>(i)] = make_prop_ref(prop);
    }
#else
    for (std::size_t i = 0; i < prop_count; ++i) {
        const std::size_t offset = offsets[i];
        const Props* prop = reinterpret_cast<const Props*>(base + offset);
        prop_refs[i] = make_prop_ref(prop);
    }
#endif

    build_recursive(prop_refs.data(), prop_refs.data() + prop_refs.size());
}

void Node::collect_visible(const CameraMeters& view, std::vector<const Props*>& out) const {
    if (!box.valid() || !box.overlaps(view.view)) {
        return;
    }

    if (!left && !right) {
        for (PropRef* it = prop_begin; it != prop_end; ++it) {
            if (!it->box.valid()) continue;
            if (it->box.overlaps(view.view)) {
                out.push_back(it->props);
            }
        }
        return;
    }

    if (left) left->collect_visible(view, out);
    if (right) right->collect_visible(view, out);
}

bool Node::export_pmtiles(const std::string& path,
                          const std::vector<std::pair<pmtiles::zxy, std::string>>& tiles,
                          const std::string& metadata_json,
                          uint8_t tile_type,
                          uint8_t tile_compression) {
    std::vector<std::pair<pmtiles::zxy, std::string>> sorted_tiles = tiles;
    std::sort(sorted_tiles.begin(), sorted_tiles.end(), [](const auto& a, const auto& b) {
        if (a.first.z != b.first.z) return a.first.z < b.first.z;
        if (a.first.x != b.first.x) return a.first.x < b.first.x;
        return a.first.y > b.first.y;
    });

    std::vector<pmtiles::entryv3> entries;
    entries.reserve(sorted_tiles.size());
    std::string tile_data_blob;
    tile_data_blob.reserve(tiles.size() * 64);

    uint64_t offset = 0;
    uint8_t min_zoom = std::numeric_limits<uint8_t>::max();
    uint8_t max_zoom = 0;
    double min_lon = 180.0;
    double min_lat = 90.0;
    double max_lon = -180.0;
    double max_lat = -90.0;

    for (const auto& entry : sorted_tiles) {
        const pmtiles::zxy& tile = entry.first;
        const std::string& payload = entry.second;

        const uint64_t tile_id = pmtiles::zxy_to_tileid(tile.z, tile.x, tile.y);

        if (payload.size() > std::numeric_limits<uint32_t>::max()) {
            return false;
        }

        entries.emplace_back(tile_id, offset, static_cast<uint32_t>(payload.size()), 1);
        tile_data_blob.append(payload);
        offset += payload.size();

        min_zoom = std::min<uint8_t>(min_zoom, tile.z);
        max_zoom = std::max<uint8_t>(max_zoom, tile.z);

        const double tile_min_lon = tile_x_to_lon(tile.x, tile.z);
        const double tile_max_lon = tile_x_to_lon(tile.x + 1, tile.z);
        const double tile_min_lat = tile_y_to_lat(tile.y + 1, tile.z);
        const double tile_max_lat = tile_y_to_lat(tile.y, tile.z);

        min_lon = std::min(min_lon, tile_min_lon);
        min_lat = std::min(min_lat, tile_min_lat);
        max_lon = std::max(max_lon, tile_max_lon);
        max_lat = std::max(max_lat, tile_max_lat);
    }

    const std::string metadata = metadata_json.empty() ? std::string("{}") : metadata_json;

    std::string root_dir_bytes;
    std::string leaf_dir_bytes;
    if (!entries.empty()) {
        auto identity = [](const std::string& data, uint8_t) { return data; };
        int leaf_count = 0;
        std::tie(root_dir_bytes, leaf_dir_bytes, leaf_count) =
            pmtiles::make_root_leaves(identity, pmtiles::COMPRESSION_NONE, entries);
    }

    constexpr uint64_t header_size = 127;
    const uint64_t root_offset = header_size;
    const uint64_t leaf_offset = root_offset + static_cast<uint64_t>(root_dir_bytes.size());
    const uint64_t tile_offset = leaf_offset + static_cast<uint64_t>(leaf_dir_bytes.size());
    const uint64_t metadata_offset = tile_offset + static_cast<uint64_t>(tile_data_blob.size());

    pmtiles::headerv3 header{};
    header.root_dir_offset = root_dir_bytes.empty() ? 0 : root_offset;
    header.root_dir_bytes = root_dir_bytes.size();
    header.leaf_dirs_offset = leaf_dir_bytes.empty() ? 0 : leaf_offset;
    header.leaf_dirs_bytes = leaf_dir_bytes.size();
    header.tile_data_offset = tile_data_blob.empty() ? 0 : tile_offset;
    header.tile_data_bytes = tile_data_blob.size();
    header.json_metadata_offset = metadata.empty() ? 0 : metadata_offset;
    header.json_metadata_bytes = metadata.size();
    header.addressed_tiles_count = entries.size();
    header.tile_entries_count = entries.size();
    header.tile_contents_count = entries.size();
    header.clustered = false;
    header.internal_compression = pmtiles::COMPRESSION_NONE;
    header.tile_compression = tile_compression;
    header.tile_type = tile_type;

    if (!entries.empty()) {
        header.min_zoom = min_zoom;
        header.max_zoom = max_zoom;
        header.min_lon_e7 = static_cast<int32_t>(std::round(std::clamp(min_lon, -180.0, 180.0) * 1e7));
        header.min_lat_e7 = static_cast<int32_t>(std::round(std::clamp(min_lat, -90.0, 90.0) * 1e7));
        header.max_lon_e7 = static_cast<int32_t>(std::round(std::clamp(max_lon, -180.0, 180.0) * 1e7));
        header.max_lat_e7 = static_cast<int32_t>(std::round(std::clamp(max_lat, -90.0, 90.0) * 1e7));
        const double center_lon = (min_lon + max_lon) * 0.5;
        const double center_lat = (min_lat + max_lat) * 0.5;
        header.center_zoom = header.max_zoom;
        header.center_lon_e7 = static_cast<int32_t>(std::round(std::clamp(center_lon, -180.0, 180.0) * 1e7));
        header.center_lat_e7 = static_cast<int32_t>(std::round(std::clamp(center_lat, -90.0, 90.0) * 1e7));
    } else {
        header.min_zoom = 0;
        header.max_zoom = 0;
        header.min_lon_e7 = 0;
        header.min_lat_e7 = 0;
        header.max_lon_e7 = 0;
        header.max_lat_e7 = 0;
        header.center_zoom = 0;
        header.center_lon_e7 = 0;
        header.center_lat_e7 = 0;
    }

    const std::string header_bytes = header.serialize();

    std::ofstream out(path, std::ios::binary);
    if (!out) {
        return false;
    }

    out.write(header_bytes.data(), static_cast<std::streamsize>(header_bytes.size()));
    if (!root_dir_bytes.empty()) {
        out.write(root_dir_bytes.data(), static_cast<std::streamsize>(root_dir_bytes.size()));
    }
    if (!leaf_dir_bytes.empty()) {
        out.write(leaf_dir_bytes.data(), static_cast<std::streamsize>(leaf_dir_bytes.size()));
    }
    if (!tile_data_blob.empty()) {
        out.write(tile_data_blob.data(), static_cast<std::streamsize>(tile_data_blob.size()));
    }
    if (!metadata.empty()) {
        out.write(metadata.data(), static_cast<std::streamsize>(metadata.size()));
    }

    out.flush();
    return static_cast<bool>(out);
}
