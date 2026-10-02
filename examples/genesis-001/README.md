# Genesis 001 — Cosmic Flipbook

This fixture is the first bounded playdeck specimen.

It encodes the composition that began as a 3×3 cosmic flipbook paired with the song **Static Collective**.

The binary image and audio are deliberately referenced through logical asset URIs:

- `asset://genesis-001/cosmic-flipbook.png`
- `asset://genesis-001/static-collective.mp3`
- `asset://genesis-001/static-collective-envelope.json`

A host may resolve those URIs from local files, Drive, object storage, a release bundle, or another asset provider.

The fixture itself should not care.

## Files

- `deck.json` — nine addressable cards cut from one shared 3×3 sheet
- `track.json` — duration, approximate tempo, and observed structural gates
- `world-rule.json` — the first `flipbook` world rule
- `plan.json` — the deterministic composition plan that turns the deck into a room

## Acceptance test

Genesis 001 is successful when a renderer can consume these files and reproduce the essential behavior without a bespoke hard-coded timeline:

1. page begins legible as one object
2. panels become independently addressable
3. relationships appear as threads / shared motion
4. first chorus assembles a partial room
5. bridge enters a deliberately wrong machine-medium
6. breakdown exposes the deck as parts
7. final chorus assembles all nine cards as one room
8. outro leaves a held doorway instead of closing the state

The exact pixels may differ between renderers.

The **composition law** should survive.
