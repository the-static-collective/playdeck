# LemonPRESS Sequence Handoff 001

LemonPRESS now has a deterministic reading-order candidate. Page Playlist Press can already turn identified page assets into a Playdeck deck.

This handoff joins those two primitives without collapsing their authority.

~~~text
LemonPRESS parents
      |
      v
REMIX SEQUENCE candidate
      |
      | independently verify sequence identity
      v
source_ref -> exact local asset binding
      |
      v
unique slot occurrences
      |
      v
PAGE PLAYLIST PRESS
      |
      +--> DeckSpec
      +--> exact assetSources
      +--> page-playlist press receipt
      +--> sequence handoff receipt
      |
      v
later Playdeck composition / render / seal
~~~

## Boundary

LemonPRESS decides declared reading order.

Playdeck decides temporal behavior only after the handoff.

The adapter does not admit a page, publish an issue, choose canon, render a performance, or seal history.

## Independent identity verification

The adapter accepts lemonpress/manga-sequence-candidate/v0.

Before binding any bytes it reconstructs the identity-bearing declaration:

- schema = lemonpress/manga-remix-sequence/v0
- id = sequence_id
- title
- status = EXECUTION_WITNESS
- parents
- sequence = slots
- authority
- laws

It recomputes:

- sequence_sha256 from slots
- candidate_id from the reconstructed declaration

A reordered or otherwise identity-bearing tamper refuses before Playdeck pressing.

## Whole-page aperture

The first bridge accepts only selection.kind = whole.

Region and panel selectors are legal LemonPRESS sequence declarations, but Page Playlist Press currently binds whole source files. The adapter therefore refuses unresolved region/panel slots instead of silently presenting whole bytes as if a partial selection had been realized.

A later selector-resolution primitive may cross that boundary with exact derived bytes and a receipt.

## Slot occurrence

A LemonPRESS slot becomes a unique Playdeck card occurrence:

~~~text
home-grows-open-sequence-001:slot:1
home-grows-open-sequence-001:slot:2
...
~~~

The card source remains the upstream source_ref.

Repeated source refs therefore create multiple card occurrences that bind to the same logical source bytes.

~~~text
SLOT != SOURCE
REPEAT != NEW SOURCE
~~~

## Candidate parents

If a sequence parent is itself kind = candidate, its Playdeck asset binding must remain:

- kind = remix
- authority = candidate
- candidateId present
- parentIds present

The adapter refuses an attempted upgrade from candidate to admitted.

## Handoff receipt

playdeck/lemonpress-sequence-handoff/v0 binds:

- LemonPRESS sequence candidate ID
- sequence ID
- sequence SHA-256
- Playdeck deck ID
- Page Playlist Press receipt ID
- exact slot -> sourceRef -> cardId mapping

This receipt is a crossing account, not performance history.

## Laws

~~~text
SEQUENCE != PERFORMANCE
SEQUENCE CANDIDATE != ADMISSION
SLOT != SOURCE
REPEAT != NEW SOURCE
PLAYDECK ORDER != ANCESTRY
ASSET BINDING != SOURCE AUTHORITY
HANDOFF != HISTORY
~~~

## Proof

~~~bash
npm run press:proof
npm run sequence:proof
~~~

The sequence proof uses the exact HOME GROWS OPEN Sequence 001 candidate from LemonPRESS PR #27 and synthetic local bytes. This proves the cross-repository identity/order/binding contract without claiming those synthetic bytes are the original Drive media.

It also proves:

- deterministic replay
- exact slot order preservation
- candidate authority preservation
- sequence tamper refusal
- unresolved panel refusal
- missing binding refusal
- candidate-authority upgrade refusal
- source byte hash mismatch refusal
- repeated source -> distinct card occurrences with shared source bytes

## Next aperture

Once real HOME GROWS OPEN media is locally bound, the exact same handoff can feed:

- a single Playdeck song
- a persistent album
- Studio

That later execution still must cross Playdeck's existing render -> evidence -> sealed receipt boundary before it becomes witnessed performance history.
