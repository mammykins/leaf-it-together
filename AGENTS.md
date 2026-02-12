# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server at http://localhost:5173 (hot reload)
npm run build     # Production build → dist/
npm run preview   # Preview production build locally
```

No test framework is currently configured.

## Architecture

React + Vite + HTML5 Canvas game. State machine in `App.jsx` controls game phases: `title → select → playing → victory`.

### Core Modules

**`src/engine/geometry.js`** — Pure geometry utilities: point-in-polygon (ray casting), polygon area/centroid, Sutherland-Hodgman polygon clipping, Voronoi cell computation via half-plane intersection, Lloyd relaxation. All fragment maths lives here.

**`src/engine/fracture.js`** — Fragment generation pipeline:
1. Scatter N seed points inside leaf outline (rejection sampling)
2. Lloyd relaxation for even cell sizes
3. Compute Voronoi cells clipped to leaf boundary
4. Add torn-edge noise to vertices
5. Scatter fragments around canvas, snap detection, snap execution

**`src/data/leaves.js`** — Species registry. Each leaf defines procedural `generateOutline()` and `generateVeins()` functions returning `{x, y}` point arrays. Leaf coordinates are centred at `(0, 0)` with extent ~±200px. Also exports `drawLeaf()` and `drawFragment()` for canvas rendering.

**`src/components/PuzzleCanvas.jsx`** — Main game canvas. Handles drag/rotate/snap interactions, timer, piece counter, ghost outline toggle. Renders fragments using canvas clip paths (each fragment clips the full leaf drawing, preserving gradients and veins).

### Key Technical Concepts

- **Voronoi tessellation** splits the leaf into irregular organic fragments. Cell count is the difficulty parameter (5/8/13 pieces).
- **Sutherland-Hodgman clipping** intersects Voronoi cells with the leaf outline.
- **Canvas clip paths** render fragments — the full leaf is drawn through a clipped region, so colour gradients and veins align perfectly across pieces.
- **Seeded PRNG** (Mulberry32) enables reproducible puzzles.

## Adding a New Leaf Species

Add an entry to `LEAF_SPECIES` array in `src/data/leaves.js`:

```js
{
  id: 'willow',
  name: 'Weeping Willow',
  scientificName: 'Salix babylonica',
  difficulty: 3,  // 1-5
  funFact: 'Willow bark contains salicin, the compound aspirin was derived from.',
  colours: {
    fill: '#5a9648', fillLight: '#78b462', vein: '#3f7232',
    autumn: { fill: '#c8b430', fillLight: '#e0cc48', vein: '#a09025' }
  },
  generateOutline: () => [ /* {x, y} points ~±200px from origin */ ],
  generateVeins: () => [ /* array of polyline paths */ ],
}
```

Use the `generateVeins(tipY, baseY, midX, numSecondary, spread, leafWidth)` helper for standard pinnate venation patterns.
