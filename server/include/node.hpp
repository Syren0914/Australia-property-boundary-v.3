#pragma once

#include <cam.hpp>

class Node {
    private:
        AABB box;
        Node* child_begin;
        Node* child_end;
        AABB* prop_begin;
        AABB* prop_end;

    public:
        static void build_tree(int threads);

        Node() = default;
        Node(AABB* begin, AABB* end, int threads);

        void nodes_intersect(const Camera& cam, Node*& nodes);
};
