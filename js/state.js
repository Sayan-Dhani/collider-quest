// state.js
// Central game state for a single run plus the scoring rules (design doc §9).

export const RUN_LENGTH = 20; // events per run

// Scoring constants.
export const SCORE = {
  correctId: 10,
  correctClass: 20,
  signalToHistogram: 30,
  wrongId: -10,
  bgAsSignal: -20,
};

export function createRun() {
  return {
    score: 0,
    eventIndex: 0,          // how many events processed
    // Per-event working selection: objectId -> assigned identity label.
    selection: new Map(),
    // Aggregate run stats for the summary.
    stats: {
      processed: 0,
      zCandidatesSelected: 0, // events the player classified as Z
      correctZ: 0,            // classified Z AND truly signal
      contamination: 0,       // classified Z but truly background
      correctClass: 0,        // any correct classification
      idAttempts: 0,
      idCorrect: 0,
    },
    // Values feeding the invariant-mass histogram (accepted Z candidates).
    histogram: [],
    finished: false,
  };
}

// Record an object-identity guess. Returns whether it was correct.
export function scoreIdentity(run, object, chosenLabel) {
  run.stats.idAttempts++;
  const correct = object.truthLabel === chosenLabel;
  if (correct) {
    run.stats.idCorrect++;
    run.score += SCORE.correctId;
  } else {
    run.score += SCORE.wrongId;
  }
  return correct;
}

// Record an event classification. Returns { correct, addedToHistogram }.
export function scoreClassification(run, event, chosenClass) {
  const correct = event.correctClass === chosenClass;
  if (correct) run.stats.correctClass++;

  let addedToHistogram = false;
  if (chosenClass === 'Z_mumu') {
    run.stats.zCandidatesSelected++;
    if (event.truth === 'signal') {
      run.stats.correctZ++;
      // Add the reconstructed dimuon mass to the histogram.
      if (event.invariantMass != null) {
        run.histogram.push(event.invariantMass);
        addedToHistogram = true;
      }
      run.score += SCORE.signalToHistogram;
    } else {
      // Player accepted a background event as signal.
      run.stats.contamination++;
      run.score += SCORE.bgAsSignal;
    }
  } else if (correct) {
    run.score += SCORE.correctClass;
  }
  return { correct, addedToHistogram };
}

// Purity of the selected Z sample (correct Z / all Z candidates selected).
export function purity(run) {
  const sel = run.stats.zCandidatesSelected;
  return sel === 0 ? 1 : run.stats.correctZ / sel;
}

export function advance(run) {
  run.eventIndex++;
  run.stats.processed++;
  run.selection.clear();
  if (run.eventIndex >= RUN_LENGTH) run.finished = true;
}
