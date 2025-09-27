#include <cstdio>

#ifdef _OPENMP
#include <omp.h>
#endif

#include <reader.h>

int main()
{
    init_reader_meters(1, (const char*[]){"assets/wi-parcels.pmtiles"}, 1);

    return 0;
}
