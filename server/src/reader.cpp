#include <reader.h>
#include <read.hpp>
#include <global.hpp>
#include <gdal_priv.h>
#include <ogrsf_frmts.h>
#include <cpl_conv.h>
#include <vector>
#include <cstdio>
#include <cmath>
#include <memory>

static void computeAABBsForFile(const char* path, StateList& states) {


}

void init_reader(int N, const char** filenames) {
  GDALAllRegister();

  #pragma omp parallel for schedule(dynamic)
  for (int i=0; i<N; ++i) {
  }
}
