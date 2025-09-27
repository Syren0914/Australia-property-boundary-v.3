#pragma once

#include <reader.h>
#include <read.hpp>
#include <node.hpp>

struct States {
	int prop_count;
	AABB* props;
};


extern States states;
static std::vector<Node> all_nodes;
