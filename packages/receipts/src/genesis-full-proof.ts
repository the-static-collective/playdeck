#!/usr/bin/env node
/**
 * GENESIS-FULL-001 — Original PlayDeck full-performance media and
 * typed, source-bound descendant receipt proof.
 *
 * This is source-owned PlayDeck code: source-proof first, seal second.
 * It never claims external media licenses, human adoption or publication.
 */
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {mkdirSync,readFileSync,writeFileSync,statSync,realpathSync} from "node:fs";
import {resolve,dirname,basename} from "node:path";
import {fileURLToPath} from "node:url";
import type {CardSpec,DeckSpec,TrackSpec,WorldRule} from "@playdeck/core";
import {composeDeck,assertValidCompositionPlan} from "@playdeck/composer";
import {assertValidReceipt,canInheritReceipt,projectReceipt,sealReceipt} from "./index";
import deckJson from "../../../examples/genesis-001/deck.json";
import trackJson from "../../../examples/genesis-001/track.json";
import worldRuleJson from "../../../examples/genesis-001/world-rule.json";

const hash=(buf:Buffer|string)=>createHash("sha256").update(buf).digest("hex");
const encode=(v:unknown)=>JSON.stringify(v,null,2)+"\n";
function check(x:unknown,label:string):asserts x{if(!x)throw Error("HOLD_PLAYDECK_FULL_"+label);}
const deck=deckJson as DeckSpec,track=trackJson as TrackSpec,worldRule=worldRuleJson as WorldRule;
const plan=composeDeck({deck,track,worldRule,options:{
 id:"genesis-001-composed",fps:24,width:1280,height:720
}});
assertValidCompositionPlan(plan,deck);
const expectedFrames=Math.ceil(plan.duration*plan.fps);
function input(args:string[]){
 check(args.length===4&&args[0]==="--media"&&args[2]==="--out","USAGE");
 const media=resolve(args[1]!),out=resolve(args[3]!);
 check(media.endsWith(".mp4")&&media!==out&&out.endsWith(".json"),"PATH");
 return {media,out};
}
export function descendantFromSource(planReceipt=projectReceipt(plan,"genesis-001-receipt")){
 check(planReceipt.carry.newCards.length===1,"ONE_FREEZE_DESCENDANT");
 const target=planReceipt.carry.newCards[0]!;
 const exactParentId="card-09";
 check(target===exactParentId+"--static-collective-track--freeze","ORIGINAL_FREEZE_ID");
 const parent=deck.cards.find(c=>c.id===exactParentId);
 check(parent?.source&&parent.front?.source&&parent.front.crop,"REAL_SOURCE_CARD");
 const child:CardSpec={
  id:target,
  source:parent.source,
  front:structuredClone(parent.front),
  ...(parent.back?{back:structuredClone(parent.back)}:{}),
  traits:[...(parent.traits??[]),"freeze-descendant","source-derived-not-new-art"],
  temperament:[...(parent.temperament??[]),"held-for-next-performance"],
  relationships:[{target:exactParentId,kind:"freeze-of-original-source"}],
  // This CardSpec is a deterministic source-bound derivative, not a rights grant.
  permissions:{},
  metadata:{origin:"GENESIS-FULL-001-original-deck-frozen-card",
   sourceCardId:exactParentId,derivation:"share-original-asset-crop",
   parentalSource:parent.source,sourceRightsNotInferred:true}
 };
 return child;
}
export function verifyFullMedia(mediaPath:string){
 const bytes=readFileSync(mediaPath);
 check(bytes.length>100000&&bytes.subarray(4,8).toString()==="ftyp","ORIGINAL_MP4_BYTES");
 const raw=execFileSync("ffprobe",["-v","error","-count_frames",
  "-show_entries","stream=index,codec_type,codec_name,width,height,avg_frame_rate,nb_read_frames",
  "-show_entries","format=duration,format_name",
  "-of","json",mediaPath],{encoding:"utf8",timeout:120000,maxBuffer:1024*1024});
 const info=JSON.parse(raw) as {
  streams:Array<{codec_type:string;codec_name:string;width?:number;height?:number;
   avg_frame_rate?:string;nb_read_frames?:string}>;
  format:{duration:string;format_name:string};
 };
 const video=info.streams.find(s=>s.codec_type==="video");
 const audio=info.streams.find(s=>s.codec_type==="audio");
 const actualFrames=Number(video?.nb_read_frames);
 const duration=Number(info.format.duration);
 check(!!video&&!!audio&&video.width===320&&video.height===180
  &&video.avg_frame_rate==="24/1"&&actualFrames===expectedFrames
  &&Number.isFinite(duration)&&Math.abs(duration-plan.duration)<0.12,
  "MUST_RENDER_EVERY_ORIGINAL_FRAME_AND_AUDIO");
 return {schema:"playdeck.genesis-full-media-observation/v1",
  originalPlanId:plan.id,originalPlanDurationSeconds:plan.duration,
  originalPlanFps:plan.fps,originalPlanExpectedFrames:expectedFrames,
  ffprobeActualFrames:actualFrames,ffprobeDurationSeconds:duration,
  videoCodec:video.codec_name,audioCodec:audio.codec_name,
  originalMediaSha256:hash(bytes),originalMediaBytes:bytes.length,
  actualFullDurationWitnessed:true,originalAudioStreamPresent:true,
  renderedScale:0.25,fullResolutionNotClaimed:true,rightsNotInferred:true};
}
export function buildReceipt(mediaPath:string){
 const native=verifyFullMedia(mediaPath);
 const parent=projectReceipt(plan,"genesis-001-receipt");
 assertValidReceipt(parent,deck);
 check(parent.phase==="projected"&&!canInheritReceipt(parent),"ORIGINAL_PROJECTED");
 const descendant=descendantFromSource(parent);
 const resolved=projectReceipt(plan,"genesis-001-receipt",{newCardSpecs:[descendant]});
 assertValidReceipt(resolved,deck);
 const sealed=sealReceipt(resolved,[{
  kind:"video",uri:"sha256:"+native.originalMediaSha256,
  scope:"full-performance",
  renderer:"original PlayDeck Remotion Genesis001",
  sha256:native.originalMediaSha256,
  notes:["All original plan frames counted by ffprobe",
   "Audio stream verified",
   "Reduced 0.25 resolution (320x180), NOT a full-resolution master",
   "Materialized source-card descendant preserves original asset/crop; rights not inferred"]
 }]);
 assertValidReceipt(sealed,deck);
 check(canInheritReceipt(sealed)&&sealed.carry.newCardSpecs.length===1
  &&sealed.carry.newCardSpecs[0]?.id===sealed.carry.newCards[0]
  &&sealed.evidence?.[0]?.sha256===native.originalMediaSha256
  &&sealed.metadata?.sealed===true,"ORIGINAL_SEAL_REJECTED");
 const receiptBytes=encode(sealed);
 const core={schema:"playdeck.full-genesis-proof/v1",source:"original-playdeck",
  planId:plan.id,planFrameCount:expectedFrames,media:native,
  projectedOriginalReceiptId:parent.id,
  originalSealBy:"@playdeck/receipts sealReceipt",
  materializedDescendantSourceCardId:"card-09",
  materializedDescendantId:descendant.id,
  sealedReceiptSha256:hash(receiptBytes),inheritable:true,
  mediaRightsVerified:false,publishingAuthorized:false,
  humanAdoptionClaimed:false};
 return {proof:{...core,proofSha256:hash(encode(core))},receipt:sealed};
}
export function main(args:string[]){
 const {media,out}=input(args);
 const {proof,receipt}=buildReceipt(media);
 mkdirSync(dirname(out),{recursive:true});
 writeFileSync(out,encode({proof,receipt}),{flag:"wx"});
 return {status:"ORIGINAL_PLAYDECK_FULL_PERFORMANCE_RENDERED_AND_SEALED",
  planId:proof.planId,frames:proof.planFrameCount,durationSeconds:proof.media.ffprobeDurationSeconds,
  mediaSha256:proof.media.originalMediaSha256,receiptSha256:proof.sealedReceiptSha256,
  sourceRightsNotGranted:true};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(encode(main(process.argv.slice(2))));}
 catch(e){console.error(String(e).slice(0,1200));process.exitCode=2;}
}
