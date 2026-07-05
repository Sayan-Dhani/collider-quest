// chain.js
// Chapter 1 — Build the Beam
// An interactive walk through the CERN accelerator chain.
// The player completes a small task at each machine to progress from
// Linac4 through to the LHC.
//
// The chain module owns its render loop and step UI.

const MACHINES = [
  {
    id: 'linac4',
    label: 'Linac4',
    icon: '⚡',
    subtitle: 'Linear Accelerator (160 m)',
    energy: '160 MeV',
    desc: 'An ion source creates H⁻ ions — a proton bound to two electrons. Radio-frequency cavities accelerate them to 160 MeV along a 160-metre linear path.',
    task: 'Click the RF cavity to accelerate the H⁻ ions.',
    action: 'click',
    target: 6,
    unit: 'acceleration pulses',
  },
  {
    id: 'stripping',
    label: 'Stripping Foil',
    icon: '✂',
    subtitle: 'H⁻ → p⁺',
    energy: '160 MeV',
    desc: 'H⁻ ions pass through a 200 nm carbon foil that strips both electrons away, leaving bare protons. This two-stage method yields cleaner injection into circular accelerators.',
    task: 'Click the foil to strip the electrons and release protons.',
    action: 'click',
    target: 1,
    unit: 'strip',
  },
  {
    id: 'psb',
    label: 'PS Booster',
    icon: '◎',
    subtitle: 'Proton Synchrotron Booster (157 m)',
    energy: '2 GeV',
    desc: 'Four stacked synchrotron rings increase beam intensity. Each ring accelerates protons from 160 MeV to 2 GeV before sending them to the PS.',
    task: 'Click each of the 4 rings to focus and accelerate the beam.',
    action: 'multi',
    target: 4,
    unit: 'rings activated',
  },
  {
    id: 'ps',
    label: 'PS',
    icon: '◉',
    subtitle: 'Proton Synchrotron (628 m)',
    energy: '26 GeV',
    desc: 'The PS is CERN\'s oldest major accelerator. It shapes the continuous beam into discrete bunches and accelerates to 26 GeV. The RF system must be precisely tuned.',
    task: 'Drag the RF slider to find the sweet spot for stable bunches.',
    action: 'slider',
    target: null,
    unit: '',
  },
  {
    id: 'sps',
    label: 'SPS',
    icon: '⟳',
    subtitle: 'Super Proton Synchrotron (7 km)',
    energy: '450 GeV',
    desc: 'The second-largest machine in the chain accelerates protons to 450 GeV. It also served fixed-target experiments and helped discover the W and Z bosons.',
    task: 'Click to ramp the SPS and extract beam to the LHC.',
    action: 'click',
    target: 5,
    unit: 'ramp pulses',
  },
  {
    id: 'lhc',
    label: 'LHC',
    icon: '⟁',
    subtitle: 'Large Hadron Collider (27 km)',
    energy: '6.8 TeV',
    desc: 'Two counter-rotating beams at 6.8 TeV each, colliding at 13.6 TeV centre-of-mass. The LHC\'s 1232 superconducting dipoles are cooled to 1.9 K — colder than outer space.',
    task: 'Beams are injected and ramped. Click to declare stable beams!',
    action: 'final',
    target: 1,
    unit: '',
  },
];

const COLORS = {
  done: '#34d17f',
  current: '#4da6ff',
  future: '#26364a',
  futureText: '#54637a',
  currentText: '#dfe8f2',
  doneText: '#b8f5d5',
  pipe: '#1b2735',
  beam: '#4da6ff',
};

// --- state -------------------------------------------------------------------

let _canvas, _container, _stepIdx, _onComplete;
let _animId = null;
let _stepState = {};
let _resolved = false;

// --- public API --------------------------------------------------------------

export function startChain(canvas, container, { onComplete }) {
  _canvas = canvas;
  _container = container;
  _onComplete = onComplete || (() => {});
  _stepIdx = 0;
  _stepState = {};
  _resolved = false;
  renderStep(0);
  if (_animId) cancelAnimationFrame(_animId);
  _animId = requestAnimationFrame(frame);
}

export function stopChain() {
  if (_animId) { cancelAnimationFrame(_animId); _animId = null; }
}

export function getMachineCount() { return MACHINES.length; }

// --- animation loop ----------------------------------------------------------

function frame(now) {
  drawChain(now);
  if (document.getElementById('screen-chain')?.classList.contains('active')) {
    _animId = requestAnimationFrame(frame);
  }
}

// --- canvas drawing ----------------------------------------------------------

function drawChain(now) {
  if (!_canvas) return;
  const ctx = _canvas.getContext('2d');
  const dpr = _canvas._dpr || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = _canvas.width / dpr;
  const h = _canvas.height / dpr;

  ctx.clearRect(0, 0, w, h);

  const pad = 36;
  const n = MACHINES.length;
  const sx = pad;
  const ex = w - pad;
  const spacing = (ex - sx) / (n - 1);
  const cy = h / 2 - 6;

  // Horizontal beam pipe.
  ctx.strokeStyle = COLORS.pipe;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(sx, cy);
  ctx.lineTo(ex, cy);
  ctx.stroke();

  // Animated beam dots in completed segments.
  const phase = ((now || 0) * 0.00006) % 1;
  for (let i = 0; i < _stepIdx; i++) {
    const x1 = sx + i * spacing;
    const x2 = sx + (i + 1) * spacing;
    for (let d = 0; d < 5; d++) {
      const t = ((d / 5) + phase) % 1;
      const x = x1 + (x2 - x1) * t;
      ctx.globalAlpha = 0.15 + 0.7 * (1 - Math.abs(t - 0.5) * 2);
      ctx.fillStyle = COLORS.beam;
      ctx.beginPath();
      ctx.arc(x, cy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // Draw each machine node.
  ctx.textAlign = 'center';
  for (let i = 0; i < n; i++) {
    const x = sx + i * spacing;
    const m = MACHINES[i];
    const done = i < _stepIdx;
    const current = i === _stepIdx;
    const future = i > _stepIdx;

    // Node circle.
    const r = done ? 18 : (current ? 20 : 14);
    ctx.beginPath();
    ctx.arc(x, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = done ? COLORS.done : (current ? COLORS.current : COLORS.future);
    ctx.fill();

    if (current) {
      // Pulse ring.
      const pulse = (Math.sin((now || 0) * 0.004) + 1) * 0.5;
      ctx.strokeStyle = `rgba(77,166,255,${0.15 + 0.25 * pulse})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, cy, 26 + pulse * 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (done) {
      // Checkmark.
      ctx.strokeStyle = '#05221b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x - 5, cy);
      ctx.lineTo(x - 1.5, cy + 5);
      ctx.lineTo(x + 6, cy - 4);
      ctx.stroke();
    }

    // Label below.
    const labY = cy + r + 18;
    ctx.fillStyle = done ? COLORS.doneText : (current ? COLORS.currentText : COLORS.futureText);
    ctx.font = (current ? 'bold 12px' : '11px') + ' system-ui, sans-serif';
    ctx.fillText(m.icon + ' ' + m.label, x, labY);
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillStyle = COLORS.futureText;
    ctx.fillText(m.energy, x, labY + 14);
  }
}

// --- step rendering ----------------------------------------------------------

function renderStep(idx) {
  if (idx >= MACHINES.length) {
    _resolved = true;
    _onComplete?.();
    return;
  }
  const m = MACHINES[idx];
  _container.innerHTML = '';
  _stepState[idx] = { count: 0, sliderVal: 50, done: false };

  // Progress indicator.
  const prog = document.createElement('div');
  prog.className = 'chain-progress';
  prog.innerHTML = MACHINES.map((_, i) =>
    `<span class="chain-dot ${i < idx ? 'dot-done' : (i === idx ? 'dot-cur' : 'dot-fut')}">${i < idx ? '✓' : (i === idx ? '●' : '○')}</span>`
  ).join('');
  _container.appendChild(prog);

  // Machine heading.
  const head = document.createElement('div');
  head.className = 'chain-step-head';
  head.innerHTML = `<span class="chain-icon">${m.icon}</span><div><b>${m.label}</b><span class="muted small"> ${m.subtitle}</span></div>`;
  _container.appendChild(head);

  // Description.
  const desc = document.createElement('p');
  desc.className = 'chain-desc';
  desc.textContent = m.desc;
  _container.appendChild(desc);

  // Task prompt.
  const prompt = document.createElement('p');
  prompt.className = 'chain-task';
  prompt.textContent = '🎯 ' + m.task;
  _container.appendChild(prompt);

  // Interactive control.
  const control = document.createElement('div');
  control.className = 'chain-control';
  _container.appendChild(control);

  // Status message.
  const status = document.createElement('div');
  status.className = 'chain-status';
  _container.appendChild(status);

  switch (m.action) {
    case 'click':
      buildClickStep(idx, control, status);
      break;
    case 'multi':
      buildMultiStep(idx, control, status);
      break;
    case 'slider':
      buildSliderStep(idx, control, status);
      break;
    case 'final':
      buildFinalStep(idx, control, status);
      break;
  }
}

function buildClickStep(idx, control, status) {
  const m = MACHINES[idx];
  const btn = document.createElement('button');
  btn.className = 'btn chain-action-btn';
  btn.textContent = m.id === 'sps' ? '⟳ Ramp SPS' : '⚡ Accelerate';
  btn.addEventListener('click', () => {
    _stepState[idx].count++;
    const left = m.target - _stepState[idx].count;
    status.textContent = `${_stepState[idx].count} / ${m.target} ${m.unit}`;
    if (left <= 0) {
      status.textContent = '✓ Done!';
      btn.disabled = true;
      advance(idx);
    }
  });
  control.appendChild(btn);
  status.textContent = `0 / ${m.target} ${m.unit}`;
}

function buildMultiStep(idx, control, status) {
  const m = MACHINES[idx];
  const active = new Set();
  for (let i = 0; i < m.target; i++) {
    const ring = document.createElement('button');
    ring.className = 'btn chain-ring-btn';
    ring.textContent = `Ring ${i + 1}`;
    ring.addEventListener('click', () => {
      if (active.has(i)) return;
      active.add(i);
      ring.classList.add('chip-active');
      status.textContent = `${active.size} / ${m.target} ${m.unit}`;
      if (active.size >= m.target) {
        status.textContent = '✓ All rings active!';
        advance(idx);
      }
    });
    control.appendChild(ring);
  }
  status.textContent = `0 / ${m.target} ${m.unit}`;
}

function buildSliderStep(idx, control, status) {
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = 0;
  slider.max = 100;
  slider.value = 50;
  slider.className = 'chain-slider';
  const valLabel = document.createElement('span');
  valLabel.className = 'chain-slider-val';
  valLabel.textContent = '50%';
  const targetZone = { lo: 35, hi: 65 };
  let tuned = false;

  slider.addEventListener('input', () => {
    const v = parseInt(slider.value);
    valLabel.textContent = v + '%';
    if (!tuned && v >= targetZone.lo && v <= targetZone.hi) {
      tuned = true;
      status.textContent = '✓ RF tuned! Bunches stabilised.';
      slider.disabled = true;
      advance(idx);
    } else if (v < targetZone.lo) {
      status.textContent = '⬆ Frequency too low — increase RF.';
    } else if (v > targetZone.hi) {
      status.textContent = '⬇ Frequency too high — reduce RF.';
    }
  });

  const wrap = document.createElement('div');
  wrap.className = 'chain-slider-wrap';
  wrap.appendChild(slider);
  wrap.appendChild(valLabel);
  control.appendChild(wrap);
  status.textContent = 'Adjust the RF slider to ~35–65%.';
}

function buildFinalStep(idx, control, status) {
  const btn = document.createElement('button');
  btn.className = 'btn btn-primary btn-big chain-action-btn';
  btn.textContent = '★ Declare Stable Beams';
  btn.addEventListener('click', () => {
    btn.disabled = true;
    status.textContent = '✓ Stable beams achieved! Beam energy: 6.8 TeV per beam.';
    advance(idx);
  });
  control.appendChild(btn);
}

function advance(idx) {
  setTimeout(() => renderStep(idx + 1), 600);
}

// Re-export for main.js to check.
export { MACHINES };
