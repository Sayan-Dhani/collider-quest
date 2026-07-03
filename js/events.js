// events.js
// Data-driven event generator for Collider Quest.
//
// An event is a plain object the rest of the game consumes:
//   {
//     id, eventType, truth: 'signal'|'background', correctClass,
//     objects: [ { id, kind, truthLabel, charge, angle, momentum,
//                  reachesMuonSystem, ecal, hcal, selectable } ... ],
//     missingEnergy: { magnitude, angle },
//     invariantMass   // dimuon mass when two muons exist, else null
//   }
//
// `truthLabel` is the correct answer for the "identify this object" step and
// follows one consistent rule the player can learn:
//   - track that reaches the muon system            -> 'Muon'
//   - broad calorimeter cluster of many tracks       -> 'Jet'
//   - track that does NOT reach the muon system      -> 'Unknown' (fake)
//
// New chapters (Higgs->gg, top, HH, heavy-ion) add entries to TEMPLATES; the
// generator and the rest of the pipeline stay unchanged.

import { Z_MASS, dimuonMass, randRange, randInt, pick } from './physics.js';

let _uid = 0;
const uid = (prefix) => `${prefix}${_uid++}`;

// Gaussian sample (Box-Muller) centered on `mean` with std `sigma`.
function gauss(mean, sigma) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const n = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + sigma * n;
}

// Helper builders for the standard object kinds -------------------------------

function makeMuon(charge, angle, momentum) {
  return {
    id: uid('mu'),
    kind: 'muon',
    truthLabel: 'Muon',
    charge,
    angle,
    momentum,
    reachesMuonSystem: true,
    ecal: randRange(0.5, 2),   // muons leave little calorimeter energy
    hcal: randRange(0.5, 2),
    selectable: true,
  };
}

function makeFakeMuon(angle, momentum) {
  // A low-quality track that looks muon-ish but stops before the muon chambers.
  return {
    id: uid('fk'),
    kind: 'fakeMuon',
    truthLabel: 'Unknown',
    charge: pick(['+', '-']),
    angle,
    momentum,
    reachesMuonSystem: false,
    ecal: randRange(2, 6),
    hcal: randRange(4, 12),
    selectable: true,
  };
}

function makeJet(angle, energy) {
  return {
    id: uid('jet'),
    kind: 'jet',
    truthLabel: 'Jet',
    charge: 0,
    angle,
    momentum: energy,            // treat jet energy as its "size" for rendering
    reachesMuonSystem: false,
    ecal: energy * randRange(0.2, 0.4),
    hcal: energy * randRange(0.6, 1.0),
    // number of sub-tracks drives the "spray" rendering
    nTracks: randInt(3, 7),
    selectable: true,
  };
}

// Event templates -------------------------------------------------------------

export const TEMPLATES = {
  // Signal: Z -> mu+ mu-. Two clean, isolated, opposite-charge muons that are
  // roughly back-to-back, with low missing energy. Kinematics are chosen so the
  // reconstructed dimuon mass lands near the Z mass (with realistic spread).
  Z_mumu: {
    truth: 'signal',
    correctClass: 'Z_mumu',
    generate() {
      // Momenta ~ Z_MASS/2 give a back-to-back dimuon mass near Z_MASS.
      const p1 = gauss(Z_MASS / 2, 4);
      const p2 = gauss(Z_MASS / 2, 4);
      const a1 = randRange(0, 360);
      const a2 = (a1 + 180 + randRange(-18, 18) + 360) % 360; // near back-to-back
      const muPlus = makeMuon('+', a1, Math.max(15, p1));
      const muMinus = makeMuon('-', a2, Math.max(15, p2));
      const objects = [muPlus, muMinus];
      return {
        objects,
        missingEnergy: { magnitude: randRange(1, 8), angle: randRange(0, 360) },
      };
    },
  },

  // Background: W -> mu nu. One muon plus large missing energy (the neutrino
  // escapes). No second muon, so no real dimuon resonance.
  W_munu: {
    truth: 'background',
    correctClass: 'W_munu',
    generate() {
      const muAngle = randRange(0, 360);
      const mu = makeMuon(pick(['+', '-']), muAngle, randRange(25, 55));
      // Missing energy points roughly opposite the muon (momentum balance).
      const metAngle = (muAngle + 180 + randRange(-35, 35) + 360) % 360;
      return {
        objects: [mu],
        missingEnergy: { magnitude: randRange(25, 50), angle: metAngle },
      };
    },
  },

  // Background: QCD multijet. Several jets, a fake muon-ish track embedded in the
  // spray, no clean isolated opposite-charge pair. Messy event.
  QCD: {
    truth: 'background',
    correctClass: 'QCD',
    generate() {
      const nJets = randInt(3, 5);
      const objects = [];
      for (let i = 0; i < nJets; i++) {
        objects.push(makeJet(randRange(0, 360), randRange(30, 80)));
      }
      // A fake muon near one of the jets (non-isolated).
      const near = objects[0].angle + randRange(-15, 15);
      objects.push(makeFakeMuon((near + 360) % 360, randRange(12, 28)));
      return {
        objects,
        missingEnergy: { magnitude: randRange(5, 22), angle: randRange(0, 360) },
      };
    },
  },
};

// Default relative frequencies for the Z-boson mission. Backgrounds dominate so
// the player must actively pick out the signal, as in a real analysis.
export const DEFAULT_MIX = {
  Z_mumu: 0.4,
  W_munu: 0.3,
  QCD: 0.3,
};

// Pick a template id from a weighted mix.
function sampleType(mix) {
  const entries = Object.entries(mix);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [type, w] of entries) {
    r -= w;
    if (r <= 0) return type;
  }
  return entries[0][0];
}

// Generate one concrete event. `mix` overrides DEFAULT_MIX if provided.
export function generateEvent(mix = DEFAULT_MIX) {
  const eventType = sampleType(mix);
  const tmpl = TEMPLATES[eventType];
  const { objects, missingEnergy } = tmpl.generate();

  // Compute dimuon invariant mass when exactly a clean muon pair is present.
  const muons = objects.filter((o) => o.kind === 'muon');
  let invariantMass = null;
  if (muons.length === 2) {
    invariantMass = dimuonMass(muons[0], muons[1]);
  }

  return {
    id: uid('evt'),
    eventType,
    truth: tmpl.truth,
    correctClass: tmpl.correctClass,
    objects,
    missingEnergy,
    invariantMass,
  };
}
