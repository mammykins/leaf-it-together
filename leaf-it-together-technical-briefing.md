# Leaf It Together — Technical Briefing

## For: AI Implementation Agent
## Author: Mat Gregory, Machine Gurning Ltd
## Date: February 2026

---

## 1. Vision & Origin

This game was born on a park bench in London during early Autumn. A father picked up a fallen leaf, tore it into pieces, shuffled them, and challenged his 7-year-old daughter to reassemble it. Different species created different challenges — a symmetrical lime leaf was easier than a jagged oak. More pieces meant more difficulty. Sometimes a piece blew away and you had to solve it incomplete.

**Leaf It Together** replicates this tactile joy digitally: users drag, rotate, and snap torn leaf fragments back into a whole. The species name is displayed quietly on screen throughout — the player absorbs botanical knowledge without being tested on it. It's a puzzle game with education as a side-effect, not a goal.

---

## 2. Technical Stack & Environment

| Decision | Choice | Rationale |
|---|---|---|
| **Runtime** | Single-file React artifact (`.jsx`) | Interactive, renders in Claude UI, no build step |
| **Rendering** | HTML5 Canvas (via `useRef` + `useEffect`) | Precise control over fragment rendering, hit-testing, rotation transforms |
| **Leaf graphics** | Procedural SVG paths rendered to canvas | Zero copyright risk, botanically accurate, resolution-independent, enables precise fracture geometry |
| **Styling** | Tailwind core utilities | Available in artifact environment |
| **State management** | React `useState` + `useReducer` | No external deps needed |
| **External deps** | None required | All geometry (Voronoi, path ops) implemented from scratch to keep the artifact self-contained |

### Key Constraint
The artifact environment has **no network access at runtime** and **no localStorage**. All assets (leaf paths, colours, metadata) must be embedded in the source. All state lives in React state/refs.

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   App Component                  │
│                                                  │
│  ┌──────────┐  ┌─────────────┐  ┌────────────┐  │
│  │  Species  │  │   Puzzle    │  │  Victory   │  │
│  │ Selector  │→ │   Canvas    │→ │  Screen    │  │
│  └──────────┘  └─────────────┘  └────────────┘  │
│                       │                          │
│              ┌────────┴────────┐                 │
│              │  Game Engine    │                 │
│              │                 │                 │
│              │ • Leaf Renderer │                 │
│              │ • Voronoi Slicer│                 │
│              │ • Drag/Rotate   │                 │
│              │ • Snap Detector │                 │
│              └─────────────────┘                 │
└─────────────────────────────────────────────────┘
```

---

## 4. Implementation Stages

### Stage 1: Leaf Data & Rendering

**Goal:** Define and render botanically recognisable leaves as filled, veined SVG-style shapes on a canvas.

**Work:**
- Define a `LEAF_SPECIES` data structure containing 6–8 species, each with:
  - `name`: common name (e.g. "English Oak")
  - `scientificName`: Latin binomial (e.g. *Quercus robur*)
  - `outline`: array of cubic Bézier control points defining the leaf perimeter
  - `veins`: array of paths for the midrib and secondary veins
  - `colours`: object with `{ fill, veinStroke, autumn1, autumn2 }` — allows seasonal colour variation
  - `difficulty`: 1–5 rating (symmetrical, uniform leaves = harder; distinctive lobed leaves = easier)
  - `funFact`: one-line botanical fact displayed post-solve
- Render a leaf to canvas: fill the outline path, stroke the veins, apply a subtle radial gradient for natural colour variation.

**Species to include (ordered easy → hard):**
1. **Sugar Maple** (*Acer saccharum*) — deeply lobed, iconic shape, very distinctive. Difficulty: 1
2. **English Oak** (*Quercus robur*) — wavy lobes, recognisable asymmetry. Difficulty: 2
3. **Horse Chestnut** (*Aesculus hippocastanum*) — palmate compound (simplified to single palmate outline). Difficulty: 2
4. **Silver Birch** (*Betula pendula*) — small, serrated, triangular. Difficulty: 3
5. **Common Beech** (*Fagus sylvatica*) — oval with wavy margin, quite uniform. Difficulty: 4
6. **Common Lime/Linden** (*Tilia × europaea*) — heart-shaped, very symmetrical = hard to orient fragments. Difficulty: 5

**Acceptance Criteria:**
- [ ] Each leaf renders on canvas at a target size of ~400×400px and is visually recognisable as the named species
- [ ] Veins are visible and anatomically plausible (midrib + branching secondary veins)
- [ ] Colours are naturalistic (greens with optional autumn palette toggle)
- [ ] A non-botanical adult could distinguish between at least 4 of the 6 species by shape alone
- [ ] Leaf data is a clean, extensible data structure (adding a new species = adding one object)

---

### Stage 2: Voronoi Fracture Engine

**Goal:** Slice a rendered leaf into irregular, organic-looking fragments using Voronoi tessellation, simulating tearing.

**Work:**
- Implement Fortune's algorithm (or a simplified incremental approach) to generate a Voronoi diagram from N seed points within the leaf's bounding box
- Seed point generation strategy:
  - Scatter N points randomly within the leaf outline (use point-in-polygon test)
  - Apply Lloyd relaxation (1–2 iterations) so fragments are roughly similar in size but still irregular
  - N is the difficulty parameter: Easy = 4–6 pieces, Medium = 7–10, Hard = 11–16
- For each Voronoi cell, compute the **intersection** of the cell polygon with the leaf outline polygon. This produces the fragment shape. Use Sutherland-Hodgman polygon clipping.
- Each fragment stores:
  - `id`: unique identifier
  - `polygon`: clipped vertices (in leaf-local coordinates)
  - `centroid`: geometric centre of the fragment
  - `correctPosition`: where it belongs in the assembled leaf
  - `currentPosition`: where it currently is on the play area
  - `rotation`: current rotation angle (radians)
  - `correctRotation`: 0 (always — the leaf is the reference frame)
  - `isPlaced`: boolean
- Add a subtle "torn edge" effect: offset vertices slightly along normals with Perlin-style noise to avoid perfectly straight Voronoi edges.

**Acceptance Criteria:**
- [ ] Given a leaf outline and a piece count N, the engine produces N non-overlapping fragments that tile the original leaf exactly (no gaps, no overlaps beyond floating-point tolerance)
- [ ] Fragments are visually irregular (not grid-like) and roughly similar in area (no fragment < 5% or > 40% of total leaf area)
- [ ] Each fragment retains the correct portion of the leaf's fill colour and vein pattern (rendered via canvas clip paths)
- [ ] The engine runs in < 200ms for N ≤ 16 on a modern browser
- [ ] Increasing N produces more, smaller fragments as expected

---

### Stage 3: Interaction — Drag, Rotate, Snap

**Goal:** Enable the player to pick up fragments, rotate them, drag them into position, and snap them into place when close enough.

**Work:**
- **Scatter:** On puzzle start, distribute fragments randomly around the canvas edges (or a "tray" area below the puzzle zone), each with a random rotation (0°, 90°, 180°, or 270° — or continuous rotation for harder modes).
- **Drag:** Mouse/touch down on a fragment → hit test against all fragment polygons (transformed) → select topmost. Drag moves the fragment. Bring selected fragment to top of render order.
- **Rotate:** 
  - Desktop: scroll wheel or R key while holding a fragment rotates it in 15° increments
  - Mobile: two-finger twist gesture, or a visible rotate button on the selected piece
- **Snap detection:** On mouse/touch up, check if the fragment's centroid is within a **snap radius** (e.g. 30px) of its `correctPosition` AND its rotation is within ±20° of `correctRotation`. If both conditions met:
  - Animate the fragment smoothly to its exact correct position/rotation
  - Set `isPlaced = true`
  - Play a subtle satisfying sound (optional, Web Audio API — a soft leaf-rustle click)
  - Fragment becomes non-interactive (locked in place)
- **Visual feedback:**
  - Held fragment: slight scale-up (1.05×) + drop shadow
  - Hover near correct position: gentle green glow/outline pulse on the target area
  - Incorrectly placed: fragment simply stays where dropped (no penalty, no red flash — keep it gentle)

**Acceptance Criteria:**
- [ ] A fragment can be picked up, dragged smoothly (60fps), and dropped anywhere on the canvas
- [ ] Rotation works via scroll wheel / R key (desktop) and on-screen button (mobile)
- [ ] Snap triggers reliably when the piece is close to correct position+rotation
- [ ] Snap animation is smooth (200ms ease-out transition)
- [ ] Placed pieces lock and cannot be re-dragged
- [ ] All fragments are reachable (no fragment spawns under another permanently)
- [ ] Touch input works on mobile (single finger drag, pinch-rotate or button)

---

### Stage 4: Game Flow & UI

**Goal:** Wrap the puzzle engine in a complete, polished game loop with species selection, difficulty settings, and a victory state.

**Work:**
- **Title screen:**
  - Game title "Leaf It Together" in a warm, hand-drawn style font (use Google Fonts `Caveat` or similar via CDN, or fall back to cursive)
  - Tagline: *"Piece nature back together"*
  - "Play" button
- **Species & difficulty selection:**
  - Show leaf thumbnails in a grid (render small versions of each leaf)
  - Each card shows: leaf thumbnail, common name, difficulty stars (1–5)
  - Below each card or globally: difficulty selector for piece count (Easy 4–6 / Medium 7–10 / Hard 11–16)
  - Optional: "Random" / "Surprise me" button that picks a leaf and difficulty at random
- **Puzzle screen:**
  - Top bar: species common name (large, always visible) + scientific name in italics (smaller, below)
  - Timer (counts up, not down — no pressure, it's meant to be relaxing)
  - Piece counter: "4 / 9 placed"
  - Puzzle canvas: central area with a faint ghost outline of the complete leaf as a placement guide (adjustable opacity — can be turned off for extra challenge)
  - Fragment tray / scatter area around the edges
  - Controls: "Hint" button (briefly flashes the ghost outline brighter), "Restart" button, "Back" button
- **Victory screen:**
  - The completed leaf assembles with a satisfying animation (pieces briefly separate then click together)
  - Species name + scientific name prominently displayed
  - Fun fact about the species fades in
  - "Your time: X:XX"
  - Buttons: "Play again" (same leaf, re-shuffled), "New leaf", "Back to menu"
- **Optional — Missing piece mode:**
  - 1 or 2 fragments are "blown away" (removed from the tray)
  - Player must assemble remaining pieces and identify where the gap is
  - Increases difficulty subtly and maps to the real-world experience of a missing piece

**Acceptance Criteria:**
- [ ] Complete game loop: title → select → puzzle → victory → select (no dead ends)
- [ ] Species name is visible at all times during play (educational goal)
- [ ] Scientific name is displayed in italics
- [ ] Timer counts up from 0:00
- [ ] Piece counter updates correctly on each snap
- [ ] Ghost outline is visible by default and can be toggled
- [ ] Victory triggers immediately when last piece snaps
- [ ] Victory animation plays and fun fact is displayed
- [ ] All navigation buttons work (back, restart, new leaf)
- [ ] The game is playable and completable end-to-end for all 6 species at all 3 difficulty levels

---

### Stage 5: Polish & Feel

**Goal:** Elevate the game from functional to delightful. This is where it goes from "puzzle app" to "the thing you remember from the park bench."

**Work:**
- **Colour & mood:** Warm autumnal palette for the UI (cream background, warm browns, muted greens/oranges). The leaves themselves should feel like they're sitting on a wooden park bench or a stone path — add a subtle background texture.
- **Seasonal palette toggle:** Allow switching leaf colours between summer green and autumn tones (species-specific autumn colours: maple goes red/orange, oak goes brown, birch goes yellow, etc.)
- **Micro-animations:**
  - Fragments have a very subtle idle "breathing" animation (tiny scale oscillation, like they're light enough to be stirred by wind)
  - On pickup: slight upward float + shadow deepens
  - On snap: quick satisfying "click" scale bounce
  - On victory: all pieces briefly pulse, then the assembled leaf slowly rotates once with a gentle parallax on the veins
- **Sound design (optional, can be toggled off):**
  - Ambient: very quiet parkland atmosphere (birds, distant wind)
  - Pick up piece: soft paper/leaf rustle
  - Rotate: gentle crinkle
  - Snap: satisfying wooden click (like a puzzle piece fitting)
  - Victory: warm chime + birdsong swell
- **Accessibility:**
  - All interactive elements keyboard-navigable (Tab to cycle fragments, Arrow keys to move, R to rotate, Enter to drop)
  - Sufficient colour contrast on all text
  - Reduced motion mode (disables animations, keeps snapping functional)
- **Responsive design:**
  - Works on desktop (mouse) and tablet (touch)
  - Canvas and tray resize to viewport
  - Minimum playable width: 375px (iPhone SE)

**Acceptance Criteria:**
- [ ] Background and UI feel warm, natural, and cohesive — not clinical or "default React app"
- [ ] At least 3 micro-animations are present (pickup, snap, victory)
- [ ] Autumn colour mode works for all species with species-appropriate colours
- [ ] The game is playable with keyboard only
- [ ] The game renders correctly on a 375px-wide viewport
- [ ] Overall impression: a 7-year-old would find it fun; an adult would find it calming

---

## 5. Data Schema Reference

```typescript
interface LeafSpecies {
  id: string;
  name: string;                    // "English Oak"
  scientificName: string;          // "Quercus robur"
  outline: Point[][];              // Array of cubic Bézier segments [[start, cp1, cp2, end], ...]
  veins: VeinPath[];               // Midrib + secondary veins
  colours: {
    fill: string;                  // Summer green
    fillGradient?: [string, string]; // Radial gradient for naturalism
    veinStroke: string;
    autumn: {
      fill: string;
      fillGradient?: [string, string];
      veinStroke: string;
    };
  };
  difficulty: 1 | 2 | 3 | 4 | 5;
  funFact: string;
}

interface Fragment {
  id: number;
  polygon: Point[];                // Clipped Voronoi cell vertices
  centroid: Point;
  correctPosition: Point;          // Target position in assembled leaf
  currentPosition: Point;
  rotation: number;                // Current angle in radians
  isPlaced: boolean;
  zIndex: number;
}

interface GameState {
  phase: 'title' | 'select' | 'playing' | 'victory';
  species: LeafSpecies | null;
  difficulty: 'easy' | 'medium' | 'hard';
  fragments: Fragment[];
  placedCount: number;
  startTime: number | null;
  elapsedTime: number;
  showGhost: boolean;
  seasonMode: 'summer' | 'autumn';
  missingPieces: number;           // 0 for normal, 1-2 for missing piece mode
}
```

---

## 6. Complexity & Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Voronoi implementation too complex for single file | Medium | High | Use simplified seed-based polygon splitting instead of full Fortune's. Can degrade to grid-with-jitter if needed. |
| Canvas hit-testing on rotated irregular polygons is fiddly | High | Medium | Use `isPointInPath` with pre-transformed paths. Well-documented approach. |
| Leaf Bézier paths hard to author by hand | Medium | Medium | Start with 3 species (maple, oak, birch — most distinctive). Use simple polygonal outlines as fallback. |
| Mobile touch interactions (especially rotate) | Medium | Medium | Prioritise on-screen rotate button over gesture detection. Simpler and more reliable. |
| Single file exceeds reasonable length | Medium | Low | Target 800–1200 lines. Leaf data is the bulk — can be compressed. |

---

## 7. Definition of Done

The game is **done** when:

1. A user can select a leaf species and difficulty level
2. The leaf is fractured into the correct number of irregular pieces
3. Pieces can be dragged and rotated to their correct positions
4. Pieces snap satisfyingly into place when close enough
5. The species name is visible throughout play
6. A victory state triggers with the species fun fact
7. The game is playable on desktop and mobile
8. A 7-year-old would want to play it more than once
9. An adult would learn at least one leaf species they didn't know

---

*"The best educational games don't feel educational. They feel like play."*
