# Album 001

Three-track CI proof of a persistent PlayDeck deck.

The test:

1. ingests the four-card postcard folder once
2. synthesizes three distinct short WAV tracks
3. renders Track 1
4. seals its receipt from the actual MP4 hash
5. applies that receipt to the deck
6. renders Track 2 from `inherited-room`
7. repeats into Track 3
8. verifies continuity history depth grows 0 -> 1 -> 2 -> 3

No synthetic receipt is used in this proof.

Every inheritance crossing is authorized by the immediately preceding real CI render.
