cmake_minimum_required(VERSION 3.10)

# Set the C++ standard to C++17
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# used internally by CMake to identify your project
project(boundary)

# Include the directory headers are located
include_directories(${CMAKE_SOURCE_DIR}/include)

# Add the main executable
add_executable(boundary src/main.cpp)

find_package(OpenMP)
if(OpenMP_CXX_FOUND)
  target_link_libraries(boundary PRIVATE OpenMP::OpenMP_CXX)
else()
  message(WARNING "OpenMP not found; building without OpenMP")
endif()

find_package(GDAL REQUIRED)
target_link_libraries(boundary PRIVATE GDAL::GDAL)

# Add the test executable
add_executable(my_test tests/test.cpp)

# Include directories for the test target
target_include_directories(my_test PRIVATE ${PROJECT_SOURCE_DIR}/include)

# Enable testing
enable_testing()

# Register the test executable with CTest (optional)
add_test(NAME my_test COMMAND my_test)

