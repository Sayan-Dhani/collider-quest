// physics.js
// Small physics helpers for Collider Quest. These are deliberately simplified
// educational approximations, not a real detector simulation.

// Fundamental-ish constants used by the game (GeV).
export const Z_MASS = 91.2;      // Z boson mass
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

// Uniform random float in [min, max).
export function randRange(min, max) {
  return min + Math.random() * (max - min);
}

// Random integer in [min, max] inclusive.
export function randInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

// Random element of an array.
export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
