/* Teaching operations act only on a marked practice project, never on the main workspace. */
function renameTutorialEntity(pr,entity,from,to,cid){
 return W.rekeyEntity(pr,entity,from,to,cid);
}
window.CounterplotTutorial={
 snapshot:()=>W.copy(workspace),
 activeId:()=>workspace.active,
 studioView(view){
  if(!window.__COUNTERPLOT_STUDIO__)return false;
  if(!['outline','write','characters','arc','world','connections','archive'].includes(view))return false;
  closeSessionDialogs();ui.page=['outline','write'].includes(view)?'outline':view==='arc'?'characters':view;ui.mode=view==='write'?'write':'outline';if(view==='arc')ui.characterTab='arc';else if(view==='characters')ui.characterTab='blocks';ui.character||=p().characters[0]?.id||'';ui.inspectorMode='hidden';ui.detailsOpen=false;render();return true;
 },
 status:()=>({blocked,undo:past.length,redo:future.length,page:ui.page,mode:ui.mode,character:ui.character}),
 flushEdits(){finishEdit();return save();},
 captureForm:()=>captureDialog(),
 editorView:()=>({...ui,folded:[...ui.folded],viewport:{x:scrollX,y:scrollY},scrollers:['.sidebar','.cast-dock','.time-strip'].map(selector=>{const el=document.querySelector(selector);return {selector,x:el?.scrollLeft||0,y:el?.scrollTop||0};})}),
 restoreEditorView(view){
  if(!window.__COUNTERPLOT_STUDIO__)return;
  const {viewport,scrollers,...state}=view;Object.assign(ui,state,{folded:new Set(state.folded||[])});render();
  const restore=()=>{if(viewport)window.scrollTo({left:viewport.x||0,top:viewport.y||0,behavior:'instant'});for(const item of scrollers||[]){const el=document.querySelector(item.selector);if(el)el.scrollTo({left:item.x||0,top:item.y||0,behavior:'instant'});}};
  restore();requestAnimationFrame(restore);
 },
 restoreForm:draft=>restoreDialog(draft),
 actionNames:()=>Object.keys(actions),
 redraw:()=>render(),
 adopt(entity,from,to,cid=''){
  if(!CounterplotSession.isPractice())return false;
  finishEdit();const before=W.copy(workspace),oldPast=W.copy(past),oldFuture=W.copy(future);
  try{
   const pr=p(),list=entity==='node'?pr.nodes:entity==='character'?pr.characters:entity==='block'?person(cid)?.blocks:entity==='world'?pr.world:pr.connections;
   if(!list)throw Error('The target collection is missing.');if(list.some(x=>x.id===to))return true;
   if(!list.some(x=>x.id===from))throw Error('The new piece is missing.');
   // A learner may archive a previous attempt and drag a replacement. Reserve a
   // fresh identity for that old attempt; never delete it, restore it unasked, or
   // silently make its links/timed changes point at the new attempt instead.
   const archivedId=W.uid(),rekeyed=renameTutorialEntity(pr,entity,to,archivedId,cid);
   if(rekeyed)for(const entry of [...past,...future]){
    const old=entry.data.projects.find(x=>x.id===workspace.active);
    if(old)renameTutorialEntity(old,entity,to,archivedId,cid);
   }
   renameTutorialEntity(pr,entity,from,to,cid);
   if(pr.tutorialRemoved)pr.tutorialRemoved=pr.tutorialRemoved.filter(id=>id!==to);
   // Internal IDs are not separate user edits. Keep historical snapshots consistent too.
   for(const entry of [...past,...future]){const old=entry.data.projects.find(x=>x.id===workspace.active);if(old&&renameTutorialEntity(old,entity,from,to,cid)&&old.tutorialRemoved)old.tutorialRemoved=old.tutorialRemoved.filter(id=>id!==to);}
   if(ui.selected===from)ui.selected=to;if(ui.character===from)ui.character=to;if(ui.snap===from)ui.snap=to;
   if(ui.folded.delete(from))ui.folded.add(to);
   W.validate(workspace);const okay=save();render();return okay;
  }catch(e){workspace=before;past=oldPast;future=oldFuture;toast(e.message);return false;}
 },
 applyStoryEdits(goal,phase){
  const ops=goal.storyEdits?.[phase];if(!CounterplotSession.isPractice()||!ops?.length)return false;
  const key=goal.id+':'+phase;
  if((p().tutorialSceneEdits||[]).includes(key))return false;
  const okay=mutate('Applied authored story edits',pr=>{
   const result=TutorialStoryEdits.apply(pr,ops);for(const k of Object.keys(pr))if(!Object.hasOwn(result.project,k))delete pr[k];Object.assign(pr,result.project);
   (pr.tutorialSceneEdits||=[]).push(key);
  },{rerender:false,notify:false});
  if(!okay||blocked)throw Error('These authored story changes could not be applied safely. Your current story has been kept.');
  return true;
 },
 applyAssemblies(definition,ids=[]){
  if(!CounterplotSession.isPractice())return [];
  const specs=ids.map(id=>definition.assemblies.find(a=>a.id===id));if(specs.some(a=>!a))throw Error('This action names an assembly that is not in the tutorial.');
  const pending=specs.filter(a=>!(p().tutorialAssemblies||[]).includes(a.id));if(!pending.length)return [];
  const added=[];const okay=mutate('Added '+pending.map(a=>a.title).join(', '),pr=>{for(const spec of pending){added.push(...TutorialEffects.apply(pr,definition.sample,spec));(pr.tutorialAssemblies||=[]).push(spec.id);}},{rerender:false,notify:false});
  if(!okay||blocked)throw Error('The next story section could not be saved. Your existing work has been kept.');return [...new Set(added)];
 },
 animateAdded(ids,presentation){
  if(!ids.length||matchMedia('(prefers-reduced-motion: reduce)').matches||!presentation.motion.insertion)return;
  requestAnimationFrame(()=>{let index=0;for(const el of document.querySelectorAll('[data-node],[data-block],[data-paint-id]')){const id=el.dataset.node||el.dataset.block||el.dataset.paintId;if(ids.includes(id)&&el.getBoundingClientRect().width){el.animate([{opacity:.25,transform:'translateY(5px)'},{opacity:1,transform:'none'}],{duration:presentation.motion.insertion,delay:Math.min(index++*presentation.motion.stagger,600),easing:presentation.motion.easing});}}});
 },
 prepare(goal,definition){
  const sample=definition.sample;
  if(!CounterplotSession.isPractice())throw Error('Return to a tutorial practice project to run this action.');
  const t=goal.setup||{},changesView=!!(t.page||t.character||t.piece||t.reveal||t.action||t.reference||goal.enterAssemblies?.length);
  if(changesView && $('#dialog').open){
   if(editorIsDirty())throw Error('Save or close the open editor first. Its unsaved text has been kept.');
   closeSessionDialogs();
  }
  finishEdit();
  const added=this.applyAssemblies(definition,goal.enterAssemblies);
  const storyEdited=this.applyStoryEdits(goal,'enter');
  const id=t.piece||t.reveal||(goal.check.kind==='create'&&goal.check.entity==='node'?goal.check.parent:'');
  if(id&&!node(id))throw Error('“'+(sample.nodes.find(n=>n.id===id)?.title||id)+'” is missing. Restore it from Archive, then resume this action.');
  let changed=false;
  if(t.character){
   if(!person(t.character))throw Error('The character is missing. Restore it from Archive, then resume.');
   if(ui.page!=='characters'||ui.character!==t.character){ui.at='';changed=true;}
   ui.page='characters';ui.character=t.character;ui.characterTab='blocks';
  } else if(id||t.page){
   const page=t.page||'outline';changed=ui.page!==page;ui.page=page;
   if(id){const simple=/data-inline|quick-piece|select-node/.test(goal.focus);const inspector=simple?'hidden':ui.inspectorMode;changed ||= ui.mode!=='outline'||ui.plot!==''||ui.selected!==id||ui.inspectorMode!==inspector||ui.detailsOpen;ui.mode='outline';ui.plot='';ui.selected=id;ui.inspectorMode=inspector;ui.detailsOpen=false;let n=node(id);while(n){changed=ui.folded.delete(n.id)||changed;n=node(n.parentId);}}
  }
  if(t.write){ui.mode='write';changed=true;}
  if(t.mode){ui.mode=t.mode;changed=true;}if(t.at){ui.at=t.at;changed=true;}if(t.inspector){ui.inspectorMode=t.inspector;changed=true;}
  // A mobile piece sheet must not trap the next toolbar/page action below it.
  // Keep it only when this step deliberately targets something inside the sheet.
  const sheet=$('#details-sheet');
  if(changesView&&sheet?.open){
   let targets=[];try{targets=$$(goal.focus);}catch{}
   const inSheet=targets.some(e=>sheet.contains(e));
   if(!inSheet){sheet.dataset.sessionSuspended='yes';sheet.close();ui.detailsOpen=false;document.body.classList.remove('details-sheet-open');changed=true;}
  }
  if(changed||added.length||storyEdited)render();
  // Open the mobile inspector only when the actual target lives inside it.
  if(id && !document.querySelector('dialog[open]')){
   let targets=[];try{targets=$$(goal.focus);}catch{}
   if(targets.length && targets.every(e=>!e.getBoundingClientRect().width) && targets.some(e=>e.closest('.inspector'))){ui.inspectorMode='side';ui.detailsOpen=matchMedia('(max-width:680px)').matches;render();}
  }
  if(goal.check.kind==='restored'&&goal.focus.includes('"undo"'))this.practiceHistory(goal.check.id,false);
  if(goal.check.kind==='archived'&&goal.focus.includes('"redo"'))this.practiceHistory(goal.check.id,true);
  if(t.action==='new-swatch'){if(!paintOpen){paintOpen=true;render();}paletteManager();}
  if(t.action==='new-plot')managePlots();
  if(t.action){const el=document.createElement('button');el.dataset.id=t.id||'';if(t.cid)el.dataset.cid=t.cid;if(t.owner)el.dataset.owner=t.owner;if(!actions[t.action])throw Error('Unknown tutorial setup action: '+t.action);actions[t.action](el);}
  if(t.reference){references('node',t.piece);editReference('node',t.piece);}
  this.animateAdded(added,TutorialDefinition.presentation(definition,definition.lessons.find(l=>l.goals.includes(goal)),goal));return true;
 },
 settle(){if(!CounterplotSession.isPractice())return false;finishEdit();return save();},
 reveal(id,{details=false}={}){
  if(!CounterplotSession.isPractice()||!node(id))return false;
  finishEdit();let changed=ui.page!=='outline'||ui.mode!=='outline'||ui.plot!==''||ui.selected!==id||ui.inspectorMode!=='side'||ui.detailsOpen!==details;
  ui.page='outline';ui.mode='outline';ui.plot='';ui.selected=id;ui.inspectorMode='side';ui.detailsOpen=details;
  let n=node(id);while(n){if(ui.folded.has(n.id)){ui.folded.delete(n.id);changed=true;}n=node(n.parentId);}if(changed)render();return true;
 },
 fillNode(id,values){
  if(!CounterplotSession.isPractice())return false;const n=node(id);if(!n)return false;
  const changes=Object.entries(values).filter(([key,value])=>(!n[key]||(key==='status'&&n[key]==='open'))&&n[key]!==value);
  if(!changes.length)return this.settle();
  return mutate('Inserted tutorial sample',()=>{for(const [key,value]of changes)n[key]=value;},{rerender:false,notify:false})&&!blocked;
 },
 goArchive(){if(editorIsDirty())return false;closeSessionDialogs();navigate('archive');return true;},
 practiceHistory(id,redo=false){
  if(!CounterplotSession.isPractice())return false;if(redo?future.length:past.length)return true;
  const snapshot=W.copy(workspace),pr=snapshot.projects.find(x=>x.id===snapshot.active);
  try{
   if(redo){if(!pr.nodes.some(n=>n.id===id))return false;W.archiveNode(pr,id);}
   else{const a=pr.archive.find(a=>a.nodes?.some(n=>n.id===id));if(!a)return false;W.restore(pr,a.id);}
   W.validate(snapshot);(redo?future:past).push({data:snapshot,label:'Archived tutorial practice beat'});updateUndo();return true;
  }catch{return false;}
 }
};
