/* Progressive sample assembly. Existing learner wording always wins. */
const TutorialConstruction=(()=>{
 const copy=x=>JSON.parse(JSON.stringify(x));
 function teachingSample(source){const p=copy(source),find=id=>p.nodes.find(n=>n.id===id);
  if(find('defection')&&find('mission-question'))return p;
  delete p.timeline;delete p.readingOrder;delete p.readingSequence;
  const defection={...copy(find('sokolov-rescue')),id:'defection',type:'E',parentId:'loyalty',title:'Defection of Sokolov',opening:'Sokolov wants to leave the Soviet Union. Snake must bring him out safely.',closing:'Sokolov is unable to defect.',notes:'The rescue attempt resolves through failure when The Boss takes Sokolov.',cast:['snake','sokolov'],references:[]};
  const question={...copy(find('inquiry')),id:'mission-question',parentId:'drop',title:'Why did The Boss join this mission?',opening:'The Boss joins Snake’s support team. Why is his former instructor involved in this operation?',closing:'Her apparent defection explains her involvement to Snake: she takes Sokolov and joins Volgin.',notes:'This is Snake’s provisional answer. EVA’s recording later reveals that The Boss was following American orders.',cast:['snake','boss'],references:[]};
  find('drop').parentId='defection';find('jungle').parentId='loyalty';
  // This card represents the late reveal, not an answer before the missions.
  const reveal=find('inquiry');
  reveal.opening='The missions are over, but Snake still does not know why The Boss apparently betrayed him. EVA leaves him a recording.';
  reveal.notes+=' This card places the final explanation after Operation Snake Eater. Snake’s earlier, provisional answer belongs to the separate mission Inquiry.';
  p.nodes.splice(p.nodes.indexOf(reveal),1);p.nodes.splice(p.nodes.indexOf(find('award')),0,reveal);
  defection.writingId=defection.id;question.writingId=question.id;
  p.nodes.splice(p.nodes.indexOf(find('drop')),0,defection);p.nodes.splice(p.nodes.indexOf(find('drop'))+1,0,question);
  return p;
 }
 function starter(data){const w=copy(data),p=w.projects[0];w.saveKey='counterplot.tutorial.build.v2';w.tutorialBuild=true;w.active=p.id='mgs3-build-v1';p.tutorialId='mgs3';p.title='MGS3 · Build the story';p.subtitle='Build the outline, cast, world, and relationships. Full MGS3 spoilers.';for(const key of ['nodes','characters','world','connections','archive','timeline','readingOrder','readingSequence','drafts'])p[key]=[];p.plots=[];p.source=null;return w}
 function assemble(p,sample,stage){
  sample=teachingSample(sample);
  const early=['defection','mission-question','loyalty','drop','sokolov-rescue','bridge','nuclear-launch'];
  const omit=['inquiry','escort','flowers-scene','aircraft-duel','award','call'];
  const archivedNodes=new Set(p.archive.flatMap(a=>a.nodes||[]).map(n=>n.id));
  const archivedItems=new Set(p.archive.map(a=>a.item?.id).filter(Boolean));
  const archivedChanges=new Set(p.archive.flatMap(a=>a.changes||a.item?.changes||[]).map(x=>(x.change||x).id));
  const rank=new Map(sample.nodes.map((n,i)=>[n.id,i]));
  const added=new Set();
  function insert(n){
   if(p.nodes.some(x=>x.id===n.id)||archivedNodes.has(n.id))return;
   if(n.parentId&&!p.nodes.some(x=>x.id===n.parentId))return;
   const next=p.nodes.find(x=>x.parentId===n.parentId&&rank.has(x.id)&&rank.get(x.id)>rank.get(n.id));
   const fresh={...copy(n),cast:[],worldIds:[]};
   if(next)p.nodes.splice(p.nodes.indexOf(next),0,fresh);else p.nodes.push(fresh);
   added.add(n.id);
  }
  if(stage==='finalfight'){
   const n=sample.nodes.find(n=>n.id==='flowers-scene');
   if(!p.nodes.some(x=>x.id===n.id)&&!archivedNodes.has(n.id)&&p.nodes.some(x=>x.id===n.parentId)){
    const escort=p.nodes.findIndex(x=>x.id==='escort');p.nodes.splice(escort<0?p.nodes.length:escort,0,copy(n));
   }
   return p;
  }
  const wanted=new Set(stage==='bridge'?early:stage==='orders'?[...early,'jungle','crisis']:stage==='middle'?sample.nodes.filter(n=>!omit.includes(n.id)).map(n=>n.id):sample.nodes.map(n=>n.id));
  // Add missing sample pieces without sorting or rewriting existing learner pieces.
  for(const n of sample.nodes)if(wanted.has(n.id))insert(n);
  const full=stage==='middle'||stage==='complete';
  for(const c of sample.characters.filter(c=>full||['snake','boss'].includes(c.id))){
   if(archivedItems.has(c.id))continue;
   let existing=p.characters.find(x=>x.id===c.id);
   if(!existing){existing={...copy(c),changes:[]};p.characters.push(existing);}
   else{for(const b of c.blocks)if(!existing.blocks.some(x=>x.id===b.id)&&!archivedItems.has(b.id))existing.blocks.push(copy(b));
    // An intentionally removed portrait/reference stays removed.
    if(existing.portrait===undefined)existing.portrait=c.portrait;
    if(existing.references===undefined)existing.references=copy(c.references||[]);
   }
   if(full)for(const x of c.changes)if(p.nodes.some(n=>n.id===x.at.split(':')[0])&&!archivedItems.has(x.blockId)&&!archivedChanges.has(x.id)&&!existing.changes.some(y=>y.id===x.id||(y.at===x.at&&y.blockId===x.blockId)))existing.changes.push(copy(x));
  }
  if(full)for(const key of ['world','connections'])for(const item of sample[key])if(!archivedItems.has(item.id)&&!p[key].some(x=>x.id===item.id))p[key].push(copy(item));
  for(const n of p.nodes){
   if(!added.has(n.id))continue;
   const s=sample.nodes.find(x=>x.id===n.id);
   for(const [key,list] of [['cast','characters'],['worldIds','world']])n[key]=s[key].filter(id=>p[list].some(x=>x.id===id));
  }
  return p;
 }
 return {starter,assemble,teachingSample};
})();
if(typeof module!=='undefined')module.exports=TutorialConstruction;
