Let us design the game as if we are preparing a **mini game-design document**.

The working title can be:

# **Collider Quest: Decode the Collision**

Tagline:

> **Collide particles. Decode the traces. Discover the invisible.**

The central idea is that the player does not “see” particles directly. They see detector signals and must reconstruct what happened, just like an experimental particle physicist.

---

# 1. Overall game structure

The game has three main layers:

## **Layer 1: LHC Operation**

The player controls a simplified LHC ring.

They choose:

* collision type: proton-proton or lead-lead
* beam energy
* beam intensity
* run duration
* detector to use
* trigger strategy

This layer gives the feeling of operating the collider.

---

## **Layer 2: Detector Event Display**

After collisions, events appear inside a detector such as CMS.

The player sees:

* tracks
* calorimeter deposits
* muon hits
* jets
* missing transverse momentum

This is the core visual part of the game.

---

## **Layer 3: Physics Analysis**

The player classifies reconstructed events.

They can:

* select physics objects
* identify signal/background
* fill histograms
* improve event selection
* search for a particle peak

This is where the player experiences the logic of experimental physics.

---

# 2. Main screen design

The game can have four main screens.

## Screen 1: **CERN / LHC Map**

This is the home screen.

Visual:

* Large circular LHC ring
* Four detector points around the ring:

  * CMS
  * ATLAS
  * ALICE
  * LHCb
* A control panel on the side
* Beam status indicator

Example layout:

```text
 -------------------------------------------------
|                                                 |
|              [ LHC RING MAP ]                  |
|                                                 |
|        ATLAS                         CMS        |
|                                                 |
|                                                 |
|        ALICE                         LHCb       |
|                                                 |
|-------------------------------------------------|
| Beam Energy: 6.8 TeV     Luminosity: Medium     |
| Collision: pp            Detector: CMS          |
| [Start Run] [Detector Status] [Analysis Lab]    |
 -------------------------------------------------
```

At the beginning, only CMS is unlocked.

Later, the player unlocks:

* ATLAS for general-purpose discovery
* ALICE for lead-lead heavy-ion physics
* LHCb for flavor physics

For the first version, keep only **CMS**.

---

# 3. CMS detector screen design

This is the most important screen.

Use a simplified **transverse cross-section** of CMS.

It can look like circular layers:

```text
        Muon System
   ---------------------
   |     HCAL          |
   |   -----------     |
   |   |  ECAL   |     |
   |   | ------- |     |
   |   | Tracker |     |
   |   |    *    |     |
   |   -----------     |
   ---------------------
```

The collision point is at the center.

Particles come out from the center.

Each detector layer has a purpose:

| Detector layer | What player sees             | Meaning                               |
| -------------- | ---------------------------- | ------------------------------------- |
| Tracker        | curved lines / hit dots      | charged particle tracks               |
| ECAL           | bright compact energy blocks | electrons and photons                 |
| HCAL           | wider energy deposits        | hadrons and jets                      |
| Muon system    | outer hits                   | muons                                 |
| Missing energy | arrow                        | invisible particles such as neutrinos |

The detector should be visually simple but meaningful.

---

# 4. Particle visual language

You need a consistent visual code.

## Muon

Visual:

* curved track from center
* passes through all layers
* leaves outer muon hits

Meaning:

> A muon is a penetrating charged particle.

Game clue:

```text
Track + outer muon hit = muon
```

---

## Electron

Visual:

* curved track in tracker
* strong ECAL deposit
* little/no HCAL deposit

Meaning:

> Electron is charged and deposits energy mainly in the electromagnetic calorimeter.

Game clue:

```text
Track + ECAL cluster = electron
```

---

## Photon

Visual:

* no track
* strong ECAL deposit

Meaning:

> Photon is neutral and deposits energy in the ECAL.

Game clue:

```text
No track + ECAL cluster = photon
```

---

## Jet

Visual:

* many tracks close together
* wide ECAL/HCAL deposits
* cone-like shape

Meaning:

> A jet comes from a quark or gluon producing many particles.

Game clue:

```text
Many tracks + broad calorimeter energy = jet
```

---

## b-jet

Visual:

* jet-like object
* small displaced secondary vertex near the beamline

Meaning:

> A b-jet often contains a long-lived b-hadron, which travels a short distance before decaying.

Game clue:

```text
Jet + displaced vertex = b-jet
```

---

## Tau candidate

Visual:

* narrow jet
* 1 or 3 charged tracks
* sometimes missing energy nearby

Meaning:

> Tau leptons decay quickly and can produce narrow hadronic signatures.

Game clue:

```text
Narrow jet + few tracks = tau candidate
```

---

## Neutrino / invisible particle

Visual:

* no direct track
* no calorimeter signal
* missing transverse momentum arrow

Meaning:

> Neutrinos escape the detector.

Game clue:

```text
Momentum imbalance = missing energy
```

---

# 5. Core gameplay loop

The basic loop should be:

```text
Start Run
   ↓
Collision happens
   ↓
Detector displays event
   ↓
Player identifies objects
   ↓
Player classifies event
   ↓
Event fills histogram or score panel
   ↓
Next event
```

A single event should take maybe 10–30 seconds to classify.

The player should not need advanced equations at the beginning. The game should teach through pattern recognition.

---

# 6. First playable version: **Find the Z Boson**

This should be your first complete prototype.

## Objective

The player must identify events where a Z boson decays into two muons:

[
Z \rightarrow \mu^+ \mu^-
]

The player sees many events. Some contain two muons. Some are background.

The goal is to select correct events and build a mass histogram showing a Z peak.

---

## Gameplay steps

### Step 1: Start proton-proton collisions

The player clicks:

```text
[Start LHC Run]
```

A small animation shows protons circulating and colliding at CMS.

---

### Step 2: Event appears in CMS

The player sees a detector event.

Example:

* two long curved tracks
* both reach the muon system
* opposite curvature directions

The game asks:

```text
Identify the particles in this event.
```

The player clicks the two muon candidates.

---

### Step 3: Classify event

The game asks:

```text
What kind of event is this?
```

Options:

```text
[Z → μμ] [W → μν] [QCD background] [Higgs candidate]
```

If the player chooses correctly, the event is accepted.

---

### Step 4: Fill mass histogram

The selected event adds one entry to the invariant mass histogram.

At first, the histogram looks random.

After enough correct events, a peak appears around the Z mass region.

The game message:

> Excellent. A peak is forming. This is how short-lived particles can be reconstructed from their decay products.

---

# 7. Event types for the Z-boson level

For the first level, include only a few event types.

## Signal: Z → μμ

Visual:

* two clean muon tracks
* opposite charges
* low missing energy
* not too many extra jets

Player should classify as:

```text
Z → μμ
```

---

## Background 1: single muon + missing energy

This can represent a W-like event.

Visual:

* one muon
* missing transverse momentum arrow

Player should classify as:

```text
W → μν
```

---

## Background 2: QCD multijet

Visual:

* many tracks
* broad calorimeter deposits
* no clear isolated muon pair

Player should classify as:

```text
QCD background
```

---

## Background 3: cosmic-like fake muon

Optional later.

Visual:

* long line not coming from collision point

Player should reject it.

This teaches:

> Good particles should point back to the collision vertex.

---

# 8. Player actions inside the event display

The player can do simple actions.

## Action 1: Select object

Click on a track or cluster.

A small label appears:

```text
Candidate selected
```

Then the player chooses its identity:

```text
Muon / Electron / Photon / Jet / Unknown
```

---

## Action 2: Inspect object

When hovering over a candidate, show simple information:

```text
Track curvature: low
Reaches muon system: yes
ECAL energy: low
HCAL energy: low
Likely particle: muon
```

At beginner level, the game can give hints.

At advanced level, hints can be reduced.

---

## Action 3: Submit event classification

After selecting objects, the player clicks:

```text
[Submit Event]
```

The game then gives feedback.

Example:

```text
Correct! You selected two opposite-charge muons.
This is a good Z boson candidate.
```

or:

```text
Not quite. This event has only one muon and large missing energy.
It is more likely a W candidate.
```

---

# 9. Scoring system

Avoid making the score only about speed. Reward good physics thinking.

Use several scores:

| Score                   | Meaning                                       |
| ----------------------- | --------------------------------------------- |
| Reconstruction accuracy | Did the player identify particles correctly?  |
| Signal efficiency       | Did the player keep real signal events?       |
| Background rejection    | Did the player reject fake/background events? |
| Analysis quality        | Does the histogram show a clean peak?         |
| Discovery confidence    | How strong is the final signal?               |

For the first prototype, use a simple score:

```text
+10 correct particle identification
+20 correct event classification
+30 correct signal event added to histogram
-10 wrong particle label
-20 background accepted as signal
```

At the end of a level, show:

```text
Run Summary
-------------------------
Events processed: 50
Z candidates selected: 18
Correct Z events: 15
Background contamination: 3
Analysis quality: Good
```

---

# 10. Histogram design

The histogram is very important because it gives the feeling of real analysis.

For the Z level, show:

```text
Invariant mass of two selected muons
```

The x-axis:

```text
Mass [GeV]
```

The y-axis:

```text
Number of events
```

The player does not need to calculate the mass manually. The game can calculate it.

But the educational message can say:

> If two muons came from a Z boson, their combined invariant mass tends to appear near the Z boson mass.

The histogram should update live after every accepted event.

This gives a satisfying progression:

```text
Few events: no clear structure
More events: small bump appears
Many events: clear Z peak
```

---

# 11. Detector status and trigger system

Later, add a trigger mechanic.

The trigger decides which events are saved.

The player can choose trigger settings:

```text
Single Muon Trigger
Double Muon Trigger
Photon Trigger
Jet Trigger
Missing Energy Trigger
```

For the Z level, the correct choice is:

```text
Double Muon Trigger
```

If the player chooses badly:

* too loose trigger → too many background events
* too tight trigger → lose signal events
* wrong trigger → miss the physics channel

Example:

```text
You selected a jet trigger while searching for Z → μμ.
Many useful dimuon events were not recorded.
```

This teaches an important LHC concept:

> The LHC produces far more collisions than can be stored. The trigger decides which events are kept.

---

# 12. Difficulty levels

## Beginner

The game gives strong hints.

Example:

```text
This track reaches the muon chambers. It is probably a muon.
```

Good for school outreach.

---

## Intermediate

The game gives detector signals but not direct particle hints.

Example:

```text
Track: yes
ECAL: small
HCAL: small
Muon chamber: yes
```

Player must infer it is a muon.

---

## Advanced

The player gets only the event display and must classify the event.

Useful for university students or physics enthusiasts.

---

# 13. Chapter progression

A good full game can have chapters.

## Chapter 1: First Collisions

Goal:

* Start proton-proton run
* Learn detector layers
* Identify simple particles

Main concept:

> Collisions produce many particles, and detectors record their traces.

---

## Chapter 2: Muon Detective

Goal:

* Identify muons
* Reject fake tracks
* Reconstruct Z → μμ

Main concept:

> Short-lived particles are reconstructed from their decay products.

---

## Chapter 3: The Photon Challenge

Goal:

* Identify photons
* Separate photons from electrons and jets
* Search for Higgs → γγ

Main concept:

> A rare signal can appear as a small bump above background.

---

## Chapter 4: Jets and b-tagging

Goal:

* Identify jets
* Find b-jets using displaced vertices
* Classify top-pair events

Main concept:

> Heavy particles often decay into jets, and b-tagging helps identify their origin.

---

## Chapter 5: Higgs Pair Hunt

Goal:

* Search for HH → bbττ
* Select b-jets and tau candidates
* Suppress backgrounds

Main concept:

> Rare processes require careful event selection and large datasets.

---

## Chapter 6: Heavy-Ion Run

Goal:

* Switch from proton-proton to lead-lead collisions
* Observe dense events
* Study jet quenching

Main concept:

> The LHC also studies hot nuclear matter and the quark-gluon plasma.

---

# 14. Detailed design for the CMS event display

For a browser-based game, the event display can be drawn with **HTML canvas** or **SVG**.

## Use circular layers

Draw circles:

```text
r = 40 px   tracker inner
r = 80 px   tracker outer
r = 120 px  ECAL
r = 160 px  HCAL
r = 210 px  muon system
```

At the center:

```text
collision vertex
```

Particles start from the center and move outward.

---

## Track rendering

Charged particles:

* draw curved arcs
* curvature depends on momentum and charge
* positive and negative particles curve opposite ways

High-momentum track:

```text
almost straight
```

Low-momentum track:

```text
strongly curved
```

Neutral particles:

* no tracker line
* only calorimeter deposit

---

## Calorimeter rendering

Use small blocks or radial sectors.

For ECAL:

* compact bright cluster for electron/photon

For HCAL:

* wider cluster for hadrons/jets

For jets:

* multiple nearby tracks
* broad calorimeter spread

---

## Muon rendering

Muon:

* track continues outward
* small hits in muon layer

This makes muons easy and satisfying to identify.

---

# 15. Example event display descriptions

You can generate events using templates.

## Template: Z → μμ

```text
Object 1:
type: muon
charge: +
angle: 40 degrees
momentum: high
reaches muon system: true

Object 2:
type: muon
charge: -
angle: 220 degrees
momentum: high
reaches muon system: true

Missing energy: small
Jets: optional low activity
```

Visual result:

* two opposite muon tracks, roughly back-to-back

---

## Template: W → μν

```text
Object 1:
type: muon
charge: +
angle: 70 degrees
momentum: medium/high

Object 2:
type: neutrino
visible: false
missing energy angle: 250 degrees

Missing energy: high
```

Visual result:

* one muon track
* missing energy arrow

---

## Template: QCD multijet

```text
Objects:
3–6 jets
many tracks
broad HCAL deposits
no isolated clean muon pair
missing energy: low/medium
```

Visual result:

* messy event

---

## Template: Higgs → γγ

```text
Object 1:
type: photon
angle: 30 degrees
ECAL cluster: strong
track: none

Object 2:
type: photon
angle: 210 degrees
ECAL cluster: strong
track: none

Missing energy: small
```

Visual result:

* two ECAL clusters without tracks

---

# 16. Physics simplification rules

Because this is a game, you should simplify carefully.

Use real physics ideas, but not full simulation.

## Good simplifications

Use:

* 2D transverse detector view
* simple particle signatures
* simple invariant mass values
* simplified signal/background categories
* approximate histograms
* educational explanations after each event

Avoid:

* full detector simulation
* complex reconstruction algorithms
* real trigger menus
* advanced statistical models at the beginning
* too many particle types at once

The goal is not to train CMS analysts. The goal is to let the public feel the logic of particle physics.

---

# 17. Analysis mode design

After the event-identification levels, unlock an “Analysis Lab.”

The player can tune selections.

For example, for Higgs → γγ:

Selection options:

```text
Require exactly 2 photons: ON/OFF
Minimum photon energy: slider
Reject events with tracks matched to photon: ON/OFF
Mass window: slider
```

The dashboard shows:

```text
Signal kept: 62%
Background kept: 18%
Expected significance: 4.1σ
```

For public use, instead of only using sigma, you can also show:

```text
Discovery confidence: Strong
```

This makes analysis feel interactive.

---

# 18. Signal-background game mechanic

This can be extremely powerful.

Each event has hidden truth:

```javascript
truth: "signal" or "background"
```

The player only sees reconstructed features.

The goal is to build a selection that keeps signal and rejects background.

Example:

## Higgs → γγ level

Signal:

* two photons
* mass near 125 GeV
* clean event

Background:

* two random photons
* photon + jet fake
* wrong mass

The player sees that even after selecting two photons, many events are still background.

This teaches:

> A good signature is not enough. You need statistics and background estimation.

---

# 19. Public engagement style

The language should feel exciting, not like a textbook.

Use short mission messages.

Examples:

```text
Mission: First Light in CMS
The beams are stable. CMS is ready.
Record your first proton-proton collisions.
```

```text
Mission: The Muon Trail
Some particles pass through almost everything.
Find the muons and use them to reconstruct the Z boson.
```

```text
Mission: A Bump in the Data
The Higgs is rare. Most events are background.
Can you reveal a small excess in the mass spectrum?
```

```text
Mission: Into the Fireball
Switch to lead-lead collisions and create a tiny droplet of hot nuclear matter.
Look for signs of jet quenching.
```

---

# 20. Suggested visual style

I would use a modern “control room + neon detector” style.

## Background

Dark theme, like a detector control room.

## Colors

Use consistent colors for objects:

| Object         | Suggested visual identity        |
| -------------- | -------------------------------- |
| Muon           | blue curved track                |
| Electron       | green track + ECAL flash         |
| Photon         | yellow ECAL flash                |
| Jet            | orange/red cone                  |
| b-jet          | jet with purple secondary vertex |
| Tau            | narrow magenta cone              |
| Missing energy | dashed white arrow               |

Even if you later change the exact colors, the important thing is consistency.

---

# 21. Player feedback examples

Feedback should teach, not just say right/wrong.

## Correct muon identification

```text
Correct.
This particle leaves a track in the inner detector and reaches the muon chambers.
That is the classic signature of a muon.
```

## Wrong photon identification

```text
Not quite.
A photon should leave energy in the ECAL without a matching charged track.
This object has a track, so it is more likely an electron.
```

## Correct Z event

```text
Excellent.
Two opposite-charge muons form a clean Z boson candidate.
The event has been added to your mass histogram.
```

## Background accepted as signal

```text
Careful.
This event has two muon-like objects, but one does not point back to the collision point.
It may be a fake or cosmic-like background.
```

---

# 22. First MVP feature list

For the first working version, build only this:

## Game: **Find the Z Boson**

### Must have

* LHC ring start screen
* CMS detector display
* simple event generator
* three event types:

  * Z → μμ
  * W → μν
  * QCD background
* clickable muon selection
* event classification
* score counter
* live invariant mass histogram
* end-of-run summary

### Nice to have

* simple beam animation
* sound effects
* detector status lights
* educational popups
* difficulty setting
* trigger selection

### Avoid in first version

* all four detectors
* lead-lead collisions
* Higgs analysis
* b-tagging
* tau reconstruction
* complex statistics
* user accounts
* multiplayer

The MVP should be small but polished.

---

# 23. Expanded version roadmap

After the Z-boson MVP works, expand in this order:

## Version 1: Z Boson Hunter

* dimuon events
* invariant mass histogram
* simple backgrounds

## Version 2: Higgs Photon Hunt

* photon identification
* ECAL clusters
* diphoton mass histogram
* smooth background + small signal bump

## Version 3: Top Quark Lab

* jets
* b-tagging
* lepton + missing energy
* top event classification

## Version 4: Higgs Pair Challenge

* b-jets
* tau candidates
* missing energy
* signal/background optimization

## Version 5: Heavy-Ion Mode

* lead-lead collisions
* dense events
* jet quenching
* ALICE detector mode

---

# 24. Simple data model for events

Each event in the game can be stored like this conceptually:

```javascript
{
  eventType: "Z_mumu",
  truth: "signal",
  objects: [
    {
      type: "muon",
      charge: "+",
      angle: 35,
      momentum: 48,
      reachesMuonSystem: true
    },
    {
      type: "muon",
      charge: "-",
      angle: 215,
      momentum: 44,
      reachesMuonSystem: true
    }
  ],
  missingEnergy: {
    magnitude: 5,
    angle: 120
  },
  invariantMass: 91.2
}
```

For background:

```javascript
{
  eventType: "QCD",
  truth: "background",
  objects: [
    {
      type: "jet",
      angle: 20,
      energy: 60
    },
    {
      type: "jet",
      angle: 150,
      energy: 45
    },
    {
      type: "fakeMuon",
      angle: 260,
      momentum: 20
    }
  ],
  missingEnergy: {
    magnitude: 15,
    angle: 80
  }
}
```

This is simple enough for JavaScript and easy to extend.

---

# 25. The emotional design

The game should make the player feel like:

1. “I started the LHC.”
2. “I saw a collision.”
3. “I decoded detector traces.”
4. “I reconstructed a particle that lived too briefly to see.”
5. “I found a signal hidden in background.”

That emotional arc is very important.

The best final message after the first level could be:

```text
Congratulations.
You did not see the Z boson directly.
You reconstructed it from the traces of its decay products.

This is the essence of collider physics.
```

---

# 26. Final recommended design direction

I strongly recommend starting with this exact design:

## **Prototype title**

**CMS Event Hunter: Find the Z Boson**

## **Core player task**

Identify two clean muons, classify the event, and build a Z mass peak.

## **Core educational message**

> Particles like the Z boson decay almost instantly. We discover them by reconstructing their decay products.

## **Core visual**

A simplified CMS detector with circular layers and particle traces.

## **Core reward**

A histogram peak slowly emerges as the player selects good events.

This gives you a complete, realistic, and engaging first version. Once this works, you can naturally extend the game toward Higgs discovery, heavy-ion physics, and rare searches like HH → bbττ.
