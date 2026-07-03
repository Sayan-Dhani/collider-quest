// histogram.js
// Live dimuon invariant-mass histogram drawn on a canvas. Updates after each
// accepted Z candidate; a peak near the Z mass (91.2 GeV) emerges over a run.

import { Z_MASS } from './physics.js';

const X_MIN = 60;   // GeV
const X_MAX = 120;  // GeV
const N_BINS = 30;
const BIN_W = (X_MAX - X_MIN) / N_BINS;

const PAD = { left: 40, right: 12, top: 14, bottom: 30 };

function binIndex(mass) {
  if (mass < X_MIN || mass >= X_MAX) return -1;
  return Math.floor((mass - X_MIN) / BIN_W);
}

export function render(canvas, values) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x0 = PAD.left, y0 = H - PAD.bottom;

  // Bin the data.
  const bins = new Array(N_BINS).fill(0);
  for (const v of values) {
    const b = binIndex(v);
    if (b >= 0) bins[b]++;
  }
  const maxCount = Math.max(1, ...bins);

  // Axes.
  ctx.strokeStyle = '#3a4c60';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0, PAD.top);
  ctx.lineTo(x0, y0);
  ctx.lineTo(W - PAD.right, y0);
  ctx.stroke();

  // Z-mass reference line.
  const zx = x0 + ((Z_MASS - X_MIN) / (X_MAX - X_MIN)) * plotW;
  ctx.strokeStyle = 'rgba(0,255,198,0.45)';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(zx, PAD.top);
  ctx.lineTo(zx, y0);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(0,255,198,0.8)';
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Z', zx, PAD.top + 9);

  // Bars.
  const bw = plotW / N_BINS;
  for (let i = 0; i < N_BINS; i++) {
    if (bins[i] === 0) continue;
    const h = (bins[i] / maxCount) * plotH;
    const bx = x0 + i * bw;
    const grd = ctx.createLinearGradient(0, y0 - h, 0, y0);
    grd.addColorStop(0, '#4da6ff');
    grd.addColorStop(1, '#2b6fb0');
    ctx.fillStyle = grd;
    ctx.fillRect(bx + 1, y0 - h, bw - 2, h);
  }

  // X axis ticks/labels.
  ctx.fillStyle = '#8aa0b8';
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (let m = X_MIN; m <= X_MAX; m += 15) {
    const tx = x0 + ((m - X_MIN) / (X_MAX - X_MIN)) * plotW;
    ctx.fillText(String(m), tx, y0 + 14);
  }
  ctx.fillText('Dimuon mass [GeV]', x0 + plotW / 2, H - 4);

  // Y label (count).
  ctx.save();
  ctx.translate(11, PAD.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Events', 0, 0);
  ctx.restore();
}
