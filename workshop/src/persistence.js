/* Work stays in memory until an asynchronous, compare-and-swap write commits.
 * Mode changes await flushWorkspace(); normal edits never wait on disk to render. */
const workspaceWriters=new Map();
function savedWriter(key=KEY){
 if(!workspaceWriters.has(key)){
  CounterplotTutorialStore.registerKey(key);
  const initial=key===KEY?lastSaved:([...sessionCache.values()].find(c=>c.KEY===key)?.lastSaved??(CounterplotTutorialStore.getItem(key)||''));
  workspaceWriters.set(key,TutorialStorage.writer(CounterplotTutorialStore,key,initial,state=>{
   const issue=state.error?(/another window|different saved|newer saved/i.test(state.error.message)?'This story changed in another window. Export this copy before reopening; neither copy has been overwritten.':'This workspace could not be saved. Your latest work is in this tab. Export a backup or retry saving.'):'';
   if(KEY===key&&sessionMode!=='@author'){
    lastSaved=state.acknowledged;raw=state.acknowledged||null;
    if(issue){blocked=issue;workspaceSaveFailure=true;}
    else if(workspaceSaveFailure){blocked='';workspaceSaveFailure=false;}
    saveBanner();
   }
   for(const cached of sessionCache.values())if(cached.KEY===key){cached.lastSaved=state.acknowledged;cached.raw=state.acknowledged||null;if(issue){cached.blocked=issue;cached.workspaceSaveFailure=true;}else if(cached.workspaceSaveFailure){cached.blocked='';cached.workspaceSaveFailure=false;}}
  }));
 }
 return workspaceWriters.get(key);
}
let workspaceSaveFailure=false,workspaceValidationFailure=false,localEditPending=false;
function save(){
 clearTimeout(saveTimer);localEditPending=false;
 if(sessionMode==='@author'){saveBanner();return true;}
 if(blocked&&!workspaceSaveFailure&&!workspaceValidationFailure){saveBanner();return false;}
 // A successful local write must also be a workspace that can be reopened.
 // Keep the last valid disk copy when an in-memory edit is invalid.
 try{W.validate(workspace);}catch(error){workspaceValidationFailure=true;blocked='This edit cannot be saved yet. '+error.message+' Shorten or correct the field, or export your open work. The previous saved copy is safe.';saveBanner();return false;}
 if(workspaceValidationFailure){workspaceValidationFailure=false;blocked='';}
 try{const ok=savedWriter().queue(JSON.stringify(workspace));saveBanner();return ok;}
 catch(e){blocked='Browser saving is unavailable. Keep this tab open and export a backup. '+e.message;workspaceSaveFailure=true;saveBanner();return false;}
}
async function flushWorkspace(){finishEdit();if(!save())return false;return sessionMode==='@author'||await savedWriter().flush();}
function workspacePending(){return [...workspaceWriters.values()].some(x=>x.status().pending||x.status().dirty);}
async function retryWorkspaceSave(){
 if(!workspaceSaveFailure){toast('Export this copy before reopening. The other saved copy has been kept.');return false;}
 if(!save())return false;const writer=savedWriter();const ok=await writer.retry();
 if(ok){blocked='';workspaceSaveFailure=false;saveBanner();toast('Saved on this device.');}return ok;
}
function localSaveStatusText(){
 if(blocked)return 'Not saved · needs attention';
 if(sessionMode==='@author')return 'Sample draft · return to editor to keep';
 if(window.__COUNTERPLOT_STUDIO__)return document.body.classList.contains('studio-playtest')?'Play only · return to Edit to keep authoring':'Story edits join the tutorial draft';
 const status=workspaceWriters.get(KEY)?.status();
 return localEditPending||status?.pending||status?.dirty?'Saving on this device…':'Saved on this device';
}
function saveBanner(){
 const el=$('#save-alert');if(!el)return;
 el.hidden=!blocked;
 el.innerHTML=blocked?`<span>${esc(blocked)}</span><div class="save-alert-actions"><button data-action="export-json">Export open work</button>${workspaceSaveFailure?'<button data-action="retry-save">Retry save</button>':''}${raw?'<button data-action="export-raw">Save previous browser data</button>':''}</div>`:'';
 const text=localSaveStatusText();for(const status of $$('[data-local-save-status],#save-status'))status.textContent=text;
 if(window.counterplotSync)paintAccount();
}
document.addEventListener('input',e=>{if(e.target.matches('[data-inline],[data-arc-inline],[data-beat-inline],[data-piece-state]')){localEditPending=true;queueMicrotask(saveBanner);}},true);
