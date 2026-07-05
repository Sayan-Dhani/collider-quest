// cms-school.js
// Chapter 3 — Inside CMS
// Interactive CMS detector school. Player explores subsystems (Tracker, ECAL,
// HCAL, Muon, MET) through a clickable cutaway and completes a mini-game per
// layer to learn how each part of the detector contributes to reconstruction.

import { randRange, randInt, gauss, degToRad, pick } from './physics.js';

const SUBSYSTEMS = [
  {
    id: 'tracker', label: 'Tracker', icon: '◎', color: '#4da6ff',
    innerFrac: 0.10, outerFrac: 0.27,
    lesson: 'The silicon tracker is the innermost layer. Charged particles leave hits in the silicon as they fly outward. The 3.8 T solenoid bends their path — tight curvature means low momentum, and opposite charges curve in opposite directions. We reconstruct tracks by connecting the hits.',
    tip: 'Curvature → momentum. Bend direction → charge.',
  },
  {
    id: 'ecal', label: 'ECAL', icon: '◈', color: '#ffe14d',
    innerFrac: 0.30, outerFrac: 0.43,
    lesson: 'The electromagnetic calorimeter stops electrons and photons. Both produce EM showers. But electrons leave a track in the tracker while photons are neutral and leave none. Matching tracks to ECAL clusters is how we distinguish them.',
    tip: 'Track + ECAL = electron. ECAL alone = photon.',
  },
  {
    id: 'hcal', label: 'HCAL', icon: '◆', color: '#ff8a3d',
    innerFrac: 0.48, outerFrac: 0.65,
    lesson: 'The hadronic calorimeter measures hadrons — protons, neutrons, pions. Hadrons produce broad showers. Jets are collimated sprays of hadrons depositing energy across many HCAL cells. Neutral hadrons leave no tracker track.',
    tip: 'Jets = broad HCAL clusters + many tracks.',
  },
  {
    id: 'muon', label: 'Muon System', icon: '⊚', color: '#34d17f',
    innerFrac: 0.70, outerFrac: 0.87,
    lesson: 'Muons are the only charged particles that reliably punch through the calorimeters. They leave hits in the tracker AND in the outer muon chambers buried in the steel yoke. A track that reaches the muon system is a near-certain muon.',
    tip: 'Tracker + muon chambers = muon. Everything else stops in the calorimeters.',
  },
  {
    id: 'met', label: 'Missing pT', icon: '⇱', color: '#ff6b6b',
    innerFrac: 0.90, outerFrac: 0.98,
    lesson: 'Before the collision, total transverse momentum is zero. Afterward, the vector sum of all visible pT should still balance to zero. If it does not, the imbalance is missing pT (MET) — carried by invisible particles such as neutrinos.',
    tip: 'MET = -Σ visible pT. Large MET means invisible particles.',
  },
];

let _canvas, _container, _onComplete, _animId = null;
let _activeIdx = 0;
let _completed = new Set();
let _allDone = false;

// --- public API ---------------------------------------------------------------

export function startCMSschool(canvas, container, { onComplete }) {
  _canvas = canvas;
  _container = container;
  _onComplete = onComplete || (() => {});
  _activeIdx = 0;
  _completed = new Set();
  _allDone = false;
  renderSubsystem(0);
  if (_animId) cancelAnimationFrame(_animId);
  _animId = requestAnimationFrame(frame);

  // Wire canvas click to switch subsystems.
  canvas.onclick = (e) => {
    const rect = canvas.getBoundingClientRect();
    const dpr = canvas._dpr || 1;
    const w = canvas.width / dpr, h = canvas.height / dpr;
    const mx = (e.clientX - rect.left) * (w / rect.width);
    const my = (e.clientY - rect.top) * (h / rect.height);
    const idx = hitTestSubsystem(mx, my);
    if (idx !== null && idx !== _activeIdx && !_completed.has(SUBSYSTEMS[idx].id)) {
      renderSubsystem(idx);
    }
  };
}

export function stopCMSschool() {
  if (_animId) { cancelAnimationFrame(_animId); _animId = null; }
  _canvas = null;
}

// --- animation loop -----------------------------------------------------------

function frame(now) {
  if (!_canvas || !document.getElementById('screen-cms-school')?.classList.contains('active')) return;
  drawCutaway(now);
  _animId = requestAnimationFrame(frame);
}

// --- CMS cutaway canvas drawing ----------------------------------------------

function drawCutaway(now) {
  if (!_canvas) return;
  const ctx = _canvas.getContext('2d');
  const dpr = _canvas._dpr || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = _canvas.width / dpr, h = _canvas.height / dpr;
  const cx = w / 2, cy = h / 2;
  const R = Math.min(cx, cy) - 24;

  ctx.clearRect(0, 0, w, h);

  // Background.
  ctx.fillStyle = '#0a0f16';
  ctx.fillRect(0, 0, w, h);

  // Beam pipe center dot.
  ctx.fillStyle = '#54637a';
  ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8aa0b8';
  ctx.font = '9px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('beam', cx, cy + 16);

  // Draw subsystem rings (outer to inner so inner sits on top).
  for (let i = SUBSYSTEMS.length - 1; i >= 0; i--) {
    const s = SUBSYSTEMS[i];
    const r1 = R * s.innerFrac;
    const r2 = R * s.outerFrac;
    const done = _completed.has(s.id);
    const active = i === _activeIdx;
    const future = !done && !active;

    ctx.beginPath();
    ctx.arc(cx, cy, r2, 0, Math.PI * 2);
    ctx.arc(cx, cy, r1, 0, Math.PI * 2, true);
    ctx.closePath();

    if (active) {
      const pulse = Math.sin((now || 0) * 0.003) * 0.15 + 0.5;
      ctx.fillStyle = s.color;
      ctx.globalAlpha = 0.25 + pulse * 0.3;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2.5;
    } else if (done) {
      ctx.fillStyle = 'rgba(52,209,127,0.15)';
      ctx.fill();
      ctx.strokeStyle = '#34d17f';
      ctx.lineWidth = 1.5;
    } else {
      ctx.fillStyle = 'rgba(38,54,74,0.3)';
      ctx.fill();
      ctx.strokeStyle = '#3a4c60';
      ctx.lineWidth = 1;
    }
    ctx.stroke();

    // Label.
    const labelR = (r1 + r2) / 2;
    ctx.fillStyle = active ? '#fff' : (done ? '#34d17f' : '#8aa0b8');
    ctx.font = (active ? 'bold 11px' : '10px') + ' system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.icon + ' ' + s.label, cx, cy - labelR);

    // Done checkmark.
    if (done) {
      ctx.strokeStyle = '#34d17f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy + labelR - 2);
      ctx.lineTo(cx - 1, cy + labelR + 3);
      ctx.lineTo(cx + 6, cy + labelR - 4);
      ctx.stroke();
    }
  }
  ctx.textBaseline = 'alphabetic';
}

// --- hit-testing -------------------------------------------------------------

export function hitTestSubsystem(x, y) {
  if (!_canvas) return null;
  const dpr = _canvas._dpr || 1;
  const w = _canvas.width / dpr, h = _canvas.height / dpr;
  const cx = w / 2, cy = h / 2;
  const R = Math.min(cx, cy) - 24;
  const dist = Math.hypot(x - cx, y - cy);

  for (let i = 0; i < SUBSYSTEMS.length; i++) {
    const s = SUBSYSTEMS[i];
    const r1 = R * s.innerFrac;
    const r2 = R * s.outerFrac;
    if (dist >= r1 && dist <= r2) return i;
  }
  return null;
}

// --- subsystem rendering -----------------------------------------------------

function renderSubsystem(idx) {
  if (_allDone) return;
  // A lesson was completed (or the player jumped around): continue with the
  // first subsystem not yet done; only when ALL five are done is the chapter
  // complete. (Previously, finishing the outermost ring ended the chapter.)
  if (idx >= SUBSYSTEMS.length || _completed.has(SUBSYSTEMS[idx]?.id)) {
    const nextIdx = SUBSYSTEMS.findIndex((s) => !_completed.has(s.id));
    if (nextIdx === -1) {
      _allDone = true;
      _onComplete?.();
      return;
    }
    idx = nextIdx;
  }
  _activeIdx = idx;
  const s = SUBSYSTEMS[idx];
  _container.innerHTML = '';

  // Header.
  const h = document.createElement('h2');
  h.innerHTML = `${s.icon} ${s.label}`;
  _container.appendChild(h);

  // Progress dots.
  const prog = document.createElement('div');
  prog.className = 'chain-progress';
  prog.innerHTML = SUBSYSTEMS.map((ss, i) =>
    `<span class="chain-dot ${i < idx ? 'dot-done' : (i === idx ? 'dot-cur' : 'dot-fut')}">${i < idx ? '✓' : (i === idx ? '●' : '○')}</span>`
  ).join('');
  _container.appendChild(prog);

  // Lesson.
  const lesson = document.createElement('div');
  lesson.className = 'cms-lesson';
  lesson.textContent = s.lesson;
  _container.appendChild(lesson);

  // Tip.
  const tip = document.createElement('div');
  tip.className = 'cms-tip';
  tip.textContent = '💡 ' + s.tip;
  _container.appendChild(tip);

  // Mini-game area.
  const gameArea = document.createElement('div');
  gameArea.className = 'cms-game';
  _container.appendChild(gameArea);

  // Start the appropriate mini-game.
  const gameFns = {
    tracker: playTrackerGame,
    ecal: playECALGame,
    hcal: playHCALGame,
    muon: playMuonGame,
    met: playMETGame,
  };
  (gameFns[s.id] || playTrackerGame)(gameArea, () => {
    _completed.add(s.id);
    renderSubsystem(idx + 1);
  });
}

// --- mini-games --------------------------------------------------------------

function playTrackerGame(area, onDone) {
  area.innerHTML = '<p class="muted">Click the 6 tracker hits <b>in order from innermost to outermost</b> to form a track — that is how track-finding seeds work.</p>';
  const c = document.createElement('canvas');
  c.width = 200; c.height = 200;
  c.style.width = '200px'; c.style.height = '200px';
  c.style.borderRadius = '8px';
  c.style.background = '#0e1620';
  c.style.border = '1px solid #26364a';
  area.appendChild(c);

  const ctx = c.getContext('2d');
  const cx = 100, cy = 100;
  // Generate random hits along a curved path.
  const nHits = 6;
  const hits = [];
  let nextIdx = 0;
  const charge = pick(['+', '-']);
  const pt = randRange(10, 50);
  const bendDir = charge === '+' ? 1 : -1;
  for (let i = 0; i < nHits; i++) {
    const r = 10 + (i / (nHits - 1)) * 70;
    const phiOffset = bendDir * (0.15 * (1 - 10 / (pt + 10))) * (i / nHits);
    const phi = -Math.PI / 2 + phiOffset + gauss(0, 0.02);
    hits.push({ x: cx + r * Math.cos(phi), y: cy + r * Math.sin(phi), r, clicked: false, idx: i });
  }
  // Shuffle display order.
  const shuffled = [...hits].sort(() => Math.random() - 0.5);

  function drawGame() {
    ctx.clearRect(0, 0, 200, 200);
    // Faint silicon layers, so "innermost to outermost" is visible.
    ctx.strokeStyle = 'rgba(77,166,255,0.12)';
    ctx.lineWidth = 1;
    for (const h of hits) {
      ctx.beginPath(); ctx.arc(cx, cy, h.r, 0, Math.PI * 2); ctx.stroke();
    }
    // Draw track path for completed hits.
    const clicked = hits.filter(h => h.clicked).sort((a, b) => a.idx - b.idx);
    if (clicked.length >= 2) {
      ctx.strokeStyle = '#4da6ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(clicked[0].x, clicked[0].y);
      for (let i = 1; i < clicked.length; i++) ctx.lineTo(clicked[i].x, clicked[i].y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // Draw all hit points.
    for (const h of shuffled) {
      ctx.beginPath(); ctx.arc(h.x, h.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = h.clicked ? '#4da6ff' : '#8aa0b8';
      ctx.fill();
      ctx.strokeStyle = h.clicked ? '#fff' : '#54637a';
      ctx.lineWidth = 1; ctx.stroke();
    }
  }
  drawGame();

  c.addEventListener('click', (e) => {
    const rect = c.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (200 / rect.width);
    const my = (e.clientY - rect.top) * (200 / rect.height);
    const hit = shuffled.find(h => !h.clicked && Math.hypot(mx - h.x, my - h.y) < 9);
    if (!hit) return;
    // Enforce the innermost-to-outermost order — the actual point of the game.
    if (hit.idx !== nextIdx) {
      ctx.beginPath(); ctx.arc(hit.x, hit.y, 8, 0, Math.PI * 2);
      ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 2; ctx.stroke();
      setTimeout(drawGame, 250);
      return;
    }
    nextIdx++;
    hit.clicked = true;
    drawGame();
    if (hits.every(h => h.clicked)) {
      // Track complete! Show charge/pt question.
      setTimeout(() => {
        area.innerHTML = '<p class="muted">Track complete! What can you tell from the curvature?</p>';
        const qs = document.createElement('div');
        qs.className = 'cms-questions';
        qs.innerHTML = `
          <div><span>pT:</span>
            <button class="btn chip q-btn">Low</button>
            <button class="btn chip q-btn">High</button>
          </div>
          <div><span>Charge:</span>
            <button class="btn chip q-btn">Positive</button>
            <button class="btn chip q-btn">Negative</button>
          </div>
          <button id="cms-track-done" class="btn btn-primary" disabled>✓ Done</button>
        `;
        area.appendChild(qs);
        let pAns = null, cAns = null;
        const correctPt = pt > 25 ? 'High' : 'Low';
        const correctCharge = charge === '+' ? 'Positive' : 'Negative';
        qs.querySelectorAll('.q-btn').forEach(b => {
          b.addEventListener('click', () => {
            b.classList.toggle('chip-active');
            qs.querySelectorAll('.q-btn').forEach(ob => {
              if (ob !== b && ob.textContent === b.textContent) ob.classList.remove('chip-active');
            });
            if (['Low', 'High'].includes(b.textContent)) pAns = b.textContent;
            else cAns = b.textContent;
            document.getElementById('cms-track-done').disabled = !(pAns && cAns);
          });
        });
        document.getElementById('cms-track-done').addEventListener('click', () => {
          const fb = document.createElement('div');
          fb.className = 'feedback feedback-' + (pAns === correctPt && cAns === correctCharge ? 'good' : 'bad');
          fb.textContent = (pAns === correctPt && cAns === correctCharge)
            ? `Correct! pT = ${pt.toFixed(0)} GeV, charge = ${charge}.`
            : `Not quite — pT was ${pt.toFixed(0)} GeV (${correctPt}) and charge was ${correctCharge}.`;
          area.appendChild(fb);
          setTimeout(onDone, 1200);
        });
      }, 400);
    }
  });
}

function playECALGame(area, onDone) {
  const n = 3;
  const objects = [];
  for (let i = 0; i < n; i++) {
    const isElectron = Math.random() < 0.5;
    objects.push({
      hasTrack: isElectron,
      ecalEnergy: randRange(20, 80).toFixed(0),
      hcalEnergy: randRange(0, isElectron ? 3 : 10).toFixed(0),
      answer: isElectron ? 'electron' : 'photon',
    });
  }
  let objIdx = 0;

  function showObject() {
    if (objIdx >= n) { setTimeout(onDone, 400); return; }
    const o = objects[objIdx];
    area.innerHTML = `<p class="muted">Object ${objIdx + 1} of ${n}: identify this particle.</p>
      <div class="cms-obj-props">
        <div><span>Track</span><b>${o.hasTrack ? '✓ Yes' : '✗ No'}</b></div>
        <div><span>ECAL energy</span><b>${o.ecalEnergy} GeV</b></div>
        <div><span>HCAL leakage</span><b>${o.hcalEnergy} GeV</b></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn chip ecal-btn">Electron</button>
        <button class="btn chip ecal-btn">Photon</button>
      </div>
      <div id="ecal-fb"></div>`;
    area.querySelectorAll('.ecal-btn').forEach(b => {
      b.addEventListener('click', () => {
        const guess = b.textContent.toLowerCase();
        const correct = guess === o.answer;
        const fb = document.getElementById('ecal-fb');
        fb.innerHTML = `<div class="feedback feedback-${correct ? 'good' : 'bad'}">${
          correct ? '✓ Correct! ' + (o.answer === 'electron' ? 'Track + ECAL = electron.' : 'ECAL alone = photon.') : '✗ ' + (o.answer === 'electron' ? 'It has a track — it is an electron.' : 'No track — it is a photon.')
        }</div>`;
        area.querySelectorAll('.ecal-btn').forEach(bb => bb.disabled = true);
        objIdx++;
        setTimeout(showObject, 1000);
      });
    });
  }
  showObject();
}

function playHCALGame(area, onDone) {
  const nJets = randInt(2, 4);
  area.innerHTML = '<p class="muted">A busy calorimeter. Jets show up as <b>clusters</b> of energetic towers. How many distinct jets can you see?</p>';
  const c = document.createElement('canvas');
  c.width = 280; c.height = 120;
  c.style.width = '280px'; c.style.height = '120px';
  c.style.borderRadius = '8px';
  c.style.background = '#0e1620';
  c.style.border = '1px solid #26364a';
  area.appendChild(c);

  const ctx = c.getContext('2d');
  // Draw HCAL towers clustered into jets.
  const clusters = [];
  for (let j = 0; j < nJets; j++) {
    const cx = randRange(20 + j * 70, 20 + j * 70 + 50);
    const cy = randRange(20, 100);
    const nTowers = randInt(4, 8);
    for (let t = 0; t < nTowers; t++) {
      clusters.push({
        x: cx + gauss(0, 12),
        y: cy + gauss(0, 10),
        e: randRange(5, 25),
      });
    }
  }
  for (const cl of clusters) {
    const eFrac = cl.e / 25;
    ctx.fillStyle = `rgba(255, 138, 61, ${0.2 + 0.6 * eFrac})`;
    ctx.fillRect(cl.x - 5, cl.y - 5, 10, 10);
    ctx.strokeStyle = 'rgba(255, 138, 61, 0.3)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(cl.x - 5, cl.y - 5, 10, 10);
  }
  ctx.fillStyle = '#8aa0b8';
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HCAL towers (color = energy)', 140, 115);

  const input = document.createElement('input');
  input.type = 'number';
  input.min = 0; input.max = 6; input.value = 0;
  input.style.cssText = 'width:60px;padding:6px;border-radius:8px;border:1px solid #26364a;background:#131d29;color:#dfe8f2;margin:8px 0';
  area.appendChild(input);

  const btn = document.createElement('button');
  btn.className = 'btn btn-primary';
  btn.textContent = 'Submit';
  btn.addEventListener('click', () => {
    const guess = parseInt(input.value);
    btn.disabled = true;
    const fb = document.createElement('div');
    fb.className = `feedback feedback-${guess === nJets ? 'good' : 'bad'}`;
    fb.textContent = guess === nJets ? `✓ Correct! There are ${nJets} jets.` : `Not quite — there are ${nJets} jets. Look for the energy clusters.`;
    area.appendChild(fb);
    setTimeout(onDone, 1200);
  });
  area.appendChild(btn);
}

function playMuonGame(area, onDone) {
  // 1-3 real muons among 4 tracks. The tell is the calorimeter readout: a
  // muon deposits almost nothing there yet its track keeps going — the card
  // does NOT say whether the muon chambers fired; the player must infer it.
  const n = 4;
  const nMuons = randInt(1, 3);
  const flags = Array.from({ length: n }, (_, i) => i < nMuons);
  flags.sort(() => Math.random() - 0.5);
  const tracks = flags.map((isMuon, i) => ({
    label: `Track ${i + 1}`,
    isMuon,
    pt: randRange(20, 60).toFixed(0),
    ecalE: isMuon ? randRange(0.5, 2.5).toFixed(1) : randRange(8, 40).toFixed(0),
    hcalE: isMuon ? randRange(0.5, 3.5).toFixed(1) : randRange(15, 60).toFixed(0),
  }));

  area.innerHTML = '<p class="muted">Four charged tracks, each with tens of GeV of momentum. ' +
    'Which of them punch through to the muon chambers? Select the muons, then check.</p>';
  const grid = document.createElement('div');
  grid.className = 'cms-muon-grid';
  const selected = new Set();

  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i];
    const card = document.createElement('button');
    card.className = 'cms-muon-card';
    card.innerHTML = `<b>${t.label}</b><span>track pT: ${t.pt} GeV</span><span>ECAL: ${t.ecalE} GeV</span><span>HCAL: ${t.hcalE} GeV</span>`;
    card.addEventListener('click', () => {
      if (selected.has(i)) { selected.delete(i); card.classList.remove('cms-muon-sel'); }
      else { selected.add(i); card.classList.add('cms-muon-sel'); }
    });
    grid.appendChild(card);
  }
  area.appendChild(grid);

  const check = document.createElement('button');
  check.className = 'btn btn-primary';
  check.textContent = 'Check';
  area.appendChild(check);

  const fb = document.createElement('div');
  area.appendChild(fb);

  check.addEventListener('click', () => {
    const correct = tracks.every((t, i) => t.isMuon === selected.has(i));
    fb.innerHTML = `<div class="feedback feedback-${correct ? 'good' : 'bad'}">${
      correct
        ? '✓ Correct! A 40 GeV track that leaves only ~2 GeV in the calorimeters did not stop there — it punched through to the muon chambers. That mismatch is the muon signature.'
        : `✗ Not quite — ${nMuons} of the tracks are muons. Look for tracks whose calorimeter deposits are tiny compared to their momentum: everything else stops in the calorimeters.`
    }</div>`;
    if (correct) {
      area.querySelectorAll('.cms-muon-card').forEach(c => c.disabled = true);
      check.disabled = true;
      setTimeout(onDone, 1400);
    }
  });
}

function playMETGame(area, onDone) {
  // Generate random visible pT vectors.
  const nObjs = randInt(3, 5);
  let totalPx = 0, totalPy = 0;
  const vectors = [];
  for (let i = 0; i < nObjs; i++) {
    const pt = randRange(10, 40);
    const angle = randRange(0, 360);
    const aRad = degToRad(angle);
    vectors.push({ pt, angle, px: pt * Math.cos(aRad), py: pt * Math.sin(aRad) });
    totalPx += pt * Math.cos(aRad);
    totalPy += pt * Math.sin(aRad);
  }

  area.innerHTML = '<p class="muted">The visible pT vectors are shown (blue). They do not balance — something invisible escaped. Click where the missing pT arrow should point.</p>';

  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:relative;width:180px;height:180px;margin:8px auto';
  const c = document.createElement('canvas');
  c.width = 180; c.height = 180;
  c.style.cssText = 'width:180px;height:180px;border-radius:50%;background:#0e1620;border:1px solid #26364a;cursor:pointer';
  wrap.appendChild(c);
  area.appendChild(wrap); // (was missing: the canvas never reached the DOM)

  const ctx = c.getContext('2d');
  const cx = 90, cy = 90;
  const scale = 40;
  let showAnswer = false; // must exist before the first drawMET() call

  function drawMET() {
    ctx.clearRect(0, 0, 180, 180);

    // Grid.
    ctx.strokeStyle = 'rgba(38,54,74,0.3)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 80, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 80, cy); ctx.lineTo(cx + 80, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - 80); ctx.lineTo(cx, cy + 80); ctx.stroke();

    // Visible vectors.
    for (const v of vectors) {
      const aRad = degToRad(v.angle);
      ctx.strokeStyle = '#4da6ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + v.pt * Math.cos(aRad) / scale * 70, cy - v.pt * Math.sin(aRad) / scale * 70);
      ctx.stroke();
    }

    // Expected MET (only after check).
    if (showAnswer) {
      const metPx = -totalPx, metPy = -totalPy;
      ctx.strokeStyle = 'rgba(255,107,107,0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + metPx / scale * 70, cy - metPy / scale * 70);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,107,107,0.5)';
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('expected MET', cx + metPx / scale * 75, cy - metPy / scale * 75 + 4);
    }
  }
  drawMET();

  // Click to select MET direction.
  let guess = null;
  c.addEventListener('click', (e) => {
    const rect = c.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (180 / rect.width) - cx;
    const my = (e.clientY - rect.top) * (180 / rect.height) - cy;
    guess = { x: mx, y: my };

    // Redraw with guess.
    drawMET();
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + guess.x, cy + guess.y);
    ctx.stroke();
    ctx.fillStyle = '#ff6b6b';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('your MET', cx + guess.x, cy + (guess.y > 0 ? guess.y + 16 : guess.y - 8));

    document.getElementById('met-check').disabled = false;
  });

  const checkBtn = document.createElement('button');
  checkBtn.id = 'met-check';
  checkBtn.className = 'btn btn-primary';
  checkBtn.disabled = true;
  checkBtn.textContent = 'Check';
  area.appendChild(checkBtn);

  checkBtn.addEventListener('click', () => {
    showAnswer = true;
    drawMET();
    // Draw guess on top.
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + guess.x, cy + guess.y);
    ctx.stroke();
    ctx.fillStyle = '#ff6b6b';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('your MET', cx + guess.x, cy + (guess.y > 0 ? guess.y + 16 : guess.y - 8));

    const metAngle = Math.atan2(-totalPy, -totalPx) * 180 / Math.PI;
    // Canvas y grows downward, physics y grows upward: flip the click's y.
    const guessAngle = Math.atan2(-guess.y, guess.x) * 180 / Math.PI;
    const diff = Math.abs(metAngle - guessAngle);
    const closeEnough = diff < 30 || diff > 330;
    const fb = document.createElement('div');
    fb.className = `feedback feedback-${closeEnough ? 'good' : 'bad'}`;
    fb.textContent = closeEnough
      ? `✓ Good estimate! The MET points opposite the visible sum. Magnitude: ${Math.hypot(totalPx, totalPy).toFixed(0)} GeV.`
      : `✗ The expected MET direction is different. Visible sum = (${totalPx.toFixed(0)}, ${totalPy.toFixed(0)}), so MET ≈ (${(-totalPx).toFixed(0)}, ${(-totalPy).toFixed(0)}).`;
    area.appendChild(fb);
    checkBtn.disabled = true;
    setTimeout(onDone, 1500);
  });
}

export { SUBSYSTEMS };
