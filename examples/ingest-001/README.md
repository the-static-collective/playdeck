# Ingest 001

A bounded filesystem-ingestion fixture.

The `images/` directory contains four tiny SVG postcards plus an explicit `playdeck.json` sidecar.

The proof demonstrates:

1. image discovery
2. deterministic natural ordering
3. logical asset URI generation
4. explicit manifest semantics
5. filename hints retained only as provenance
6. generated `DeckSpec`
7. generated composition from a track with no supplied gates

The ungated demo track deliberately exercises the composer's duration fallback. That proves resumability; it does not claim actual music-structure detection.
