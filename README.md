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
1. From the home screen, **enter the LHC**. On the accelerator map, two proton
   beams counter-rotate and **collide at four interaction points** — CMS and
   ATLAS opposite each other, ALICE and LHCb on the other axis. Watch the beams
   ramp to 6.8 TeV and the collisions flash. Click an experiment to learn about
   it; click **CMS** to start analysing its collisions.
2. Pick a mission from the campaign.
3. Read the **briefing** (story + the physics you're about to do).
4. **Event Explorer** — real events are messy: several processes plus pileup
   overlap in one display. Click objects to inspect their detector signals
   (track? reaches the muon chambers? isolated? displaced vertex?), identify
   them, and guess which process produced the event.
5. **Analysis Lab** — the heart of the game. You get a whole dataset (a little
   signal buried in a lot of background). Enable **selection cuts** and drag
   their thresholds — require two muons, opposite charge, isolation, a b-jet
   veto, a mass window, missing energy, b-tags… Watch, live:
   - the **stacked histogram** (blue signal rising over grey background),
   - **signal kept / background kept / purity**, and
   - the **significance** climbing toward the discovery target.
   Raise the **integrated luminosity** for more data (∝ √luminosity). When you
   reach the target significance, **claim the discovery** and unlock the next
   mission.

### Missions
Z → μμ · W → μν · H → γγ · tt̄ (b-tagging) · HH → bbττ · (heavy-ion: coming soon)

## How it works

Pure vanilla HTML/CSS/JS with the HTML Canvas — no frameworks, no bundler.

```
index.html              screens: home, accelerator, campaign, briefing, explorer, lab, result
styles.css              dark "control room" theme
js/
  accelerator.js        LHC map: counter-rotating beams, 4 IPs, collisions
  physics.js            invariant mass, 4-momenta, Asimov significance, RNG
  events.js             object types, processes, pileup, features, datasets
  missions.js           campaign config: stories, observables, processes, cuts
  detector.js           CMS rendering (all object types + pileup) + hit-testing
  interaction.js        canvas mouse handling + object inspector
  analysis.js           cuts, significance, stacked histogram binning, cut UI
  histogram.js          stacked signal+background histogram
  content.js            identities, hints, feedback, closing text
  main.js               campaign flow + screen router
test/
  test-v2.mjs           node tests: features, weighting, cuts, winnability
```

Everything is **data-driven from `missions.js`**. A mission declares its signal
and background processes (with expected yields), which observable to plot, and
which cuts the player can apply. The Explorer and Analysis Lab are generic — a
new scenario is a new entry, not new engine code. The physics is deliberately
simplified (educational, not a real simulation) but the *logic* is real:
events **balance in the transverse plane** (missing pT is literally minus the
vector sum of what you see, so W events point their MET away from the muon and
the W transverse mass ends in a genuine Jacobian edge at 80.4 GeV), the
Drell–Yan continuum runs smoothly under the Z peak (irreducible background),
and the cuts are the real ones: isolation, mass windows, b-tag/MET
requirements, with Asimov significance `√(2((S+B)ln(1+S/B) − S))`.

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
