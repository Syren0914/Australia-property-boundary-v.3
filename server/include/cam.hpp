#pragma once

#include <AABB.hpp>
#include <mutex>

enum class CameraMode {
    TWO_D,
    THREE_D
};

struct CameraMeters {
    AABB view; // in meters
    double meters_per_pixel; // meters per pixel
};

class Camera {
    private:

        // double lon; // degrees
        // double lat; // degrees
        // double zoom; // zoom level
        CameraMeters cam_meters;

        void update_camera_meters();

    public:
        const CameraMeters& get_camera_meters() const { return cam_meters; }
        Camera();
        ~Camera();
};

extern CameraMeters last_camera_meters;
extern CameraMode last_camera_mode;
extern std::mutex camera_state_mutex;
