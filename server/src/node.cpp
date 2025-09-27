#include <global.hpp>
#include <limits>
#include <algorithm>
#include <omp.h>

#define DEPTH_LIMIT 14

// helper
static inline AABB unite(const AABB& a, const AABB& b) {
    AABB r;
    r.min[0] = std::min(a.min[0], b.min[0]);
    r.min[1] = std::min(a.min[1], b.min[1]);
    r.max[0] = std::max(a.max[0], b.max[0]);
    r.max[1] = std::max(a.max[1], b.max[1]);
    return r;
}

// Assumes: `states.props` (AABB*), `states.prop_count` (size_t),
// and a global `std::vector<Node> all_nodes;`

void Node::build_tree(int threads) {
    const std::size_t N = states.prop_count;
    AABB* const P       = states.props;

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
