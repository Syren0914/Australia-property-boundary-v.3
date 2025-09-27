#define CATCH_CONFIG_MAIN
#include "catch2/catch.hpp"
#include "AABB.hpp"
#include "read.hpp"
#include "reader.h"
#include <cstdint>
#include <vector>

#include <global.hpp>

States states{0, nullptr};
std::size_t props_data_bytes = 0;

namespace {

struct PropStorage {
    Props header;
    Vertex coords[4];
};

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

//TEST_CASE("All layers in wi-parcels.pmtiles are processed", "[pmtiles]") {
//    const char* const testdata[] = {"resources/wi-parcels.pmtiles"};
//    init_reader_meters(1, testdata, 1);
//    // REQUIRE: All layers processed, AABBs added for all features
//}
