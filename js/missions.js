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
    chapter: 'Chapter 3',
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
      { name: 'Z_mumu', kind: 'signal', expected: 900 },
      { name: 'DY_continuum', kind: 'bkg', expected: 2600 },
      { name: 'ttbar_2mu', kind: 'bkg', expected: 700 },
      { name: 'QCD_fake', kind: 'bkg', expected: 5200 },
    ],
    cuts: [
      toggle('twoMu', '≥ 2 muons', 'Require at least two muon candidates.', (f) => f.nMuons >= 2),
      toggle('os', 'Opposite charge', 'A Z is neutral: its muons have opposite charge.', (f) => f.oppositeCharge),
      minCut('muPt', 'Muon pT >', 'Reject soft fake muons.', 'leadMuonPt', { min: 0, max: 40, def: 20, unit: 'GeV' }),
      maxCut('muIso', 'Muon isolation <', 'Real muons are isolated; fakes sit inside jets.', 'muonIso', { min: 0.05, max: 1, step: 0.05, def: 0.5 }),
      toggle('bveto', 'b-jet veto', 'Remove tt̄ by rejecting events with b-jets.', (f) => f.nBjets === 0),
      maxCut('met', 'Missing pT <', 'Z events have little genuine missing energy.', 'met', { min: 0, max: 100, def: 60, unit: 'GeV' }),
      windowCut('mass', 'Mass window |m − 91| <', 'Focus on the Z resonance.', 'dimuonMass', { center: 91.2, min: 1, max: 30, def: 25 }),
    ],
    target: 12,
  },

  {
    id: 'w-munu',
    chapter: 'Chapter 3',
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
      { name: 'W_munu', kind: 'signal', expected: 1400 },
      { name: 'QCD_fake', kind: 'bkg', expected: 9000 },
      { name: 'Z_mumu', kind: 'bkg', expected: 1600 },
      { name: 'ttbar_lj', kind: 'bkg', expected: 900 },
    ],
    cuts: [
      toggle('oneMu', '≥ 1 muon', 'Require a muon candidate.', (f) => f.nMuons >= 1),
      toggle('secondVeto', 'Second-lepton veto', 'Reject Z → μμ by vetoing a second muon.', (f) => f.nMuons <= 1),
      minCut('muPt', 'Muon pT >', 'Reject soft fake muons.', 'leadMuonPt', { min: 0, max: 50, def: 25, unit: 'GeV' }),
      maxCut('muIso', 'Muon isolation <', 'Keep isolated muons; reject QCD fakes.', 'muonIso', { min: 0.05, max: 1, step: 0.05, def: 0.5 }),
      minCut('met', 'Missing pT >', 'The neutrino carries away real missing energy.', 'met', { min: 0, max: 80, def: 25, unit: 'GeV' }),
      toggle('bveto', 'b-jet veto', 'Suppress tt̄ background.', (f) => f.nBjets === 0),
    ],
    target: 15,
  },

  {
    id: 'higgs-gg',
    chapter: 'Chapter 4',
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
      { name: 'H_gg', kind: 'signal', expected: 190 },
      { name: 'gg_continuum', kind: 'bkg', expected: 6000 },
      { name: 'gamma_jet', kind: 'bkg', expected: 4200 },
    ],
    cuts: [
      toggle('twoGamma', '≥ 2 photons', 'Require two photon candidates.', (f) => f.nPhotons >= 2),
      minCut('gPt', 'Photon pT >', 'Higgs photons are energetic.', 'leadPhotonPt', { min: 0, max: 80, def: 40, unit: 'GeV' }),
      maxCut('gIso', 'Photon isolation <', 'Reject jets faking photons.', 'photonIso', { min: 0.05, max: 1, step: 0.05, def: 0.5 }),
      windowCut('mass', 'Mass window |m − 125| <', 'Zoom in on the Higgs region.', 'diphotonMass', { center: 125, min: 1, max: 40, def: 30 }),
    ],
    target: 5,
  },

  {
    id: 'top-lj',
    chapter: 'Chapter 4',
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
      { name: 'ttbar_lj', kind: 'signal', expected: 1300 },
      { name: 'Wjets', kind: 'bkg', expected: 8000 },
      { name: 'QCD_fake', kind: 'bkg', expected: 5000 },
    ],
    cuts: [
      toggle('oneLep', '≥ 1 lepton', 'Require a lepton from the W decay.', (f) => f.nLeptons >= 1),
      maxCut('lepIso', 'Lepton isolation <', 'Real W leptons are isolated; QCD fakes sit inside jets.', 'muonIso', { min: 0.05, max: 1, step: 0.05, def: 0.5 }),
      minCut('met', 'Missing pT >', 'The neutrino gives real missing energy.', 'met', { min: 0, max: 80, def: 25, unit: 'GeV' }),
      minCut('njets', '≥ N jets', 'Top pair decays give many jets.', 'nJetsTotal', { min: 0, max: 6, def: 4, unit: '' }),
      minCut('btags', '≥ N b-tags', 'Both tops decay to b-quarks — count b-tagged jets.', 'nBjets', { min: 0, max: 3, def: 2, unit: '' }),
    ],
    target: 18,
  },

  {
    id: 'hh-bbtautau',
    chapter: 'Chapter 5',
    title: 'The Higgs-Pair Frontier',
    tagline: 'HH → bbττ',
    difficulty: 'Advanced',
    story:
      'Two Higgs bosons at once — one to b-quarks, one to taus — is one of the ' +
      'rarest signatures at the LHC, and directly probes how the Higgs couples ' +
      'to itself. The signal is minuscule; tt̄ and W+jets tower over it. This is ' +
      'the real frontier: even "evidence" (3σ) is a triumph.',
    lesson:
      'The rarest processes demand near-perfect object identification. Two ' +
      'b-jets AND two taus AND missing energy together beat down enormous ' +
      'backgrounds — but statistics are everything.',
    targetNote:
      '3σ is "evidence" — even the real LHC experiments have not yet reached ' +
      '5σ for Higgs-pair production.',
    observable: { name: 'HT (scalar sum of jet pT)', feature: 'HT', unit: 'GeV', xmin: 0, xmax: 500, bins: 25, target: null },
    explore: [
      { name: 'HH_bbtautau', label: 'signal: HH → bbττ' },
      { name: 'ttbar_lj', label: 'background: tt̄' },
      { name: 'Wjets', label: 'background: W + jets' },
    ],
    processes: [
      { name: 'HH_bbtautau', kind: 'signal', expected: 45 },
      { name: 'ttbar_lj', kind: 'bkg', expected: 5000 },
      { name: 'Wjets', kind: 'bkg', expected: 3500 },
    ],
    cuts: [
      toggle('twoB', '≥ 2 b-tags', 'One Higgs → bb gives two b-jets.', (f) => f.nBjets >= 2),
      toggle('twoTau', '≥ 2 taus', 'The other Higgs → ττ gives two taus.', (f) => f.nTaus >= 2),
      minCut('met', 'Missing pT >', 'Tau decays produce neutrinos → missing energy.', 'met', { min: 0, max: 80, def: 20, unit: 'GeV' }),
    ],
    target: 3,
  },

  {
    id: 'heavy-ion',
    chapter: 'Chapter 6',
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
