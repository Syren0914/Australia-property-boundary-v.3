#pragma once

#include <vector>
#include "AABB.hpp"

public struct State {
	AABB props[];
};

public class StateList {
	private:
		std::vector<State> states;
	public:
		StateList(int N) {
			aabbs.reserve(N);
		}

		~StateList();

		AABB* get_props(void);
		void add(State state);
};
