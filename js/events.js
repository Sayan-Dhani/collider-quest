// events.js
// Event generation for Collider Quest v2.
//
// Real collision events are messy: the interesting hard process sits on top of
// pileup (extra soft collisions) and there are several physics processes that
// can fake a signal. This module produces:
//   - individual DISPLAY events (hard process + pileup) for the Event Explorer
//   - weighted DATASETS (signal + backgrounds) for the Analysis Lab
//
// Every event carries a `features` object (counts, isolation, masses, MET, ...)
// so the Analysis Lab can apply selection cuts, and a `truth` ('signal'|'bkg').

import {
  Z_MASS, W_MASS, HIGGS_MASS, MUON_MASS,
  pairMass, fourMomentum, invariantMass,
  randRange, randInt, pick, gauss, degToRad,
} from './physics.js';

let _uid = 0;
const uid = (p) => `${p}${_uid++}`;

// --- object builders ---------------------------------------------------------
// `iso` is relative isolation: small = clean/isolated lepton or photon; large =
// buried in hadronic activity (a fake). Cuts on isolation are a core lesson.

function base(kind, truthLabel, angle, pt, extra = {}) {
  return {
    id: uid(kind),
    kind, truthLabel,
    angle, pt, momentum: pt, // `momentum` kept for the detector renderer
    charge: 0,
    ecal: 0, hcal: 0,
    reachesMuonSystem: false,
    iso: 0.03,
    displaced: false,
    nprong: 1,
    selectable: true,
    fromHardProcess: true,
    ...extra,
  };
}

const mkMuon = (charge, angle, pt, iso = randRange(0.01, 0.08)) =>
  base('muon', 'Muon', angle, pt, {
    charge, iso, reachesMuonSystem: true,
    ecal: randRange(0.5, 2), hcal: randRange(0.5, 2),
  });

const mkElectron = (charge, angle, pt, iso = randRange(0.01, 0.08)) =>
  base('electron', 'Electron', angle, pt, {
    charge, iso, ecal: pt * randRange(0.85, 1.0), hcal: randRange(0.5, 3),
  });

const mkPhoton = (angle, pt, iso = randRange(0.01, 0.07)) =>
  base('photon', 'Photon', angle, pt, {
    charge: 0, iso, ecal: pt * randRange(0.9, 1.0), hcal: randRange(0.2, 1.5),
  });

const mkJet = (angle, pt) =>
  base('jet', 'Jet', angle, pt, {
    charge: 0, iso: randRange(0.3, 0.9),
    ecal: pt * randRange(0.2, 0.4), hcal: pt * randRange(0.6, 1.0),
    nprong: randInt(3, 8),
  });

const mkBjet = (angle, pt) =>
  base('bjet', 'b-jet', angle, pt, {
    charge: 0, iso: randRange(0.3, 0.9), displaced: true,
    ecal: pt * randRange(0.2, 0.4), hcal: pt * randRange(0.6, 1.0),
    nprong: randInt(3, 8),
  });

const mkTau = (charge, angle, pt) =>
  base('tau', 'Tau', angle, pt, {
    charge, iso: randRange(0.05, 0.25),
    ecal: pt * randRange(0.2, 0.4), hcal: pt * randRange(0.4, 0.7),
    nprong: pick([1, 1, 3]),
  });

// A soft pileup track: dim, low-pt, not the physics you care about.
const mkPileupTrack = () =>
  base('pileupTrack', 'Pileup', randRange(0, 360), randRange(0.4, 4), {
    charge: pick(['+', '-']), iso: randRange(0.4, 1),
    reachesMuonSystem: false, selectable: true, fromHardProcess: false,
  });

// A fake muon/electron sitting inside hadronic activity (non-isolated).
const mkFakeMuon = (angle, pt) =>
  base('muon', 'Muon', angle, pt, {
    charge: pick(['+', '-']), iso: randRange(0.3, 0.8), reachesMuonSystem: true,
    ecal: randRange(2, 6), hcal: randRange(4, 12), fromHardProcess: false,
  });

const opp = (c) => (c === '+' ? '-' : '+');

// --- hard-process generators -------------------------------------------------
// Each returns { objects, met:{magnitude,angle} }. Angles in degrees.

function twoBackToBack(angleSpread = 20) {
  const a1 = randRange(0, 360);
  const a2 = (a1 + 180 + randRange(-angleSpread, angleSpread) + 360) % 360;
  return [a1, a2];
}

// Opening angle (0..180 deg) between two azimuthal directions.
function openingAngle(a1, a2) {
  let d = Math.abs(((a1 - a2) % 360 + 360) % 360);
  return d > 180 ? 360 - d : d;
}

// For two equal-pT massless-ish objects, the pair mass is 2·pT·sin(Δφ/2).
// Given a target mass and the actual opening angle, return the pT each object
// needs so the reconstructed invariant mass equals the target (sharp peak).
function ptForMass(m, a1, a2) {
  const s = Math.sin(degToRad(openingAngle(a1, a2) / 2));
  return m / (2 * Math.max(0.25, s));
}

const PROCESSES = {
  // Z -> mu mu : two isolated opposite-charge muons, dimuon mass ~ Z, low MET.
  Z_mumu() {
    const [a1, a2] = twoBackToBack(25);
    const c = pick(['+', '-']);
    const p = ptForMass(gauss(Z_MASS, 3), a1, a2);
    const objs = [mkMuon(c, a1, p), mkMuon(opp(c), a2, p)];
    maybeAddJets(objs, randInt(0, 1));
    return { objects: objs, met: softMet() };
  },

  // Drell-Yan continuum: two opposite muons but NON-resonant mass (fills under
  // and around the Z peak). Same signature, separated only by the mass window.
  DY_continuum() {
    const [a1, a2] = twoBackToBack(60);
    const c = pick(['+', '-']);
    const m = pick([randRange(25, 78), randRange(104, 200)]);
    const p = ptForMass(m, a1, a2);
    const objs = [mkMuon(c, a1, p), mkMuon(opp(c), a2, p)];
    maybeAddJets(objs, randInt(0, 2));
    return { objects: objs, met: softMet() };
  },

  // ttbar -> 2 leptons + 2 b-jets + MET (neutrinos). Two muons but with b-jets
  // and real MET, broad mass. Removed by b-veto / MET cut.
  ttbar_2mu() {
    const [a1, a2] = twoBackToBack(70);
    const c = pick(['+', '-']);
    const objs = [
      mkMuon(c, a1, gauss(40, 12)),
      mkMuon(opp(c), a2, gauss(40, 12)),
      mkBjet(randRange(0, 360), gauss(70, 20)),
      mkBjet(randRange(0, 360), gauss(60, 18)),
    ];
    return { objects: objs, met: { magnitude: gauss(60, 18), angle: randRange(0, 360) } };
  },

  // QCD multijet with a fake muon inside the jets (non-isolated).
  QCD_fake() {
    const objs = [];
    const nj = randInt(3, 5);
    for (let i = 0; i < nj; i++) objs.push(mkJet(randRange(0, 360), randRange(30, 90)));
    objs.push(mkFakeMuon((objs[0].angle + randRange(-12, 12) + 360) % 360, randRange(10, 30)));
    return { objects: objs, met: { magnitude: randRange(5, 25), angle: randRange(0, 360) } };
  },

  // W -> mu nu : one isolated muon + large MET (escaping neutrino).
  W_munu() {
    const a = randRange(0, 360);
    const objs = [mkMuon(pick(['+', '-']), a, gauss(42, 10))];
    maybeAddJets(objs, randInt(0, 2));
    return { objects: objs, met: { magnitude: gauss(45, 12), angle: (a + 180 + randRange(-30, 30) + 360) % 360 } };
  },

  // H -> gamma gamma : two isolated photons, diphoton mass ~ 125 (narrow).
  H_gg() {
    const [a1, a2] = twoBackToBack(35);
    const p = ptForMass(gauss(HIGGS_MASS, 1.6), a1, a2);
    const objs = [mkPhoton(a1, Math.max(30, p)), mkPhoton(a2, Math.max(30, p))];
    maybeAddJets(objs, randInt(0, 2));
    return { objects: objs, met: softMet() };
  },

  // Continuum diphoton background: two real photons, smoothly falling mass.
  gg_continuum() {
    const [a1, a2] = twoBackToBack(70);
    const m = 80 + Math.pow(Math.random(), 2.2) * 100; // smoothly falling 80..180
    const p = ptForMass(m, a1, a2);
    const objs = [mkPhoton(a1, Math.max(25, p)), mkPhoton(a2, Math.max(25, p))];
    maybeAddJets(objs, randInt(0, 2));
    return { objects: objs, met: softMet() };
  },

  // gamma + jet: one real photon + a jet whose leading pi0 fakes a photon
  // (high isolation). Removed by the isolation cut.
  gamma_jet() {
    const [a1, a2] = twoBackToBack(70);
    const m = 80 + Math.pow(Math.random(), 1.8) * 100;
    const p = ptForMass(m, a1, a2);
    const real = mkPhoton(a1, Math.max(25, p));
    const fake = mkPhoton(a2, Math.max(25, p), randRange(0.25, 0.7)); // non-isolated fake
    fake.hcal = fake.pt * randRange(0.4, 0.8);
    const objs = [real, fake];
    maybeAddJets(objs, randInt(1, 3));
    return { objects: objs, met: softMet() };
  },

  // ttbar -> lepton + jets : 1 isolated lepton + MET + >=4 jets, >=1 b-jet.
  ttbar_lj() {
    const a = randRange(0, 360);
    const objs = [mkMuon(pick(['+', '-']), a, gauss(40, 12))];
    objs.push(mkBjet(randRange(0, 360), gauss(75, 20)));
    objs.push(mkBjet(randRange(0, 360), gauss(65, 18)));
    for (let i = 0; i < randInt(2, 3); i++) objs.push(mkJet(randRange(0, 360), gauss(55, 18)));
    return { objects: objs, met: { magnitude: gauss(45, 15), angle: randRange(0, 360) } };
  },

  // W + jets : lepton + MET + jets but (usually) no b-jets. ttbar background.
  Wjets() {
    const a = randRange(0, 360);
    const objs = [mkMuon(pick(['+', '-']), a, gauss(38, 10))];
    const nj = randInt(2, 4);
    for (let i = 0; i < nj; i++) {
      // occasional real b from gluon splitting
      if (Math.random() < 0.12) objs.push(mkBjet(randRange(0, 360), gauss(50, 15)));
      else objs.push(mkJet(randRange(0, 360), gauss(50, 15)));
    }
    return { objects: objs, met: { magnitude: gauss(40, 12), angle: (a + 180 + randRange(-40, 40) + 360) % 360 } };
  },

  // HH -> bb tautau : 2 b-jets + 2 taus + MET. Very rare.
  HH_bbtautau() {
    const objs = [
      mkBjet(randRange(0, 360), gauss(70, 18)),
      mkBjet(randRange(0, 360), gauss(60, 16)),
      mkTau(pick(['+', '-']), randRange(0, 360), gauss(45, 12)),
      mkTau(pick(['+', '-']), randRange(0, 360), gauss(40, 12)),
    ];
    return { objects: objs, met: { magnitude: gauss(50, 15), angle: randRange(0, 360) } };
  },
};

function maybeAddJets(objs, n) {
  for (let i = 0; i < n; i++) objs.push(mkJet(randRange(0, 360), randRange(25, 60)));
}
function softMet() {
  return { magnitude: randRange(1, 12), angle: randRange(0, 360) };
}

// --- pileup ------------------------------------------------------------------
// Overlay soft tracks and a couple of soft jets to make the display realistic.
function addPileup(objects, level) {
  const nTracks = randInt(level * 3, level * 6);
  for (let i = 0; i < nTracks; i++) objects.push(mkPileupTrack());
  const nJets = randInt(0, level);
  for (let i = 0; i < nJets; i++) {
    const j = mkJet(randRange(0, 360), randRange(15, 30));
    j.fromHardProcess = false; j.truthLabel = 'Pileup';
    objects.push(j);
  }
}

// --- feature computation -----------------------------------------------------
// Reduce an event's objects + MET to the numbers the Analysis Lab cuts on.
export function computeFeatures(objects, met) {
  const muons = objects.filter((o) => o.kind === 'muon');
  const electrons = objects.filter((o) => o.kind === 'electron');
  const photons = objects.filter((o) => o.kind === 'photon');
  const jets = objects.filter((o) => o.kind === 'jet' && o.fromHardProcess);
  const bjets = objects.filter((o) => o.kind === 'bjet');
  const taus = objects.filter((o) => o.kind === 'tau');
  const leptons = [...muons, ...electrons];

  const leadPt = (arr) => (arr.length ? Math.max(...arr.map((o) => o.pt)) : 0);
  // Isolation cuts should require ALL relevant candidates to be isolated, so we
  // report the WORST (largest) isolation among them.
  const worstIso = (arr) => (arr.length ? Math.max(...arr.map((o) => o.iso)) : 1);
  const worstIsoLeading2 = (arr) => {
    if (arr.length < 2) return arr.length ? arr[0].iso : 1;
    const s = [...arr].sort((a, b) => b.pt - a.pt);
    return Math.max(s[0].iso, s[1].iso);
  };

  // Best opposite-charge dimuon mass (closest to Z), else two leading muons.
  let dimuonMass = null, dimuonOS = false;
  if (muons.length >= 2) {
    let best = null;
    for (let i = 0; i < muons.length; i++)
      for (let j = i + 1; j < muons.length; j++) {
        const os = muons[i].charge !== muons[j].charge;
        const m = pairMass(muons[i], muons[j], MUON_MASS);
        if (best === null || (os && !best.os) ||
            (os === best.os && Math.abs(m - Z_MASS) < Math.abs(best.m - Z_MASS))) {
          best = { m, os };
        }
      }
    dimuonMass = best.m; dimuonOS = best.os;
  }

  // Diphoton mass of the two leading photons.
  let diphotonMass = null;
  if (photons.length >= 2) {
    const sorted = [...photons].sort((a, b) => b.pt - a.pt);
    diphotonMass = pairMass(sorted[0], sorted[1], 0);
  }

  // Transverse mass of leading lepton + MET (W Jacobian).
  let mT = null;
  if (leptons.length >= 1 && met) {
    const l = leptons.reduce((a, b) => (b.pt > a.pt ? b : a));
    const dphi = degToRad(l.angle - met.angle);
    mT = Math.sqrt(2 * l.pt * met.magnitude * (1 - Math.cos(dphi)));
  }

  const HT = jets.concat(bjets).reduce((s, j) => s + j.pt, 0);

  return {
    nMuons: muons.length,
    nElectrons: electrons.length,
    nLeptons: leptons.length,
    nPhotons: photons.length,
    nJets: jets.length,
    nBjets: bjets.length,
    nJetsTotal: jets.length + bjets.length,
    nTaus: taus.length,
    met: met ? met.magnitude : 0,
    leadMuonPt: leadPt(muons),
    leadPhotonPt: leadPt(photons),
    leadLeptonPt: leadPt(leptons),
    muonIso: worstIso(muons),
    photonIso: worstIsoLeading2(photons),
    oppositeCharge: dimuonOS,
    dimuonMass, diphotonMass, mT, HT,
  };
}

// --- public: single display event -------------------------------------------
// Build one event for the Event Explorer: a hard process + pileup.
export function makeDisplayEvent(processName, pileupLevel = 3) {
  const proc = PROCESSES[processName];
  const { objects, met } = proc();
  addPileup(objects, pileupLevel);
  const features = computeFeatures(objects, met);
  return { id: uid('evt'), processName, objects, missingEnergy: met, features };
}

// --- public: weighted dataset for the Analysis Lab --------------------------
// `mission.processes` = [{ name, kind:'signal'|'bkg', expected }]. We generate
// `mcPerProcess` MC events per process and weight each so the summed weights
// reproduce the expected pre-cut yields (standard MC practice).
export function makeDataset(mission, mcPerProcess = 140) {
  const events = [];
  for (const p of mission.processes) {
    const w = p.expected / mcPerProcess;
    for (let i = 0; i < mcPerProcess; i++) {
      const { objects, met } = PROCESSES[p.name]();
      // light pileup so isolation/MET look realistic without dominating
      addPileup(objects, 1);
      const features = computeFeatures(objects, met);
      events.push({
        processName: p.name,
        truth: p.kind === 'signal' ? 'signal' : 'bkg',
        weight: w,
        features,
        // value that goes on the observable axis for this mission
        observable: features[mission.observable.feature] ?? null,
      });
    }
  }
  return events;
}

export { PROCESSES };
