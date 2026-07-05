// trigger.js
// Chapter 5 — Trigger the Data
// Teaches how the CMS trigger system selects which collision events to keep.
// Player chooses a trigger strategy for the Z→μμ analysis and sees the
// rate/efficiency trade-off. The chosen trigger is applied to the dataset.

const TRIGGERS = [
  {
    id: 'doubleMuon',
    label: 'Double-muon trigger',
    desc: 'Require two muon candidates above pT thresholds (17, 8 GeV). The natural choice for Z→μμ — both muons from the Z decay pass and the rate stays manageable.',
    rate: 15,
    signalEff: 0.92,
    bkgEff: 0.08,
    bestFor: 'z-mumu',
    test: (f) => f.nMuons >= 2 && f.leadMuonPt > 17,
  },
  {
    id: 'singleMuon',
    label: 'Single-muon trigger',
    desc: 'Require one muon above 24 GeV. Good for W→μν and general muon physics. Higher rate but catches more events.',
    rate: 45,
    signalEff: 0.97,
    bkgEff: 0.25,
    bestFor: 'w-munu',
    test: (f) => f.nMuons >= 1 && f.leadMuonPt > 24,
  },
  {
    id: 'doublePhoton',
    label: 'Diphoton trigger',
    desc: 'Two photons above 30 and 18 GeV. Perfect for H→γγ — selects events with two high-energy photons.',
    rate: 5,
    signalEff: 0.88,
    bkgEff: 0.04,
    bestFor: 'higgs-gg',
    test: (f) => f.nPhotons >= 2 && f.leadPhotonPt > 30,
  },
  {
    id: 'jetMET',
    label: 'Jets + MET trigger',
    desc: 'Several jets plus significant missing energy. Used for tt̄ and SUSY searches.',
    rate: 25,
    signalEff: 0.85,
    bkgEff: 0.15,
    bestFor: 'top-lj',
    test: (f) => f.nJets >= 2 && f.met > 30,
  },
  {
    id: 'minBias',
    label: 'Minimum bias',
    desc: 'Records almost everything — but at 40 MHz collision rate, the data volume is impossible to store. Used only for calibration.',
    rate: 100,
    signalEff: 1.0,
    bkgEff: 1.0,
    bestFor: null,
    test: () => true,
  },
];

let _container, _onComplete;
let _chosen = null;

// --- public API ---------------------------------------------------------------

export function startTrigger(container, { onComplete, context = 'z-mumu' }) {
  _container = container;
  _onComplete = onComplete || (() => {});
  _chosen = null;
  renderMenu(context);
}

// Get the chosen trigger ID (for external use).
export function getChosenTrigger() {
  return _chosen;
}

// Get a trigger by ID.
export function getTrigger(id) {
  return TRIGGERS.find(t => t.id === id) || null;
}

// --- trigger menu -------------------------------------------------------------

function renderMenu(context) {
  _container.innerHTML = `
    <h2>Choose Your Trigger</h2>
    <p class="muted">The LHC delivers 40 million bunch crossings per second. CMS cannot store them all — the <b>trigger system</b> decides in microseconds which events to keep. For your analysis (${context.replace('-', '→')}), which trigger strategy would you choose?</p>
    <div id="trigger-grid" class="trigger-grid"></div>
    <div id="trigger-result" class="trigger-result" hidden></div>
  `;

  const grid = document.getElementById('trigger-grid');

  for (const t of TRIGGERS) {
    const card = document.createElement('button');
    card.className = 'trigger-card panel';
    card.dataset.id = t.id;
    card.innerHTML = `
      <div class="trigger-head"><b>${t.label}</b></div>
      <div class="trigger-desc muted small">${t.desc}</div>
      <div class="trigger-stats">
        <span class="trigger-stat"><span class="muted small">Rate</span><i class="trigger-bar" style="width:${t.rate}%"></i><b>${t.rate} kHz</b></span>
        <span class="trigger-stat"><span class="muted small">Signal kept</span><i class="trigger-bar trigger-bar-sig" style="width:${t.signalEff * 100}%"></i><b>${Math.round(t.signalEff * 100)}%</b></span>
      </div>
    `;

    card.addEventListener('click', () => {
      grid.querySelectorAll('.trigger-card').forEach(c => c.classList.remove('trigger-sel'));
      card.classList.add('trigger-sel');
      _chosen = t.id;
      showResult(t, context);
    });
    grid.appendChild(card);
  }
}

function showResult(trigger, context) {
  const result = document.getElementById('trigger-result');
  result.hidden = false;

  const best = TRIGGERS.find(t => t.bestFor === context);
  const isBest = trigger.id === best?.id;

  let feedback;
  if (isBest) {
    feedback = '✓ Excellent choice! The ' + trigger.label + ' selects both muons from Z decays efficiently while keeping the rate manageable. This is exactly what CMS uses for dimuon analyses.';
  } else if (trigger.rate > 60) {
    feedback = '⚠ This trigger accepts too many events — the data storage system would be overwhelmed. Most LHC events are not interesting for your analysis.';
  } else if (trigger.signalEff < 0.5) {
    feedback = '⚠ This trigger throws away most of your signal. You need a trigger that efficiently selects Z→μμ events.';
  } else {
    feedback = 'This trigger would work, but ' + best.label + ' is more efficient for Z→μμ. It has higher signal efficiency at a lower rate.';
  }

  result.innerHTML = `
    <div class="feedback feedback-${isBest ? 'good' : (trigger.rate > 60 ? 'bad' : 'bad')}">${feedback}</div>
    <div class="trigger-fact">
      <p class="muted small">⚡ Real CMS fact: The Level-1 trigger uses custom hardware to make a decision in under 4 microseconds, reducing the rate from 40 MHz to 100 kHz. The High-Level Trigger (software) then further reduces it to ~1 kHz for storage.</p>
    </div>
    <div class="trigger-impact">
      <h3>Impact on Your Analysis</h3>
      <div class="trigger-impact-grid">
        <div class="trigger-impact-item"><span class="muted small">Signal kept</span><b>${Math.round(trigger.signalEff * 100)}%</b></div>
        <div class="trigger-impact-item"><span class="muted small">Background rejected</span><b>${Math.round((1 - trigger.bkgEff) * 100)}%</b></div>
        <div class="trigger-impact-item"><span class="muted small">Data rate</span><b>${trigger.rate} kHz</b></div>
        <div class="trigger-impact-item"><span class="muted small">Storage/yr</span><b>${(trigger.rate * 365.25 * 86400 / 1e9).toFixed(1)} PB</b></div>
      </div>
    </div>
    <div class="brief-actions" style="margin-top:12px">
      <button class="btn btn-primary btn-big" id="trigger-continue">Continue →</button>
    </div>
  `;

  document.getElementById('trigger-continue').addEventListener('click', () => _onComplete?.());
}

export { TRIGGERS };
