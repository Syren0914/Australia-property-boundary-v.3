#pragma once

#include <array>
#include <cmath>
#include <limits>
#include <algorithm>

struct AABB {
  std::array<double,2> min{ { +std::numeric_limits<double>::infinity(),
                               +std::numeric_limits<double>::infinity() } };
  std::array<double,2> max{ { -std::numeric_limits<double>::infinity(),
                               -std::numeric_limits<double>::infinity() } };

  // ---- basics ----
  static constexpr double kEps = 1e-9;

  bool valid()   const noexcept { return min[0] <= max[0] && min[1] <= max[1]; }
  double width() const noexcept { return max[0] - min[0]; }
  double height()const noexcept { return max[1] - min[1]; }
  double area()  const noexcept { return std::max(0.0,width())*std::max(0.0,height()); }

  void normalize() noexcept {
    if (min[0] > max[0]) std::swap(min[0], max[0]);
    if (min[1] > max[1]) std::swap(min[1], max[1]);
  }

  // approx equality (safer than == on doubles)
  bool approxEq(const AABB& o, double eps=kEps) const noexcept {
    return std::abs(min[0]-o.min[0])<=eps && std::abs(min[1]-o.min[1])<=eps &&
           std::abs(max[0]-o.max[0])<=eps && std::abs(max[1]-o.max[1])<=eps;
  }

  // exact equality if you really need it (e.g., canonicalized boxes)
  bool operator==(const AABB& o) const noexcept {
    return min[0]==o.min[0] && min[1]==o.min[1] && max[0]==o.max[0] && max[1]==o.max[1];
  }
  bool operator!=(const AABB& o) const noexcept { return !(*this == o); }

  // Do NOT overload <,>,<=,>= unless you define a clear total order.
  // If you only want "wider along x", make it explicit:
  bool widerXThan(const AABB& o) const noexcept { return width() > o.width(); }

  // useful ops for BVH
  static AABB unite(const AABB& a, const AABB& b) noexcept {
    AABB r;
    r.min[0]=std::min(a.min[0],b.min[0]); r.min[1]=std::min(a.min[1],b.min[1]);
    r.max[0]=std::max(a.max[0],b.max[0]); r.max[1]=std::max(a.max[1],b.max[1]);
    return r;
  }
  AABB& expand(const AABB& b) noexcept { *this = unite(*this,b); return *this; }

  bool overlaps(const AABB& b) const noexcept {
    return !(max[0] < b.min[0] || b.max[0] < min[0] ||
             max[1] < b.min[1] || b.max[1] < min[1]);
  }
  bool contains(double x, double y) const noexcept {
    return (x>=min[0] && x<=max[0] && y>=min[1] && y<=max[1]);
  }

  AABB& operator*=(double s) noexcept {
    min[0] *= s; min[1] *= s; max[0] *= s; max[1] *= s;
    normalize();
    return *this;
  }
};
