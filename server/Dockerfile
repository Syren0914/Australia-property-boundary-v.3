FROM ubuntu:22.04 AS build

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update -y && \
    apt-get install -y --no-install-recommends \
      build-essential cmake git pkg-config \
      libgdal-dev gdal-bin \
      nlohmann-json3-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . /app/server
WORKDIR /app/server

# Configure and build
RUN cmake -S . -B build -DCMAKE_BUILD_TYPE=Release && \
    cmake --build build --config Release -j$(nproc)

FROM ubuntu:22.04 AS runtime

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update -y && \
    apt-get install -y --no-install-recommends \
      libgdal30 ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build /app/server/build/boundary /usr/local/bin/boundary

# Default data directory inside container; can be overridden via env or volume
ENV PMTILES_SOURCE_PATH=/data/property_boundaries.pmtiles

EXPOSE 9090

CMD ["/usr/local/bin/boundary"]



