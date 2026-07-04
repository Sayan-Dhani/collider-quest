// main.js
// Orchestrates Collider Quest v2:
//   Home -> Campaign -> Briefing -> Event Explorer -> Analysis Lab -> Result.

import { MISSIONS, getMission } from './missions.js';
import { makeDisplayEvent, makeDataset } from './events.js';
import * as detector from './detector.js';
import { renderStacked } from './histogram.js';
import { attachCanvas, renderInspector } from './interaction.js';
import {
  initStates, computeResult, binStacked, renderCuts, renderMetrics, confidenceLabel,
} from './analysis.js';
import {
  TAGLINE, HOME_INTRO, idFeedback, processFeedback, resultHeadline, CLOSING,
} from './content.js';

const $ = (id) => document.getElementById(id);

// --- persistent progress -----------------------------------------------------
const PROGRESS_KEY = 'cq_progress_v2';
let progress = loadProgress();
function loadProgress() {
  try { return new Set(JSON.parse(localStorage.getItem(PROGRESS_KEY) || '[]')); }
  catch { return new Set(); }
}
function saveProgress() {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify([...progress])); } catch {}
}
function missionUnlocked(idx) {
  const m = MISSIONS[idx];
  if (m.locked) return false;
  if (idx === 0) return true;
  return progress.has(MISSIONS[idx - 1].id);
}

// --- transient state ---------------------------------------------------------
let els;
let mission = null;
let exp = null;   // explorer state
let lab = null;   // lab state

// --- screens -----------------------------------------------------------------
function show(id) {
  for (const s of document.querySelectorAll('.screen')) s.classList.toggle('active', s.id === id);
}

// ============================ MISSION SELECT =================================
function renderMissions() {
  const grid = els.missionGrid;
  grid.innerHTML = '';
  let done = 0;
  MISSIONS.forEach((m, idx) => {
    if (progress.has(m.id)) done++;
    const unlocked = missionUnlocked(idx);
    const card = document.createElement('button');
    card.className = 'mission-card' + (unlocked ? '' : ' locked') + (progress.has(m.id) ? ' complete' : '');
    card.disabled = !unlocked;
    card.innerHTML =
      `<div class="mc-top"><span class="mc-chapter">${m.chapter}</span>` +
      `<span class="mc-diff">${m.difficulty}</span></div>` +
      `<div class="mc-title">${m.title}</div>` +
      `<div class="mc-tag">${m.tagline}</div>` +
      `<div class="mc-foot">${m.locked ? '🔒 coming soon'
        : progress.has(m.id) ? '✓ discovered'
        : unlocked ? 'Start →' : '🔒 locked'}</div>`;
    if (unlocked) card.addEventListener('click', () => openBriefing(m));
    grid.appendChild(card);
  });
  els.progressNote.textContent = `${done} / ${MISSIONS.filter((m) => !m.locked).length} discovered`;
  show('screen-missions');
}

// ============================ BRIEFING ======================================
function openBriefing(m) {
  mission = m;
  $('brief-title').textContent = m.title;
  $('brief-difficulty').textContent = m.difficulty;
  $('brief-chapter').textContent = m.chapter;
  $('brief-tagline').textContent = m.tagline;
  $('brief-story').textContent = m.story;
  $('brief-lesson').textContent = m.lesson;
  $('brief-objective').textContent =
    `Reach ${m.target}σ significance for ${m.tagline} by cutting away the background.`;
  const list = $('brief-explore');
  list.innerHTML = '';
  for (const e of m.explore) {
    const li = document.createElement('li');
    li.textContent = e.label;
    list.appendChild(li);
  }
  show('screen-briefing');
}

// ============================ EVENT EXPLORER ================================
const EXPLORER_EVENTS = 4;

function openExplorer() {
  exp = { index: 0, total: EXPLORER_EVENTS, event: null, activeId: null, hoveredId: null,
          selection: new Map(), guessed: false };
  $('exp-title').textContent = mission.title;
  nextExplorerEvent();
  show('screen-explorer');
}

function nextExplorerEvent() {
  const pool = mission.explore.map((e) => e.name);
  const processName = pool[Math.floor(Math.random() * pool.length)];
  const pileup = mission.difficulty === 'Beginner' ? 2 : 3;
  exp.event = makeDisplayEvent(processName, pileup);
  exp.activeId = null; exp.hoveredId = null; exp.selection = new Map(); exp.guessed = false;
  $('exp-count').textContent = `Event ${exp.index + 1} / ${exp.total}`;
  redrawDetector();
  renderInspector(els.inspector, null);
  renderProcessButtons(false);
  els.expFeedback.innerHTML = '';
  els.expNext.hidden = true;
}

function redrawDetector() {
  detector.render(els.detectorCanvas, exp.event, {
    selectedIds: new Set(exp.activeId ? [exp.activeId] : []),
    labels: exp.selection,
    hoveredId: exp.hoveredId,
  });
}

function onClickObject(id) {
  if (!id) { exp.activeId = null; renderInspector(els.inspector, null); redrawDetector(); return; }
  exp.activeId = id;
  const obj = exp.event.objects.find((o) => o.id === id);
  renderInspector(els.inspector, obj, exp.selection.get(id), onIdentify);
  redrawDetector();
}
function onHoverObject(id) { exp.hoveredId = id; redrawDetector(); }

function onIdentify(label) {
  const obj = exp.event.objects.find((o) => o.id === exp.activeId);
  if (!obj) return;
  const first = !exp.selection.has(exp.activeId);
  exp.selection.set(exp.activeId, label);
  if (first) {
    const correct = obj.truthLabel === label;
    renderFeedback(els.expFeedback, idFeedback(correct, obj.truthLabel));
  }
  renderInspector(els.inspector, obj, label, onIdentify);
  redrawDetector();
}

function renderProcessButtons(disabled) {
  const box = els.expProcess;
  box.innerHTML = '';
  for (const e of mission.explore) {
    const b = document.createElement('button');
    b.className = 'btn class-btn';
    b.textContent = e.label.replace(/^(signal|background):\s*/, '');
    b.disabled = disabled;
    b.addEventListener('click', () => onProcessGuess(e.name));
    box.appendChild(b);
  }
}

function onProcessGuess(name) {
  if (exp.guessed) return;
  exp.guessed = true;
  const truthLabel = mission.explore.find((e) => e.name === exp.event.processName).label;
  const correct = name === exp.event.processName;
  renderFeedback(els.expFeedback, processFeedback(correct, name, truthLabel));
  renderProcessButtons(true);
  exp.index++;
  if (exp.index >= exp.total) {
    els.expNext.hidden = true;
  } else {
    els.expNext.hidden = false;
  }
}

function renderFeedback(container, fb) {
  container.innerHTML = '';
  if (!fb) return;
  const d = document.createElement('div');
  d.className = `feedback feedback-${fb.tone}`;
  d.textContent = fb.text;
  container.appendChild(d);
}

// ============================ ANALYSIS LAB ==================================
function openLab() {
  lab = {
    dataset: makeDataset(mission),
    states: initStates(mission),
    lumi: 1,
    result: null,
  };
  $('lab-title').textContent = `${mission.title} — Analysis Lab`;
  $('lumi-range').value = 1;
  $('lumi-val').textContent = '×1.0';
  renderCuts(els.cutsPanel, mission, lab.states, recomputeLab);
  recomputeLab();
  show('screen-lab');
}

function recomputeLab() {
  const r = computeResult(lab.dataset, mission, lab.states, lab.lumi);
  lab.result = r;
  renderMetrics(els.metrics, r, mission);
  renderStacked(els.labCanvas, binStacked(r.passing, mission.observable, lab.lumi), mission.observable);
  const reached = r.significance >= mission.target;
  els.btnClaim.disabled = !reached;
  els.btnClaim.textContent = reached ? '★ Claim discovery' : `Reach ${mission.target}σ to claim`;
}

function onLumiChange() {
  lab.lumi = parseFloat($('lumi-range').value);
  $('lumi-val').textContent = `×${lab.lumi.toFixed(1)}`;
  recomputeLab();
}

// ============================ RESULT ========================================
function claimDiscovery() {
  const r = lab.result;
  const wasNew = !progress.has(mission.id);
  progress.add(mission.id);
  saveProgress();

  $('result-headline').textContent = resultHeadline(r.significance, mission.target);
  const conf = confidenceLabel(r.significance);
  const nCuts = mission.cuts.filter((c) => lab.states[c.id].enabled).length;
  const rows = [
    ['Significance', `${r.significance.toFixed(1)}σ — ${conf.text}`],
    ['Signal events', Math.round(r.S)],
    ['Background events', Math.round(r.B)],
    ['Purity', `${Math.round(r.purity * 100)}%`],
    ['Signal efficiency', `${Math.round(r.sigEff * 100)}%`],
    ['Luminosity used', `×${lab.lumi.toFixed(1)}`],
    ['Cuts applied', nCuts],
  ];
  els.resultStats.innerHTML = '';
  for (const [k, v] of rows) {
    const row = document.createElement('div');
    row.className = 'summary-row';
    row.innerHTML = `<span>${k}</span><b>${v}</b>`;
    els.resultStats.appendChild(row);
  }
  els.resultClosing.textContent = CLOSING;
  renderStacked(els.resultCanvas, binStacked(r.passing, mission.observable, lab.lumi), mission.observable);

  // Offer next mission if it just unlocked.
  const idx = MISSIONS.findIndex((m) => m.id === mission.id);
  const next = MISSIONS[idx + 1];
  if (next && !next.locked) {
    els.resultNext.hidden = false;
    els.resultNext.onclick = () => openBriefing(next);
  } else {
    els.resultNext.hidden = true;
  }
  show('screen-result');
}

// ============================ HOME: LHC ring =================================
function drawLHCRing(t) {
  const c = els.lhcCanvas; if (!c) return;
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height, cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 46;
  ctx.clearRect(0, 0, W, H);
  ctx.strokeStyle = '#2c3e52'; ctx.lineWidth = 10;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const a = t * 0.0016 + (i * Math.PI) / 3;
    ctx.fillStyle = 'rgba(0,255,198,0.9)';
    ctx.beginPath(); ctx.arc(cx + R * Math.cos(a), cy + R * Math.sin(a), 3, 0, Math.PI * 2); ctx.fill();
  }
  const pts = [
    { name: 'ATLAS', ang: Math.PI * 1.25, active: false },
    { name: 'CMS', ang: Math.PI * 1.75, active: true },
    { name: 'ALICE', ang: Math.PI * 0.75, active: false },
    { name: 'LHCb', ang: Math.PI * 0.25, active: false },
  ];
  ctx.font = '13px system-ui, sans-serif'; ctx.textAlign = 'center';
  for (const p of pts) {
    const px = cx + R * Math.cos(p.ang), py = cy + R * Math.sin(p.ang);
    ctx.beginPath(); ctx.arc(px, py, p.active ? 11 : 8, 0, Math.PI * 2);
    ctx.fillStyle = p.active ? '#4da6ff' : '#3a4c60'; ctx.fill();
    if (p.active) {
      ctx.strokeStyle = 'rgba(77,166,255,0.5)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(px, py, 16, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = p.active ? '#cfe6ff' : '#7f8ea0';
    ctx.fillText(p.name + (p.active ? '' : ' 🔒'),
      cx + (R + 26) * Math.cos(p.ang), cy + (R + 26) * Math.sin(p.ang) + 4);
  }
  requestAnimationFrame(drawLHCRing);
}

// ============================ INIT ==========================================
function sizeCanvas(c, w, h) { c.width = w; c.height = h; }

function init() {
  els = {
    lhcCanvas: $('lhc-canvas'),
    missionGrid: $('mission-grid'),
    progressNote: $('progress-note'),
    detectorCanvas: $('detector-canvas'),
    inspector: $('inspector'),
    expProcess: $('exp-process'),
    expFeedback: $('exp-feedback'),
    expNext: $('exp-next'),
    cutsPanel: $('cuts-panel'),
    metrics: $('metrics'),
    labCanvas: $('lab-canvas'),
    btnClaim: $('btn-claim'),
    resultStats: $('result-stats'),
    resultClosing: $('result-closing'),
    resultCanvas: $('result-canvas'),
    resultNext: $('result-next'),
  };

  sizeCanvas(els.lhcCanvas, 420, 420);
  sizeCanvas(els.detectorCanvas, 560, 560);
  sizeCanvas(els.labCanvas, 560, 300);
  sizeCanvas(els.resultCanvas, 520, 300);

  $('tagline').textContent = TAGLINE;
  $('home-intro').textContent = HOME_INTRO;

  // Navigation.
  $('enter-btn').addEventListener('click', renderMissions);
  for (const b of document.querySelectorAll('[data-nav]')) {
    b.addEventListener('click', () => {
      const t = b.getAttribute('data-nav');
      if (t === 'home') show('screen-home');
      else if (t === 'missions') renderMissions();
      else if (t === 'briefing') openBriefing(mission);
    });
  }
  $('btn-explorer').addEventListener('click', openExplorer);
  $('btn-skip-lab').addEventListener('click', openLab);
  $('exp-next').addEventListener('click', nextExplorerEvent);
  $('exp-to-lab').addEventListener('click', openLab);
  $('lumi-range').addEventListener('input', onLumiChange);
  $('btn-claim').addEventListener('click', claimDiscovery);

  attachCanvas(els.detectorCanvas, { onClickObject, onHoverObject });

  requestAnimationFrame(drawLHCRing);
  show('screen-home');
}

document.addEventListener('DOMContentLoaded', init);
