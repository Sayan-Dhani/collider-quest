// v2 logic tests: features, kinematics, dataset weighting, cuts, winnability.
// Runs on a FIXED SEED so the stochastic assertions cannot flake.
const R = '/eos/home-s/sadhani/claude_code_test/collider-quest/js';
const { makeDataset, makeDisplayEvent, PROCESSES } = await import(`${R}/events.js`);
const { MISSIONS, getMission } = await import(`${R}/missions.js`);
const { initStates, computeResult, binStacked, cutImpacts, confidenceLabel } = await import(`${R}/analysis.js`);
const { setSeed, degToRad } = await import(`${R}/physics.js`);

setSeed(20260705);

let fail = 0;
const ok = (c, m) => { console.log((c ? '  ok  ' : ' FAIL ') + m); if (!c) fail++; };

// 0. Determinism: the same seed reproduces the same event.
{
  setSeed(42);
  const a = makeDisplayEvent('Z_mumu', 2).features.dimuonMass;
  setSeed(42);
  const b = makeDisplayEvent('Z_mumu', 2).features.dimuonMass;
  ok(a === b, `seeded RNG is deterministic (${a.toFixed(3)})`);
  setSeed(20260705);
}

// 1. Z_mumu display event has two OS muons near the Z mass.
{
  const e = makeDisplayEvent('Z_mumu', 3);
  ok(e.features.nMuons >= 2, `Z event has >=2 muons (${e.features.nMuons})`);
  ok(e.features.oppositeCharge, 'Z muons opposite charge');
  ok(Math.abs(e.features.dimuonMass - 91.2) < 12, `dimuon mass ~91 (${e.features.dimuonMass.toFixed(1)})`);
  ok(e.objects.some(o => o.kind === 'pileupTrack'), 'display event includes pileup');
}

// 2. MET BALANCE: for every process, the visible hard-process objects plus the
// reported MET vector sum to ~zero (only the soft unclustered term remains).
{
  const names = Object.keys(PROCESSES);
  for (const name of names) {
    let sum = 0;
    const n = 200;
    for (let i = 0; i < n; i++) {
      const { objects, met } = PROCESSES[name]();
      let px = 0, py = 0;
      for (const o of objects) {
        if (!o.fromHardProcess) continue;
        const a = degToRad(o.angle);
        px += o.pt * Math.cos(a); py += o.pt * Math.sin(a);
      }
      const am = degToRad(met.angle);
      px += met.magnitude * Math.cos(am);
      py += met.magnitude * Math.sin(am);
      sum += Math.hypot(px, py);
    }
    const avg = sum / n;
    ok(avg < 18, `${name}: |sum(visible pT) + MET| avg ${avg.toFixed(1)} GeV (< 18, transverse plane balances)`);
  }
}

// 3. IMPERFECT TAGGING: ttbar's two true b-jets are tagged with ~70%
// efficiency each (avg ~1.4 tags), MET is real; QCD fakes non-isolated.
{
  let bj = 0, met = 0, n = 400;
  for (let i = 0; i < n; i++) { const f = makeDisplayEvent('ttbar_2mu', 1).features; bj += f.nBjets; met += f.met; }
  ok(bj / n > 1.2 && bj / n < 1.6, `ttbar avg b-tags ${(bj/n).toFixed(2)} (~1.4: 2 true b × 70% eff)`);
  ok(met / n > 30, `ttbar avg MET ${(met/n).toFixed(0)} GeV (>30)`);
  let iso = 0; for (let i = 0; i < n; i++) iso += makeDisplayEvent('QCD_fake', 1).features.muonIso;
  ok(iso / n > 0.25, `QCD fake muon avg iso ${(iso/n).toFixed(2)} (non-isolated)`);
}

// 3b. TAU FAKES + HH REALISM: light jets fake loose taus at a visible rate,
// real taus are isolated while fakes are not, and m(bb) reconstructs the
// Higgs (a bit below 125, as briefed).
{
  const n = 500;
  let fakeTaus = 0, realIso = 0, realN = 0;
  for (let i = 0; i < n; i++) {
    const e = makeDisplayEvent('Wjets', 0);
    fakeTaus += e.features.nTaus;
  }
  ok(fakeTaus / n > 0.1 && fakeTaus / n < 0.8,
    `Wjets avg fake-tau candidates ${(fakeTaus/n).toFixed(2)} (jets fake loose taus)`);
  let mbbSum = 0, mbbN = 0;
  for (let i = 0; i < n; i++) {
    const e = makeDisplayEvent('HH_bbtautau', 0);
    for (const o of e.objects) if (o.kind === 'tau' && o.truthLabel === 'Tau') { realIso += o.iso; realN++; }
    if (e.features.mbb != null) { mbbSum += e.features.mbb; mbbN++; }
  }
  ok(realN > 0 && realIso / realN < 0.15, `real taus are isolated (avg iso ${(realIso/realN).toFixed(2)})`);
  ok(mbbN / n > 0.35 && mbbN / n < 0.65,
    `HH double-b-tag fraction ${(mbbN/n).toFixed(2)} (~0.49 = 70%²)`);
  const mbbMean = mbbSum / mbbN;
  ok(mbbMean > 100 && mbbMean < 125, `HH m(bb) mean ${mbbMean.toFixed(0)} GeV (Higgs, shifted below 125)`);
}

// 3c. NO MAGIC BULLET: the "≥2 taus" toggle ALONE no longer reaches the HH
// target — fake taus keep enough background alive. Quality cuts are required.
{
  const m = getMission('hh-bbtautau');
  const ds = makeDataset(m, 600);
  const s = initStates(m);
  s.twoTau.enabled = true;
  const r = computeResult(ds, m, s);
  ok(r.significance < m.target,
    `hh: tau toggle alone gives ${r.significance.toFixed(1)}σ < ${m.target}σ target (S=${r.S.toFixed(0)}, B=${r.B.toFixed(0)})`);
}

// 4. W JACOBIAN EDGE: mT piles up below the W mass and dies above it.
{
  const n = 1500;
  let inEdge = 0, above95 = 0, above100 = 0;
  for (let i = 0; i < n; i++) {
    const mT = makeDisplayEvent('W_munu', 0).features.mT;
    if (mT >= 60 && mT <= 85) inEdge++;
    if (mT >= 95 && mT <= 120) above95++;
    if (mT > 100) above100++;
  }
  ok(inEdge / n > 3 * (above95 / n),
    `W mT Jacobian edge: ${(100*inEdge/n).toFixed(0)}% in [60,85] vs ${(100*above95/n).toFixed(1)}% in [95,120]`);
  ok(above100 / n < 0.05, `W mT beyond 100 GeV is rare (${(100*above100/n).toFixed(1)}% < 5%)`);
}

// 5. DRELL-YAN CONTINUITY: the non-resonant spectrum has no hole under the Z.
{
  const n = 4000;
  const bins = new Array(8).fill(0); // 76..108 in 4 GeV bins
  for (let i = 0; i < n; i++) {
    const m = makeDisplayEvent('DY_continuum', 0).features.dimuonMass;
    if (m >= 76 && m < 108) bins[Math.floor((m - 76) / 4)]++;
  }
  ok(bins.every(b => b > 0), `DY spectrum continuous under the Z peak (76-108 bins: ${bins.join(',')})`);
}

// 6. Higgs diphoton peaks at 125; continuum is smooth.
{
  const hs = []; for (let i = 0; i < 500; i++) hs.push(makeDisplayEvent('H_gg', 1).features.diphotonMass);
  const mean = hs.reduce((a, b) => a + b) / hs.length;
  ok(Math.abs(mean - 125) < 5, `H->gg mean ${mean.toFixed(1)} ~125`);
}

// 7. Dataset weighting reproduces expected yields.
{
  const m = getMission('higgs-gg');
  const ds = makeDataset(m, 120);
  const byProc = {};
  for (const ev of ds) byProc[ev.processName] = (byProc[ev.processName] || 0) + ev.weight;
  for (const p of m.processes) {
    ok(Math.abs(byProc[p.name] - p.expected) < 1, `${p.name} weighted yield ~${p.expected} (${byProc[p.name].toFixed(0)})`);
  }
}

// 8. WINNABILITY (with margin): a good analyst's cuts clear each mission's
// target with >=10% headroom, so play-through balance is robust.
function goodStates(m) {
  const s = initStates(m);
  for (const c of m.cuts) {
    s[c.id].enabled = true;
    if (c.kind === 'window') s[c.id].value = c.id === 'mass' ? (m.id === 'higgs-gg' ? 3 : 5) : c.value;
    else if (c.kind === 'max' && c.feature.includes('Iso')) s[c.id].value = 0.15;
    else s[c.id].value = c.value;
  }
  return s;
}
for (const m of MISSIONS) {
  if (m.locked) continue;
  const ds = makeDataset(m, 600); // dense MC: rare tails (tau fakes) matter
  const r = computeResult(ds, m, goodStates(m));
  ok(r.significance >= m.target * 1.1,
    `${m.id}: significance ${r.significance.toFixed(1)}σ >= 1.1×target ${m.target}σ  (S=${r.S.toFixed(0)}, B=${r.B.toFixed(0)}, sigEff=${(r.sigEff*100)|0}%, bkgEff=${(r.bkgEff*100)|0}%)`);
}

// 9. No cuts => significance is low (there IS a discovery arc to climb).
for (const m of MISSIONS) {
  if (m.locked) continue;
  const ds = makeDataset(m, 600);
  const r = computeResult(ds, m, initStates(m));
  ok(r.significance < m.target, `${m.id}: pre-cut significance ${r.significance.toFixed(1)}σ < target (arc exists)`);
}

// 10. binStacked buckets weighted signal correctly.
{
  const m = getMission('z-mumu');
  const ds = makeDataset(m, 100);
  const binned = binStacked(ds.filter(ev => ev.observable != null && ev.truth === 'signal'), m.observable);
  const total = binned.sig.reduce((a, b) => a + b, 0);
  ok(total > 0, 'binStacked accumulates signal weight');
}

// 11. cutImpacts: N-1 impacts are sane and the mass window hurts background
// far more than signal.
{
  const m = getMission('z-mumu');
  const ds = makeDataset(m, 200);
  const states = goodStates(m);
  const imp = cutImpacts(ds, m, states);
  const vals = Object.values(imp);
  ok(vals.length === m.cuts.length, `cutImpacts covers all ${m.cuts.length} enabled cuts`);
  ok(vals.every(v => v.sigRemoved >= 0 && v.sigRemoved <= 1 && v.bkgRemoved >= 0 && v.bkgRemoved <= 1),
    'cutImpacts fractions within [0,1]');
  ok(imp.mass.bkgRemoved > imp.mass.sigRemoved,
    `mass window removes more bkg (${(100*imp.mass.bkgRemoved)|0}%) than signal (${(100*imp.mass.sigRemoved)|0}%)`);
}

console.log(fail === 0 ? '\nALL PASS' : `\n${fail} FAILURES`);
process.exit(fail === 0 ? 0 : 1);
