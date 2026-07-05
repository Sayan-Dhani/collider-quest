# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Collider Quest — an educational particle-physics browser game (CMS event hunter). The player operates the LHC, reads simplified CMS detector traces, and applies selection cuts to pull a signal out of background across a campaign of missions (Z→μμ, W→μν, H→γγ, tt̄, HH→bbττ, + heavy-ion placeholder). Live at https://sayan-dhani.github.io/collider-quest.

## Commands

There is **no build step and no bundler** — vanilla ES modules + HTML Canvas, served as static files.

- **Run locally:** `npm start` (= `python3 -m http.server 8000`), then open http://localhost:8000. Opening `index.html` directly also works.
- **Test (all):** `npm test` — runs both node harnesses.
- **Single harness:** `node test/test-v2.mjs` (physics/features/cuts/winnability) or `node test/dom-smoke.mjs` (headless full playthrough).
- **No linter** is configured.
- **Deploy:** push to `main` → GitHub Actions (`.github/workflows/pages.yml`) publishes to GitHub Pages automatically.

`.js` files are ES modules (`package.json` has `"type": "module"`); the node tests import them directly.

## Architecture

Single-page app. `index.html` holds one `<section class="screen">` per screen; `main.js` `show(screenId)` toggles `.active`. Flow: **Home → Accelerator (LHC map) → Campaign → Briefing → Event Explorer → Analysis Lab → Result**. `main.js` is the orchestrator/screen-router; it owns transient state and wires DOM events. Progress persists in `localStorage` under `cq_progress_v2`.

**The whole game is data-driven from `js/missions.js`.** A `MISSIONS` entry declares its story, the observable to histogram, its signal + background **processes with expected pre-cut yields**, and the **cut definitions**. The Event Explorer and Analysis Lab are generic engines driven entirely by that config, so **a new physics scenario is a new `MISSIONS` entry, not new engine code**.

Data pipeline (read these together to understand the game):
- `js/events.js` — the `PROCESSES` registry (per-process generators), object builders (muon/electron/photon/jet/b-jet/tau/pileup), and `computeFeatures()` which reduces an event's objects+MET to the numbers cuts operate on (counts, isolation, MET, masses, mT, HT). `makeDisplayEvent()` builds one busy event (hard process + pileup) for the Explorer; `makeDataset()` builds a **weighted** signal+background dataset for the Lab (each event's `weight` makes summed weights reproduce the mission's expected yields — standard MC practice).
- `js/analysis.js` — pure logic (`initStates`, `computeResult`, `binStacked`) that applies the enabled cuts to the dataset and returns S/B, efficiencies, and Asimov significance; plus DOM renderers (`renderCuts`, `renderMetrics`). Cut evaluation itself is `evalCut` in `missions.js`.
- `js/physics.js` — invariant-mass / 4-momentum helpers, RNG (`gauss`, `randRange`), and `significance()` = Asimov `√(2((S+B)ln(1+S/B)−S))` used for the discovery meter.

Canvas renderers (each keeps module-level geometry set during `draw`, reused by its hit-test):
- `js/detector.js` — CMS transverse cross-section + all object renderings; `hitTest(x,y)` maps a click to an object.
- `js/accelerator.js` — LHC ring with two counter-rotating beams, four interaction points (`EXPERIMENTS`; CMS↔ATLAS and ALICE↔LHCb are 180° apart), collision flashes, energy ramp; `hitTestIP(x,y)`.
- `js/histogram.js` — stacked signal+background histogram.

`js/interaction.js` handles detector-canvas mouse events + the object inspector panel. `js/content.js` holds all player-facing strings and the `IDENTITIES` vocabulary/feedback.

## Conventions & invariants

- **Keep pure logic DOM-free.** `events.js`, `analysis.js` (compute*), `physics.js`, `missions.js` must not touch `document` at import time — the node tests import them directly and `test/dom-smoke.mjs` only stubs a minimal DOM/canvas for `main.js`. Breaking this breaks the tests.
- **Angles are degrees, math convention** (0 = east, CCW positive). Canvas draws flip y so 90° renders at the top. Use `physics.degToRad`.
- **Mission balance is a tested invariant:** `test/test-v2.mjs` asserts every mission is *winnable* (a good cut set reaches `mission.target` significance) **and** has a discovery arc (pre-cut significance is below target). After changing any `expected` yield or `target`, re-run it.
- **Every `$('id')` in `main.js` must have a matching `id="…"` in `index.html`** — the smoke test exercises the wiring; keep them in sync.
- **No real browser is available in the dev environment** — verify with the two node harnesses; visual/layout QA is a manual step for the user.

## Assets & deploy gotchas

- Raw source art (large `.pdf`/`.eps`) lives in `image/` and is **git-ignored**; only optimized web images in `assets/` are committed and served. Regeneration commands are in `assets/README.md`. EPS/PDF cannot be used as web images directly — convert to PNG/SVG first (`pdftocairo`, `convert`).
- **GitHub Pages sometimes fails deploy with a transient "Deployment failed, try again later."** Do **not** use `gh run rerun --failed` — it adds a second artifact to the run and the deploy action then errors with "Multiple artifacts named github-pages". Instead trigger a fresh run: `gh workflow run pages.yml`.
