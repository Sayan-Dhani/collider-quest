# Collider Quest — Find the Z Boson

> **Collide particles. Decode the traces. Discover the invisible.**

An educational, browser-based particle-physics game. You operate a simplified
LHC, look at **CMS detector traces** (not particles directly), identify the
objects, classify each event, and build an invariant-mass histogram until a
**Z-boson peak** emerges from the data — exactly the way an experimental particle
physicist reconstructs a particle that decays too quickly to ever see.

This is the **MVP vertical slice** ("Mission: The Muon Trail") described in the
project's design documents: signal **Z → μμ** against **W → μν** and **QCD
multijet** backgrounds.

## Play

It's a static site — no build step.

```bash
# from the repo root, start any static server, e.g.:
python3 -m http.server 8000
# then open http://localhost:8000
```

Or simply open `index.html` in a modern browser.

## Hosting / deployment

Live at **https://sayan-dhani.github.io/collider-quest**.

The site is a static build deployed by GitHub Actions
(`.github/workflows/pages.yml`) on every push to `main`. To reproduce the setup
on a fork: enable **Settings → Pages → Source: GitHub Actions**, then push.

### How to play
1. On a first play, **entering the LHC** walks you through five training
   chapters (replayable any time from the campaign screen; a link on the home
   screen skips them):
   **Build the Beam** — drive the real CERN injector chain, Linac4 → stripping
   foil → PS Booster → PS → SPS → LHC;
   **First Collisions** — the four experiments, pp vs Pb–Pb, and the
   luminosity ↔ pileup trade-off;
   **Inside CMS** — one interactive lesson per subsystem (tracker, ECAL, HCAL,
   muon chambers, missing pT);
   **From Hits to Physics Objects** — reconstruction mini-games (track
   fitting, ECAL clustering, particle flow) at three hint levels;
   **Trigger the Data** — pick a trigger strategy and see the rate / storage /
   signal-efficiency trade-off.
2. Then the accelerator map: two proton beams counter-rotate and **collide at
   four interaction points** — CMS and ATLAS opposite each other, ALICE and
   LHCb on the other axis. Watch the beams ramp to 6.8 TeV and the collisions
   flash. Click an experiment to learn about it; click **CMS** to start
   analysing its collisions.
3. Pick a mission from the campaign.
4. Read the **briefing** (story + the physics you're about to do).
5. **Event Explorer** — real events are messy: several processes plus pileup
   overlap in one display. Click objects to inspect their detector signals
   (track? reaches the muon chambers? isolated? displaced vertex?), identify
   them, and guess which process produced the event.
6. **Analysis Lab** — the heart of the game, and it looks like a real CMS
   analysis: **black data points** (recorded collisions — nobody knows which
   are signal) over an **MC prediction stacked by process**, with an
   uncertainty band and a **Data/MC ratio panel** underneath. Enable
   **selection cuts** and drag their thresholds — require two muons, opposite
   charge, isolation, a b-jet veto, a mass window, missing energy, b-tags…
   Watch, live:
   - the Data/MC plot (does the simulation describe the data?),
   - a **cutflow table** (S / B / data surviving each cut),
   - per-cut impact readouts, **signal kept / background kept / purity**, and
   - the **significance** climbing toward the target.
   Raise the **integrated luminosity** to reveal more data (∝ √luminosity).
   The first mission, Z→μμ, runs as a **guided analysis**: goal → trigger →
   object selection → backgrounds → mass window → Data/MC check → cutflow →
   rediscovery (the Z is calibration, not a discovery!). Missions and chapters
   award **concept cards** — the 📖 Concepts glossary explains every term, and
   a learning map always shows where you are in the experimental chain.

### Missions
Z → μμ · W → μν · H → γγ · tt̄ (b-tagging) · HH → bbττ · (heavy-ion: coming soon)

## How it works

Pure vanilla HTML/CSS/JS with the HTML Canvas — no frameworks, no bundler.

```
index.html              screens: home, chapters 1-5, accelerator, campaign, briefing, explorer, lab, result
styles.css              dark "control room" theme
js/
  chain.js              Chapter 1: CERN injector chain (Linac4 → ... → LHC)
  collisions.js         Chapter 2: experiments, pp vs PbPb, luminosity & pileup
  cms-school.js         Chapter 3: per-subsystem CMS lessons + mini-games
  reconstruction.js     Chapter 4: track-fit / ECAL-clustering / particle-flow games
  trigger.js            Chapter 5 UI + the shared TRIGGERS registry
  curriculum.js         learning map stages + concept cards (glossary)
  accelerator.js        LHC map: counter-rotating beams, 4 IPs, collisions
  physics.js            invariant mass, 4-momenta, Asimov significance, RNG
  events.js             object types, processes, pileup, features, datasets
  missions.js           campaign config: stories, observables, processes, cuts, triggers
  detector.js           CMS rendering (all object types + pileup) + hit-testing
  interaction.js        canvas mouse handling + object inspector
  analysis.js           cuts, significance, stacked histogram binning, cut UI
  histogram.js          Data/MC plot: per-process stack, data points, ratio panel
  content.js            identities, hints, feedback, closing text
  main.js               campaign flow + screen router
test/
  test-v2.mjs           node tests: features, weighting, cuts, triggers, winnability
```

Everything is **data-driven from `missions.js`**. A mission declares its signal
and background processes (with expected yields), which observable to plot,
which cuts the player can apply — and **which trigger recorded its dataset**:
events that fail the trigger never reach the Analysis Lab, and the Lab says so.
The Explorer and Analysis Lab are generic — a new scenario is a new entry, not
new engine code. The physics is deliberately simplified (educational, not a
real simulation) but the *logic* is real:
events **balance in the transverse plane** (missing pT is literally minus the
vector sum of what you see, so W events point their MET away from the muon and
the W transverse mass ends in a genuine Jacobian edge at 80.4 GeV), the
Drell–Yan continuum runs smoothly under the Z peak (irreducible background),
**object identification is imperfect** (b-tagging finds ~70% of real b-jets
and ~5% of light jets fake it; roughly one jet in eight fakes a loose tau, so
the HH → bbττ hunt lives or dies on tau ID quality — and plots m(bb)), and
the cuts are the real ones: isolation, mass windows, b-tag/MET requirements,
with Asimov significance `√(2((S+B)ln(1+S/B) − S))`.

## Test

```bash
npm test        # runs test/test-v2.mjs + test/dom-smoke.mjs
```

Runs on a **fixed RNG seed** (deterministic). Checks resonances reconstruct at
the right mass, the transverse plane balances (|Σ visible pT + MET| ≈ soft
term) for every process, the W mT spectrum has its Jacobian edge, the
Drell–Yan spectrum is continuous under the Z peak, dataset weighting
reproduces expected yields, isolation/b-tag behaviour is correct, and —
crucially — that every mission is **winnable with ≥10% headroom** (a good set
of cuts clears its target significance) yet has a real discovery arc (low
significance before cuts). The DOM smoke test then drives a full headless
playthrough.

## Roadmap

Implemented: Z → μμ, W → μν, H → γγ, tt̄ (b-tagging), HH → bbττ. Next:

- **Heavy-Ion Mode** — Pb–Pb collisions, jet quenching (a different mechanic)
- Track/calorimeter **reconstruction mini-games** (connect hits into tracks)
- Detector **calibration** (shift the energy scale so the Z peak lands at 91)

## License

MIT — see [LICENSE](LICENSE).

---

*Educational simplification, not a real detector simulation. Built for outreach:
to let anyone feel the logic of collider physics.*
