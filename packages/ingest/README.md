# @playdeck/ingest

Turn an image folder into a canonical `DeckSpec`.

~~~text
IMAGE FOLDER
    |
    v
 filesystem scan
    |
    +-- optional playdeck.json sidecar
    |
    v
  DeckSpec
~~~

## Supported images

PNG, JPEG, WebP, GIF, AVIF, and SVG are included by default.

Files are sorted deterministically with numeric-aware natural ordering.

## Semantic boundary

File names are preserved as provenance hints.

They do **not** automatically become traits, temperaments, permissions, or relationships.

~~~text
FILENAME HINT != TRAIT
PATH ORDER != MEANING
DISCOVERY != COMPOSITION
~~~

If semantic information matters, declare it in `playdeck.json`.

Example:

~~~json
{
  "schemaVersion": "0.1",
  "title": "Road postcards",
  "defaults": {
    "permissions": {"flip": true, "fold": true}
  },
  "cards": {
    "03-doorway.png": {
      "traits": ["doorway", "threshold"],
      "temperament": ["portal"],
      "permissions": {"portal": true}
    }
  }
}
~~~

## CLI

~~~bash
playdeck-ingest ./images \
  --id road-postcards \
  --source-prefix asset://road-postcards \
  --out ./deck.json
~~~

The generated deck is storage-agnostic: the file system is used for discovery, while card sources are emitted as logical asset URIs by default.
