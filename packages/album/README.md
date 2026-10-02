# @playdeck/album

Persistent deck runtime across multiple songs.

~~~text
INITIAL DECK
    |
    v
TRACK 1 -> RENDER -> SEALED RECEIPT
    |                    |
    +------ inherit <----+
    |
    v
TRACK 2 -> RENDER -> SEALED RECEIPT
    |                    |
    +------ inherit <----+
    |
    v
TRACK 3 ...
~~~

The folder is ingested **once**.

Every later performance receives the deck produced by the prior sealed receipt.

## Command

~~~bash
playdeck-album ./pictures \
  ./01-song.mp3 \
  ./02-song.mp3 \
  ./03-song.mp3 \
  --id my-album \
  --out ./out/my-album
~~~

Each track gets its own bundle under `tracks/NN/`, including its input deck, plan, rendered video, and sealed receipt.

The album root keeps:

- `initial-deck.json`
- `album.json`
- `final-deck.json`

## Identity law

~~~text
ALBUM DECK ID != PERFORMANCE ID
TRACK N RECEIPT -> TRACK N+1 INPUT DECK
RE-INGESTION != CONTINUITY
HISTORY != LAST STATE ONLY
~~~

The deck ID remains stable across the album. Each performance gets a unique ID. Continuity history is append-only at the deck and card metadata surfaces.

The first implementation preserves held/missing/assembly state. New-card materialization remains a separate bounded problem.
