/**
 * Core geometry utilities for leaf fracture and hit-testing.
 */

/** Euclidean distance between two points. */
export function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Signed area of a polygon (positive = CCW). */
export function polygonArea(poly) {
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    area += poly[i].x * poly[j].y;
    area -= poly[j].x * poly[i].y;
  }
  return area / 2;
}

/** Centroid of a simple polygon. */
export function polygonCentroid(poly) {
  const a = polygonArea(poly);
  if (Math.abs(a) < 1e-10) {
    // Degenerate — return average of vertices
    const cx = poly.reduce((s, p) => s + p.x, 0) / poly.length;
    const cy = poly.reduce((s, p) => s + p.y, 0) / poly.length;
    return { x: cx, y: cy };
  }
  let cx = 0, cy = 0;
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    const cross = poly[i].x * poly[j].y - poly[j].x * poly[i].y;
    cx += (poly[i].x + poly[j].x) * cross;
    cy += (poly[i].y + poly[j].y) * cross;
  }
  cx /= (6 * a);
  cy /= (6 * a);
  return { x: cx, y: cy };
}

/** Point-in-polygon test (ray casting). */
export function pointInPolygon(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    if (
      (yi > pt.y) !== (yj > pt.y) &&
      pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

/** Axis-aligned bounding box of a polygon. */
export function polygonBounds(poly) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of poly) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

/**
 * Sutherland-Hodgman polygon clipping.
 * Clips `subject` polygon against `clip` polygon.
 * Both must be arrays of {x, y}. Clip polygon should be convex for correct results.
 */
export function clipPolygon(subject, clip) {
  if (subject.length < 3 || clip.length < 3) return [];

  let output = [...subject];

  for (let i = 0; i < clip.length; i++) {
    if (output.length === 0) return [];

    const input = output;
    output = [];

    const edgeStart = clip[i];
    const edgeEnd = clip[(i + 1) % clip.length];

    for (let j = 0; j < input.length; j++) {
      const current = input[j];
      const prev = input[(j + input.length - 1) % input.length];

      const currInside = isInside(current, edgeStart, edgeEnd);
      const prevInside = isInside(prev, edgeStart, edgeEnd);

      if (currInside) {
        if (!prevInside) {
          const inter = lineIntersection(prev, current, edgeStart, edgeEnd);
          if (inter) output.push(inter);
        }
        output.push(current);
      } else if (prevInside) {
        const inter = lineIntersection(prev, current, edgeStart, edgeEnd);
        if (inter) output.push(inter);
      }
    }
  }

  return output;
}

/**
 * Clip a polygon against a half-plane defined by a line from `lineA` to `lineB`.
 * Keeps the left side (CCW winding).
 */
export function clipPolygonByLine(polygon, lineA, lineB) {
  if (polygon.length < 3) return [];
  const output = [];
  for (let j = 0; j < polygon.length; j++) {
    const current = polygon[j];
    const prev = polygon[(j + polygon.length - 1) % polygon.length];
    const currInside = isInside(current, lineA, lineB);
    const prevInside = isInside(prev, lineA, lineB);
    if (currInside) {
      if (!prevInside) {
        const inter = lineIntersection(prev, current, lineA, lineB);
        if (inter) output.push(inter);
      }
      output.push(current);
    } else if (prevInside) {
      const inter = lineIntersection(prev, current, lineA, lineB);
      if (inter) output.push(inter);
    }
  }
  return output;
}

/** Check if point is on the left side of directed edge from a to b. */
function isInside(point, a, b) {
  return (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x) >= 0;
}

/** Line segment intersection between (p1,p2) and (p3,p4). */
function lineIntersection(p1, p2, p3, p4) {
  const x1 = p1.x, y1 = p1.y, x2 = p2.x, y2 = p2.y;
  const x3 = p3.x, y3 = p3.y, x4 = p4.x, y4 = p4.y;
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-10) return null;
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  return {
    x: x1 + t * (x2 - x1),
    y: y1 + t * (y2 - y1),
  };
}

/**
 * Generate N random points inside a polygon using rejection sampling.
 */
export function randomPointsInPolygon(polygon, n, rng = Math.random) {
  const bounds = polygonBounds(polygon);
  const points = [];
  let attempts = 0;
  while (points.length < n && attempts < n * 200) {
    attempts++;
    const x = bounds.minX + rng() * (bounds.maxX - bounds.minX);
    const y = bounds.minY + rng() * (bounds.maxY - bounds.minY);
    if (pointInPolygon({ x, y }, polygon)) {
      points.push({ x, y });
    }
  }
  return points;
}

/**
 * Lloyd relaxation: move each point toward the centroid of its Voronoi cell.
 * This evens out the cell sizes.
 */
export function lloydRelax(seeds, polygon, iterations = 2) {
  let current = seeds.map((p) => ({ ...p }));
  for (let iter = 0; iter < iterations; iter++) {
    const cells = computeVoronoiCells(current, polygon);
    for (let i = 0; i < current.length; i++) {
      if (cells[i] && cells[i].length >= 3) {
        const c = polygonCentroid(cells[i]);
        // Only move if centroid is inside the polygon
        if (pointInPolygon(c, polygon)) {
          current[i] = c;
        }
      }
    }
  }
  return current;
}

/**
 * Compute Voronoi cells for seeds clipped to a bounding polygon.
 * Uses half-plane intersection method.
 */
export function computeVoronoiCells(seeds, polygon) {
  const bounds = polygonBounds(polygon);
  const pad = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) * 0.5;
  // Large bounding box
  const bigBox = [
    { x: bounds.minX - pad, y: bounds.minY - pad },
    { x: bounds.maxX + pad, y: bounds.minY - pad },
    { x: bounds.maxX + pad, y: bounds.maxY + pad },
    { x: bounds.minX - pad, y: bounds.maxY + pad },
  ];

  const cells = [];

  for (let i = 0; i < seeds.length; i++) {
    let cell = [...bigBox];

    for (let j = 0; j < seeds.length; j++) {
      if (i === j) continue;
      if (cell.length < 3) break;

      // Perpendicular bisector between seed i and seed j
      const mid = {
        x: (seeds[i].x + seeds[j].x) / 2,
        y: (seeds[i].y + seeds[j].y) / 2,
      };
      // Direction from i to j
      const dx = seeds[j].x - seeds[i].x;
      const dy = seeds[j].y - seeds[i].y;
      // Two points on the bisector line (perpendicular to i→j, passing through mid)
      // We want to keep the side closer to seed i
      const lineA = { x: mid.x - dy, y: mid.y + dx };
      const lineB = { x: mid.x + dy, y: mid.y - dx };

      cell = clipPolygonByLine(cell, lineA, lineB);
    }

    // Now clip the Voronoi cell to the leaf polygon
    if (cell.length >= 3) {
      cell = clipPolygon(cell, polygon);
    }

    cells.push(cell.length >= 3 ? cell : []);
  }

  return cells;
}

/**
 * Transform a point by rotation around origin, then translate.
 */
export function transformPoint(p, rotation, translation) {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return {
    x: p.x * cos - p.y * sin + translation.x,
    y: p.x * sin + p.y * cos + translation.y,
  };
}

/**
 * Check if a canvas-space point hits a fragment (accounting for position and rotation).
 */
export function hitTestFragment(canvasPoint, fragment) {
  // Transform canvas point into fragment-local coords
  const dx = canvasPoint.x - fragment.currentPosition.x;
  const dy = canvasPoint.y - fragment.currentPosition.y;
  const cos = Math.cos(-fragment.rotation);
  const sin = Math.sin(-fragment.rotation);
  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;

  // Fragment polygon is relative to centroid
  const poly = fragment.polygon.map((v) => ({
    x: v.x - fragment.centroid.x,
    y: v.y - fragment.centroid.y,
  }));

  return pointInPolygon({ x: localX, y: localY }, poly);
}
