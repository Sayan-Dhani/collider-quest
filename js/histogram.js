// histogram.js
// Stacked signal + background histogram of a mission's observable. As the player
// tightens cuts, the grey background shrinks and the blue signal peak emerges.

const PAD = { left: 46, right: 12, top: 16, bottom: 34 };

// data = { sig:[], bkg:[], xmin, xmax, bins }; observable = { name, unit, target }
export function renderStacked(canvas, data, observable) {
  const ctx = canvas.getContext('2d');
  const dpr = canvas._dpr || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = canvas.width / dpr, H = canvas.height / dpr;
  ctx.clearRect(0, 0, W, H);

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x0 = PAD.left, y0 = H - PAD.bottom;
  const { sig, bkg, xmin, xmax, bins } = data;

  let maxY = 0;
  for (let i = 0; i < bins; i++) maxY = Math.max(maxY, sig[i] + bkg[i]);
  maxY = Math.max(1, maxY * 1.15);

  // Axes.
  ctx.strokeStyle = '#3a4c60';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0, PAD.top); ctx.lineTo(x0, y0); ctx.lineTo(W - PAD.right, y0);
  ctx.stroke();

  // Y gridlines + labels.
  ctx.fillStyle = '#8aa0b8';
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'right';
  for (let g = 0; g <= 4; g++) {
    const yy = y0 - (g / 4) * plotH;
    const val = Math.round((g / 4) * maxY);
    ctx.fillStyle = '#2a3a4d';
    ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(W - PAD.right, yy); ctx.stroke();
    ctx.fillStyle = '#8aa0b8';
    ctx.fillText(String(val), x0 - 5, yy + 3);
  }

  // Target line (e.g. the resonance mass).
  if (observable.target != null) {
    const tx = x0 + ((observable.target - xmin) / (xmax - xmin)) * plotW;
    ctx.strokeStyle = 'rgba(0,255,198,0.5)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(tx, PAD.top); ctx.lineTo(tx, y0); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(0,255,198,0.85)';
    ctx.textAlign = 'center';
    ctx.fillText(`${observable.target}`, tx, PAD.top + 9);
  }

  // Bars: background (grey) then signal stacked on top (blue).
  const bw = plotW / bins;
  for (let i = 0; i < bins; i++) {
    const bx = x0 + i * bw;
    const bH = (bkg[i] / maxY) * plotH;
    const sH = (sig[i] / maxY) * plotH;
    if (bH > 0) {
      ctx.fillStyle = 'rgba(120,140,165,0.55)';
      ctx.fillRect(bx + 0.5, y0 - bH, bw - 1, bH);
    }
    if (sH > 0) {
      const grd = ctx.createLinearGradient(0, y0 - bH - sH, 0, y0 - bH);
      grd.addColorStop(0, '#4da6ff');
      grd.addColorStop(1, '#2b6fb0');
      ctx.fillStyle = grd;
      ctx.fillRect(bx + 0.5, y0 - bH - sH, bw - 1, sH);
    }
  }

  // X labels.
  ctx.fillStyle = '#8aa0b8';
  ctx.textAlign = 'center';
  const steps = 5;
  for (let s = 0; s <= steps; s++) {
    const val = xmin + (s / steps) * (xmax - xmin);
    const tx = x0 + (s / steps) * plotW;
    ctx.fillText(val % 1 === 0 ? String(val) : val.toFixed(0), tx, y0 + 14);
  }
  ctx.fillText(`${observable.name}${observable.unit ? ' [' + observable.unit + ']' : ''}`,
    x0 + plotW / 2, H - 4);

  // Legend.
  ctx.textAlign = 'left';
  const lx = x0 + 8, ly = PAD.top + 8;
  ctx.fillStyle = '#4da6ff'; ctx.fillRect(lx, ly - 8, 10, 10);
  ctx.fillStyle = '#cfe0f0'; ctx.fillText('signal', lx + 14, ly);
  ctx.fillStyle = 'rgba(120,140,165,0.8)'; ctx.fillRect(lx + 64, ly - 8, 10, 10);
  ctx.fillStyle = '#cfe0f0'; ctx.fillText('background', lx + 78, ly);
}
