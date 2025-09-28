/*
 * Uses httplib library, which allows us to send HTTP requests effortlessly in our programs, making it an invaluable tool in the realm of web development and API integration.
 */
#include "httplib.h"
#include "pmtiles_reader.hpp"
#include <nlohmann/json.hpp>
#include <iostream>

void httpreq() {
    const char* base_url = "localhost";
    int port = 8000;
    httplib::Client client(base_url, port);
    auto res = client.Get("/todos");

    if (!res) {
        std::cerr << "Failed to fetch data.\n";
        return;
    }

    if (res->status != 200) {
        std::cerr << "HTTP error " << res->status << ": " << res->body << "\n";
        return;
    }

    nlohmann::json todos = nlohmann::json::parse(res->body);
    for (const auto& todo : todos) {
        std::cout << "Title: " << todo["title"]
                  << ", Description: " << todo["description"]
                  << ", Done: " << todo["done"] << '\n';
    }

    // ---- Open a .pmtiles file -----
    const std::string pmtiles_path = "my_tiles.pmtiles";
    PmtilesReader reader(pmtiles_path);
    if (!reader.is_open()) {
        std::cerr << "Could not open " << pmtiles_path << '\n';
        return;
    }

    uint8_t z = 5, x = 10, y = 12;
    auto tile_opt = reader.get_tile(z, x, y);
    if (!tile_opt) {
        std::cerr << "Tile not found in " << pmtiles_path << '\n';
    } else {
        const std::vector<uint8_t>& tile_data = *tile_opt;
        std::cout << "Fetched tile (" << (int)z << '/' << (int)x << '/' << (int)y
                  << "), size = " << tile_data.size() << " bytes\n";
        // TODO: Hand `tile_data` to any decoder (e.g. libpng, mapbox::vt)
    }
}