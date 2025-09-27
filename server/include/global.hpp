#pragma once

#include <reader.h>
#include <read.hpp>
#include <node.hpp>
#include <cstddef>

struct Vertex {
	double x;
	double y;
};

struct Props {
	int coords_count;
	Vertex coords[];
};

struct States {
	int prop_count;
	Props* props;
};


extern States states;
extern std::size_t props_data_bytes;
extern std::vector<Node> all_nodes;
