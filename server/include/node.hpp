#pragma once

#include <AABB.hpp>
#include <cam.hpp>
#include <pmtiles.hpp>

#include <string>
#include <utility>
#include <vector>


/*
 * A simple bounding volume hierarchy (BVH) for Props.
 * Since I'm a game engine developer, I've implemented a BVH similar to ones
 * used in real-time ray tracing. The BVH is built using a top-down recursive
 * Here's the paper that I used as a reference:
 * https://research.nvidia.com/sites/default/files/pubs/2013-07_Fast-Parallel-Construction/karras2013hpg_paper.pdf
 */

struct Props;

struct PropRef {
    const Props* props{nullptr};
    AABB box{};
};

struct Node {
    AABB box{};
    Node* left{nullptr};
    Node* right{nullptr};
    PropRef* prop_begin{nullptr};
    PropRef* prop_end{nullptr};

    /* max number of Props in a leaf node */
    static void build_tree(int threads);

    /* Export tiles to PMTiles file.
     *
     * @param path Path to output PMTiles file.
     * @param tiles Vector of pairs of (zxy, tile data).
     * @param metadata_json JSON string for metadata (default: "{}").
     * @param tile_type Tile type (default: pmtiles::TILETYPE_MVT).
     * @param tile_compression Tile compression (default: pmtiles::COMPRESSION_NONE).
     * @return true on success, false on failure.
     */
    static bool export_pmtiles(const std::string& path,
                               const std::vector<std::pair<pmtiles::zxy, std::string>>& tiles,
                               const std::string& metadata_json = "{}",
                               uint8_t tile_type = pmtiles::TILETYPE_MVT,
                               uint8_t tile_compression = pmtiles::COMPRESSION_NONE);

    /* Check if this node is a leaf node (has no children) */
    bool is_leaf() const noexcept { return !left && !right; }

    /* Collect visible Props within the camera view.
     *
     * @param view Camera view in meters.
     * @param out Output vector of Props pointers.
     */
    void collect_visible(const CameraMeters& view, std::vector<const Props*>& out) const;
};
