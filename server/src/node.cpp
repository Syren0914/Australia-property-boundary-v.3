#include <global.hpp>
#include <cam.hpp>

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstdio>
#include <limits>
#include <vector>

#ifdef _OPENMP
#include <omp.h>
#endif

std::vector<Node> all_nodes;

namespace {

constexpr std::size_t kLeafSize = 16;

std::vector<PropRef> prop_refs;

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
