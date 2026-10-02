# @playdeck/awakening

Bounded still -> motion -> still crossings.

The composer may nominate an `awaken` event, but it does not fabricate media.

~~~text
CARD
  |
  | composer nominates
  v
AWAKEN EVENT
  |
  | provider materializes
  v
BOUNDED MOTION
  |
  v
FREEZE
  |
  v
NEW CardSpec
  |
  | sealed receipt only
  v
NEXT DECK
~~~

The first provider is `deterministic-echo-v1`. It uses FFmpeg to create a short parallax/zoom motion artifact from the original still, then freezes the final frame into a PNG descendant.

It exists to prove the contract without generator credits or network services. A generative provider may later implement the same boundary.

## Laws

~~~text
NOMINATION != MATERIALIZATION
MOTION != DURABLE MEMORY
FREEZE != INHERITANCE
SEALED PERFORMANCE + RESOLVED CardSpec MAY CROSS
AWAKENING IS BOUNDED
~~~

A descendant is not allowed into continuity merely because the plan proposed it. The provider must materialize a concrete CardSpec, the full performance must render, and the receipt must seal.
