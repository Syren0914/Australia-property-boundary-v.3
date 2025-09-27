#include <global.hpp>
#include <limits>
#include <algorithm>
#include <vector>
#include <cmath>
#include <cstdio>
#include <omp.h>

#define DEPTH_LIMIT 14

namespace {

std::vector<AABB> prop_boxes;

// helper
static inline AABB unite(const AABB& a, const AABB& b) {
    AABB r;
    r.min[0] = std::min(a.min[0], b.min[0]);
    r.min[1] = std::min(a.min[1], b.min[1]);
    r.max[0] = std::max(a.max[0], b.max[0]);
    r.max[1] = std::max(a.max[1], b.max[1]);
    return r;
}

static inline std::size_t aligned_stride(std::size_t coordCount) noexcept {
    const std::size_t align = alignof(Props);
    std::size_t bytes = sizeof(Props) + coordCount * sizeof(Vertex);
    return (bytes + (align - 1)) & ~(align - 1);
}

} // namespace

// Assumes: `states.props` stores `states.prop_count` packed Props records
// with vertex coordinates, and a global `std::vector<Node> all_nodes;`

void Node::build_tree(int threads) {
    const std::size_t N = static_cast<std::size_t>(states.prop_count);

    if (N == 0 || !states.props || props_data_bytes == 0) {
        all_nodes.clear();
        prop_boxes.clear();
        return;
    }

    prop_boxes.clear();
    prop_boxes.reserve(N);

    const unsigned char* cursor = reinterpret_cast<const unsigned char*>(states.props);
    const unsigned char* const end = cursor + props_data_bytes;
    for (std::size_t i = 0; i < N; ++i) {
        const Props* prop = reinterpret_cast<const Props*>(cursor);
        AABB box;

        if (!prop || prop->coords_count <= 0) {
            box.min[0] = box.min[1] = 0.0;
            box.max[0] = box.max[1] = -0.0;
        } else {
            double minx = +std::numeric_limits<double>::infinity();
            double miny = +std::numeric_limits<double>::infinity();
            double maxx = -std::numeric_limits<double>::infinity();
            double maxy = -std::numeric_limits<double>::infinity();

            const Vertex* verts = prop->coords;
            const int count = prop->coords_count;
            for (int v = 0; v < count; ++v) {
                const double x = verts[v].x;
                const double y = verts[v].y;
                if (!std::isfinite(x) || !std::isfinite(y)) continue;
                if (x < minx) minx = x;
                if (y < miny) miny = y;
                if (x > maxx) maxx = x;
                if (y > maxy) maxy = y;
            }

            if (minx > maxx || miny > maxy) {
                box.min[0] = box.min[1] = 0.0;
                box.max[0] = box.max[1] = -0.0;
            } else {
                box.min[0] = minx;
                box.min[1] = miny;
                box.max[0] = maxx;
                box.max[1] = maxy;
            }
        }

        prop_boxes.push_back(box);
        const int rawCount = prop ? prop->coords_count : 0;
        const std::size_t coordsCount = rawCount > 0 ? static_cast<std::size_t>(rawCount) : 0;
        cursor += aligned_stride(coordsCount);
        if (cursor > end) {
            std::fprintf(stderr, "node traversal exceeded props buffer (prop %zu)\n", i);
            all_nodes.clear();
            prop_boxes.clear();
            return;
        }
    }

    if (cursor != end) {
        std::fprintf(stderr, "node traversal ended at %zu bytes, expected %zu\n",
                     static_cast<size_t>(cursor - reinterpret_cast<const unsigned char*>(states.props)),
                     props_data_bytes);
        all_nodes.clear();
        prop_boxes.clear();
        return;
    }

    AABB* const P = prop_boxes.data();

    const std::size_t L = std::size_t(1) << DEPTH_LIMIT;
    all_nodes.assign(2 * L, Node{});

    const std::size_t chunk = (N + L - 1) / L;

    #pragma omp parallel for schedule(static) num_threads(threads)
    for (std::ptrdiff_t leaf = 0; leaf < (std::ptrdiff_t)L; ++leaf) {
        const std::size_t b = std::min(N, std::size_t(leaf) * chunk);
        const std::size_t e = std::min(N, b + chunk);
        all_nodes[L + leaf] = Node(P + b, P + e, threads);
    }

    for (std::size_t level = L / 2; ; level >>= 1) {
        const std::size_t first = level;
        const std::size_t last  = 2 * level - 1;

        #pragma omp parallel for schedule(static) num_threads(threads)
        for (std::ptrdiff_t i = (std::ptrdiff_t)first; i <= (std::ptrdiff_t)last; ++i) {
            Node& parent    = all_nodes[i];
            Node& leftNode  = all_nodes[2 * std::size_t(i)];
            Node& rightNode = all_nodes[2 * std::size_t(i) + 1];

            parent.child_begin = &leftNode;
            parent.child_end   = parent.child_begin + 2;
            parent.prop_begin  = leftNode.prop_begin;
            parent.prop_end    = rightNode.prop_end;
            parent.box         = unite(leftNode.box, rightNode.box);
        }

        if (level == 1) break;
    }
}

Node::Node(AABB* begin, AABB* end, int threads) {
    child_begin = child_end = nullptr;
    prop_begin = begin; prop_end = end;

    const ptrdiff_t N = end - begin;
    if (N <= 0) { box.min[0]=box.min[1]=0.0; box.max[0]=box.max[1]=-0.0; return; }

    double minx=+std::numeric_limits<double>::infinity();
    double miny=+std::numeric_limits<double>::infinity();
    double maxx=-std::numeric_limits<double>::infinity();
    double maxy=-std::numeric_limits<double>::infinity();

    #pragma omp parallel for num_threads(threads) schedule(static) \
        reduction(min:minx,miny) reduction(max:maxx,maxy)
    for (ptrdiff_t i=0;i<N;++i) {
        const AABB& b = begin[i];
        if (b.min[0] < minx) minx = b.min[0];
        if (b.min[1] < miny) miny = b.min[1];
        if (b.max[0] > maxx) maxx = b.max[0];
        if (b.max[1] > maxy) maxy = b.max[1];
    }
    box.min[0]=minx; box.min[1]=miny; box.max[0]=maxx; box.max[1]=maxy;
}
