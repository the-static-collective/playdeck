# Page Playlist Press 001

Page Playlist Press lets an already-identified page corpus become a Playdeck deck without pretending that playback changes publication authority.

It is intended for sources such as LemonPRESS manga pages, issue pages, and remix candidates.

~~~text
ORIGINAL PAGE -----\
                    \
REMIX CANDIDATE -----+--> PAGE PLAYLIST PRESS --> DeckSpec
                    /                            + exact asset bindings
ADMITTED REMIX -----/                             + press receipt
                                                        |
                                                        v
                                              song / album / studio
~~~

## What crosses

Each pressed item carries:

- stable card id
- exact upstream source identity
- exact byte SHA-256 computed at press time
- original vs remix kind
- source / candidate / admitted authority label
- remix candidate identity when applicable
- remix parent identities when applicable
- local asset binding kept separate from semantic identity

The resulting Playdeck card is a playable projection of that page.

It does not replace the page.

## Laws

~~~text
PAGE != CARD
PLAYABLE != ADMITTED
REMIX != PARENT
ORDER != ANCESTRY
TRANSPORT PATH != IDENTITY
PRESS != PERFORMANCE
~~~

A candidate remix may be played before it is admitted. Its card metadata must still say `authority: candidate`.

A Playdeck performance receipt proves what Playdeck did with the card. It does not upgrade the source page's authority.

## Direct playback

The generic Playdeck runtime accepts a prepared `DeckSpec` plus exact `assetSources` without requiring a source image folder.

That allows:

~~~text
pressPagePlaylist(...)
  -> deck + assetSources
  -> runPlaydeck({ deck, assetSources, audio, ... })
~~~

## Persistent playlist / album

The album runtime likewise accepts a prepared deck plus exact asset bindings.

~~~text
pressed manga deck
       |
       +--> SONG 1 -> receipt -> inherited deck
       |
       +--> SONG 2 -> receipt -> inherited deck
       |
       +--> SONG 3 -> ...
~~~

Originals and remixes may coexist in the same ordered deck. Their visual order is not interpreted as ancestry.
