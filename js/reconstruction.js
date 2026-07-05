// reconstruction.js
// Chapter 4 — From Hits to Physics Objects
// Teaches how raw detector signals (hits, clusters) are assembled into
// reconstructed physics objects. Three modes: beginner, intermediate, advanced.

import { randRange, randInt, pick, gauss, degToRad } from './physics.js';

const TASKS = [
  {
    id: 'track-fitting',
    title: 'Track Fitting',
    icon: '◎',
    desc: 'Several charged particles passed through the tracker, leaving hit clusters in the silicon layers. Each track is a set of hits that lie on a helical path. Your job: group the hits into tracks.',
  },
  {
    id: 'ecal-clustering',
    title: 'ECAL Clustering',
    icon: '◈',
    desc: 'Photons and electrons shower in the electromagnetic calorimeter. The energy is spread across neighbouring crystals. Group adjacent high-energy crystals into clusters and identify the particle.',
  },
  {
    id: 'particle-flow',
    title: 'Particle Flow',
    icon: '⇶',
    desc: 'Combine information from all subdetectors: tracks from the tracker, clusters from ECAL and HCAL, hits from the muon system. Link them together to identify each particle.',
  },
];

let _container, _onComplete, _mode = 'beginner';
let _taskIdx = 0;

const MODE_HINTS = { beginner: 2, intermediate: 1, advanced: 0 };

// --- public API ---------------------------------------------------------------

export function startReconstruction(container, { onComplete, mode = 'beginner' }) {
  _container = container;
  _onComplete = onComplete || (() => {});
  _mode = mode;
  _taskIdx = 0;
  renderModeSelect();
}

// --- mode selection -----------------------------------------------------------

function renderModeSelect() {
  _container.innerHTML = `
    <h2>Choose Your Difficulty</h2>
    <p class="muted">Reconstruction difficulty determines how many hints you get when building physics objects from raw detector signals.</p>
    <div class="rec-mode-grid">
      <button class="panel rec-mode-card" data-mode="beginner">
        <h3>Beginner</h3>
        <p class="muted small">Full hints: track colours match, hit sizes indicate energy, labels guide you.</p>
      </button>
      <button class="panel rec-mode-card" data-mode="intermediate">
        <h3>Intermediate</h3>
        <p class="muted small">Partial hints: no colour coding, but hit order is preserved.</p>
      </button>
      <button class="panel rec-mode-card" data-mode="advanced">
        <h3>Advanced</h3>
        <p class="muted small">No hints: raw hits only, with pileup. Reconstruct like a real physicist.</p>
      </button>
    </div>`;
  _container.querySelectorAll('.rec-mode-card').forEach(c => {
    c.addEventListener('click', () => {
      _mode = c.dataset.mode;
      _taskIdx = 0;
      startTasks();
    });
  });
}

// --- task runner --------------------------------------------------------------

function startTasks() {
  renderTask(_taskIdx);
}

function getHintLevel() {
  return MODE_HINTS[_mode] || 0;
}

function renderTask(idx) {
  if (idx >= TASKS.length) {
    _container.innerHTML = `
      <h2>Reconstruction Complete</h2>
      <p class="muted">You have learned how raw detector hits become physics objects. In the Event Explorer you will see fully reconstructed objects, but now you know what went into them.</p>
      <div class="brief-actions" style="margin-top:16px">
        <button class="btn btn-primary btn-big" id="rec-done">Continue →</button>
      </div>`;
    document.getElementById('rec-done')?.addEventListener('click', () => _onComplete?.());
    return;
  }

  const task = TASKS[idx];
  const hintLv = getHintLevel();
  _container.innerHTML = `
    <h2>${task.icon} ${task.title}</h2>
    <div class="chain-progress">${TASKS.map((t, i) =>
      `<span class="chain-dot ${i < idx ? 'dot-done' : (i === idx ? 'dot-cur' : 'dot-fut')}">${i < idx ? '✓' : (i === idx ? '●' : '○')}</span>`
    ).join('')}</div>
    <p class="muted">${task.desc}</p>
    <p class="muted small">Mode: <b>${_mode}</b> · Hints: ${hintLv === 2 ? 'Full' : hintLv === 1 ? 'Partial' : 'None'}</p>
    <div id="rec-game"></div>`;

  const gameFns = [renderTrackFit, renderECALClustering, renderParticleFlow];
  gameFns[idx](_container.querySelector('#rec-game'), hintLv, () => {
    _taskIdx++;
    renderTask(_taskIdx);
  });
}

// --- task 1: track fitting ----------------------------------------------------

function renderTrackFit(area, hintLv, onDone) {
  // Generate 2-3 tracks with hits + some noise hits.
  const nTracks = 2;
  const tracks = [];
  const allHits = [];
  const colors = ['#4da6ff', '#ff8a3d', '#5be08a'];
  for (let t = 0; t < nTracks; t++) {
    const pt = randRange(15, 50);
    const charge = pick(['+', '-']);
    const startAngle = randRange(0, 360);
    const hits = [];
    for (let i = 0; i < 5; i++) {
      const r = 15 + (i / 4) * 65;
      const bend = charge === '+' ? 1 : -1;
      const phiOff = bend * (0.12 * (1 - 10 / (pt + 10))) * (i / 5);
      const phi = degToRad(startAngle) + phiOff + gauss(0, 0.015);
      hits.push({ x: 90 + r * Math.cos(phi), y: 90 - r * Math.sin(phi), track: t, idx: i, selected: false });
    }
    tracks.push(hits);
    allHits.push(...hits);
  }

  // Noise hits.
  for (let i = 0; i < 3; i++) {
    allHits.push({ x: randRange(20, 160), y: randRange(20, 160), track: -1, idx: -1, selected: false, noise: true });
  }

  if (hintLv >= 2) {
    // Beginner: assign colors.
    for (const h of allHits) {
      if (!h.noise) h.color = colors[h.track];
      else h.color = '#54637a';
    }
  } else {
    for (const h of allHits) h.color = '#8aa0b8';
  }

  let trackAssignments = {};
  const c = document.createElement('canvas');
  c.width = 180; c.height = 180;
  c.style.cssText = 'width:180px;height:180px;border-radius:8px;background:#0e1620;border:1px solid #26364a;margin:8px auto;display:block';

  const ctx = c.getContext('2d');

  function draw() {
    ctx.clearRect(0, 0, 180, 180);
    // Draw center.
    ctx.fillStyle = '#26364a';
    ctx.beginPath(); ctx.arc(90, 90, 4, 0, Math.PI * 2); ctx.fill();

    for (const h of allHits) {
      ctx.beginPath(); ctx.arc(h.x, h.y, h.selected ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = h.selected ? (h.noise ? '#ff6b6b' : h.color) : h.color;
      ctx.fill();
      if (h.selected) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }
  draw();
  area.appendChild(c);

  let selectedTrack = 0;
  const controls = document.createElement('div');
  controls.style.cssText = 'display:flex;gap:8px;align-items:center;justify-content:center;margin:6px 0';
  controls.innerHTML = `
    <span class="muted small">Assign to:</span>
    <button class="btn chip rec-tab" data-t="0">Track A</button>
    <button class="btn chip rec-tab" data-t="1">Track B</button>
    <span id="rec-count" class="muted small">0 hits assigned</span>
  `;
  controls.querySelectorAll('.rec-tab').forEach(b => {
    if (parseInt(b.dataset.t) === 0) b.classList.add('chip-active');
    b.addEventListener('click', () => {
      controls.querySelectorAll('.rec-tab').forEach(bb => bb.classList.remove('chip-active'));
      b.classList.add('chip-active');
      selectedTrack = parseInt(b.dataset.t);
    });
  });
  area.appendChild(controls);

  let assignedCount = 0;
  c.addEventListener('click', (e) => {
    const rect = c.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (180 / rect.width);
    const my = (e.clientY - rect.top) * (180 / rect.height);
    const hit = allHits.find(h => !h.noise && !h.selected && Math.hypot(mx - h.x, my - h.y) < 8);
    if (!hit) return;
    hit.selected = true;
    trackAssignments[hit.track] = (trackAssignments[hit.track] || 0) + 1;
    assignedCount++;
    document.getElementById('rec-count').textContent = `${assignedCount} / 10 hits assigned`;
    draw();
    if (assignedCount >= 10) {
      // Check if correct.
      const correct = trackAssignments[0] === 5 && trackAssignments[1] === 5;
      const fb = document.createElement('div');
      fb.className = `feedback feedback-${correct ? 'good' : 'bad'}`;
      fb.textContent = correct
        ? '✓ Correct! Each track has 5 hits in a helical pattern.'
        : '✗ Some hits were mis-assigned. Each track follows a smooth curve.';
      area.appendChild(fb);
      controls.querySelectorAll('button').forEach(b => b.disabled = true);
      setTimeout(onDone, 1200);
    }
  });

  // Hint.
  if (hintLv >= 1) {
    const hint = document.createElement('p');
    hint.className = 'muted small';
    hint.textContent = hintLv >= 2 ? '💡 Hits of the same colour belong to the same track.' : '💡 Hits that form a smooth curve belong to the same track.';
    area.appendChild(hint);
  }
}

// --- task 2: ECAL clustering --------------------------------------------------

function renderECALClustering(area, hintLv, onDone) {
  const n = 3;
  const objects = [];
  for (let i = 0; i < n; i++) {
    const isElectron = Math.random() < 0.5;
    const nCrystals = isElectron ? randInt(3, 5) : randInt(4, 7);
    const totalE = randRange(20, 60);
    const crystals = [];
    const cx = randRange(40, 140);
    const cy = randRange(40, 140);

    // Generate crystal positions around the cluster center.
    for (let j = 0; j < nCrystals; j++) {
      const angle = (j / nCrystals) * Math.PI * 2 + gauss(0, 0.3);
      const dist = randRange(4, 14);
      const energy = totalE / nCrystals * (1 + gauss(0, 0.15));
      crystals.push({
        x: cx + dist * Math.cos(angle),
        y: cy + dist * Math.sin(angle),
        energy: Math.max(0.5, energy),
        selected: false,
      });
    }

    objects.push({
      hasTrack: isElectron,
      crystals,
      totalE: totalE.toFixed(0),
      answer: isElectron ? 'electron' : 'photon',
    });
  }

  let objIdx = 0;

  function drawECAL() {
    const o = objects[objIdx];
    const c = document.createElement('canvas');
    c.width = 180; c.height = 180;
    c.style.cssText = 'width:180px;height:180px;border-radius:8px;background:#0e1620;border:1px solid #26364a;margin:8px auto;display:block';

    const ctx = c.getContext('2d');

    // Draw ECAL grid background.
    ctx.strokeStyle = 'rgba(255,225,77,0.08)';
    ctx.lineWidth = 0.5;
    for (let x = 10; x < 180; x += 8) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 180); ctx.stroke();
    }
    for (let y = 10; y < 180; y += 8) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(180, y); ctx.stroke();
    }

    // Draw crystals.
    for (const cr of o.crystals) {
      const size = 6 + (cr.energy / 15) * 4;
      ctx.fillStyle = cr.selected
        ? 'rgba(255,225,77,0.8)'
        : `rgba(255,225,77,${0.15 + (cr.energy / 60) * 0.5})`;
      ctx.fillRect(cr.x - size / 2, cr.y - size / 2, size, size);
      ctx.strokeStyle = 'rgba(255,225,77,0.3)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(cr.x - size / 2, cr.y - size / 2, size, size);

      // Energy label for beginner mode.
      if (hintLv >= 2) {
        ctx.fillStyle = '#0e1620';
        ctx.font = '7px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(cr.energy.toFixed(0), cr.x, cr.y + 3);
      }
    }

    // Track indicator for electron (beginner mode).
    if (hintLv >= 2 && o.hasTrack) {
      ctx.strokeStyle = '#4da6ff';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(90, 180);
      ctx.lineTo(cx, cy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#4da6ff';
      ctx.font = '8px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('track', cx, cy + 18);
    }

    return c;
  }

  function showObject() {
    if (objIdx >= n) {
      area.innerHTML = '<p class="muted">✓ All objects clustered and identified.</p>';
      setTimeout(onDone, 400);
      return;
    }

    const o = objects[objIdx];
    area.innerHTML = `
      <p class="muted">Object ${objIdx + 1} of ${n}: a cluster of ${o.crystals.length} ECAL crystals with total energy ${o.totalE} GeV. ${o.hasTrack ? 'A track points to it.' : 'No matching track.'}</p>
      <div id="rec-ecal-canvas"></div>
      <div style="display:flex;gap:8px;justify-content:center;margin:8px 0">
        <button class="btn chip rec-id">Electron</button>
        <button class="btn chip rec-id">Photon</button>
      </div>
      <div id="rec-ecal-fb"></div>`;

    const canvasWrap = document.getElementById('rec-ecal-canvas');
    canvasWrap.appendChild(drawECAL());

    area.querySelectorAll('.rec-id').forEach(b => {
      b.addEventListener('click', () => {
        const guess = b.textContent.toLowerCase();
        const correct = guess === o.answer;
        const fb = document.getElementById('rec-ecal-fb');
        fb.innerHTML = `<div class="feedback feedback-${correct ? 'good' : 'bad'}">${
          correct ? '✓ Correct! ' + (o.answer === 'electron' ? 'Track + ECAL cluster = electron.' : 'ECAL cluster alone = photon.') : '✗ ' + (o.answer === 'electron' ? 'A track points to this cluster — it is an electron.' : 'No track — this is a photon.')
        }</div>`;
        area.querySelectorAll('.rec-id').forEach(bb => bb.disabled = true);
        objIdx++;
        setTimeout(showObject, 800);
      });
    });

    if (hintLv >= 1) {
      const hint = document.createElement('p');
      hint.className = 'muted small';
      hint.textContent = hintLv >= 2 ? '💡 Electron = track + ECAL cluster. Photon = ECAL cluster only.' : '💡 Look at the track info to distinguish electron from photon.';
      area.appendChild(hint);
    }
  }
  showObject();
}

// --- task 3: particle flow ----------------------------------------------------

function renderParticleFlow(area, hintLv, onDone) {
  const nObjs = 4;
  const kinds = ['muon', 'electron', 'photon', 'jet'];
  const objects = kinds.map((kind, i) => ({
    id: i, kind,
    hasTrack: kind !== 'photon',
    ecalE: kind === 'photon' ? randRange(20, 60).toFixed(0) : (kind === 'electron' ? randRange(15, 40).toFixed(0) : randRange(2, 8).toFixed(1)),
    hcalE: kind === 'jet' ? randRange(20, 50).toFixed(0) : randRange(0, 4).toFixed(1),
    muonHits: kind === 'muon',
  }));
  let oIdx = 0;

  function showObj() {
    if (oIdx >= nObjs) {
      area.innerHTML = '<p class="muted">✓ Particle flow linking complete. All objects identified.</p>';
      setTimeout(onDone, 400);
      return;
    }
    const o = objects[oIdx];
    area.innerHTML = `
      <p class="muted">Object ${oIdx + 1} of ${nObjs}: combine all subdetector signals to identify this particle.</p>
      <div class="cms-obj-props">
        <div><span>Tracker</span><b>${o.hasTrack ? '✓ Track' : '✗ No track'}</b></div>
        <div><span>ECAL</span><b>${o.ecalE} GeV</b></div>
        <div><span>HCAL</span><b>${o.hcalE} GeV</b></div>
        <div><span>Muon chambers</span><b>${o.muonHits ? '✓ Hits' : '✗ No hits'}</b></div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0">
        ${kinds.map(k => `<button class="btn chip rec-pf" data-kind="${k}">${k.charAt(0).toUpperCase() + k.slice(1)}</button>`).join('')}
      </div>
      <div id="rec-pf-fb"></div>`;
    area.querySelectorAll('.rec-pf').forEach(b => {
      b.addEventListener('click', () => {
        const guess = b.dataset.kind;
        const correct = guess === o.kind;
        const fb = document.getElementById('rec-pf-fb');
        fb.innerHTML = `<div class="feedback feedback-${correct ? 'good' : 'bad'}">${
          correct ? '✓ Correct! All subdetectors agree on this identity.' : `✗ This is a ${o.kind}.${hintLv >= 1 ? ` ${o.muonHits ? 'Muon chambers hit = muon.' : o.hasTrack && parseFloat(o.ecalE) > 15 ? 'Track + large ECAL = electron.' : o.hasTrack && parseFloat(o.hcalE) > 15 ? 'Track + large HCAL = jet.' : !o.hasTrack ? 'No track = photon.' : ''}` : ''}`
        }</div>`;
        area.querySelectorAll('.rec-pf').forEach(bb => bb.disabled = true);
        oIdx++;
        setTimeout(showObj, 1000);
      });
    });
  }
  showObj();
}

export { TASKS };
