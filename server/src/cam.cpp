#include <cam.hpp>

CameraMeters last_camera_meters{};
CameraMode last_camera_mode = CameraMode::THREE_D;
std::mutex camera_state_mutex;

Camera::Camera() {

    /* Stuff with camera meters */
    cam_meters.view.min[0] = cam_meters.view.min[1] = 0.0;
    cam_meters.view.max[0] = cam_meters.view.max[1] = 0.0;
    cam_meters.meters_per_pixel = 1.0;
}

Camera::~Camera() {
}
