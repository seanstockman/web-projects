#include "vector2.h"
#include <iostream>
#include <cmath>
#include <stdexcept>

namespace Geometry2D {

struct Point {
    double x;
    double y;
};

struct Circle {
    Point center;
    double radius;
};

Circle findCircumcircle(Point A, Point B, Point C) {
    // Common denominator calculation
    double d = 2.0 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
    
    // Check for collinearity (points on a straight line or overlapping)
    if (std::abs(d) < 1e-9) {
        throw std::invalid_argument("Points are collinear. Circumcircle does not exist.");
    }

    double A_sq = A.x * A.x + A.y * A.y;
    double B_sq = B.x * B.x + B.y * B.y;
    double C_sq = C.x * C.x + C.y * C.y;

    // Calculate Circumcenter (x, y)
    double ux = (A_sq * (B.y - C.y) + B_sq * (C.y - A.y) + C_sq * (A.y - B.y)) / d;
    double uy = (A_sq * (C.x - B.x) + B_sq * (A.x - C.x) + C_sq * (B.x - A.x)) / d;
    
    // Calculate Radius using distance formula from center to vertex A
    double radius = std::sqrt((ux - A.x) * (ux - A.x) + (uy - A.y) * (uy - A.y));
    
    return { {ux, uy}, radius };
}

int main() {
    // Example triangle vertices
    Point A = {0.0, -0.5};
    Point B = {0.5, 0.5};
    Point C = {-0.5, 0.5};

    try {
        Circle result = findCircumcircle(A, B, C);
        std::cout << "Circumcenter: (" << result.center.x << ", " << result.center.y << ")\n";
        std::cout << "Radius: " << result.radius << "\n";
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << "\n";
    }

    return 0;
}

}