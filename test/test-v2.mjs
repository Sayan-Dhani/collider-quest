// v2 logic tests: features, kinematics, dataset weighting, cuts, winnability.
// Runs on a FIXED SEED so the stochastic assertions cannot flake.
const R = '../js';
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
  // Dense MC (rare tails matter), recorded through the mission's own trigger —
  // exactly how the Analysis Lab builds its dataset.
  const ds = makeDataset(m, 600, m.trigger);
  const r = computeResult(ds, m, goodStates(m));
  ok(r.significance >= m.target * 1.1,
    `${m.id}: significance ${r.significance.toFixed(1)}σ >= 1.1×target ${m.target}σ  (S=${r.S.toFixed(0)}, B=${r.B.toFixed(0)}, sigEff=${(r.sigEff*100)|0}%, bkgEff=${(r.bkgEff*100)|0}%)`);
}

// 9. No cuts => significance is low (there IS a discovery arc to climb),
// even though the trigger itself already rejected some background.
for (const m of MISSIONS) {
  if (m.locked) continue;
  const ds = makeDataset(m, 600, m.trigger);
  const r = computeResult(ds, m, initStates(m));
  ok(r.significance < m.target, `${m.id}: pre-cut significance ${r.significance.toFixed(1)}σ < target (arc exists)`);
}

// 9b. TRIGGER: every mission's trigger records most of its own signal, the
// dataset carries a trigger summary, and rejected events are truly absent.
{
  const { TRIGGERS, getTrigger } = await import(`${R}/trigger.js`);
  ok(TRIGGERS.length >= 6 && TRIGGERS.every(t => typeof t.test === 'function'),
    `TRIGGERS registry has ${TRIGGERS.length} pure trigger definitions`);
  for (const m of MISSIONS) {
    if (m.locked) continue;
    const ds = makeDataset(m, 300, m.trigger);
    ok(ds.trigger && ds.trigger.id === m.trigger && ds.trigger.sigKept > 0.6,
      `${m.id}: ${m.trigger} records ${(100 * ds.trigger.sigKept).toFixed(0)}% of signal (>60%)`);
    const trig = getTrigger(m.trigger);
    ok(ds.every(ev => trig.test(ev.features)),
      `${m.id}: every dataset event passed the ${m.trigger} trigger`);
  }
  // A mismatched trigger really does lose the channel: Z→μμ through jet+MET.
  const z = getMission('z-mumu');
  const bad = makeDataset(z, 300, 'jetMET');
  ok(bad.trigger.sigKept < 0.5,
    `wrong trigger loses signal: jetMET keeps ${(100 * bad.trigger.sigKept).toFixed(0)}% of Z→μμ (<50%)`);
}

// 9c. Tutorial chapter modules stay DOM-free at import time (CLAUDE.md
// invariant) and expose their teaching registries.
{
  const chainMod = await import(`${R}/chain.js`);
  const cms = await import(`${R}/cms-school.js`);
  const rec = await import(`${R}/reconstruction.js`);
  ok(chainMod.MACHINES.length === 6 && chainMod.MACHINES[0].id === 'linac4' && chainMod.MACHINES[5].id === 'lhc',
    'accelerator chain: Linac4 → ... → LHC (6 machines)');
  ok(cms.SUBSYSTEMS.length === 5 && cms.SUBSYSTEMS.map(s => s.id).join(',') === 'tracker,ecal,hcal,muon,met',
    'CMS school covers tracker, ECAL, HCAL, muon, MET');
  ok(rec.TASKS.length === 3, 'reconstruction chapter has 3 tasks');
}

// 9d. generateRawHits: raw-hit view matches each object's detector signature.
{
  const { generateRawHits } = await import(`${R}/events.js`);
  const muon = makeDisplayEvent('Z_mumu', 0).objects.find(o => o.kind === 'muon');
  const hm = generateRawHits(muon);
  ok(hm.trackerHits.length >= 4 && hm.muonHits.length >= 2,
    `muon raw hits: ${hm.trackerHits.length} tracker + ${hm.muonHits.length} muon-station hits`);
  const photon = makeDisplayEvent('H_gg', 0).objects.find(o => o.kind === 'photon');
  const hp = generateRawHits(photon);
  ok(hp.ecalCells.length >= 2 && hp.muonHits.length === 0,
    `photon raw hits: ${hp.ecalCells.length} ECAL cells, no muon hits`);
}

// 9e. PSEUDO-DATA: unweighted Poisson-fluctuated events, recorded through the
// trigger, revealed progressively by luminosity, truth never used by the UI.
{
  const { makePseudoData, dataAtLumi } = await import(`${R}/events.js`);
  const { getTrigger } = await import(`${R}/trigger.js`);
  const m = getMission('z-mumu');
  const pool = makePseudoData(m, m.trigger, 4);
  const all = dataAtLumi(pool, 4);
  const half = dataAtLumi(pool, 2);
  ok(all.every(ev => ev.sampleType === 'data' && ev.weight === 1),
    `pseudo-data: ${all.length} unweighted events (weight = 1)`);
  const trig = getTrigger(m.trigger);
  ok(all.every(ev => trig.test(ev.features)), 'pseudo-data: every event passed the trigger');
  // Count matches the trigger-filtered expectation (per-process keep rates
  // measured from MC) within Poisson + MC-statistics tolerance.
  const mc = makeDataset(m, 400, m.trigger);
  let expRec = 0;
  for (const p of m.processes) {
    const keep = mc.filter(ev => ev.processName === p.name).length / 400;
    expRec += p.expected * 4 * keep;
  }
  ok(Math.abs(all.length - expRec) < 0.08 * expRec,
    `pseudo-data count ${all.length} ~ expected ${expRec.toFixed(0)} (within 8%)`);
  ok(Math.abs(half.length - all.length / 2) < all.length * 0.02,
    `half the luminosity reveals ~half the data (${half.length} vs ${all.length})`);
  // computeResult must ignore data entirely (prediction is MC-only).
  const mixed = [...mc, ...all];
  const rMixed = computeResult(mixed, m, initStates(m));
  const rMC = computeResult(mc, m, initStates(m));
  ok(Math.abs(rMixed.S - rMC.S) < 1e-9 && Math.abs(rMixed.B - rMC.B) < 1e-9,
    'computeResult ignores data events (prediction is MC-only)');
}

// 9f. Data/MC binning + cutflow consistency.
{
  const { makePseudoData, dataAtLumi } = await import(`${R}/events.js`);
  const { binByProcess, binDataCounts, computeCutflow, filterPassing } = await import(`${R}/analysis.js`);
  const m = getMission('z-mumu');
  const mc = makeDataset(m, 400, m.trigger);
  const pool = makePseudoData(m, m.trigger, 4);
  const data = dataAtLumi(pool, 2);
  const states = goodStates(m);
  const r = computeResult(mc, m, states, 2);

  // Per-process stack totals equal the summed prediction; signal stacked last.
  const stack = binByProcess(r.passing, m, 2);
  const stackSum = stack.total.reduce((a, b) => a + b, 0);
  const procSum = stack.procs.reduce((a, p) => a + p.bins.reduce((x, y) => x + y, 0), 0);
  ok(Math.abs(stackSum - procSum) < 1e-6, 'binByProcess: process bins sum to the total');
  ok(stack.procs[stack.procs.length - 1].kind === 'signal', 'binByProcess: signal is stacked on top');
  ok(stack.err.every((e, i) => e >= 0 && (stack.total[i] === 0 || e > 0)),
    'binByProcess: prediction uncertainty present per filled bin');

  // Data bins: integer counts that sum to the passing data.
  const passData = filterPassing(m, data, states);
  const dbins = binDataCounts(passData, m.observable);
  const inRange = passData.filter(ev =>
    ev.observable != null && ev.observable >= m.observable.xmin && ev.observable < m.observable.xmax).length;
  ok(dbins.reduce((a, b) => a + b, 0) === inRange, `binDataCounts sums to ${inRange} in-range data events`);

  // Cutflow: monotone non-increasing, starts at totals, ends at the result.
  const rows = computeCutflow(mc, data, m, states, 2);
  ok(rows.length === 1 + m.cuts.length, `cutflow has ${rows.length} rows (trigger + ${m.cuts.length} cuts)`);
  let mono = true;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].S > rows[i - 1].S + 1e-9 || rows[i].B > rows[i - 1].B + 1e-9 || rows[i].nData > rows[i - 1].nData) mono = false;
  }
  ok(mono, 'cutflow is monotone non-increasing in S, B and data');
  const last = rows[rows.length - 1];
  ok(Math.abs(last.S - r.S) < 1e-6 && Math.abs(last.B - r.B) < 1e-6 && last.nData === passData.length,
    `cutflow final row matches computeResult (S=${last.S.toFixed(0)}, B=${last.B.toFixed(0)}, data=${last.nData})`);
}

// 9g. Curriculum layer + guided Z analysis + rediscovery wording.
{
  const cur = await import(`${R}/curriculum.js`);
  const { resultHeadline } = await import(`${R}/content.js`);
  ok(cur.STAGES.length === 7 && cur.STAGES[0].id === 'accelerator' && cur.STAGES[6].id === 'statistics',
    'learning map: 7 stages from accelerator to statistics');
  ok(Object.keys(cur.CONCEPTS).length >= 16, `${Object.keys(cur.CONCEPTS).length} concept cards defined`);
  for (const [ch, ids] of Object.entries(cur.CHAPTER_CONCEPTS)) {
    ok(ids.every(id => cur.CONCEPTS[id]), `${ch} unlocks valid concepts (${ids.join(', ')})`);
  }
  for (const m of MISSIONS) {
    if (!m.concepts) continue;
    ok(m.concepts.every(id => cur.CONCEPTS[id]), `${m.id} concepts all defined`);
  }
  const z = getMission('z-mumu');
  ok(Array.isArray(z.guide) && z.guide.length >= 8, `Z guided analysis has ${z.guide.length} steps`);
  const st = initStates(z);
  ok(z.guide.filter(s => s.done).every(s => s.done(st, { significance: 0 }, z) === false),
    'Z guide predicates start unsatisfied');
  st.twoMu.enabled = true; st.os.enabled = true;
  ok(z.guide[2].done(st, null, z) === true, 'Z guide step 3 completes when muon cuts are enabled');
  ok(resultHeadline(30, 18, z.resultWord) === z.resultWord,
    `rediscovery wording: "${z.resultWord}"`);
  ok(resultHeadline(6, 5) === 'Discovery!', 'searches still headline "Discovery!"');
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
