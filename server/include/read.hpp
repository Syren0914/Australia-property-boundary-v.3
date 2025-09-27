#pragma once

#include <vector>
#include "AABB.hpp"

struct State {
    public:
        AABB props[1];
};

class StateList {
    private:
        std::vector<State> states;
    public:
        StateList() = default;
        StateList(int N) {
        }

        ~StateList();

        AABB* get_props(void);
        void add(State state);
};

void computeAABBsForFile(const char* path, StateList& states);