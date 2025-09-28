#pragma once

#include "pmtiles.hpp"
#include <string>
#include <vector>
#include <optional>
#include <cstdint>
#include <memory>

class PmtilesReader {
public:
    // From file
    explicit PmtilesReader(const std::string& path);
    // From in-memory array
    PmtilesReader(const char* const* data_arr, size_t arr_size);

    ~PmtilesReader();

    bool is_open() const;
    std::optional<std::vector<uint8_t>> get_tile(uint8_t z, uint32_t x, uint32_t y);

private:
    void open_file(const std::string& path);
    void set_buffer(const char* buf, size_t sz);

    std::unique_ptr<char[]> owned_buffer;
    const char* buffer = nullptr;
    size_t buffer_size = 0;
    bool opened = false;
};