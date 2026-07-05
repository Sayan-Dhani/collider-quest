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
  rand, randRange, randInt, pick, gauss, degToRad,
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
    charge, iso: randRange(0.02, 0.12), // real taus: narrow AND isolated
    ecal: pt * randRange(0.2, 0.4), hcal: pt * randRange(0.4, 0.7),
    nprong: pick([1, 1, 3]),
  });

// A light jet the tau algorithm mis-identified: narrow like a tau, but NOT
// isolated. Its truth is 'Jet' — the tau-quality cut is what removes it.
const mkFakeTau = (angle, pt) =>
  base('tau', 'Jet', angle, pt, {
    charge: pick(['+', '-']), iso: randRange(0.3, 0.8),
    ecal: pt * randRange(0.2, 0.4), hcal: pt * randRange(0.5, 0.9),
    nprong: pick([1, 3, 3]),
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

// --- imperfect tagging -------------------------------------------------------
// Object identification is NOT truth: a real b-jet is only tagged when the
// displaced vertex is found, light jets sometimes fake a b-tag or a hadronic
// tau. These round numbers are stated in the cut hints so the simplification
// is explicit. This is what turns b-tag/tau cuts from switches into trade-offs.
const B_TAG_EFF = 0.7;     // chance a real b-jet gets b-tagged
const MISTAG_RATE = 0.05;  // chance a light jet fakes a b-tag
const TAU_FAKE_RATE = 0.12; // chance a light jet passes a loose tau ID

// A real b-quark jet as the detector reports it: usually b-tagged (displaced
// vertex found), otherwise it looks like any other jet.
const bQuarkJet = (angle, pt) =>
  rand() < B_TAG_EFF ? mkBjet(angle, pt) : mkJet(angle, pt);

// A light-quark/gluon jet as the detector reports it: usually a jet, sometimes
// a fake b-tag, sometimes a fake hadronic tau.
function lightJet(angle, pt) {
  const r = rand();
  if (r < MISTAG_RATE) return mkBjet(angle, pt);
  if (r < MISTAG_RATE + TAU_FAKE_RATE) return mkFakeTau(angle, pt);
  return mkJet(angle, pt);
}

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

// --- transverse balance ------------------------------------------------------
// Real collisions balance in the transverse plane, and MET is exactly what a
// detector infers from that: minus the vector sum of everything visible (plus
// a soft unclustered-energy smear). Generators therefore arrange their visible
// objects so that any residual imbalance IS the invisible system (neutrinos),
// and MET follows by construction — the event display and the features can no
// longer contradict the "missing momentum = imbalance" lesson.

function visibleSum(objs) {
  let px = 0, py = 0;
  for (const o of objs) {
    if (!o.fromHardProcess) continue;
    const a = degToRad(o.angle);
    px += o.pt * Math.cos(a);
    py += o.pt * Math.sin(a);
  }
  return { px, py };
}

function toPolar(px, py) {
  let angle = (Math.atan2(py, px) * 180) / Math.PI;
  if (angle < 0) angle += 360;
  return { magnitude: Math.hypot(px, py), angle };
}

// MET = -(vector sum of visible hard-process pT) + soft resolution smear.
function metFromBalance(objs, softSigma = 6) {
  const { px, py } = visibleSum(objs);
  return toPolar(-px + gauss(0, softSigma), -py + gauss(0, softSigma));
}

// A pair produced off-back-to-back has net pT: physically it recoiled against
// a jet. Add that balancing jet so the event genuinely balances (small
// residuals are left to the soft term in metFromBalance).
function addRecoilJet(objs) {
  const { px, py } = visibleSum(objs);
  const r = toPolar(-px, -py);
  if (r.magnitude < 12) return;
  objs.push(lightJet(r.angle, r.magnitude));
}

// Extra hadronic activity that does not fake MET: jets in back-to-back pairs.
function addBalancedJetPairs(objs, nPairs, lo = 25, hi = 60) {
  for (let i = 0; i < nPairs; i++) {
    const a = randRange(0, 360);
    const p = randRange(lo, hi);
    objs.push(lightJet(a, p));
    objs.push(lightJet((a + 180 + randRange(-6, 6) + 360) % 360, p * randRange(0.9, 1.1)));
  }
}

// W -> mu nu transverse decay: the muon and neutrino share the W mass
// back-to-back, each with pT = (m/2)·sin(theta*). Uniform cos(theta*) piles
// the pT up just below m/2 — the Jacobian peak — so mT ~= 2·pT ends in a sharp
// edge at the W mass. The neutrino is implicit: MET = -(sum of visibles).
function wDecayMuon() {
  const m = gauss(W_MASS, 2.1);
  const cosT = randRange(-1, 1);
  const p = (m / 2) * Math.sqrt(1 - cosT * cosT);
  return mkMuon(pick(['+', '-']), randRange(0, 360), Math.max(3, p * (1 + gauss(0, 0.04))));
}

const PROCESSES = {
  // Z -> mu mu : two isolated opposite-charge muons, dimuon mass ~ Z. No
  // invisibles, so after the recoil jet the event balances and MET is small.
  Z_mumu() {
    const [a1, a2] = twoBackToBack(25);
    const c = pick(['+', '-']);
    const p = ptForMass(gauss(Z_MASS, 3), a1, a2);
    const objs = [mkMuon(c, a1, p), mkMuon(opp(c), a2, p)];
    addRecoilJet(objs);
    return { objects: objs, met: metFromBalance(objs, 5) };
  },

  // Non-resonant Drell-Yan (gamma* -> mumu): the same signature as the Z, on a
  // smooth ~1/m^2 spectrum from 25 to 200 GeV with NO hole — part of it sits
  // right under the Z peak, so the mass window can never remove all of it.
  DY_continuum() {
    const [a1, a2] = twoBackToBack(60);
    const c = pick(['+', '-']);
    const m = 25 / (1 - rand() * (1 - 25 / 200)); // 1/m^2 fall, 25..200
    const p = ptForMass(m, a1, a2);
    const objs = [mkMuon(c, a1, p), mkMuon(opp(c), a2, p)];
    addRecoilJet(objs);
    return { objects: objs, met: metFromBalance(objs, 5) };
  },

  // ttbar -> 2 leptons + 2 b-jets. The two neutrinos are the residual
  // imbalance of the visible system -> genuine, correlated MET. b-tagging is
  // imperfect, so ~9% of these slip past a b-jet veto untagged.
  ttbar_2mu() {
    const [a1, a2] = twoBackToBack(70);
    const [b1, b2] = twoBackToBack(60);
    const c = pick(['+', '-']);
    const objs = [
      mkMuon(c, a1, gauss(40, 12)),
      mkMuon(opp(c), a2, gauss(40, 12)),
      bQuarkJet(b1, gauss(70, 20)),
      bQuarkJet(b2, gauss(60, 18)),
    ];
    return { objects: objs, met: metFromBalance(objs, 8) };
  },

  // QCD multijet: jets balance each other (the last one closes the event), a
  // fake muon sits inside a jet. MET is small — except for an occasional
  // mismeasured-jet tail, so a MET cut is a trade-off, not a switch.
  QCD_fake() {
    const objs = [];
    const nj = randInt(3, 5);
    for (let i = 0; i < nj - 1; i++) objs.push(lightJet(randRange(0, 360), randRange(30, 90)));
    const { px, py } = visibleSum(objs);
    const close = toPolar(-px, -py);
    objs.push(lightJet(close.angle, Math.max(25, close.magnitude)));
    objs.push(mkFakeMuon((objs[0].angle + randRange(-12, 12) + 360) % 360, randRange(10, 30)));
    const soft = rand() < 0.2 ? 18 : 6; // 20%: badly mismeasured jet
    return { objects: objs, met: metFromBalance(objs, soft) };
  },

  // W -> mu nu : Jacobian-peak muon; the neutrino is exactly what is missing,
  // so MET points opposite the muon and mT edges sharply at the W mass.
  W_munu() {
    const objs = [wDecayMuon()];
    if (rand() < 0.35) addBalancedJetPairs(objs, 1);
    return { objects: objs, met: metFromBalance(objs) };
  },

  // H -> gamma gamma : two isolated photons, diphoton mass ~ 125 (narrow).
  // (ptForMass always yields pT >= m/2 >= 40 GeV here — no clamp needed.)
  H_gg() {
    const [a1, a2] = twoBackToBack(35);
    const p = ptForMass(gauss(HIGGS_MASS, 1.6), a1, a2);
    const objs = [mkPhoton(a1, p), mkPhoton(a2, p)];
    addRecoilJet(objs);
    return { objects: objs, met: metFromBalance(objs, 5) };
  },

  // Continuum diphoton background: two real photons, smoothly falling mass.
  gg_continuum() {
    const [a1, a2] = twoBackToBack(70);
    const m = 80 + Math.pow(rand(), 2.2) * 100; // smoothly falling 80..180
    const p = ptForMass(m, a1, a2);
    const objs = [mkPhoton(a1, p), mkPhoton(a2, p)];
    addRecoilJet(objs);
    return { objects: objs, met: metFromBalance(objs, 5) };
  },

  // gamma + jet: one real photon + a jet whose leading pi0 fakes a photon
  // (high isolation). Removed by the isolation cut.
  gamma_jet() {
    const [a1, a2] = twoBackToBack(70);
    const m = 80 + Math.pow(rand(), 1.8) * 100;
    const p = ptForMass(m, a1, a2);
    const real = mkPhoton(a1, p);
    const fake = mkPhoton(a2, p, randRange(0.25, 0.7)); // non-isolated fake
    fake.hcal = fake.pt * randRange(0.4, 0.8);
    const objs = [real, fake];
    addRecoilJet(objs);
    addBalancedJetPairs(objs, randInt(0, 1));
    return { objects: objs, met: metFromBalance(objs, 5) };
  },

  // ttbar -> lepton + jets : Jacobian W muon + 2 b-jets + 2 light jets. The
  // single neutrino (plus jet residuals) is the imbalance -> real MET. The W
  // sometimes decays to a REAL tau instead of a muon (and rarely both Ws do),
  // which is what makes ttbar the irreducible background of HH -> bbtautau.
  ttbar_lj() {
    const r = rand();
    const objs = [];
    if (r < 0.015) {
      // both Ws -> tau nu : 2 real taus + 2 b-jets, no light jets
      const [t1, t2] = twoBackToBack(60);
      objs.push(mkTau(pick(['+', '-']), t1, gauss(45, 12)));
      objs.push(mkTau(pick(['+', '-']), t2, gauss(40, 12)));
    } else if (r < 0.15) {
      // one W -> tau nu (hadronic tau replaces the muon)
      objs.push(mkTau(pick(['+', '-']), randRange(0, 360), gauss(42, 12)));
      addBalancedJetPairs(objs, 1, 35, 70);
    } else {
      objs.push(wDecayMuon());
      addBalancedJetPairs(objs, 1, 35, 70);
    }
    const [b1, b2] = twoBackToBack(60);
    objs.push(bQuarkJet(b1, gauss(75, 20)));
    objs.push(bQuarkJet(b2, gauss(65, 18)));
    return { objects: objs, met: metFromBalance(objs, 7) };
  },

  // W + jets : same W decay + balanced jet activity, (usually) no b-jets.
  Wjets() {
    const objs = [wDecayMuon()];
    addBalancedJetPairs(objs, randInt(1, 2), 30, 65);
    // occasional real b from gluon splitting (then tagged with B_TAG_EFF)
    for (let i = 0; i < objs.length; i++) {
      const o = objs[i];
      if (o.kind === 'jet' && rand() < 0.12) objs[i] = bQuarkJet(o.angle, o.pt);
    }
    return { objects: objs, met: metFromBalance(objs, 6) };
  },

  // HH -> bb tautau : one Higgs -> two b-jets whose pair mass reconstructs
  // near (a bit below) 125 GeV, the other -> two real taus. Tau decays lose
  // neutrinos, so the residual imbalance of the visible system is genuine MET.
  HH_bbtautau() {
    const [b1, b2] = twoBackToBack(70);
    const [t1, t2] = twoBackToBack(50);
    // Visible m(bb) sits below 125: neutrinos in b decays + energy losses.
    const pb = ptForMass(gauss(112, 16), b1, b2);
    const objs = [
      bQuarkJet(b1, pb),
      bQuarkJet(b2, pb),
      mkTau(pick(['+', '-']), t1, gauss(45, 12)),
      mkTau(pick(['+', '-']), t2, gauss(40, 12)),
    ];
    return { objects: objs, met: metFromBalance(objs, 8) };
  },
};

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

  // Pair mass of the two leading b-TAGGED jets (H -> bb reconstruction).
  let mbb = null;
  if (bjets.length >= 2) {
    const sorted = [...bjets].sort((a, b) => b.pt - a.pt);
    mbb = pairMass(sorted[0], sorted[1], 0);
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
    tauIso: worstIsoLeading2(taus),
    oppositeCharge: dimuonOS,
    dimuonMass, diphotonMass, mbb, mT, HT,
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
// reproduce the expected pre-cut yields (standard MC practice). 250/process
// keeps rare-tail estimates (tau fakes, mistags) reasonably smooth.
export function makeDataset(mission, mcPerProcess = 250) {
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

// --- raw detector hits -------------------------------------------------------
// Generate simulated raw detector hits for an object, used by the
// reconstruction chapter to teach how detector signals become physics objects.

export function generateRawHits(obj) {
  const nTrkHits = obj.kind === 'pileupTrack' ? 3 : 4 + Math.min(Math.floor(obj.pt / 15), 6);
  const trackerHits = [];
  for (let i = 0; i < nTrkHits; i++) {
    const r = 4 + (i / Math.max(nTrkHits - 1, 1)) * 28;
    const bend = ((obj.charge === '+' ? 1 : obj.charge === '-' ? -1 : 0) * 0.08 * (1 - 10 / (obj.pt + 10)));
    const phi = degToRad(obj.angle) + bend * (i / nTrkHits) + gauss(0, 0.008);
    trackerHits.push({ layer: i, r, phi, x: r * Math.cos(phi), y: r * Math.sin(phi) });
  }

  const ecalCells = [];
  if (['muon', 'electron', 'photon', 'jet', 'bjet', 'tau'].includes(obj.kind)) {
    const nCells = (obj.kind === 'jet' || obj.kind === 'bjet' ? 6 + randInt(0, 5) : 2 + randInt(0, 3));
    for (let i = 0; i < nCells; i++) {
      const dPhi = gauss(0, obj.kind === 'jet' || obj.kind === 'bjet' ? 0.06 : 0.02);
      ecalCells.push({
        energy: Math.max(0.1, obj.ecal / nCells * (1 + gauss(0, 0.12))),
        eta: gauss(0, 0.03), phi: degToRad(obj.angle) + dPhi,
      });
    }
  }

  const hcalCells = [];
  if (['jet', 'bjet', 'tau', 'muon'].includes(obj.kind)) {
    const nCells = obj.kind === 'jet' || obj.kind === 'bjet' ? 4 + randInt(0, 4) : 1 + randInt(0, 2);
    for (let i = 0; i < nCells; i++) {
      hcalCells.push({
        energy: Math.max(0.1, obj.hcal / nCells * (1 + gauss(0, 0.15))),
        phi: degToRad(obj.angle) + gauss(0, obj.kind === 'jet' || obj.kind === 'bjet' ? 0.08 : 0.03),
      });
    }
  }

  const muonHits = obj.reachesMuonSystem
    ? [{ station: 1, phi: degToRad(obj.angle) }, { station: 2, phi: degToRad(obj.angle) + gauss(0, 0.01) }]
    : [];

  return { trackerHits, ecalCells, hcalCells, muonHits };
}

export { PROCESSES };
