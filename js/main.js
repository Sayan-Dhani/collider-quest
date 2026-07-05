// main.js
// Orchestrates Collider Quest v2:
//   Home -> Accelerator -> Campaign -> Briefing -> Explorer -> Analysis Lab -> Result.

import { MISSIONS, getMission } from './missions.js';
import { makeDisplayEvent, makeDataset } from './events.js';
import * as detector from './detector.js';
import * as accelerator from './accelerator.js';
import * as chain from './chain.js';
import * as collisions from './collisions.js';
import * as cmsSchool from './cms-school.js';
import * as reconstruction from './reconstruction.js';
import * as trigger from './trigger.js';
import { renderStacked } from './histogram.js';
import { attachCanvas, renderInspector } from './interaction.js';
import {
  initStates, computeResult, binStacked, cutImpacts,
  renderCuts, renderCutImpacts, renderMetrics, confidenceLabel,
} from './analysis.js';
import {
  TAGLINE, HOME_INTRO, CHAIN_INTRO, CHAIN_COMPLETE,
  COLLISIONS_INTRO, CMS_SCHOOL_INTRO, CMS_SCHOOL_COMPLETE,
  RECONSTRUCTION_INTRO, RECONSTRUCTION_COMPLETE,
  TRIGGER_INTRO, TRIGGER_COMPLETE,
  ACCELERATOR_INTRO, ACC_INFO_DEFAULT,
  idFeedback, processFeedback, explorerSummary, resultHeadline, CLOSING,
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
let acc = null;   // accelerator state
let accHover = null; // hovered interaction point id

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
    `Reach ${m.target}σ significance for ${m.tagline} by cutting away the background.` +
    (m.targetNote ? ` ${m.targetNote}` : '');
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
          selection: new Map(), guessed: false,
          idCorrect: 0, idTotal: 0, procCorrect: 0 };
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
  els.expSummary.hidden = true;
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
    exp.idTotal++;
    if (correct) exp.idCorrect++;
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
  if (correct) exp.procCorrect++;
  renderFeedback(els.expFeedback, processFeedback(correct, name, truthLabel));
  renderProcessButtons(true);
  exp.index++;
  if (exp.index >= exp.total) {
    // End of the Explorer run: sum up and hand off to the Lab.
    els.expNext.hidden = true;
    $('exp-summary-text').textContent =
      explorerSummary(exp.idCorrect, exp.idTotal, exp.procCorrect, exp.total);
    els.expSummary.hidden = false;
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
const BASE_LUMI_FB = 25; // "×1" on the slider ~ one good LHC data-taking year
const lumiLabel = (l) => `${Math.round(BASE_LUMI_FB * l)} fb⁻¹`;

function getChosenTriggerId() {
  // Check runtime state first.
  if (_chosenTriggerId) return _chosenTriggerId;
  // Check progress for stored trigger.
  for (const p of progress) {
    if (p.startsWith('trigger-')) return p.replace('trigger-', '');
  }
  return 'minBias';
}

function openLab() {
  const triggerId = getChosenTriggerId();
  lab = {
    dataset: makeDataset(mission, 250, triggerId),
    states: initStates(mission),
    lumi: 1,
    result: null,
    impactEls: null,
    triggerId,
  };
  $('lab-title').textContent = `${mission.title} — Analysis Lab`;
  $('lumi-range').value = 1;
  $('lumi-val').textContent = lumiLabel(1);
  lab.impactEls = renderCuts(els.cutsPanel, mission, lab.states, recomputeLab);
  recomputeLab();
  show('screen-lab');
}

function recomputeLab() {
  const prev = lab.result;
  const r = computeResult(lab.dataset, mission, lab.states, lab.lumi);
  lab.result = r;
  renderMetrics(els.metrics, r, mission);
  renderCutImpacts(lab.impactEls, cutImpacts(lab.dataset, mission, lab.states));
  renderStacked(els.labCanvas, binStacked(r.passing, mission.observable, lab.lumi), mission.observable);

  // Teachable moment: a change that LOWERED significance by costing signal.
  if (prev && r.significance < prev.significance - 0.2 && r.sigEff < prev.sigEff) {
    els.labHint.textContent =
      '⚠ Significance fell — that change cost more signal than the background it removed. Too-tight cuts throw away the discovery.';
    els.labHint.hidden = false;
  } else if (prev && r.significance >= prev.significance) {
    els.labHint.hidden = true;
  }

  const reached = r.significance >= mission.target;
  els.btnClaim.disabled = !reached;
  els.btnClaim.textContent = reached ? '★ Claim discovery' : `Reach ${mission.target}σ to claim`;
}

function onLumiChange() {
  lab.lumi = parseFloat($('lumi-range').value);
  $('lumi-val').textContent = lumiLabel(lab.lumi);
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
    ['Luminosity used', lumiLabel(lab.lumi)],
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

// ============================ TUTORIAL CHAPTERS (1-5) ======================
function enterLHC() {
  if (!progress.has('chapter-1')) return openChain();
  if (!progress.has('chapter-2')) return openCollisions();
  if (!progress.has('chapter-3')) return openCMSschool();
  if (!progress.has('chapter-4')) return openReconstruction();
  if (!progress.has('chapter-5')) return openTrigger();
  openAccelerator();
}

// --- Chapter 1 — Build the Beam ---------------------------------------------
function openChain() {
  els.chainIntro.textContent = CHAIN_INTRO;
  show('screen-chain');
  chain.startChain(els.chainCanvas, els.chainContent, {
    onComplete: () => {
      progress.add('chapter-1');
      saveProgress();
      openCollisions();
    },
  });
}

// ============================ CHAPTER 2 — FIRST COLLISIONS ==================
function openCollisions() {
  els.collisionsIntro.textContent = COLLISIONS_INTRO;
  show('screen-collisions');
  collisions.startCollisions(els.collisionsContent, {
    onComplete: () => {
      progress.add('chapter-2');
      saveProgress();
      openCMSschool();
    },
  });
}

// --- Chapter 3 — Inside CMS -------------------------------------------------
function openCMSschool() {
  els.cmsIntro.textContent = CMS_SCHOOL_INTRO;
  show('screen-cms-school');
  cmsSchool.startCMSschool(els.cmsCanvas, els.cmsContent, {
    onComplete: () => {
      progress.add('chapter-3');
      saveProgress();
      openReconstruction();
    },
  });
}

// --- Chapter 4 — From Hits to Objects ---------------------------------------
function openReconstruction() {
  els.reconstructionIntro.textContent = RECONSTRUCTION_INTRO;
  show('screen-reconstruction');
  reconstruction.startReconstruction(els.reconstructionContent, {
    onComplete: () => {
      progress.add('chapter-4');
      saveProgress();
      openTrigger();
    },
  });
}

// --- Chapter 5 — Trigger the Data -------------------------------------------
let _chosenTriggerId = null;

function openTrigger() {
  els.triggerIntro.textContent = TRIGGER_INTRO;
  show('screen-trigger');
  trigger.startTrigger(els.triggerContent, {
    onComplete: () => {
      _chosenTriggerId = trigger.getChosenTrigger();
      progress.add('chapter-5');
      progress.add('trigger-' + (_chosenTriggerId || 'minBias'));
      saveProgress();
      openAccelerator();
    },
    context: mission ? mission.id : 'z-mumu',
  });
}

// ============================ ACCELERATOR / LHC MAP =========================
const homeTeaser = accelerator.createState();

// Respect prefers-reduced-motion: draw single static frames instead of
// running the permanent animation loops.
const REDUCED_MOTION =
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// Home shows a calm, non-interactive teaser of the same ring.
function drawHomeTeaser() {
  if (els.lhcCanvas) accelerator.draw(els.lhcCanvas, homeTeaser, { mode: 'teaser' });
  if (!REDUCED_MOTION) requestAnimationFrame(drawHomeTeaser);
}

function openAccelerator() {
  acc = accelerator.createState();
  accHover = null;
  if (REDUCED_MOTION) {
    // Skip the animated ramp: jump straight to stable beams.
    acc.energy = accelerator.ENERGY.COLLISION_TEV;
    acc.colliding = true;
  } else {
    accelerator.startRamp(acc);
  }
  $('acc-intro').textContent = ACCELERATOR_INTRO;
  els.accInfo.innerHTML = ACC_INFO_DEFAULT;
  show('screen-accelerator');
  drawAcceleratorFrame();
}

function drawAcceleratorFrame() {
  // Stop the loop when the accelerator screen is no longer visible.
  if (!document.getElementById('screen-accelerator').classList.contains('active')) return;
  accelerator.draw(els.accCanvas, acc, { hoveredId: accHover, mode: 'full' });
  const frac = accelerator.energyFraction(acc);
  els.accEnergy.textContent = `${acc.energy.toFixed(2)} TeV`;
  els.accEnergyFill.style.width = `${Math.round(frac * 100)}%`;
  els.accStatus.textContent = acc.colliding
    ? 'Stable beams — colliding'
    : acc.ramping ? 'Ramping beams…' : 'Injecting…';
  if (!REDUCED_MOTION) requestAnimationFrame(drawAcceleratorFrame);
}

function accCoords(evt) {
  const c = els.accCanvas, rect = c.getBoundingClientRect();
  const dpr = c._dpr || 1;
  return { x: (evt.clientX - rect.left) * (c.width / dpr / rect.width),
           y: (evt.clientY - rect.top) * (c.height / dpr / rect.height) };
}

function onAccMove(evt) {
  const { x, y } = accCoords(evt);
  const id = accelerator.hitTestIP(x, y);
  if (id !== accHover) {
    accHover = id;
    els.accCanvas.style.cursor = id ? 'pointer' : 'default';
    if (id) showExperimentInfo(id);
  }
}

function onAccClick(evt) {
  const { x, y } = accCoords(evt);
  const id = accelerator.hitTestIP(x, y);
  if (!id) return;
  const e = accelerator.getExperiment(id);
  if (e.playable) renderMissions();
  else showExperimentInfo(id);
}

function showExperimentInfo(id) {
  const e = accelerator.getExperiment(id);
  els.accInfo.innerHTML =
    `<span class="acc-role">${e.name} · ${e.role}</span>${e.blurb}`;
}

// ============================ REAL DETECTOR MODAL ===========================
function openDetectorModal() { els.detectorModal.hidden = false; }
function closeDetectorModal() { els.detectorModal.hidden = true; }

// ============================ INIT ==========================================
// Hi-DPI: back the canvas with devicePixelRatio× pixels (capped at 2) and let
// the renderers scale the context once per frame, so drawing, hit-testing and
// CSS layout all keep working in logical pixels.
function sizeCanvas(c, w, h) {
  const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
  c._dpr = dpr;
  c.width = w * dpr;
  c.height = h * dpr;
}

function init() {
  els = {
    lhcCanvas: $('lhc-canvas'),
    accCanvas: $('acc-canvas'),
    accStatus: $('acc-status'),
    accEnergy: $('acc-energy'),
    accEnergyFill: $('acc-energy-fill'),
    accInfo: $('acc-info'),
    missionGrid: $('mission-grid'),
    progressNote: $('progress-note'),
    detectorCanvas: $('detector-canvas'),
    inspector: $('inspector'),
    expProcess: $('exp-process'),
    expFeedback: $('exp-feedback'),
    expNext: $('exp-next'),
    expSummary: $('exp-summary'),
    cutsPanel: $('cuts-panel'),
    metrics: $('metrics'),
    labHint: $('lab-hint'),
    labCanvas: $('lab-canvas'),
    btnClaim: $('btn-claim'),
    resultStats: $('result-stats'),
    resultClosing: $('result-closing'),
    resultCanvas: $('result-canvas'),
    resultNext: $('result-next'),
    chainCanvas: $('chain-canvas'),
    chainContent: $('chain-content'),
    chainIntro: $('chain-intro'),
    collisionsContent: $('collisions-content'),
    collisionsIntro: $('collisions-intro'),
    cmsCanvas: $('cms-canvas'),
    cmsContent: $('cms-content'),
    cmsIntro: $('cms-school-intro'),
    reconstructionContent: $('reconstruction-content'),
    reconstructionIntro: $('reconstruction-intro'),
    triggerContent: $('trigger-content'),
    triggerIntro: $('trigger-intro'),
    detectorModal: $('detector-modal'),
  };

  sizeCanvas(els.lhcCanvas, 420, 420);
  sizeCanvas(els.accCanvas, 520, 520);
  sizeCanvas(els.chainCanvas, 700, 160);
  sizeCanvas(els.cmsCanvas, 240, 240);
  sizeCanvas(els.detectorCanvas, 560, 560);
  sizeCanvas(els.labCanvas, 560, 300);
  sizeCanvas(els.resultCanvas, 520, 300);

  $('tagline').textContent = TAGLINE;
  $('home-intro').textContent = HOME_INTRO;

  // Navigation.
  $('enter-btn').addEventListener('click', enterLHC);
  $('skip-tutorial').addEventListener('click', (e) => {
    e.preventDefault();
    openAccelerator();
  });
  for (const b of document.querySelectorAll('[data-nav]')) {
    b.addEventListener('click', () => {
      const t = b.getAttribute('data-nav');
      if (t === 'home') { chain.stopChain(); cmsSchool.stopCMSschool(); show('screen-home'); }
      else if (t === 'missions') renderMissions();
      else if (t === 'briefing') openBriefing(mission);
    });
  }
  // Accelerator screen.
  els.accCanvas.addEventListener('mousemove', onAccMove);
  els.accCanvas.addEventListener('click', onAccClick);
  $('acc-ramp').addEventListener('click', () => accelerator.startRamp(acc));
  $('acc-enter-cms').addEventListener('click', renderMissions);

  // Real CMS detector image modal.
  $('acc-view-detector').addEventListener('click', openDetectorModal);
  $('exp-view-detector').addEventListener('click', openDetectorModal);
  for (const el of document.querySelectorAll('[data-close-modal]')) {
    el.addEventListener('click', closeDetectorModal);
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDetectorModal();
  });

  $('btn-explorer').addEventListener('click', openExplorer);
  $('btn-skip-lab').addEventListener('click', openLab);
  $('exp-next').addEventListener('click', nextExplorerEvent);
  $('exp-to-lab').addEventListener('click', openLab);
  $('exp-summary-lab').addEventListener('click', openLab);
  $('lumi-range').addEventListener('input', onLumiChange);
  $('btn-claim').addEventListener('click', claimDiscovery);

  attachCanvas(els.detectorCanvas, { onClickObject, onHoverObject });

  requestAnimationFrame(drawHomeTeaser);
  show('screen-home');
}

document.addEventListener('DOMContentLoaded', init);
