// physics.js
// Small physics helpers for Collider Quest. These are deliberately simplified
// educational approximations, not a real detector simulation.

// Fundamental-ish constants used by the game (GeV).
export const Z_MASS = 91.2;      // Z boson mass
export const W_MASS = 80.4;      // W boson mass
export const HIGGS_MASS = 125.0; // Higgs boson mass
export const TOP_MASS = 172.5;   // top quark mass
export const MUON_MASS = 0.1057; // muon mass (~0.106 GeV, negligible vs Z)

// Convert a game "angle" in degrees (0 = +x axis, counter-clockwise) to radians.
export function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

// Build a simple 4-momentum for a nearly-massless object moving in the
// transverse plane. We treat the object as ultra-relativistic (E ~= |p|),
// which is a fine approximation for high-momentum muons.
//   p     : momentum magnitude (GeV)
//   angle : direction in degrees within the transverse plane
//   mass  : rest mass (GeV), used for the energy term
export function fourMomentum(p, angleDeg, mass = MUON_MASS) {
  const a = degToRad(angleDeg);
  const px = p * Math.cos(a);
  const py = p * Math.sin(a);
  // Transverse-only view: no pz in this simplified 2D picture.
  const E = Math.sqrt(p * p + mass * mass);
  return { E, px, py, pz: 0 };
}

// Invariant mass of a system of 4-momenta:
//   M^2 = (sum E)^2 - |sum p|^2
export function invariantMass(fourMomenta) {
  let E = 0, px = 0, py = 0, pz = 0;
  for (const q of fourMomenta) {
    E += q.E; px += q.px; py += q.py; pz += q.pz;
  }
  const m2 = E * E - (px * px + py * py + pz * pz);
  return Math.sqrt(Math.max(0, m2));
}

// Invariant mass of two muon-like objects given their {momentum, angle}.
export function dimuonMass(objA, objB) {
  const qa = fourMomentum(objA.momentum, objA.angle, MUON_MASS);
  const qb = fourMomentum(objB.momentum, objB.angle, MUON_MASS);
  return invariantMass([qa, qb]);
}

// Invariant mass of two objects (each has {pt, angle}), treated with the given
// rest mass. Used for dimuon (mass=MUON_MASS) and diphoton (mass=0) spectra.
export function pairMass(objA, objB, mass = 0) {
  const qa = fourMomentum(objA.pt ?? objA.momentum, objA.angle, mass);
  const qb = fourMomentum(objB.pt ?? objB.momentum, objB.angle, mass);
  return invariantMass([qa, qb]);
}

// --- random numbers ----------------------------------------------------------
// Mulberry32: a tiny seedable PRNG. The game seeds itself from Math.random() at
// load so play stays varied; the node tests call setSeed() for reproducible
// datasets (the winnability assertions must not flake).
let _rng;
export function setSeed(seed) {
  let a = seed >>> 0;
  _rng = () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
setSeed(Math.floor(Math.random() * 2 ** 32));

// Uniform random float in [0, 1).
export function rand() {
  return _rng();
}

// Gaussian sample (Box-Muller) centered on `mean` with std `sigma`.
export function gauss(mean, sigma) {
  let u = 0, v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  const n = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + sigma * n;
}

// Asimov discovery significance for S signal over B background events. This is
// the standard sqrt(2((S+B)ln(1+S/B) - S)), which behaves well for small B
// (unlike naive S/sqrt(B), which blows up). Returns significance in "sigma".
export function significance(S, B) {
  if (S <= 0) return 0;
  if (B <= 0.001) B = 0.001;
  const z2 = 2 * ((S + B) * Math.log(1 + S / B) - S);
  return Math.sqrt(Math.max(0, z2));
}

// Uniform random float in [min, max).
export function randRange(min, max) {
  return min + rand() * (max - min);
}

// Random integer in [min, max] inclusive.
export function randInt(min, max) {
  return Math.floor(min + rand() * (max - min + 1));
}

// Random element of an array.
export function pick(arr) {
  return arr[Math.floor(rand() * arr.length)];
}
