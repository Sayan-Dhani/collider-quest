// curriculum.js
// The learning layer: where the player is in the experimental chain (the
// learning map) and the concept cards they collect along the way. Pure data —
// no DOM at import time (node tests import this directly).

// The experimental chain, in order. Screens/chapters declare which stage they
// belong to; the learning map highlights it.
export const STAGES = [
  { id: 'accelerator', label: 'Accelerator' },
  { id: 'collisions', label: 'Collisions' },
  { id: 'detector', label: 'Detector' },
  { id: 'reconstruction', label: 'Reconstruction' },
  { id: 'trigger', label: 'Trigger' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'statistics', label: 'Statistics' },
];

// Concept cards. Every card is readable at any time (the glossary doubles as
// the "explain like I'm new" reference); completing chapters and missions
// marks them as collected.
export const CONCEPTS = {
  'beam-energy': {
    title: 'Beam energy',
    text: 'Protons are accelerated in stages — Linac4, PS Booster, PS, SPS, then the LHC — reaching 6.8 TeV per beam. Higher energy means heavier particles can be produced (E = mc²).',
  },
  luminosity: {
    title: 'Integrated luminosity',
    text: 'How many collisions were delivered, measured in inverse femtobarns (fb⁻¹). More luminosity = more events = more statistical power — significance grows like √luminosity.',
  },
  pileup: {
    title: 'Pileup',
    text: 'At high luminosity, many proton pairs collide in the same bunch crossing. The interesting collision is buried under dozens of soft ones — the price of more data.',
  },
  trigger: {
    title: 'Trigger',
    text: 'The LHC delivers ~40 million bunch crossings a second; only ~1000 can be written to disk. The trigger decides in microseconds what to keep. Rejected events are gone forever.',
  },
  pt: {
    title: 'Transverse momentum (pT)',
    text: 'Momentum across the beam direction. Before a collision it is zero, so afterwards everything must balance. The magnetic field bends charged tracks: tighter curve = lower pT.',
  },
  isolation: {
    title: 'Isolation',
    text: 'A real muon or photon from a W, Z or Higgs decay flies alone; fakes sit inside jets, surrounded by hadronic activity. Requiring isolation is the classic fake-killer.',
  },
  'invariant-mass': {
    title: 'Invariant mass',
    text: 'Combine the 4-momenta of decay products and you recover the mass of the parent — however it was moving. Two muons from a Z reconstruct to ~91 GeV; random pairs do not.',
  },
  met: {
    title: 'Missing transverse momentum (MET)',
    text: 'Visible pT must balance to zero. If it does not, something invisible — a neutrino, or something new — carried the difference. MET is literally minus the vector sum of what you see.',
  },
  'jacobian-mt': {
    title: 'Transverse mass & the Jacobian edge',
    text: 'With a neutrino you cannot build the full invariant mass. The transverse mass mT never exceeds the parent mass, so W events pile up against a sharp edge at 80.4 GeV instead of a peak.',
  },
  btag: {
    title: 'b-tagging',
    text: 'b-hadrons live long enough to fly ~millimetres before decaying, leaving a displaced vertex. Tagging finds ~70% of real b-jets — and ~5% of light jets fake it. Nothing is free.',
  },
  'tau-id': {
    title: 'Tau identification',
    text: 'A hadronic tau is a narrow 1- or 3-track jet. Roughly one ordinary jet in eight fakes a loose tau — tau analyses live or die on identification quality.',
  },
  'irreducible-bkg': {
    title: 'Reducible vs irreducible background',
    text: 'QCD fakes and tt̄ can be cut away (reducible): they look different if you check isolation or b-jets. Non-resonant Drell–Yan produces the identical final state under the Z peak — irreducible. You cannot cut it; you must model it.',
  },
  'data-vs-mc': {
    title: 'Data vs simulation (MC)',
    text: 'Data = recorded collisions (black points; nobody knows which are signal). MC = simulated events predicting signal and each background (the coloured stack). Analysts compare the two.',
  },
  'ratio-panel': {
    title: 'Data/MC ratio',
    text: 'The bottom panel divides data by the prediction, bin by bin. Points sitting on 1 (within the uncertainty band) mean the simulation describes the data — the modelling check behind every plot.',
  },
  cutflow: {
    title: 'Cutflow',
    text: 'The bookkeeping table of an analysis: how many signal, background and data events survive after each successive cut. If data and prediction disagree at some stage, that is where to look.',
  },
  significance: {
    title: 'Statistical significance',
    text: 'Counts fluctuate by about √N, so an excess must be compared to that. Significance (σ) says how unlikely the background alone is to fluctuate up to what you see.',
  },
  'five-sigma': {
    title: '3σ evidence, 5σ discovery',
    text: 'Particle physics convention: 3σ (~1-in-700 fluke) is "evidence"; 5σ (~1-in-3.5-million) is a "discovery". The 2012 Higgs announcement waited for 5σ in two experiments.',
  },
  rediscovery: {
    title: 'Rediscovery & calibration',
    text: 'Before hunting new physics, experiments re-find the Z and W. Known particles are standard candles: the Z peak position calibrates the momentum scale, its width measures resolution.',
  },
};

// Concepts collected by finishing each tutorial chapter.
export const CHAPTER_CONCEPTS = {
  'chapter-1': ['beam-energy'],
  'chapter-2': ['luminosity', 'pileup'],
  'chapter-3': ['pt', 'met'],
  'chapter-4': ['isolation'],
  'chapter-5': ['trigger'],
};
