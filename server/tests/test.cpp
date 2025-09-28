#define CATCH_CONFIG_MAIN
#include "catch2/catch.hpp"
#include "AABB.hpp"
#include "read.hpp"
#include "reader.h"
#include "pmtiles.hpp"
#include <algorithm>
#include <cstdint>
#include <filesystem>
#include <fstream>
#include <vector>

#include <global.hpp>

States states{0, nullptr};
std::size_t props_data_bytes = 0;

namespace {

static std::size_t stride_for(int coord_count) {
    const std::size_t align = alignof(Props);
    std::size_t bytes = sizeof(Props) + static_cast<std::size_t>(coord_count) * sizeof(Vertex);
    return (bytes + (align - 1)) & ~(align - 1);
}

} // namespace

uint32_t factorial( uint32_t number ) {
    return number <= 1 ? number : factorial(number-1) * number;
}

TEST_CASE("Factorials are computed", "[factorial]") {
    REQUIRE(factorial( 1) == 1 );
    REQUIRE(factorial( 2) == 2 );
    REQUIRE(factorial( 3) == 6 );
    REQUIRE(factorial(10) == 3'628'800 );
}

TEST_CASE("BVH camera query returns full properties", "[bvh]") {
    constexpr int prop_count = 2;
    const std::size_t stride0 = stride_for(4);
    const std::size_t stride1 = stride_for(4);

    std::vector<std::uint8_t> storage(stride0 + stride1);

    auto* prop0 = reinterpret_cast<Props*>(storage.data());
    prop0->coords_count = 4;
    prop0->coords[0] = {-5.0, -5.0};
    prop0->coords[1] = {-5.0, +5.0};
    prop0->coords[2] = {+5.0, +5.0};
    prop0->coords[3] = {+5.0, -5.0};

    auto* prop1 = reinterpret_cast<Props*>(storage.data() + stride0);
    prop1->coords_count = 4;
    prop1->coords[0] = {100.0, 100.0};
    prop1->coords[1] = {100.0, 110.0};
    prop1->coords[2] = {110.0, 110.0};
    prop1->coords[3] = {110.0, 100.0};

    states.props = prop0;
    states.prop_count = prop_count;
    props_data_bytes = stride0 + stride1;

    Node::build_tree(/*threads*/1);
    REQUIRE_FALSE(all_nodes.empty());

    CameraMeters cam{};
    cam.view.min[0] = -10.0; cam.view.min[1] = -10.0;
    cam.view.max[0] = +10.0; cam.view.max[1] = +10.0;
    cam.meters_per_pixel = 1.0;

    std::vector<const Props*> visible;
    all_nodes.front().collect_visible(cam, visible);

    REQUIRE(visible.size() == 1);
    REQUIRE(visible.front() == prop0);

    visible.clear();
    cam.view.min[0] = 95.0; cam.view.min[1] = 95.0;
    cam.view.max[0] = 120.0; cam.view.max[1] = 120.0;

    all_nodes.front().collect_visible(cam, visible);

    REQUIRE(visible.size() == 1);
    REQUIRE(visible.front() == prop1);

    states.props = nullptr;
    states.prop_count = 0;
    props_data_bytes = 0;
}

TEST_CASE("Parallel BVH build matches serial", "[bvh][parallel]") {
    constexpr std::size_t prop_count = 1024;
    const std::size_t stride = stride_for(5);

    std::vector<std::uint8_t> storage(prop_count * stride);

    for (std::size_t i = 0; i < prop_count; ++i) {
        auto* prop = reinterpret_cast<Props*>(storage.data() + i * stride);
        prop->coords_count = 5;

        const double baseX = static_cast<double>(i % 32) * 200.0;
        const double baseY = static_cast<double>(i / 32) * 200.0;

        prop->coords[0] = {baseX, baseY};
        prop->coords[1] = {baseX, baseY + 50.0};
        prop->coords[2] = {baseX + 50.0, baseY + 50.0};
        prop->coords[3] = {baseX + 50.0, baseY};
        prop->coords[4] = {baseX, baseY};
    }

    states.props = reinterpret_cast<Props*>(storage.data());
    states.prop_count = static_cast<int>(prop_count);
    props_data_bytes = storage.size();

    Node::build_tree(/*threads*/4);
    REQUIRE_FALSE(all_nodes.empty());

    const std::size_t target = 777;
    const double targetX = static_cast<double>(target % 32) * 200.0;
    const double targetY = static_cast<double>(target / 32) * 200.0;

    CameraMeters cam{};
    cam.view.min[0] = targetX - 10.0;
    cam.view.min[1] = targetY - 10.0;
    cam.view.max[0] = targetX + 60.0;
    cam.view.max[1] = targetY + 60.0;
    cam.meters_per_pixel = 1.0;

    std::vector<const Props*> visible_parallel;
    all_nodes.front().collect_visible(cam, visible_parallel);

    REQUIRE_FALSE(visible_parallel.empty());
    REQUIRE(std::find(visible_parallel.begin(), visible_parallel.end(),
                      reinterpret_cast<Props*>(storage.data() + target * stride))
            != visible_parallel.end());

    const AABB root_parallel = all_nodes.front().box;

    Node::build_tree(/*threads*/1);
    REQUIRE_FALSE(all_nodes.empty());

    std::vector<const Props*> visible_serial;
    all_nodes.front().collect_visible(cam, visible_serial);

    REQUIRE(visible_parallel.size() == visible_serial.size());
    std::sort(visible_parallel.begin(), visible_parallel.end());
    std::sort(visible_serial.begin(), visible_serial.end());
    REQUIRE(visible_parallel == visible_serial);

    const AABB root_serial = all_nodes.front().box;
    REQUIRE(root_parallel.approxEq(root_serial));

    states.props = nullptr;
    states.prop_count = 0;
    props_data_bytes = 0;
}

TEST_CASE("PMTiles export writes valid header", "[pmtiles]") {
    std::vector<std::pair<pmtiles::zxy, std::string>> tiles;
    tiles.emplace_back(pmtiles::zxy{0, 0, 0}, std::string("test_tile_data"));

    const auto temp_path = std::filesystem::temp_directory_path() / "node_pmtiles_test.pmtiles";
    REQUIRE(Node::export_pmtiles(temp_path.string(), tiles, "{}"));

    std::ifstream input(temp_path, std::ios::binary);
    REQUIRE(input.good());

    std::string header_bytes(127, '\0');
    input.read(header_bytes.data(), static_cast<std::streamsize>(header_bytes.size()));
    REQUIRE(input.gcount() == static_cast<std::streamsize>(header_bytes.size()));

    auto header = pmtiles::deserialize_header(header_bytes);
    REQUIRE(header.addressed_tiles_count == 1);
    REQUIRE(header.tile_data_bytes == tiles.front().second.size());
    REQUIRE(header.tile_type == pmtiles::TILETYPE_MVT);

    input.close();
    std::filesystem::remove(temp_path);
}

//TEST_CASE("All layers in wi-parcels.pmtiles are processed", "[pmtiles]") {
//    const char* const testdata[] = {"resources/wi-parcels.pmtiles"};
//    init_reader_meters(1, testdata, 1);
//    // REQUIRE: All layers processed, AABBs added for all features
//}
