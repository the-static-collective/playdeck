import {
  SOURCE_PINS,compileContext,proposeFamily,keepProposal,composePlan,
} from "./franken-runtime.mjs";

const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};
const equal=(a,b,msg)=>assert(JSON.stringify(a)===JSON.stringify(b),msg);

const eye={
  schema:"haunted-toaster/listening-eye/v0",authority:"influence-only",
  analysisHash:"a".repeat(64),album:{trackIndex:2,trackCount:7},summary:{meanEnergy:.52},
  lenses:[
    ["landscape","Landscape"],["architecture","Architecture"],["organism","Organism"],
    ["sigil","Sigil / Type"],["weather","Weather / Particles"],["dimensional-space","Dimensional Space"],
  ].map(([id,name],i)=>({id,name,pressures:{
    motion:.2+i*.1,density:.3+i*.08,contrast:.4+i*.06,persistence:.5,
    memory:.35+i*.07,foreshadow:.7-i*.05,arrival:.2+i*.08,
  }})),
  listeningEyeSha256:"b".repeat(64),
};
const time={
  schema:"haunted-blender/time-slice-receipt/v0",status:"scoped_complete",
  source_video_sha256:"c".repeat(64),sample_fps:8,strips:Array.from({length:32},(_,i)=>({sample_index:i})),
  output_sha256:"d".repeat(64),distribution_authorized:false,
};
const observer={
  schema:"haunted-blender/observer-local-projection/v0",observer_id:"eye-a",observer_position:"threshold",
  world_sha256:"e".repeat(64),beat:2,environment_response:[
    {fact_id:"door",mode:"present_to_eye"},{fact_id:"figure",mode:"memory_residue"},
  ],projection_sha256:"f".repeat(64),
};
const memory={
  schema:"haunted-blender/memory-feedback-receipt/v0",status:"scoped_complete",
  observer_id:"eye-a",world_sha256:"e".repeat(64),residue_fact_ids:["figure"],
  memory_statistics:{figure:{captured_frames:5,residue_frames:8}},output_sha256:"1".repeat(64),
  distribution_authorized:false,
};
const dogram={
  schema:"dogram.listener-delta-receipt/v0",specimen:"LISTENER-DELTA-001",status:"OK",
  cohort:{classification:"MEASURED_RESPONSE_CHANGE",changed_listener_count:2},
  residuals:["audio_change_causality_not_established"],laws:["DELTA != VALUE"],
  receipt_hash:"sha256:"+"2".repeat(64),
};

const input={
  listeningEye:{producer:SOURCE_PINS.listeningEye,artifact:eye},
  timeSlice:{producer:SOURCE_PINS.timeSlice,artifact:time},
  observer:{producer:SOURCE_PINS.observer,artifact:observer},
  memoryFeedback:{producer:SOURCE_PINS.memoryFeedback,artifact:memory},
  dogram:{producer:SOURCE_PINS.dogram,artifact:dogram},
};
const a=compileContext(input);
const b=compileContext(input);
equal(a,b,"same artifacts must compile identically");
assert(a.influences.length===2,"expected art direction + observer influences");
assert(a.evidence.length===2,"expected two Blender evidence capsules");
assert(a.measurements.length===1&&a.measurements[0].authorityClass==="measurement-only","Dogram must remain measurement-only");

const family1=proposeFamily(a);
const family2=proposeFamily(a);
equal(family1,family2,"six-up family must replay exactly");
assert(family1.length===6&&new Set(family1.map(x=>x.lensId)).size===6,"six distinct lenses required");
const dimensional=family1.find(x=>x.lensId==="dimensional-space");
assert(dimensional,"dimensional proposal missing");
assert(dimensional.cartridges.some(x=>x.role==="observer-presentation"),"observer cartridge missing");
assert(dimensional.cartridges.some(x=>x.role==="time-slice-material"),"time-slice cartridge missing");
assert(dimensional.cartridges.some(x=>x.role==="memory-feedback-material"),"memory cartridge missing");
assert(!dimensional.cartridges.some(x=>x.role==="measurement"),"measurement leaked into creative cartridges");

const kept=keepProposal(a,dimensional);
assert(kept.authorityClass==="continuation-permission","KEEP authority wrong");
const base={schemaVersion:"0.1",id:"proof-plan",events:[
  {id:"intro",at:0,type:"arrive",cards:["c1"]},
  {id:"bridge",at:10,type:"corrupt",cards:["c1","c2"]},
  {id:"breakdown",at:20,type:"contact-sheet",cards:["c1","c2"]},
  {id:"outro",at:30,type:"residue",cards:["c2"]},
],renderHints:{deterministic:true,notes:["base"]},metadata:{base:true}};
const p1=composePlan(base,kept);
const p2=composePlan(base,kept);
equal(p1,p2,"kept plan must replay exactly");
assert(p1.id!==base.id,"Franken plan must get distinct identity");
assert(p1.events[1].params.franken.timeSliceCapsuleId,"time slice did not reach plan");
assert(p1.events[3].params.franken.memoryCapsuleId,"memory did not reach plan");
assert(!JSON.stringify(p1).includes("MEASURED_RESPONSE_CHANGE"),"Dogram measurement content leaked into plan");

let refused=false;
try{
  compileContext({listeningEye:{producer:{...SOURCE_PINS.listeningEye,sha:"0".repeat(40)},artifact:eye}});
}catch(error){refused=/pin mismatch/.test(String(error));}
assert(refused,"wrong source pin must refuse");

refused=false;
try{
  compileContext({listeningEye:{producer:SOURCE_PINS.listeningEye,artifact:{...eye,authority:"render-authority"}}});
}catch(error){refused=/influence-only/.test(String(error));}
assert(refused,"authority escalation must refuse");

console.log(JSON.stringify({
  ok:true,contextId:a.id,
  proposals:family1.map(x=>({lens:x.lensId,cartridges:x.cartridges.map(y=>y.role)})),
  kept:kept.id,planId:p1.id,measurementAuthority:a.measurements[0].authorityClass,
},null,2));
