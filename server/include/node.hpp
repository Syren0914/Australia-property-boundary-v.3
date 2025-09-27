#pragma once

#include <AABB.hpp>
#include <cam.hpp>

#include <vector>


/*
 * A simple bounding volume hierarchy (BVH) for Props.
 * Since I'm a game engine developer, I've implemented a BVH similar to ones
 * used in real-time ray tracing. The BVH is built using a top-down recursive
 * Here's the paper that I used as a reference:
 * https://research.nvidia.com/sites/default/files/pubs/2013-07_Fast-Parallel-Construction/karras2013hpg_paper.pdf
 */

struct Props;

struct PropRef {
    const Props* props{nullptr};
    AABB box{};
};

struct Node {
    AABB box{};
    Node* left{nullptr};
    Node* right{nullptr};
    PropRef* prop_begin{nullptr};
    PropRef* prop_end{nullptr};

    static void build_tree(int threads);

    bool is_leaf() const noexcept { return !left && !right; }
    void collect_visible(const CameraMeters& view, std::vector<const Props*>& out) const;
};
