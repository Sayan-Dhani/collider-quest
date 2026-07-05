# Game concept: **Collider Quest — From Beams to Discovery**

The player joins CERN as a new scientist/operator. Their goal is to run the LHC, collect collision data, reconstruct events inside detectors like CMS, and finally search for rare physics signals hidden inside huge backgrounds.

The game should not try to simulate the full LHC realistically. Instead, it should use simplified but scientifically meaningful steps.

The core story could be:

> “You are part of an international experiment at the Large Hadron Collider. Your task is to accelerate particles, collide them at high energy, record the events in huge detectors, reconstruct what happened, and search for rare signatures of new physics.”

The game can be divided into **five layers**:

1. **Accelerator layer** — build and operate the circular LHC ring
2. **Collision layer** — choose proton-proton or lead-lead collisions
3. **Detector layer** — select CMS, ATLAS, ALICE, or LHCb
4. **Reconstruction layer** — turn detector signals into physics objects
5. **Analysis layer** — classify events and search for signal over background

---

# 1. Main game map: the LHC ring

The opening screen could show a simplified circular LHC ring underground.

Around the ring, you can place the four major experiments:

* **CMS**: general-purpose detector, good for Higgs, top quarks, searches for new physics
* **ATLAS**: another general-purpose detector
* **ALICE**: heavy-ion detector, focused on quark-gluon plasma
* **LHCb**: forward detector, focused on beauty/charm physics and matter-antimatter asymmetry

The player starts with only one detector unlocked, maybe **CMS**, then later unlocks others.

The LHC ring itself can be interactive. The player can control:

* Beam energy
* Beam intensity
* Collision type
* Run duration
* Detector readiness
* Trigger settings
* Data storage capacity

This gives the player the feeling that they are actually operating a physics experiment.

---

# 2. Beam acceleration gameplay

This can be a simple mini-game.

The player injects particles into the circular accelerator and gradually increases their energy.

For a beginner-friendly version, you could show particles moving around a circular track. The player presses a button at the correct timing to “boost” the beam using RF cavities.

Possible mechanics:

* Press at the right phase to increase beam energy
* Avoid beam instability
* Keep beam focused using magnets
* Increase luminosity without making the detector overloaded
* If the beam becomes unstable, the game triggers a “beam dump”

This teaches several ideas naturally:

* Particles are accelerated in stages
* Magnets bend and focus the beam
* Higher energy gives access to heavier particles
* Higher luminosity means more collisions, but also more pileup/background

A simple player choice could be:

| Setting        | Effect                                   |
| -------------- | ---------------------------------------- |
| Low intensity  | Cleaner events, fewer rare discoveries   |
| High intensity | More data, but more pileup               |
| Higher energy  | More chance of producing heavy particles |
| Longer run     | More statistics, but more computing load |

This is already very close to real experimental thinking.

---

# 3. Collision choice: proton-proton vs lead-lead

This is an excellent idea because it lets you introduce different physics programs.

## Proton-proton mode

This is the main discovery/search mode.

The player can search for:

* Z bosons
* W bosons
* top quarks
* Higgs bosons
* possible “new particle” events
* rare processes such as Higgs pair production

The game message:

> Proton-proton collisions are messy but powerful. They can produce many particles, including rare heavy particles like the Higgs boson.

## Lead-lead mode

This can be the heavy-ion campaign.

Instead of looking for individual rare particles, the player studies the hot dense medium created in the collision.

Possible observables:

* Jet quenching
* Particle flow
* Multiplicity
* Energy density
* Quark-gluon plasma signatures

The game message:

> Lead-lead collisions recreate tiny droplets of extremely hot matter, similar to the state of the universe shortly after the Big Bang.

This gives the game variety. Proton-proton mode feels like a discovery hunt. Lead-lead mode feels like studying a new state of matter.

---

# 4. Detector selection and detector personality

Each detector can have a different role and gameplay style.

## CMS mode

CMS could be the main detailed mode.

It has a layered detector view:

1. **Tracker**
2. **Electromagnetic calorimeter**
3. **Hadronic calorimeter**
4. **Muon system**

The player sees a simplified event display from above, like a transverse cross-section.

Particles appear as different signatures:

| Particle/object | Detector signature                              |
| --------------- | ----------------------------------------------- |
| Muon            | Track through all layers, reaches muon chambers |
| Electron        | Track + ECAL energy deposit                     |
| Photon          | ECAL energy deposit without track               |
| Charged hadron  | Track + HCAL deposit                            |
| Neutral hadron  | HCAL deposit, usually no track                  |
| Jet             | Cluster of many tracks and calorimeter deposits |
| b-jet           | Jet with displaced vertex                       |
| Tau             | Narrow jet, sometimes with missing energy       |
| Neutrino        | Missing transverse momentum                     |

This would be very educational because people often hear “detector” but do not understand that particles are inferred from patterns.

A nice public engagement message:

> The detector does not see particles directly. It sees traces: tracks, energy deposits, and missing momentum. Physicists reconstruct the event from these clues.

---

# 5. Event reconstruction mini-games

This is where your game can become really interesting.

Instead of only showing collisions, the player actively reconstructs what happened.

## Mini-game A: Track reconstruction

The detector shows dots/hits in the tracker. The player connects curved hits to form tracks.

* Curved track means charged particle in magnetic field
* More curved means lower momentum
* Straighter means higher momentum
* Positive and negative particles curve in opposite directions

Simple mechanic:

> Draw or select the correct path through detector hits.

Scoring:

* Correct track found: +points
* Fake track: penalty
* Missed high-momentum track: analysis quality decreases

Educational idea:

> Momentum is reconstructed from how much a charged particle bends in the magnetic field.

---

## Mini-game B: Calorimeter clustering

The player sees energy blocks in ECAL and HCAL.

They must group nearby energy deposits into clusters.

* ECAL cluster with track → electron
* ECAL cluster without track → photon
* HCAL cluster + many tracks → jet
* Narrow cluster + few tracks → tau candidate

This can be a click-and-group mini-game.

Educational idea:

> Calorimeters measure particle energy by absorbing particles and recording the shower they create.

---

## Mini-game C: Muon identification

The player must identify particles that pass through the whole detector and leave hits in outer chambers.

This is easy and satisfying.

A muon candidate could require:

* Inner track
* Small calorimeter energy
* Matching outer muon hits

Educational idea:

> Muons are special because they pass through much more material than most particles.

---

## Mini-game D: Missing energy puzzle

This is a very nice concept.

The player sees arrows representing reconstructed particles. The visible particles do not balance in transverse momentum. The missing direction indicates neutrinos or invisible particles.

Mechanic:

> Balance the transverse momentum arrows and infer the missing energy direction.

Educational idea:

> Neutrinos escape the detector, but we infer them from missing transverse momentum.

This is especially useful for W bosons, tau decays, top quarks, and many new-physics searches.

---

# 6. Event classification gameplay

After reconstruction, the player gets a set of physics objects:

Example:

> Event contains:
> 2 photons, high invariant mass, low missing energy

The player chooses what kind of event it might be.

Possible categories:

* Z → μμ
* Higgs → γγ
* top-antitop event
* QCD multijet background
* W → μν
* Higgs pair candidate
* Heavy-ion event
* possible new physics candidate

This can start very simple.

## Beginner classification examples

### Example 1

Objects:

* Two opposite-charge muons
* Invariant mass near Z boson region

Likely event:

> Z boson candidate

### Example 2

Objects:

* Two photons
* Clean event
* Invariant mass near Higgs region

Likely event:

> Higgs to gamma-gamma candidate

### Example 3

Objects:

* Many jets
* No isolated leptons
* No special mass peak

Likely event:

> QCD background

### Example 4

Objects:

* One electron
* Missing transverse momentum

Likely event:

> W boson candidate

### Example 5

Objects:

* Two b-jets
* Two tau candidates
* Missing transverse momentum

Likely event:

> Higgs-pair candidate: HH → bbττ

This last one could be a nice personal connection to your CMS work.

---

# 7. Analysis layer: signal vs background

This is where the game can become more “research-like.”

The player collects many events. Most are background. A few are signal.

The player can apply simple cuts:

* Require two photons
* Require two muons
* Require at least two jets
* Require b-tagged jets
* Require missing transverse momentum
* Require invariant mass in a certain window
* Require high transverse momentum

The goal is to improve:

> Signal significance = find more signal while rejecting background.

You can show three numbers:

| Quantity        | Meaning                      |
| --------------- | ---------------------------- |
| Signal kept     | Good events retained         |
| Background kept | Unwanted events retained     |
| Significance    | How convincing the result is |

A simple formula could be:

[
Z = \frac{S}{\sqrt{B}}
]

For public engagement, you do not need to explain the full statistics. Just say:

> A good analysis keeps many signal events while removing as much background as possible.

---

# 8. Histogram and discovery mechanic

This could be the most satisfying part of the game.

After classifying many events, the player makes a histogram.

Examples:

## Z boson calibration level

The player selects events with two muons and plots invariant mass.

They see a bump around the Z boson mass.

Goal:

> “Find the Z peak to calibrate your detector.”

This is perfect as an early mission because the Z boson is common and clean.

## Higgs discovery level

The player selects two-photon events and makes a diphoton mass plot.

Most events form a smooth background, but a small bump appears around the Higgs mass region.

Goal:

> “Improve your selection until the Higgs signal becomes visible.”

This teaches the idea of discovering a particle as a small excess over background.

## New physics level

Later, the player searches for an unknown heavy resonance.

They make an invariant mass histogram and look for a bump at high mass.

Goal:

> “Is this a statistical fluctuation or a possible new particle?”

This can introduce uncertainty, statistics, and the need for more data.

---

# 9. Campaign structure

You can organize the whole game as a series of missions.

## Campaign 1: Learn the machine

**Mission 1: Inject the beam**
Learn acceleration and beam stability.

**Mission 2: First collisions**
Produce simple proton-proton collisions.

**Mission 3: Detector online**
Turn on CMS subsystems and record events.

---

## Campaign 2: Reconstruct known particles

**Mission 4: Find muons**
Identify clean muon tracks.

**Mission 5: Reconstruct the Z boson**
Use two muons and invariant mass.

**Mission 6: Calibrate the detector**
Adjust energy scale so the Z peak appears at the correct place.

This is a very realistic concept: before searching for new physics, experiments validate known physics.

---

## Campaign 3: Discover the Higgs

**Mission 7: Find photons**
Identify photon candidates in the ECAL.

**Mission 8: Fight background**
Separate real photons from jets faking photons.

**Mission 9: Build the mass plot**
Find a small bump in the diphoton invariant mass distribution.

Story moment:

> “The excess is small, but it grows as more data is collected.”

---

## Campaign 4: Advanced CMS analysis

**Mission 10: b-tagging**
Identify jets from b quarks using displaced vertices.

**Mission 11: Tau reconstruction**
Identify hadronic tau candidates.

**Mission 12: Higgs pair search**
Search for HH → bbττ.

This could be a more advanced level inspired by your own work.

The player learns:

* Rare signals are extremely hard to find
* Backgrounds are large
* Good object identification is crucial
* Analysis choices matter

---

## Campaign 5: Heavy-ion physics

Switch to lead-lead collisions.

**Mission 13: Create hot matter**
Run Pb-Pb collisions.

**Mission 14: Observe jet quenching**
Compare jets in proton-proton and lead-lead collisions.

**Mission 15: Study the quark-gluon plasma**
Use particle flow and multiplicity to infer medium properties.

This adds variety and shows that the LHC is not only about the Higgs boson.

---

# 10. Possible game modes

You can have different modes depending on how much complexity you want.

## Mode A: Arcade mode

Fast, simple, public-friendly.

The player quickly identifies particles and classifies events.

Good for:

* Schools
* Outreach
* Browser demo
* Science festival

Example gameplay:

> Event appears → identify particles → classify event → get score.

---

## Mode B: Experiment manager mode

More strategic.

The player manages beam time, detector quality, trigger rate, and data storage.

Choices:

* Increase luminosity?
* Lower trigger threshold?
* Store more events?
* Prioritize Higgs, heavy-ion, or new physics?

Good for older students or science enthusiasts.

---

## Mode C: Analysis mode

More physics-like.

The player gets many events and designs a simple analysis.

Actions:

* Apply cuts
* Make histograms
* Estimate background
* Optimize significance
* Claim discovery only if significance is high enough

Good for university outreach or advanced players.

---

# 11. A very strong MVP version

For your first web-based version, do not build everything. Start with one clean vertical slice.

I would suggest this MVP:

## MVP title: **CMS Event Hunter**

Screen 1: Simple LHC ring
Player clicks “Start proton-proton run.”

Screen 2: CMS detector event display
A simplified event appears with tracks and calorimeter hits.

Screen 3: Player reconstructs objects
They identify:

* muons
* electrons
* photons
* jets
* missing energy

Screen 4: Player classifies event
Options:

* Z boson
* Higgs candidate
* top event
* QCD background
* W boson

Screen 5: Histogram grows
Each correctly selected event fills a mass histogram.

Goal:

> Reveal a Z boson peak or Higgs-like bump.

This is simple enough to build with HTML, CSS, and JavaScript, but already feels like a real particle physics game.

---

# 12. Visual design idea

Use a clean “control room” style.

Main screens:

### LHC control panel

* Circular ring animation
* Beam energy meter
* Luminosity meter
* Collision type selector
* Detector status lights

### CMS event display

A circular detector cross-section with layers:

* Inner tracker
* ECAL
* HCAL
* Muon system

Particles are drawn as:

* Curved lines for tracks
* Bright blocks for calorimeter deposits
* Long penetrating lines for muons
* Cones for jets
* Arrow for missing transverse momentum

### Analysis dashboard

* Event count
* Signal/background score
* Histogram
* Discovery confidence bar
* Mission objectives

This can look very impressive even with simple 2D graphics.

---

# 13. Educational messages inside the game

For public engagement, every level should teach one concept without overwhelming the player.

Examples:

After identifying a muon:

> Muons pass through the calorimeters and leave signals in the outer muon chambers.

After reconstructing a Z boson:

> A Z boson is not seen directly. It decays almost instantly, but we reconstruct it from its decay products.

After building a histogram:

> A particle discovery often appears as an excess of events above a smooth background.

After increasing luminosity:

> More luminosity gives more collisions, but it also makes events harder to reconstruct.

After selecting Higgs candidates:

> The Higgs signal is rare. Physicists need excellent detectors, careful reconstruction, and large datasets to see it.

These small messages are very powerful for outreach.

---

# 14. Event examples you can include

## Event type: Z → μμ

Visible objects:

* Two opposite-charge muons
* Clean detector
* Low missing energy

Player task:

> Select both muons and calculate invariant mass.

Result:

> Z candidate.

Difficulty: easy.

---

## Event type: Higgs → γγ

Visible objects:

* Two photons
* No tracks attached to photons
* Smooth background from other photon-like events

Player task:

> Identify photons and fill diphoton mass histogram.

Result:

> Small Higgs bump appears after many events.

Difficulty: medium.

---

## Event type: tt̄

Visible objects:

* Jets
* b-jets
* lepton
* missing transverse energy

Player task:

> Identify b-jets and classify as top-pair event.

Difficulty: medium.

---

## Event type: HH → bbττ

Visible objects:

* Two b-jets
* Two tau candidates
* Missing energy

Player task:

> Select correct objects and distinguish from top/background.

Result:

> Rare Higgs-pair candidate.

Difficulty: advanced.

This is a very nice “expert mode” because it connects to modern CMS physics.

---

## Event type: Pb-Pb heavy-ion collision

Visible objects:

* Huge number of tracks
* Dense event
* Modified jets

Player task:

> Compare jet energy imbalance and identify jet quenching.

Result:

> Evidence for interaction with quark-gluon plasma.

Difficulty: advanced but visually exciting.

---

# 15. Signal-background classification idea

You can make classification intuitive.

Each event has a few features:

* Number of leptons
* Number of jets
* Number of b-jets
* Missing energy
* Invariant mass
* Event cleanliness
* Collision type

Then the player chooses signal/background.

For example:

### Higgs to γγ analysis

Signal-like:

* Two high-energy photons
* Clean event
* Mass near Higgs region

Background-like:

* Photon + jet fake
* Two random photons
* Wrong mass region

The player learns that:

> Not every event with two photons is Higgs. Most are background.

That is one of the most important lessons in experimental particle physics.

---

# 16. Progression and rewards

The game can reward scientific behavior instead of just speed.

Possible scoring metrics:

* Reconstruction accuracy
* Trigger efficiency
* Background rejection
* Signal efficiency
* Detector calibration quality
* Statistical significance
* Data-taking stability

Bad choices should have realistic consequences:

| Bad choice           | Consequence                              |
| -------------------- | ---------------------------------------- |
| Trigger too loose    | Too much data, storage overload          |
| Trigger too tight    | Lose rare signal events                  |
| Poor calibration     | Mass peak becomes broad or shifted       |
| Too much luminosity  | Pileup increases                         |
| Weak b-tagging       | HH analysis becomes background dominated |
| Bad object selection | False discovery risk                     |

This makes the game feel like real analysis.

---

# 17. Possible storyline

A nice storyline could be:

## Chapter 1: First Day in the Control Room

You arrive at the LHC. Your mentor explains that particles must be accelerated and brought into collision.

Goal: produce stable proton-proton collisions.

---

## Chapter 2: The Detector Wakes Up

CMS starts recording events. You learn how each detector layer responds to different particles.

Goal: identify muons, photons, electrons, and jets.

---

## Chapter 3: Rediscover the Standard Model

Before searching for unknown physics, you reconstruct known particles.

Goal: find the Z boson and W boson.

---

## Chapter 4: The Higgs Signal

You collect many events and search for a small bump in a mass spectrum.

Goal: observe a Higgs-like signal.

---

## Chapter 5: Into the Rare Frontier

You search for rare processes like Higgs pair production.

Goal: separate tiny signal from large background.

---

## Chapter 6: A Different Universe

You switch to lead-lead collisions and study the quark-gluon plasma.

Goal: observe jet quenching and dense collision events.

---

## Final Chapter: Discovery or Fluctuation?

The player sees an unusual excess.

They must decide:

* Is it detector noise?
* Is it background mismodelling?
* Is it a statistical fluctuation?
* Is it a new particle?

This teaches a subtle and important idea:

> In particle physics, discovery requires patience, statistics, and independent checks.

---

# 18. Best simple version to actually build first

For a first project, I would not start with the full LHC program. I would build this:

## First playable prototype: **Find the Z Boson**

### Gameplay

1. Click “Start LHC Run”
2. Events appear one by one in a simplified CMS detector
3. Player identifies muon tracks
4. If two opposite-charge muons are found, event enters the histogram
5. After enough correct events, a Z peak appears
6. Player wins when the Z peak is clearly visible

This is scientifically meaningful, visually simple, and technically manageable.

Why this is a good starting point:

* Muons are easy to visualize
* Z → μμ is clean
* Invariant mass histogram gives a real analysis feeling
* You can later extend the same structure to Higgs, top, and HH

After that, add:

1. **Higgs → γγ**
2. **W → ℓν with missing energy**
3. **tt̄ with b-jets**
4. **HH → bbττ**
5. **Pb-Pb heavy-ion mode**

---

# 19. My strongest recommendation

Make the game not just about “colliding particles,” but about this central idea:

> The player is not directly seeing particles. The player is solving a detective story from detector clues.

That is the heart of experimental particle physics.

A good tagline could be:

> **“Collide particles. Decode the traces. Discover the invisible.”**

Or:

> **“You do not see the particle. You reconstruct the story.”**

That makes the game scientifically accurate and emotionally engaging.
