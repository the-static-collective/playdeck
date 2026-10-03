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

Studio 007 is live in `packages/studio`.

~~~bash
npm run studio
~~~

Open any rendered PlayDeck output bundle in the browser. The Studio reconstructs its logical media bindings and opens the actual Remotion composition in `@remotion/player`.

A human can:

- inspect the ordered deck and bundled card media
- move cards earlier or later
- assign or remove traits
- edit temperament
- allow or disallow awakening
- edit physical / surface / transition / awakening world rules
- edit section-gate timing
- click any event or gate to scrub the player
- watch edits recompose through the real composer
- inspect the witnessed receipt beside the editable preview
- export the locally edited deck or plan
- render the edited state through the real Remotion runtime
- seal a new full-performance receipt from the rendered evidence
- optionally derive and export the inherited next deck
- choose the next song directly from the inherited deck
- analyze that new audio inside the local Studio worker
- compose its next plan from `inherited-room`
- keep editing / rendering / sealing without leaving the cockpit
- add several future songs to an Album Session at once
- reorder or remove that future stack before it reaches continuity
- expose future song identity/order without inventing future plans
- advance only the front queued song after the current receipt yields its inherited deck
- save the entire living cockpit as one portable `.playdeck-session.json` capsule
- resume current deck / track / plan / world / media without replaying history
- preserve full receipt history accumulated in Studio
- preserve generated descendant media and the current continuity checkpoint
- preserve still-unborn queued songs as audio-only future possibilities
- fork a new timeline from any sealed continuity checkpoint
- preserve shared receipt ancestry byte-for-byte across sibling futures
- stamp branch identity only onto the future working deck
- render sibling branches into distinct receipts without rewriting their common past
- view witnessed receipts, restartable checkpoints, and branch forks as a timeline tree
- merge sibling branch session files into one graph without changing the active working session
- select a stored checkpoint and genuinely jump back into its portable restart state
- fork directly from a selected graph checkpoint
- preserve checkpoint identity so opening a branch cannot retroactively recolor the shared fork node

The cockpit commit is local-only and bounded. The browser sends structured state plus selected bundle media to its own localhost Studio server; a dedicated worker performs the render. It does not expose arbitrary shell execution.

Studio preserves a hard boundary between exploration and history:

~~~text
STUDIO OVERRIDE != HISTORY
LOCAL RECOMPOSITION != RECEIPT
PREVIEW != PERFORMANCE EVIDENCE
~~~

A local edit becomes memory only after it crosses the existing render -> evidence -> sealed receipt path.

Studio 002 now exposes that crossing directly:

~~~text
EDIT
 ↓
LOCAL RECOMPOSITION
 ↓
RENDER + SEAL
 ↓
RENDERED RECEIPT
 ↓
OPTIONAL deck.after.json
 ↓
NEXT PERFORMANCE
~~~

The commit ID is content-addressed from the edited state **and the selected asset bytes**, so changing media without changing filenames still creates a distinct performance identity.

Studio 003 closes the album loop:

~~~text
SONG N
  |
  v
EDIT -> RENDER -> SEALED RECEIPT
                    |
                    v
               INHERITED DECK
                    |
                    v
             CHOOSE NEXT SONG
                    |
                    v
        ANALYZE + COMPOSE LOCALLY
                    |
                    v
                 SONG N+1
~~~

The next track is not composed from the original folder. It is composed from the deck produced by the immediately preceding witnessed performance.

Studio 004 adds a future stack without violating that law:

~~~text
CURRENT SONG
    |
    | witnessed crossing
    v
INHERITED DECK
    |
    +------> QUEUED SONG 2 -- compose now
    |
    | receipt 2
    v
NEXT INHERITED DECK
    |
    +------> QUEUED SONG 3 -- compose now
    |
    v
    ...
~~~

Songs deeper in the queue are known as files and order only. They have **no CompositionPlan yet**. Reordering the queue therefore changes possibility, not history.

Studio 005 makes that living state portable:

~~~text
CURRENT COCKPIT
  |
  | Save session
  v
.playdeck-session.json
  |
  | close / move / reopen
  v
SAME CURRENT STATE
  |
  +-- current deck + current plan
  +-- world rule + audio envelope
  +-- portable media bytes
  +-- generated descendants
  +-- witnessed receipt history
  +-- last sealed continuity checkpoint
  +-- unborn future queue
~~~

Resume is not a crossing. It does not render, mutate the deck, or mint a receipt. A saved dirty proposal resumes dirty; a saved sealed checkpoint resumes with exactly the authority it already had.

Studio 006 adds lawful alternate futures:

~~~text
                 /-> AMBER FUTURE -> receipt A
SHARED PAST ----<
                 \-> BLUE FUTURE  -> receipt B
~~~

A branch begins only from a sealed checkpoint. The shared receipt ancestry remains unchanged. The branch marker is written onto the inherited working deck, not retroactively into the past. Sibling branches may then alter world rules, composition choices, and future media independently.

Studio 007 makes that ancestry directly navigable:

~~~text
                         /-> [AMBER] -> receipt A
receipt 2 [checkpoint] -<
                         \-> [BLUE]  -> receipt B
~~~

The tree distinguishes plain receipts, restartable checkpoints, and branch nodes. A checkpoint carries the portable state required to resume from that exact point: working deck/plan, media, queue, receipt set, and world state.

~~~text
VISIBLE NODE != RESTARTABLE NODE
BRANCH WORKING COPY != SHARED CHECKPOINT
GRAPH SELECTION != HISTORY MUTATION
JUMP = RESTORE STORED CHECKPOINT
FORK = NEW FUTURE FROM STORED CHECKPOINT
~~~

Branch session files can be merged into the graph as additional evidence without switching the active cockpit.

---

## CLI

Single performance:

~~~bash
playdeck ./pictures ./song.mp3 --id my-performance --out ./out/my-performance
~~~

Persistent album:

~~~bash
playdeck-album ./pictures \
  ./01-song.mp3 \
  ./02-song.mp3 \
  ./03-song.mp3 \
  --id my-album \
  --out ./out/my-album
~~~

The album command ingests the folder once. Each full render is hashed and sealed; its rendered receipt becomes the next track's inherited deck state.

~~~text
TRACK 1 -> RENDER -> RECEIPT
                     |
                     v
                 TRACK 2
                     |
                     v
                 TRACK 3
~~~

The deck ID stays constant. Performance IDs change. History accumulates instead of resetting.

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
[x] preview studio
[x] studio render -> seal -> inherit cockpit
[x] studio next-song inherited album loop
[x] studio album-session future queue
[x] studio portable session save / resume
[x] studio branchable witnessed timelines
[x] studio navigable timeline tree
[x] folder -> deck ingestion
[x] folder + song command
[x] persistent album deck
[x] bounded card awakening
~~~

Current phase:

> **the cockpit can now see, revisit, and fork its witnessed history as an explicit tree of recoverable moments.**
