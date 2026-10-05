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
let workspaceSaveFailure=false;
function save(){
 clearTimeout(saveTimer);
 if(sessionMode==='@author'){saveBanner();return true;}
 if(blocked&&!workspaceSaveFailure){saveBanner();return false;}
 try{const ok=savedWriter().queue(JSON.stringify(workspace));saveBanner();return ok;}
 catch(e){blocked='Browser saving is unavailable. Keep this tab open and export a backup. '+e.message;workspaceSaveFailure=true;saveBanner();return false;}
}
async function flushWorkspace(){finishEdit();if(!save())return false;return sessionMode==='@author'||await savedWriter().flush();}
function workspacePending(){return [...workspaceWriters.values()].some(x=>x.status().pending||x.status().dirty);}
async function retryWorkspaceSave(){
 if(!workspaceSaveFailure){toast('Export this copy before reopening. The other saved copy has been kept.');return false;}
 const writer=savedWriter();writer.queue(JSON.stringify(workspace));const ok=await writer.retry();
 if(ok){blocked='';workspaceSaveFailure=false;saveBanner();toast('Saved on this device.');}return ok;
}
function saveBanner(){
 const el=$('#save-alert');if(!el)return;
 el.hidden=!blocked;
 el.innerHTML=blocked?`<span>${esc(blocked)}</span><div class="save-alert-actions"><button data-action="export-json">Export backup</button>${workspaceSaveFailure?'<button data-action="retry-save">Retry save</button>':''}${raw?'<button data-action="export-raw">Save previous browser data</button>':''}</div>`:'';
 const status=$('#save-status');if(!status)return;
 if(blocked){status.textContent='Not saved · export a backup';return;}
 if(sessionMode==='@author'){status.textContent='Sample draft · return to editor to keep';return;}
 if(window.__COUNTERPLOT_STUDIO__){status.textContent=document.body.classList.contains('studio-playtest')?'Play only · return to Edit to keep authoring':'Story edits join the tutorial draft';return;}
 const writer=workspaceWriters.get(KEY)?.status();
 status.innerHTML=writer?.pending||writer?.dirty?'Saving on this device…':'<span class="save-dot"></span>Saved on this device';
}
