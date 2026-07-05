// histogram.js
// The Data/MC comparison plot — the way every real collider analysis looks at
// its selection:
//   top panel   : MC prediction stacked BY PROCESS (signal on top), with a
//                 hatched prediction-uncertainty band, and DATA as black-ish
//                 points with sqrt(N) error bars.
//   ratio panel : Data / MC per bin, with the relative uncertainty band
//                 around 1. Points on the band = the simulation describes
//                 the data.

const PAD = { left: 48, right: 12, top: 18, bottom: 30 };
const RATIO_H_FRAC = 0.28; // fraction of the plot height given to the ratio
const GAP = 8;

// Consistent per-role colours: signal is always the bright blue; backgrounds
// cycle through muted, distinguishable fills.
const SIG_TOP = '#4da6ff', SIG_BOT = '#2b6fb0';
const BKG_FILLS = ['rgba(122,140,163,0.65)', 'rgba(148,122,90,0.6)', 'rgba(122,100,150,0.55)', 'rgba(96,140,124,0.55)'];
const DATA_COLOR = '#f2f6fb';
const BAND_COLOR = 'rgba(255,255,255,0.16)';
const AXIS = '#3a4c60', GRID = '#2a3a4d', TEXT = '#8aa0b8';

// stack = { procs:[{label,kind,bins[]}], total[], err[], xmin, xmax, bins }
// dataCounts = int[] (or null before any data exists)
export function renderDataMC(canvas, stack, dataCounts, observable) {
  const ctx = canvas.getContext('2d');
  const dpr = canvas._dpr || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = canvas.width / dpr, H = canvas.height / dpr;
  ctx.clearRect(0, 0, W, H);

  const { total, err, xmin, xmax, bins } = stack;
  const plotW = W - PAD.left - PAD.right;
  const ratioH = Math.round((H - PAD.top - PAD.bottom - GAP) * RATIO_H_FRAC);
  const mainH = H - PAD.top - PAD.bottom - GAP - ratioH;
  const x0 = PAD.left;
  const yMain0 = PAD.top + mainH;           // baseline of main panel
  const yRatioTop = yMain0 + GAP;
  const yRatio0 = yRatioTop + ratioH;       // baseline of ratio panel
  const bw = plotW / bins;
  const bx = (i) => x0 + i * bw;

  let maxY = 1;
  for (let i = 0; i < bins; i++) {
    maxY = Math.max(maxY, total[i] + err[i], dataCounts ? dataCounts[i] : 0);
  }
  maxY *= 1.18;
  const yOf = (v) => yMain0 - (v / maxY) * mainH;

  // --- main panel frame + gridlines ---
  ctx.strokeStyle = AXIS; ctx.lineWidth = 1;
  ctx.strokeRect(x0, PAD.top, plotW, mainH);
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'right';
  for (let g = 1; g <= 3; g++) {
    const yy = yMain0 - (g / 4) * mainH;
    ctx.strokeStyle = GRID;
    ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x0 + plotW, yy); ctx.stroke();
    ctx.fillStyle = TEXT;
    ctx.fillText(String(Math.round((g / 4) * maxY)), x0 - 5, yy + 3);
  }
  ctx.fillStyle = TEXT;
  ctx.fillText(String(Math.round(maxY)), x0 - 5, PAD.top + 4);
  // y-axis title
  ctx.save();
  ctx.translate(11, PAD.top + mainH / 2); ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('Events / bin', 0, 0);
  ctx.restore();

  // --- target line (e.g. the resonance mass) ---
  if (observable.target != null) {
    const tx = x0 + ((observable.target - xmin) / (xmax - xmin)) * plotW;
    ctx.strokeStyle = 'rgba(0,255,198,0.5)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(tx, PAD.top); ctx.lineTo(tx, yMain0); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(0,255,198,0.85)';
    ctx.textAlign = 'center';
    ctx.fillText(String(observable.target), tx, PAD.top + 11);
  }

  // --- MC stack by process ---
  const running = new Array(bins).fill(0);
  let bkgIdx = 0;
  for (const p of stack.procs) {
    const isSig = p.kind === 'signal';
    const fill = isSig ? SIG_TOP : BKG_FILLS[bkgIdx++ % BKG_FILLS.length];
    p._fill = fill; // remembered for the legend
    for (let i = 0; i < bins; i++) {
      const h = p.bins[i];
      if (h <= 0) continue;
      const yTop = yOf(running[i] + h), yBot = yOf(running[i]);
      if (isSig) {
        const grd = ctx.createLinearGradient(0, yTop, 0, yBot);
        grd.addColorStop(0, SIG_TOP); grd.addColorStop(1, SIG_BOT);
        ctx.fillStyle = grd;
      } else {
        ctx.fillStyle = fill;
      }
      ctx.fillRect(bx(i) + 0.5, yTop, bw - 1, yBot - yTop);
    }
    for (let i = 0; i < bins; i++) running[i] += p.bins[i];
  }

  // --- prediction uncertainty band on the stack top ---
  ctx.fillStyle = BAND_COLOR;
  for (let i = 0; i < bins; i++) {
    if (total[i] <= 0) continue;
    const yUp = yOf(total[i] + err[i]), yDn = yOf(Math.max(0, total[i] - err[i]));
    ctx.fillRect(bx(i) + 0.5, yUp, bw - 1, Math.max(1, yDn - yUp));
  }

  // --- data points with sqrt(N) bars ---
  if (dataCounts) {
    ctx.strokeStyle = DATA_COLOR; ctx.fillStyle = DATA_COLOR; ctx.lineWidth = 1.4;
    for (let i = 0; i < bins; i++) {
      const n = dataCounts[i];
      if (n <= 0) continue;
      const cx = bx(i) + bw / 2;
      const y = yOf(n), eN = Math.sqrt(n);
      ctx.beginPath(); ctx.moveTo(cx, yOf(n + eN)); ctx.lineTo(cx, yOf(Math.max(0, n - eN))); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, y, 2.4, 0, Math.PI * 2); ctx.fill();
    }
  }

  // --- ratio panel: Data / MC ---
  ctx.strokeStyle = AXIS;
  ctx.strokeRect(x0, yRatioTop, plotW, ratioH);
  const RMIN = 0.5, RMAX = 1.5;
  const yR = (r) => yRatio0 - ((Math.min(RMAX, Math.max(RMIN, r)) - RMIN) / (RMAX - RMIN)) * ratioH;
  // uncertainty band around 1
  ctx.fillStyle = BAND_COLOR;
  for (let i = 0; i < bins; i++) {
    if (total[i] <= 0) continue;
    const rel = err[i] / total[i];
    const yUp = yR(1 + rel), yDn = yR(1 - rel);
    ctx.fillRect(bx(i) + 0.5, yUp, bw - 1, Math.max(1, yDn - yUp));
  }
  // line at 1
  ctx.strokeStyle = 'rgba(0,255,198,0.45)';
  ctx.beginPath(); ctx.moveTo(x0, yR(1)); ctx.lineTo(x0 + plotW, yR(1)); ctx.stroke();
  // ratio labels
  ctx.fillStyle = TEXT; ctx.textAlign = 'right';
  ctx.fillText('1.5', x0 - 5, yR(1.5) + 4);
  ctx.fillText('1.0', x0 - 5, yR(1) + 3);
  ctx.fillText('0.5', x0 - 5, yR(0.5) + 2);
  ctx.save();
  ctx.translate(11, yRatioTop + ratioH / 2); ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('Data / MC', 0, 0);
  ctx.restore();
  // ratio points
  if (dataCounts) {
    ctx.strokeStyle = DATA_COLOR; ctx.fillStyle = DATA_COLOR; ctx.lineWidth = 1.2;
    for (let i = 0; i < bins; i++) {
      if (total[i] <= 0 || dataCounts[i] <= 0) continue;
      const r = dataCounts[i] / total[i];
      const re = Math.sqrt(dataCounts[i]) / total[i];
      const cx = bx(i) + bw / 2;
      ctx.beginPath(); ctx.moveTo(cx, yR(r + re)); ctx.lineTo(cx, yR(r - re)); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, yR(r), 2, 0, Math.PI * 2); ctx.fill();
    }
  }

  // --- x labels under the ratio panel ---
  ctx.fillStyle = TEXT; ctx.textAlign = 'center';
  const steps = 5;
  for (let s = 0; s <= steps; s++) {
    const val = xmin + (s / steps) * (xmax - xmin);
    ctx.fillText(val % 1 === 0 ? String(val) : val.toFixed(0), x0 + (s / steps) * plotW, yRatio0 + 13);
  }
  ctx.fillText(`${observable.name}${observable.unit ? ' [' + observable.unit + ']' : ''}`,
    x0 + plotW / 2, H - 3);

  // --- legend (top-left of main panel) ---
  ctx.textAlign = 'left';
  let lx = x0 + 8, ly = PAD.top + 10;
  const entry = (swatch, label) => {
    swatch(lx, ly);
    ctx.fillStyle = '#cfe0f0';
    ctx.fillText(label, lx + 14, ly + 4);
    lx += 20 + ctx.measureText(label).width + 12;
    if (lx > x0 + plotW - 90) { lx = x0 + 8; ly += 15; }
  };
  if (dataCounts) entry((x, y) => {
    ctx.fillStyle = DATA_COLOR;
    ctx.beginPath(); ctx.arc(x + 5, y, 2.6, 0, Math.PI * 2); ctx.fill();
  }, 'Data');
  for (const p of [...stack.procs].reverse()) { // signal first in the legend
    const fill = p._fill;
    entry((x, y) => { ctx.fillStyle = fill; ctx.fillRect(x, y - 5, 10, 10); },
      p.kind === 'signal' ? `${p.label} (signal)` : p.label);
  }
}
