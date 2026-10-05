/* Existing credentials and server history, with owner-scoped local recovery. */
const account=CounterplotAccount, syncCore=CounterplotSyncCore;
let syncReady=false,syncBusy=false,syncTimer,accountEpoch=0,syncBase=null,syncRevision=0,syncInflight=null,syncError='',syncMessage='',syncLocked=false,syncDirty=false;
const checkpointKey='counterplot.sync.checkpoint.v2';
CounterplotTutorialStore.registerKey(checkpointKey);
const freshAccountStore=!raw;
let accountStarting=false,suppressInitialAccountSave=!!account.user&&!raw;
const tutorialKey=key=>key==='counterplot.tutorial.custom.index.v1'||key==='counterplot.tutorial.build.v2'||key==='counterplot.guide.library.v1'||['counterplot.tutorial.definition.','counterplot.tutorial.draft.','counterplot.tutorial.practice.','counterplot.tutorial.cursor.','counterplot.guide.mgs3.build.'].some(prefix=>key.startsWith(prefix));
async function oldDeviceCopies(){
  if(!account.user||!window.indexedDB)return [];
  if(indexedDB.databases&&!(await indexedDB.databases()).some(d=>d.name==='counterplot-private-v2'))return [];
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open('counterplot-private-v2');let db;
    request.onupgradeneeded=()=>{request.transaction.abort();resolve([]);};
    request.onerror=()=>{if(request.error?.name==='AbortError')resolve([]);else reject(request.error);};
    request.onblocked=()=>reject(Error('Close the old app’s database operation, then retry recovery.'));
    request.onsuccess=()=>{db=request.result;if(!db.objectStoreNames.contains('workspaces')){db.close();resolve([]);return;}const transaction=db.transaction('workspaces','readonly'),read=transaction.objectStore('workspaces').getAll();let rows=[];read.onsuccess=()=>{rows=read.result;};transaction.oncomplete=()=>{db.close();const parts=new Map(rows.filter(r=>r.internal).map(r=>[r.key,r.value]));resolve(rows.filter(r=>!r.internal&&r.owner===account.user).map(r=>({slot:r.slot,updatedAt:r.updatedAt,workspace:r.pending||(r.inflight||parts.get(r.inflightKey))?.workspace})).filter(r=>r.workspace));};transaction.onabort=()=>{db.close();reject(transaction.error);};};
  });
}
const accountChannel=account.hosted&&typeof BroadcastChannel==='function'?new BroadcastChannel('counterplot-account'):null;
accountChannel?.addEventListener('message',event=>{if(event.data?.owner!==account.user){accountEpoch++;syncLocked=true;syncError='This tab belongs to another account. Its edits remain with the original account. Sign in again before syncing.';paintAccount();}});
async function accountApi(path,options={},identity=false){const epoch=accountEpoch,owner=account.user;if(syncLocked&&!identity)throw Error(syncError);const response=await fetch('/api/'+path,{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(30000),...options,headers:{'X-Counterplot-Writer':'5',...(owner?{'X-Counterplot-Owner':owner}:{}),...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}});if(!identity&&(epoch!==accountEpoch||owner!==account.user))throw Error('The account changed while this request was running.');if(path==='workspace'&&(!options.method||options.method==='GET')&&!accountStarting&&(editBefore||editorIsDirty()||window.CounterplotTutorialLibrary?.isOpen()||document.activeElement?.matches('input,textarea,[contenteditable]'))){const error=Error('Finish this edit before receiving remote changes.');error.deferred=true;throw error;}if(response.status===304)return null;const value=await response.json();if(value.owner&&value.owner!==owner){syncLocked=true;throw Error('The server account differs from this tab. Your writing has been retained.');}if(response.status===409&&path==='workspace')return {...value,conflict:true};if(!response.ok){if(value.code==='account-changed')syncLocked=true;throw Error(value.error||'The account request failed.');}return value;}
function accountSnapshot(){const main=!sessionMode?workspace:sessionCache.get('')?.workspace||JSON.parse(CounterplotTutorialStore.getItem(MAIN_KEY)||'null');if(!main)return null;const snapshot=W.copy(main);snapshot.tutorialRecords=Object.fromEntries(CounterplotTutorialStore.keys().filter(tutorialKey).map(key=>[key,CounterplotTutorialStore.getItem(key)]).filter(([,value])=>value));return snapshot;}
function normalizeRemote(value){return value?.format==='counterplot'?W.legacy(value):value?W.validate(W.copy(value)):null;}
function mergeAccounts(base,local,remote){
  if(!remote)return {workspace:local,forks:[]};if(!local)return {workspace:remote,forks:[]};
  const merged=syncCore.merge(base,local,remote),result=merged.workspace,rootConflicts=[];
  for(const key of new Set([...Object.keys(local),...Object.keys(remote)]))if(!['projects','active','format','schema'].includes(key))result[key]=syncCore.mergeValue(base?.[key],local[key],remote[key],key,rootConflicts);
  if(rootConflicts.length){result.recoveryCopies||=[];result.recoveryCopies.push({id:W.uid(),createdAt:new Date().toISOString(),reason:'Concurrent changes outside the story collections',data:Object.fromEntries(Object.entries(local).filter(([key])=>!['projects','recoveryCopies'].includes(key)))});}
  try{W.validate(result);}catch{
    const safe=W.copy(remote);for(const project of local.projects){const pr=W.copy(project);pr.id=W.uid();pr.title+=' · preserved device copy';safe.projects.push(pr);merged.forks.push(pr.id);}safe.recoveryCopies||=[];safe.recoveryCopies.push({id:W.uid(),createdAt:new Date().toISOString(),data:local.tutorialRecords||{}});W.validate(safe);merged.workspace=safe;
  }
  return merged;
}
async function retainCheckpoint(){const text=JSON.stringify({owner:account.user,base:syncBase,revision:syncRevision,inflight:syncInflight});await CounterplotTutorialStore.setItem(checkpointKey,text,CounterplotTutorialStore.getItem(checkpointKey)||'');}
async function installAccountWorkspace(data){
  const validated=W.validate(W.copy(data)),records=validated.tutorialRecords||{};delete validated.tutorialRecords;
  const mainText=JSON.stringify(validated),keys=[...new Set([MAIN_KEY,...Object.keys(records),...CounterplotTutorialStore.keys().filter(tutorialKey)])],expected=Object.fromEntries(keys.map(key=>[key,CounterplotTutorialStore.getItem(key)||'']));
  keys.forEach(key=>CounterplotTutorialStore.registerKey(key));
  await CounterplotTutorialStore.transaction(keys,before=>{for(const key of keys)if(before[key]!==expected[key])throw Error('Another tab has newer local writing. Export this copy before reopening.');return Object.fromEntries(keys.map(key=>[key,key===MAIN_KEY?mainText:records[key]??null]));});
  if(!sessionMode){workspace=validated;raw=mainText;lastSaved=mainText;past=[];future=[];workspaceWriters.delete(MAIN_KEY);}
  else {sessionCache.delete('');if(records[KEY]&&sessionMode!=='@author'){workspace=W.validate(JSON.parse(records[KEY]));lastSaved=records[KEY];raw=lastSaved;workspaceWriters.delete(KEY);past=[];future=[];}}
  // Invalidate cached practice only when it is not the open editor. Active practice is never overwritten.
  for(const [mode,cached]of sessionCache)if(mode!==sessionMode&&records[cached.KEY])sessionCache.delete(mode);
  render();document.dispatchEvent(new CustomEvent('counterplot:account-records'));
}
async function sendAccountWorkspace(sent){const text=JSON.stringify(sent.workspace),bytes=new TextEncoder().encode(text).byteLength;if(bytes>32_000_000)throw Error('This workspace exceeds 32 MB. Export a backup before reducing it.');if(bytes<200000)return accountApi('workspace',{method:'PUT',body:JSON.stringify(sent)});const chunks=[];for(let at=0;at<text.length;){let end=Math.min(at+60000,text.length);if(end<text.length&&/[\uD800-\uDBFF]/.test(text[end-1]))end--;const content=text.slice(at,end);at=end;const hash=TutorialStorage.fingerprint(content);chunks.push(hash);await accountApi('workspace-chunk',{method:'POST',body:JSON.stringify({hash,content})});}return accountApi('workspace',{method:'PUT',body:JSON.stringify({revision:sent.revision,writeId:sent.writeId,manifest:{bytes,chunks}})});}
function paintAccount(){const el=$('#account-status');if(el)el.textContent=syncLocked?'Account changed':syncError?'Sync needs attention':(syncBusy||syncDirty)?'Saving across devices…':syncReady?'Saved across devices':'Connecting…';const detail=$('#account-detail');if(detail)detail.textContent=syncError||syncMessage||(syncBusy?'Saving your writing…':syncReady?'Your account is connected.':'Connecting…');}
function queueAccountSync(){if(!account.user||!syncReady||syncLocked||syncBusy)return;syncDirty=true;paintAccount();clearTimeout(syncTimer);syncTimer=setTimeout(()=>syncAccount(),800);}
async function syncAccount(){
  if(!account.user||!syncReady||syncBusy||syncLocked||window.__COUNTERPLOT_STUDIO__)return;
  if(sessionMode==='@author'||window.CounterplotTutorialLibrary?.isOpen()||editorIsDirty()||document.activeElement?.matches('input,textarea,[contenteditable="true"]')){queueAccountSync();return;}
  syncBusy=true;paintAccount();const epoch=accountEpoch;
  try{
    if(!await flushWorkspace())throw Error('Save on this device needs attention before account sync.');
    const current=accountSnapshot();if(!current)return;
    if(syncInflight){const prior=await sendAccountWorkspace(syncInflight);if(prior.conflict){const remote=normalizeRemote(prior.workspace),merged=mergeAccounts(syncBase,current,remote);syncBase=remote;syncRevision=prior.revision;syncInflight=null;await installAccountWorkspace(merged.workspace);if(merged.forks.length)syncMessage='Both versions were preserved on your story shelf.';}else{syncBase=W.copy(syncInflight.workspace);syncRevision=prior.revision;syncInflight=null;}await retainCheckpoint();}
    const remote=await accountApi('workspace',{headers:{'If-None-Match':'"'+syncRevision+'"'}});
    if(remote&&remote.revision!==syncRevision){const normalized=normalizeRemote(remote.workspace),merged=mergeAccounts(syncBase,accountSnapshot(),normalized);syncBase=normalized;syncRevision=remote.revision;await installAccountWorkspace(merged.workspace);if(merged.forks.length)syncMessage='Both versions were preserved on your story shelf.';await retainCheckpoint();}
    const snapshot=accountSnapshot();if(!syncCore.equal(snapshot,syncBase)){
      syncInflight={workspace:W.copy(snapshot),revision:syncRevision,writeId:W.uid()};await retainCheckpoint();
      const response=await sendAccountWorkspace(syncInflight);
      if(response.conflict){const normalized=normalizeRemote(response.workspace),merged=mergeAccounts(syncBase,accountSnapshot(),normalized);syncBase=normalized;syncRevision=response.revision;syncInflight=null;await installAccountWorkspace(merged.workspace);syncMessage=merged.forks.length?'Both versions were preserved on your story shelf.':'';await retainCheckpoint();queueAccountSync();}
      else{syncBase=W.copy(syncInflight.workspace);syncRevision=response.revision;syncInflight=null;await retainCheckpoint();}
    }
    if(epoch!==accountEpoch)throw Error('The account changed.');syncDirty=!syncCore.equal(accountSnapshot(),syncBase);syncError='';
  }catch(error){if(error.deferred){syncDirty=true;syncError='';}else syncError=error.message;}finally{syncBusy=false;paintAccount();if(syncDirty&&!syncError)queueAccountSync();}
}
async function startAccount(){if(!account.user||accountStarting||syncBusy||syncLocked)return;accountStarting=true;$('#app').inert=true;syncBusy=true;paintAccount();try{
  const stored=CounterplotTutorialStore.getItem(checkpointKey);if(stored){const state=JSON.parse(stored);if(state.owner!==account.user)throw Error('Local recovery belongs to a different account.');syncBase=state.base;syncRevision=state.revision;syncInflight=state.inflight;}
  const remote=await accountApi('workspace');
  if(remote.workspace?.format==='counterplot'){const backup='counterplot.migration.original.'+TutorialStorage.fingerprint(JSON.stringify(remote.workspace));CounterplotTutorialStore.registerKey(backup);if(!CounterplotTutorialStore.getItem(backup))await CounterplotTutorialStore.setItem(backup,JSON.stringify(remote.workspace),'');}
  const normalized=normalizeRemote(remote.workspace),local=freshAccountStore&&!raw?null:accountSnapshot(),merged=mergeAccounts(syncBase?normalizeRemote(syncBase):null,local,normalized);
  if(merged.workspace)await installAccountWorkspace(merged.workspace);
  syncBase=remote.workspace?.format==='counterplot'?null:normalized;syncRevision=remote.revision;
  // Do not discard a persisted in-flight request: replay its write ID before sending newer edits.
  await retainCheckpoint();syncReady=true;if(merged.forks.length)syncMessage='Both versions were preserved on your story shelf.';queueAccountSync();
}catch(error){syncError=error.message;}finally{accountStarting=false;syncBusy=false;$('#app').inert=false;paintAccount();if(syncReady)queueAccountSync();}}
const localSave=save;
save=function(){if(suppressInitialAccountSave){suppressInitialAccountSave=false;return true;}const result=localSave();if(result)queueAccountSync();return result;};
const localTopbar=topbar;
topbar=function(){let html=localTopbar();return html.replace('<span class="local-badge">Local edition</span>',account.hosted?`<button class="text-btn" data-action="account">${account.user?'<span id="account-status">Account</span>':'Sign in'}</button>`:'<span class="local-badge">Local edition</span>');};
function accountDialog(view=''){
  if(!account.hosted){toast('Open the hosted Counterplot site to use an account.');return;}
  if(account.user&&!view){modalData={kind:'account'};dialog('YOUR ACCOUNT',account.email,`<p id="account-detail">${esc(syncError||syncMessage||'Your writing stays with this account.')}</p><div class="stack">${btn('sync-now','Sync now','change')}${btn('account-history','Saved versions','archive')}${btn('account-old-device','Unsent writing from the old app','archive')}${btn('account-local-import','Import stories from this device','import')}${btn('account-recovery','Recovery codes','book')}${btn('account-logout','Sign out','close')}</div>`);paintAccount();return;}
  const mode=view||'login';modalData={kind:'account-auth',mode};dialog('COUNTERPLOT ACCOUNT',mode==='register'?'Create your account':mode==='reset'?'Reset with a recovery code':'Welcome back',field('Email','email',account.email,'','email')+field(mode==='reset'?'New password':'Password','password','','','password')+(mode==='register'?field('Registration code, if required','registrationCode',''):mode==='reset'?field('Recovery code','code',''):'')+`<div class="row">${btn('account-login','Sign in')}${btn('account-register','Create account')}${btn('account-reset','Use recovery code')}</div>`,submit(mode==='register'?'Create account':mode==='reset'?'Reset password':'Sign in'),'account-auth');
}
Object.assign(actions,{
  account:()=>accountDialog(),'account-login':()=>accountDialog('login'),'account-register':()=>accountDialog('register'),'account-reset':()=>accountDialog('reset'),
  'sync-now':async()=>{await (syncReady?syncAccount():startAccount());paintAccount();},
  'account-local-import':async()=>{let content=unscopedStore.getItem(MAIN_KEY);if(!content)try{content=localStorage.getItem('counterplot.workspace.v1');}catch{}if(!content){toast('No local stories were found. Use Import a story for an exported file.');return;}await importFile(new File([content],'Device stories.json',{type:'application/json'}));},
  'account-old-device':async()=>{const copies=await oldDeviceCopies();modalData={kind:'old-device-copies',copies};dialog('ORIGINAL APP RECOVERY','Unsent writing on this device',copies.map((r,i)=>`<article class="history-row"><strong>${esc(r.updatedAt||'Unfinished device copy')}</strong>${btn('account-import-old-device','Review and import','import',false,`data-id="${i}"`)}</article>`).join('')||'<p>No unsent copies were found for this account. The old app’s saved records are left intact.</p>');},
  'account-import-old-device':async el=>{const copy=modalData.copies[Number(el.dataset.id)];if(copy)await importFile(new File([JSON.stringify(copy.workspace)],'Unsent Counterplot writing.json',{type:'application/json'}));},
  'account-logout':async()=>{if(!await flushWorkspace())return;await syncAccount();if(syncInflight||syncError){toast('Sync needs attention. Export a backup before leaving this account.');return;}await accountApi('auth/logout',{method:'POST'});accountEpoch++;accountChannel?.postMessage({owner:''});location.reload();},
  'account-history':async()=>{const result=await accountApi('history');dialog('SAVED ACCOUNT VERSIONS','Recover a copy',result.revisions.map(r=>`<article class="history-row"><strong>Version ${r.revision}</strong><p>${esc(r.updatedAt)}</p>${btn('account-recover-version','Add recovered stories','copy',false,`data-id="${r.revision}"`)}</article>`).join('')||'<p>No account saves yet.</p>');},
  'account-recover-version':async el=>{const result=await accountApi('workspace?revision='+encodeURIComponent(el.dataset.id)),old=normalizeRemote(result.workspace);if(mutate('Recovered historical stories as copies',()=>{for(const item of old.projects){const pr=W.copy(item);pr.id=W.uid();pr.title+=' · recovered version '+el.dataset.id;workspace.projects.push(pr);}}))closeDialog();},
  'account-recovery':()=>{modalData={kind:'account-recovery'};dialog('ACCOUNT RECOVERY','Keep a way back in',`<p>Generating new codes replaces previous unused codes. Save the new codes somewhere private.</p>`+field('Confirm password','password','','','password'),submit('Generate recovery codes'),'account-recovery');}
});
document.addEventListener('submit',async event=>{const form=event.target;if(!['account-auth','account-recovery'].includes(form.dataset.form))return;event.preventDefault();const data=new FormData(form),mode=modalData.mode;try{
  if(form.dataset.form==='account-recovery'){const result=await accountApi('auth/recovery',{method:'POST',body:JSON.stringify({password:data.get('password')})});dialog('SAVE THESE PRIVATELY','Your recovery codes',`<p>Each code works once.</p><pre>${esc(result.codes.join('\n'))}</pre>`);return;}
  if(!await flushWorkspace())return;const response=await accountApi('auth/'+mode,{method:'POST',body:JSON.stringify(Object.fromEntries(data))},true);
  if(mode==='reset'){accountDialog('login');toast('Password reset. Sign in with your new password.');return;}
  accountEpoch++;accountChannel?.postMessage({owner:response.user});location.reload();
}catch(error){formError(error.message);}});
window.addEventListener('online',()=>syncReady?queueAccountSync():startAccount());
if(account.hosted&&account.user){queueMicrotask(startAccount);setInterval(()=>{if(!document.hidden)(syncReady?syncAccount():startAccount());},10000);}
else if(account.error)queueMicrotask(()=>toast('Account connection unavailable. Local stories remain separate. '+account.error));

window.counterplotSync={flush:syncAccount,status:()=>({ready:syncReady,busy:syncBusy,revision:syncRevision,error:syncError,dirty:syncDirty,owner:account.user,locked:syncLocked})};
// Backups contain this library only. Authentication and other owners' local records
// never enter exported files.
const storyExportDialog=exportDialog;
exportDialog=function(){storyExportDialog();$('#dialog .export-options').insertAdjacentHTML('beforeend',`<button class="export-option" data-action="export-library">${icon('book')}<div><h3>Complete library · JSON</h3><p>My work, deleted stories, tutorial definitions, practice, progress, and authoring drafts. Passwords and recovery codes are excluded.</p></div></button>${workspace.recoveryCopies?.length?`<button class="export-option" data-action="recovery-copies">${icon('archive')}<div><h3>Recovered library edits</h3><p>Keep the other version of conflicting tutorial or library edits.</p></div></button>`:''}`);};actions.export=exportDialog;
actions['export-library']=async()=>{await window.CounterplotTutorialLibrary?.flushDraft();if(!await flushWorkspace())return;const data=accountSnapshot();W.validate(data);download(JSON.stringify(data,null,2),'Counterplot complete library.json','application/json');};
actions['recovery-copies']=()=>{dialog('PRESERVED LIBRARY EDITS','Both versions are kept',(workspace.recoveryCopies||[]).map((r,i)=>`<article class="history-row"><strong>${esc(r.reason||'Recovered library data')}</strong><p>${esc(r.createdAt||'')}</p>${btn('export-recovery-copy','Download preserved copy','export',false,`data-id="${i}"`)}</article>`).join(''));};
actions['export-recovery-copy']=el=>{const r=workspace.recoveryCopies?.[Number(el.dataset.id)];if(!r)return;const data=r.data?.format?r.data:{...W.copy(workspace),tutorialRecords:r.data?.tutorialRecords||r.data};delete data.recoveryCopies;download(JSON.stringify(data,null,2),'Counterplot recovered library.json','application/json');};
async function importTutorialRecords(records){
  if(!records||!Object.keys(records).length)return;
  const keys=Object.keys(records),before=Object.fromEntries(keys.map(key=>[key,CounterplotTutorialStore.getItem(key)||'']));
  if(keys.some(key=>before[key]&&before[key]!==records[key])){
    mutate('Preserved a conflicting tutorial library',()=>{(workspace.recoveryCopies||=[]).push({id:W.uid(),createdAt:new Date().toISOString(),reason:'Imported tutorial library differs from this device; download either version from Save a copy',data:{tutorialRecords:records}});},{notify:false});
    toast('Stories imported. The other tutorial library is kept in Save a copy → Recovered library edits.');return;
  }
  keys.forEach(key=>CounterplotTutorialStore.registerKey(key));
  await CounterplotTutorialStore.transaction(keys,current=>{for(const key of keys)if(current[key]!==before[key])throw Error('The tutorial library changed while importing. The original backup is retained; retry the import.');return records;});
  for(const [mode]of sessionCache)if(mode!==sessionMode)sessionCache.delete(mode);
  document.dispatchEvent(new CustomEvent('counterplot:account-records'));queueAccountSync();
}
