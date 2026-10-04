# Studio 011 — Franken Artifact Crossing

## Question

Can Playdeck consume real, separately-owned Toaster / Blender / Dogram artifacts as compositional context without collapsing their authority classes or importing their Git histories?

## Crossing

```text
Listening Eye artifact (influence-only)
                 |
                 v
        six lens proposals
                 |
        human KEEP required
                 |
                 v
        continuation permission
                 |
     +-----------+-----------+
     |           |           |
 observer     time-slice   memory-feedback
 influence      evidence       evidence
     |           |           |
     +-----------+-----------+
                 |
                 v
       CompositionPlan guidance
                 |
                 v
        ordinary renderer path
```

Dogram listener-delta receipts travel beside this path as `measurement-only` material. They are inspectable but mechanically excluded from proposal generation and plan mutation.

## Source pins used by the first runtime

- Toaster Listening Eye — `feature/listening-eye-v0` @ `fe185abb...`
- Blender Time Slice — `experimental/time-slice-recajgger-001` @ `60c87462...`
- Blender Observer-Local Vision — `experimental/observer-local-vision-001` @ `9beec9cc...`
- Blender Memory Feedback — `experimental/memory-feedback-001` @ `6aca64fd...`
- Dogram Listener Delta — `main` @ `551b5f9d...`

The runtime refuses mismatched pins rather than silently adapting a newer or different contract.

## Authority table

| Input | Imported as | May generate proposal? | May mutate plan after KEEP? | Becomes history? |
| --- | --- | ---: | ---: | ---: |
| Listening Eye | influence-only | yes | yes, as bounded guidance | no |
| Observer projection | influence-only | yes, as camera/presentation context | yes, as guidance | no |
| Time Slice receipt | evidence | only as an available cartridge | yes, when selected lens admits it | no |
| Memory Feedback receipt | evidence | only as an available cartridge | yes, when selected lens admits it | no |
| Dogram Listener Delta | measurement-only | **no** | **no** | no |
| Human KEEP | continuation-permission | n/a | authorizes the selected proposal | still no receipt |
| Real Playdeck render + seal | resolved execution | n/a | n/a | yes, through existing receipt path |

## Current executable slice

`franken-runtime.mjs`:

1. validates exact source schema + producer branch/SHA pins;
2. rejects authority escalation;
3. compiles source artifacts into separate influence/evidence/measurement capsules;
4. generates one deterministic proposal for each of Listening Eye's six lenses;
5. attaches Blender cartridges only where the selected lens permits them;
6. requires explicit KEEP before any CompositionPlan mutation;
7. annotates events with deterministic Franken guidance while preserving the original event verb and ordinary renderer authority;
8. records Dogram receipt identities in continuation metadata but does not carry measured outcome content into the plan.

`franken-runtime-proof.mjs` proves deterministic replay, six distinct lenses, cartridge gating, measurement non-influence, KEEP authority, plan crossing, source-pin refusal, and authority-escalation refusal.

## Next native seam

The next honest Studio change is a small `FrankenPanel` in `packages/studio`:

- import a `.franken-artifacts.json` packet locally;
- show the compiled capsules by authority class;
- grow the six lens proposals;
- preview proposal world patches and admitted cartridges;
- KEEP exactly one;
- apply `composePlan()` to the current Studio plan;
- leave render/seal/inherit entirely on Studio's existing path.

Do **not** teach Studio to fetch arbitrary Git branches, execute Blender, or treat a Dogram delta as a ranking signal in this slice.