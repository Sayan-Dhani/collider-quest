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
    desc: 'Four stacked synchrotron rings increase beam intensity. The magnetic field must be precisely tuned to keep the beam focused as energy rises. Adjust the focusing for each ring.',
    task: 'Use the slider to focus the beam in each of the 4 rings.',
    action: 'focus',
    target: 4,
    unit: 'rings focused',
  },
  {
    id: 'ps',
    label: 'PS',
    icon: '◉',
    subtitle: 'Proton Synchrotron (628 m)',
    energy: '26 GeV',
    desc: 'The PS shapes the continuous beam into discrete bunches using RF cavities. The phase must be precisely tuned — too early or late and the bunches become unstable.',
    task: 'Tune the RF phase to lock the bunches into stable orbits.',
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
    desc: 'The second-largest machine accelerates protons to 450 GeV. Each ramp step disturbs the beam and it blows up; the quadrupole magnets must squeeze it back down, or it hits the vacuum-pipe walls and is lost.',
    task: 'Ramp the SPS, using the quadrupole focusing to keep the beam inside the aperture.',
    action: 'aperture',
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
    task: 'Beams injected and ramped. Click to declare stable beams!',
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
  beamWarn: '#ff8a3d',
  beamBad: '#ff6b6b',
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

  // Draw beam envelope for current step if it has aperture state.
  const curState = _stepState[_stepIdx];
  if (curState && curState.apertureFrac !== undefined) {
    const x1 = sx + _stepIdx * spacing;
    const x2 = sx + (_stepIdx + 1) * spacing;
    const envelopeH = 12 * curState.apertureFrac;
    const beamH = 4 + curState.beamSize * 8;
    const color = beamH > envelopeH ? COLORS.beamBad : (beamH > envelopeH * 0.8 ? COLORS.beamWarn : COLORS.beam);

    // Aperture envelope.
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(x1, cy - envelopeH);
    ctx.lineTo(x2, cy - envelopeH);
    ctx.moveTo(x1, cy + envelopeH);
    ctx.lineTo(x2, cy + envelopeH);
    ctx.stroke();
    ctx.setLineDash([]);

    // Beam envelope.
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.moveTo(x1, cy - beamH);
    ctx.lineTo(x2, cy - beamH);
    ctx.lineTo(x2, cy + beamH);
    ctx.lineTo(x1, cy + beamH);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Beam loss warning.
    if (beamH > envelopeH) {
      ctx.fillStyle = COLORS.beamBad;
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚠ BEAM LOSS', (x1 + x2) / 2, cy - envelopeH - 8);
    }
  }

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
  _stepState[idx] = { count: 0, sliderVal: 50, done: false, beamSize: 0.3, apertureFrac: 1.0, ringsDone: 0 };

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
    case 'focus':
      buildFocusStep(idx, control, status);
      break;
    case 'slider':
      buildSliderStep(idx, control, status);
      break;
    case 'aperture':
      buildApertureStep(idx, control, status);
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

function buildFocusStep(idx, control, status) {
  const m = MACHINES[idx];
  const state = _stepState[idx];
  let currentRing = 0;

  // Each ring wants a DIFFERENT focusing setting, away from where the slider
  // starts, and the setting only locks when the player releases the slider
  // ('change'), not while dragging through the zone ('input').
  const zones = [];
  for (let i = 0; i < m.target; i++) {
    const lo = pickZone();
    zones.push({ lo, hi: lo + 14 });
  }
  function pickZone() {
    // A 14%-wide window that never contains the reset position (50%).
    return Math.random() < 0.5 ? 8 + Math.random() * 22 : 62 + Math.random() * 22;
  }

  // Visual ring indicators.
  const ringRow = document.createElement('div');
  ringRow.className = 'chain-ring-row';
  for (let i = 0; i < m.target; i++) {
    const dot = document.createElement('span');
    dot.className = 'chain-ring-dot';
    dot.textContent = '○';
    ringRow.appendChild(dot);
  }
  control.appendChild(ringRow);

  // Focus slider.
  const sliderWrap = document.createElement('div');
  sliderWrap.className = 'chain-slider-wrap';
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = 0;
  slider.max = 100;
  slider.value = 50;
  slider.className = 'chain-slider';
  const valLabel = document.createElement('span');
  valLabel.className = 'chain-slider-val';
  valLabel.textContent = '50%';
  sliderWrap.appendChild(slider);
  sliderWrap.appendChild(valLabel);
  control.appendChild(sliderWrap);

  // Feedback text.
  const feedback = document.createElement('div');
  feedback.className = 'chain-focus-feedback';
  control.appendChild(feedback);

  const zoneMid = () => (zones[currentRing].lo + zones[currentRing].hi) / 2;
  function liveFeedback(v) {
    const z = zones[currentRing];
    state.beamSize = Math.min(1, Math.abs(v - zoneMid()) / 50);
    if (v < z.lo) feedback.textContent = '⬆ Beam too wide — increase focusing, then release.';
    else if (v > z.hi) feedback.textContent = '⬇ Beam over-focused — decrease focusing, then release.';
    else feedback.textContent = '● Focus looks good — release the slider to lock this ring.';
  }
  liveFeedback(50);
  status.textContent = `Ring 1 / ${m.target}`;

  slider.addEventListener('input', () => {
    const v = parseInt(slider.value);
    valLabel.textContent = v + '%';
    liveFeedback(v);
  });

  // Lock on release only.
  slider.addEventListener('change', () => {
    const v = parseInt(slider.value);
    const z = zones[currentRing];
    if (v < z.lo || v > z.hi) return;
    const dots = ringRow.querySelectorAll('.chain-ring-dot');
    dots[currentRing].textContent = '✓';
    dots[currentRing].classList.add('chain-ring-done');
    currentRing++;
    state.ringsDone = currentRing;

    if (currentRing >= m.target) {
      feedback.textContent = '✓ All four rings focused! Beam intensity increased.';
      feedback.classList.add('chain-focus-done');
      slider.disabled = true;
      advance(idx);
    } else {
      status.textContent = `Ring ${currentRing + 1} / ${m.target}`;
      slider.value = 50;
      valLabel.textContent = '50%';
      state.beamSize = 0.3;
      liveFeedback(50);
    }
  });
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
  // The stable RF phase is somewhere the slider does NOT start, and it locks
  // only when the player releases the slider inside the zone.
  const lo = Math.random() < 0.5 ? 10 + Math.random() * 20 : 64 + Math.random() * 20;
  const targetZone = { lo, hi: lo + 12 };
  let tuned = false;

  // Bunch visualization.
  const bunchVis = document.createElement('div');
  bunchVis.className = 'chain-bunch-vis';
  control.appendChild(bunchVis);

  function updateBunchVis(v) {
    const inZone = v >= targetZone.lo && v <= targetZone.hi;
    const mid = (targetZone.lo + targetZone.hi) / 2;
    const stability = inZone ? 1.0 : Math.max(0, 1 - Math.abs(v - mid) / 60);
    bunchVis.innerHTML = '';

    const nBunches = 8;
    for (let i = 0; i < nBunches; i++) {
      const bunch = document.createElement('span');
      bunch.className = 'chain-bunch';
      const wobble = inZone ? 0 : (1 - stability) * 6;
      bunch.style.transform = `translateX(${Math.sin(i * 0.8) * wobble}px)`;
      bunch.style.opacity = 0.3 + stability * 0.7;
      bunchVis.appendChild(bunch);
    }
  }

  slider.addEventListener('input', () => {
    const v = parseInt(slider.value);
    valLabel.textContent = v + '%';
    updateBunchVis(v);
    if (v < targetZone.lo) status.textContent = '⬆ Bunches drifting — increase the RF phase, then release.';
    else if (v > targetZone.hi) status.textContent = '⬇ Bunches drifting — reduce the RF phase, then release.';
    else status.textContent = '● Bunches look stable — release the slider to lock the phase.';
  });

  slider.addEventListener('change', () => {
    const v = parseInt(slider.value);
    if (tuned || v < targetZone.lo || v > targetZone.hi) return;
    tuned = true;
    status.textContent = '✓ RF phase locked! The beam is now split into stable bunches.';
    slider.disabled = true;
    advance(idx);
  });

  const wrap = document.createElement('div');
  wrap.className = 'chain-slider-wrap';
  wrap.appendChild(slider);
  wrap.appendChild(valLabel);
  control.appendChild(wrap);
  status.textContent = 'Find the stable RF phase — watch the bunches settle, then release.';
  updateBunchVis(50);
}

function buildApertureStep(idx, control, status) {
  // The vacuum-pipe aperture is FIXED (dashed lines on the beam-pipe canvas).
  // Each ramp pulse blows the beam up; the quadrupole-focusing slider squeezes
  // it back. Ramping while the beam touches the walls is refused — beam loss.
  const m = MACHINES[idx];
  const state = _stepState[idx];
  state.apertureFrac = 0.75;   // fixed pipe aperture
  state.blowup = 0.35;         // grows with each ramp pulse
  state.focus = 30;            // player-controlled squeeze (0-100)
  const beamSize = () => Math.max(0.08, state.blowup * (1 - state.focus / 130));

  // Quadrupole focusing slider.
  const sliderWrap = document.createElement('div');
  sliderWrap.className = 'chain-slider-wrap';
  const sliderLabel = document.createElement('span');
  sliderLabel.className = 'chain-slider-val';
  sliderLabel.textContent = 'Quadrupole focusing:';
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = 0;
  slider.max = 100;
  slider.value = state.focus;
  slider.className = 'chain-slider';
  const valLabel = document.createElement('span');
  valLabel.className = 'chain-slider-val';
  valLabel.textContent = state.focus + '%';
  sliderWrap.appendChild(sliderLabel);
  sliderWrap.appendChild(slider);
  sliderWrap.appendChild(valLabel);
  control.appendChild(sliderWrap);

  // Ramp button.
  const btn = document.createElement('button');
  btn.className = 'btn chain-action-btn';
  btn.textContent = '⟳ Ramp SPS';
  control.appendChild(btn);

  // Beam status indicator.
  const beamStatus = document.createElement('div');
  beamStatus.className = 'chain-beam-status';
  control.appendChild(beamStatus);

  function updateBeamStatus() {
    state.beamSize = beamSize();
    const beamH = 4 + state.beamSize * 8;
    const envelopeH = 12 * state.apertureFrac;
    if (beamH > envelopeH) {
      beamStatus.textContent = '⚠ BEAM TOUCHING THE WALLS — increase the quadrupole focusing!';
      beamStatus.className = 'chain-beam-status chain-beam-bad';
    } else if (beamH > envelopeH * 0.8) {
      beamStatus.textContent = '⚡ Beam close to the aperture — more focusing would be safer.';
      beamStatus.className = 'chain-beam-status chain-beam-warn';
    } else {
      beamStatus.textContent = '✓ Beam well inside the aperture.';
      beamStatus.className = 'chain-beam-status chain-beam-good';
    }
  }

  slider.addEventListener('input', () => {
    state.focus = parseInt(slider.value);
    valLabel.textContent = slider.value + '%';
    updateBeamStatus();
  });

  btn.addEventListener('click', () => {
    if (4 + beamSize() * 8 > 12 * state.apertureFrac) {
      status.textContent = '⚠ Cannot ramp — the beam is scraping the walls. Squeeze it first.';
      return;
    }
    state.count++;
    state.blowup = Math.min(1.3, state.blowup + 0.18); // ramp disturbs the beam
    updateBeamStatus();
    const left = m.target - state.count;
    status.textContent = `${state.count} / ${m.target} ${m.unit}`;
    if (left <= 0) {
      status.textContent = '✓ 450 GeV reached — beam extracted and injected into the LHC.';
      btn.disabled = true;
      slider.disabled = true;
      advance(idx);
    }
  });

  updateBeamStatus();
  status.textContent = `0 / ${m.target} ${m.unit} — ramp, and keep the beam focused.`;
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
