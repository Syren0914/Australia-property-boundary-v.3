#pragma once
#include <vector>
#include <string>
#include <mutex>
#include "AABB.hpp"

void init_reader_meters(int N, const char** files, int threads);
