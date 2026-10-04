# Studio 011 — Franken Artifact Crossing

## Status

Implemented experimentally on `experiment/franken-smash-001`.

The crossing now lives in the native Playdeck Studio cockpit under `packages/studio`; the standalone `experiments/franken-smash-001/index.html` remains a smaller independent witness of the same design direction.

## Implemented seam

```text
real source packets
        |
        v
schema + exact producer-pin validation
        |
        +--> influence capsules
        +--> evidence capsules
        +--> measurement-only capsules
        |
        v
six deterministic Listening Eye futures
        |
        | human KEEP
        v
continuation permission
        |
        v
ordinary Playdeck recomposition
        |
        +--> existing deterministic renderer verbs
        +--> bounded Blender cartridge provenance
        +--> Dogram remains non-directive
        |
        v
LOCAL RECOMPOSITION
        |
        | existing Render + seal
        v
witnessed Playdeck receipt / continuity
```

## Native Studio surface

Studio 011 now supports:

- loading multiple `{ producer, artifact }` packet JSON files;
- exact repo / branch / SHA verification against the inspected experimental heads;
- authority-separated source inspection;
- six Toaster Listening Eye proposals;
- observer, time-slice, and memory cartridge gating;
- Dogram measurement context with no creative-selection authority;
- human selection and KEEP;
- deterministic rewrite into existing Remotion-supported Playdeck verbs;
- ordinary dirty-state / Render + seal behavior after KEEP.

The five synthetic UI fixtures under `examples/franken-studio-011/` exercise the whole packet surface.

## Digest-bound media crossing

Studio 011 now supports the next layer too.

A user may select actual PNG / MP4 bytes after loading the artifact packets. The browser computes SHA-256 locally and binds a file only when that digest exactly matches the `output_sha256` declared by an admitted Blender Time Slice or Memory Feedback receipt.

The media then enters through already-existing Playdeck renderer layers:

- Time Slice PNG → bounded `freeze` artifact layer;
- Memory Feedback MP4 → bounded `awaken` moving layer.

No digest match means no pixels enter the plan.

The same bindings are re-verified **server-side immediately before render** against the source-capsule `outputSha256`. A modified client payload therefore cannot obtain a sealed receipt merely by bypassing the browser check.

Externally materialized Blender video events are explicitly excluded from Playdeck's normal deterministic awakening generator; they remain source-verified derived media rather than being silently replaced with a Playdeck-generated echo.

The projected/rendered receipt preserves `studioFranken` and `studioFrankenMedia` metadata, including exact producer pins, source capsule identities, authority classes, bindings, and injected event IDs. External media receipt events are described as `external-derived-media`, not as newly created artifacts.

The selected lens still produces the larger deterministic grammar through ordinary Playdeck verbs:

- `drift`
- `hinge`
- `flip`
- `fracture`
- `contact-sheet`
- `stack`
- `corrupt`
- `assemble`

The committed synthetic fixture under `examples/franken-studio-011/` contains both real media files and packet receipts declaring their exact hashes, so the full binding path can be exercised without external private media.

## Authority laws

```text
SOURCE != PLAN
PLAN != RENDER
PROPOSAL != HISTORY
INFLUENCE != EVIDENCE
MEASUREMENT != GRADE
KEEP = CONTINUATION PERMISSION
DERIVED MATERIAL != PUBLICATION AUTHORITY
RENDER + SEAL = WITNESSED PLAYDECK HISTORY
```

## Proof

`npm run studio:proof` now runs the existing Studio proof, then `franken-studio-proof.ts`, then the Vite build.

The Franken proof requires:

1. deterministic packet compilation;
2. six stable unique lenses;
3. correct Blender cartridge gating;
4. Dogram exclusion from creative cartridges and plan content;
5. KEEP → continuation permission;
6. visible deterministic event rewrites;
7. source-pin refusal;
8. authority-escalation refusal.

## Next honest crossing

Generalize digest-bound media from the two Blender proof organs into a small renderer-adapter registry, then let Playdeck inspect a cartridge's declared media kind and bounded placement contract rather than hard-coding Time Slice and Memory Feedback.

That would preserve the current law while opening the same door to future accepted Blender organs:

> source-verified derived media composition → typed deterministic cinematic organ composition.

## Cinematic grammar layer

Studio 011 now treats each Listening Eye future as a distinct deterministic directing grammar, not only a different world patch.

| Lens | Camera | Topology | Cut rhythm | Relations | Memory |
| --- | --- | --- | --- | --- | --- |
| Landscape | survey | terrain-bands | long-breath | parallel-drift | erosion |
| Architecture | hinge-orbit | corridor | measured-cuts | axial-lock | room-trace |
| Organism | pulse-dolly | cellular-cluster | elastic-pulse | attraction-repulsion | scar-recall |
| Sigil / Type | snap-frame | glyph-grid | syncopated-cuts | stroke-link | overwrite-ghost |
| Weather / Particles | wind-eye | particle-field | gust-bursts | swarm | wake |
| Dimensional Space | parallax-orbit | nested-planes | folded-time | orbit-crossing | nested-afterimage |

These fields are carried in the proposal, KEEP continuation, world metadata, plan metadata, and per-event Franken guidance. The Remotion renderer interprets them through deterministic camera movement, card topology, atmosphere, relation paths, and cut pulses.

The grammar is still presentation/composition behavior. It does not change source facts, evidence authority, or receipt authority.

