// Folders organize a character's cards; membership lives outside timed states.
paths.folder='M3 7V5a1 1 0 0 1 1-1h5l2 3h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Z';
const cardFolder=(c,bid)=>(c.blockFolders||[]).find(f=>f.blockIds.includes(bid));
function folderButton(c,b){return ib('file-block',b.id,'folder','Move '+(b.label||kind(b.kind).label)+' to a folder',`data-cid="${c.id}" title="${esc(cardFolder(c,b.id)?.label||'Move to folder')}"`);}
function characterCards(c,blocks,original){
 const folders=c.blockFolders||[],tile=`<button class="add-block-tile" ${act('add-block','',`data-cid="${c.id}"`)}><span class="plus">+</span>Something else about them<small>${Object.keys(KINDS).length} kinds of possibility</small></button>`;
 if(!folders.length)return `<div class="blocks-grid">${blocks.map(b=>blockHTML(c,b,original)).join('')}${tile}</div>`;
 const assigned=new Set(folders.flatMap(f=>f.blockIds)),loose=blocks.filter(b=>!assigned.has(b.id));
 return `<div class="character-card-collection">${folders.map(f=>{
  const members=blocks.filter(b=>f.blockIds.includes(b.id)),body='folder-cards-'+f.id;
  return `<section class="block-folder${f.collapsed?' is-collapsed':''}" data-folder="${f.id}" data-drop="block-folder" data-folder-id="${f.id}" data-cid="${c.id}" data-anchor="${f.id}" aria-label="${esc(f.label)} folder"><header class="block-folder-head"><button class="folder-toggle" ${act('toggle-block-folder',f.id,`data-cid="${c.id}"`)} aria-expanded="${!f.collapsed}" aria-controls="${body}" aria-label="${f.collapsed?'Expand':'Collapse'} ${esc(f.label)} folder">${icon('down')}<span class="folder-name" title="${esc(f.label)}">${esc(f.label)}</span><span class="folder-count">${members.length}<span class="sr-only"> ${members.length===1?'card':'cards'}</span></span></button>${ib('edit-block-folder',f.id,'edit','Edit '+f.label+' folder',`data-cid="${c.id}"`)}</header><div class="folder-body" id="${body}" ${f.collapsed?'hidden':''}>${members.length?`<div class="blocks-grid">${members.map(b=>blockHTML(c,b,original)).join('')}</div>`:`<p class="folder-empty">${f.blockIds.length?'No cards at this story moment.':'Drop cards here, or choose them with Edit folder.'}</p>`}</div></section>`;
 }).join('')}<section class="block-ungrouped" data-drop="block-folder" data-folder-id="" data-cid="${c.id}" aria-label="Ungrouped cards"><div class="ungrouped-heading"><span>Ungrouped</span><span class="folder-count">${loose.length}</span></div>${loose.length?`<div class="blocks-grid">${loose.map(b=>blockHTML(c,b,original)).join('')}</div>`:'<p class="folder-empty">Drop a card here to take it out of its folder.</p>'}</section></div>`;
}
function editBlockFolder(cid,id='',selected=[]){
 const c=person(cid),f=c?.blockFolders.find(f=>f.id===id);if(!c||id&&!f)return;
 const current=W.stateAt(p(),c,ui.at),all=W.characterFolderBlocks(p(),c),cards=[...current,...all.filter(b=>!current.some(x=>x.id===b.id))];
 const chosen=new Set(f?.blockIds||selected);modalData={kind:'block-folder',cid,id,shown:cards.map(b=>b.id)};
 dialog('A PLACE FOR RELATED PIECES',id?'Edit folder':'New folder',
  `<label class="field"><span>Folder name</span><input name="folderLabel" value="${esc(f?.label||'')}" maxlength="100" placeholder="Family, skills, unfinished thoughts…" required></label>`+
  (cards.length?`<fieldset class="folder-card-picker"><legend>Cards in this folder</legend>${cards.length>8?'<input class="folder-card-search" type="search" data-folder-search aria-label="Find cards" placeholder="Find a card…">':''}<div class="folder-card-list">${cards.map(b=>{const owner=cardFolder(c,b.id);return `<label class="folder-card-choice"><input type="checkbox" name="folderCards" value="${b.id}" ${chosen.has(b.id)?'checked':''}><span><small>${esc(b.label||kind(b.kind).label)}${owner&&owner.id!==id?' · '+esc(owner.label):''}</small><span>${esc(b.text||'An unfinished thought…')}</span></span></label>`;}).join('')}<p class="folder-empty folder-no-matches" hidden>No cards match this search.</p></div></fieldset><p class="help">Selected cards move here from their current folder.</p>`:'<p class="help">You can add cards to this folder whenever you are ready.</p>')+
  (id?'<p class="help">Removing this folder keeps all of its cards.</p>':''),
  (id?btn('remove-block-folder','Remove folder','close',false,`data-id="${id}" data-cid="${cid}"`):'')+submit(id?'Save folder':'Create folder'),'block-folder');
}
function fileBlock(cid,bid){
 const c=person(cid),b=c&&(W.stateAt(p(),c,ui.at).find(b=>b.id===bid)||W.characterFolderBlocks(p(),c).find(b=>b.id===bid));if(!b)return;
 modalData={kind:'file-block',cid,bid};
 dialog('KEEP RELATED PIECES TOGETHER','Move card to folder',`<p class="folder-card-preview">${esc(b.text||b.label||kind(b.kind).label)}</p>`+
  select('Folder','cardFolder',[['','Ungrouped'],...c.blockFolders.map(f=>[f.id,f.label]),['new','＋ New folder']],cardFolder(c,bid)?.id||'')+
  '<label class="field" id="new-card-folder" hidden><span>New folder name</span><input name="newFolderLabel" maxlength="100" placeholder="Name this folder…"></label>',submit('Move card'),'file-block');
}
function finishFolderDialog(cid,id='',bid=''){
 closeDialog();const f=person(cid)?.blockFolders.find(f=>f.id===id);
 const target=bid&&!f?.collapsed?$(`[data-block="${CSS.escape(bid)}"] [data-action=file-block]`):id?$(`[data-folder="${CSS.escape(id)}"] .folder-toggle`):null;
 (target||$('[data-action=new-block-folder]'))?.focus({preventScroll:true});
}
actions['new-block-folder']=el=>editBlockFolder(el.dataset.cid);
actions['edit-block-folder']=el=>editBlockFolder(el.dataset.cid,el.dataset.id);
actions['file-block']=el=>fileBlock(el.dataset.cid,el.dataset.id);
actions['toggle-block-folder']=el=>{
 const c=person(el.dataset.cid),f=c?.blockFolders.find(f=>f.id===el.dataset.id);if(!f)return;
 if(mutate(f.collapsed?'Opened card folder':'Collapsed card folder',()=>{f.collapsed=!f.collapsed;},{notify:false}))$(`[data-folder="${f.id}"] .folder-toggle`)?.focus({preventScroll:true});
};
actions['remove-block-folder']=el=>{const c=person(el.dataset.cid);if(c&&mutate('Removed folder',()=>{c.blockFolders=c.blockFolders.filter(f=>f.id!==el.dataset.id);}))finishFolderDialog(c.id);};
document.addEventListener('change',e=>{if(e.target.name==='cardFolder'){const creating=e.target.value==='new';$('#new-card-folder').hidden=!creating;$('#new-card-folder input').required=creating;if(creating)$('#new-card-folder input').focus();}});
document.addEventListener('input',e=>{if(!e.target.hasAttribute('data-folder-search'))return;const q=e.target.value.trim().toLocaleLowerCase();const rows=$$('.folder-card-choice');for(const row of rows)row.hidden=!row.textContent.toLocaleLowerCase().includes(q);$('.folder-no-matches').hidden=rows.some(row=>!row.hidden);});
const folderSubmit=extraSubmit;
extraSubmit=function(form,data,m){
 if(form.dataset.form==='block-folder'){
  const c=person(m.cid),f=c?.blockFolders.find(f=>f.id===m.id),retained=(f?.blockIds||[]).filter(id=>!m.shown.includes(id));
  let saved=m.id;if(mutate(m.id?'Updated folder':'Created folder',pr=>{saved=W.setBlockFolder(pr,m.cid,{id:m.id,label:String(data.get('folderLabel')||''),blockIds:[...retained,...data.getAll('folderCards')]});}))finishFolderDialog(m.cid,saved);return true;
 }
 if(form.dataset.form==='file-block'){
  let target=String(data.get('cardFolder')||'');
  if(mutate('Moved card to folder',pr=>{if(target==='new')target=W.setBlockFolder(pr,m.cid,{label:String(data.get('newFolderLabel')||''),blockIds:[m.bid]});else W.moveBlockToFolder(pr,m.cid,m.bid,target);}))finishFolderDialog(m.cid,target,m.bid);return true;
 }
 return folderSubmit(form,data,m);
};
