// missions.js
// The campaign: a sequence of physics scenarios. Each mission defines its story,
// the observable it plots, the signal + background processes (with expected
// pre-cut yields), the selection cuts the player can apply, and a target
// discovery significance. New scenarios = new entries here; the Explorer and
// Analysis Lab are generic and driven entirely by this config.

// --- cut descriptor builders -------------------------------------------------
// A cut has: id, label, hint, kind, and parameters. The Analysis Lab holds the
// live state ({enabled, value}) and evaluates cuts via evalCut() below.

const toggle = (id, label, hint, test) => ({ id, label, hint, kind: 'toggle', test });

// Keep events with feature >= value (value is a slider).
const minCut = (id, label, hint, feature, o) =>
  ({ id, label, hint, kind: 'min', feature, min: o.min, max: o.max, step: o.step ?? 1, value: o.def, unit: o.unit ?? '' });

// Keep events with feature <= value.
const maxCut = (id, label, hint, feature, o) =>
  ({ id, label, hint, kind: 'max', feature, min: o.min, max: o.max, step: o.step ?? 1, value: o.def, unit: o.unit ?? '' });

// Keep events with |feature - center| <= value (a symmetric mass window).
const windowCut = (id, label, hint, feature, o) =>
  ({ id, label, hint, kind: 'window', feature, center: o.center, min: o.min, max: o.max, step: o.step ?? 1, value: o.def, unit: o.unit ?? 'GeV' });

// Evaluate a single cut against an event's features given its live state.
// Disabled cuts never reject. Returns true if the event PASSES.
export function evalCut(cut, features, state) {
  if (!state.enabled) return true;
  const v = features[cut.feature];
  switch (cut.kind) {
    case 'toggle': return !!cut.test(features);
    case 'min': return v != null && v >= state.value;
    case 'max': return v != null && v <= state.value;
    case 'window': return v != null && Math.abs(v - cut.center) <= state.value;
    default: return true;
  }
}

// --- the campaign ------------------------------------------------------------

export const MISSIONS = [
  {
    id: 'z-mumu',
    chapter: 'Chapter 6 · First Analysis',
    title: 'Rediscover the Z Boson',
    tagline: 'Z → μμ',
    difficulty: 'Beginner',
    story:
      'Before hunting for new physics, every experiment re-discovers what it ' +
      'already knows. Your first job is to pull the Z boson out of a flood of ' +
      'background: non-resonant Drell–Yan pairs, top decays, and QCD fakes all ' +
      'produce muon-like tracks. Apply the right criteria and a sharp peak at ' +
      '91 GeV should rise out of the noise — though some dimuon background sits ' +
      'right under the peak and can never be cut away.',
    lesson:
      'A Z boson decays instantly — we reconstruct it from two opposite-charge ' +
      'muons. Isolation, a b-jet veto and a mass window separate it from lookalikes.',
    targetNote:
      'The Z is produced in huge numbers, so this rediscovery is a calibration ' +
      'exercise — the bar sits far above the 5σ discovery convention.',
    observable: { name: 'Dimuon invariant mass', feature: 'dimuonMass', unit: 'GeV', xmin: 60, xmax: 120, bins: 30, target: 91.2 },
    explore: [
      { name: 'Z_mumu', label: 'signal: Z → μμ' },
      { name: 'ttbar_2mu', label: 'background: tt̄ → μμ + b-jets' },
      { name: 'QCD_fake', label: 'background: QCD fake muon' },
    ],
    processes: [
      { name: 'Z_mumu', kind: 'signal', expected: 900, label: 'Z→μμ' },
      { name: 'DY_continuum', kind: 'bkg', expected: 2600, label: 'Drell–Yan γ*' },
      { name: 'ttbar_2mu', kind: 'bkg', expected: 700, label: 'tt̄' },
      { name: 'QCD_fake', kind: 'bkg', expected: 5200, label: 'QCD multijet' },
    ],
    cuts: [
      toggle('twoMu', '≥ 2 muons', 'Require at least two muon candidates.', (f) => f.nMuons >= 2),
      toggle('os', 'Opposite charge', 'A Z is neutral: its muons have opposite charge.', (f) => f.oppositeCharge),
      minCut('muPt', 'Muon pT >', 'Reject soft fake muons.', 'leadMuonPt', { min: 0, max: 40, def: 20, unit: 'GeV' }),
      maxCut('muIso', 'Muon isolation <', 'Real muons are isolated; fakes sit inside jets.', 'muonIso', { min: 0.05, max: 1, step: 0.05, def: 0.5 }),
      toggle('bveto', 'b-jet veto', 'Remove tt̄ by rejecting b-tagged events (tagging catches ~70% of real b-jets).', (f) => f.nBjets === 0),
      maxCut('met', 'Missing pT <', 'Z events have little genuine missing energy.', 'met', { min: 0, max: 100, def: 60, unit: 'GeV' }),
      windowCut('mass', 'Mass window |m − 91| <', 'Focus on the Z resonance.', 'dimuonMass', { center: 91.2, min: 1, max: 30, def: 25 }),
    ],
    trigger: 'doubleMuon',
    concepts: ['invariant-mass', 'isolation', 'irreducible-bkg', 'data-vs-mc', 'ratio-panel', 'cutflow', 'rediscovery'],
    resultWord: 'Z boson rediscovered — detector validated!',
    // Guided-analysis steps for the Lab. A step with done(states, result,
    // mission) auto-advances when satisfied; a step without it shows "Got it".
    guide: [
      {
        title: 'The physics goal',
        text: 'The Z decays in ~10⁻²⁵ s — you will never see one. But it decays to μ⁺μ⁻, and the muons ARE visible: combine them and the Z appears as a peak at 91 GeV. On the plot: black points are DATA (recorded collisions — nobody knows which are signal), the coloured stack is SIMULATION (MC) of the signal and each background.',
      },
      {
        title: 'Your trigger already worked',
        text: 'This dataset exists because the double-muon trigger recorded it — see the blue note above the cuts. Everything the trigger rejected is gone forever; no offline cut can bring it back.',
      },
      {
        title: 'Select two opposite-charge muons',
        text: 'A Z is neutral, so it decays to μ⁺μ⁻. Enable “≥ 2 muons” and “Opposite charge”.',
        done: (st) => st.twoMu.enabled && st.os.enabled,
      },
      {
        title: 'Demand quality muons',
        text: 'Soft or non-isolated candidates are mostly jets faking muons. Enable the muon pT and isolation cuts — watch the QCD stack collapse in the plot.',
        done: (st) => st.muPt.enabled && st.muIso.enabled,
      },
      {
        title: 'Reject the reducible backgrounds',
        text: 'tt̄ also gives two muons — but WITH b-jets and real missing energy: enable the b-jet veto and the missing-pT cut. What survives under the peak is non-resonant Drell–Yan: the identical final state. That background is IRREDUCIBLE — you model it, you cannot cut it.',
        done: (st) => st.bveto.enabled && st.met.enabled,
      },
      {
        title: 'Zoom in with the mass window',
        text: 'The Z lives at 91.2 GeV. Enable the mass window and tighten it — but watch the significance: cut too deep and you throw away your own signal.',
        done: (st) => st.mass.enabled,
      },
      {
        title: 'Check Data against MC',
        text: 'Now the real test: in the bottom RATIO panel, the black points should sit on 1, inside the grey band — the simulation describes the data. Open the cutflow to see signal, background and data survive each cut. This agreement, not the peak alone, is what validates the detector.',
      },
      {
        title: 'Claim the rediscovery',
        text: 'Collect more luminosity if needed and claim once you clear the target. For the Z this is not a discovery — it is calibration: the peak position checks the muon momentum scale, the peak width measures the resolution.',
        done: (st, r, m) => !!r && r.significance >= m.target,
      },
    ],
    target: 18,
  },

  {
    id: 'w-munu',
    chapter: 'Chapter 7 · Beyond the Candle',
    title: 'The W and the Invisible Neutrino',
    tagline: 'W → μν',
    difficulty: 'Beginner',
    story:
      'The W boson decays to a muon and a neutrino. The neutrino escapes ' +
      'unseen — you only know it was there from the momentum imbalance ' +
      '(missing pT). There is no clean mass peak; instead the transverse mass ' +
      'piles up below the W mass in a "Jacobian edge".',
    lesson:
      'Neutrinos leave no trace. We infer them from missing transverse momentum, ' +
      'and reconstruct the W through the transverse mass mT — which can never ' +
      'exceed the W mass, so events pile up against a sharp edge instead of a peak.',
    targetNote:
      'Like the Z, the W is abundant at the LHC: this is a rediscovery ' +
      'measurement, so the bar is far above the 5σ discovery convention.',
    observable: { name: 'Transverse mass mT(μ, MET)', feature: 'mT', unit: 'GeV', xmin: 0, xmax: 120, bins: 30, target: 80.4 },
    explore: [
      { name: 'W_munu', label: 'signal: W → μν (muon + missing pT)' },
      { name: 'Z_mumu', label: 'background: Z → μμ (two muons)' },
      { name: 'QCD_fake', label: 'background: QCD fake muon' },
    ],
    processes: [
      { name: 'W_munu', kind: 'signal', expected: 1400, label: 'W→μν' },
      { name: 'QCD_fake', kind: 'bkg', expected: 9000, label: 'QCD multijet' },
      { name: 'Z_mumu', kind: 'bkg', expected: 1600, label: 'Z→μμ' },
      { name: 'ttbar_lj', kind: 'bkg', expected: 900, label: 'tt̄' },
    ],
    cuts: [
      toggle('oneMu', '≥ 1 muon', 'Require a muon candidate.', (f) => f.nMuons >= 1),
      toggle('secondVeto', 'Second-lepton veto', 'Reject Z → μμ by vetoing a second muon.', (f) => f.nMuons <= 1),
      minCut('muPt', 'Muon pT >', 'Reject soft fake muons.', 'leadMuonPt', { min: 0, max: 50, def: 25, unit: 'GeV' }),
      maxCut('muIso', 'Muon isolation <', 'Keep isolated muons; reject QCD fakes.', 'muonIso', { min: 0.05, max: 1, step: 0.05, def: 0.5 }),
      minCut('met', 'Missing pT >', 'The neutrino carries away real missing energy.', 'met', { min: 0, max: 80, def: 25, unit: 'GeV' }),
      toggle('bveto', 'b-jet veto', 'Suppress tt̄ background.', (f) => f.nBjets === 0),
    ],
    trigger: 'singleMuon',
    concepts: ['met', 'jacobian-mt'],
    resultWord: 'W boson rediscovered!',
    target: 20,
  },

  {
    id: 'higgs-gg',
    chapter: 'Chapter 7 · Beyond the Candle',
    title: 'The Higgs in Two Photons',
    tagline: 'H → γγ',
    difficulty: 'Intermediate',
    story:
      'The Higgs is rare, and H → γγ is a needle in a haystack: a smooth sea of ' +
      'ordinary diphoton events buries a tiny bump at 125 GeV. Photons that are ' +
      'really jets sneak in too. Expect to see nothing at first — sharpen your ' +
      'selection until a small, unmistakable excess appears over the falling ' +
      'background.',
    lesson:
      'A discovery often appears as a small excess above a smooth background. ' +
      'Isolation rejects jets faking photons; the rest is patience and statistics.',
    targetNote:
      '5σ is the discovery convention — the same bar the real H → γγ search ' +
      'cleared in July 2012.',
    observable: { name: 'Diphoton invariant mass', feature: 'diphotonMass', unit: 'GeV', xmin: 80, xmax: 180, bins: 40, target: 125 },
    explore: [
      { name: 'H_gg', label: 'signal: H → γγ (two isolated photons)' },
      { name: 'gg_continuum', label: 'background: continuum γγ' },
      { name: 'gamma_jet', label: 'background: γ + jet (fake photon)' },
    ],
    processes: [
      { name: 'H_gg', kind: 'signal', expected: 190, label: 'H→γγ' },
      { name: 'gg_continuum', kind: 'bkg', expected: 6000, label: 'γγ continuum' },
      { name: 'gamma_jet', kind: 'bkg', expected: 4200, label: 'γ + jet' },
    ],
    cuts: [
      toggle('twoGamma', '≥ 2 photons', 'Require two photon candidates.', (f) => f.nPhotons >= 2),
      minCut('gPt', 'Photon pT >', 'Higgs photons are energetic.', 'leadPhotonPt', { min: 0, max: 80, def: 40, unit: 'GeV' }),
      maxCut('gIso', 'Photon isolation <', 'Reject jets faking photons.', 'photonIso', { min: 0.05, max: 1, step: 0.05, def: 0.5 }),
      windowCut('mass', 'Mass window |m − 125| <', 'Zoom in on the Higgs region.', 'diphotonMass', { center: 125, min: 1, max: 40, def: 30 }),
    ],
    trigger: 'doublePhoton',
    concepts: ['significance', 'five-sigma'],
    target: 5,
  },

  {
    id: 'top-lj',
    chapter: 'Chapter 7 · Beyond the Candle',
    title: 'Top Quarks and b-Tagging',
    tagline: 'tt̄ → ℓ + jets',
    difficulty: 'Intermediate',
    story:
      'Top quarks almost always decay to a b-quark. Their signature is busy: a ' +
      'lepton, missing energy, and several jets — two of them b-tagged by their ' +
      'displaced decay vertices. There is no single mass peak; you count events ' +
      'and beat down W+jets and QCD by demanding the full topology.',
    lesson:
      'Not every search is a bump hunt. Some are counting experiments: demand ' +
      'the right number of jets, b-tags and missing energy, then count the excess.',
    targetNote:
      'Top pairs are produced constantly at the LHC — a counting rediscovery ' +
      'should be overwhelming, far beyond the 5σ convention.',
    observable: { name: 'HT (scalar sum of jet pT)', feature: 'HT', unit: 'GeV', xmin: 0, xmax: 600, bins: 30, target: null },
    explore: [
      { name: 'ttbar_lj', label: 'signal: tt̄ → ℓ + jets + b-jets' },
      { name: 'Wjets', label: 'background: W + jets' },
      { name: 'QCD_fake', label: 'background: QCD multijet' },
    ],
    processes: [
      { name: 'ttbar_lj', kind: 'signal', expected: 1300, label: 'tt̄' },
      { name: 'Wjets', kind: 'bkg', expected: 8000, label: 'W + jets' },
      { name: 'QCD_fake', kind: 'bkg', expected: 5000, label: 'QCD multijet' },
    ],
    cuts: [
      toggle('oneLep', '≥ 1 lepton', 'Require a lepton from the W decay.', (f) => f.nLeptons >= 1),
      maxCut('lepIso', 'Lepton isolation <', 'Real W leptons are isolated; QCD fakes sit inside jets.', 'muonIso', { min: 0.05, max: 1, step: 0.05, def: 0.5 }),
      minCut('met', 'Missing pT >', 'The neutrino gives real missing energy.', 'met', { min: 0, max: 80, def: 25, unit: 'GeV' }),
      minCut('njets', '≥ N jets', 'Top pair decays give many jets.', 'nJetsTotal', { min: 0, max: 6, def: 4, unit: '' }),
      minCut('btags', '≥ N b-tags', 'Both tops decay to b-quarks. Tagging finds ~70% of real b-jets, so demanding 2 costs signal too.', 'nBjets', { min: 0, max: 3, def: 2, unit: '' }),
    ],
    trigger: 'singleMuon',
    concepts: ['btag'],
    resultWord: 'Top quarks rediscovered!',
    target: 18,
  },

  {
    id: 'hh-bbtautau',
    chapter: 'Chapter 7 · Beyond the Candle',
    title: 'The Higgs-Pair Frontier',
    tagline: 'HH → bbττ',
    difficulty: 'Advanced',
    story:
      'Two Higgs bosons at once — one to b-quarks, one to taus — is one of the ' +
      'rarest signatures at the LHC, and directly probes how the Higgs couples ' +
      'to itself. The signal is minuscule, tt̄ towers over it, and nothing is ' +
      'free: b-tagging misses real b-jets, and roughly one jet in eight fakes a ' +
      'loose tau. Demand quality — then look for a broad m(bb) bump below ' +
      '125 GeV (b-jets lose energy to neutrinos).',
    lesson:
      'The rarest processes are won or lost on object identification. Tau ' +
      'candidates are mostly fake jets until you require them to be isolated; ' +
      'b-tags cost signal efficiency. Every cut is a trade-off — and tt̄ with ' +
      'two real taus can never be fully cut away.',
    targetNote:
      '3σ is "evidence" — even the real LHC experiments have not yet reached ' +
      '5σ for Higgs-pair production.',
    observable: { name: 'm(bb) — mass of the two b-tagged jets', feature: 'mbb', unit: 'GeV', xmin: 40, xmax: 200, bins: 32, target: 125 },
    explore: [
      { name: 'HH_bbtautau', label: 'signal: HH → bbττ' },
      { name: 'ttbar_lj', label: 'background: tt̄' },
      { name: 'Wjets', label: 'background: W + jets' },
    ],
    processes: [
      { name: 'HH_bbtautau', kind: 'signal', expected: 50, label: 'HH→bbττ' },
      { name: 'ttbar_lj', kind: 'bkg', expected: 5000, label: 'tt̄' },
      { name: 'Wjets', kind: 'bkg', expected: 3500, label: 'W + jets' },
    ],
    cuts: [
      minCut('btags', '≥ N b-tags', 'One Higgs → bb. b-tagging finds ~70% of real b-jets — and ~5% of light jets fake it.', 'nBjets', { min: 0, max: 3, def: 2, unit: '' }),
      toggle('twoTau', '≥ 2 taus', 'The other Higgs → ττ. Beware: ~1 jet in 8 fakes a loose tau.', (f) => f.nTaus >= 2),
      maxCut('tauIso', 'Tau ID quality (iso) <', 'Real taus are isolated; fake taus sit inside hadronic activity.', 'tauIso', { min: 0.05, max: 1, step: 0.05, def: 0.4 }),
      minCut('met', 'Missing pT >', 'Tau decays produce neutrinos → missing energy.', 'met', { min: 0, max: 80, def: 20, unit: 'GeV' }),
    ],
    trigger: 'doubleTau',
    concepts: ['tau-id'],
    target: 3,
  },

  {
    id: 'heavy-ion',
    chapter: 'Chapter 9',
    title: 'Into the Fireball (Pb–Pb)',
    tagline: 'Heavy-ion — coming soon',
    difficulty: 'Advanced',
    locked: true,
    story:
      'Switch from protons to lead nuclei and recreate a droplet of quark–gluon ' +
      'plasma. A different game entirely — jet quenching, thousands of tracks. ' +
      'Planned for a future update.',
    lesson: '',
    observable: { name: '', feature: '', xmin: 0, xmax: 1, bins: 1 },
    explore: [],
    processes: [],
    cuts: [],
    target: 0,
  },
];

export function getMission(id) {
  return MISSIONS.find((m) => m.id === id);
}
