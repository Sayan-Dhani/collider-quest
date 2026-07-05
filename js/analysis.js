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

// Events (data or MC) passing every enabled cut.
export function filterPassing(mission, events, states) {
  return events.filter((ev) => passesAll(mission, ev.features, states));
}

// Core computation: signal/background yields before and after cuts, efficiencies
// and Asimov significance. `lumi` scales the expected yields (more integrated
// luminosity = more events = higher significance, ~sqrt(lumi)). Returns the
// passing events too (for the histogram).
export function computeResult(dataset, mission, states, lumi = 1) {
  let S = 0, B = 0, Stot = 0, Btot = 0;
  const passing = [];
  for (const ev of dataset) {
    if (ev.sampleType === 'data') continue; // prediction is built from MC only
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

// --- Data/MC binning ----------------------------------------------------------

// Bin the passing MC events per PROCESS (stacked in mission order, signal
// last so it sits on top), with a per-bin prediction uncertainty:
// MC statistics ⊕ a flat normalization systematic.
const NORM_SYST = 0.08; // 8% normalization uncertainty on the MC prediction
export function binByProcess(passingMC, mission, lumi = 1) {
  const { xmin, xmax, bins } = mission.observable;
  const w = (xmax - xmin) / bins;
  const order = [...mission.processes].sort((a, b) =>
    (a.kind === 'signal' ? 1 : 0) - (b.kind === 'signal' ? 1 : 0));
  const procs = order.map((p) => ({
    name: p.name, label: p.label ?? p.name, kind: p.kind, bins: new Array(bins).fill(0),
  }));
  const idx = new Map(procs.map((p, i) => [p.name, i]));
  const total = new Array(bins).fill(0);
  const w2 = new Array(bins).fill(0); // Σ weight² for MC statistical error
  for (const ev of passingMC) {
    const v = ev.observable;
    if (v == null || v < xmin || v >= xmax) continue;
    const b = Math.floor((v - xmin) / w);
    const wt = ev.weight * lumi;
    procs[idx.get(ev.processName)].bins[b] += wt;
    total[b] += wt;
    w2[b] += wt * wt;
  }
  const err = total.map((t, i) => Math.sqrt(w2[i] + (NORM_SYST * t) ** 2));
  return { procs, total, err, xmin, xmax, bins };
}

// Bin passing DATA events: integer counts, error = sqrt(N).
export function binDataCounts(passingData, observable) {
  const { xmin, xmax, bins } = observable;
  const w = (xmax - xmin) / bins;
  const counts = new Array(bins).fill(0);
  for (const ev of passingData) {
    const v = ev.observable;
    if (v == null || v < xmin || v >= xmax) continue;
    counts[Math.floor((v - xmin) / w)]++;
  }
  return counts;
}

// --- cutflow -------------------------------------------------------------------

// Sequential cutflow: starting from everything recorded by the trigger, apply
// the ENABLED cuts one after another (in the mission's listed order) and count
// expected signal, expected background, and observed data at each stage.
export function computeCutflow(mcEvents, dataEvents, mission, states, lumi = 1) {
  const active = [];
  const rows = [];
  const count = () => {
    let S = 0, B = 0, nData = 0;
    for (const ev of mcEvents) {
      if (ev.sampleType === 'data') continue;
      let pass = true;
      for (const c of active) if (!evalCut(c, ev.features, states[c.id])) { pass = false; break; }
      if (!pass) continue;
      if (ev.truth === 'signal') S += ev.weight * lumi; else B += ev.weight * lumi;
    }
    for (const ev of dataEvents) {
      let pass = true;
      for (const c of active) if (!evalCut(c, ev.features, states[c.id])) { pass = false; break; }
      if (pass) nData++;
    }
    return { S, B, nData };
  };
  rows.push({ label: 'Recorded by trigger', ...count() });
  for (const cut of mission.cuts) {
    if (!states[cut.id].enabled) continue;
    active.push(cut);
    rows.push({ label: cut.label, ...count() });
  }
  return rows;
}

// Marginal (N-1) impact of each ENABLED cut: of the signal/background that
// passes all the OTHER enabled cuts, what fraction does this cut remove?
// This is how analysts judge which selection is doing the work.
export function cutImpacts(dataset, mission, states) {
  const enabled = mission.cuts.filter((c) => states[c.id].enabled);
  const acc = {};
  for (const c of enabled) acc[c.id] = { sAll: 0, bAll: 0, sCut: 0, bCut: 0 };
  for (const ev of dataset) {
    if (ev.sampleType === 'data') continue;
    const passes = enabled.map((c) => evalCut(c, ev.features, states[c.id]));
    const nFail = passes.reduce((n, p) => n + (p ? 0 : 1), 0);
    if (nFail > 1) continue; // fails 2+ cuts: contributes to no N-1 sample
    for (let i = 0; i < enabled.length; i++) {
      if (nFail === 1 && passes[i]) continue; // the one failure is another cut
      const t = acc[enabled[i].id];
      if (ev.truth === 'signal') { t.sAll += ev.weight; if (!passes[i]) t.sCut += ev.weight; }
      else { t.bAll += ev.weight; if (!passes[i]) t.bCut += ev.weight; }
    }
  }
  const out = {};
  for (const c of enabled) {
    const t = acc[c.id];
    out[c.id] = {
      sigRemoved: t.sAll > 0 ? t.sCut / t.sAll : 0,
      bkgRemoved: t.bAll > 0 ? t.bCut / t.bAll : 0,
    };
  }
  return out;
}

// Discovery-confidence label from significance (particle-physics convention).
export function confidenceLabel(sig) {
  if (sig >= 5) return { text: 'Discovery (5σ+)', tone: 'good' };
  if (sig >= 3) return { text: 'Evidence (3σ)', tone: 'mid' };
  if (sig >= 2) return { text: 'Hint (2σ)', tone: 'mid' };
  return { text: 'No signal yet', tone: 'bad' };
}

// --- DOM: cut controls -------------------------------------------------------

// Render the cut panel. `onChange` fires after any state change. Returns a
// Map cutId -> element for the per-cut impact line, updated separately via
// renderCutImpacts (re-rendering whole rows would steal slider focus).
export function renderCuts(container, mission, states, onChange) {
  container.innerHTML = '';
  const impactEls = new Map();
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

    const impact = document.createElement('div');
    impact.className = 'cut-impact';
    row.appendChild(impact);
    impactEls.set(cut.id, impact);

    const hint = document.createElement('p');
    hint.className = 'cut-hint';
    hint.textContent = cut.hint;
    row.appendChild(hint);

    container.appendChild(row);
  }
  return impactEls;
}

// Fill each enabled cut's impact line ("what is this cut doing right now?").
export function renderCutImpacts(impactEls, impacts) {
  for (const [id, el] of impactEls) {
    const im = impacts[id];
    el.textContent = im
      ? `removes ${Math.round(im.bkgRemoved * 100)}% of background · ${Math.round(im.sigRemoved * 100)}% of signal`
      : '';
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
