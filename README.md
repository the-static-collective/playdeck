# playdeck

> like a playlist, but also, like a deck

**playdeck is a visual composition runtime for enchanted stacks of media.**

Give it a deck of images, a song, and a set of world rules.

It composes the deck into a moving visual performance: cards arrive, flip, answer one another, inherit traits, open into rooms, fracture, regroup, remember what happened, and occasionally wake up into something more than a still image.

The first specimen was an accident.

A 3×3 cosmic flipbook page was paired with a song. Instead of treating the page as a slideshow, we treated each panel as a physical object. The panels detached, hinged, drifted, became a contact sheet, collapsed into machine-language interference, then assembled into one room.

That felt less like making a music video and more like discovering an instrument.

This repository is for that instrument.

---

## The primitive

A **card** is not just an image.

A card may have:

- a front
- a back
- crop regions
- depth hints
- handwriting / notes
- portal points
- relationships to other cards
- behavior permissions
- memory of prior crossings
- a temperament

A **deck** is not just an ordered list.

A deck may contain:

- clusters
- recurring motifs
- held / absent cards
- adjacency
- inherited traits
- section affinities
- unresolved relationships
- a history of prior performances

A **track** is not just audio.

A track may expose:

- duration
- section gates
- low / mid / high energy envelopes
- transients
- rests
- impact events
- lyrical or semantic anchors
- mutation thresholds

A **world rule** decides what these things are allowed to become.

The renderer does not merely place images on a timeline.

It lets a deck **behave**.

---

## Core equation

~~~text
deck
+ track
+ world rules
+ composition plan
------------------
playable visual performance
~~~

Or:

~~~text
folder + song -> room
~~~

---

## What a card can do

A card can be:

~~~text
still
breathing
echoing
answering
glitching
hinged
stacked
taped
threaded
folded
portal
witness
chorus-bound
held
missing
awake
~~~

These are not necessarily hard-coded animation presets.

They are **roles in a composition**.

The same card may behave differently in another track, another deck, or another performance.

---

## World rules

World rules define the physical / visual grammar of a performance.

Initial candidates:

~~~text
flipbook
postcard
contact-sheet
polaroid
comic-page
field-notes
blueprint
teletext
vhs-machine
darkroom
library-room
stained-glass
tarot
dossier
picture-book
~~~

World rules should be composable.

For example:

~~~yaml
physical: postcard
surface: darkroom
transition: teletext
awakening: portal
~~~

The point is not to accumulate filters.

The point is to change **what kind of object the image is**.

---

## Song -> physics

Audio drives behavior, but playdeck is not a generic music visualizer.

We do not want:

- spectrum bars
- meaningless particles
- constant beat flashes
- every element pulsing all the time

We want the song to affect the **physics of the deck**.

Example:

~~~text
verse        -> cards arrive individually
pre-chorus   -> relationships become visible
chorus       -> cards assemble into architecture
verse 2      -> prior structures return altered
bridge       -> backs / metadata / receipts surface
breakdown    -> deck separates into addressable parts
final chorus -> the deck behaves like one room
outro        -> residue remains
~~~

Another track should produce another grammar.

Same deck. Different weather.

---

## Rare magic

Generative video is not the default renderer.

Most motion should remain deterministic, inspectable, reproducible, and cheap.

But sometimes a card should **wake up**.

For a bounded moment:

~~~text
IMAGE
  ->
CARD
  ->
PORTAL
  ->
MOVING WORLD
  ->
FREEZE
  ->
NEW CARD
~~~

A figure turns.

A bus door opens.

Weather escapes the frame.

Someone walks from one card into another.

Then the moving scene freezes back into an artifact and rejoins the deck.

Generative media becomes a meaningful crossing instead of wallpaper.

---

## Receipts

Every performance should be able to emit a receipt.

Example:

~~~json
{
  "performance": "static-collective-001",
  "events": [
    {
      "at": "01:37.420",
      "type": "crossing",
      "card": "card-17",
      "with": "card-04",
      "result": "thread"
    },
    {
      "at": "03:24.000",
      "type": "awakening",
      "card": "card-09",
      "result": "doorway"
    }
  ],
  "finalState": {
    "assembledAs": "room",
    "held": ["card-03"],
    "missing": [],
    "newCards": ["card-09-freeze-001"]
  }
}
~~~

A render should be capable of answering:

- what appeared?
- what crossed?
- what changed?
- what was held?
- what disappeared?
- what became something else?
- what should the next performance inherit?

This is where visual composition becomes visual memory.

---

## Album-scale decks

The long game is not one deck per song.

A deck can persist across an album.

Track 1 introduces cards.

Track 2 rearranges them.

Track 3 damages some.

Track 4 discovers information on their backs.

Track 5 merges two.

Track 6 admits a foreign card.

Track 7 reveals that cards missing since Track 1 have been assembling something offscreen.

The final track pulls back.

The entire album has been constructing one impossible room.

The deck remembers.

---

## Genesis 001

The first executable target is deliberately small.

### Input

- one image sheet / contact sheet / flipbook page
- one audio track
- one world rule: flipbook

### Process

1. identify / declare panels
2. analyze track energy
3. establish section gates
4. assign panel roles
5. compose deterministic motion
6. render the performance
7. emit a receipt

### Output

- interactive preview
- Remotion composition
- MP4 render
- receipt.json

Genesis 001 is complete when the original cosmic flipbook experiment can be rebuilt from structured data rather than bespoke animation code.

That gives us the first invariant:

> **The composition is data. The renderer is replaceable.**

---

## Proposed repository shape

~~~text
playdeck/
├── README.md
├── docs/
│   ├── vision.md
│   ├── glossary.md
│   ├── world-rules.md
│   └── receipts.md
│
├── examples/
│   └── genesis-001/
│       ├── deck.json
│       ├── track.json
│       ├── world-rule.json
│       └── receipt.json
│
├── packages/
│   ├── core/
│   ├── composer/
│   ├── audio-analysis/
│   ├── world-rules/
│   ├── render-remotion/
│   └── receipts/
│
└── apps/
    ├── studio/
    └── cli/
~~~

This structure is provisional.

The contracts matter more than the folders.

---

## Candidate core contracts

### CardSpec

~~~ts
type CardSpec = {
  id: string;
  source: string;
  front?: string;
  back?: string;
  traits?: string[];
  temperament?: string[];
  relationships?: {
    target: string;
    kind: string;
    weight?: number;
  }[];
  permissions?: {
    flip?: boolean;
    fold?: boolean;
    fracture?: boolean;
    portal?: boolean;
    awaken?: boolean;
  };
};
~~~

### DeckSpec

~~~ts
type DeckSpec = {
  id: string;
  cards: CardSpec[];
  order?: string[];
  clusters?: Record<string, string[]>;
  inheritedReceipt?: string;
};
~~~

### WorldRule

~~~ts
type WorldRule = {
  id: string;
  physical?: string;
  surface?: string;
  transition?: string;
  awakening?: string;
};
~~~

### CompositionPlan

The composer should emit an intermediate plan before anything renders.

That plan is important.

~~~text
SOURCE != PLAN
PLAN != RENDER
RENDER != RECEIPT
~~~

A renderer should not secretly become the composer.

---

## Early laws

These are working laws, not theology.

### CARD != IMAGE

The image is source material.

The card is the addressable object participating in the performance.

### DECK != ORDER

Sequence is only one relationship available to a deck.

### REACTIVITY != VISUALIZER

Audio should change meaningful behavior, not decorate the screen with measurements.

### GENERATION != MOTION

A card does not need generative video to move.

### AWAKENING IS EXPENSIVE

Rare crossings become more meaningful when most of the world obeys deterministic physics.

### RECEIPT != RENDER

The video is evidence that a performance occurred.

The receipt is the portable account of what happened.

### FINAL FRAME != FINAL STATE

The visual endpoint and the deck's resulting state are different things.

### WORLD RULE != STYLE FILTER

A world rule changes ontology, not merely appearance.

---

## Why Remotion first?

The first renderer is expected to use Remotion because it gives us:

- frame-addressable deterministic motion
- real audio on the timeline
- reusable compositions
- editable source
- parameterized renders
- inspectable sequencing
- a path toward an interactive studio

But playdeck should not become synonymous with Remotion.

The composition plan should eventually be renderable elsewhere.

HyperFrames, WebGL, browser runtimes, physical print systems, or future renderers may all consume the same deck grammar.

The plan survives the renderer.

---

## Studio

Eventually, apps/studio should let a human:

- drop in a folder of images
- add a song
- inspect cards
- flip cards over
- annotate relationships
- assign or remove traits
- choose a world rule
- scrub section gates
- watch the deck compose
- override a decision
- hold a card out
- wake one card up
- render
- inspect the receipt
- carry the resulting deck forward

The studio should expose composition without requiring the user to become an editor.

---

## CLI sketch

Someday:

~~~bash
playdeck compose --deck ./deck.json --track ./song.mp3 --world flipbook --out ./performance
~~~

Then:

~~~text
performance/
├── plan.json
├── receipt.json
├── preview/
└── final.mp4
~~~

Maybe eventually:

~~~bash
playdeck continue receipt.json --track next-song.mp3
~~~

That is where things get strange.

---

## First three build doors

### 001 — Canonical deck schema

Define CardSpec, DeckSpec, WorldRule, CompositionPlan, and Receipt.

Keep them small.

### 002 — Genesis Remotion renderer

Reproduce the cosmic 3×3 flipbook performance from structured inputs.

No bespoke timeline hidden in the component.

### 003 — Track envelope -> gates

Produce a stable audio-analysis artifact that a composer can consume without live audio analysis during rendering.

Example:

~~~json
{
  "duration": 266.2,
  "fps": 24,
  "bands": {
    "low": [],
    "mid": [],
    "high": []
  },
  "gates": []
}
~~~

---

## Non-goals, for now

playdeck does **not** need to begin as:

- a general-purpose nonlinear editor
- a replacement for After Effects
- a giant generative-video wrapper
- a music streaming platform
- a card game
- an asset manager for everything
- an autonomous taste machine

First:

> make a deck behave.

Then learn what it wants to become.

---

## Origin specimen

The first specimen began with:

- a song called **Static Collective**
- a cosmic 3×3 flipbook image
- a simple observation:

> it could behave like a stack of enchanted postcards.

The page detached into cards.

The cards became a room.

The room remembered the song.

That was enough reason to make a repository.

---

## Status

~~~text
[x] schema
[x] Genesis 001 fixture
[x] track analysis artifact
[x] composer
[x] Remotion renderer
[x] receipt writer
[x] guarded continuity crossing
[ ] preview studio
[ ] folder -> deck ingestion
[ ] persistent album deck
[ ] bounded card awakening
~~~

Current phase:

> **the deck can deal itself, tell prophecy from memory, and carry witnessed state across the next door.**
