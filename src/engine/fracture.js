/**
 * Fracture engine: slice a leaf outline into irregular fragments
 * using Voronoi tessellation with Lloyd relaxation.
 */

import {
  randomPointsInPolygon,
  lloydRelax,
  computeVoronoiCells,
  polygonCentroid,
  polygonArea,
  polygonBounds,
} from './geometry';

/** Piece counts for each difficulty level. */
const PIECE_COUNTS = {
  easy: 5,
  medium: 8,
  hard: 13,
};

/**
 * Seeded PRNG (Mulberry32) for reproducible puzzles.
 */
function mulberry32(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Add slight noise to polygon edges so fractures look more like torn edges.
 * Subdivides each edge and displaces midpoints along the edge normal.
 */
function addTornEdgeNoise(polygon, amount = 1.5, subdivisions = 1) {
  if (polygon.length < 3) return polygon;
  const result = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    result.push(a);
    for (let s = 1; s <= subdivisions; s++) {
      const t = s / (subdivisions + 1);
      const mx = a.x + (b.x - a.x) * t;
      const my = a.y + (b.y - a.y) * t;
      // Normal direction
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        const nx = -dy / len;
        const ny = dx / len;
        const displacement = (Math.random() - 0.5) * 2 * amount;
        result.push({ x: mx + nx * displacement, y: my + ny * displacement });
      } else {
        result.push({ x: mx, y: my });
      }
    }
  }
  return result;
}

/**
 * Generate puzzle fragments from a leaf outline.
 *
 * @param {Array<{x: number, y: number}>} outline - Leaf outline polygon
 * @param {'easy' | 'medium' | 'hard'} difficulty - Difficulty level
 * @param {number} [seed] - Optional random seed for reproducibility
 * @returns {Array<Fragment>} Array of fragment objects
 */
export function generateFragments(outline, difficulty = 'medium', seed) {
  const n = PIECE_COUNTS[difficulty] || PIECE_COUNTS.medium;
  const rng = seed != null ? mulberry32(seed) : Math.random;

  // Generate seed points inside the leaf
  let seeds = randomPointsInPolygon(outline, n, rng);

  // If we didn't get enough points (very small/thin leaf), pad with what we have
  if (seeds.length < 3) {
    const bounds = polygonBounds(outline);
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    seeds = [
      { x: cx, y: cy },
      { x: cx - 20, y: cy - 20 },
      { x: cx + 20, y: cy + 20 },
    ];
  }

  // Lloyd relaxation for more even cell sizes
  seeds = lloydRelax(seeds, outline, 2);

  // Compute Voronoi cells clipped to leaf outline
  const cells = computeVoronoiCells(seeds, outline);

  // Build fragment objects
  const totalArea = Math.abs(polygonArea(outline));
  const fragments = [];

  for (let i = 0; i < cells.length; i++) {
    let cell = cells[i];
    if (!cell || cell.length < 3) continue;

    const cellArea = Math.abs(polygonArea(cell));
    // Skip degenerate fragments (< 1% of total area)
    if (cellArea < totalArea * 0.01) continue;

    // Add subtle torn edge noise
    cell = addTornEdgeNoise(cell, 2, 1);

    const centroid = polygonCentroid(cell);

    fragments.push({
      id: i,
      polygon: cell,
      centroid,
      correctPosition: { ...centroid }, // Will be offset to canvas coords later
      currentPosition: { x: 0, y: 0 }, // Set during scatter
      rotation: 0,
      isPlaced: false,
      zIndex: i,
    });
  }

  return fragments;
}

/**
 * Scatter fragments around the play area (outside the central puzzle zone).
 *
 * @param {Array<Fragment>} fragments
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @param {{x: number, y: number}} leafCenter - Center of the assembled leaf on canvas
 */
export function scatterFragments(fragments, canvasWidth, canvasHeight, leafCenter) {
  const margin = 40;
  const avoidRadius = 120; // Keep fragments away from leaf center initially

  for (let i = 0; i < fragments.length; i++) {
    const frag = fragments[i];
    let x, y;
    let attempts = 0;

    // Find a position that's not too close to the center
    do {
      x = margin + Math.random() * (canvasWidth - margin * 2);
      y = margin + Math.random() * (canvasHeight - margin * 2);
      attempts++;
    } while (
      attempts < 50 &&
      Math.abs(x - leafCenter.x) < avoidRadius &&
      Math.abs(y - leafCenter.y) < avoidRadius
    );

    frag.currentPosition = { x, y };

    // Random rotation in 90° increments (feels like real puzzle pieces)
    const rotations = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
    frag.rotation = rotations[Math.floor(Math.random() * rotations.length)];

    frag.zIndex = i;
  }

  return fragments;
}

/**
 * Check if a fragment is close enough to snap into place.
 *
 * @param {Fragment} fragment
 * @param {{x: number, y: number}} leafOrigin - Top-left of leaf's coordinate system on canvas
 * @param {number} snapDistance - Maximum distance for snap (pixels)
 * @param {number} snapAngle - Maximum angle error for snap (radians)
 * @returns {boolean}
 */
export function checkSnap(fragment, leafOrigin, snapDistance = 35, snapAngle = 0.4) {
  // Target position in canvas space
  const targetX = leafOrigin.x + fragment.centroid.x;
  const targetY = leafOrigin.y + fragment.centroid.y;

  const dx = fragment.currentPosition.x - targetX;
  const dy = fragment.currentPosition.y - targetY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Normalize rotation to [0, 2π)
  let rot = fragment.rotation % (Math.PI * 2);
  if (rot < 0) rot += Math.PI * 2;

  // Check if rotation is close to 0 (or 2π)
  const angleOk = rot < snapAngle || rot > Math.PI * 2 - snapAngle;

  return distance < snapDistance && angleOk;
}

/**
 * Snap a fragment into its correct position.
 */
export function snapFragment(fragment, leafOrigin) {
  fragment.currentPosition = {
    x: leafOrigin.x + fragment.centroid.x,
    y: leafOrigin.y + fragment.centroid.y,
  };
  fragment.rotation = 0;
  fragment.isPlaced = true;
}
