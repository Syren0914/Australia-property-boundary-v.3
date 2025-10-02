#include "pmtiles_reader.hpp"
#include <fstream>
#include <cstring>
#include <stdexcept>

#if defined(__linux__)
#include <sys/mman.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
#endif

// Helper: decompress does nothing (no compression support)
static std::string no_decompress(const std::string& s, uint8_t) {
    return s;
}

// Open from file
PmtilesReader::PmtilesReader(const std::string& path) {
    open_file(path);
}

// Open from in-memory .pmtiles as const char* const[] (concatenate)
PmtilesReader::PmtilesReader(const char* const* data_arr, size_t arr_size) {
    // Calculate total size
    size_t total = 0;
    for (size_t i = 0; i < arr_size; ++i) {
        total += std::strlen(data_arr[i]);
    }
    owned_buffer = std::make_unique<char[]>(total);
    size_t p = 0;
    for (size_t i = 0; i < arr_size; ++i) {
        size_t len = std::strlen(data_arr[i]);
        std::memcpy(owned_buffer.get() + p, data_arr[i], len);
        p += len;
    }
    set_buffer(owned_buffer.get(), total);
}

PmtilesReader::~PmtilesReader() {
#if defined(__linux__)
    if (mapped_region) {
        ::munmap(mapped_region, buffer_size);
        mapped_region = nullptr;
    }
#endif
}

void PmtilesReader::open_file(const std::string& path) {
    opened = false;
#if defined(__linux__)
    int fd = ::open(path.c_str(), O_RDONLY);
    if (fd >= 0) {
        struct stat st;
        if (::fstat(fd, &st) == 0 && st.st_size > 0) {
            void* addr = ::mmap(nullptr, static_cast<size_t>(st.st_size), PROT_READ, MAP_PRIVATE, fd, 0);
            if (addr != MAP_FAILED) {
                mapped_region = addr;
                set_buffer(static_cast<const char*>(addr), static_cast<size_t>(st.st_size));
                opened = true;
            }
        }
        ::close(fd);
        if (opened) return;
    }
#endif
    // Fallback: read into heap buffer
    std::ifstream f(path, std::ios::binary | std::ios::ate);
    if (!f) {
        opened = false;
        return;
    }
    size_t sz = static_cast<size_t>(f.tellg());
    f.seekg(0, std::ios::beg);
    owned_buffer = std::make_unique<char[]>(sz);
    if (!f.read(owned_buffer.get(), sz)) {
        opened = false;
        return;
    }
    set_buffer(owned_buffer.get(), sz);
    opened = true;
}

void PmtilesReader::set_buffer(const char* buf, size_t sz) {
    buffer = buf;
    buffer_size = sz;
    opened = buffer && buffer_size > 127;
}

bool PmtilesReader::is_open() const {
    return opened;
}

std::optional<std::vector<uint8_t>> PmtilesReader::get_tile(uint8_t z, uint32_t x, uint32_t y) {
    if (!is_open()) return std::nullopt;
    try {
        auto tile_info = pmtiles::get_tile(no_decompress, buffer, z, x, y);
        if (tile_info.second == 0) return std::nullopt;
        if (tile_info.first + tile_info.second > buffer_size) return std::nullopt;
        const char* tile_ptr = buffer + tile_info.first;
        return std::vector<uint8_t>(tile_ptr, tile_ptr + tile_info.second);
    } catch (...) {
        return std::nullopt;
    }
}