# @playdeck/cli

The first end-to-end PlayDeck command.

~~~bash
npx playdeck ./pictures ./song.mp3
~~~

The command:

1. ingests the image folder into a `DeckSpec`
2. analyzes the real audio file for duration and low/mid/high motion pressure
3. builds a `TrackSpec`
4. selects a world rule
5. composes a plan
6. projects a receipt
7. stages local assets into Remotion's public namespace
8. renders the complete performance
9. hashes the resulting MP4
10. seals a rendered, inheritable receipt with that full-performance evidence

Output bundle:

~~~text
out/<id>/
├── assets/
│   ├── images/
│   └── audio/
├── deck.json
├── track.json
├── world-rule.json
├── plan.json
├── envelope.json
├── props.render.json
├── receipt.projected.json
├── receipt.rendered.json
└── final.mp4
~~~

Use `--no-render` to stop after composition. In that case only the projected receipt exists and it remains non-inheritable.

### Requirements

- Node.js
- FFmpeg + ffprobe
- repository dependencies installed with `npm install`

### Example

~~~bash
npx playdeck ./pictures ./song.mp3 \
  --id road-postcards \
  --out ./out/road-postcards
~~~

A custom world rule may be supplied with:

~~~bash
npx playdeck ./pictures ./song.mp3 --world ./my-world.json
~~~

## Law

~~~text
LOCAL PATH != CARD IDENTITY
AUDIO ENERGY != SONG SEMANTICS
PROJECTED RECEIPT != MEMORY
FULL RENDER + HASHED EVIDENCE MAY SEAL MEMORY
~~~
