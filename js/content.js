// content.js
// Player-facing text and the object-identity vocabulary. Mission-specific story
// lives in missions.js; this holds the cross-cutting strings.

export const TAGLINE = 'Collide particles. Decode the traces. Discover the invisible.';

export const ACCELERATOR_INTRO =
  'Two proton beams — injected from the SPS at 0.45 TeV — race around the 27 km ' +
  'ring in opposite directions and are steered into each other at four points, ' +
  'where the CMS, ATLAS, ALICE and LHCb detectors sit. At 6.8 TeV per beam ' +
  '(13.6 TeV collision energy) the bunches cross ~40 million times a second. ' +
  'Click an interaction point to learn about its experiment; enter CMS to ' +
  'reconstruct the collisions yourself.';

export const ACC_INFO_DEFAULT =
  'Hover or click an interaction point. CMS and ATLAS sit opposite each other on ' +
  'the ring; ALICE and LHCb sit on the other axis.';

export const HOME_INTRO =
  'You are a new scientist at the Large Hadron Collider. Accelerate particles, ' +
  'collide them, and read the traces they leave in the CMS detector. Nothing is ' +
  'seen directly — every particle is reconstructed from tracks, energy deposits ' +
  'and missing momentum. Then comes the real work: applying selection criteria ' +
  'to pull a signal out of overwhelming background.';

// Identity choices in the Event Explorer. truthLabels the generator assigns must
// be a subset of these.
export const IDENTITIES = ['Muon', 'Electron', 'Photon', 'Jet', 'b-jet', 'Tau', 'Pileup'];

// Per-kind hint shown while inspecting.
export const KIND_HINT = {
  muon: 'Track through every layer, reaching the outer muon chambers.',
  electron: 'Track that stops in the ECAL, depositing its energy there.',
  photon: 'ECAL energy deposit with no matching track (neutral).',
  jet: 'A spray of many tracks with broad calorimeter energy.',
  bjet: 'A jet with a displaced secondary vertex — a long-lived b-hadron.',
  tau: 'A narrow jet with 1 or 3 tracks. Real taus are isolated; ordinary jets can fake this shape.',
  pileupTrack: 'A soft, low-pT track from a pileup collision — not the physics of interest.',
};

export function idFeedback(correct, truthLabel) {
  if (correct) return { tone: 'good', text: `Correct — that object is a ${truthLabel.toLowerCase()}.` };
  const why = {
    Muon: 'It reaches the muon chambers — a muon.',
    Electron: 'Track that stops in the ECAL — an electron.',
    Photon: 'ECAL deposit with no track — a photon.',
    Jet: 'A jet — a broad spray, or a narrow one faking a tau. Check the isolation: real taus are isolated.',
    'b-jet': 'A jet with a displaced vertex — a b-jet.',
    Tau: 'A narrow 1- or 3-track jet — a tau.',
    Pileup: 'A soft low-pT track from pileup — not signal.',
  };
  return { tone: 'bad', text: why[truthLabel] || 'Look again at the detector signals.' };
}

// Feedback after the "which process?" guess in the Explorer.
export function processFeedback(correct, chosenLabel, truthLabel) {
  if (correct) {
    return { tone: 'good', text: `Correct — this event is ${truthLabel}. You are reading the signatures well.` };
  }
  return {
    tone: 'bad',
    text: `Not quite — this is actually ${truthLabel}. In a real event a good signature is not enough; ` +
          `that is why the Analysis Lab uses cuts across many events.`,
  };
}

// Discovery-screen headline by significance vs. the mission's own target.
// Rediscovery missions (Z, W, tt̄) pass their own wording via `word` — finding
// the Z is calibration, not a "Discovery!". The generic headline is reserved
// for genuine searches.
export function resultHeadline(sig, target, word = null) {
  if (sig >= target) return word ?? (target >= 5 ? 'Discovery!' : 'Evidence secured!');
  if (sig >= 3) return 'Evidence — but not yet a discovery';
  return 'Not there yet';
}

// End-of-Explorer summary: acknowledge the player's eye, then motivate the Lab.
export function explorerSummary(idCorrect, idTotal, procCorrect, procTotal) {
  const idPart = idTotal > 0
    ? `You identified ${idCorrect} of ${idTotal} objects`
    : 'You inspected the events';
  return `${idPart} and classified ${procCorrect} of ${procTotal} events correctly. ` +
    'Eyeballing single events only goes so far — real analyses decide with ' +
    'statistics, across thousands of events at once. Time for the Analysis Lab.';
}

export const CLOSING =
  'You did not see these particles directly. You reconstructed them from traces, ' +
  'then separated a whisper of signal from a roar of background. That is ' +
  'experimental particle physics.';

// --- Chapter 1 — Build the Beam strings -------------------------------------

export const CHAIN_INTRO =
  'Before particles collide in the LHC, they must travel through a chain of ' +
  'accelerators — each one boosting their energy and preparing them for the ' +
  'next stage. Guide the beam from the ion source all the way to the LHC.';

export const CHAIN_COMPLETE =
  'Your beam has travelled from the ion source, through four accelerators, ' +
  'and now circulates in the LHC at 6.8 TeV per beam. Ready for collisions.';

// --- Chapter 2 — First Collisions strings -----------------------------------

export const COLLISIONS_INTRO =
  'Now that the beam is ready, it is time to understand what happens when ' +
  'protons collide. Meet the four experiments around the LHC ring and ' +
  'learn how luminosity shapes the data you will analyse.';

// --- Chapter 3 — Inside CMS strings -----------------------------------------

export const CMS_SCHOOL_INTRO =
  'The CMS detector is a layered cylindrical onion. Each layer measures something ' +
  'different: tracking, electromagnetic energy, hadronic energy, and muons. ' +
  'Explore each subsystem and learn how it contributes to particle identification.';

export const CMS_SCHOOL_COMPLETE =
  'You now understand how each CMS subsystem contributes to reconstructing ' +
  'a collision. The layers work together — no single one tells the whole story.';

// --- Chapter 4 — Reconstruction strings -------------------------------------

export const RECONSTRUCTION_INTRO =
  'Raw detector hits are just noise until they are assembled into tracks, ' +
  'clusters, and physics objects. This is the reconstruction step — turning ' +
  'electronic signals into particles you can analyse.';

export const RECONSTRUCTION_COMPLETE =
  'You have seen how raw hits become tracks, clusters, and identified particles. ' +
  'In the Event Explorer, you will work with fully reconstructed objects.';

// --- Chapter 5 — Trigger strings --------------------------------------------

export const TRIGGER_INTRO =
  'CMS cannot save every collision — 40 million events per second is too many. ' +
  'The trigger system decides in microseconds which events to keep. Your choice ' +
  'of trigger determines whether your signal is recorded at all.';

export const TRIGGER_COMPLETE =
  'You understand the trigger: a balance between keeping signal and managing ' +
  'data rate. With the trigger in place, your data is ready for analysis.';
