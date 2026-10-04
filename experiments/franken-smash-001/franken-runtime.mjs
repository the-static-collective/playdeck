export const SOURCE_PINS = Object.freeze({
  listeningEye: Object.freeze({repo:"the-static-collective/the-haunted-toaster",branch:"feature/listening-eye-v0",sha:"fe185abbbfa9d56e613f953f7c92531853a80fb3"}),
  timeSlice: Object.freeze({repo:"the-static-collective/the-haunted-blender",branch:"experimental/time-slice-recajgger-001",sha:"60c8746215f23aaa3e06f730fa44ecb0df341210"}),
  observer: Object.freeze({repo:"the-static-collective/the-haunted-blender",branch:"experimental/observer-local-vision-001",sha:"9beec9cce02f9c595386fc39fd7fb79a890434da"}),
  memoryFeedback: Object.freeze({repo:"the-static-collective/the-haunted-blender",branch:"experimental/memory-feedback-001",sha:"6aca64fdeeb458653e20558c4b23fa89ec622ba7"}),
  dogram: Object.freeze({repo:"the-static-collective/Dogram",branch:"main",sha:"551b5f9df18f17ec69b452ddcdff01718e0ff771"}),
});

export const SCHEMAS = Object.freeze({
  listeningEye:"haunted-toaster/listening-eye/v0",
  timeSlice:"haunted-blender/time-slice-receipt/v0",
  observer:"haunted-blender/observer-local-projection/v0",
  memoryFeedback:"haunted-blender/memory-feedback-receipt/v0",
  dogram:"dogram.listener-delta-receipt/v0",
});

const LENSES=["landscape","architecture","organism","sigil","weather","dimensional-space"];
const WORLD={
  landscape:{physical:"postcard",surface:"field-notes",transition:"slow-assembly"},
  architecture:{physical:"contact-sheet",surface:"blueprint",transition:"held-threshold"},
  organism:{physical:"flipbook",surface:"darkroom",transition:"breathing-fold",awakening:"portal"},
  sigil:{physical:"comic-page",surface:"teletext",transition:"glyph-break"},
  weather:{physical:"polaroid",surface:"vhs-machine",transition:"particle-drift",awakening:"doorway"},
  "dimensional-space":{physical:"field-notes",surface:"stained-glass",transition:"room-fold",awakening:"portal"},
};

const isObject=(x)=>Boolean(x)&&typeof x==="object"&&!Array.isArray(x);
const need=(ok,msg)=>{if(!ok)throw new Error(msg);};
const stable=(x)=>{
  if(x===null||typeof x!=="object")return JSON.stringify(x);
  if(Array.isArray(x))return "["+x.map(stable).join(",")+"]";
  return "{"+Object.keys(x).sort().map((k)=>JSON.stringify(k)+":"+stable(x[k])).join(",")+"}";
};
export const hashText=(s)=>{
  let h=2166136261;
  for(let i=0;i<s.length;i+=1){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}
  return (h>>>0).toString(16).padStart(8,"0");
};
const samePin=(a,b)=>a&&a.repo===b.repo&&a.branch===b.branch&&a.sha===b.sha;
const cap=(role,authority,source,identity,summary,nonclaims)=>Object.freeze({
  schema:"playdeck/franken-capsule/v0",
  id:"franken-"+role+"-"+hashText(identity+":"+source.producer.sha),
  role,authorityClass:authority,sourceSchema:source.artifact.schema,sourceIdentity:identity,
  producer:Object.freeze({...source.producer}),summary:Object.freeze(summary),nonclaims:Object.freeze(nonclaims),
});

const listening=(source)=>{
  need(samePin(source?.producer,SOURCE_PINS.listeningEye),"Listening Eye producer pin mismatch.");
  const a=source.artifact;
  need(isObject(a)&&a.schema===SCHEMAS.listeningEye,"Unsupported Listening Eye schema.");
  need(a.authority==="influence-only","Listening Eye must remain influence-only.");
  need(Array.isArray(a.lenses)&&a.lenses.length===6,"Listening Eye requires six lenses.");
  const lenses=a.lenses.map((lens,i)=>{
    need(isObject(lens)&&lens.id===LENSES[i],"Listening Eye lens order mismatch.");
    need(isObject(lens.pressures),"Listening Eye lens pressures missing.");
    const p={};
    for(const axis of ["motion","density","contrast","persistence","memory","foreshadow","arrival"]){
      need(Number.isFinite(lens.pressures[axis])&&lens.pressures[axis]>=0&&lens.pressures[axis]<=1,"Invalid Listening Eye pressure.");
      p[axis]=lens.pressures[axis];
    }
    return Object.freeze({id:lens.id,name:String(lens.name||lens.id),pressures:Object.freeze(p)});
  });
  need(typeof a.listeningEyeSha256==="string"&&a.listeningEyeSha256,"Listening Eye identity missing.");
  return cap("art-direction","influence-only",source,a.listeningEyeSha256,
    {analysisHash:a.analysisHash,album:a.album,summary:a.summary,lenses},
    ["Selection pressure only.","No KEEP or render authority."]);
};

const timeSlice=(source)=>{
  need(samePin(source?.producer,SOURCE_PINS.timeSlice),"Time Slice producer pin mismatch.");
  const a=source.artifact;
  need(isObject(a)&&a.schema===SCHEMAS.timeSlice&&a.status==="scoped_complete","Incomplete Time Slice receipt.");
  need(a.distribution_authorized===false,"Time Slice may not import distribution authority.");
  need(typeof a.output_sha256==="string"&&Array.isArray(a.strips),"Malformed Time Slice receipt.");
  return cap("time-slice-material","evidence",source,a.output_sha256,
    {outputSha256:a.output_sha256,sourceVideoSha256:a.source_video_sha256,stripCount:a.strips.length,sampleFps:a.sample_fps},
    ["Derived private artifact existence only.","Spatial strips are interpretation, not occurrence."]);
};

const observer=(source)=>{
  need(samePin(source?.producer,SOURCE_PINS.observer),"Observer producer pin mismatch.");
  const a=source.artifact;
  need(isObject(a)&&a.schema===SCHEMAS.observer,"Unsupported Observer projection.");
  need(typeof a.projection_sha256==="string"&&Array.isArray(a.environment_response),"Malformed Observer projection.");
  return cap("observer-presentation","influence-only",source,a.projection_sha256,
    {observerId:a.observer_id,observerPosition:a.observer_position,worldSha256:a.world_sha256,beat:a.beat,environmentResponse:a.environment_response},
    ["Visibility changes presentation only.","Memory residue is guidance, not present fact."]);
};

const memory=(source)=>{
  need(samePin(source?.producer,SOURCE_PINS.memoryFeedback),"Memory Feedback producer pin mismatch.");
  const a=source.artifact;
  need(isObject(a)&&a.schema===SCHEMAS.memoryFeedback&&a.status==="scoped_complete","Incomplete Memory Feedback receipt.");
  need(a.distribution_authorized===false,"Memory Feedback may not import distribution authority.");
  need(typeof a.output_sha256==="string","Memory Feedback identity missing.");
  return cap("memory-feedback-material","evidence",source,a.output_sha256,
    {outputSha256:a.output_sha256,observerId:a.observer_id,worldSha256:a.world_sha256,residueFactIds:a.residue_fact_ids,memoryStatistics:a.memory_statistics},
    ["Residual pixels are cinematic material, not current presence.","Derived output has no inherited scene/publication authority."]);
};

const dogram=(source)=>{
  need(samePin(source?.producer,SOURCE_PINS.dogram),"Dogram producer pin mismatch.");
  const a=source.artifact;
  need(isObject(a)&&a.schema===SCHEMAS.dogram&&a.status==="OK","Incomplete Dogram receipt.");
  need(typeof a.receipt_hash==="string","Dogram receipt identity missing.");
  return cap("measurement","measurement-only",source,a.receipt_hash,
    {specimen:a.specimen,cohort:a.cohort,residuals:a.residuals,laws:a.laws},
    ["RESPONSE DELTA != PERSON DELTA","RESPONSE DELTA != CAUSAL EFFECT","MEASUREMENT != GRADE"]);
};

export const compileContext=(input)=>{
  need(input?.listeningEye,"Listening Eye is required.");
  const influences=[listening(input.listeningEye)];
  const evidence=[];
  const measurements=[];
  if(input.observer)influences.push(observer(input.observer));
  if(input.timeSlice)evidence.push(timeSlice(input.timeSlice));
  if(input.memoryFeedback)evidence.push(memory(input.memoryFeedback));
  if(input.dogram)measurements.push(dogram(input.dogram));
  const body={influences:influences.map(x=>x.id),evidence:evidence.map(x=>x.id),measurements:measurements.map(x=>x.id)};
  return Object.freeze({
    schema:"playdeck/franken-context/v0",
    id:"franken-context-"+hashText(stable(body)),
    influences:Object.freeze(influences),evidence:Object.freeze(evidence),measurements:Object.freeze(measurements),
    laws:Object.freeze(["SOURCE != PLAN","PROPOSAL != HISTORY","INFLUENCE != EVIDENCE","MEASUREMENT != GRADE","KEEP = CONTINUATION PERMISSION","DERIVED MATERIAL != PUBLICATION AUTHORITY"]),
  });
};

const carts=(ctx,lens)=>{
  const out=[];
  const o=ctx.influences.find(x=>x.role==="observer-presentation");
  const t=ctx.evidence.find(x=>x.role==="time-slice-material");
  const m=ctx.evidence.find(x=>x.role==="memory-feedback-material");
  if(o)out.push({role:o.role,capsuleId:o.id,mode:["architecture","dimensional-space"].includes(lens)?"observer-eye":"presentation-context"});
  if(t&&["sigil","weather","dimensional-space"].includes(lens))out.push({role:t.role,capsuleId:t.id,mode:"bounded-time-image"});
  if(m&&["organism","weather","dimensional-space"].includes(lens))out.push({role:m.role,capsuleId:m.id,mode:"bounded-memory-residue"});
  return out;
};

export const proposeFamily=(ctx)=>{
  const art=ctx.influences.find(x=>x.role==="art-direction");
  need(art&&Array.isArray(art.summary.lenses),"Art-direction capsule missing.");
  return Object.freeze(art.summary.lenses.map((lens,i)=>Object.freeze({
    schema:"playdeck/franken-proposal/v0",id:"franken-proposal-"+(i+1)+"-"+hashText(ctx.id+":"+lens.id),
    slot:i+1,authorityClass:"proposal",contextId:ctx.id,lensId:lens.id,label:lens.name,
    invitation:"compose-through-"+lens.id,pressures:Object.freeze({...lens.pressures}),worldPatch:Object.freeze({...WORLD[lens.id]}),
    cartridges:Object.freeze(carts(ctx,lens.id)),refused:Object.freeze(["Dogram measurement may not alter proposals.","Blender evidence may enable a cartridge but may not become ancestry by itself."]),
  })));
};

export const keepProposal=(ctx,proposal)=>{
  need(proposal?.contextId===ctx.id&&proposal.authorityClass==="proposal","KEEP requires a proposal from this context.");
  const canonical=proposeFamily(ctx).find(x=>x.id===proposal.id);
  need(canonical&&stable(canonical)===stable(proposal),"KEEP refuses mutated/foreign proposal.");
  return Object.freeze({
    schema:"playdeck/franken-continuation/v0",id:"franken-keep-"+hashText(ctx.id+":"+proposal.id),
    authorityClass:"continuation-permission",contextId:ctx.id,proposal,
    evidenceCapsuleIds:Object.freeze(ctx.evidence.map(x=>x.id)),measurementCapsuleIds:Object.freeze(ctx.measurements.map(x=>x.id)),
    laws:ctx.laws,
  });
};

const camera=(lens)=>({landscape:"locked-wide",architecture:"hinge-orbit",organism:"slow-dolly",sigil:"snap-insert",weather:"observer-eye","dimensional-space":"negative-space"}[lens]||"locked-wide");
const motion=(lens)=>({landscape:"drift",architecture:"hinge",organism:"breath",sigil:"stutter",weather:"parallax","dimensional-space":"fold"}[lens]||"drift");

export const composePlan=(base,continuation)=>{
  need(continuation?.authorityClass==="continuation-permission","Plan composition requires explicit continuation permission.");
  const p=continuation.proposal;
  const ts=p.cartridges.find(x=>x.role==="time-slice-material");
  const obs=p.cartridges.find(x=>x.role==="observer-presentation");
  const mem=p.cartridges.find(x=>x.role==="memory-feedback-material");
  const events=base.events.map((event,index)=>{
    const f={schema:"playdeck/franken-event-guidance/v0",continuationId:continuation.id,proposalId:p.id,lensId:p.lensId,lensSlot:p.slot,
      camera:camera(p.lensId),motion:motion(p.lensId),motionPressure:p.pressures.motion||0,densityPressure:p.pressures.density||0,
      contrastPressure:p.pressures.contrast||0,persistencePressure:p.pressures.persistence||0,memoryPressure:p.pressures.memory||0,sectionIndex:index};
    if(obs)f.observerCapsuleId=obs.capsuleId;
    if(ts&&["contact-sheet","corrupt","custom"].includes(event.type)){f.timeSliceCapsuleId=ts.capsuleId;f.timeSliceMode=ts.mode;}
    if(mem&&["residue","drift","hold","custom"].includes(event.type)){f.memoryCapsuleId=mem.capsuleId;f.memoryMode=mem.mode;}
    return {...event,params:{...(event.params||{}),franken:f},because:[event.because,"Franken KEEP "+p.id+" adds "+p.lensId+" guidance without changing event authority."].filter(Boolean).join(" ")};
  });
  return {...base,id:base.id+"--franken-"+p.lensId+"-"+hashText(continuation.id),events,
    metadata:{...(base.metadata||{}),franken:{schema:"playdeck/franken-plan-context/v0",continuationId:continuation.id,contextId:continuation.contextId,
      proposalId:p.id,authorityClass:continuation.authorityClass,lensId:p.lensId,worldPatch:p.worldPatch,cartridges:p.cartridges,
      evidenceCapsuleIds:continuation.evidenceCapsuleIds,measurementCapsuleIds:continuation.measurementCapsuleIds,laws:continuation.laws}},
    renderHints:{...(base.renderHints||{}),deterministic:true,notes:[...((base.renderHints&&base.renderHints.notes)||[]),
      "Franken continuation "+continuation.id+" is proposal permission, not a receipt.",
      "Unknown Franken guidance may be ignored by renderers; it may not be reinterpreted as source fact."]}};
};
