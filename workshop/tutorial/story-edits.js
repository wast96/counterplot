/* Data-only, identity-based edits to an authored tutorial scene.
 * A scene is partial: an absent future character is NOT a deletion. Runtime uses
 * three-way comparisons so a tutorial transition cannot replace a learner's prose.
 */
const TutorialStoryEdits=(()=>{
 'use strict';
 const copy=x=>JSON.parse(JSON.stringify(x));
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const bad=new Set(['__proto__','prototype','constructor']);
 const roots=new Set(['title','subtitle','notes','references','nodes','characters','world','connections','plots','archive','tutorialRemoved']);
 const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
 const identified=a=>Array.isArray(a)&&a.every(x=>object(x)&&typeof x.id==='string');
 function diff(before,after){
  const out=[];
  function walk(a,b,path,hadA=true,hadB=true){
   if(hadA===hadB&&same(a,b))return;
   if(hadA&&hadB&&identified(a)&&identified(b)){
    const am=new Map(a.map(x=>[x.id,x])),bm=new Map(b.map(x=>[x.id,x]));
    for(const id of new Set([...am.keys(),...bm.keys()]))walk(am.get(id),bm.get(id),[...path,{id}],am.has(id),bm.has(id));
    const old=a.map(x=>x.id),next=b.map(x=>x.id);
    if(!same(old,next))out.push({kind:'order',path,before:old,value:next});
   }else if(hadA&&hadB&&object(a)&&object(b)){
    for(const key of new Set([...Object.keys(a),...Object.keys(b)])){
     if(key==='id'||bad.has(key))continue;
     walk(a[key],b[key],[...path,key],Object.hasOwn(a,key),Object.hasOwn(b,key));
    }
   }else out.push({kind:'value',path,had:hadA,has:hadB,...(hadA?{before:copy(a)}:{}),...(hadB?{value:copy(b)}:{})});
  }
  for(const key of roots)walk(before[key],after[key],[key],Object.hasOwn(before,key),Object.hasOwn(after,key));
  return out;
 }
 function validate(ops){
  if(!Array.isArray(ops)||ops.length>10000)throw Error('Scene edits must be a list of at most 10,000 changes.');
  for(const op of ops){
   if(!object(op)||!['value','order'].includes(op.kind)||!Array.isArray(op.path)||!op.path.length||op.path.length>24||!roots.has(op.path[0]))throw Error('Unsupported scene edit.');
   for(const part of op.path){
    if(typeof part==='string'){if(bad.has(part)||part==='id'||!/^[a-zA-Z][\w-]*$/.test(part))throw Error('Unsafe scene edit path.');}
    else if(!object(part)||Object.keys(part).length!==1||typeof part.id!=='string'||! /^[\w-]{1,120}$/.test(part.id))throw Error('Invalid scene item identifier.');
   }
   if(op.kind==='order'){
    for(const a of [op.before,op.value])if(!Array.isArray(a)||a.length>10000||new Set(a).size!==a.length||a.some(id=>typeof id!=='string'||!/^[\w-]{1,120}$/.test(id)))throw Error('Invalid scene ordering.');
   }else if(typeof op.had!=='boolean'||typeof op.has!=='boolean'||(op.had&&!Object.hasOwn(op,'before'))||(op.has&&!Object.hasOwn(op,'value')))throw Error('Incomplete scene value edit.');
   if(op.path[0]==='tutorialRemoved'){if(op.path.length!==1||op.kind!=='value')throw Error('Invalid removal markers.');for(const value of [op.before,op.value])if(value!==undefined&&(!Array.isArray(value)||value.length>10000||value.some(id=>typeof id!=='string'||! /^[\w-]{1,120}$/.test(id))))throw Error('Invalid removal markers.');}
   for(const v of [op.before,op.value])if(v!==undefined&&JSON.stringify(v).length>8000000)throw Error('A scene change is too large.');
  }
  return ops;
 }
 function apply(project,ops,{force=false}={}){
  validate(ops);const p=copy(project),skipped=[];
  for(const op of ops){
   let owner=p;
   for(const part of op.path.slice(0,-1))owner=typeof part==='string'?owner?.[part]:Array.isArray(owner)?owner.find(x=>x.id===part.id):undefined;
   const key=op.path.at(-1);
   if(!owner){skipped.push(op.path);continue;}
   const array=typeof key!=='string';if(array&&!Array.isArray(owner)){skipped.push(op.path);continue;}
   const index=array?owner.findIndex(x=>x.id===key.id):-1,had=array?index>=0:Object.hasOwn(owner,key),current=array?owner[index]:owner[key];
   if(op.kind==='order'){
    if(!Array.isArray(current)){skipped.push(op.path);continue;}
    const known=new Set(op.before),seen=current.map(x=>x.id).filter(id=>known.has(id)),expected=op.before.filter(id=>seen.includes(id));
    if(!force&&!same(seen,expected)){skipped.push(op.path);continue;}
    // Reorder only named slots; extra learner-created pieces keep their positions.
    const rank=new Map(op.value.map((id,i)=>[id,i])),ordered=current.filter(x=>rank.has(x.id)).sort((a,b)=>rank.get(a.id)-rank.get(b.id));let i=0;
    const next=current.map(x=>rank.has(x.id)?ordered[i++]:x);if(array)owner[index]=next;else owner[key]=next;
    continue;
   }
   if(!force&&op.path.length===1&&key==='tutorialRemoved'){
    // Deliberate removals are a set: keep unrelated learner tombstones while
    // applying only this authored addition/restoration. Later assemblies read it.
    const old=new Set(op.before||[]),next=new Set(op.value||[]),merged=new Set(current||[]);
    for(const id of next)if(!old.has(id))merged.add(id);
    for(const id of old)if(!next.has(id))merged.delete(id);
    if(merged.size||op.has)owner[key]=[...merged];else delete owner[key];
    continue;
   }
   if(!force&&((had!==op.had)||had&&!same(current,op.before))){if(!(had===op.has&&same(current,op.value)))skipped.push(op.path);continue;}
   if(op.has){if(array){if(index>=0)owner[index]=copy(op.value);else owner.push(copy(op.value));}else owner[key]=copy(op.value);}
   else if(array){if(index>=0)owner.splice(index,1);}else delete owner[key];
  }
  return {project:p,skipped};
 }
 // Coalesce repeated edits to one field, but never reorder structural operations.
 function append(existing,changes){
  const out=copy(existing||[]);
  for(const op of changes){
   const key=JSON.stringify(op.path),last=out.at(-1);
   if(last&&last.kind===op.kind&&JSON.stringify(last.path)===key){
    if(op.kind==='value'){last.has=op.has;if(op.has)last.value=copy(op.value);else delete last.value;if(last.had===last.has&&same(last.before,last.value))out.pop();}
    else{last.value=copy(op.value);if(same(last.before,last.value))out.pop();}
   }else out.push(copy(op));
  }
  validate(out);return out;
 }
 return {diff,validate,apply,append};
})();
if(typeof module!=='undefined')module.exports=TutorialStoryEdits;
