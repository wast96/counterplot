/* Declarative tutorial assemblies. Only add missing data; never rewrite a learner's work. */
const TutorialEffects = (() => {
 'use strict';
 const copy=x=>JSON.parse(JSON.stringify(x));
 const collections=['nodes','characters','blocks','changes','world','connections','plots'];
 function presets(sample){
  const early=['loyalty','defection','drop','mission-question','sokolov-rescue','bridge','nuclear-launch'];
  const omit=['inquiry','escort','flowers-scene','aircraft-duel','award','call'];
  function make(id,title,nodes,full=false){
   const chars=sample.characters.filter(c=>full||['snake','boss'].includes(c.id));
   return {id,title,nodes:nodes.filter(id=>sample.nodes.some(n=>n.id===id)),characters:chars.map(c=>c.id),blocks:chars.flatMap(c=>c.blocks.map(b=>c.id+':'+b.id)),changes:full?chars.flatMap(c=>c.changes.filter(x=>nodes.includes(x.at.split(':')[0])).map(x=>c.id+':'+x.id)):[],world:full?sample.world.map(w=>w.id):[],connections:full?sample.connections.map(c=>c.id):[],plots:[],placements:[]};
  }
  return [make('bridge','Bridge confrontation',early),make('orders','New mission orders',[...early,'jungle','crisis']),make('middle','Middle of the story',sample.nodes.filter(n=>!omit.includes(n.id)).map(n=>n.id),true),{id:'finalfight',title:'Final Boss encounter',nodes:['flowers-scene'],characters:[],blocks:[],changes:[],world:[],connections:[],plots:[],placements:[{id:'flowers-scene',anchor:'escort',where:'before'}]},make('complete','Finish the story',sample.nodes.map(n=>n.id),true)];
 }
 function empty(id='assembly',title='New assembly'){return {id,title,...Object.fromEntries(collections.map(k=>[k,[]])),placements:[]};}
 function catalog(sample){return {
  nodes:sample.nodes.map(n=>({id:n.id,label:(n.type||'')+' · '+(n.title||'Untitled')})),
  characters:sample.characters.map(c=>({id:c.id,label:c.name})),
  blocks:sample.characters.flatMap(c=>c.blocks.map(b=>({id:c.id+':'+b.id,label:c.name+' · '+(b.label||b.kind)+': '+b.text}))),
  changes:sample.characters.flatMap(c=>c.changes.map(x=>({id:c.id+':'+x.id,label:c.name+' · '+x.at+' · '+(x.block?.text||x.op)}))),
  world:sample.world.map(w=>({id:w.id,label:w.type+' · '+w.name})),
  connections:sample.connections.map(r=>({id:r.id,label:r.label+' · '+r.a+' / '+r.b})),
  plots:(sample.plots||[]).map(p=>({id:p.id,label:p.label+' · '+p.title}))
 };}
 function validate(spec,sample){
  if(!spec||typeof spec!=='object'||Array.isArray(spec))throw Error('Assembly must be an object.');
  if(!/^[\w-]{1,100}$/.test(spec.id)||typeof spec.title!=='string'||!spec.title.trim())throw Error('Each assembly needs a stable ID and a name.');
  const entries=catalog(sample);
  for(const key of collections){if(!Array.isArray(spec[key])||spec[key].length>10000||new Set(spec[key]).size!==spec[key].length)throw Error(spec.title+': '+key+' must be a list without duplicates.');for(const id of spec[key])if(!entries[key].some(x=>x.id===id))throw Error(spec.title+': missing sample '+key+' item “'+id+'”.');}
  if(!Array.isArray(spec.placements)||spec.placements.length>10000)throw Error(spec.title+': placements must be a list.');
  for(const v of spec.placements)if(!v||!spec.nodes.includes(v.id)||!sample.nodes.some(n=>n.id===v.anchor)||v.id===v.anchor||!['before','after'].includes(v.where))throw Error(spec.title+': each placement needs an added node, a different anchor, and before/after.');
  return spec;
 }
 function applyInPlace(project,sample,spec){
  validate(spec,sample);const p=project,added=[];
  const removed=Array.isArray(p.tutorialRemoved)?p.tutorialRemoved:[];
  const archivedNodes=new Set([...removed,...p.archive.flatMap(a=>a.nodes||[]).map(n=>n.id)]);
  const archivedItems=new Set([...removed,...p.archive.map(a=>a.item?.id).filter(Boolean)]);
  const archivedBlocks=new Set([...archivedItems,...p.archive.filter(a=>a.kind==='character').flatMap(a=>a.item.blocks||[]).map(b=>b.id)]);
  const archivedChanges=new Set([...removed,...p.archive.flatMap(a=>a.changes||a.item?.changes||[]).map(x=>(x.change||x).id)]);
  const rank=new Map(sample.nodes.map((n,i)=>[n.id,i]));
  for(const id of spec.characters){if(archivedItems.has(id)||p.characters.some(c=>c.id===id))continue;const c=copy(sample.characters.find(c=>c.id===id));c.blocks=[];c.changes=[];p.characters.push(c);added.push(id);}
  for(const key of ['world','plots'])for(const id of spec[key]){if(archivedItems.has(id)||(p[key]||[]).some(x=>x.id===id))continue;(p[key]||=[]).push(copy(sample[key].find(x=>x.id===id)));added.push(id);}
  const wanted=sample.nodes.filter(n=>spec.nodes.includes(n.id)&&!p.nodes.some(x=>x.id===n.id)&&!archivedNodes.has(n.id));
  // Topological insertion also handles imported samples whose physical array is not parent-first.
  let pending=wanted.slice();
  while(pending.length){let moved=false;
   for(const n of pending.slice()){
    if(n.parentId&&!p.nodes.some(x=>x.id===n.parentId)){
     let parent=n.parentId,seen=new Set();let archived=false;
     while(parent&&!seen.has(parent)){seen.add(parent);if(archivedNodes.has(parent)){archived=true;break;}parent=sample.nodes.find(x=>x.id===parent)?.parentId;}
     if(archived){pending=pending.filter(x=>x!==n);moved=true;}continue;
    }
    const fresh={...copy(n),cast:n.cast.filter(id=>p.characters.some(c=>c.id===id)),worldIds:n.worldIds.filter(id=>p.world.some(w=>w.id===id)),plotIds:(n.plotIds||[]).filter(id=>p.plots?.some(x=>x.id===id))};
    const placement=spec.placements.find(v=>v.id===n.id),anchor=placement&&p.nodes.find(x=>x.id===placement.anchor&&x.parentId===n.parentId);
    const next=anchor||p.nodes.find(x=>x.parentId===n.parentId&&rank.has(x.id)&&rank.get(x.id)>rank.get(n.id));
    if(next)p.nodes.splice(p.nodes.indexOf(next)+(anchor&&placement.where==='after'?1:0),0,fresh);else p.nodes.push(fresh);
    added.push(n.id);pending=pending.filter(x=>x!==n);moved=true;
   }
   if(!moved)throw Error('Cannot add “'+pending[0].title+'” without its parent. Add the parent to this assembly, or restore it before continuing.');
  }
  for(const compound of spec.blocks){const [cid,bid]=compound.split(':');if(archivedItems.has(cid)||archivedBlocks.has(bid))continue;const c=p.characters.find(c=>c.id===cid);if(!c)throw Error('Add character “'+cid+'” before its starting blocks.');if(!c.blocks.some(b=>b.id===bid)){c.blocks.push(copy(sample.characters.find(c=>c.id===cid).blocks.find(b=>b.id===bid)));added.push(bid);}}
  for(const compound of spec.changes){const [cid,xid]=compound.split(':'),source=sample.characters.find(c=>c.id===cid).changes.find(x=>x.id===xid);if(archivedItems.has(cid)||archivedBlocks.has(source.blockId)||archivedChanges.has(xid)||archivedNodes.has(source.at.split(':')[0]))continue;const c=p.characters.find(c=>c.id===cid);if(!c)throw Error('Add character “'+cid+'” before its timed changes.');if(c.changes.some(x=>x.id===xid||(x.at===source.at&&x.blockId===source.blockId)))continue;if(!p.nodes.some(n=>n.id===source.at.split(':')[0]))throw Error('Add the story moment “'+source.at+'” before its timed change.');c.changes.push(copy(source));added.push(xid);}
  for(const id of spec.connections){if(archivedItems.has(id)||p.connections.some(x=>x.id===id))continue;const r=sample.connections.find(x=>x.id===id);if(!p.characters.some(c=>c.id===r.a)||!p.characters.some(c=>c.id===r.b)){if(archivedItems.has(r.a)||archivedItems.has(r.b))continue;throw Error('Add both characters before connection “'+r.label+'”.');}p.connections.push(copy(r));added.push(id);}
  return added;
 }
 function apply(project,sample,spec){
  // Invalid authoring dependencies must not leave half of an assembly behind.
  const draft=copy(project),added=applyInPlace(draft,sample,spec);
  for(const key of Object.keys(project))if(!Object.hasOwn(draft,key))delete project[key];
  Object.assign(project,draft);return added;
 }
 return {collections,presets,empty,catalog,validate,apply};
})();
if(typeof module!=='undefined')module.exports=TutorialEffects;
