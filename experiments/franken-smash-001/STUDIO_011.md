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

## Current visual boundary

This slice deliberately does **not** pretend a Blender receipt contains playable Blender media bytes.

A Time Slice or Memory Feedback receipt can establish that bounded derived material exists and can authorize a cartridge reference. Until its corresponding media bytes are explicitly bound into the Studio asset table, the Playdeck renderer does not display those pixels.

The visible Studio 011 transformation therefore comes from deterministic Playdeck plan recomposition:

- `drift`
- `hinge`
- `flip`
- `fracture`
- `contact-sheet`
- `stack`
- `corrupt`
- `assemble`

The Blender cartridges remain inspectable provenance and a door for the next media-binding experiment.

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

Bind the **actual bytes** behind accepted Blender Time Slice / Memory Feedback receipts into the Studio asset table by digest, then let a renderer adapter consume those bytes only at plan events whose cartridge provenance matches.

That would move the system from:

> receipt-aware cinematic composition

to:

> source-verified derived media composition

without changing the authority model.
