/* One application, isolated story/practice saves. Never swap a failed save away. */
const sessionCache = new Map();
let sessionSwitching = false, authoringSession = null;
function sessionToolbar(){
 if(sessionMode==='@author')return `<span class="sample-session-label">Tutorial sample · edits are isolated</span><button type="button" class="btn primary" data-tutorial="keep-sample">Keep sample & return</button><button type="button" class="btn" data-tutorial="discard-sample">Discard sample edits</button>`;
 const label=sessionMode?(tutorialDefinitionFor(sessionMode)?.title||'Tutorial'):'';
 return `<button type="button" class="btn tutorial-launch" data-tutorial="browse">Tutorials${label?' · '+esc(label):''}</button>${sessionMode?'<button type="button" class="btn" data-action="copy-to-my-work">Copy to My work</button><button type="button" class="btn tutorial-return" data-tutorial="leave">My work</button>':''}`;
}
function captureDialog(){
 const d=$('#dialog');if(!d.open)return null;
 const clone=d.cloneNode(true);clone.querySelectorAll('#tutorial-companion,#tutorial-spotlight').forEach(x=>x.remove());
 const originals=[...d.querySelectorAll('input,textarea,select')],copies=[...clone.querySelectorAll('input,textarea,select')];
 originals.forEach((el,i)=>{const x=copies[i];if(!x)return;if(el.tagName==='TEXTAREA')x.textContent=el.value;else if(el.tagName==='SELECT')[...x.options].forEach((o,j)=>o.toggleAttribute('selected',el.options[j].selected));else{if(el.type!=='file')x.setAttribute('value',el.value);x.toggleAttribute('checked',el.checked);}});
 // Store original defaults separately so a resumed unsaved editor still counts as dirty.
 return {html:clone.innerHTML, data:modalData, defaults:originals.map(el=>({value:el.defaultValue,checked:el.defaultChecked,options:el.options?[...el.options].map(o=>o.defaultSelected):null})), scroll:d.scrollTop};
}
function restoreDialog(draft){
 if(!draft)return;const d=$('#dialog');d.innerHTML=draft.html;modalData=draft.data;
 const values=[...d.querySelectorAll('input,textarea,select')].map(el=>({el,value:el.value,checked:el.checked,selected:el.options?[...el.options].map(o=>o.selected):null}));
 values.forEach(({el,value,checked,selected},i)=>{const def=draft.defaults[i];if(!def)return;if(el.tagName==='SELECT')[...el.options].forEach((o,j)=>{o.defaultSelected=def.options?.[j]||false;o.selected=selected[j];});else{if(el.type!=='file'){el.defaultValue=def.value;el.value=value;}el.defaultChecked=def.checked;el.checked=checked;}});
 d.showModal();d.scrollTop=draft.scroll;returnFocus=null;
}
function editorIsDirty(){
 const d=$('#dialog');if(!d.open||!d.querySelector('form'))return false;
 return [...d.querySelectorAll('input,textarea,select')].some(el=>el.tagName==='SELECT'?[...el.options].some(o=>o.selected!==o.defaultSelected):['checkbox','radio'].includes(el.type)?el.checked!==el.defaultChecked:el.type!=='file'&&el.value!==el.defaultValue);
}
function unsavedSessionDrafts(){return [...sessionCache].some(([mode,state])=>mode!==sessionMode&&state.draftDirty);}
function closeSessionDialogs(){
 const d=$('#dialog');if(d.open)d.close();modalData=null;
 const sheet=$('#details-sheet');if(sheet?.open){sheet.dataset.sessionSuspended='yes';sheet.close();}
 document.body.classList.remove('details-sheet-open');
}
function sessionState(){return {workspace,embedded,KEY,raw,lastSaved,blocked,workspaceSaveFailure,past,future,ui:{...ui,folded:new Set(ui.folded)},brush,paintOpen,firstStoryTip,draft:captureDialog(),draftDirty:editorIsDirty(),scroll:[scrollX,scrollY]};}
async function loadSession(mode){
 if(sessionCache.has(mode)){
  const cached=sessionCache.get(mode),current=await CounterplotTutorialStore.refresh(cached.KEY)||'';
  if(current!==cached.lastSaved)cached.blocked='This story changed in another window. Export this copy before reloading; neither copy has been overwritten.';
  return cached;
 }
 const seed=mode?W.copy(tutorialDefinitionFor(mode).starter):mainSeed?W.copy(mainSeed):null;
 if(mode)seed.saveKey=practiceKey(mode);
 const key=seed?.saveKey||MAIN_KEY,encoded=await CounterplotTutorialStore.refresh(key)||'';
 const data=encoded?W.validate(JSON.parse(encoded)):seed?W.validate(seed):exampleWorkspace();
 const active=data.projects.find(x=>x.id===data.active)||data.projects[0];
 return {workspace:data,embedded:seed,KEY:key,raw:encoded||null,lastSaved:encoded,blocked:'',workspaceSaveFailure:false,past:[],future:[],ui:{plot:'',detailsOpen:false,inspectorMode:mode?'hidden':'side',page:'outline',mode:'outline',selected:active.nodes[0]?.id||'',character:active.characters[0]?.id||'',at:'',characterTab:'blocks',folded:new Set(),focus:false,filter:'',snap:'',search:''},brush:'',paintOpen:false,firstStoryTip:false,draft:null,scroll:[0,0]};
}
window.CounterplotSession={
 mode:()=>sessionMode,
 mainKey:()=>MAIN_KEY,
 isPractice:()=>!!sessionMode&&sessionMode!=='@author'&&(p().tutorialId===sessionMode||(sessionMode==='mgs3'&&p().id==='mgs3-build-v1')),
 isAuthoring:()=>sessionMode==='@author',
 definition:()=>tutorialDefinitionFor(sessionMode||'mgs3'),
 title:()=>tutorialDefinitionFor(sessionMode)?.title||'Tutorial',
 editorIsDirty,
 closeCleanEditors(){if(editorIsDirty())return false;closeSessionDialogs();return true;},
 async switchTo(mode){
  if(sessionMode==='@author'){toast('Keep or discard the sample edits to return to your tutorial editor.');return false;}
  if(mode&&!tutorialDefinitionFor(mode))throw Error('That tutorial is not installed.');
  if(mode===sessionMode)return true;
  if(sessionSwitching){toast('Finishing the current workspace switch…');return false;}
  sessionSwitching=true;try{
  // Cancel an in-flight sample before committing inline edits or caching a dialog.
  document.dispatchEvent(new CustomEvent('counterplot:before-mode-change'));
  finishEdit();if(!await flushWorkspace()){document.dispatchEvent(new CustomEvent('counterplot:mode-change'));return false;}
  let next;try{next=await loadSession(mode);}catch(e){toast('Could not open the saved '+(mode?'tutorial':'workshop')+'. Its data was left unchanged. '+e.message);document.dispatchEvent(new CustomEvent('counterplot:mode-change'));return false;}
  sessionSwitching=true;
  sessionCache.set(sessionMode,sessionState());endDrag();closeSessionDialogs();clearTimeout(saveTimer);clearTimeout(toastTimer);$('#toast').classList.remove('visible');
  ({workspace,embedded,KEY,raw,lastSaved,blocked,workspaceSaveFailure,past,future,brush,paintOpen,firstStoryTip}=next);
  Object.assign(ui,next.ui,{folded:new Set(next.ui.folded)});editBefore=null;sessionMode=mode;
  try{await CounterplotTutorialStore.setItem(MODE_KEY,mode);}catch{}
  render();restoreDialog(next.draft);window.scrollTo({left:next.scroll[0],top:next.scroll[1],behavior:'instant'});
  sessionSwitching=false;if(!raw&&!blocked)save();document.dispatchEvent(new CustomEvent('counterplot:mode-change'));return true;
  }finally{sessionSwitching=false;}
 },
 async newPractice(mode=sessionMode&&sessionMode!=='@author'?sessionMode:'mgs3'){
  if(!await this.switchTo(mode))return false;
  if(editorIsDirty()){toast('Save or close the open editor before starting another practice run.');return false;}
  closeSessionDialogs();
  const definition=tutorialDefinitionFor(mode),fresh=W.copy(definition.starter.projects[0]);fresh.id=mode+'-practice-'+W.uid();fresh.tutorialId=mode;fresh.title=definition.title+' · Practice '+(workspace.projects.filter(x=>x.tutorialId===mode||x.id===mode+'-build-v1').length+1);
  const okay=mutate('Started a new tutorial practice run',()=>{workspace.projects.push(fresh);workspace.active=fresh.id;ui.page='outline';ui.mode='outline';ui.folded.clear();ui.at='';});
  if(okay)document.dispatchEvent(new CustomEvent('counterplot:practice-change'));return okay;
 },
 choosePractice(){
  const pr=workspace.projects.find(x=>x.tutorialId===sessionMode||x.id===sessionMode+'-build-v1');if(!pr)return this.newPractice();
  if(editorIsDirty()){toast('Save or close the editor before changing projects.');return false;}
  finishEdit();workspace.active=pr.id;past=[];future=[];ui.page='outline';ui.at='';closeSessionDialogs();save();render();document.dispatchEvent(new CustomEvent('counterplot:practice-change'));return true;
 },
 async beginAuthoring(sample,starter){
  if(authoringSession||sessionMode==='@author')return false;
  document.dispatchEvent(new CustomEvent('counterplot:before-mode-change'));
  finishEdit();if(!await flushWorkspace()){document.dispatchEvent(new CustomEvent('counterplot:mode-change'));return false;}
  const data=W.copy(starter);data.projects=[W.copy(sample)];data.active=sample.id;W.validate(data);
  authoringSession={mode:sessionMode,state:sessionState()};endDrag();closeSessionDialogs();clearTimeout(saveTimer);
  workspace=data;embedded=null;KEY='counterplot.authoring.transient';raw=null;lastSaved='';blocked='';workspaceSaveFailure=false;past=[];future=[];sessionMode='@author';brush='';paintOpen=false;firstStoryTip=false;editBefore=null;
  Object.assign(ui,{page:'outline',mode:'outline',plot:'',selected:sample.nodes[0]?.id||'',character:sample.characters[0]?.id||'',at:'',folded:new Set(),inspectorMode:'hidden',detailsOpen:false,focus:false,snap:''});
  render();scrollTo({top:0,behavior:'instant'});document.dispatchEvent(new CustomEvent('counterplot:mode-change'));return true;
 },
 endAuthoring(keep=true){
  if(!authoringSession)return null;
  if(keep&&editorIsDirty()){toast('Save or close this form before keeping the sample story.');return null;}
  finishEdit();const sample=W.copy(p()),swatches=W.copy(workspace.swatches||[]),hiddenSwatches=W.copy(workspace.hiddenSwatches||[]),previous=authoringSession;document.dispatchEvent(new CustomEvent('counterplot:before-mode-change'));endDrag();closeSessionDialogs();
  ({workspace,embedded,KEY,raw,lastSaved,blocked,workspaceSaveFailure,past,future,brush,paintOpen,firstStoryTip}=previous.state);
  Object.assign(ui,previous.state.ui,{folded:new Set(previous.state.ui.folded)});sessionMode=previous.mode;authoringSession=null;editBefore=null;
  render();restoreDialog(previous.state.draft);scrollTo({left:previous.state.scroll[0],top:previous.state.scroll[1],behavior:'instant'});
  document.dispatchEvent(new CustomEvent('counterplot:mode-change'));return {sample,swatches,hiddenSwatches};
 },
 commit(){return flushWorkspace();},
 saveStatus:()=>workspaceWriters.get(KEY)?.status()||{pending:false,dirty:false,error:null},
 retrySave:()=>retryWorkspaceSave(),
 copyToMyWork:copyToMyWork,
 redraw:()=>render()
};

function stripTutorial(pr){for(const key of Object.keys(pr))if(key.startsWith('tutorial'))delete pr[key];delete pr.shelfPlaceholder;return pr;}
let copyingToMyWork=false;
async function copyToMyWork(incoming=null){
 if(copyingToMyWork){toast('Saving the independent copy…');return false;}
 if(editorIsDirty()){toast('Save or cancel the open form before copying a story.');return false;}
 copyingToMyWork=true;
 try{
  finishEdit();
  if(!incoming)incoming={format:workspace.format,schema:workspace.schema,active:p().id,projects:[W.copy(p())],swatches:W.copy(workspace.swatches||[]),hiddenSwatches:W.copy(workspace.hiddenSwatches||[])};
  incoming=W.validate(W.copy(incoming));const source=incoming.projects.find(x=>x.id===incoming.active)||incoming.projects[0];
  const pr=stripTutorial(W.copy(source));pr.id=W.uid();pr.title=source.title.replace(/ · Practice \d+$/,'')+' · My copy';
  // The current main workspace may contain edits that have not hit disk yet.
  // Never rebuild it from an older cached snapshot while making a copy.
  if(!sessionMode&&!await flushWorkspace())return false;
  const target=sessionMode?await loadSession(''):sessionState();
  if(target.blocked||target.draftDirty){toast(target.draftDirty?'Save or cancel the unfinished form in My work before adding a copy.':'My work has a conflicting or failed save. Export that copy before retrying.');return false;}
  const next=W.copy(target.workspace),one={...incoming,projects:[pr],trash:[]};W.mergeSwatches(next,one);
  next.projects=next.projects.filter(x=>!W.shelfEmpty(x));next.projects.push(pr);next.active=pr.id;W.validate(next);
  const encoded=JSON.stringify(next);await CounterplotTutorialStore.setItem(target.KEY,encoded,target.lastSaved);
  target.workspace=next;target.lastSaved=encoded;target.raw=encoded;target.blocked='';target.workspaceSaveFailure=false;target.past=[];target.future=[];target.ui.page='outline';target.ui.mode='outline';target.ui.selected=pr.nodes[0]?.id||'';target.ui.at='';target.draft=null;target.draftDirty=false;sessionCache.set('',target);workspaceWriters.delete(target.KEY);
  if(!sessionMode){workspace=next;lastSaved=encoded;raw=encoded;blocked='';workspaceSaveFailure=false;Object.assign(ui,target.ui);past=[];future=[];render();}
  else if(!await CounterplotSession.switchTo('')){toast('The independent copy is saved on My work’s shelf. Export the current tab before leaving it.');return true;}
  toast('Copied to My work. Your tutorial and practice run are unchanged.');return true;
 }catch(e){toast('Could not save an independent copy: '+e.message+' Your source is unchanged; export a backup.');return false;}
 finally{copyingToMyWork=false;}
}
