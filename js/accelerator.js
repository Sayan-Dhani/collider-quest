// accelerator.js
// The interactive LHC map: two counter-rotating proton beams that collide at
// four interaction points (CMS/ATLAS opposite, ALICE/LHCb opposite). Handles a
// short beam-energy ramp (injection -> collision energy) and per-IP collision
// flashes, plus click/hover hit-testing on the experiments.
//
// Structure mirrors detector.js (polar helpers, module geometry, hitTest).

const INJECTION_TEV = 0.45;
const COLLISION_TEV = 6.8;
const RAMP_MS = 2600;

// Four interaction points. Angles are math convention (0 = east, CCW positive);
// the draw step flips y so 90 renders at the top. CMS<->ATLAS and ALICE<->LHCb
// are each 180 deg apart.
export const EXPERIMENTS = [
  { id: 'cms', name: 'CMS', angle: 0, role: 'General-purpose detector', playable: true,
    blurb: 'A general-purpose detector — Higgs, top quarks, and searches for new physics. This is your detector: reconstruct events and hunt for signals.' },
  { id: 'atlas', name: 'ATLAS', angle: 180, role: 'General-purpose detector', playable: false,
    blurb: 'The other general-purpose detector, sitting on the opposite side of the ring from CMS. It cross-checks discoveries with completely independent hardware. (Playable soon.)' },
  { id: 'alice', name: 'ALICE', angle: 90, role: 'Heavy-ion detector', playable: false,
    blurb: 'Built for lead-lead collisions, ALICE studies the quark-gluon plasma — a droplet of the hot, dense matter that filled the early universe. (Coming soon.)' },
  { id: 'lhcb', name: 'LHCb', angle: 270, role: 'Flavour / beauty physics', playable: false,
    blurb: 'A forward detector focused on beauty and charm quarks, probing tiny matter-antimatter differences that may explain why the universe is made of matter. (Coming soon.)' },
];

const COLORS = {
  ring: '#2c3e52',
  ringInner: '#1b2735',
  beam1: '#4da6ff',
  beam2: '#ff8a3d',
  flash: '#ffffff',
  cms: '#4da6ff',
  cmsGlow: 'rgba(77,166,255,0.5)',
  node: '#3a4c60',
  nodeText: '#7f8ea0',
  activeText: '#cfe6ff',
};

// --- state -------------------------------------------------------------------

export function createState() {
  return {
    energy: INJECTION_TEV,
    ramping: false,
    rampStart: 0,
    colliding: false,
    flashes: { cms: 0, atlas: 0, alice: 0, lhcb: 0 },
    lastCrossPhase: -1,
  };
}

const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export function startRamp(state) {
  state.energy = INJECTION_TEV;
  state.ramping = true;
  state.colliding = false;
  state.rampStart = nowMs();
}

export function energyFraction(state) {
  return (state.energy - INJECTION_TEV) / (COLLISION_TEV - INJECTION_TEV);
}

const easeInOut = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

// Advance the ramp based on wall-clock time.
function updateRamp(state, now) {
  if (!state.ramping) return;
  const p = Math.min(1, (now - state.rampStart) / RAMP_MS);
  state.energy = INJECTION_TEV + easeInOut(p) * (COLLISION_TEV - INJECTION_TEV);
  if (p >= 1) { state.ramping = false; state.colliding = true; }
}

// --- geometry ----------------------------------------------------------------

let _geom = null;

function computeGeom(canvas) {
  const cx = canvas.width / 2, cy = canvas.height / 2;
  const R = Math.min(canvas.width, canvas.height) / 2 - 52;
  return { cx, cy, R };
}

// Polar -> pixels, with y flipped so angle 90deg is at the top.
function pt(g, r, angleDeg) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: g.cx + r * Math.cos(a), y: g.cy - r * Math.sin(a) };
}

// --- draw --------------------------------------------------------------------

// view = { hoveredId, mode: 'full'|'teaser', now }
export function draw(canvas, state, view = {}) {
  const ctx = canvas.getContext('2d');
  const g = computeGeom(canvas);
  _geom = g;
  const now = view.now ?? nowMs();
  const teaser = view.mode === 'teaser';

  updateRamp(state, now);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawRing(ctx, g);
  const frac = energyFraction(state);
  drawBeams(ctx, g, now, frac, teaser);
  updateAndDrawFlashes(ctx, g, state, now, teaser);
  drawInteractionPoints(ctx, g, view);
}

function drawRing(ctx, g) {
  // Two concentric guide circles for the two beam pipes.
  ctx.strokeStyle = COLORS.ring; ctx.lineWidth = 12;
  ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = COLORS.ringInner; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R + 4, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R - 4, 0, Math.PI * 2); ctx.stroke();
}

const N_BUNCHES = 12;

function drawBeams(ctx, g, now, frac, teaser) {
  // Beam 1 travels counter-clockwise (+angle), beam 2 clockwise (-angle), on two
  // slightly offset radii. Speed scales a little with energy for a "faster" feel.
  const speed = 0.02 + 0.05 * frac;
  const phase = now * 0.001 * speed * 60;
  const bright = teaser ? 0.5 : 0.35 + 0.65 * frac;
  drawBeam(ctx, g, g.R + 4, +1, phase, COLORS.beam1, bright);
  drawBeam(ctx, g, g.R - 4, -1, phase, COLORS.beam2, bright);
}

function drawBeam(ctx, g, radius, dir, phase, color, bright) {
  for (let i = 0; i < N_BUNCHES; i++) {
    const ang = dir * phase + (i * 360) / N_BUNCHES;
    const p = pt(g, radius, ang);
    ctx.globalAlpha = bright;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(p.x, p.y, 2.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// Collision flashes: while colliding, pulse all four IPs together (a bunch of
// beam 1 meets a bunch of beam 2). Each flash decays over time.
function updateAndDrawFlashes(ctx, g, state, now, teaser) {
  const period = 900; // ms between bunch crossings
  const phaseIdx = Math.floor(now / period);
  if (state.colliding && !teaser && phaseIdx !== state.lastCrossPhase) {
    state.lastCrossPhase = phaseIdx;
    for (const e of EXPERIMENTS) state.flashes[e.id] = 1;
  }
  for (const e of EXPERIMENTS) {
    const f = state.flashes[e.id] || 0;
    if (f <= 0) continue;
    state.flashes[e.id] = Math.max(0, f - 0.045);
    const p = pt(g, g.R, e.angle);
    const r = (1 - f) * 22 + 4;
    ctx.save();
    ctx.globalAlpha = f;
    ctx.strokeStyle = COLORS.flash; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = f * 0.9;
    ctx.fillStyle = COLORS.flash;
    ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function drawInteractionPoints(ctx, g, view) {
  ctx.font = '13px system-ui, sans-serif'; ctx.textAlign = 'center';
  for (const e of EXPERIMENTS) {
    const p = pt(g, g.R, e.angle);
    const hovered = view.hoveredId === e.id;
    const active = e.playable;
    // Node.
    ctx.beginPath();
    ctx.arc(p.x, p.y, active ? 11 : 8, 0, Math.PI * 2);
    ctx.fillStyle = active ? COLORS.cms : COLORS.node;
    ctx.fill();
    if (active || hovered) {
      ctx.strokeStyle = active ? COLORS.cmsGlow : 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, 16, 0, Math.PI * 2); ctx.stroke();
    }
    // Label, pushed outward from the ring.
    const lp = pt(g, g.R + 30, e.angle);
    ctx.fillStyle = active ? COLORS.activeText : (hovered ? '#c7d3e0' : COLORS.nodeText);
    ctx.fillText(e.name + (active ? '' : ' 🔒'), lp.x, lp.y + 4);
  }
}

// --- hit-testing -------------------------------------------------------------

export function hitTestIP(x, y) {
  if (!_geom) return null;
  const g = _geom;
  let best = null, bestD = 26;
  for (const e of EXPERIMENTS) {
    const p = pt(g, g.R, e.angle);
    const d = Math.hypot(x - p.x, y - p.y);
    if (d < bestD) { bestD = d; best = e.id; }
  }
  return best;
}

export function getExperiment(id) {
  return EXPERIMENTS.find((e) => e.id === id);
}

export const ENERGY = { INJECTION_TEV, COLLISION_TEV };
