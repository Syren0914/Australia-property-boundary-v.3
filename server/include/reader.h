#pragma once
#include <vector>
#include <string>
#include <mutex>
#include "AABB.hpp"

#ifdef __cplusplus
extern "C" {
#endif

/* @param N: Number of file_paths
 * @param file_paths: Array of file paths
 * @param threads: Number of threads to use (default: 4)
 */
void init_reader_meters(int N, const char* const* file_paths[N], int threads);

#ifdef __cplusplus
}
#endif
