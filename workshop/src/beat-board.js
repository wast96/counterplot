/* Each manuscript moment owns its scene cards. Entry/exit/beats also travel in
   existing backups, variations, archived pieces and portable HTML copies. */
function beatBoardView(){
 const moments=visibleWritingMoments();
 const head=heading('THE STORY WORKBENCH','Beat board','Start with where the scene begins. Build the small moments that bring it to its end.',btn('new-piece','Add a piece','plus'))+plotToolbar();
 if(!moments.length)return head+empty('No scenes in this view.','Add a thread or beat, or clear your filters, to start a board.','','outline');
 const e=selectedWritingMoment(moments),n=e.node,c=refineTarget(n.id,e.edge),cards=c.beats||[],attrs=`data-id="${n.id}" data-edge="${e.edge}"`;
 const endpoint=(key,label,hint)=>`<li class="scene-card scene-card-endpoint" data-board-endpoint="${key}"><label for="board-${key}"><span class="eyebrow">${key==='entry'?'START HERE':'ARRIVE HERE'}</span><strong>${label}</strong></label><textarea id="board-${key}" data-inline="board" ${attrs} data-field="${key}" aria-label="${label}" placeholder="${hint}">${esc(c[key]||'')}</textarea><small>${key==='entry'?'Before the first small moment':'After the last small moment'}</small></li>`;
 const card=(text,i)=>`<li class="scene-card" data-board-index="${i}"><header><button type="button" class="grip" draggable="true" data-board-drag="${i}" ${attrs} aria-label="Drag moment ${i+1}" title="Drag to reorder · Alt + arrow keys also move this card">⠿</button><label for="board-card-${i}">Moment ${String(i+1).padStart(2,'0')}</label>${ib('board-remove',n.id,'close','Remove moment '+(i+1),`data-edge="${e.edge}" data-index="${i}"`)}</header><textarea id="board-card-${i}" data-inline="board" ${attrs} data-field="beats" data-index="${i}" aria-label="Moment ${i+1}" placeholder="An action, a discovery, a reaction…">${esc(text)}</textarea><footer>${ib('board-move',n.id,'up','Move moment '+(i+1)+' earlier',`data-edge="${e.edge}" data-index="${i}" data-direction="-1"${i===0?' disabled':''}`)}${ib('board-move',n.id,'down','Move moment '+(i+1)+' later',`data-edge="${e.edge}" data-index="${i}" data-direction="1"${i===cards.length-1?' disabled':''}`)}<button type="button" class="text-btn" ${act('board-add',n.id,`data-edge="${e.edge}" data-index="${i+1}"`)}>Add after</button></footer></li>`;
 return head+`<section class="beat-board-layout" aria-label="Scene beat boards">${momentNavigation(moments,e,'board-node')}<article class="beat-board" data-board-moment="${esc(e.key)}"><header class="beat-board-heading"><div><div class="eyebrow">${esc(W.TYPES[n.type].name)} · ${momentLabel(e)}</div><h2>${esc(name(n))}</h2></div>${btn('refine-node','Refine this scene','edit',false,attrs)}</header><div class="beat-board-tools">${momentSwitcher(e,'board-node')}<span>${cards.length} small ${cards.length===1?'moment':'moments'}</span>${btn('board-add','Add moment','plus',true,attrs)}</div>${(e.edge==='close'?n.closing:n.opening)?`<details class="board-scene-plan"><summary>Scene plan</summary><p>${esc(e.edge==='close'?n.closing:n.opening)}</p></details>`:''}<p class="board-help">Read left to right, then down. Drag a handle or use the arrow buttons to rearrange moments. Everything saves as you go.</p><ol class="scene-card-grid" aria-label="Scene from beginning to end">${endpoint('entry','Beginning of scene','Where are we, and what is true before anything happens?')}${cards.map(card).join('')}${!cards.length?`<li class="board-empty"><p>How do we get from here to there?</p>${btn('board-add','Add the first moment','plus',false,attrs)}</li>`:''}${endpoint('exit','End of scene','What is different by the end of this scene?')}</ol><div class="board-bottom-tools">${btn('board-add',cards.length?'Add another moment':'Add moment','plus',false,attrs)}</div><p class="sr-only" role="status" id="board-announcement"></p></article></section>`;
}
actions['board-node']=el=>{
 finishEdit();const n=node(el.dataset.id);if(!n)return;
 ui.selected=n.id;ui.writeEdge=el.dataset.edge||'open';ui.mode='board';ui.focus=false;ui.detailsOpen=false;
 if(!visibleNodes().some(x=>x.id===n.id)){branchFocus='';storyFilter='';onlyReview=false;ui.plot='';}
 render();$('.beat-board h2')?.setAttribute('tabindex','-1');$('.beat-board h2')?.focus({preventScroll:true});
};
const beforeBoardInline=inlineUpdate;
inlineUpdate=function(el){
 if(el.dataset.inline!=='board')return beforeBoardInline(el);
 if(!node(el.dataset.id))return;
 if(!editBefore){editBefore=W.copy(workspace);editLabel='Edited scene card';}
 const c=refineTarget(el.dataset.id,el.dataset.edge,true);
 if(el.dataset.field==='beats')c.beats[Number(el.dataset.index)]=el.value;else c[el.dataset.field]=el.value;
 clearTimeout(saveTimer);saveTimer=setTimeout(save,250);
};
function boardFocus(index,message){
 const target=index===null?$('#board-entry'):$(`#board-card-${index}`);target?.focus({preventScroll:true});target?.closest('.scene-card')?.scrollIntoView({block:'nearest',inline:'nearest'});
 const live=$('#board-announcement');if(live)live.textContent=message;
}
actions['board-add']=el=>{
 const c=refineTarget(el.dataset.id,el.dataset.edge),index=el.dataset.index===undefined?(c.beats||[]).length:Number(el.dataset.index);
 if(mutate('Added scene moment',()=>{const target=refineTarget(el.dataset.id,el.dataset.edge,true);(target.beats||=[]).splice(index,0,'');},{notify:false}))boardFocus(index,'Added moment '+(index+1));
};
actions['board-remove']=el=>{
 const index=Number(el.dataset.index);
 if(mutate('Removed scene moment',()=>refineTarget(el.dataset.id,el.dataset.edge,true).beats.splice(index,1))){const length=refineTarget(el.dataset.id,el.dataset.edge).beats.length;boardFocus(length?Math.min(index,length-1):null,'Removed moment '+(index+1)+'. Undo restores it.');}
};
function moveBoardCard(id,edge,from,to,focusHandle=false){
 const c=refineTarget(id,edge),length=c?.beats?.length||0;
 if(from===to||from<0||from>=length||to<0||to>=length)return;
 if(mutate('Moved scene moment',()=>{const cards=refineTarget(id,edge,true).beats;cards.splice(to,0,cards.splice(from,1)[0]);},{notify:false})){
  boardFocus(to,'Moved moment '+(from+1)+' to position '+(to+1));
  if(focusHandle)$(`[data-board-drag="${to}"]`)?.focus({preventScroll:true});
 }
}
actions['board-move']=el=>moveBoardCard(el.dataset.id,el.dataset.edge,Number(el.dataset.index),Number(el.dataset.index)+Number(el.dataset.direction));
document.addEventListener('keydown',e=>{
 const grip=e.target.closest?.('[data-board-drag]');if(!grip||!e.altKey||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;
 e.preventDefault();const index=Number(grip.dataset.boardDrag);moveBoardCard(grip.dataset.id,grip.dataset.edge,index,index+(['ArrowUp','ArrowLeft'].includes(e.key)?-1:1),true);
});
let boardDrag=null;
function boardDropIndex(target){const card=target.closest?.('[data-board-index]');return card?Number(card.dataset.boardIndex):target.closest?.('[data-board-endpoint="entry"]')?0:target.closest?.('[data-board-endpoint="exit"]')?(refineTarget(boardDrag.id,boardDrag.edge)?.beats?.length||1)-1:null;}
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
