// content.js
// All player-facing text: mission framing, educational messages, and feedback.
// Kept separate so wording can be tuned without touching game logic.

export const MISSION = {
  title: 'Mission: The Muon Trail',
  intro:
    'The beams are stable and CMS is ready. Some particles pass through almost ' +
    'everything the detector is made of. Find the muons, and use them to ' +
    'reconstruct the Z boson — a particle that decays far too quickly to see directly.',
  goal: 'Build a clean Z peak in the dimuon mass spectrum.',
};

export const HELP = {
  muon: 'A muon leaves a track in the inner detector and reaches the outer muon chambers.',
  jet: 'A jet is a spray of many particles — many tracks plus broad calorimeter energy.',
  fake: 'A track that stops before the muon chambers is not a clean muon — treat it as unknown.',
  met: 'Missing transverse momentum is inferred from an imbalance — it hints at an escaping neutrino.',
};

// Classification button definitions (label + value used for scoring).
export const CLASSES = [
  { value: 'Z_mumu', label: 'Z → μμ' },
  { value: 'W_munu', label: 'W → μν' },
  { value: 'QCD', label: 'QCD background' },
];

// Identity choices offered when a candidate object is selected.
export const IDENTITIES = ['Muon', 'Electron', 'Photon', 'Jet', 'Unknown'];

// Feedback after submitting a classification. Chosen by (correct?, event type).
export function classifyFeedback(correct, event, chosenClass) {
  if (correct) {
    switch (event.correctClass) {
      case 'Z_mumu':
        return {
          tone: 'good',
          text:
            'Excellent. Two opposite-charge muons form a clean Z boson candidate. ' +
            'The event has been added to your mass histogram.',
        };
      case 'W_munu':
        return {
          tone: 'good',
          text:
            'Correct. One muon plus large missing energy is the classic W → μν ' +
            'signature — the neutrino escaped the detector.',
        };
      case 'QCD':
        return {
          tone: 'good',
          text:
            'Correct. Many jets and no clean isolated muon pair — this is QCD ' +
            'background, not a resonance.',
        };
    }
  }
  // Incorrect — teach why.
  switch (event.correctClass) {
    case 'Z_mumu':
      return {
        tone: 'bad',
        text:
          'Not quite. This event has two clean, opposite-charge muons pointing ' +
          'back to the vertex — a strong Z → μμ candidate.',
      };
    case 'W_munu':
      return {
        tone: 'bad',
        text:
          'Careful. There is only one muon and large missing energy here, which ' +
          'points to W → μν rather than a dimuon resonance.',
      };
    case 'QCD':
      return {
        tone: 'bad',
        text:
          'Careful. This messy multijet event has no clean isolated muon pair. ' +
          'A good signature is not enough — this is QCD background.',
      };
    default:
      return { tone: 'bad', text: 'Not quite — look again at the detector signatures.' };
  }
}

export function idFeedback(correct, truthLabel) {
  if (correct) return { tone: 'good', text: `Correct — that object is a ${truthLabel.toLowerCase()}.` };
  return {
    tone: 'bad',
    text:
      truthLabel === 'Muon'
        ? 'That track reaches the muon chambers — it is a muon.'
        : truthLabel === 'Jet'
        ? 'That is a broad spray of tracks and calorimeter energy — a jet.'
        : 'That track stops before the muon chambers — treat it as unknown.',
  };
}

// Qualitative analysis-quality label from the fraction of correct Z selections.
export function analysisQuality(purity) {
  if (purity >= 0.85) return 'Excellent';
  if (purity >= 0.7) return 'Good';
  if (purity >= 0.5) return 'Fair';
  return 'Noisy';
}

export const CLOSING =
  'You did not see the Z boson directly. You reconstructed it from the traces of ' +
  'its decay products. This is the essence of collider physics.';
