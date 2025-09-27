#include <cstdio>

#ifdef _OPENMP
#include <omp.h>
#endif

int main()
{
    #pragma omp parallel for
    for (int i=0; i<8; ++i) {
#ifdef _OPENMP
      std::printf("Hello from %d\n", omp_get_thread_num());
#else
      std::printf("Hello (no OpenMP)\n");
#endif
    }

    return 0;
}
