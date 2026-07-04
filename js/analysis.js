// analysis.js
// The Analysis Lab: apply selection cuts to a weighted dataset and watch signal
// emerge from background in real time. Pure logic (computeResult / binStacked)
// is separated from the DOM (renderCuts / renderMetrics) so it can be tested.

import { evalCut } from './missions.js';
import { significance } from './physics.js';

// Fresh cut state for a mission: every cut starts disabled at its default value.
export function initStates(mission) {
  const s = {};
  for (const c of mission.cuts) s[c.id] = { enabled: false, value: c.value ?? null };
  return s;
}

// Does an event pass ALL enabled cuts?
function passesAll(mission, features, states) {
  for (const cut of mission.cuts) {
    if (!evalCut(cut, features, states[cut.id])) return false;
  }
  return true;
}

// Core computation: signal/background yields before and after cuts, efficiencies
// and Asimov significance. `lumi` scales the expected yields (more integrated
// luminosity = more events = higher significance, ~sqrt(lumi)). Returns the
// passing events too (for the histogram).
export function computeResult(dataset, mission, states, lumi = 1) {
  let S = 0, B = 0, Stot = 0, Btot = 0;
  const passing = [];
  for (const ev of dataset) {
    if (ev.truth === 'signal') Stot += ev.weight; else Btot += ev.weight;
    if (passesAll(mission, ev.features, states)) {
      if (ev.truth === 'signal') S += ev.weight; else B += ev.weight;
      passing.push(ev);
    }
  }
  S *= lumi; B *= lumi; Stot *= lumi; Btot *= lumi;
  return {
    S, B, Stot, Btot, lumi, passing,
    sigEff: Stot > 0 ? S / Stot : 0,
    bkgEff: Btot > 0 ? B / Btot : 0,
    purity: S + B > 0 ? S / (S + B) : 0,
    significance: significance(S, B),
  };
}

// Bin the passing events' observable into stacked signal / background arrays
// (weighted, scaled by lumi), for the stacked histogram.
export function binStacked(passing, observable, lumi = 1) {
  const { xmin, xmax, bins } = observable;
  const w = (xmax - xmin) / bins;
  const sig = new Array(bins).fill(0);
  const bkg = new Array(bins).fill(0);
  for (const ev of passing) {
    const v = ev.observable;
    if (v == null || v < xmin || v >= xmax) continue;
    const i = Math.floor((v - xmin) / w);
    if (ev.truth === 'signal') sig[i] += ev.weight * lumi; else bkg[i] += ev.weight * lumi;
  }
  return { sig, bkg, xmin, xmax, bins };
}

// Discovery-confidence label from significance (particle-physics convention).
export function confidenceLabel(sig) {
  if (sig >= 5) return { text: 'Discovery (5σ+)', tone: 'good' };
  if (sig >= 3) return { text: 'Evidence (3σ)', tone: 'mid' };
  if (sig >= 2) return { text: 'Hint (2σ)', tone: 'mid' };
  return { text: 'No signal yet', tone: 'bad' };
}

// --- DOM: cut controls -------------------------------------------------------

// Render the cut panel. `onChange` fires after any state change.
export function renderCuts(container, mission, states, onChange) {
  container.innerHTML = '';
  for (const cut of mission.cuts) {
    const st = states[cut.id];
    const row = document.createElement('div');
    row.className = 'cut-row' + (st.enabled ? ' cut-on' : '');

    // Enable switch (label acts as the toggle).
    const head = document.createElement('label');
    head.className = 'cut-head';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = st.enabled;
    box.addEventListener('change', () => {
      st.enabled = box.checked;
      row.classList.toggle('cut-on', st.enabled);
      valWrap.style.display = st.enabled && cut.kind !== 'toggle' ? '' : 'none';
      onChange();
    });
    const name = document.createElement('span');
    name.className = 'cut-name';
    name.textContent = cut.label + (cut.kind !== 'toggle' ? ` ${fmt(st.value, cut.unit)}` : '');
    head.appendChild(box);
    head.appendChild(name);
    row.appendChild(head);

    // Slider (min/max/window cuts only).
    const valWrap = document.createElement('div');
    valWrap.className = 'cut-slider';
    valWrap.style.display = st.enabled && cut.kind !== 'toggle' ? '' : 'none';
    if (cut.kind !== 'toggle') {
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = cut.min; slider.max = cut.max; slider.step = cut.step;
      slider.value = st.value;
      slider.addEventListener('input', () => {
        st.value = parseFloat(slider.value);
        name.textContent = `${cut.label} ${fmt(st.value, cut.unit)}`;
        onChange();
      });
      valWrap.appendChild(slider);
    }
    row.appendChild(valWrap);

    const hint = document.createElement('p');
    hint.className = 'cut-hint';
    hint.textContent = cut.hint;
    row.appendChild(hint);

    container.appendChild(row);
  }
}

function fmt(v, unit) {
  if (v == null) return '';
  const n = Number.isInteger(v) ? v : v.toFixed(2);
  return `${n}${unit ? ' ' + unit : ''}`;
}

// --- DOM: metrics dashboard --------------------------------------------------

export function renderMetrics(container, result, mission) {
  container.innerHTML = '';
  const conf = confidenceLabel(result.significance);
  const targetPct = Math.min(100, (result.significance / mission.target) * 100);

  const grid = document.createElement('div');
  grid.className = 'metric-grid';
  grid.appendChild(metric('Signal kept', pct(result.sigEff), 'good'));
  grid.appendChild(metric('Background kept', pct(result.bkgEff), 'bad'));
  grid.appendChild(metric('Signal / Bkg', `${Math.round(result.S)} / ${Math.round(result.B)}`, 'mid'));
  grid.appendChild(metric('Purity', pct(result.purity), 'mid'));
  container.appendChild(grid);

  // Significance meter.
  const sigWrap = document.createElement('div');
  sigWrap.className = 'sig-wrap';
  sigWrap.innerHTML =
    `<div class="sig-top"><span>Significance</span>` +
    `<b class="sig-${conf.tone}">${result.significance.toFixed(1)}σ</b></div>` +
    `<div class="sig-bar"><i style="width:${targetPct}%"></i>` +
    `<span class="sig-target" style="left:100%">target ${mission.target}σ</span></div>` +
    `<div class="sig-label sig-${conf.tone}">${conf.text}</div>`;
  container.appendChild(sigWrap);
}

const pct = (x) => `${Math.round(x * 100)}%`;

function metric(label, value, tone) {
  const d = document.createElement('div');
  d.className = 'metric';
  d.innerHTML = `<span class="metric-label">${label}</span><b class="metric-val metric-${tone}">${value}</b>`;
  return d;
}
