# @playdeck/render-remotion

The first playdeck renderer.

It consumes deck, track, world-rule, composition-plan, asset bindings, and optional precomputed audio-envelope data.

It does **not** contain a Static Collective-specific timeline.

Genesis 001 is registered in `Root.tsx` only as the default fixture used to exercise the generic renderer.

## Run

From the repository root:

~~~bash
npm install
npm run studio
~~~

Render Genesis 001:

~~~bash
npm run render:genesis
~~~

Render a hero still near the final assembly:

~~~bash
npm --workspace @playdeck/render-remotion run still:genesis
~~~

## Asset binding

Logical media URIs stay in the fixture. The renderer resolves them through the supplied `assets` map.

A different host can replace the map without changing the deck or composition plan.

## Boundary

~~~text
PLAN -> RENDERER -> FRAMES
~~~

The renderer may interpret declared event verbs.

It must not silently invent the composition.
