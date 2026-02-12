# 🍂 Leaf It Together

A leaf reassembly puzzle game — piece nature back together.

Born on a park bench in London during early Autumn. A father picked up a fallen leaf, tore it into pieces, shuffled them, and challenged his daughter to put them back together. Different species created different challenges. This game recreates that joy digitally.

## Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/leaf-it-together.git
cd leaf-it-together
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## How to Play

1. **Choose a leaf** — each species has a difficulty rating (★–★★★★★)
2. **Choose your challenge** — Easy (5 pieces), Medium (8), Hard (13)
3. **Drag fragments** into position
4. **Rotate pieces** — scroll wheel, press `R`, or tap "Rotate top piece"
5. **Snap** — pieces lock in when close to their correct position and rotation
6. **Learn** — the species name is always visible; a fun fact appears when you solve it

Press `G` to toggle the ghost outline guide.

## Species

| Leaf | Scientific Name | Difficulty |
|------|----------------|------------|
| Sugar Maple | *Acer saccharum* | ★☆☆☆☆ |
| English Oak | *Quercus robur* | ★★☆☆☆ |
| Horse Chestnut | *Aesculus hippocastanum* | ★★☆☆☆ |
| Silver Birch | *Betula pendula* | ★★★☆☆ |
| Common Beech | *Fagus sylvatica* | ★★★★☆ |
| Common Lime | *Tilia × europaea* | ★★★★★ |

## Architecture

```
src/
├── main.jsx                  # Entry point
├── App.jsx                   # Game state orchestrator
├── index.css                 # Global styles (warm autumnal palette)
├── data/
│   └── leaves.js             # Species definitions, outline generators, rendering
├── engine/
│   ├── geometry.js           # Point-in-polygon, polygon clipping, Voronoi cells
│   └── fracture.js           # Fragment generation, scatter, snap detection
└── components/
    ├── TitleScreen.jsx       # Landing page
    ├── LeafSelect.jsx        # Species + difficulty picker
    └── PuzzleCanvas.jsx      # Main game canvas with drag/rotate/snap
```

### Key Design Decisions

- **Procedural SVG-style leaf outlines** rendered to HTML5 Canvas — zero copyright risk, resolution-independent, precise fracture geometry control
- **Voronoi tessellation** with Lloyd relaxation for organic, irregular break patterns (not grid cuts)
- **Half-plane intersection** method for Voronoi cell computation — O(n³) but fine for n ≤ 16
- **Sutherland-Hodgman polygon clipping** to intersect Voronoi cells with leaf outlines
- **Canvas clip paths** for fragment rendering — each fragment clips the full leaf drawing, so colour gradients and veins are pixel-perfect

## Development

```bash
npm run dev       # Start dev server (hot reload)
npm run build     # Production build → dist/
npm run preview   # Preview production build locally
```

### Adding a New Leaf Species

Add an entry to `LEAF_SPECIES` in `src/data/leaves.js`:

```js
{
  id: 'willow',
  name: 'Weeping Willow',
  scientificName: 'Salix babylonica',
  difficulty: 3,
  funFact: 'Willow bark contains salicin, the compound aspirin was originally derived from.',
  colours: { fill: '#5a9648', fillLight: '#78b462', vein: '#3f7232',
    autumn: { fill: '#c8b430', fillLight: '#e0cc48', vein: '#a09025' } },
  generateOutline: () => { /* return array of {x, y} points */ },
  generateVeins: () => { /* return array of polyline paths */ },
}
```

Leaf coordinates are roughly centered at (0, 0) with extent ±200px.

## Deployment

### Static hosting (Vercel / Netlify / GitHub Pages)

```bash
npm run build
# Deploy the `dist/` directory
```

### PWA (installable on Android/iOS)

Add a `manifest.json` and service worker to make it installable as a home screen app. See the [Vite PWA plugin](https://vite-pwa-org.netlify.app/) for the simplest path.

## Roadmap

- [ ] Refine leaf outline accuracy (especially maple and chestnut)
- [ ] Sound design (leaf rustle on pickup, click on snap, birdsong on victory)
- [ ] Missing piece mode (1-2 fragments "blown away")
- [ ] Seasonal colour toggle during gameplay
- [ ] Mobile gesture rotation (two-finger twist)
- [ ] Accessibility: full keyboard navigation, reduced motion mode
- [ ] PWA manifest for home screen installation
- [ ] More species (Ginkgo, Rowan, Field Maple, Sweet Chestnut)

## Licence

MIT — see [LICENSE](./LICENSE).

---

*"The best educational games don't feel educational. They feel like play."*
