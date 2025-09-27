#define CATCH_CONFIG_MAIN
#include "catch2/catch.hpp"
#include "AABB.hpp"
#include "read.hpp"
#include "reader.h"
#include <cstdint>

uint32_t factorial( uint32_t number ) {
    return number <= 1 ? number : factorial(number-1) * number;
}

TEST_CASE("Factorials are computed", "[factorial]") {
    REQUIRE(factorial( 1) == 1 );
    REQUIRE(factorial( 2) == 2 );
    REQUIRE(factorial( 3) == 6 );
    REQUIRE(factorial(10) == 3'628'800 );
}

TEST_CASE("All layers in wi-parcels.pmtiles are processed", "[pmtiles]") {
    const char* const testdata[] = {"testdata/wi-parcels.pmtiles"};
    init_reader_meters(1, testdata, 4);
    // REQUIRE: All layers processed, AABBs added for all features
}