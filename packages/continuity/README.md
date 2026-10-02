# @playdeck/continuity

The guarded crossing from one performance into the next.

~~~text
RENDERED RECEIPT
       |
       v
   continuity
       |
       v
INHERITED DECK
       |
       v
   composer
       |
       v
 NEXT PLAN
~~~

A projected receipt is rejected.

A receipt becomes eligible only after `@playdeck/receipts` verifies that it is sealed with explicit full-performance evidence.

## Current inheritance

When a receipt crosses:

- held cards become `carried`
- held cards move to the front of suggested traversal
- missing cards remain present but are marked `absent-from-prior-performance`
- prior assembly state is written into deck continuity metadata
- the next composer intro starts from `inherited-<assembly>` instead of pretending the deck is fresh

This is intentionally conservative.

The first continuation mechanism preserves state; it does not yet invent new cards from `newCards` identifiers.

## Law

~~~text
PROJECTED RECEIPT != MEMORY
SEALED RECEIPT MAY CROSS
INHERITANCE != REENACTMENT
PRIOR STATE != NEXT PLAN
~~~
