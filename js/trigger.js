// trigger.js
// Chapter 5 — Trigger the Data
// The LHC delivers ~40 million bunch crossings per second; CMS can write ~1000
// events/s to disk. The trigger decides, in microseconds, what to keep.
//
// TRIGGERS is pure (no DOM) and is shared with events.js: every Analysis-Lab
// dataset is built from events that passed the mission's trigger — data that
// was never recorded cannot be analysed.

// Approximate HLT output rates (events/s written to disk) and which mission
// each path is designed for. `test` runs on computeFeatures() output.
export const TRIGGERS = [
  {
    id: 'doubleMuon',
    label: 'Double-muon trigger',
    requires: 'two muons, leading pT > 17 GeV',
    desc: 'Two muon candidates above threshold. The natural choice for dimuon resonances — both muons from a Z decay fire it, and the rate stays tiny.',
    rateHz: 60,
    bestFor: ['z-mumu'],
    test: (f) => f.nMuons >= 2 && f.leadMuonPt > 17,
  },
  {
    id: 'singleMuon',
    label: 'Single-muon trigger',
    requires: 'one isolated muon, pT > 24 GeV',
    desc: 'One energetic muon. The workhorse for W → μν and for tt̄ → μ + jets — anything with one hard muon from a W decay.',
    rateHz: 250,
    bestFor: ['w-munu', 'top-lj'],
    test: (f) => f.nMuons >= 1 && f.leadMuonPt > 24,
  },
  {
    id: 'doublePhoton',
    label: 'Diphoton trigger',
    requires: 'two photons, leading pT > 30 GeV',
    desc: 'Two high-energy electromagnetic clusters. This is the H → γγ discovery path — the 2012 Higgs events were recorded by exactly this kind of trigger.',
    rateHz: 30,
    bestFor: ['higgs-gg'],
    test: (f) => f.nPhotons >= 2 && f.leadPhotonPt > 30,
  },
  {
    id: 'doubleTau',
    label: 'Di-tau trigger',
    requires: 'two hadronic tau candidates',
    desc: 'Two narrow hadronic-tau candidates. Essential for H → ττ and HH → bbττ — but jets fake taus, so the recorded sample is far from pure.',
    rateHz: 50,
    bestFor: ['hh-bbtautau'],
    test: (f) => f.nTaus >= 2,
  },
  {
    id: 'jetMET',
    label: 'Jets + MET trigger',
    requires: '≥ 2 jets and missing pT > 30 GeV',
    desc: 'Several jets plus significant missing energy. Used for SUSY and dark-matter searches, where invisible particles recoil against jets.',
    rateHz: 150,
    bestFor: [],
    test: (f) => f.nJetsTotal >= 2 && f.met > 30,
  },
  {
    id: 'minBias',
    label: 'Minimum bias (keep everything)',
    requires: 'any collision',
    desc: 'Record every bunch crossing. At 40 MHz this is physically impossible to store — minimum-bias data is taken only in tiny prescaled doses for calibration.',
    rateHz: 40e6,
    bestFor: [],
    test: () => true,
  },
];

export function getTrigger(id) {
  return TRIGGERS.find((t) => t.id === id) || null;
}

// Storage estimate: ~1.5 MB/event × ~5×10⁶ s of stable beams per year.
function storagePerYear(rateHz) {
  const pb = (rateHz * 1.5e6 * 5e6) / 1e15;
  if (pb >= 1000) return `${Math.round(pb).toLocaleString('en-US')} PB — impossible`;
  if (pb >= 10) return `${Math.round(pb)} PB`;
  return `${pb.toFixed(2)} PB`;
}

const rateLabel = (hz) =>
  hz >= 1e6 ? `${(hz / 1e6).toFixed(0)} MHz` : hz >= 1000 ? `${(hz / 1000).toFixed(0)} kHz` : `${hz} Hz`;

// Log-scale bar width so 60 Hz and 40 MHz fit on one axis.
const rateBarPct = (hz) => Math.min(100, Math.max(6, (Math.log10(hz / 10) / Math.log10(4e6)) * 100));

// --- Chapter 5 UI --------------------------------------------------------------

let _container, _onComplete;
let _chosen = null;

// startTrigger(container, { onComplete, context, contextLabel, sampleFeatures })
//   context        : mission id the choice is being made for (default z-mumu)
//   contextLabel   : human-readable channel name, e.g. 'Z → μμ'
//   sampleFeatures : (n) => [features] — n simulated SIGNAL events for the
//                    context mission, so each card can show a MEASURED signal
//                    efficiency instead of a made-up number.
export function startTrigger(container, opts) {
  _container = container;
  _onComplete = opts.onComplete || (() => {});
  _chosen = null;
  renderMenu(opts.context || 'z-mumu', opts.contextLabel || 'Z → μμ', opts.sampleFeatures || null);
}

export function getChosenTrigger() {
  return _chosen;
}

function measuredEff(trigger, samples) {
  if (!samples || !samples.length) return null;
  let pass = 0;
  for (const f of samples) if (trigger.test(f)) pass++;
  return pass / samples.length;
}

function renderMenu(context, contextLabel, sampleFeatures) {
  const samples = sampleFeatures ? sampleFeatures(80) : null;

  _container.innerHTML = `
    <h2>Choose Your Trigger</h2>
    <p class="muted">The LHC delivers <b>40 million</b> bunch crossings per second; CMS can afford
    to write about <b>a thousand</b> of them to disk. The trigger decides in microseconds which
    events are kept — everything else is gone forever. Your analysis is <b>${contextLabel}</b>:
    which trigger strategy records it?</p>
    <div id="trigger-grid" class="trigger-grid"></div>
    <div id="trigger-result" class="trigger-result" hidden></div>
  `;

  const grid = _container.querySelector('#trigger-grid');

  for (const t of TRIGGERS) {
    const eff = measuredEff(t, samples);
    const card = document.createElement('button');
    card.className = 'trigger-card panel';
    card.dataset.id = t.id;
    card.innerHTML = `
      <div class="trigger-head"><b>${t.label}</b></div>
      <div class="trigger-req small">${t.requires}</div>
      <div class="trigger-desc muted small">${t.desc}</div>
      <div class="trigger-stats">
        <span class="trigger-stat"><span class="muted small">Output rate</span><i class="trigger-bar" style="width:${rateBarPct(t.rateHz)}%"></i><b>${rateLabel(t.rateHz)}</b></span>
        ${eff != null ? `<span class="trigger-stat"><span class="muted small">Signal recorded</span><i class="trigger-bar trigger-bar-sig" style="width:${eff * 100}%"></i><b>${Math.round(eff * 100)}%</b></span>` : ''}
      </div>
    `;
    card.addEventListener('click', () => {
      grid.querySelectorAll('.trigger-card').forEach((c) => c.classList.remove('trigger-sel'));
      card.classList.add('trigger-sel');
      _chosen = t.id;
      showResult(t, context, contextLabel, measuredEff(t, samples));
    });
    grid.appendChild(card);
  }
}

function showResult(trigger, context, contextLabel, eff) {
  const result = _container.querySelector('#trigger-result');
  result.hidden = false;

  const recommended = TRIGGERS.find((t) => t.bestFor.includes(context)) || null;
  const isGood = recommended && trigger.id === recommended.id;
  const impossible = trigger.rateHz > 100000;
  const losesSignal = eff != null && eff < 0.5;

  let feedback, tone;
  if (isGood) {
    tone = 'good';
    feedback = `✓ Excellent choice. The ${trigger.label.toLowerCase()} records ${contextLabel} events efficiently at a rate the storage system can handle — this is the strategy the real CMS uses for this channel.`;
  } else if (impossible) {
    tone = 'bad';
    feedback = `⚠ Recording everything sounds safe, but 40 MHz × 1.5 MB/event is petabytes per hour — no storage system on Earth keeps up. That is exactly why the trigger exists.`;
  } else if (losesSignal) {
    tone = 'bad';
    feedback = `⚠ This trigger records only ${Math.round(eff * 100)}% of your ${contextLabel} signal. Events the trigger rejects are gone forever — no offline cut can recover them.`;
  } else {
    tone = 'bad';
    feedback = recommended
      ? `This would record some signal, but the ${recommended.label.toLowerCase()} is designed for ${contextLabel}: higher signal efficiency at an affordable rate.`
      : `This trigger works, but it is not designed for ${contextLabel} — its rate budget is spent on events you will never use.`;
  }

  const canProceed = isGood;
  result.innerHTML = `
    <div class="feedback feedback-${tone}">${feedback}</div>
    <div class="trigger-impact">
      <h3>What this choice means</h3>
      <div class="trigger-impact-grid">
        ${eff != null ? `<div class="trigger-impact-item"><span class="muted small">Signal recorded</span><b>${Math.round(eff * 100)}%</b></div>` : ''}
        <div class="trigger-impact-item"><span class="muted small">Output rate</span><b>${rateLabel(trigger.rateHz)}</b></div>
        <div class="trigger-impact-item"><span class="muted small">Storage / year</span><b>${storagePerYear(trigger.rateHz)}</b></div>
        <div class="trigger-impact-item"><span class="muted small">Recommended</span><b>${recommended ? recommended.label : '—'}</b></div>
      </div>
    </div>
    <div class="trigger-fact">
      <p class="muted small">⚡ Real CMS: the Level-1 trigger (custom hardware) decides in under 4 μs,
      cutting 40 MHz to ~100 kHz; the High-Level Trigger (software) reduces that to ~1–2 kHz for storage.</p>
    </div>
    <div class="brief-actions" style="margin-top:12px">
      <button class="btn btn-primary btn-big" id="trigger-continue">${canProceed ? 'Continue with this trigger →' : (recommended ? `Switch to the ${recommended.label.toLowerCase()} →` : 'Continue →')}</button>
    </div>
  `;

  result.querySelector('#trigger-continue').addEventListener('click', () => {
    // A bad choice is a lesson, not a trap: the run proceeds with the trigger
    // that actually records the channel, so later missions stay winnable.
    if (!canProceed && recommended) _chosen = recommended.id;
    _onComplete?.();
  });
}
