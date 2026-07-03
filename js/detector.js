// detector.js
// Canvas rendering of a simplified CMS transverse cross-section and the physics
// objects in an event. Also owns the screen geometry used for click hit-testing,
// so interaction.js can ask "what did the player click?".

import { degToRad } from './physics.js';

// Consistent visual language (design doc §20).
export const COLORS = {
  muon: '#4da6ff',       // blue curved track
  electron: '#5be08a',   // green (not used in MVP objects, kept for hints)
  photon: '#ffe14d',     // yellow
  jet: '#ff8a3d',        // orange/red cone
  fake: '#8a94a6',       // grey, low-quality track
  met: '#ffffff',        // dashed white arrow
  ring: '#1e2b3a',
  ringLine: '#2c3e52',
  vertex: '#ffd24d',
  hit: '#7fdfff',
  select: '#00ffc6',
  labelBg: 'rgba(0,0,0,0.65)',
};

// Detector layer radii in abstract units; scaled to the canvas at render time.
// (design doc §14: tracker/ECAL/HCAL/muon)
const LAYERS = [
  { name: 'Tracker', r: 80, fill: 'rgba(40,70,110,0.10)' },
  { name: 'ECAL', r: 120, fill: 'rgba(90,80,30,0.10)' },
  { name: 'HCAL', r: 160, fill: 'rgba(90,45,25,0.10)' },
  { name: 'Muon', r: 210, fill: 'rgba(40,90,120,0.08)' },
];
const R_TRACKER = 80;
const R_HCAL = 160;
const R_MUON = 210;
const MAX_R = 230; // outer margin for scaling

// Module state describing where things are on screen, for hit-testing.
let _geom = null;         // { cx, cy, scale }
let _hitRegions = [];      // [{ id, kind, ... }]

// Compute canvas center + scale so the detector fits with a margin.
function computeGeom(canvas) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const scale = (Math.min(canvas.width, canvas.height) / 2 - 12) / MAX_R;
  return { cx, cy, scale };
}

// Convert a (radius-unit, angle-deg) polar point to canvas pixels.
// Canvas y grows downward, so we negate the y component to keep angles
// mathematically standard (0deg = right, 90deg = up).
function polar(g, rUnits, angleDeg) {
  const a = degToRad(angleDeg);
  const r = rUnits * g.scale;
  return { x: g.cx + r * Math.cos(a), y: g.cy - r * Math.sin(a) };
}

// --- track geometry ----------------------------------------------------------
// A charged particle follows a circular arc in the magnetic field. Higher
// momentum -> larger radius -> straighter track. Charge sets the bend direction.
// Returns an array of {x,y} sampled points from the vertex out to `rMaxUnits`.
function trackPoints(g, angleDeg, momentum, charge, rMaxUnits) {
  const pts = [];
  const dir = degToRad(angleDeg);
  const dx = Math.cos(dir), dy = Math.sin(dir);
  // Bending radius in detector units, clamped so it's visible but curved.
  const Rbend = Math.max(60, momentum * 8); // px-ish in units
  const sign = charge === '-' ? -1 : 1;
  // Perpendicular to initial direction (rotate +90deg), pick side by charge.
  const nx = -dy * sign, ny = dx * sign;
  // Circle center in units, relative to vertex.
  const ccx = nx * Rbend, ccy = ny * Rbend;
  // Starting angle on that circle (vertex is at -center offset).
  const theta0 = Math.atan2(-ccy, -ccx);
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const s = (i / steps) * (rMaxUnits / Rbend) * 1.15; // arc length / R
    const th = theta0 - sign * s;
    const ux = ccx + Rbend * Math.cos(th);
    const uy = ccy + Rbend * Math.sin(th);
    const rr = Math.hypot(ux, uy);
    // Convert unit-space point to pixels (note y flip).
    pts.push({ x: g.cx + ux * g.scale, y: g.cy - uy * g.scale, r: rr });
    if (rr >= rMaxUnits) break;
  }
  return pts;
}

// --- public API --------------------------------------------------------------

// Draw the whole event. `view` = { selectedIds:Set, labels:Map, hoveredId }.
export function render(canvas, event, view = {}) {
  const ctx = canvas.getContext('2d');
  const g = computeGeom(canvas);
  _geom = g;
  _hitRegions = [];

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawDetector(ctx, g);

  if (event) {
    for (const obj of event.objects) {
      if (obj.kind === 'jet') drawJet(ctx, g, obj, view);
      else drawTrack(ctx, g, obj, view); // muon / fakeMuon
    }
    drawMET(ctx, g, event.missingEnergy);
  }
  drawVertex(ctx, g);
}

function drawDetector(ctx, g) {
  // Filled layers, outer to inner.
  for (let i = LAYERS.length - 1; i >= 0; i--) {
    const L = LAYERS[i];
    ctx.beginPath();
    ctx.arc(g.cx, g.cy, L.r * g.scale, 0, Math.PI * 2);
    ctx.fillStyle = L.fill;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = COLORS.ringLine;
    ctx.stroke();
    // Layer label at top.
    const top = polar(g, L.r, 90);
    ctx.fillStyle = 'rgba(160,180,205,0.55)';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(L.name, top.x, top.y + 13);
  }
}

function drawVertex(ctx, g) {
  ctx.beginPath();
  ctx.arc(g.cx, g.cy, 4, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.vertex;
  ctx.fill();
}

function strokePolyline(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
}

function drawTrack(ctx, g, obj, view) {
  const isMuon = obj.reachesMuonSystem;
  const rMax = isMuon ? R_MUON : R_HCAL;
  const pts = trackPoints(g, obj.angle, obj.momentum, obj.charge, rMax);
  const selected = view.selectedIds && view.selectedIds.has(obj.id);
  const hovered = view.hoveredId === obj.id;
  const color = obj.kind === 'fakeMuon' ? COLORS.fake : COLORS.muon;

  // Glow when hovered/selected.
  ctx.save();
  if (selected) { ctx.shadowColor = COLORS.select; ctx.shadowBlur = 12; }
  else if (hovered) { ctx.shadowColor = color; ctx.shadowBlur = 8; }
  ctx.strokeStyle = selected ? COLORS.select : color;
  ctx.lineWidth = selected ? 3.2 : 2.2;
  ctx.lineCap = 'round';
  strokePolyline(ctx, pts);
  ctx.restore();

  // Muon chamber hits: short tick marks where the track reaches the muon layer.
  if (isMuon) {
    const end = pts[pts.length - 1];
    ctx.fillStyle = COLORS.hit;
    for (const rr of [R_MUON - 8, R_MUON + 4]) {
      const p = nearestAtRadius(pts, rr) || end;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Record hit region (polyline) for click testing.
  _hitRegions.push({ id: obj.id, kind: 'track', pts });

  // Draw assigned identity label, if any.
  const label = view.labels && view.labels.get(obj.id);
  if (label) drawLabel(ctx, pts[pts.length - 1], label);
}

function nearestAtRadius(pts, rUnits) {
  let best = null, bestErr = Infinity;
  for (const p of pts) {
    if (p.r == null) continue;
    const err = Math.abs(p.r - rUnits);
    if (err < bestErr) { bestErr = err; best = p; }
  }
  return best;
}

function drawJet(ctx, g, obj, view) {
  const selected = view.selectedIds && view.selectedIds.has(obj.id);
  const hovered = view.hoveredId === obj.id;
  const halfWidth = 14 + Math.min(14, (obj.nTracks || 4)); // angular half-width deg
  const n = obj.nTracks || 5;

  ctx.save();
  if (selected) { ctx.shadowColor = COLORS.select; ctx.shadowBlur = 12; }
  else if (hovered) { ctx.shadowColor = COLORS.jet; ctx.shadowBlur = 8; }

  // Spray of short tracks within the cone.
  ctx.strokeStyle = selected ? COLORS.select : COLORS.jet;
  ctx.lineWidth = 1.6;
  for (let i = 0; i < n; i++) {
    const a = obj.angle + (i / (n - 1) - 0.5) * 2 * halfWidth;
    const p0 = polar(g, 6, a);
    const p1 = polar(g, R_TRACKER + 10, a + (Math.random() - 0.5) * 3);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }

  // Broad calorimeter deposit as a filled wedge in ECAL/HCAL.
  const a0 = degToRad(obj.angle - halfWidth);
  const a1 = degToRad(obj.angle + halfWidth);
  ctx.beginPath();
  ctx.arc(g.cx, g.cy, R_TRACKER * g.scale, -a0, -a1, true);
  ctx.arc(g.cx, g.cy, R_HCAL * g.scale, -a1, -a0, false);
  ctx.closePath();
  ctx.fillStyle = selected ? 'rgba(0,255,198,0.20)' : 'rgba(255,138,61,0.22)';
  ctx.fill();
  ctx.restore();

  _hitRegions.push({
    id: obj.id, kind: 'jet',
    angle: obj.angle, halfWidth, rMin: 4, rMax: R_HCAL,
  });

  const label = view.labels && view.labels.get(obj.id);
  if (label) drawLabel(ctx, polar(g, (R_TRACKER + R_HCAL) / 2, obj.angle), label);
}

function drawMET(ctx, g, met) {
  if (!met || met.magnitude < 12) return; // only draw significant imbalance
  const len = Math.min(R_MUON, 60 + met.magnitude * 2.6);
  const tip = polar(g, len, met.angle);
  ctx.save();
  ctx.strokeStyle = COLORS.met;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(g.cx, g.cy);
  ctx.lineTo(tip.x, tip.y);
  ctx.stroke();
  ctx.setLineDash([]);
  // Arrow head.
  const a = degToRad(met.angle);
  const back = 10;
  for (const off of [150, -150]) {
    const ha = a + degToRad(off);
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(tip.x + back * Math.cos(ha), tip.y - back * Math.sin(ha));
    ctx.stroke();
  }
  // Label.
  ctx.fillStyle = COLORS.met;
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('missing pT', tip.x + 6, tip.y);
  ctx.restore();
}

function drawLabel(ctx, p, text) {
  ctx.save();
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  const w = ctx.measureText(text).width + 10;
  ctx.fillStyle = COLORS.labelBg;
  ctx.fillRect(p.x - w / 2, p.y - 18, w, 16);
  ctx.fillStyle = COLORS.select;
  ctx.fillText(text, p.x, p.y - 6);
  ctx.restore();
}

// --- hit-testing -------------------------------------------------------------

// Given a click at canvas pixel (x,y), return the id of the object hit, or null.
export function hitTest(x, y) {
  if (!_geom) return null;
  const g = _geom;
  // Tracks: distance to nearest polyline segment.
  let best = null, bestDist = 12; // px threshold
  for (const reg of _hitRegions) {
    if (reg.kind === 'track') {
      const d = distToPolyline(x, y, reg.pts);
      if (d < bestDist) { bestDist = d; best = reg.id; }
    }
  }
  if (best) return best;
  // Jets: angular sector test.
  const dx = x - g.cx, dy = -(y - g.cy);
  const rUnits = Math.hypot(dx, dy) / g.scale;
  let ang = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (ang < 0) ang += 360;
  for (const reg of _hitRegions) {
    if (reg.kind !== 'jet') continue;
    if (rUnits < reg.rMin || rUnits > reg.rMax) continue;
    let diff = Math.abs(((ang - reg.angle + 540) % 360) - 180);
    if (diff <= reg.halfWidth + 3) return reg.id;
  }
  return null;
}

function distToPolyline(px, py, pts) {
  let min = Infinity;
  for (let i = 1; i < pts.length; i++) {
    min = Math.min(min, distToSeg(px, py, pts[i - 1], pts[i]));
  }
  return min;
}

function distToSeg(px, py, a, b) {
  const vx = b.x - a.x, vy = b.y - a.y;
  const wx = px - a.x, wy = py - a.y;
  const len2 = vx * vx + vy * vy || 1;
  let t = (wx * vx + wy * vy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = a.x + t * vx, cy = a.y + t * vy;
  return Math.hypot(px - cx, py - cy);
}
