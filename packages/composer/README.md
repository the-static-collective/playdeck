# @playdeck/composer

The deterministic composition layer.

~~~text
DECK + TRACK + WORLD RULE
          |
          v
     COMPOSITION PLAN
~~~

The composer chooses **roles and transitions**. It does not render frames.

## Current rules

- source begins legible before cards separate
- early verses expose a minority of cards
- pre-choruses reveal relationships as threads
- chorus participation expands over successive choruses
- the final chorus may persist the whole deck as one room
- bridges enter the declared world's wrong-medium dialect
- breakdowns expose addressable parts
- outros leave residue and hold a threshold card open

Selections use card traits, temperaments, and permissions before falling back to stable deck order.

Every generated event includes a `because` field so composition remains inspectable.

## Missing track gates

If a track does not yet carry structural gates, the composer uses a deterministic duration-based fallback and marks that fact in plan metadata.

That fallback is a resumability mechanism, not a claim that musical structure was actually detected.

## Law

~~~text
RECOMMENDATION != SELECTION
COMPOSER != RENDERER
FALLBACK GATE != DETECTED GATE
~~~
