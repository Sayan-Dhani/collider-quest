// v2 logic tests: features, dataset weighting, cuts, and winnability.
const R = '/eos/home-s/sadhani/claude_code_test/collider-quest/js';
const { makeDataset, makeDisplayEvent, PROCESSES } = await import(`${R}/events.js`);
const { MISSIONS, getMission } = await import(`${R}/missions.js`);
const { initStates, computeResult, binStacked, confidenceLabel } = await import(`${R}/analysis.js`);

let fail = 0;
const ok = (c, m) => { console.log((c ? '  ok  ' : ' FAIL ') + m); if (!c) fail++; };

// 1. Z_mumu display event has two OS muons near the Z mass.
{
  const e = makeDisplayEvent('Z_mumu', 3);
  ok(e.features.nMuons >= 2, `Z event has >=2 muons (${e.features.nMuons})`);
  ok(e.features.oppositeCharge, 'Z muons opposite charge');
  ok(Math.abs(e.features.dimuonMass - 91.2) < 12, `dimuon mass ~91 (${e.features.dimuonMass.toFixed(1)})`);
  ok(e.objects.some(o => o.kind === 'pileupTrack'), 'display event includes pileup');
}

// 2. ttbar_2mu has b-jets and real MET; QCD fake muons are non-isolated.
{
  let bj = 0, met = 0, n = 200;
  for (let i = 0; i < n; i++) { const f = makeDisplayEvent('ttbar_2mu', 1).features; bj += f.nBjets; met += f.met; }
  ok(bj / n > 1.5, `ttbar avg b-jets ${(bj/n).toFixed(1)} (>1.5)`);
  ok(met / n > 30, `ttbar avg MET ${(met/n).toFixed(0)} GeV (>30)`);
  let iso = 0; for (let i = 0; i < n; i++) iso += makeDisplayEvent('QCD_fake', 1).features.muonIso;
  ok(iso / n > 0.25, `QCD fake muon avg iso ${(iso/n).toFixed(2)} (non-isolated)`);
}

// 3. Higgs diphoton peaks at 125; continuum is smooth.
{
  const hs = []; for (let i = 0; i < 500; i++) hs.push(makeDisplayEvent('H_gg', 1).features.diphotonMass);
  const mean = hs.reduce((a, b) => a + b) / hs.length;
  ok(Math.abs(mean - 125) < 5, `H->gg mean ${mean.toFixed(1)} ~125`);
}

// 4. Dataset weighting reproduces expected yields.
{
  const m = getMission('higgs-gg');
  const ds = makeDataset(m, 120);
  const byProc = {};
  for (const ev of ds) byProc[ev.processName] = (byProc[ev.processName] || 0) + ev.weight;
  for (const p of m.processes) {
    ok(Math.abs(byProc[p.name] - p.expected) < 1, `${p.name} weighted yield ~${p.expected} (${byProc[p.name].toFixed(0)})`);
  }
}

// 5. WINNABILITY: a good analyst's cuts reach each mission's target significance.
function goodStates(m) {
  const s = initStates(m);
  for (const c of m.cuts) {
    s[c.id].enabled = true;
    if (c.kind === 'window') s[c.id].value = c.id === 'mass' ? (m.id === 'higgs-gg' ? 3 : 5) : c.value;
    else if (c.kind === 'max' && c.feature.includes('Iso')) s[c.id].value = 0.15;
    else s[c.id].value = c.value;
  }
  // Don't require BOTH b-tag toggles at once where redundant; keep as-is (>=1 and >=2 both on == >=2).
  return s;
}
for (const m of MISSIONS) {
  if (m.locked) continue;
  const ds = makeDataset(m, 200);
  const r = computeResult(ds, m, goodStates(m));
  ok(r.significance >= m.target,
    `${m.id}: significance ${r.significance.toFixed(1)}σ >= target ${m.target}σ  (S=${r.S.toFixed(0)}, B=${r.B.toFixed(0)}, sigEff=${(r.sigEff*100)|0}%, bkgEff=${(r.bkgEff*100)|0}%)`);
}

// 6. No cuts => significance is low (there IS a discovery arc to climb).
for (const m of MISSIONS) {
  if (m.locked) continue;
  const ds = makeDataset(m, 200);
  const r = computeResult(ds, m, initStates(m));
  ok(r.significance < m.target, `${m.id}: pre-cut significance ${r.significance.toFixed(1)}σ < target (arc exists)`);
}

// 7. binStacked buckets weighted signal/bkg correctly.
{
  const m = getMission('z-mumu');
  const ds = makeDataset(m, 100);
  const r = computeResult(ds, m, goodStates(m));
  const passing = ds.filter(ev => {
    const s = goodStates(m);
    return true; // computeResult already filtered; re-derive for bin test below
  });
  const binned = binStacked(ds.filter(ev => ev.observable != null && ev.truth === 'signal'), m.observable);
  const total = binned.sig.reduce((a, b) => a + b, 0);
  ok(total > 0, 'binStacked accumulates signal weight');
}

console.log(fail === 0 ? '\nALL PASS' : `\n${fail} FAILURES`);
process.exit(fail === 0 ? 0 : 1);
