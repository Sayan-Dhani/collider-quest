// collisions.js
// Chapter 2 — First Collisions
// Teaches the four LHC experiments, luminosity, pileup, and collision types
// before the player enters the full LHC map.

const EXPERIMENTS = [
  {
    id: 'cms',
    name: 'CMS',
    role: 'General-purpose',
    color: '#4da6ff',
    detail: 'A compact, general-purpose detector designed to study Higgs bosons, top quarks, and search for new physics. Its solenoid produces a 3.8 T magnetic field. CMS and ATLAS independently cross-check each other\'s discoveries.',
  },
  {
    id: 'atlas',
    name: 'ATLAS',
    role: 'General-purpose',
    color: '#ff8a3d',
    detail: 'The largest-volume particle detector ever built (44 m long, 25 m tall). ATLAS is the other general-purpose experiment — it discovered the Higgs alongside CMS in 2012 using complementary technology.',
  },
  {
    id: 'alice',
    name: 'ALICE',
    role: 'Heavy-ion',
    color: '#c98bff',
    detail: 'Built to study lead–lead collisions, where the extreme energy density creates a quark–gluon plasma — a droplet of the matter that filled the early universe microseconds after the Big Bang.',
  },
  {
    id: 'lhcb',
    name: 'LHCb',
    role: 'Flavour physics',
    color: '#5be08a',
    detail: 'A forward spectrometer studying b- and c-quarks. LHCb probes why the universe is made of matter, not antimatter — one of the biggest open questions in physics.',
  },
];

const COLLISION_TYPES = [
  {
    id: 'pp',
    label: 'Proton–proton (pp)',
    icon: '⊕',
    energy: '13.6 TeV',
    lumiMax: 2e34,
    desc: 'The standard LHC running mode. Protons collide at the full centre-of-mass energy, producing Higgs bosons, top quarks, and searching for new physics.',
    experiments: ['CMS', 'ATLAS', 'LHCb'],
  },
  {
    id: 'pbpb',
    label: 'Lead–lead (PbPb)',
    icon: '⊛',
    energy: '5.36 TeV per nucleon pair',
    lumiMax: 1e27,
    desc: 'Heavy-ion collisions create a quark–gluon plasma — hot, dense matter where quarks and gluons are deconfined. This is the state of the universe microseconds after the Big Bang.',
    experiments: ['CMS', 'ATLAS', 'ALICE'],
  },
];

// --- state -------------------------------------------------------------------

let _container, _onComplete;
let _section = 1; // 1 = experiments, 2 = collision type, 3 = luminosity, 4 = done
let _clickedExps = new Set();
let _chosenType = null;

// --- public API --------------------------------------------------------------

export function startCollisions(container, { onComplete }) {
  _container = container;
  _onComplete = onComplete || (() => {});
  _section = 1;
  _clickedExps = new Set();
  _chosenType = null;
  renderSection1();
}

// --- Section 1: The Four Experiments -----------------------------------------

function renderSection1() {
  _container.innerHTML = '';
  _section = 1;

  const h = document.createElement('h2');
  h.textContent = 'Four Experiments, One Ring';
  _container.appendChild(h);

  const intro = document.createElement('p');
  intro.className = 'muted';
  intro.textContent = 'The LHC has four main detectors at four collision points around the 27 km ring. Each is optimised for different physics. Click each experiment to learn about it.';
  _container.appendChild(intro);

  const grid = document.createElement('div');
  grid.className = 'exp-grid';

  for (const e of EXPERIMENTS) {
    const card = document.createElement('button');
    card.className = 'exp-card';
    card.style.setProperty('--exp-color', e.color);
    card.innerHTML = `
      <div class="exp-card-head"><span class="exp-badge" style="background:${e.color}"></span><b>${e.name}</b><span class="muted small">${e.role}</span></div>
      <div class="exp-card-body" hidden><p>${e.detail}</p><span class="muted small">✓ Clicked</span></div>
    `;
    const body = card.querySelector('.exp-card-body');
    card.addEventListener('click', () => {
      if (_clickedExps.has(e.id)) return;
      _clickedExps.add(e.id);
      body.hidden = false;
      card.classList.add('exp-card-done');
      if (_clickedExps.size >= EXPERIMENTS.length) {
        setTimeout(renderSection2, 600);
      }
    });
    grid.appendChild(card);
  }
  _container.appendChild(grid);

  const prog = document.createElement('p');
  prog.className = 'chain-status';
  prog.id = 'exp-progress';
  _container.appendChild(prog);
  updateExpProgress();
}

function updateExpProgress() {
  const p = document.getElementById('exp-progress');
  if (!p) return;
  p.textContent = `Experiments explored: ${_clickedExps.size} / ${EXPERIMENTS.length}`;
}

// --- Section 2: Collision Type -----------------------------------------------

function renderSection2() {
  _container.innerHTML = '';
  _section = 2;

  const h = document.createElement('h2');
  h.textContent = 'Choose Your Collision Type';
  _container.appendChild(h);

  const p1 = document.createElement('p');
  p1.className = 'muted';
  p1.textContent = 'The LHC can collide different particles. Proton–proton collisions are the standard mode for most physics; heavy-ion collisions create extreme conditions for studying the strong force.';
  _container.appendChild(p1);

  const grid = document.createElement('div');
  grid.className = 'coll-type-grid';

  for (const ct of COLLISION_TYPES) {
    const card = document.createElement('button');
    card.className = 'panel coll-type-card';
    card.innerHTML = `
      <div class="coll-type-head"><span class="coll-type-icon">${ct.icon}</span><b>${ct.label}</b></div>
      <div class="coll-type-energy muted small">Energy: ${ct.energy}</div>
      <div class="coll-type-desc muted small">${ct.desc}</div>
      <div class="coll-type-exps muted small">Experiments: ${ct.experiments.join(', ')}</div>
    `;
    card.addEventListener('click', () => {
      grid.querySelectorAll('.coll-type-card').forEach(c => c.classList.remove('coll-type-sel'));
      card.classList.add('coll-type-sel');
      _chosenType = ct.id;
      setTimeout(() => renderSection3(ct.id), 600);
    });
    grid.appendChild(card);
  }
  _container.appendChild(grid);
}

// --- Section 3: Luminosity & Pileup ------------------------------------------

function renderSection3(chosenType) {
  _container.innerHTML = '';
  _section = 3;

  const h = document.createElement('h2');
  h.textContent = 'Luminosity, Pileup & Detector Readiness';
  _container.appendChild(h);

  if (chosenType === 'pbpb') {
    const note = document.createElement('div');
    note.className = 'feedback feedback-good';
    note.textContent =
      'Lead–lead it is — the quark–gluon plasma campaign is coming in a future update. ' +
      'For now the machine runs protons, so you can learn the discovery workflow first.';
    _container.appendChild(note);
  }

  const p1 = document.createElement('p');
  p1.className = 'muted';
  p1.textContent = 'Luminosity measures how many particle collisions happen per second in a detector. Higher luminosity means more data — but also more pileup (multiple collisions in the same bunch crossing).';
  _container.appendChild(p1);

  // Luminosity slider.
  const sliderWrap = document.createElement('div');
  sliderWrap.className = 'coll-slider-wrap';

  const sliderLabel = document.createElement('div');
  sliderLabel.className = 'coll-slider-label';
  sliderLabel.innerHTML = '<span>Luminosity</span>';
  sliderWrap.appendChild(sliderLabel);

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = 1;
  slider.max = 10;
  slider.step = 1;
  slider.value = 1;
  slider.className = 'chain-slider';
  sliderWrap.appendChild(slider);

  const lumiVal = document.createElement('span');
  lumiVal.className = 'coll-slider-val';
  lumiVal.textContent = 'Low';
  sliderWrap.appendChild(lumiVal);

  _container.appendChild(sliderWrap);

  // Visual bars for signal vs pileup.
  const bars = document.createElement('div');
  bars.className = 'coll-bars';
  bars.innerHTML = `
    <div class="coll-bar-row"><span class="coll-bar-label">Rare signals</span><div class="coll-bar-track"><i id="signal-bar" class="coll-bar-fill coll-bar-signal" style="width:10%"></i></div></div>
    <div class="coll-bar-row"><span class="coll-bar-label">Pileup level</span><div class="coll-bar-track"><i id="pileup-bar" class="coll-bar-fill coll-bar-pileup" style="width:5%"></i></div></div>
    <div class="coll-bar-row"><span class="coll-bar-label">Data rate</span><div class="coll-bar-track"><i id="rate-bar" class="coll-bar-fill coll-bar-rate" style="width:5%"></i></div></div>
  `;
  _container.appendChild(bars);

  // Explanation text.
  const explain = document.createElement('div');
  explain.className = 'coll-explain';
  explain.id = 'coll-explain';
  explain.textContent = 'Low luminosity: clean events, few pileup collisions — but rare signals may take years to appear.';
  _container.appendChild(explain);

  // Detector readiness panel.
  const detReady = document.createElement('div');
  detReady.className = 'coll-det-ready';
  detReady.innerHTML = `
    <h3>Detector Readiness</h3>
    <div class="coll-det-items">
      <div class="coll-det-item"><span class="coll-det-status coll-det-on">●</span>Tracker</div>
      <div class="coll-det-item"><span class="coll-det-status coll-det-on">●</span>ECAL</div>
      <div class="coll-det-item"><span class="coll-det-status coll-det-on">●</span>HCAL</div>
      <div class="coll-det-item"><span class="coll-det-status coll-det-on">●</span>Muon</div>
      <div class="coll-det-item"><span class="coll-det-status coll-det-on">●</span>Trigger</div>
      <div class="coll-det-item"><span class="coll-det-status coll-det-off">●</span>Data</div>
    </div>
  `;
  _container.appendChild(detReady);

  // Trigger bandwidth indicator.
  const trigInfo = document.createElement('div');
  trigInfo.className = 'coll-trig-info';
  trigInfo.id = 'coll-trig-info';
  trigInfo.innerHTML = `
    <div class="coll-trig-label">Trigger load</div>
    <div class="coll-trig-bar"><i id="trig-bar" class="coll-bar-fill coll-bar-trig" style="width:10%"></i></div>
    <div class="coll-trig-val muted small" id="trig-val">collisions: ~4 MHz → recorded: ~1 kHz</div>
  `;
  _container.appendChild(trigInfo);

  const p2 = document.createElement('p');
  p2.className = 'muted';
  p2.textContent = 'With high luminosity comes more data — but also more pileup, which makes event reconstruction harder. The trigger system decides which ~1000 out of 40 million events per second to save for analysis.';
  _container.appendChild(p2);

  slider.addEventListener('input', () => {
    const v = parseInt(slider.value);
    const frac = v / 10;
    const signalPct = Math.round(2 + frac * 38);
    const pileupPct = Math.round(frac * 80);
    const ratePct = Math.round(frac * 90);
    document.getElementById('signal-bar').style.width = signalPct + '%';
    document.getElementById('pileup-bar').style.width = pileupPct + '%';
    document.getElementById('rate-bar').style.width = ratePct + '%';

    // The recorded rate is FIXED by storage (~1 kHz) — what grows with
    // luminosity is the collision rate the trigger must sift through, i.e.
    // how selective it has to be.
    document.getElementById('trig-bar').style.width = ratePct + '%';
    const collMHz = (frac * 40).toFixed(0);
    const rejection = Math.max(1, Math.round((frac * 40e6) / 1000));
    document.getElementById('trig-val').textContent =
      `collisions: ~${collMHz} MHz → recorded: ~1 kHz (the trigger discards ${rejection.toLocaleString('en-US')} in every ${(rejection + 1).toLocaleString('en-US')})`;

    // Detector readiness: at very high lumi, data pipeline is stressed.
    const dataItem = detReady.querySelectorAll('.coll-det-item')[5];
    const dataStatus = dataItem.querySelector('.coll-det-status');
    if (v <= 4) {
      dataStatus.className = 'coll-det-status coll-det-on';
      dataStatus.textContent = '●';
    } else if (v <= 7) {
      dataStatus.className = 'coll-det-status coll-det-warn';
      dataStatus.textContent = '●';
    } else {
      dataStatus.className = 'coll-det-status coll-det-off';
      dataStatus.textContent = '●';
    }

    const labels = ['Low', 'Moderate', 'High', 'Very High', 'Ultra-high'];
    const lumiLabels = ['10³³', '2×10³³', '5×10³³', '10³⁴', '2×10³⁴'];
    const idx = Math.min(Math.floor(v / 2), 4);
    lumiVal.textContent = labels[idx] + ' (' + lumiLabels[idx] + ' cm⁻²s⁻¹)';

    const exp = document.getElementById('coll-explain');
    if (v <= 2) exp.textContent = 'Low luminosity: clean events, few pileup collisions — but rare signals may take years to appear.';
    else if (v <= 4) exp.textContent = 'Moderate luminosity: a good balance — enough data for most measurements with manageable pileup.';
    else if (v <= 6) exp.textContent = 'High luminosity: plenty of data! Pileup is noticeable — reconstructing events takes more care.';
    else if (v <= 8) exp.textContent = 'Very high luminosity: pileup dominates the event — finding the interesting collision is like looking for a needle in a haystack.';
    else exp.textContent = 'Ultra-high luminosity: 100+ pileup interactions per crossing. This is the HL-LHC regime — only the most robust detectors survive.';
  });

  // Proceed button.
  const btnWrap = document.createElement('div');
  btnWrap.className = 'brief-actions';
  btnWrap.style.marginTop = '16px';
  const btn = document.createElement('button');
  btn.className = 'btn btn-primary btn-big';
  btn.textContent = '✓ Enter the LHC →';
  btn.addEventListener('click', () => {
    _onComplete?.();
  });
  btnWrap.appendChild(btn);
  _container.appendChild(btnWrap);
}
