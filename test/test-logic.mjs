// Sanity checks for the DOM-free game logic.
import { generateEvent, TEMPLATES } from '/eos/home-s/sadhani/claude_code_test/collider-quest/js/events.js';
import { createRun, scoreClassification, scoreIdentity, advance, purity, RUN_LENGTH } from '/eos/home-s/sadhani/claude_code_test/collider-quest/js/state.js';
import { Z_MASS } from '/eos/home-s/sadhani/claude_code_test/collider-quest/js/physics.js';

let fail = 0;
const ok = (cond, msg) => { console.log((cond ? '  ok  ' : ' FAIL ') + msg); if (!cond) fail++; };

// 1. Z events reconstruct near the Z mass.
const masses = [];
for (let i = 0; i < 400; i++) {
  const e = TEMPLATES.Z_mumu.generate();
  const muons = e.objects.filter(o => o.kind === 'muon');
  // recompute via generateEvent path for realism
}
let zMasses = [];
for (let i = 0; i < 2000; i++) {
  const e = generateEvent({ Z_mumu: 1 });
  if (e.invariantMass != null) zMasses.push(e.invariantMass);
}
const mean = zMasses.reduce((a, b) => a + b, 0) / zMasses.length;
const inWindow = zMasses.filter(m => m > 80 && m < 102).length / zMasses.length;
ok(Math.abs(mean - Z_MASS) < 6, `Z dimuon mean ${mean.toFixed(1)} GeV near ${Z_MASS}`);
ok(inWindow > 0.7, `${(inWindow*100).toFixed(0)}% of Z masses fall in 80-102 GeV window`);

// 2. Event mix produces all three types with correct truth/labels.
const seen = {};
for (let i = 0; i < 2000; i++) { const e = generateEvent(); seen[e.eventType] = (seen[e.eventType]||0)+1; }
ok(seen.Z_mumu && seen.W_munu && seen.QCD, `all event types generated: ${JSON.stringify(seen)}`);

// 3. Object shape + truthLabel rules.
let good = true;
for (let i = 0; i < 500; i++) {
  const e = generateEvent();
  for (const o of e.objects) {
    if (!o.id || !o.truthLabel) good = false;
    if (o.kind === 'muon' && (o.truthLabel !== 'Muon' || !o.reachesMuonSystem)) good = false;
    if (o.kind === 'jet' && o.truthLabel !== 'Jet') good = false;
    if (o.kind === 'fakeMuon' && (o.truthLabel !== 'Unknown' || o.reachesMuonSystem)) good = false;
  }
}
ok(good, 'object shape + truthLabel rules consistent');

// 4. Scoring: correct Z signal adds to histogram and scores +30.
{
  const run = createRun();
  const zEvent = generateEvent({ Z_mumu: 1 });
  const res = scoreClassification(run, zEvent, 'Z_mumu');
  ok(res.correct && res.addedToHistogram, 'correct Z classification adds to histogram');
  ok(run.score === 30, `score after correct Z = ${run.score} (expect 30)`);
  ok(run.histogram.length === 1, 'histogram has one entry');
}

// 5. Scoring: background accepted as signal -> penalty + contamination.
{
  const run = createRun();
  const qcd = generateEvent({ QCD: 1 });
  const res = scoreClassification(run, qcd, 'Z_mumu');
  ok(!res.addedToHistogram, 'background not added to histogram');
  ok(run.score === -20, `score after bg-as-signal = ${run.score} (expect -20)`);
  ok(run.stats.contamination === 1, 'contamination counted');
}

// 6. Identity scoring.
{
  const run = createRun();
  const muon = { truthLabel: 'Muon' };
  ok(scoreIdentity(run, muon, 'Muon') === true && run.score === 10, 'correct ID scores +10');
  ok(scoreIdentity(run, muon, 'Jet') === false && run.score === 0, 'wrong ID scores -10');
}

// 7. Run advances and finishes at RUN_LENGTH.
{
  const run = createRun();
  for (let i = 0; i < RUN_LENGTH; i++) { ok.silent = true; advance(run); }
  ok(run.finished && run.stats.processed === RUN_LENGTH, `run finishes after ${RUN_LENGTH} events`);
  ok(purity(run) === 1, 'purity defaults to 1 with no selections');
}

console.log(fail === 0 ? '\nALL PASS' : `\n${fail} FAILURES`);
process.exit(fail === 0 ? 0 : 1);
