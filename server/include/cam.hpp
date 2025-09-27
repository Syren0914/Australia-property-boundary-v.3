#pragma once


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


