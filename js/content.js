// content.js
// Player-facing text and the object-identity vocabulary. Mission-specific story
// lives in missions.js; this holds the cross-cutting strings.

export const TAGLINE = 'Collide particles. Decode the traces. Discover the invisible.';

export const ACCELERATOR_INTRO =
  'Two proton beams race around the 27 km ring in opposite directions and are ' +
  'steered into each other at four points — where the CMS, ATLAS, ALICE and LHCb ' +
  'detectors sit. At 6.8 TeV per beam the bunches cross ~40 million times a ' +
  'second. Click an interaction point to learn about its experiment; enter CMS ' +
  'to reconstruct the collisions yourself.';

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
  tau: 'A narrow jet with 1 or 3 tracks.',
  pileupTrack: 'A soft, low-pT track from a pileup collision — not the physics of interest.',
};

export function idFeedback(correct, truthLabel) {
  if (correct) return { tone: 'good', text: `Correct — that object is a ${truthLabel.toLowerCase()}.` };
  const why = {
    Muon: 'It reaches the muon chambers — a muon.',
    Electron: 'Track that stops in the ECAL — an electron.',
    Photon: 'ECAL deposit with no track — a photon.',
    Jet: 'Broad spray of tracks and calorimeter energy — a jet.',
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

// Discovery-screen headline by significance vs. target.
export function resultHeadline(sig, target) {
  if (sig >= 5) return 'Discovery!';
  if (sig >= target) return 'Target reached!';
  if (sig >= 3) return 'Evidence — but not yet a discovery';
  return 'Not there yet';
}

export const CLOSING =
  'You did not see these particles directly. You reconstructed them from traces, ' +
  'then separated a whisper of signal from a roar of background. That is ' +
  'experimental particle physics.';
