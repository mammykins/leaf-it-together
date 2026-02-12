/**
 * Leaf species definitions.
 *
 * Each leaf is defined in a local coordinate system roughly centered at (0, 0)
 * with extent ~±200px. Outlines are generated procedurally as arrays of {x, y} points.
 * Veins are arrays of polyline paths.
 */

// ─── Helpers ────────────────────────────────────────────────────────

function polar(cx, cy, r, angle) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function lerp(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Generate points along a cubic Bezier curve. */
function bezierPoints(p0, p1, p2, p3, steps = 12) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    pts.push({
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
    });
  }
  return pts;
}

/** Add serration (small teeth) along a polygon outline. */
function addSerration(points, toothSize = 4, frequency = 3) {
  const result = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    result.push(a);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < frequency * 2) continue;
    const nx = -dy / len;
    const ny = dx / len;
    const numTeeth = Math.floor(len / frequency);
    for (let j = 1; j < numTeeth; j++) {
      const t = j / numTeeth;
      const mx = a.x + dx * t;
      const my = a.y + dy * t;
      const offset = j % 2 === 0 ? toothSize : -toothSize * 0.3;
      result.push({ x: mx + nx * offset, y: my + ny * offset });
    }
  }
  return result;
}

/** Generate a simple vein system: midrib with branching secondary veins. */
function generateVeins(tipY, baseY, midX, numSecondary, spread, leafWidth) {
  const veins = [];
  // Midrib (stem to tip)
  const midrib = [];
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    midrib.push({ x: midX, y: baseY + (tipY - baseY) * t });
  }
  veins.push(midrib);

  // Secondary veins branching from midrib
  for (let i = 1; i <= numSecondary; i++) {
    const t = 0.15 + (i / (numSecondary + 1)) * 0.7;
    const startY = baseY + (tipY - baseY) * t;
    const veinLen = leafWidth * spread * (0.5 + 0.5 * Math.sin(t * Math.PI));
    // Left branch
    const leftVein = [];
    for (let j = 0; j <= 8; j++) {
      const s = j / 8;
      leftVein.push({
        x: midX - veinLen * s,
        y: startY + (tipY - baseY) * 0.08 * s * (1 - s * 0.5),
      });
    }
    veins.push(leftVein);
    // Right branch (mirror)
    veins.push(leftVein.map((p) => ({ x: midX + (midX - p.x), y: p.y })));
  }
  return veins;
}

// ─── Leaf Generators ────────────────────────────────────────────────

function generateMapleOutline() {
  // 5-lobed maple with deep sinuses
  const points = [];
  const cx = 0, cy = 0;

  // Define lobe tips and sinus bottoms in polar coords from center
  // Going clockwise from top
  const lobes = [
    { angle: -Math.PI / 2, r: 180, width: 0.35 },         // top center (longest)
    { angle: -Math.PI / 2 + 0.75, r: 150, width: 0.3 },   // upper right
    { angle: -Math.PI / 2 + 1.6, r: 120, width: 0.28 },   // lower right
    { angle: -Math.PI / 2 - 0.75, r: 150, width: 0.3 },   // upper left
    { angle: -Math.PI / 2 - 1.6, r: 120, width: 0.28 },   // lower left
  ];

  // Build outline by tracing through each lobe
  // Simplified: create a radius function and sample it
  const numPoints = 120;
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2 - Math.PI / 2;
    let r = 60; // base radius (sinus depth)

    for (const lobe of lobes) {
      let diff = angle - lobe.angle;
      // Normalize to [-π, π]
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;

      const influence = Math.exp(-(diff * diff) / (2 * lobe.width * lobe.width));
      r += (lobe.r - 60) * influence;
    }

    // Small serration
    r += Math.sin(angle * 25) * 3;

    points.push(polar(cx, cy, r, angle));
  }

  // Add stem
  const stemBase = { x: 0, y: 90 };
  const stemEnd = { x: 0, y: 120 };
  // Insert stem points at the bottom
  const bottomIdx = Math.round(numPoints / 2);
  points.splice(bottomIdx, 0, stemBase, stemEnd, stemBase);

  return points;
}

function generateMapleVeins() {
  const veins = [];
  // Central midrib
  veins.push([
    { x: 0, y: 100 },
    { x: 0, y: -170 },
  ]);
  // Veins to each lobe tip
  const lobeTips = [
    { x: 110, y: -80 },
    { x: 90, y: 60 },
    { x: -110, y: -80 },
    { x: -90, y: 60 },
  ];
  for (const tip of lobeTips) {
    const midY = tip.y < 0 ? -20 : 20;
    veins.push([
      { x: 0, y: midY },
      { x: tip.x * 0.5, y: midY + (tip.y - midY) * 0.4 },
      tip,
    ]);
  }
  return veins;
}

function generateOakOutline() {
  // English Oak: elongated oval with rounded lobes
  const points = [];
  const numPoints = 100;

  for (let i = 0; i < numPoints; i++) {
    const t = i / numPoints;
    const angle = t * Math.PI * 2 - Math.PI / 2;

    // Base ellipse (taller than wide)
    let rx = 90;
    let ry = 140;

    // Add rounded lobes (4-5 per side)
    const lobeFreq = 5;
    const lobeMag = 25;
    const lobeOffset = Math.cos(angle * lobeFreq) * lobeMag;

    // Narrow at the base
    const baseNarrow = 1 - 0.3 * Math.max(0, Math.cos(angle + Math.PI / 2));

    const r = Math.sqrt(
      1 / ((Math.cos(angle) / (rx * baseNarrow)) ** 2 + (Math.sin(angle) / ry) ** 2)
    );

    points.push({
      x: (r + lobeOffset) * Math.cos(angle),
      y: (r + lobeOffset * 0.7) * Math.sin(angle),
    });
  }

  return points;
}

function generateOakVeins() {
  return generateVeins(-130, 100, 0, 6, 0.5, 180);
}

function generateBirchOutline() {
  // Silver Birch: small, triangular/diamond with doubly serrated edges
  const points = [];
  const numPoints = 80;

  for (let i = 0; i < numPoints; i++) {
    const t = i / numPoints;
    const angle = t * Math.PI * 2 - Math.PI / 2;

    // Egg/triangle shape: wider near base, pointed at tip
    const tipBias = Math.sin(angle); // Positive = bottom half
    let ry = 160;
    let rx = 80 + tipBias * 20; // Wider at bottom

    // Pointed tip at top
    const topSharpness = Math.max(0, -Math.sin(angle));
    rx *= 1 - topSharpness * 0.5;

    const r = Math.sqrt(1 / ((Math.cos(angle) / rx) ** 2 + (Math.sin(angle) / ry) ** 2));

    // Serration
    const serr = Math.sin(angle * 18) * 5 + Math.sin(angle * 36) * 2;

    points.push({
      x: (r + serr) * Math.cos(angle),
      y: r * Math.sin(angle),
    });
  }

  return points;
}

function generateBirchVeins() {
  return generateVeins(-150, 100, 0, 7, 0.45, 160);
}

function generateBeechOutline() {
  // Common Beech: oval with slightly wavy margin
  const points = [];
  const numPoints = 80;

  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2 - Math.PI / 2;

    let rx = 95;
    let ry = 150;

    const r = Math.sqrt(1 / ((Math.cos(angle) / rx) ** 2 + (Math.sin(angle) / ry) ** 2));

    // Gentle wavy margin
    const wave = Math.sin(angle * 12) * 5;

    points.push({
      x: (r + wave) * Math.cos(angle),
      y: r * Math.sin(angle),
    });
  }

  return points;
}

function generateBeechVeins() {
  return generateVeins(-140, 110, 0, 8, 0.5, 190);
}

function generateLimeOutline() {
  // Common Lime/Linden: heart-shaped, very symmetrical
  const points = [];
  const numPoints = 100;

  for (let i = 0; i < numPoints; i++) {
    const t = i / numPoints;
    const angle = t * Math.PI * 2;

    // Heart shape using cardioid-like function
    // r = a(1 - sin(θ)) gives a cardioid; we modify for a leaf heart shape
    const heartR = 120 * (1 - 0.7 * Math.sin(angle));

    // Make it more elongated vertically
    let x = heartR * Math.cos(angle) * 0.85;
    let y = heartR * Math.sin(angle) * 1.1 - 30;

    // Add a dip at the top (the heart's cleft) — this is the leaf base
    if (angle > Math.PI * 0.35 && angle < Math.PI * 0.65) {
      const cleftT = (angle - Math.PI * 0.35) / (Math.PI * 0.3);
      y += Math.sin(cleftT * Math.PI) * 25;
    }

    // Fine serration
    const serr = Math.sin(angle * 20) * 3;

    points.push({ x: x + serr * Math.cos(angle), y: y + serr * Math.sin(angle) });
  }

  return points;
}

function generateLimeVeins() {
  const veins = [];
  // Midrib
  veins.push([
    { x: 0, y: 90 },
    { x: 0, y: -120 },
  ]);
  // Palmate venation from base — veins radiate from the leaf base
  const baseY = 80;
  const tips = [
    { x: -70, y: -40 },
    { x: -85, y: 10 },
    { x: 70, y: -40 },
    { x: 85, y: 10 },
  ];
  for (const tip of tips) {
    veins.push([{ x: 0, y: baseY }, tip]);
  }
  // A few secondary veins off the midrib
  for (let i = 1; i <= 3; i++) {
    const t = 0.3 + i * 0.18;
    const y = 90 - 210 * t;
    veins.push([
      { x: 0, y },
      { x: -60 * (1 - t * 0.5), y: y - 15 },
    ]);
    veins.push([
      { x: 0, y },
      { x: 60 * (1 - t * 0.5), y: y - 15 },
    ]);
  }
  return veins;
}

function generateChestnutOutline() {
  // Horse Chestnut: palmate (simplified to a single palmate shape with 5-7 finger-like lobes)
  const points = [];
  const numPoints = 120;

  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2 - Math.PI / 2;

    // Base shape: roughly circular
    let r = 100;

    // 7 finger-like lobes
    const numLobes = 7;
    for (let l = 0; l < numLobes; l++) {
      const lobeAngle = -Math.PI / 2 + (l - (numLobes - 1) / 2) * 0.45;
      let diff = angle - lobeAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;

      const lobeR = 75 * (l === Math.floor(numLobes / 2) ? 1 : 0.85); // Center lobe tallest
      const lobeWidth = 0.12;
      r += lobeR * Math.exp(-(diff * diff) / (2 * lobeWidth * lobeWidth));
    }

    // Serrated edges
    r += Math.sin(angle * 22) * 4;

    // Narrow at base
    const baseFactor = Math.max(0, Math.sin(angle + Math.PI / 2));
    r *= 1 - baseFactor * 0.4;

    points.push(polar(0, 0, r, angle));
  }

  return points;
}

function generateChestnutVeins() {
  const veins = [];
  // Central midrib
  veins.push([
    { x: 0, y: 80 },
    { x: 0, y: -170 },
  ]);
  // Palmate veins to each lobe (radiate from base)
  const numLobes = 7;
  for (let l = 0; l < numLobes; l++) {
    const lobeAngle = -Math.PI / 2 + (l - (numLobes - 1) / 2) * 0.45;
    const tipR = l === Math.floor(numLobes / 2) ? 160 : 140;
    const tip = polar(0, 0, tipR, lobeAngle);
    veins.push([
      { x: 0, y: 60 },
      { x: tip.x * 0.4, y: 60 + (tip.y - 60) * 0.4 },
      tip,
    ]);
  }
  return veins;
}

// ─── Species Registry ───────────────────────────────────────────────

export const LEAF_SPECIES = [
  {
    id: 'maple',
    name: 'Sugar Maple',
    scientificName: 'Acer saccharum',
    difficulty: 1,
    funFact:
      'Sugar Maple sap is boiled down to make maple syrup. It takes about 40 litres of sap to produce just 1 litre of syrup!',
    colours: {
      fill: '#4a8c3f',
      fillLight: '#6aad5a',
      vein: '#3a6e30',
      autumn: { fill: '#d4522a', fillLight: '#e8734a', vein: '#a33d1c' },
    },
    generateOutline: generateMapleOutline,
    generateVeins: generateMapleVeins,
  },
  {
    id: 'oak',
    name: 'English Oak',
    scientificName: 'Quercus robur',
    difficulty: 2,
    funFact:
      'An English Oak can live for over 1,000 years and support more than 2,300 different species of wildlife.',
    colours: {
      fill: '#5a8a45',
      fillLight: '#7aab60',
      vein: '#426832',
      autumn: { fill: '#9c7235', fillLight: '#b8894a', vein: '#7a5828' },
    },
    generateOutline: generateOakOutline,
    generateVeins: generateOakVeins,
  },
  {
    id: 'chestnut',
    name: 'Horse Chestnut',
    scientificName: 'Aesculus hippocastanum',
    difficulty: 2,
    funFact:
      'The seeds of Horse Chestnut trees are called conkers. The British game of Conkers has been played since at least the 1850s!',
    colours: {
      fill: '#3d7a35',
      fillLight: '#5a9a4a',
      vein: '#2d5a28',
      autumn: { fill: '#b87830', fillLight: '#d49545', vein: '#8a5a22' },
    },
    generateOutline: generateChestnutOutline,
    generateVeins: generateChestnutVeins,
  },
  {
    id: 'birch',
    name: 'Silver Birch',
    scientificName: 'Betula pendula',
    difficulty: 3,
    funFact:
      'Silver Birch bark contains a chemical called betulin that makes it waterproof. Viking longships used birch bark for caulking!',
    colours: {
      fill: '#5a9648',
      fillLight: '#78b462',
      vein: '#3f7232',
      autumn: { fill: '#d4b840', fillLight: '#e8d060', vein: '#a89030' },
    },
    generateOutline: generateBirchOutline,
    generateVeins: generateBirchVeins,
  },
  {
    id: 'beech',
    name: 'Common Beech',
    scientificName: 'Fagus sylvatica',
    difficulty: 4,
    funFact:
      'Beech trees produce so much shade that almost nothing grows beneath them. The forest floor under a beech canopy is often called a "beech desert."',
    colours: {
      fill: '#4f8840',
      fillLight: '#6aa858',
      vein: '#3a6830',
      autumn: { fill: '#c47828', fillLight: '#e09440', vein: '#985820' },
    },
    generateOutline: generateBeechOutline,
    generateVeins: generateBeechVeins,
  },
  {
    id: 'lime',
    name: 'Common Lime',
    scientificName: 'Tilia × europaea',
    difficulty: 5,
    funFact:
      'Lime tree flowers make a delicious calming tea. In France, "tilleul" (lime blossom tea) is one of the most popular herbal drinks.',
    colours: {
      fill: '#4d8e3a',
      fillLight: '#68ac50',
      vein: '#3a6e2c',
      autumn: { fill: '#c8b430', fillLight: '#e0cc48', vein: '#a09025' },
    },
    generateOutline: generateLimeOutline,
    generateVeins: generateLimeVeins,
  },
];

/**
 * Render a leaf to a canvas context.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} species - A LEAF_SPECIES entry
 * @param {number} offsetX - X offset for drawing
 * @param {number} offsetY - Y offset for drawing
 * @param {number} scale - Scale factor (1 = native coordinates)
 * @param {boolean} autumn - Use autumn colours
 * @param {number} alpha - Opacity (0-1)
 */
export function drawLeaf(ctx, species, offsetX = 0, offsetY = 0, scale = 1, autumn = false, alpha = 1) {
  const outline = species.generateOutline();
  const veins = species.generateVeins();
  const colors = autumn ? species.colours.autumn : species.colours;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  // Fill
  ctx.beginPath();
  outline.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();

  // Gradient fill for naturalism
  const gradient = ctx.createRadialGradient(0, -40, 10, 0, 0, 200);
  gradient.addColorStop(0, colors.fillLight || colors.fill);
  gradient.addColorStop(1, colors.fill);
  ctx.fillStyle = gradient;
  ctx.fill();

  // Veins
  ctx.strokeStyle = colors.vein;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  for (const vein of veins) {
    ctx.beginPath();
    vein.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
  }

  // Subtle outline
  ctx.beginPath();
  outline.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();
  ctx.strokeStyle = colors.vein;
  ctx.lineWidth = 1;
  ctx.globalAlpha = alpha * 0.4;
  ctx.stroke();

  ctx.restore();
}

/**
 * Render a single leaf fragment by clipping the full leaf render to the fragment polygon.
 */
export function drawFragment(ctx, fragment, species, leafOriginX, leafOriginY, scale = 1, autumn = false) {
  const { polygon, centroid, currentPosition, rotation, isPlaced } = fragment;

  ctx.save();

  // Move to fragment's current position
  ctx.translate(currentPosition.x, currentPosition.y);
  ctx.rotate(rotation);

  // Set clip path (polygon relative to centroid, scaled)
  ctx.beginPath();
  polygon.forEach((v, i) => {
    const x = (v.x - centroid.x) * scale;
    const y = (v.y - centroid.y) * scale;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.clip();

  // Draw the full leaf, offset so the correct portion shows through the clip
  const leafOffX = -centroid.x * scale;
  const leafOffY = -centroid.y * scale;
  drawLeaf(ctx, species, leafOffX, leafOffY, scale, autumn);

  ctx.restore();

  // Draw fragment border
  ctx.save();
  ctx.translate(currentPosition.x, currentPosition.y);
  ctx.rotate(rotation);
  ctx.beginPath();
  polygon.forEach((v, i) => {
    const x = (v.x - centroid.x) * scale;
    const y = (v.y - centroid.y) * scale;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();

  if (isPlaced) {
    ctx.strokeStyle = 'rgba(80, 60, 40, 0.15)';
    ctx.lineWidth = 0.5;
  } else {
    ctx.strokeStyle = 'rgba(80, 60, 40, 0.4)';
    ctx.lineWidth = 1.5;
    // Drop shadow for unplaced pieces
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 3;
  }
  ctx.stroke();
  ctx.restore();
}
