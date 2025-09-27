#pragma once
#include <vector>
#include <string>
#include <mutex>
#include "AABB.hpp"

/* @param N: Number of files
 * @param files: Array of file paths
 * @param threads: Number of threads to use (default: 4)
 */
void init_reader_meters(int N, const char** files, int threads);
