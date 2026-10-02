# Command 001

CI proof for the literal PlayDeck command.

The test synthesizes a four-second WAV file at runtime, reuses the four-card `ingest-001` image folder, then runs the same end-to-end orchestration exposed by the CLI.

Acceptance:

1. real audio file is probed
2. low/mid/high envelope is generated
3. folder becomes a deck
4. track + world become a plan
5. Remotion renders the entire short performance
6. the MP4 is hashed
7. the receipt is sealed as `rendered`
8. `canInheritReceipt()` returns true

The synthesized audio is test material only and is not committed as a binary fixture.
