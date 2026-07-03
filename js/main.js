// main.js
// Bootstraps Collider Quest, owns the run state, and wires the screens together:
//   Home (LHC ring) -> Detector (play loop) -> Run summary.

import { generateEvent } from './events.js';
import * as detector from './detector.js';
import * as histogram from './histogram.js';
import { attachCanvas, renderInspector } from './interaction.js';
import { renderClassifyBar, renderFeedback } from './classify.js';
import {
  createRun, advance, scoreIdentity, scoreClassification, purity, RUN_LENGTH,
} from './state.js';
import {
  MISSION, classifyFeedback, idFeedback, analysisQuality, CLOSING,
} from './content.js';

// --- element lookup ----------------------------------------------------------
const $ = (id) => document.getElementById(id);

let els;          // cached DOM elements (populated on load)
let run = null;   // current run state
let currentEvent = null;
let activeId = null;   // object currently in the inspector
let hoveredId = null;
let submitted = false; // has the current event been classified?

// --- screen management -------------------------------------------------------
function show(screenId) {
  for (const s of document.querySelectorAll('.screen')) {
    s.classList.toggle('active', s.id === screenId);
  }
}

// --- detector redraw ---------------------------------------------------------
function redrawDetector() {
  const view = {
    selectedIds: new Set(activeId ? [activeId] : []),
    labels: run ? run.selection : new Map(),
    hoveredId,
  };
  detector.render(els.detectorCanvas, currentEvent, view);
}

function redrawHistogram() {
  histogram.render(els.histogramCanvas, run ? run.histogram : []);
}

function updateHUD() {
  els.hudEvent.textContent = `Event ${Math.min(run.eventIndex + 1, RUN_LENGTH)} / ${RUN_LENGTH}`;
  els.hudScore.textContent = `Score ${run.score}`;
  els.hudZ.textContent = `Z peak: ${run.histogram.length}`;
}

// --- run loop ----------------------------------------------------------------
function beginRun() {
  run = createRun();
  submitted = false;
  show('screen-detector');
  nextEvent();
}

function nextEvent() {
  currentEvent = generateEvent();
  activeId = null;
  hoveredId = null;
  submitted = false;
  redrawDetector();
  redrawHistogram();
  updateHUD();
  renderInspector(els.inspector, null);
  renderClassifyBar(els.classifyBar, onClassify, false);
  renderFeedback(els.feedback, null);
  els.nextBtn.hidden = true;
}

function onClickObject(id) {
  if (!id) { activeId = null; renderInspector(els.inspector, null); redrawDetector(); return; }
  activeId = id;
  const obj = currentEvent.objects.find((o) => o.id === id);
  renderInspector(els.inspector, obj, run.selection.get(id), onIdentify);
  redrawDetector();
}

function onHoverObject(id) {
  hoveredId = id;
  redrawDetector();
}

function onIdentify(label) {
  const obj = currentEvent.objects.find((o) => o.id === activeId);
  if (!obj) return;
  // Only score the first identification of a given object.
  const firstTime = !run.selection.has(activeId);
  run.selection.set(activeId, label);
  if (firstTime) {
    const correct = scoreIdentity(run, obj, label);
    renderFeedback(els.feedback, idFeedback(correct, obj.truthLabel));
  }
  renderInspector(els.inspector, obj, label, onIdentify);
  updateHUD();
  redrawDetector();
}

function onClassify(value) {
  if (submitted) return;
  submitted = true;
  const { correct, addedToHistogram } = scoreClassification(run, currentEvent, value);
  renderFeedback(els.feedback, classifyFeedback(correct, currentEvent, value));
  renderClassifyBar(els.classifyBar, onClassify, true); // lock buttons
  if (addedToHistogram) redrawHistogram();
  updateHUD();
  els.nextBtn.hidden = false;
  els.nextBtn.focus();
}

function onNext() {
  advance(run);
  if (run.finished) showSummary();
  else nextEvent();
}

// --- summary -----------------------------------------------------------------
function showSummary() {
  const s = run.stats;
  const p = purity(run);
  const rows = [
    ['Events processed', s.processed],
    ['Z candidates selected', s.zCandidatesSelected],
    ['Correct Z events', s.correctZ],
    ['Background contamination', s.contamination],
    ['Particle IDs correct', `${s.idCorrect} / ${s.idAttempts}`],
    ['Analysis quality', analysisQuality(p)],
    ['Final score', run.score],
  ];
  els.summaryStats.innerHTML = '';
  for (const [k, v] of rows) {
    const row = document.createElement('div');
    row.className = 'summary-row';
    row.innerHTML = `<span>${k}</span><b>${v}</b>`;
    els.summaryStats.appendChild(row);
  }
  histogram.render(els.summaryHistogram, run.histogram);
  els.summaryClosing.textContent = CLOSING;
  show('screen-summary');
}

// --- home screen: animated LHC ring ------------------------------------------
function drawLHCRing(t) {
  const c = els.lhcCanvas;
  if (!c) return;
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  const cx = W / 2, cy = H / 2;
  const R = Math.min(W, H) / 2 - 46;
  ctx.clearRect(0, 0, W, H);

  // Ring.
  ctx.strokeStyle = '#2c3e52';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();

  // Circulating beam dots.
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    const a = t * 0.0016 + (i * Math.PI) / 3;
    const bx = cx + R * Math.cos(a);
    const by = cy + R * Math.sin(a);
    ctx.fillStyle = 'rgba(0,255,198,0.9)';
    ctx.beginPath();
    ctx.arc(bx, by, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Four experiment points.
  const points = [
    { name: 'ATLAS', ang: Math.PI * 1.25, active: false },
    { name: 'CMS', ang: Math.PI * 1.75, active: true },
    { name: 'ALICE', ang: Math.PI * 0.75, active: false },
    { name: 'LHCb', ang: Math.PI * 0.25, active: false },
  ];
  ctx.font = '13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const p of points) {
    const px = cx + R * Math.cos(p.ang);
    const py = cy + R * Math.sin(p.ang);
    ctx.beginPath();
    ctx.arc(px, py, p.active ? 11 : 8, 0, Math.PI * 2);
    ctx.fillStyle = p.active ? '#4da6ff' : '#3a4c60';
    ctx.fill();
    if (p.active) {
      ctx.strokeStyle = 'rgba(77,166,255,0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(px, py, 16, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = p.active ? '#cfe6ff' : '#7f8ea0';
    const off = 26;
    ctx.fillText(p.name + (p.active ? '' : ' 🔒'),
      cx + (R + off) * Math.cos(p.ang), cy + (R + off) * Math.sin(p.ang) + 4);
  }

  requestAnimationFrame(drawLHCRing);
}

// --- init --------------------------------------------------------------------
function sizeCanvas(canvas, w, h) {
  canvas.width = w;
  canvas.height = h;
}

function init() {
  els = {
    lhcCanvas: $('lhc-canvas'),
    detectorCanvas: $('detector-canvas'),
    histogramCanvas: $('histogram-canvas'),
    summaryHistogram: $('summary-histogram'),
    inspector: $('inspector'),
    classifyBar: $('classify-bar'),
    feedback: $('feedback'),
    nextBtn: $('next-btn'),
    hudEvent: $('hud-event'),
    hudScore: $('hud-score'),
    hudZ: $('hud-z'),
    summaryStats: $('summary-stats'),
    summaryClosing: $('summary-closing'),
  };

  // Intrinsic canvas resolutions (CSS scales them responsively).
  sizeCanvas(els.lhcCanvas, 420, 420);
  sizeCanvas(els.detectorCanvas, 560, 560);
  sizeCanvas(els.histogramCanvas, 360, 240);
  sizeCanvas(els.summaryHistogram, 520, 300);

  // Mission text on the home screen.
  $('mission-title').textContent = MISSION.title;
  $('mission-intro').textContent = MISSION.intro;
  $('mission-goal').textContent = MISSION.goal;

  // Wire buttons.
  $('start-run').addEventListener('click', beginRun);
  els.nextBtn.addEventListener('click', onNext);
  $('play-again').addEventListener('click', beginRun);
  $('back-home').addEventListener('click', () => show('screen-home'));

  // Canvas interaction.
  attachCanvas(els.detectorCanvas, { onClickObject, onHoverObject });

  requestAnimationFrame(drawLHCRing);
  show('screen-home');
}

document.addEventListener('DOMContentLoaded', init);
