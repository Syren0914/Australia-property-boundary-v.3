#include <cam.hpp>

Camera::Camera() {

    /* Stuff with camera meters */
    cam_meters.view.min[0] = cam_meters.view.min[1] = 0.0;
    cam_meters.view.max[0] = cam_meters.view.max[1] = 0.0;
    cam_meters.meters_per_pixel = 1.0;
}

Camera::~Camera() {
}
