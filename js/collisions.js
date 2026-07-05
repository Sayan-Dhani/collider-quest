// collisions.js
// Chapter 2 — First Collisions
// Teaches the four LHC experiments, luminosity, and pileup before the
// player enters the full LHC map.

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

// --- state -------------------------------------------------------------------

let _container, _onComplete;
let _section = 1; // 1 = experiments, 2 = luminosity, 3 = done
let _clickedExps = new Set();

// --- public API --------------------------------------------------------------

export function startCollisions(container, { onComplete }) {
  _container = container;
  _onComplete = onComplete || (() => {});
  _section = 1;
  _clickedExps = new Set();
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

// --- Section 2: Luminosity & Pileup ------------------------------------------

function renderSection2() {
  _container.innerHTML = '';
  _section = 2;

  const h = document.createElement('h2');
  h.textContent = 'Luminosity, Pileup & Trigger';
  _container.appendChild(h);

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
  `;
  _container.appendChild(bars);

  // Explanation text.
  const explain = document.createElement('div');
  explain.className = 'coll-explain';
  explain.id = 'coll-explain';
  explain.textContent = 'Low luminosity: clean events, few pileup collisions — but rare signals may take years to appear.';
  _container.appendChild(explain);

  const p2 = document.createElement('p');
  p2.className = 'muted';
  p2.textContent = 'With high luminosity comes more data — but also more pileup, which makes event reconstruction harder. Real LHC runs balance these factors carefully. The trigger system decides which ~1000 out of 40 million events per second to save for analysis.';
  _container.appendChild(p2);

  slider.addEventListener('input', () => {
    const v = parseInt(slider.value);
    const frac = v / 10;
    const signalPct = Math.round(2 + frac * 38);
    const pileupPct = Math.round(frac * 80);
    document.getElementById('signal-bar').style.width = signalPct + '%';
    document.getElementById('pileup-bar').style.width = pileupPct + '%';

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
