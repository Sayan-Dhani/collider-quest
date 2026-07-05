// detector.js
// Canvas rendering of a simplified CMS transverse cross-section and every kind
// of physics object, plus pileup. Owns the screen geometry for click hit-testing.

import { degToRad } from './physics.js';

// Consistent visual language (design doc §20).
export const COLORS = {
  muon: '#4da6ff',       // blue curved track
  electron: '#5be08a',   // green track + ECAL flash
  photon: '#ffe14d',     // yellow ECAL flash, no track
  jet: '#ff8a3d',        // orange cone
  bjet: '#c98bff',       // jet + purple displaced vertex
  tau: '#ff5db1',        // narrow magenta cone
  pileup: '#54637a',     // dim soft tracks
  met: '#ffffff',        // dashed white arrow
  ringLine: '#2c3e52',
  vertex: '#ffd24d',
  hit: '#7fdfff',
  select: '#00ffc6',
  labelBg: 'rgba(0,0,0,0.7)',
};

const LAYERS = [
  { name: 'Tracker', r: 80, fill: 'rgba(40,70,110,0.10)' },
  { name: 'ECAL', r: 120, fill: 'rgba(90,80,30,0.10)' },
  { name: 'HCAL', r: 160, fill: 'rgba(90,45,25,0.10)' },
  { name: 'Muon chambers', r: 210, fill: 'rgba(40,90,120,0.08)' },
];
const R_TRACKER = 80, R_ECAL = 120, R_HCAL = 160, R_MUON = 210, MAX_R = 230;
const R_SOLENOID = 172; // the CMS superconducting solenoid, just outside HCAL

let _geom = null;
let _hitRegions = [];

// Geometry in LOGICAL pixels: canvases carry a devicePixelRatio backing store
// (`canvas._dpr`, set by main.js sizeCanvas) and the context is scaled once
// per frame, so drawing and hit-testing both stay in logical coordinates.
function computeGeom(canvas) {
  const dpr = canvas._dpr || 1;
  const w = canvas.width / dpr, h = canvas.height / dpr;
  return {
    w, h, cx: w / 2, cy: h / 2,
    scale: (Math.min(w, h) / 2 - 12) / MAX_R,
  };
}

function polar(g, rUnits, angleDeg) {
  const a = degToRad(angleDeg), r = rUnits * g.scale;
  return { x: g.cx + r * Math.cos(a), y: g.cy - r * Math.sin(a) };
}

// Circular-arc track from the vertex out to rMax. Charge sets bend direction,
// pT sets bend radius (higher pT = straighter).
function trackPoints(g, angleDeg, pt, charge, rMaxUnits) {
  const pts = [];
  const dir = degToRad(angleDeg);
  const dx = Math.cos(dir), dy = Math.sin(dir);
  const Rbend = Math.max(45, pt * 8);
  const sign = charge === '-' ? -1 : 1;
  const nx = -dy * sign, ny = dx * sign;
  const ccx = nx * Rbend, ccy = ny * Rbend;
  const theta0 = Math.atan2(-ccy, -ccx);
  const steps = 36;
  for (let i = 0; i <= steps; i++) {
    const s = (i / steps) * (rMaxUnits / Rbend) * 1.15;
    const th = theta0 - sign * s;
    const ux = ccx + Rbend * Math.cos(th), uy = ccy + Rbend * Math.sin(th);
    const rr = Math.hypot(ux, uy);
    pts.push({ x: g.cx + ux * g.scale, y: g.cy - uy * g.scale, r: rr });
    if (rr >= rMaxUnits) break;
  }
  return pts;
}

// --- public API --------------------------------------------------------------

export function render(canvas, event, view = {}) {
  const ctx = canvas.getContext('2d');
  const dpr = canvas._dpr || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const g = computeGeom(canvas);
  _geom = g; _hitRegions = [];

  ctx.clearRect(0, 0, g.w, g.h);
  drawDetector(ctx, g);

  if (event) {
    // Pileup first (behind), then hard-process objects on top.
    const objs = [...event.objects].sort(
      (a, b) => (a.fromHardProcess === b.fromHardProcess ? 0 : a.fromHardProcess ? 1 : -1));
    for (const obj of objs) drawObject(ctx, g, obj, view);
    drawMET(ctx, g, event.missingEnergy);
  }
  drawVertex(ctx, g);
}

function drawObject(ctx, g, obj, view) {
  switch (obj.kind) {
    case 'muon': return drawChargedTrack(ctx, g, obj, view, COLORS.muon, R_MUON, true);
    case 'electron': return drawElectron(ctx, g, obj, view);
    case 'photon': return drawPhoton(ctx, g, obj, view);
    case 'jet': return drawCone(ctx, g, obj, view, COLORS.jet);
    case 'bjet': return drawCone(ctx, g, obj, view, COLORS.bjet, true);
    case 'tau': return drawCone(ctx, g, obj, view, COLORS.tau, false, true);
    case 'pileupTrack': return drawPileup(ctx, g, obj, view);
    default: return drawChargedTrack(ctx, g, obj, view, COLORS.muon, R_HCAL, false);
  }
}

function drawDetector(ctx, g) {
  for (let i = LAYERS.length - 1; i >= 0; i--) {
    const L = LAYERS[i];
    ctx.beginPath();
    ctx.arc(g.cx, g.cy, L.r * g.scale, 0, Math.PI * 2);
    ctx.fillStyle = L.fill; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = COLORS.ringLine; ctx.stroke();
    const top = polar(g, L.r, 90);
    ctx.fillStyle = 'rgba(160,180,205,0.6)';
    ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(L.name, top.x, top.y + 13);
  }
  // The superconducting solenoid — the "S" in CMS, and the reason every
  // charged track in here curves. Drawn as a distinct thick ring.
  ctx.beginPath();
  ctx.arc(g.cx, g.cy, R_SOLENOID * g.scale, 0, Math.PI * 2);
  ctx.lineWidth = 4.5;
  ctx.strokeStyle = 'rgba(150,170,200,0.45)';
  ctx.stroke();
  const bot = polar(g, R_SOLENOID, 270);
  ctx.fillStyle = 'rgba(170,190,215,0.75)';
  ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('Solenoid 3.8 T — bends charged tracks', bot.x, bot.y + 14);
}

function drawVertex(ctx, g) {
  ctx.beginPath(); ctx.arc(g.cx, g.cy, 4, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.vertex; ctx.fill();
}

function strokePolyline(ctx, pts) {
  ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
}

function glow(ctx, view, obj, color) {
  const selected = view.selectedIds && view.selectedIds.has(obj.id);
  const hovered = view.hoveredId === obj.id;
  if (selected) { ctx.shadowColor = COLORS.select; ctx.shadowBlur = 12; }
  else if (hovered) { ctx.shadowColor = color; ctx.shadowBlur = 8; }
  return selected;
}

function drawChargedTrack(ctx, g, obj, view, color, rMax, muonHits) {
  const pts = trackPoints(g, obj.angle, obj.pt, obj.charge, rMax);
  ctx.save();
  const selected = glow(ctx, view, obj, color);
  ctx.strokeStyle = selected ? COLORS.select : color;
  ctx.lineWidth = selected ? 3.4 : 2.3; ctx.lineCap = 'round';
  strokePolyline(ctx, pts);
  ctx.restore();

  if (muonHits) {
    // Hit segments in successive muon stations (not a single dot): the
    // classic outer-chamber signature of a muon.
    ctx.save();
    ctx.strokeStyle = COLORS.hit; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (const rr of [180, 192, 204]) {
      const seg = segmentAt(pts, rr, 5);
      if (!seg) continue;
      ctx.beginPath(); ctx.moveTo(seg.x0, seg.y0); ctx.lineTo(seg.x1, seg.y1); ctx.stroke();
    }
    ctx.restore();
  }
  _hitRegions.push({ id: obj.id, kind: 'track', pts });
  labelIf(ctx, view, obj, pts[pts.length - 1]);
}

// Short segment of the polyline centred at the point closest to radius rUnits,
// oriented along the local track direction (for muon-chamber hits).
function segmentAt(pts, rUnits, halfLen) {
  let bi = -1, be = Infinity;
  for (let i = 0; i < pts.length; i++) {
    if (pts[i].r == null) continue;
    const e = Math.abs(pts[i].r - rUnits);
    if (e < be) { be = e; bi = i; }
  }
  if (bi < 0 || be > 10) return null;
  const a = pts[Math.max(0, bi - 1)], b = pts[Math.min(pts.length - 1, bi + 1)];
  let dx = b.x - a.x, dy = b.y - a.y;
  const L = Math.hypot(dx, dy) || 1;
  dx /= L; dy /= L;
  const p = pts[bi];
  return { x0: p.x - dx * halfLen, y0: p.y - dy * halfLen,
           x1: p.x + dx * halfLen, y1: p.y + dy * halfLen };
}

function drawElectron(ctx, g, obj, view) {
  const pts = trackPoints(g, obj.angle, obj.pt, obj.charge, R_ECAL);
  ctx.save();
  const selected = glow(ctx, view, obj, COLORS.electron);
  ctx.strokeStyle = selected ? COLORS.select : COLORS.electron;
  ctx.lineWidth = selected ? 3.4 : 2.3; ctx.lineCap = 'round';
  strokePolyline(ctx, pts);
  ctx.restore();
  ecalBlock(ctx, g, obj.angle, COLORS.electron, selected, obj.ecal);
  _hitRegions.push({ id: obj.id, kind: 'track', pts });
  labelIf(ctx, view, obj, polar(g, R_ECAL + 6, obj.angle));
}

function drawPhoton(ctx, g, obj, view) {
  ctx.save();
  const selected = glow(ctx, view, obj, COLORS.photon);
  ecalBlock(ctx, g, obj.angle, selected ? COLORS.select : COLORS.photon, selected, obj.ecal);
  ctx.restore();
  // Photon: neutral, no track. Register a small sector at ECAL as its hit region.
  _hitRegions.push({ id: obj.id, kind: 'jet', angle: obj.angle, halfWidth: 9, rMin: R_TRACKER, rMax: R_ECAL + 14 });
  labelIf(ctx, view, obj, polar(g, R_ECAL + 6, obj.angle));
}

// ECAL deposit wedge whose radial depth scales with the deposited energy —
// a 100 GeV photon visibly outgrows a 30 GeV one.
function ecalBlock(ctx, g, angle, color, selected, energy = 40) {
  const frac = Math.max(0.35, Math.min(1, energy / 90));
  const rOut = R_TRACKER + (R_ECAL + 8 - R_TRACKER) * frac;
  const a0 = degToRad(angle - 6), a1 = degToRad(angle + 6);
  ctx.beginPath();
  ctx.arc(g.cx, g.cy, R_TRACKER * g.scale, -a0, -a1, true);
  ctx.arc(g.cx, g.cy, rOut * g.scale, -a1, -a0, false);
  ctx.closePath();
  ctx.fillStyle = color; ctx.globalAlpha = selected ? 0.85 : 0.7; ctx.fill();
  ctx.globalAlpha = 1;
}

function drawCone(ctx, g, obj, view, color, displaced = false, narrow = false) {
  const halfWidth = narrow ? 6 : 12 + Math.min(12, obj.nprong || 4);

  // Precompute prong geometry ONCE per object: jets are sprays of charged
  // hadrons, so the prongs are low-pT curved tracks — and caching them stops
  // the per-frame re-randomised shimmer the old straight lines had.
  if (!obj._prongs) {
    const n = obj.nprong || 5;
    obj._prongs = [];
    for (let i = 0; i < n; i++) {
      obj._prongs.push({
        angle: obj.angle + (n === 1 ? 0 : (i / (n - 1) - 0.5) * 2 * halfWidth * 0.85)
          + (Math.random() - 0.5) * 2,
        pt: 3 + Math.random() * 9,
        charge: Math.random() < 0.5 ? '+' : '-',
        vtx: displaced ? 14 + Math.random() * 8 : 0, // b-jet prongs start displaced
      });
    }
  }
  ctx.save();
  const selected = glow(ctx, view, obj, color);
  ctx.strokeStyle = selected ? COLORS.select : color;
  ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  for (const pr of obj._prongs) {
    const pts = trackPoints(g, pr.angle, pr.pt, pr.charge, R_TRACKER + 8);
    strokePolyline(ctx, pts);
  }
  // Calorimeter wedge whose depth scales with the hadronic energy.
  const frac = Math.max(0.45, Math.min(1, (obj.hcal || 30) / 80));
  const rOut = R_TRACKER + (R_HCAL - R_TRACKER) * frac;
  const a0 = degToRad(obj.angle - halfWidth), a1 = degToRad(obj.angle + halfWidth);
  ctx.beginPath();
  ctx.arc(g.cx, g.cy, R_TRACKER * g.scale, -a0, -a1, true);
  ctx.arc(g.cx, g.cy, rOut * g.scale, -a1, -a0, false);
  ctx.closePath();
  ctx.fillStyle = selected ? 'rgba(0,255,198,0.20)' : hexA(color, 0.20);
  ctx.fill();
  ctx.restore();

  // b-jet: purple displaced secondary vertex just off the beamline (cached
  // positions — no flicker).
  if (displaced) {
    const v = polar(g, 16, obj.angle);
    ctx.fillStyle = COLORS.bjet;
    for (const pr of obj._prongs.slice(0, 3)) {
      const p = polar(g, pr.vtx || 16, obj.angle + (pr.angle - obj.angle) * 0.4);
      ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = hexA(COLORS.bjet, 0.6); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(v.x, v.y, 6, 0, Math.PI * 2); ctx.stroke();
  }

  _hitRegions.push({ id: obj.id, kind: 'jet', angle: obj.angle, halfWidth, rMin: 6, rMax: R_HCAL });
  labelIf(ctx, view, obj, polar(g, (R_TRACKER + R_HCAL) / 2, obj.angle));
}

function drawPileup(ctx, g, obj, view) {
  const pts = trackPoints(g, obj.angle, obj.pt, obj.charge, R_TRACKER * 0.9);
  ctx.save();
  const selected = glow(ctx, view, obj, COLORS.pileup);
  ctx.strokeStyle = selected ? COLORS.select : COLORS.pileup;
  ctx.globalAlpha = selected ? 1 : 0.55;
  ctx.lineWidth = selected ? 2.4 : 1.2; ctx.lineCap = 'round';
  strokePolyline(ctx, pts);
  ctx.restore();
  _hitRegions.push({ id: obj.id, kind: 'track', pts });
  labelIf(ctx, view, obj, pts[pts.length - 1]);
}

function drawMET(ctx, g, met) {
  if (!met || met.magnitude < 15) return;
  const len = Math.min(R_MUON, 55 + met.magnitude * 2.4);
  const tip = polar(g, len, met.angle);
  ctx.save();
  ctx.strokeStyle = COLORS.met; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
  ctx.beginPath(); ctx.moveTo(g.cx, g.cy); ctx.lineTo(tip.x, tip.y); ctx.stroke();
  ctx.setLineDash([]);
  const a = degToRad(met.angle), back = 10;
  for (const off of [150, -150]) {
    const ha = a + degToRad(off);
    ctx.beginPath(); ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(tip.x + back * Math.cos(ha), tip.y - back * Math.sin(ha)); ctx.stroke();
  }
  ctx.fillStyle = COLORS.met; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('missing pT', tip.x + 6, tip.y);
  ctx.restore();
}

function labelIf(ctx, view, obj, p) {
  const label = view.labels && view.labels.get(obj.id);
  if (!label) return;
  ctx.save();
  ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'center';
  const w = ctx.measureText(label).width + 10;
  ctx.fillStyle = COLORS.labelBg; ctx.fillRect(p.x - w / 2, p.y - 18, w, 16);
  ctx.fillStyle = COLORS.select; ctx.fillText(label, p.x, p.y - 6);
  ctx.restore();
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// --- hit-testing -------------------------------------------------------------

export function hitTest(x, y) {
  if (!_geom) return null;
  const g = _geom;
  let best = null, bestDist = 12;
  for (const reg of _hitRegions) {
    if (reg.kind === 'track') {
      const d = distToPolyline(x, y, reg.pts);
      if (d < bestDist) { bestDist = d; best = reg.id; }
    }
  }
  if (best) return best;
  const dx = x - g.cx, dy = -(y - g.cy);
  const rUnits = Math.hypot(dx, dy) / g.scale;
  let ang = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (ang < 0) ang += 360;
  for (const reg of _hitRegions) {
    if (reg.kind !== 'jet') continue;
    if (rUnits < reg.rMin || rUnits > reg.rMax) continue;
    const diff = Math.abs(((ang - reg.angle + 540) % 360) - 180);
    if (diff <= reg.halfWidth + 3) return reg.id;
  }
  return null;
}

function distToPolyline(px, py, pts) {
  let min = Infinity;
  for (let i = 1; i < pts.length; i++) min = Math.min(min, distToSeg(px, py, pts[i - 1], pts[i]));
  return min;
}
function distToSeg(px, py, a, b) {
  const vx = b.x - a.x, vy = b.y - a.y, wx = px - a.x, wy = py - a.y;
  const len2 = vx * vx + vy * vy || 1;
  let t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2));
  return Math.hypot(px - (a.x + t * vx), py - (a.y + t * vy));
}
