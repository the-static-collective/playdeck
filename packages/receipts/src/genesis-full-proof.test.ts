import test from "node:test";
import assert from "node:assert/strict";
import type {DeckSpec,TrackSpec,WorldRule} from "@playdeck/core";
import {composeDeck} from "@playdeck/composer";
import {projectReceipt,sealReceipt,canInheritReceipt,assertValidReceipt} from "./index";
import {descendantFromSource} from "./genesis-full-proof";
import deckRaw from "../../../examples/genesis-001/deck.json";
import trackRaw from "../../../examples/genesis-001/track.json";
import worldRaw from "../../../examples/genesis-001/world-rule.json";
const deck=deckRaw as DeckSpec;
const plan=composeDeck({deck,track:trackRaw as TrackSpec,worldRule:worldRaw as WorldRule,
 options:{id:"genesis-001-composed",fps:24,width:1280,height:720}});
test("real source parent card resolves the exact freeze descendant but creates no new rights",()=>{
 const projected=projectReceipt(plan,"genesis-001-receipt");
 const child=descendantFromSource(projected);
 const parent=deck.cards.find(x=>x.id==="card-09");
 assert.ok(parent);
 assert.equal(child.id,projected.carry.newCards[0]);
 assert.equal(child.source,parent.source);
 assert.deepEqual(child.front,parent.front);
 assert.equal(child.metadata?.sourceRightsNotInferred,true);
 assert.deepEqual(child.permissions,{});
});
test("source-owner sealReceipt refuses missing full media proof or unresolved descendant",()=>{
 const projected=projectReceipt(plan,"genesis-001-receipt");
 const inherited={kind:"video" as const,uri:"sha256:"+"a".repeat(64),
  scope:"full-performance" as const,sha256:"a".repeat(64)};
 assert.throws(()=>sealReceipt(projected,[inherited]),/materialized CardSpec/);
 const child=descendantFromSource(projected);
 const resolved=projectReceipt(plan,"genesis-001-receipt",{newCardSpecs:[child]});
 assert.throws(()=>sealReceipt(resolved,[{...inherited,scope:"checkpoint"}]),
  /full-performance evidence/);
 assert.equal(canInheritReceipt(resolved),false);
 assertValidReceipt(resolved,deck);
 // This unit test only demonstrates original API rules, not a real full-performance witness.
 const simulated=sealReceipt(resolved,[inherited]);
 assert.equal(simulated.phase,"rendered");
 assert.equal(canInheritReceipt(simulated),true);
 assertValidReceipt(simulated,deck);
});
