# PlayDeck Studio 001

The first human-facing control surface for the runtime.

~~~text
PLAYDECK OUTPUT BUNDLE
        |
        v
     STUDIO
  /    |     \
deck  world  gates
  \    |     /
    recompose
        |
        v
 REMOTION PLAYER
~~~

## Open a witnessed bundle

Run a PlayDeck render first:

~~~bash
playdeck ./pictures ./song.mp3 --id my-performance --out ./out/my-performance
~~~

Then:

~~~bash
npm run studio
~~~

Open the generated output folder in the browser.

Studio reconstructs logical `asset://` bindings from the bundle and previews the exact Remotion composition with `@remotion/player`.

## Current controls

- inspect the ordered card deck
- preview each card from bundled media
- move cards earlier/later
- edit card traits
- edit card temperament
- allow/disallow card awakening
- edit physical/surface/transition/awakening world-rule fields
- edit section-gate timestamps
- click events or gates to seek the player
- inspect rendered/projected receipt state
- export the locally edited deck and plan

Changing controls produces a new local `CompositionPlan` through the real `@playdeck/composer`.

It never modifies the witnessed receipt.

## Boundary

A Studio edit is a proposal until rendered and witnessed again.

~~~text
STUDIO OVERRIDE != HISTORY
LOCAL RECOMPOSITION != RECEIPT
PREVIEW != PERFORMANCE EVIDENCE
~~~

Awakening assets already present in a witnessed bundle can be previewed. Newly nominated awakenings from local edits are not silently materialized in the browser.

## Proof

CI first runs the real `playdeck` command, then feeds its resulting bundle through the Studio parser and local recompose path before Vite builds the UI.

The Studio therefore consumes the same durable artifacts as the CLI, album runtime, receipt layer, and Remotion renderer.
