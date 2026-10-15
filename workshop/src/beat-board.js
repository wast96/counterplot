/* Scenes own their plan and beat board; outline moments are references only. */
function sceneTarget(id){return (p().scenes||[]).find(s=>s.id===id);}
function sceneMomentName(m){const n=W.allNodes(p()).find(n=>n.id===m.nodeId);return n?(m.edge==='close'&&n.closingTitle||name(n)):m.title||'Removed piece';}
function sceneMomentKind(m){const n=W.allNodes(p()).find(n=>n.id===m.nodeId);return n?.type==='B'?'Beat':m.edge==='close'?'Thread closing':'Thread opening';}
function beatBoardView(){
 W.normalizeScenes(p());const scenes=p().scenes;
 const head=heading('THE STORY WORKBENCH','Scene constructor','Plan a scene, choose the story moments it carries, then build its beat board.',btn('scene-new','Start a scene','plus',true)+'<button class="btn scene-board-jump" data-action="scene-board-focus">Go to beat board</button>');
 if(!scenes.length)return head+empty('Start with a scene.','Write what the scene is about before deciding which thread openings, closings, and beats it includes.',btn('scene-new','Start your first scene','plus',true),'outline');
 const c=sceneTarget(ui.sceneId)||scenes[0];ui.sceneId=c.id;const cards=c.beats,attrs=`data-id="${c.id}"`;
 const endpoint=(key,label,hint)=>`<li class="scene-card scene-card-endpoint" data-board-endpoint="${key}"><label for="board-${key}"><span class="eyebrow">${key==='entry'?'START HERE':'ARRIVE HERE'}</span><strong>${label}</strong></label><textarea id="board-${key}" data-inline="board" ${attrs} data-field="${key}" aria-label="${label}" placeholder="${hint}">${esc(c[key])}</textarea></li>`;
 const card=(beat,i)=>`<li class="scene-card" data-board-index="${i}"><header><button type="button" class="grip" draggable="true" data-board-drag="${i}" ${attrs} aria-label="Drag beat ${i+1}" title="Drag to reorder · Alt + arrow keys also move this card">⠿</button><label for="board-card-${i}">Beat ${String(i+1).padStart(2,'0')}</label>${ib('board-remove',c.id,'archive','Archive beat '+(i+1),`data-index="${i}"`)}</header><textarea id="board-card-${i}" data-inline="board" ${attrs} data-field="beats" data-index="${i}" aria-label="Beat ${i+1} title" placeholder="An action, a discovery, a reaction…">${esc(beat.title)}</textarea><label class="scene-beat-writeup">Writeup<textarea data-inline="board" ${attrs} data-field="writeup" data-index="${i}" aria-label="Beat ${i+1} writeup" placeholder="Develop this beat: what happens, what it means, and how it plays out…">${esc(beat.writeup)}</textarea></label><footer>${ib('board-move',c.id,'up','Move beat '+(i+1)+' earlier',`data-index="${i}" data-direction="-1"${i===0?' disabled':''}`)}${ib('board-move',c.id,'down','Move beat '+(i+1)+' later',`data-index="${i}" data-direction="1"${i===cards.length-1?' disabled':''}`)}<button type="button" class="text-btn" ${act('board-add',c.id,`data-index="${i+1}"`)}>Add after</button></footer></li>`;
 return head+`<section class="beat-board-layout" aria-label="Scene constructor"><nav class="scene-list moment-navigation" aria-label="Scenes">${scenes.map(s=>`<button class="${s.id===c.id?'active':''}" ${act('scene-select',s.id)} ${s.id===c.id?'aria-current="true"':''}>${esc(s.title||'Untitled scene')}<small>${s.moments.length} included story moments</small></button>`).join('')}</nav><article class="beat-board" data-scene-id="${c.id}"><header class="beat-board-heading"><label class="scene-title-label">Scene title<textarea rows="1" class="draft-title" data-inline="board" ${attrs} data-field="title" placeholder="Name this scene…" aria-label="Scene title" maxlength="1000">${esc(c.title)}</textarea></label>${ib('scene-remove',c.id,'archive','Archive scene')}</header><label class="field scene-abstract"><span>Scene plan</span><textarea data-inline="board" ${attrs} data-field="plan" aria-label="Scene plan" placeholder="What is this scene about? Describe its purpose, situation, tension, and what changes. You can work out the individual beats later.">${esc(c.plan)}</textarea></label><section class="scene-includes" aria-label="Included story moments"><div class="section-head"><h3>What this scene incorporates</h3>${btn('scene-moments','Choose story moments','plus',false,attrs)}</div>${c.moments.length?`<ul>${c.moments.map(m=>`<li><span><small>${sceneMomentKind(m)}</small><strong>${esc(sceneMomentName(m))}</strong></span>${p().nodes.some(n=>n.id===m.nodeId)?btn('refine-node','Refine this piece','edit',false,`data-id="${m.nodeId}" data-edge="${m.edge}"`):'<small>Archived or removed piece</small>'}</li>`).join('')}</ul>`:'<p class="help">Add thread openings, thread closings, and beats whenever you are ready.</p>'}</section><div class="beat-board-tools" tabindex="-1"><h3>Beat board</h3><span>${cards.length} ${cards.length===1?'beat':'beats'}</span>${btn('board-add','Add beat','plus',true,attrs)}</div><p class="board-help">Read left to right, then down. Give each beat a title and writeup. Drag a handle or use the arrows to rearrange it.</p><ol class="scene-card-grid" aria-label="Scene from beginning to end">${endpoint('entry','Beginning of scene','Where are we, and what is true before anything happens?')}${cards.map(card).join('')}${!cards.length?`<li class="board-empty"><p>Build the beats when you are ready.</p>${btn('board-add','Add the first beat','plus',false,attrs)}</li>`:''}${endpoint('exit','End of scene','What is different by the end of this scene?')}</ol><div class="board-bottom-tools">${btn('board-add','Add another beat','plus',false,attrs)}</div><p class="sr-only" role="status" id="board-announcement"></p></article></section>`;
}
actions['scene-new']=()=>{if(mutate('Started a scene',()=>{const s=W.scene();p().scenes.push(s);ui.sceneId=s.id;ui.mode='board';},{notify:false}))$('.beat-board [data-field=title]')?.focus();};
actions['scene-select']=el=>{finishEdit();ui.sceneId=el.dataset.id;render();};
actions['scene-remove']=el=>mutate('Scene kept in Archive',()=>{W.archiveScene(p(),el.dataset.id);ui.sceneId='';});
actions['scene-moments']=el=>{
 const c=sceneTarget(el.dataset.id);if(!c)return;const included=new Set(c.moments.map(m=>m.nodeId+':'+m.edge));
 const options=W.readingMoments(p()).map(e=>({nodeId:e.node.id,edge:e.edge,title:e.edge==='close'&&e.node.closingTitle||name(e.node)}));
 for(const m of c.moments)if(!options.some(x=>x.nodeId===m.nodeId&&x.edge===m.edge))options.push(m);
 modalData={kind:'scene-moments',id:c.id,options};
 dialog('BUILD A SCENE','What does this scene incorporate?',`<p class="help">Choose any combination of thread openings, closings, and beats. Their order in your outline stays the same.</p><div class="scene-moment-picker">${options.map(m=>`<label class="check-chip"><input type="checkbox" name="moments" value="${m.nodeId}:${m.edge}" ${included.has(m.nodeId+':'+m.edge)?'checked':''}><span><small>${sceneMomentKind(m)}</small>${esc(sceneMomentName(m))}</span></label>`).join('')||'<p>Add a thread or beat in Outline when you are ready. You can plan this scene first.</p>'}</div>`,submit('Keep story moments'),'scene-moments');
};
const beforeSceneSubmit=extraSubmit;extraSubmit=function(form,data,m){if(form.dataset.form!=='scene-moments')return beforeSceneSubmit(form,data,m);const selected=new Set(data.getAll('moments'));if(mutate('Updated scene story moments',()=>{sceneTarget(m.id).moments=m.options.filter(x=>selected.has(x.nodeId+':'+x.edge));}))closeDialog();return true;};
actions['board-node']=el=>{
 finishEdit();const n=node(el.dataset.id);if(!n)return;const edge=el.dataset.edge||'open';
 const matches=p().scenes.filter(s=>s.moments.some(m=>m.nodeId===n.id&&m.edge===edge));
 const scene=matches.find(s=>s.id===ui.sceneId)||(matches.length===1?matches[0]:null);
 if(scene){ui.mode='board';ui.focus=false;ui.detailsOpen=false;ui.sceneId=scene.id;render();return;}
 modalData={kind:'scene-for-moment',id:n.id,edge};
 dialog('SCENE CONSTRUCTOR','Choose a scene',`<p class="help">Include ${esc(edge==='close'&&n.closingTitle||name(n))} in a scene.</p>${select('Scene','scene',[['new','Start a new scene'],...p().scenes.map(s=>[s.id,s.title||'Untitled scene'])],'new')}`,submit('Include in scene'),'scene-for-moment');
};
const beforeSceneLinkSubmit=extraSubmit;extraSubmit=function(form,data,m){if(form.dataset.form!=='scene-for-moment')return beforeSceneLinkSubmit(form,data,m);if(mutate('Included story moment in scene',()=>{let s=sceneTarget(String(data.get('scene')));if(!s){s=W.scene();p().scenes.push(s);}const n=node(m.id);if(!s.moments.some(x=>x.nodeId===n.id&&x.edge===m.edge))s.moments.push({nodeId:n.id,edge:m.edge,title:m.edge==='close'&&n.closingTitle||name(n)});ui.sceneId=s.id;ui.mode='board';}))closeDialog();return true;};
const beforeBoardInline=inlineUpdate;
inlineUpdate=function(el){
 if(el.dataset.inline!=='board')return beforeBoardInline(el);
 const c=sceneTarget(el.dataset.id);if(!c)return;
 if(!editBefore){editBefore=W.copy(workspace);editLabel='Edited scene';}
 if(el.dataset.field==='beats')c.beats[Number(el.dataset.index)].title=el.value;
 else if(el.dataset.field==='writeup')c.beats[Number(el.dataset.index)].writeup=el.value;
 else c[el.dataset.field]=el.value;
 if(el.dataset.field==='title'){const button=$(`[data-action="scene-select"][data-id="${c.id}"]`);if(button)button.firstChild.textContent=el.value||'Untitled scene';}
 fit(el);const status=$('#save-status');if(status)status.textContent='Saving on this device…';clearTimeout(saveTimer);saveTimer=setTimeout(save,250);
};
function boardFocus(index,message){
 const target=index===null?$('#board-entry'):$(`#board-card-${index}`);target?.focus({preventScroll:true});target?.closest('.scene-card')?.scrollIntoView({block:'nearest',inline:'nearest'});
 const live=$('#board-announcement');if(live)live.textContent=message;
}
actions['board-add']=el=>{
 const c=sceneTarget(el.dataset.id,el.dataset.edge),index=el.dataset.index===undefined?(c.beats||[]).length:Number(el.dataset.index);
 if(mutate('Added scene beat',()=>{const target=sceneTarget(el.dataset.id,el.dataset.edge,true);(target.beats||=[]).splice(index,0,{id:W.uid(),title:'',writeup:''});},{notify:false}))boardFocus(index,'Added beat '+(index+1));
};
actions['board-remove']=el=>{
 const index=Number(el.dataset.index);
 if(mutate('Beat kept in Archive',()=>W.archiveSceneBeat(p(),el.dataset.id,index))){const length=sceneTarget(el.dataset.id,el.dataset.edge).beats.length;boardFocus(length?Math.min(index,length-1):null,'Beat '+(index+1)+' kept in Archive. Undo restores it.');}
};
function moveBoardCard(id,edge,from,to,focusHandle=false){
 const c=sceneTarget(id,edge),length=c?.beats?.length||0;
 if(from===to||from<0||from>=length||to<0||to>=length)return;
 if(mutate('Moved scene beat',()=>{const cards=sceneTarget(id,edge,true).beats;cards.splice(to,0,cards.splice(from,1)[0]);},{notify:false})){
  boardFocus(to,'Moved beat '+(from+1)+' to position '+(to+1));
  if(focusHandle)$(`[data-board-drag="${to}"]`)?.focus({preventScroll:true});
 }
}
actions['board-move']=el=>moveBoardCard(el.dataset.id,el.dataset.edge,Number(el.dataset.index),Number(el.dataset.index)+Number(el.dataset.direction));
document.addEventListener('keydown',e=>{
 const grip=e.target.closest?.('[data-board-drag]');if(!grip||!e.altKey||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;
 e.preventDefault();const index=Number(grip.dataset.boardDrag);moveBoardCard(grip.dataset.id,grip.dataset.edge,index,index+(['ArrowUp','ArrowLeft'].includes(e.key)?-1:1),true);
});
let boardDrag=null;
function boardDropIndex(target){const card=target.closest?.('[data-board-index]');return card?Number(card.dataset.boardIndex):target.closest?.('[data-board-endpoint="entry"]')?0:target.closest?.('[data-board-endpoint="exit"]')?(sceneTarget(boardDrag.id,boardDrag.edge)?.beats?.length||1)-1:null;}
function clearBoardDrag(){boardDrag=null;$$('.board-landing').forEach(el=>el.classList.remove('board-landing'));}
document.addEventListener('dragstart',e=>{
 const grip=e.target.closest?.('[data-board-drag]');if(!grip)return;finishEdit();boardDrag={id:grip.dataset.id,edge:grip.dataset.edge,index:Number(grip.dataset.boardDrag)};e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','Counterplot scene moment');
});
document.addEventListener('dragover',e=>{
 if(!boardDrag||boardDropIndex(e.target)===null)return;e.preventDefault();e.dataTransfer.dropEffect='move';$$('.board-landing').forEach(el=>el.classList.remove('board-landing'));e.target.closest('.scene-card')?.classList.add('board-landing');
});
document.addEventListener('dragleave',e=>{const card=e.target.closest?.('.scene-card');if(card&&!card.contains(e.relatedTarget))card.classList.remove('board-landing');});
document.addEventListener('drop',e=>{
 if(!boardDrag)return;const to=boardDropIndex(e.target),d=boardDrag;clearBoardDrag();if(to===null)return;e.preventDefault();moveBoardCard(d.id,d.edge,d.index,to);
});
document.addEventListener('dragend',clearBoardDrag);

actions['scene-board-focus']=()=>{const board=$('.beat-board-tools');if(board){board.focus({preventScroll:true});board.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}};
