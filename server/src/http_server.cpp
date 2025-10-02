#include <arpa/inet.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <unistd.h>

#include <cam.hpp>
#include <global.hpp>
#include <node.hpp>

#include <gdal_priv.h>
#include <ogr_spatialref.h>

#include <algorithm>
#include <cerrno>
#include <chrono>
#include <csignal>
#include <cstring>
#include <iostream>
#include <cctype>
#include <cmath>
#include <filesystem>
#include <fstream>
#include <limits>
#include <memory>
#include <mutex>
#include <nlohmann/json.hpp>
#include <optional>
#include <sstream>
#include <string>
#include <thread>
#include <utility>
#include <vector>
#include <cstdint>

#include <cpl_error.h>
#include <pmtiles_reader.hpp>

namespace {

constexpr int kListenPort = 9090;
constexpr int kBacklog = 16;
constexpr size_t kMaxHeaderSize = 64 * 1024;
constexpr std::size_t kMaxWebSocketPayload = 1 << 20; // 1 MiB safety limit
constexpr std::size_t kMaxTilesPerResponse = 256;
constexpr double kMinWebMercatorLat = -85.05112878;
constexpr double kMaxWebMercatorLat = 85.05112878;
constexpr double kPi = 3.14159265358979323846;
constexpr double kZoomFullDetail = 15.0;
constexpr double kZoomNoDetail = 9.0;

std::unique_ptr<PmtilesReader> g_pmtiles_reader;

using HeaderList = std::vector<std::pair<std::string, std::string>>;

std::optional<std::string> read_request(int fd) {
    std::string data;
    data.reserve(8192);

    char buffer[4096];
    ssize_t bytes = 0;

    while ((bytes = ::recv(fd, buffer, sizeof(buffer), 0)) > 0) {
        data.append(buffer, buffer + bytes);
        if (data.find("\r\n\r\n") != std::string::npos) {
            break;
        }
        if (data.size() > kMaxHeaderSize) {
            return std::nullopt;
        }
    }

    if (bytes < 0) {
        return std::nullopt;
    }

    return data;
}

std::optional<size_t> find_content_length(const std::string& headers) {
    std::istringstream stream(headers);
    std::string line;
    const std::string key = "content-length:";
    while (std::getline(stream, line)) {
        std::string lower = line;
        std::transform(lower.begin(), lower.end(), lower.begin(), ::tolower);
        if (lower.find(key) == 0) {
            try {
                return static_cast<size_t>(std::stoll(line.substr(key.size())));
            } catch (...) {
                return std::nullopt;
            }
        }
    }
    return std::nullopt;
}

struct RequestLine {
    std::string method;
    std::string path;
    std::string version;
};

std::optional<RequestLine> parse_request_line(const std::string& line) {
    std::istringstream stream(line);
    RequestLine info;
    if (!(stream >> info.method >> info.path >> info.version)) {
        return std::nullopt;
    }
    return info;
}

std::string to_lower_copy(std::string s) {
    std::transform(s.begin(), s.end(), s.begin(), [](unsigned char c) {
        return static_cast<char>(std::tolower(c));
    });
    return s;
}

std::string trim_copy(const std::string& s) {
    std::size_t start = 0;
    while (start < s.size() && std::isspace(static_cast<unsigned char>(s[start]))) {
        ++start;
    }
    std::size_t end = s.size();
    while (end > start && std::isspace(static_cast<unsigned char>(s[end - 1]))) {
        --end;
    }
    return s.substr(start, end - start);
}

HeaderList parse_headers(std::istringstream& stream) {
    HeaderList headers;
    std::string line;
    while (std::getline(stream, line)) {
        if (!line.empty() && line.back() == '\r') {
            line.pop_back();
        }
        if (line.empty()) continue;

        const auto colon = line.find(':');
        if (colon == std::string::npos) {
            continue;
        }

        std::string name = trim_copy(line.substr(0, colon));
        std::string value = trim_copy(line.substr(colon + 1));
        name = to_lower_copy(name);
        headers.emplace_back(std::move(name), std::move(value));
    }
    return headers;
}

const std::string* find_header_value(const HeaderList& headers, const std::string& name) {
    const std::string lowered = to_lower_copy(name);
    for (const auto& header : headers) {
        if (header.first == lowered) {
            return &header.second;
        }
    }
    return nullptr;
}

inline double clamp_lat(double lat) {
    return std::clamp(lat, kMinWebMercatorLat, kMaxWebMercatorLat);
}

inline double lon_to_tile_x(double lon, uint8_t z) {
    const double n = std::ldexp(1.0, z);
    double x = (lon + 180.0) / 360.0 * n;
    x = std::clamp(x, 0.0, std::nextafter(n, 0.0));
    return x;
}

inline double lat_to_tile_y(double lat, uint8_t z) {
    const double n = std::ldexp(1.0, z);
    const double clamped = clamp_lat(lat);
    const double lat_rad = clamped * M_PI / 180.0;
    const double merc = std::log(std::tan(lat_rad) + 1.0 / std::cos(lat_rad));
    double y = (1.0 - merc / kPi) / 2.0 * n;
    y = std::clamp(y, 0.0, std::nextafter(n, 0.0));
    return y;
}

std::string base64_encode(const unsigned char* data, std::size_t len) {
    static constexpr char kAlphabet[] =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    std::string out;
    out.reserve(((len + 2) / 3) * 4);

    std::size_t i = 0;
    while (i + 3 <= len) {
        const unsigned char b0 = data[i++];
        const unsigned char b1 = data[i++];
        const unsigned char b2 = data[i++];

        out.push_back(kAlphabet[(b0 >> 2) & 0x3F]);
        out.push_back(kAlphabet[((b0 & 0x03) << 4) | ((b1 >> 4) & 0x0F)]);
        out.push_back(kAlphabet[((b1 & 0x0F) << 2) | ((b2 >> 6) & 0x03)]);
        out.push_back(kAlphabet[b2 & 0x3F]);
    }

    const std::size_t remaining = len - i;
    if (remaining == 1) {
        const unsigned char b0 = data[i++];
        out.push_back(kAlphabet[(b0 >> 2) & 0x3F]);
        out.push_back(kAlphabet[(b0 & 0x03) << 4]);
        out.push_back('=');
        out.push_back('=');
    } else if (remaining == 2) {
        const unsigned char b0 = data[i++];
        const unsigned char b1 = data[i++];
        out.push_back(kAlphabet[(b0 >> 2) & 0x3F]);
        out.push_back(kAlphabet[((b0 & 0x03) << 4) | ((b1 >> 4) & 0x0F)]);
        out.push_back(kAlphabet[(b1 & 0x0F) << 2]);
        out.push_back('=');
    }

    return out;
}

bool send_all(int fd, const void* buffer, std::size_t len) {
    const unsigned char* data = static_cast<const unsigned char*>(buffer);
    std::size_t total_sent = 0;
    while (total_sent < len) {
        ssize_t sent = ::send(fd, data + total_sent, len - total_sent, 0);
        if (sent <= 0) {
            return false;
        }
        total_sent += static_cast<std::size_t>(sent);
    }
    return true;
}

constexpr std::size_t kSha1DigestSize = 20;

struct PmtilesSubset {
    std::string base64_blob;
    std::string raw_blob; // raw PMTiles bytes (subset)
    std::size_t tile_count{0};
    uint8_t zoom{0};
};

// Thread-local buffer to carry raw subset bytes from processing to websocket sender without changing HTTP API
static thread_local std::string tls_last_subset_raw;
static thread_local bool tls_has_subset_raw = false;

std::optional<PmtilesSubset> build_pmtiles_subset(const nlohmann::json& payload,
                                                  uint8_t subset_zoom,
                                                  std::size_t max_tiles) {
    if (!g_pmtiles_reader || !g_pmtiles_reader->is_open()) {
        return std::nullopt;
    }

    if (!payload.contains("bounds")) {
        return std::nullopt;
    }

    const auto& bounds = payload.at("bounds");
    double west = bounds.at("west").get<double>();
    double south = bounds.at("south").get<double>();
    double east = bounds.at("east").get<double>();
    double north = bounds.at("north").get<double>();

    if (east < west) {
        std::swap(east, west);
    }
    if (south > north) {
        std::swap(south, north);
    }

    const double n = std::ldexp(1.0, subset_zoom);

    const double x_min_f = lon_to_tile_x(west, subset_zoom);
    const double x_max_f = lon_to_tile_x(east, subset_zoom);
    const double y_min_f = lat_to_tile_y(north, subset_zoom);
    const double y_max_f = lat_to_tile_y(south, subset_zoom);

    int32_t x_min = static_cast<int32_t>(std::floor(std::clamp(std::min(x_min_f, x_max_f), 0.0, std::nextafter(n, 0.0))));
    int32_t x_max = static_cast<int32_t>(std::floor(std::clamp(std::max(x_min_f, x_max_f), 0.0, std::nextafter(n, 0.0))));
    int32_t y_min = static_cast<int32_t>(std::floor(std::clamp(std::min(y_min_f, y_max_f), 0.0, std::nextafter(n, 0.0))));
    int32_t y_max = static_cast<int32_t>(std::floor(std::clamp(std::max(y_min_f, y_max_f), 0.0, std::nextafter(n, 0.0))));

    const int32_t max_index = static_cast<int32_t>(n) - 1;
    x_min = std::clamp<int32_t>(x_min, 0, max_index);
    x_max = std::clamp<int32_t>(x_max, 0, max_index);
    y_min = std::clamp<int32_t>(y_min, 0, max_index);
    y_max = std::clamp<int32_t>(y_max, 0, max_index);

    if (max_tiles == 0) {
        return std::nullopt;
    }

    std::vector<std::pair<pmtiles::zxy, std::string>> tiles;
    const std::size_t estimated = static_cast<std::size_t>(std::max<int64_t>(1, static_cast<int64_t>((x_max - x_min + 1) * (y_max - y_min + 1))));
    tiles.reserve(std::min<std::size_t>(estimated, max_tiles));

    for (int32_t x = x_min; x <= x_max && tiles.size() < max_tiles; ++x) {
        for (int32_t y = y_min; y <= y_max && tiles.size() < max_tiles; ++y) {
            auto tile_opt = g_pmtiles_reader->get_tile(subset_zoom, static_cast<uint32_t>(x), static_cast<uint32_t>(y));
            if (!tile_opt || tile_opt->empty()) {
                continue;
            }
            std::string tile_data(reinterpret_cast<const char*>(tile_opt->data()), tile_opt->size());
            tiles.emplace_back(pmtiles::zxy{subset_zoom, static_cast<int>(x), static_cast<int>(y)}, std::move(tile_data));
        }
    }

    if (tiles.empty()) {
        return std::nullopt;
    }

    std::error_code ec;
    const auto temp_dir = std::filesystem::temp_directory_path(ec);
    if (ec) {
        std::cerr << "[pmtiles] failed to get temp directory: " << ec.message() << std::endl;
        return std::nullopt;
    }

    const auto now = std::chrono::steady_clock::now().time_since_epoch().count();
    std::ostringstream name;
    name << "camera-tiles-" << now << "-" << std::this_thread::get_id() << ".pmtiles";
    const auto temp_path = temp_dir / name.str();

    if (!Node::export_pmtiles(temp_path.string(), tiles, "{}")) {
        std::cerr << "[pmtiles] export failed for subset" << std::endl;
        std::filesystem::remove(temp_path, ec);
        return std::nullopt;
    }

    std::ifstream input(temp_path, std::ios::binary);
    if (!input) {
        std::cerr << "[pmtiles] failed to open subset file" << std::endl;
        std::filesystem::remove(temp_path, ec);
        return std::nullopt;
    }

    std::string blob((std::istreambuf_iterator<char>(input)), std::istreambuf_iterator<char>());
    input.close();
    std::filesystem::remove(temp_path, ec);

    if (blob.empty()) {
        return std::nullopt;
    }

    PmtilesSubset subset;
    subset.tile_count = tiles.size();
    subset.zoom = subset_zoom;
    subset.raw_blob = std::move(blob);
    subset.base64_blob = base64_encode(reinterpret_cast<const unsigned char*>(subset.raw_blob.data()), subset.raw_blob.size());
    return subset;
}

struct Sha1Context {
    std::uint32_t h[5];
    std::uint64_t length_bits;
    std::uint8_t block[64];
    std::size_t block_len;
};

std::uint32_t rotl32(std::uint32_t value, std::uint32_t bits) {
    return (value << bits) | (value >> (32U - bits));
}

void sha1_process_block(Sha1Context& ctx, const std::uint8_t block[64]) {
    std::uint32_t w[80];
    for (int i = 0; i < 16; ++i) {
        w[i] = (static_cast<std::uint32_t>(block[i * 4 + 0]) << 24) |
               (static_cast<std::uint32_t>(block[i * 4 + 1]) << 16) |
               (static_cast<std::uint32_t>(block[i * 4 + 2]) << 8)  |
               (static_cast<std::uint32_t>(block[i * 4 + 3]));
    }
    for (int i = 16; i < 80; ++i) {
        w[i] = rotl32(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    }

    std::uint32_t a = ctx.h[0];
    std::uint32_t b = ctx.h[1];
    std::uint32_t c = ctx.h[2];
    std::uint32_t d = ctx.h[3];
    std::uint32_t e = ctx.h[4];

    for (int i = 0; i < 80; ++i) {
        std::uint32_t f = 0;
        std::uint32_t k = 0;
        if (i < 20) {
            f = (b & c) | ((~b) & d);
            k = 0x5A827999U;
        } else if (i < 40) {
            f = b ^ c ^ d;
            k = 0x6ED9EBA1U;
        } else if (i < 60) {
            f = (b & c) | (b & d) | (c & d);
            k = 0x8F1BBCDCU;
        } else {
            f = b ^ c ^ d;
            k = 0xCA62C1D6U;
        }

        const std::uint32_t temp = rotl32(a, 5) + f + e + k + w[i];
        e = d;
        d = c;
        c = rotl32(b, 30);
        b = a;
        a = temp;
    }

    ctx.h[0] += a;
    ctx.h[1] += b;
    ctx.h[2] += c;
    ctx.h[3] += d;
    ctx.h[4] += e;
}

void sha1_init(Sha1Context& ctx) {
    ctx.h[0] = 0x67452301U;
    ctx.h[1] = 0xEFCDAB89U;
    ctx.h[2] = 0x98BADCFEU;
    ctx.h[3] = 0x10325476U;
    ctx.h[4] = 0xC3D2E1F0U;
    ctx.length_bits = 0;
    ctx.block_len = 0;
}

void sha1_update(Sha1Context& ctx, const std::uint8_t* data, std::size_t len) {
    ctx.length_bits += static_cast<std::uint64_t>(len) * 8U;

    while (len > 0) {
        const std::size_t space = 64U - ctx.block_len;
        const std::size_t to_copy = std::min(space, len);
        std::memcpy(ctx.block + ctx.block_len, data, to_copy);
        ctx.block_len += to_copy;
        data += to_copy;
        len -= to_copy;

        if (ctx.block_len == 64U) {
            sha1_process_block(ctx, ctx.block);
            ctx.block_len = 0;
        }
    }
}

void sha1_final(Sha1Context& ctx, unsigned char out[kSha1DigestSize]) {
    ctx.block[ctx.block_len++] = 0x80U;
    if (ctx.block_len > 56U) {
        std::memset(ctx.block + ctx.block_len, 0, 64U - ctx.block_len);
        sha1_process_block(ctx, ctx.block);
        ctx.block_len = 0;
    }

    std::memset(ctx.block + ctx.block_len, 0, 56U - ctx.block_len);
    ctx.block_len = 56U;

    const std::uint64_t length_be = ctx.length_bits;
    for (int i = 7; i >= 0; --i) {
        ctx.block[ctx.block_len++] = static_cast<std::uint8_t>((length_be >> (i * 8)) & 0xFFU);
    }

    sha1_process_block(ctx, ctx.block);

    for (int i = 0; i < 5; ++i) {
        out[i * 4 + 0] = static_cast<unsigned char>((ctx.h[i] >> 24) & 0xFFU);
        out[i * 4 + 1] = static_cast<unsigned char>((ctx.h[i] >> 16) & 0xFFU);
        out[i * 4 + 2] = static_cast<unsigned char>((ctx.h[i] >> 8) & 0xFFU);
        out[i * 4 + 3] = static_cast<unsigned char>((ctx.h[i]) & 0xFFU);
    }
}

void compute_sha1(const std::string& data, unsigned char out[kSha1DigestSize]) {
    Sha1Context ctx;
    sha1_init(ctx);
    sha1_update(ctx, reinterpret_cast<const std::uint8_t*>(data.data()), data.size());
    sha1_final(ctx, out);
}

bool recv_exact(int fd, void* buffer, std::size_t len) {
    unsigned char* data = static_cast<unsigned char*>(buffer);
    std::size_t total_read = 0;
    while (total_read < len) {
        ssize_t bytes = ::recv(fd, data + total_read, len - total_read, 0);
        if (bytes <= 0) {
            return false;
        }
        total_read += static_cast<std::size_t>(bytes);
    }
    return true;
}

struct WebSocketFrame {
    bool fin{true};
    std::uint8_t opcode{0};
    std::vector<std::uint8_t> payload{};
};

std::optional<WebSocketFrame> read_websocket_frame(int fd) {
    unsigned char header[2];
    if (!recv_exact(fd, header, sizeof(header))) {
        return std::nullopt;
    }

    WebSocketFrame frame;
    frame.fin = (header[0] & 0x80) != 0;
    frame.opcode = static_cast<std::uint8_t>(header[0] & 0x0F);

    const bool masked = (header[1] & 0x80) != 0;
    std::uint64_t payload_len = static_cast<std::uint64_t>(header[1] & 0x7F);

    if (!masked) {
        std::cerr << "[ws] received unmasked frame; closing connection" << std::endl;
        return std::nullopt;
    }

    if (payload_len == 126) {
        unsigned char extended[2];
        if (!recv_exact(fd, extended, sizeof(extended))) {
            return std::nullopt;
        }
        payload_len = (static_cast<std::uint64_t>(extended[0]) << 8) |
                       static_cast<std::uint64_t>(extended[1]);
    } else if (payload_len == 127) {
        unsigned char extended[8];
        if (!recv_exact(fd, extended, sizeof(extended))) {
            return std::nullopt;
        }
        payload_len = 0;
        for (int i = 0; i < 8; ++i) {
            payload_len = (payload_len << 8) | extended[i];
        }
    }

    if (payload_len > kMaxWebSocketPayload) {
        std::cerr << "[ws] payload too large: " << payload_len << " bytes" << std::endl;
        return std::nullopt;
    }

    unsigned char mask[4];
    if (!recv_exact(fd, mask, sizeof(mask))) {
        return std::nullopt;
    }

    frame.payload.resize(static_cast<std::size_t>(payload_len));
    if (!frame.payload.empty()) {
        if (!recv_exact(fd, frame.payload.data(), frame.payload.size())) {
            return std::nullopt;
        }
        for (std::size_t i = 0; i < frame.payload.size(); ++i) {
            frame.payload[i] ^= mask[i % 4];
        }
    }

    return frame;
}

bool send_websocket_text(int fd, const std::string& message) {
    std::vector<std::uint8_t> frame;
    frame.reserve(2 + message.size());
    frame.push_back(0x80 | 0x1); // FIN + text

    const std::size_t len = message.size();
    if (len <= 125) {
        frame.push_back(static_cast<std::uint8_t>(len));
    } else if (len <= 0xFFFF) {
        frame.push_back(126);
        frame.push_back(static_cast<std::uint8_t>((len >> 8) & 0xFF));
        frame.push_back(static_cast<std::uint8_t>(len & 0xFF));
    } else {
        frame.push_back(127);
        for (int i = 7; i >= 0; --i) {
            frame.push_back(static_cast<std::uint8_t>((static_cast<std::uint64_t>(len) >> (i * 8)) & 0xFF));
        }
    }

    frame.insert(frame.end(), message.begin(), message.end());
    return send_all(fd, frame.data(), frame.size());
}

bool send_websocket_pong(int fd, const std::vector<std::uint8_t>& payload) {
    std::vector<std::uint8_t> frame;
    frame.reserve(2 + payload.size());
    frame.push_back(0x80 | 0xA); // FIN + pong opcode

    const std::size_t len = payload.size();
    if (len <= 125) {
        frame.push_back(static_cast<std::uint8_t>(len));
    } else if (len <= 0xFFFF) {
        frame.push_back(126);
        frame.push_back(static_cast<std::uint8_t>((len >> 8) & 0xFF));
        frame.push_back(static_cast<std::uint8_t>(len & 0xFF));
    } else {
        frame.push_back(127);
        for (int i = 7; i >= 0; --i) {
            frame.push_back(static_cast<std::uint8_t>((static_cast<std::uint64_t>(len) >> (i * 8)) & 0xFF));
        }
    }

    frame.insert(frame.end(), payload.begin(), payload.end());
    return send_all(fd, frame.data(), frame.size());
}

bool send_websocket_binary(int fd, const std::string& bytes) {
    std::vector<std::uint8_t> frame;
    frame.reserve(2 + bytes.size());
    frame.push_back(0x80 | 0x2); // FIN + binary opcode

    const std::size_t len = bytes.size();
    if (len <= 125) {
        frame.push_back(static_cast<std::uint8_t>(len));
    } else if (len <= 0xFFFF) {
        frame.push_back(126);
        frame.push_back(static_cast<std::uint8_t>((len >> 8) & 0xFF));
        frame.push_back(static_cast<std::uint8_t>(len & 0xFF));
    } else {
        frame.push_back(127);
        for (int i = 7; i >= 0; --i) {
            frame.push_back(static_cast<std::uint8_t>((static_cast<std::uint64_t>(len) >> (i * 8)) & 0xFF));
        }
    }

    frame.insert(frame.end(), bytes.begin(), bytes.end());
    return send_all(fd, frame.data(), frame.size());
}

bool perform_websocket_handshake(int fd, const HeaderList& headers) {
    const std::string* key = find_header_value(headers, "sec-websocket-key");
    if (!key || key->empty()) {
        return false;
    }

    const std::string concatenated = *key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
    unsigned char digest[kSha1DigestSize];
    compute_sha1(concatenated, digest);
    const std::string accept = base64_encode(digest, kSha1DigestSize);

    std::ostringstream response;
    response << "HTTP/1.1 101 Switching Protocols\r\n"
             << "Upgrade: websocket\r\n"
             << "Connection: Upgrade\r\n"
             << "Sec-WebSocket-Accept: " << accept << "\r\n"
             << "Access-Control-Allow-Origin: *\r\n"
             << "Access-Control-Allow-Headers: Content-Type\r\n"
             << "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n"
             << "\r\n";

    const std::string resp_bytes = response.str();
    return send_all(fd, resp_bytes.data(), resp_bytes.size());
}

// Forward declaration for WebSocket loop reuse
nlohmann::json process_camera_state(const nlohmann::json& payload);

void run_websocket_loop(int fd) {
    while (true) {
        auto frame_opt = read_websocket_frame(fd);
        if (!frame_opt) {
            break;
        }

        const WebSocketFrame& frame = *frame_opt;
        if (frame.opcode == 0x8) { // close
            break;
        }

        if (frame.opcode == 0x9) { // ping
            send_websocket_pong(fd, frame.payload);
            continue;
        }

        if (frame.opcode != 0x1) { // non-text frame
            continue;
        }

        std::string text(frame.payload.begin(), frame.payload.end());
        try {
            nlohmann::json payload = nlohmann::json::parse(text);
            nlohmann::json response = process_camera_state(payload);
            const bool accept_binary = payload.value("acceptBinary", false);
            if (accept_binary && tls_has_subset_raw && response.contains("pmtiles_subset") && !response["pmtiles_subset"].is_null()) {
                // Tell client we're sending binary in a separate frame
                nlohmann::json meta = response;
                meta["pmtiles_subset"]["encoding"] = "binary";
                meta["pmtiles_subset"].erase("data");
                send_websocket_text(fd, meta.dump());
                send_websocket_binary(fd, tls_last_subset_raw);
                tls_last_subset_raw.clear();
                tls_has_subset_raw = false;
            } else {
                send_websocket_text(fd, response.dump());
            }
        } catch (const std::exception& ex) {
            nlohmann::json error = {
                {"status", "error"},
                {"message", ex.what()}
            };
            send_websocket_text(fd, error.dump());
        }
    }
}

CameraMode parse_mode(const nlohmann::json& j) {
    const std::string mode = j.value("mode", "TWO_D");
    return mode == "THREE_D" ? CameraMode::THREE_D : CameraMode::TWO_D;
}

CameraMeters make_camera_meters(const nlohmann::json& payload) {
    const auto& bounds = payload.at("bounds");
    const double west  = bounds.at("west").get<double>();
    const double south = bounds.at("south").get<double>();
    const double east  = bounds.at("east").get<double>();
    const double north = bounds.at("north").get<double>();

    // Allow global extents; clamp to Web Mercator valid latitude range
    const double south_clamped = std::clamp(south, kMinWebMercatorLat, kMaxWebMercatorLat);
    const double north_clamped = std::clamp(north, kMinWebMercatorLat, kMaxWebMercatorLat);

    OGRSpatialReference src;
    src.SetWellKnownGeogCS("WGS84");

    // Use global Web Mercator (meters) instead of CONUS Albers (EPSG:5070)
    OGRSpatialReference dst;
    dst.importFromEPSG(3857);

    auto transform = std::unique_ptr<OGRCoordinateTransformation, decltype(&OGRCoordinateTransformation::DestroyCT)>{
        OGRCreateCoordinateTransformation(&src, &dst),
        &OGRCoordinateTransformation::DestroyCT
    };

    if (!transform) {
        throw std::runtime_error("Failed to create coordinate transformation");
    }

    // Silence occasional projection warnings while transforming bounds
    struct ProjErrorSilencer {
        ProjErrorSilencer() { CPLPushErrorHandler(&ProjErrorSilencer::handler); }
        ~ProjErrorSilencer() { CPLPopErrorHandler(); }
        static void handler(CPLErr eErr, int err_no, const char* msg) {
            if (msg && std::strstr(msg, "Lossy conversion")) {
                return;
            }
            CPLDefaultErrorHandler(eErr, err_no, msg);
        }
    } silencer;

    double xs[4] = { west, east, east, west };
    double ys[4] = { south_clamped, south_clamped, north_clamped, north_clamped };
    double zs[4] = { 0.0, 0.0, 0.0, 0.0 };

    if (!transform->Transform(4, xs, ys, zs)) {
        throw std::runtime_error("Camera bounds fall outside the supported dataset extent");
    }

    CameraMeters meters{};
    meters.view.min[0] = *std::min_element(std::begin(xs), std::end(xs));
    meters.view.max[0] = *std::max_element(std::begin(xs), std::end(xs));
    meters.view.min[1] = *std::min_element(std::begin(ys), std::end(ys));
    meters.view.max[1] = *std::max_element(std::begin(ys), std::end(ys));
    meters.meters_per_pixel = payload.at("metersPerPixel").get<double>();
    return meters;
}

nlohmann::json build_response(const CameraMeters& meters,
                              CameraMode mode,
                              const std::vector<const Props*>& visible) {
    nlohmann::json resp;
    resp["status"] = "ok";
    resp["mode"] = (mode == CameraMode::THREE_D) ? "THREE_D" : "TWO_D";
    resp["visible_count"] = visible.size();
    resp["view_bounds"] = {
        {"min_x", meters.view.min[0]},
        {"min_y", meters.view.min[1]},
        {"max_x", meters.view.max[0]},
        {"max_y", meters.view.max[1]}
    };
    return resp;
}

std::string status_text_for(int status) {
    switch (status) {
        case 200: return "OK";
        case 204: return "No Content";
        case 400: return "Bad Request";
        default: return "OK";
    }
}

void write_response(int fd,
                    int status,
                    const std::string& body,
                    const HeaderList& extra_headers = {}) {
    const bool has_body = status != 204 && !body.empty();

    std::ostringstream oss;
    oss << "HTTP/1.1 " << status << ' ' << status_text_for(status) << "\r\n";
    oss << "Access-Control-Allow-Origin: *\r\n";
    oss << "Access-Control-Allow-Headers: Content-Type\r\n";
    oss << "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n";

    for (const auto& header : extra_headers) {
        oss << header.first << ": " << header.second << "\r\n";
    }

    if (has_body) {
        oss << "Content-Type: application/json\r\n";
    }
    oss << "Content-Length: " << (has_body ? body.size() : 0) << "\r\n";
    oss << "Connection: close\r\n\r\n";

    if (has_body) {
        oss << body;
    }

    const std::string response = oss.str();
    ::send(fd, response.data(), response.size(), 0);
}

nlohmann::json process_camera_state(const nlohmann::json& payload) {
    CameraMode mode = parse_mode(payload);
    CameraMeters meters = make_camera_meters(payload);

    {
        std::lock_guard<std::mutex> lock(camera_state_mutex);
        last_camera_meters = meters;
        last_camera_mode = mode;
    }

    const double zoom = payload.value("zoom", 0.0);
    double detail_factor = 0.0;
    if (zoom >= kZoomFullDetail) {
        detail_factor = 1.0;
    } else if (zoom > kZoomNoDetail) {
        detail_factor = (zoom - kZoomNoDetail) / (kZoomFullDetail - kZoomNoDetail);
    }
    detail_factor = std::clamp(detail_factor, 0.0, 1.0);
    const bool allow_detail = detail_factor > 0.0;

    std::vector<const Props*> visible;
    if (allow_detail && !all_nodes.empty()) {
        all_nodes.front().collect_visible(meters, mode, visible);
    }

    nlohmann::json response = build_response(meters, mode, visible);
    response["detail_enabled"] = allow_detail;
    response["detail_factor"] = detail_factor;

    try {
        std::size_t max_tiles = 0;
        if (allow_detail) {
            max_tiles = std::max<std::size_t>(1, static_cast<std::size_t>(std::round(detail_factor * kMaxTilesPerResponse)));
        }

        const double target_subset_zoom = std::clamp(zoom + 2.0, 5.0, 15.0);
        uint8_t subset_zoom = static_cast<uint8_t>(std::lround(target_subset_zoom));

        if (allow_detail && max_tiles > 0) {
            if (auto subset = build_pmtiles_subset(payload, subset_zoom, max_tiles)) {
                // Stash raw for optional binary websocket send
                tls_last_subset_raw = std::move(subset->raw_blob);
                tls_has_subset_raw = !tls_last_subset_raw.empty();
                response["pmtiles_subset"] = {
                    {"zoom", static_cast<int>(subset->zoom)},
                    {"tile_count", subset->tile_count},
                    {"encoding", "base64"},
                    {"data", std::move(subset->base64_blob)}
                };
            } else {
                tls_last_subset_raw.clear();
                tls_has_subset_raw = false;
            }
        } else {
            response["pmtiles_subset"] = nullptr;
            tls_last_subset_raw.clear();
            tls_has_subset_raw = false;
        }
    } catch (const std::exception& ex) {
        std::cerr << "[pmtiles] subset generation failed: " << ex.what() << std::endl;
    }

    return response;
}

void handle_connection(int fd) {
    auto head_opt = read_request(fd);
    if (!head_opt) {
        ::close(fd);
        return;
    }

    std::string request = *head_opt;
    std::cout << "[http] received initial payload bytes=" << request.size() << std::endl;
    auto header_end = request.find("\r\n\r\n");
    if (header_end == std::string::npos) {
        ::close(fd);
        return;
    }

    std::string headers = request.substr(0, header_end + 4);
    std::string body = request.substr(header_end + 4);

    auto content_length_opt = find_content_length(headers);
    size_t content_length = content_length_opt.value_or(0);

    while (body.size() < content_length) {
        char buffer[4096];
        ssize_t bytes = ::recv(fd, buffer, sizeof(buffer), 0);
        if (bytes <= 0) break;
        body.append(buffer, buffer + bytes);

        printf("[recv] read %zd bytes, total %zu/%zu\n", bytes, body.size(), content_length);
    }

    if (!body.empty()) {
        std::cout << "[http] accumulated body bytes=" << body.size() << std::endl;
    }

    std::istringstream header_stream(headers);
    std::string request_line;
    std::getline(header_stream, request_line);
    if (!request_line.empty() && request_line.back() == '\r') {
        request_line.pop_back();
    }
    std::cout << "[http] received request: " << request_line << std::endl;

    HeaderList header_list = parse_headers(header_stream);

    auto request_info = parse_request_line(request_line);
    if (!request_info) {
        write_response(fd, 400, "{\"status\":\"error\",\"message\":\"Malformed request line\"}");
        ::close(fd);
        return;
    }

    const std::string& method = request_info->method;
    const std::string& path = request_info->path;

    if (method == "GET" && path == "/ws/camera") {
        const std::string* upgrade = find_header_value(header_list, "upgrade");
        const std::string* connection_hdr = find_header_value(header_list, "connection");

        const bool wants_upgrade = upgrade && to_lower_copy(trim_copy(*upgrade)) == "websocket";
        const bool has_connection_upgrade = connection_hdr &&
            to_lower_copy(*connection_hdr).find("upgrade") != std::string::npos;

        if (!wants_upgrade || !has_connection_upgrade) {
            write_response(fd, 400, "{\"status\":\"error\",\"message\":\"Invalid WebSocket handshake\"}");
            ::close(fd);
            return;
        }

        if (!perform_websocket_handshake(fd, header_list)) {
            write_response(fd, 400, "{\"status\":\"error\",\"message\":\"WebSocket handshake failed\"}");
            ::close(fd);
            return;
        }

        std::cout << "[ws] connection upgraded" << std::endl;
        run_websocket_loop(fd);
        ::close(fd);
        return;
    }

    if (method == "OPTIONS" && path == "/api/camera-state") {
        std::cout << "[http] preflight for /api/camera-state" << std::endl;
        HeaderList headers = {
            {"Access-Control-Max-Age", "86400"}
        };
        write_response(fd, 204, "", headers);
        ::close(fd);
        return;
    }

    if (method == "GET" && path == "/health") {
        write_response(fd, 200, "{\"status\":\"ok\"}");
        ::close(fd);
        return;
    }

    if (!(method == "POST" && path == "/api/camera-state")) {
        write_response(fd, 400, "{\"status\":\"error\",\"message\":\"Unsupported endpoint\"}");
        ::close(fd);
        return;
    }

    try {
        nlohmann::json payload = nlohmann::json::parse(body);
        auto response_json = process_camera_state(payload);
        write_response(fd, 200, response_json.dump());
    } catch (const std::exception& ex) {
        nlohmann::json error = {
            {"status", "error"},
            {"message", ex.what()}
        };
        write_response(fd, 400, error.dump());
    }

    ::close(fd);
}

} // namespace

void set_pmtiles_source(const std::string& path) {
    auto reader = std::make_unique<PmtilesReader>(path);
    if (!reader || !reader->is_open()) {
        std::cerr << "[pmtiles] failed to open source: " << path << std::endl;
        return;
    }
    std::cout << "[pmtiles] source ready: " << path << std::endl;
    g_pmtiles_reader = std::move(reader);
}

void start_http_server() {
    std::signal(SIGPIPE, SIG_IGN);

    int server_fd = ::socket(AF_INET, SOCK_STREAM, 0);
    if (server_fd < 0) {
        std::perror("socket");
        return;
    }

    int opt = 1;
    ::setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = INADDR_ANY;
    addr.sin_port = htons(kListenPort);

    if (::bind(server_fd, reinterpret_cast<sockaddr*>(&addr), sizeof(addr)) < 0) {
        std::perror("bind");
        ::close(server_fd);
        return;
    }

    if (::listen(server_fd, kBacklog) < 0) {
        std::perror("listen");
        ::close(server_fd);
        return;
    }

    std::cout << "HTTP server listening on port " << kListenPort << std::endl;

    while (true) {
        int client_fd = ::accept(server_fd, nullptr, nullptr);
        if (client_fd < 0) {
            if (errno == EINTR) continue;
            std::perror("accept");
            break;
        }

        std::cout << "[http] accepted client fd=" << client_fd << std::endl;
        std::thread([client_fd]() {
            handle_connection(client_fd);
        }).detach();
    }

    ::close(server_fd);
}
