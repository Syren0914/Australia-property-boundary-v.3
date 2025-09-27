#pragma once
#include <vector>
#include <string>
#include <mutex>
#include "AABB.hpp"

#ifdef __cplusplus
extern "C" {
#endif

/* @param N: Number of files
 * @param files: Array of file paths
 * @param threads: Number of threads to use (default: 4)
 */
void init_reader_meters(int N, const char* files[N], int threads);

#ifdef __cplusplus
}
#endif
