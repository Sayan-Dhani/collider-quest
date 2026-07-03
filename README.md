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

This repo is **private**. GitHub Pages does **not** host private repos on the
free plan, so the included Pages workflow (`.github/workflows/pages.yml`) is
manual-only for now. To publish a live version, pick one:

- **Vercel / Netlify (free, keeps repo private):** link your GitHub account, import
  `collider-quest`, deploy with default settings (it's a static site — no build
  command, output = repo root). Auto-deploys on every push.
- **Make the repo public:** then enable **Settings → Pages → Source: GitHub
  Actions** and re-add the `push` trigger in `pages.yml`. Deploys to
  `https://sayan-dhani.github.io/collider-quest`.
- **GitHub Pro (~$4/mo):** enables Pages on private repos; same steps as above.

### How to play
1. On the LHC map, press **Start proton–proton run**.
2. An event appears in the CMS cross-section. **Click** each track or cluster to
   inspect its detector signals and assign an identity (Muon / Jet / …).
   - A track that reaches the **muon chambers** is a muon.
   - A broad spray of tracks + calorimeter energy is a **jet**.
   - A track that stops early is a low-quality **fake** — treat it as unknown.
3. **Classify** the whole event: `Z → μμ`, `W → μν`, or `QCD background`.
4. Correct **Z → μμ** events add an entry to the dimuon mass histogram. After
   ~20 events, a peak forms near **91 GeV** — the Z boson.

## How it works

Pure vanilla HTML/CSS/JS with the HTML Canvas — no frameworks, no bundler.

```
index.html              screens (LHC map, detector, summary)
styles.css              dark "control room" theme
js/
  physics.js            invariant mass, 4-momenta, RNG helpers
  events.js             data-driven event templates + generator (Z / W / QCD)
  detector.js           CMS cross-section rendering + click hit-testing
  interaction.js        canvas mouse handling + object inspector panel
  classify.js           event classification bar + feedback
  histogram.js          live dimuon invariant-mass histogram
  state.js              run state + scoring rules
  content.js            mission text, educational messages, feedback
  main.js               screen router + game loop
test/
  test-logic.mjs        node sanity checks for the DOM-free logic
```

The event generator is a **registry of templates** (`js/events.js`). Adding a
new chapter (Higgs → γγ, top quark, HH → bbττ, heavy-ion) means adding an entry
to that registry and its object renderers — the game loop, scoring, and
histogram stay the same.

## Test

```bash
npm test        # runs node test/test-logic.mjs
```

Checks that Z events reconstruct near the Z mass, all event types generate,
object-identity rules are consistent, and the scoring/run logic is correct.

## Roadmap

The MVP is deliberately small. Planned expansion (see design docs):

1. **Z Boson Hunter** — this MVP ✅
2. **Higgs → γγ** — photon ID, diphoton mass, small bump over smooth background
3. **Top Quark Lab** — jets, b-tagging, lepton + missing energy
4. **Higgs Pair Challenge** — HH → bbττ, signal/background optimization
5. **Heavy-Ion Mode** — Pb–Pb collisions, jet quenching

## License

MIT — see [LICENSE](LICENSE).

---

*Educational simplification, not a real detector simulation. Built for outreach:
to let anyone feel the logic of collider physics.*
