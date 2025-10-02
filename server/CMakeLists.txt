cmake_minimum_required(VERSION 3.10)

# Set the C++ standard to C++17
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# used internally by CMake to identify your project
project(boundary)

# Include the directory headers are located
include_directories(${CMAKE_SOURCE_DIR}/include)

# Add the main executable
add_executable(boundary src/main.cpp
                         src/reader.cpp
                         src/node.cpp
                         src/http_server.cpp
                         src/pmtiles_reader.cpp
                         src/cam.cpp)

find_package(OpenMP)
if(OpenMP_CXX_FOUND)
  target_link_libraries(boundary PRIVATE OpenMP::OpenMP_CXX)
else()
  message(WARNING "OpenMP not found; building without OpenMP")
endif()

if(APPLE)
  target_compile_options(boundary PRIVATE -stdlib=libc++)
  target_link_directories(boundary PRIVATE /opt/homebrew/opt/llvm/lib)
  target_link_options(boundary PRIVATE -stdlib=libc++ -Wl,-rpath,/opt/homebrew/opt/llvm/lib)
  target_link_libraries(boundary PRIVATE c++ c++abi)
endif()

# Optimization flags for non-Apple, non-MSVC builds
if(NOT APPLE AND NOT MSVC)
  target_compile_options(boundary PRIVATE -O3 -march=native -flto)
  target_link_options(boundary PRIVATE -flto)
endif()

find_package(GDAL REQUIRED)
target_link_libraries(boundary PRIVATE GDAL::GDAL)


find_package(nlohmann_json CONFIG QUIET)
if(nlohmann_json_FOUND)
  target_link_libraries(boundary PRIVATE nlohmann_json::nlohmann_json)
else()
  message(STATUS "nlohmann_json not found via package config; using header-only include")
endif()

set(RESOURCES_DIR ${CMAKE_CURRENT_SOURCE_DIR}/resources)
set(RESOURCES_OUT ${CMAKE_CURRENT_BINARY_DIR}/resources)

if(EXISTS ${RESOURCES_DIR})
  add_custom_target(copy_assets ALL
    COMMAND ${CMAKE_COMMAND} -E copy_directory ${RESOURCES_DIR} ${RESOURCES_OUT}
    COMMENT "Copying assets to build directory"
  )
else()
  message(STATUS "No assets directory found at ${RESOURCES_DIR}; skipping copy")
endif()

# Add the test executable
add_executable(my_test tests/test.cpp src/node.cpp src/cam.cpp)

# Include directories for the test target
target_include_directories(my_test PRIVATE ${PROJECT_SOURCE_DIR}/include)

if(OpenMP_CXX_FOUND)
  target_link_libraries(my_test PRIVATE OpenMP::OpenMP_CXX)
endif()

if(APPLE)
  target_compile_options(my_test PRIVATE -stdlib=libc++)
  target_link_directories(my_test PRIVATE /opt/homebrew/opt/llvm/lib)
  target_link_options(my_test PRIVATE -stdlib=libc++ -Wl,-rpath,/opt/homebrew/opt/llvm/lib)
  target_link_libraries(my_test PRIVATE c++ c++abi)
endif()

if(NOT APPLE AND NOT MSVC)
  target_compile_options(my_test PRIVATE -O3 -march=native -flto)
  target_link_options(my_test PRIVATE -flto)
endif()

if(nlohmann_json_FOUND)
  target_link_libraries(my_test PRIVATE nlohmann_json::nlohmann_json)
endif()


# Enable testing
enable_testing()

# Register the test executable with CTest (optional)
add_test(NAME my_test COMMAND my_test)
