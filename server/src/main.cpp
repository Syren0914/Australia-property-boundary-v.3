#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <filesystem>
#include <string>
#include <vector>

#ifdef _OPENMP
#include <omp.h>
#endif

#include <reader.h>
#include <node.hpp>

#include <thread>

void start_http_server();
void set_pmtiles_source(const std::string& path);

int main()
{
    const char* env_source = std::getenv("PMTILES_SOURCE_PATH");

    const std::vector<std::filesystem::path> candidates = [&]() {
        std::vector<std::filesystem::path> paths;
        if (env_source && std::strlen(env_source) > 0) {
            paths.emplace_back(env_source);
        }
        paths.emplace_back("assets/wi-parcels.pmtiles");
        paths.emplace_back("../assets/wi-parcels.pmtiles");
        return paths;
    }();

    std::filesystem::path data_path;
    for (const auto& candidate : candidates) {
        std::error_code ec;
        if (std::filesystem::exists(candidate, ec)) {
            data_path = std::filesystem::absolute(candidate, ec);
            if (!ec) {
                break;
            }
        }
    }

    if (data_path.empty()) {
        std::fprintf(stderr, "Failed to locate PMTiles source. Set PMTILES_SOURCE_PATH.\n");
        return 1;
    }

    const std::string path_str = data_path.string();
    const char* path_cstr = path_str.c_str();

    const unsigned int hw_threads = std::thread::hardware_concurrency();
    const int build_threads = hw_threads > 0 ? static_cast<int>(hw_threads) : 1;

    init_reader_meters(1, &path_cstr, build_threads);
    Node::build_tree(build_threads);

    set_pmtiles_source(path_str);

    start_http_server();

    return 0;
}
