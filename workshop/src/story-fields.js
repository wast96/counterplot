/* Removing a preset keeps its value and any recorded history available. */
function storyFieldSettings(n,edge,create=false){
 const key=n.type+':'+edge;if(create){n.storyFields||={};n.storyFields[key]||={hidden:[],custom:[]};}
 return n.storyFields?.[key]||{hidden:[],custom:[]};
}
function storyFieldHidden(n,edge,key){return storyFieldSettings(n,edge).hidden.includes(key);}
function storyFieldExtras(n,edge){return storyFieldSettings(n,edge).custom.map(f=>`<label class="thread-word custom-story-field"><span>${esc(f.label)}</span><input data-inline="story-field" data-id="${n.id}" data-edge="${edge}" data-field-id="${f.id}" value="${esc(f.text)}" aria-label="${esc(W.TYPES[n.type].name+' '+f.label)}" placeholder="Add a detail…" maxlength="1000" style="--state-chars:${Math.min(36,Math.max(14,f.text.length+1))}ch"></label>`).join('')+`<button type="button" class="text-btn story-fields-launch" ${act('story-fields',n.id,`data-edge="${edge}"`)} aria-label="Edit ${n.type==='B'?'beat':edge==='close'?'closing':'opening'} fields">Edit fields</button>`;}
function beatPlanFields(n){const type=W.openThreadContext(p(),n)?.owner?.type||'B',color=W.TYPES[type].color;return `<div class="thread-plan-fields beat-plan-fields color-${color}" style="${colorStyle(n.color,color)}" role="group" aria-label="Beat story fields">${storyFieldHidden(n,'open','development')?'':`<label class="thread-word beat-development"><span>Development</span><textarea rows="1" data-inline="node" data-id="${n.id}" data-field="development" placeholder="What happens in this beat?" aria-label="Beat Development" maxlength="1000" style="--state-chars:${Math.min(36,Math.max(22,(n.development||'').length+1))}ch">${esc(n.development||'')}</textarea></label>`}${storyFieldExtras(n,'open')}</div>`;}
function presetStoryFields(n,edge){
 if(n.type==='B')return [{id:'development',label:'Development',value:n.development||''}];
 if(n.type==='C')return W.characterArc(p(),n).changes.map(r=>({id:'state:'+r.id,label:arcLabel(r),value:r[edge==='close'?'to':'from'].text,state:true}));
 const labels=W.THREAD_FIELDS[n.type],plan=W.threadPlan(n);
 return (edge==='close'?['to']:n.type==='E'?['from','focus']:['focus','from']).map(key=>({id:key,label:labels[key],value:plan[key]}));
}
function customStoryFieldRow(f){return `<div class="story-field-editor" data-custom-field="${f.id}"><input type="hidden" name="customId" value="${f.id}"><label class="field"><span>Field label</span><input name="label-${f.id}" value="${esc(f.label)}" maxlength="100" placeholder="For example, Obstacle" required></label><label class="field"><span>Field value · optional</span><input name="text-${f.id}" value="${esc(f.text)}" maxlength="1000" placeholder="What matters here?"></label><button type="button" class="text-btn" ${act('remove-custom-field',f.id)} aria-label="Remove custom field ${esc(f.label||'without a label')}">Remove field</button></div>`;}
actions['story-fields']=el=>{
 const n=node(el.dataset.id);if(!n)return;const edge=el.dataset.edge||'open',settings=storyFieldSettings(n,edge),presets=presetStoryFields(n,edge);
 modalData={kind:'story-fields',id:n.id,edge,presets};
 dialog('STORY FIELDS',name(n)+' · '+(n.type==='B'?'Beat':edge==='close'?'Closing':'Opening'),`<input type="hidden" name="fieldsChanged" value="0"><p class="help">Choose the fields shown on this piece. Uncheck a preset to remove it from this view; its value and recorded history stay saved. Check it again to restore it.</p><div class="preset-story-fields">${presets.map(f=>`<div class="preset-story-field"><label class="check-chip"><input type="checkbox" name="shownPreset" value="${esc(f.id)}" ${settings.hidden.includes(f.id)?'':'checked'} aria-label="Show ${esc(f.label)}">${esc(f.label)}</label>${f.state?`<p>${esc(f.value||'No state written yet')}</p>`:`<label class="field"><span class="field-label">${esc(f.label)} value</span><input name="preset-${esc(f.id)}" value="${esc(f.value)}" maxlength="1000" aria-label="${esc(f.label)} value"></label>`}</div>`).join('')}</div><h3 class="custom-fields-heading">Custom fields</h3><p class="help">Use your own labels for planning notes on this piece.</p><div id="custom-story-fields">${settings.custom.map(customStoryFieldRow).join('')}</div>${btn('add-custom-field','Add field','plus')}`,submit('Keep fields'),'story-fields');
};
actions['add-custom-field']=()=>{
 const container=$('#custom-story-fields');if(!container)return;
 if(container.children.length>=100){formError('Keep each opening, closing, or beat within 100 custom fields.');return;}
 container.insertAdjacentHTML('beforeend',customStoryFieldRow({id:W.uid(),label:'',text:''}));container.lastElementChild.querySelector('input:not([type=hidden])').focus();markStoryFieldsChanged();
};
function markStoryFieldsChanged(){const marker=$('#dialog [name=fieldsChanged]');if(marker)marker.value='1';captureFormDraft();}
actions['remove-custom-field']=el=>{el.closest('[data-custom-field]')?.remove();markStoryFieldsChanged();$('#dialog [data-action=add-custom-field]')?.focus();};
const beforeStoryFieldSubmit=extraSubmit;
extraSubmit=function(form,data,m){
 if(form.dataset.form!=='story-fields')return beforeStoryFieldSubmit(form,data,m);
 const custom=data.getAll('customId').map(id=>({id,label:String(data.get('label-'+id)||'').trim(),text:String(data.get('text-'+id)||'')}));
 if(custom.some(f=>!f.label))throw Error('Give each custom field a label.');
 if(mutate('Updated story fields',()=>{
  const n=node(m.id),settings=storyFieldSettings(n,m.edge,true),shown=new Set(data.getAll('shownPreset'));
  settings.hidden=m.presets.filter(f=>!shown.has(f.id)).map(f=>f.id);settings.custom=custom;
  for(const f of m.presets)if(!f.state){const value=String(data.get('preset-'+f.id)||'');if(n.type==='B')n.development=value;else W.setThreadPlan(n,f.id,value);}
 }))closeDialog();return true;
};
const beforeStoryFieldInline=inlineUpdate;
inlineUpdate=function(el){
 if(el.dataset.inline!=='story-field')return beforeStoryFieldInline(el);
 const n=node(el.dataset.id),f=n&&storyFieldSettings(n,el.dataset.edge).custom.find(f=>f.id===el.dataset.fieldId);if(!f)return;
 if(!editBefore){editBefore=W.copy(workspace);editLabel='Edited story field';}f.text=el.value;clearTimeout(saveTimer);saveTimer=setTimeout(save,250);
};

draftable.add('story-fields');
