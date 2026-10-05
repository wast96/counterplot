/* Tutorial edit mode. The isolated workshop fills the native viewport at 1:1.
   Its frame is a storage boundary, not a miniaturized device canvas. Author controls
   replace the normal header; optional drawers never shrink or scale the workspace. */
 const SM=TutorialStudioModel, SE=TutorialStoryEdits, SS=TutorialSections;
 let studio=null,studioTimer=0,studioRecoveryTimer=0;
 const studioTabs=[['copy','Words'],['sections','Sections'],['placement','Position'],['timing','Timing'],['controls','Buttons'],['reveals','Reveals'],['rules','Rules'],['advanced','Data']];
 const sbtn=(a,label,attrs='',primary=false)=>`<button type="button" class="btn${primary?' primary':''}" data-studio="${a}" ${attrs}>${label}</button>`;
 const sbind=path=>bound('presentation.'+path,'presentation');
 const snum=(name,label,value,path,min,max,step=1)=>input(name,label,value,sbind(path)+` min="${min}" max="${max}" step="${step}"`,'number');
 const scheck=(name,label,value,path)=>`<label class="studio-check"><input type="checkbox" name="${esc(name)}" ${sbind(path)}${value?' checked':''}> ${esc(label)}</label>`;
 function studioInit(){
  if(studio?.editor===editor)return;
  studioDispose();
  studio={editor,history:[],future:[],recoveryRaw:'',canvasTimer:0,storyCapturing:false,anchor:copy(editor.draft),anchorIndex:editor.index,anchorStep:editor.step,lastGroup:'',lastEdit:0,panel:'canvas',phase:'enter',tab:editor.tab,playing:false,pick:'',selectedControl:'next',selectedSection:'writeup',revealPhase:'enterAssemblies',collection:'nodes',filter:'',revealExpanded:{},sceneKey:'',sceneVersion:0,frameReady:false,frame:null,view:'action',viewChanged:false,frameGeneration:0,scale:1,drag:null,showMenu:false,selection:'',selectionKey:'',contextPanel:'',popupHidden:false,hiddenFor:''};
  const old=TS.getItem('counterplot.tutorial.draft.'+editor.id+'.v2')||'';studio.recoveryRaw=old;
  if(old)try{const r=JSON.parse(old);if((r.baseline===editor.baseline||r.baselineHash===TS.fingerprint(editor.baseline))&&r.baseRevision===editor.draft.revision&&(r.changes?.length||r.form)&&confirm('Restore the unsaved tutorial draft from your last editing session? Your published definition stays unchanged.')){const recovered=D.restoreJournal(editor.draft,r);editor.draft=D.validate(recovered.draft,Workshop,s=>document.querySelector(s));editor.dirty=!!r.changes?.length;editor.index=recovered.index;editor.step=recovered.step;studio.phase=['enter','complete','exit','sample'].includes(r.phase)?r.phase:'enter';studio.pendingForm=r.form||null;studio.pendingView=r.view||null;studio.anchor=copy(editor.draft);}}catch(e){warnings.set(editor.id,'An older editor draft is available but could not be restored: '+e.message);}
 }
 function localStorageSafeGet(k){try{return localStorage.getItem(k)||'';}catch{return '';}}
 function studioRecord(group='change'){
  if(!studio||studio.editor!==editor||studio.restoring)return;
  const next=JSON.stringify(editor.draft);if(next===JSON.stringify(studio.anchor))return;
  const now=Date.now();
  if(group==='change'||studio.lastGroup!==group||now-studio.lastEdit>750){studio.history.push({draft:studio.anchor,index:studio.anchorIndex,step:studio.anchorStep,label:studio.changeLabel||group});if(studio.history.length>45)studio.history.shift();}
  studio.anchor=copy(editor.draft);studio.anchorIndex=editor.index;studio.anchorStep=editor.step;studio.lastGroup=group;studio.lastEdit=now;studio.future=[];
  clearTimeout(studioRecoveryTimer);studioRecoveryTimer=setTimeout(studioStoreDraft,600);studioUpdateHistory();
 }
 function studioStoreDraft(){
  if(!editor||!studio)return Promise.resolve(true);
  const e=editor,s=studio;
  if(s.publishing){s.recoveryRequested=true;return s.recoveryPromise||Promise.resolve(true);}
  const frame=s.frameReady&&!s.playing&&!s.pick?s.frame.contentWindow:null;
  const form=frame?.CounterplotSession.editorIsDirty()?frame.CounterplotTutorial.captureForm():s.pendingForm||null;
  if(!e.dirty&&!form)return s.recoveryPromise||Promise.resolve(true);
  try{D.validate(e.draft,Workshop,x=>document.querySelector(x));}catch(err){studioNudgeStatus('Draft needs correction · last valid backup kept');return Promise.resolve(false);}
  const base=definitions.get(e.id)||s.anchor,key='counterplot.tutorial.draft.'+e.id+'.v2';
  if(s.hashRaw!==e.baseline){s.hashRaw=e.baseline;s.baselineHash=TS.fingerprint(e.baseline);}
  // An empty baseline also needs a real hash on the first save.
  s.baselineHash||=TS.fingerprint(e.baseline);
  const encoded=JSON.stringify({version:3,flowVersion:2,stageId:activeStage().id,goalId:activeGoal().id,baselineHash:s.baselineHash,baseRevision:base.revision,changes:D.diff(base,e.draft),index:e.index,step:e.step,phase:s.phase,form,view:frame?.CounterplotTutorial.editorView?.()||null});
  if(encoded===s.recoveryScheduled)return s.recoveryPromise||Promise.resolve(encoded===s.recoveryRaw);
  s.recoveryScheduled=encoded;studioNudgeStatus('Backing up draft…');
  const write=async()=>{
   try{
    if(encoded!==s.recoveryRaw)await TS.setItem(key,encoded,s.recoveryRaw);
    s.recoveryRaw=encoded;
    if(studio===s&&editor===e&&s.recoveryScheduled===encoded&&!s.publishing){studioNudgeStatus(form?'Form draft backed up · save its form to apply':'Draft backed up on this device · Save to apply');if(s.recoveryError){error('');s.recoveryError=false;}}
    return true;
   }catch(err){if(s.recoveryScheduled===encoded)s.recoveryScheduled='';if(studio===s&&editor===e){s.recoveryError=true;studioNudgeStatus('Draft not backed up · export to keep it');error(storageMessage(err));}return false;}
  };
  const job=s.recoveryPromise?s.recoveryPromise.then(write):write();
  s.recoveryPromise=job;job.finally(()=>{if(s.recoveryPromise===job)s.recoveryPromise=null;});return job;
 }
 // Commit the current native field before ANY operation that can replace its page.
 function studioFlushCanvas(guardForm=true){
  if(!studio?.frameReady||studio.playing||studio.pick||studio.storyCapturing)return true;
  clearTimeout(studio.canvasTimer);
  const api=studio.frame.contentWindow?.CounterplotTutorial;
  api?.flushEdits();
  if(guardForm&&studio.frame.contentWindow.CounterplotSession.editorIsDirty()){
   studioStoreDraft();error('Save or cancel the open story form before changing tutorial steps. Its draft has been kept.');return false;
  }
  return true;
 }
 function studioCaptureStory(detail){
  const s=studio;if(!s||s.playing||s.pick||s.storyCapturing||!s.frameReady)return;
  const a=detail.before.projects.find(p=>p.id===detail.before.active),b=detail.after.projects.find(p=>p.id===detail.after.active);
  if(!a||!b||a.id!==b.id)return; // Shelf changes are not authoring edits to a scene.
  const edits=SE.diff(a,b),colors=JSON.stringify(detail.before.swatches)!==JSON.stringify(detail.after.swatches)||JSON.stringify(detail.before.hiddenSwatches)!==JSON.stringify(detail.after.hiddenSwatches);
  if(!edits.length&&!colors)return;
  s.storyCapturing=true;
  try{
   if(s.phase==='sample'){editor.draft.sample={...copy(b),id:editor.draft.sample.id};}
   else{const g=activeGoal();g.storyEdits||={};g.storyEdits[s.phase]=SE.append(g.storyEdits[s.phase],edits);}
   if(colors){editor.draft.starter.swatches=copy(detail.after.swatches||[]);editor.draft.starter.hiddenSwatches=copy(detail.after.hiddenSwatches||[]);}
   s.changeLabel=detail.label||'Edited story';markDirty(detail.label?.startsWith('Edited ')?s.storyGroup||'story':'change');s.changeLabel='';
   if(detail.permanent){s.history=[];s.future=[];s.anchor=copy(editor.draft);s.lastGroup='';}
   studioStoreDraft();studioUpdateHistory();
  }catch(e){error('Your visible story is still here, but this edit could not enter the tutorial draft: '+e.message+' Export the visible story before closing.');}
  finally{s.storyCapturing=false;}
 }
 function studioImportStory(data){
  if(!studio?.frameReady||!commit())return false;
  const incoming=Workshop.validate(copy(data)),before=studio.frame.contentWindow.CounterplotTutorial.snapshot();
  const after=copy(before),story=copy(incoming.projects.find(p=>p.id===incoming.active));
  story.id=after.active;after.projects=[story];Workshop.mergeSwatches(after,incoming);
  // mergeSwatches rewrites imported color references, so use that normalized item.
  after.projects=[{...copy(incoming.projects.find(p=>p.id===incoming.active)),id:after.active}];Workshop.validate(after);
  studioCaptureStory({before,after,label:'Imported revised story'});
  studio.sceneVersion++;renderEditor();return true;
 }
 const studioStoryFile=document.createElement('input');studioStoryFile.type='file';studioStoryFile.accept='.json,application/json';studioStoryFile.hidden=true;host.append(studioStoryFile);
 studioStoryFile.addEventListener('change',async()=>{
  const f=studioStoryFile.files[0],current=editor;if(!f)return;
  try{if(f.size>15000000)throw Error('Choose a Workshop story backup smaller than 15 MB.');const data=JSON.parse(await f.text());if(editor!==current)return;Workshop.validate(data);if(confirm('Use this backup’s active story at the current tutorial action? Your other stories and the published tutorial stay unchanged until you save.'))studioImportStory(data);}
  catch(e){error('Could not import the story: '+e.message);}
 });
 function studioUpdateHistory(){
  for(const [a,stack]of [['undo',studio?.history],['redo',studio?.future]]){const b=dialog.querySelector(`[data-studio="${a}"]`);if(b){b.disabled=!stack?.length;b.title=stack?.length?(a==='undo'?'Undo: ':'Redo: ')+(stack.at(-1).label||'tutorial edit'):'Nothing to '+a;}}
 }
 function studioUndo(redo=false){
  if(!commit())return;studioRecord('typing');const from=redo?studio.future:studio.history,to=redo?studio.history:studio.future;if(!from.length)return;
  const old=from.pop();to.push({draft:copy(editor.draft),index:editor.index,step:editor.step,label:old.label});studio.restoring=true;editor.draft=copy(old.draft);editor.index=Math.min(old.index,editor.draft.lessons.length-1);editor.step=Math.min(old.step,activeStage().goals.length-1);editor.rawDirty=false;editor.dirty=true;studio.anchor=copy(editor.draft);studio.lastGroup='';studio.restoring=false;studio.sceneVersion++;renderEditor();studioStoreDraft();studioNudgeStatus((redo?'Redid: ':'Undid: ')+(old.label||'tutorial edit'));
 }
 function studioDispose(){
  const old=studio;studio=null;clearTimeout(studioTimer);clearTimeout(studioRecoveryTimer);clearInterval(old?.demoTimer);clearTimeout(old?.canvasTimer);old?.resize?.disconnect();old?.frameObserver?.disconnect();if(old?.frame){old.frame.onload=null;old.frame.srcdoc='';}dialog.replaceChildren();
 }
 function studioSaved(){
  if(!studio)return;clearTimeout(studioRecoveryTimer);studio.anchor=copy(editor.draft);
 }
 function studioWords(){
  const l=activeStage(),g=activeGoal(),v=effectivePresentation();
  return `<p class="studio-help">Click words in the popup to edit them. Use Sections to add, remove, or rearrange its contents.</p>${sbtn('sections','Arrange sections')}<h4>Stage heading</h4>${input('author-stage-title','Stage title',l.title,bound('title','stage'))}<div class="studio-label-row"><h4>Writeup</h4>${scheck('author-showIntro','Show',v.showIntro,'showIntro')}</div>${area('author-intro','Writeup',l.intro,bound('intro','stage'),4)}<div class="studio-label-row"><h4>How this works</h4>${scheck('author-showWhy','Show',v.showWhy,'showWhy')}</div>${area('author-why','Explanation',l.why,bound('why','stage'),3)}<h4>Sample wording</h4>${studioSampleFields()}<h4>Action</h4>${area('author-instruction','This action',g.text,bound('text'),4)}`;
 }
 function studioSectionList(){return effectivePresentation().sections;}
 function studioOwnSections(){const owner=presentationOwner();owner.presentation||={};owner.presentation.sections||=copy(studioSectionList());return owner.presentation.sections;}
 function studioSections(){
  const sections=studioSectionList(),flat=SS.flatten(sections);
  if(!SS.find(sections,studio.selectedSection))studio.selectedSection=flat[0]?.section.id||'';
  const selected=SS.find(sections,studio.selectedSection),at=selected?SS.location(sections,selected.id):null;
  const row=({section:x,depth})=>`<div class="studio-section-row${x.id===studio.selectedSection?' selected':''}" style="--section-depth:${depth}" data-studio-drop="section" data-id="${esc(x.id)}"><button class="studio-grip" data-studio-drag="section" data-id="${esc(x.id)}" aria-label="Drag ${esc(x.title||'section')}">⠿</button><button data-studio="select-section" data-id="${esc(x.id)}"><strong>${esc(x.title||'Untitled section')}</strong><small>${({text:'Your text',writeup:'Stage writeup',explanation:'Stage explanation',sample:'Sample wording',action:'Action instruction'})[x.kind]}${x.collapsible?' · collapsible':''}</small></button></div>`;
  return `${scopeSelect()}<p class="studio-help">Drag to reorder. Nest a section using “Inside.” Words stay editable on the page. Removing a built-in section keeps its source wording. Undo restores any deleted section.</p><div class="studio-section-list">${flat.map(row).join('')||'<p>No sections. Add one below.</p>'}<div class="studio-section-end" data-studio-drop="section" data-id="">Drop at the end</div></div><div class="studio-inline">${sbtn('section-add','+ Section','',true)}${sbtn('section-add-child','+ Subsection',selected?'':'disabled')}</div>${selected?`
  <div class="studio-section-tools">${sbtn('section-up','↑','aria-label="Move section earlier"')}${sbtn('section-down','↓','aria-label="Move section later"')}${sbtn('section-duplicate','Duplicate')}${sbtn('section-remove','Delete')}</div>
  ${input('section-title','Section name',selected.title,'data-section-field="title" maxlength="160"')}${select('section-kind','Content',SS.kinds.map(k=>[k,({text:'Custom text',writeup:'Stage writeup',explanation:'Stage explanation',sample:'Sample wording',action:'Action instruction'})[k]]),selected.kind,'data-section-field="kind"')}
  ${select('section-parent','Inside',[['','Popup · no parent'],...flat.filter(x=>!SS.find([selected],x.section.id)).map(x=>[x.section.id,x.section.title||x.section.kind])],at.parent,'data-section-parent')}
  <div class="studio-check-grid">${[['heading','Show heading'],['collapsible','Collapsible'],['expanded','Start expanded']].map(([k,label])=>`<label class="studio-check"><input type="checkbox" data-section-field="${k}"${selected[k]?' checked':''}${k==='expanded'&&!selected.collapsible?' disabled':''}> ${label}</label>`).join('')}</div>
  ${selected.kind==='text'?area('section-text','Text',selected.text||'','data-section-field="text" maxlength="20000"',5):selected.kind==='sample'?'<p class="studio-help">Sample wording comes from this action’s sample. Edit it in Words or select Sample beside the popup.</p>':area('section-source','Text',selected.kind==='writeup'?activeStage().intro:selected.kind==='explanation'?activeStage().why:activeGoal().text,bound(selected.kind==='writeup'?'intro':selected.kind==='explanation'?'why':'text',selected.kind==='action'?'goal':'stage'),5)}
  ${sbtn('section-uninherit','Use inherited sections')}`:''}`;
 }
 function studioSectionChanged(label='Section edit'){
  SS.validate(studioOwnSections());studio.changeLabel=label;markDirty('section');studio.changeLabel='';studioSyncGuide();
 }
 function studioSectionCommand(action,id){
  if(!commit())return;
  if(action==='sections'||action==='select-section'){studio.selectedSection=id||studio.selectedSection;studio.contextPanel='';editor.tab='sections';studio.panel='settings';renderEditor();return;}
  const previous=copy(editor.draft),selectedBefore=studio.selectedSection;
  const list=studioOwnSections(),current=SS.find(list,studio.selectedSection),at=current?SS.location(list,current.id):null;
  if(action==='section-add'||action==='section-add-child'){
   const x=SS.create(list);if(action==='section-add-child'&&current)current.children.push(x);else if(at)at.list.splice(at.index+1,0,x);else list.push(x);studio.selectedSection=x.id;
  }else if(action==='section-remove'&&current){SS.remove(list,current.id);studio.selectedSection=SS.flatten(list)[0]?.section.id||'';}
  else if(action==='section-duplicate'&&current){const dup=copy(current),used=new Set(SS.flatten(list).map(x=>x.section.id));for(const x of SS.flatten([dup])){x.section.id=D.uniqueId('section-copy',used);used.add(x.section.id);}dup.title+=' · copy';at.list.splice(at.index+1,0,dup);studio.selectedSection=dup.id;}
  else if((action==='section-up'||action==='section-down')&&at){const to=at.index+(action==='section-up'?-1:1);if(to<0||to>=at.list.length)return;at.list.splice(to,0,at.list.splice(at.index,1)[0]);}
  else if(action==='section-uninherit'){delete presentationOwner().presentation.sections;}
  else return;
  try{D.validate(editor.draft,Workshop);studio.changeLabel=action==='section-remove'?'Removed popup section':'Arranged popup sections';markDirty();studio.changeLabel='';renderEditor();}
  catch(e){editor.draft=previous;studio.selectedSection=selectedBefore;renderEditor();error(e.message);}
 }
 function studioSampleFields(){
  const g=activeGoal(),nodes=editor.draft.sample.nodes;
  const type=g.sampleNode?'node':g.demo?'form':g.inlineDemo?'inline':'none';
  let html=select('studio-sample-type','Sample to insert',[['none','No sample'],['node','Outline fields'],['form','Form fields'],['inline','Written passage']],type,'data-studio-sample-type');
  if(type==='node'){
   const n=nodes.find(n=>n.id===g.sampleNode),fields=g.nodeFields||['title','opening',...(n?.type==='B'?[]:['closing'])];
   html+=select('author-sample-node','Sample piece',nodes.map(n=>[n.id,n.title||n.id]),g.sampleNode,bound('sampleNode'));
   html+=`<div class="studio-check-grid">${['title','opening','closing','notes','prose'].map(k=>`<label><input type="checkbox" data-studio-node-field="${k}"${fields.includes(k)?' checked':''}> ${esc(k)}</label>`).join('')}</div>`;
   if(n)html+=fields.map(k=>area('sample-'+k,k[0].toUpperCase()+k.slice(1),n[k]||'',`data-studio-sample-field="${k}"`,3)).join('');
  }
  if(type==='form'){
   html+=select('studio-sample-form','Form type',['character','block','change','world','connection','plot','reference','swatch'].map(k=>[k,k]),g.demo.form,'data-studio-sample-form');
   html+=Object.entries(g.demo.fields).map(([k,v])=>area('demo-'+k,k,v,bound('demo.fields.'+k),k==='text'||k==='notes'?3:2)).join('');
   html+=Object.entries(g.demo.selects||{}).map(([k,v])=>input('demo-select-'+k,k+' selection',v,bound('demo.selects.'+k))).join('');
  }
  if(type==='inline')html+=select('inline-node','Piece',nodes.map(n=>[n.id,n.title||n.id]),g.inlineDemo.id,bound('inlineDemo.id'))+select('inline-field','Field',['prose','opening','closing','notes','title'].map(k=>[k,k]),g.inlineDemo.field,bound('inlineDemo.field'))+area('inline-text','Writing',g.inlineDemo.text,bound('inlineDemo.text'),5);
  return html;
 }
 function studioPosition(){
  const v=effectivePresentation(),p=v.placement,g=activeGoal();
  return `${scopeSelect()}<h4>Popup</h4><p class="studio-help">Drag the popup’s grip or resize its right edge on the canvas.</p><div class="studio-presets">${[['dock','Dock'],['top-left','Top left'],['top-right','Top right'],['bottom-left','Bottom left'],['bottom-right','Bottom right'],['custom','Custom']].map(([mode,label])=>sbtn('position',label,`data-value="${mode}"${p.mode===mode?' aria-pressed="true"':''}`)).join('')}</div>${select('author-position','Position rule',[['dock','Stable dock'],['auto','Avoid target'],['target','Beside target'],['custom','Custom coordinates'],['top-left','Top left'],['top-right','Top right'],['bottom-left','Bottom left'],['bottom-right','Bottom right']],p.mode,sbind('placement.mode'))}<div class="two-fields">${snum('author-width','Width · px',p.width,'placement.width',220,700)}${snum('author-height','Max height · px',p.maxHeight,'placement.maxHeight',200,1400)}${snum('author-x','X',p.x,'placement.x',0,10000)}${snum('author-y','Y',p.y,'placement.y',0,10000)}${select('author-unit','Coordinates',[['percent','Percent'],['px','Pixels']],p.unit,sbind('placement.unit'))}${select('author-side','Target side',[['left','Left'],['right','Right'],['top','Above'],['bottom','Below']],p.side,sbind('placement.side'))}${snum('author-gap','Target gap · px',p.gap,'placement.gap',0,100)}</div><h4>Highlight</h4>${sbtn('pick-target',studio.pick==='target'?'Cancel picking':'Pick a control on canvas','',true)}${input('author-focus','Target',g.focus,bound('focus'))}${input('author-drop','Drop zone · optional',g.drop||'',bound('drop'))}${sbtn('pick-drop',studio.pick==='drop'?'Cancel picking':'Pick a drop zone')}<div class="two-fields">${select('target-policy','Target follows',[['auto','Relevant control or open form'],['exact','Exactly this selection']],g.targetPolicy||'auto',bound('targetPolicy'))}${snum('highlight-padding','Padding · px',v.overlay.padding,'overlay.padding',0,50)}${snum('highlight-radius','Corners · px',v.overlay.radius,'overlay.radius',0,40)}${snum('highlight-border','Border · px',v.overlay.border,'overlay.border',0,8)}</div>${scheck('author-highlight-enabled','Highlight visible',v.highlight,'highlight')}<h4>Color & overlay</h4><div class="studio-colors">${input('author-accent','Accent',v.style.accent,sbind('style.accent'),'color')}${input('author-background','Paper',v.style.background,sbind('style.background'),'color')}${input('author-highlight','Highlight',v.style.highlight,sbind('style.highlight'),'color')}${input('overlay-shade','Shade',v.overlay.shade,sbind('overlay.shade'),'color')}</div>${studioRange('author-dim','Background dimming',v.style.dim,'style.dim',0,.7,.05)}${studioRange('highlight-fill','Highlight fill',v.overlay.fill,'overlay.fill',0,.3,.01)}${snum('author-font','Text size · px',v.style.fontSize,'style.fontSize',11,22)}<h4>Small screens</h4><div class="two-fields">${select('author-mobile-edge','Dock',[['bottom','Bottom'],['top','Top']],v.mobile.edge,sbind('mobile.edge'))}${snum('author-mobile-height','Height · %',v.mobile.height,'mobile.height',25,55)}</div>${sbtn('inherit','Reset display overrides')}`;
 }
 function studioRange(name,label,value,path,min,max,step){return `<label class="field studio-range"><span>${esc(label)} <output>${value}</output></span><input type="range" name="${name}" min="${min}" max="${max}" step="${step}" value="${value}" ${sbind(path)}></label>`;}
 function studioTiming(){
  const v=effectivePresentation();
  return `${scopeSelect()}<h4>Writing</h4>${select('author-sample-mode','Sample entry',[['instant','Insert all at once'],['type','Write character by character']],v.sample.mode,sbind('sample.mode'))}${select('author-sample-trigger','Begin writing',[['click','When Insert sample is pressed'],['ready','When the target field is ready']],v.sample.trigger,sbind('sample.trigger'))}<div class="two-fields">${snum('author-speed','Characters / second',v.sample.charactersPerSecond,'sample.charactersPerSecond',5,200)}${snum('author-delay','Start delay · ms',v.sample.delay,'sample.delay',0,10000)}</div><div class="studio-type-demo" aria-label="Writing speed sample"><span data-studio-type-text>Try the timing here.</span></div>${sbtn('try-timing','Try writing speed')}<h4>Moving on</h4>${select('author-advance','Next action',[['manual','Wait for Next'],['after','After a reading delay']],v.advance.mode,sbind('advance.mode'))}${snum('author-advance-delay','Reading time · ms',v.advance.delay,'advance.delay',500,60000)}<p class="studio-help">Manual Next is the calm default. Completing an action never replaces its instruction immediately.</p><h4>Motion</h4><div class="two-fields">${Object.entries({panel:'Popup',highlight:'Highlight',insertion:'New pieces',stagger:'Between pieces',scroll:'Scrolling',completion:'Completion'}).map(([k,label])=>snum('motion-'+k,label+' · ms',v.motion[k],'motion.'+k,0,k==='stagger'?500:3000)).join('')}</div>${select('author-easing','Motion feel',['linear','ease','ease-in','ease-out','ease-in-out'].map(k=>[k,k]),v.motion.easing,sbind('motion.easing'))}${select('author-scroll','Scroll to target',[['instant','Only when needed · instant'],['smooth','Only when needed · smooth'],['none','Do not scroll automatically']],v.scroll,sbind('scroll'))}<p class="studio-help">System reduced-motion settings take priority over these animations.</p>`;
 }
 function studioButtons(){
  const v=effectivePresentation(),id=studio.selectedControl,c=v.controls[id];
  const b=k=>sbind('controls.'+id+'.'+k);
  return `${scopeSelect()}<p class="studio-help">Drag buttons between the outlined regions on the popup. Click one to edit its label and size.</p><div class="studio-button-picks">${Object.keys(v.controls).map(k=>sbtn('select-button',k==='pause'?'Close':k==='leave'?'My work':k[0].toUpperCase()+k.slice(1),`data-id="${k}" aria-pressed="${k===id}"`)).join('')}</div><h4>${esc(id==='pause'?'Close':id)} button</h4>${input('control-'+id+'-label','Label',c.label,b('label'))}${select('control-'+id+'-region','Region',[['header','Header'],['body-top','Above instruction'],['body-bottom','Below instruction'],['tools','Tools row'],['navigation','Navigation row']],c.region,b('region'))}<div class="two-fields">${input('control-'+id+'-order','Order',c.order,b('order')+' min="0" max="100"','number')}${select('control-'+id+'-align','Alignment',[['auto','Natural'],['start','Start'],['center','Center'],['end','End'],['stretch','Fill']],c.align||'auto',b('align'))}${input('control-'+id+'-width','Width · 0 = auto',c.width||0,b('width')+' min="0" max="500"','number')}${input('control-'+id+'-height','Min height · px',c.minHeight||34,b('minHeight')+' min="24" max="100"','number')}</div><label class="studio-check"><input type="checkbox" name="control-${id}-visible" ${b('visible')}${c.visible?' checked':''}${['next','pause'].includes(id)?' disabled':''}> Visible${['next','pause'].includes(id)?' · required for navigation':''}</label><div class="studio-inline">${button('control-up','Move earlier',`data-id="${id}"`)}${button('control-down','Move later',`data-id="${id}"`)}</div>${id==='next'?'<h4>Next button states</h4>'+Object.entries({stageLabel:'Last action in a stage',finishLabel:'End of tutorial',waitingLabel:'Waiting for the learner',resumeLabel:'Paused action'}).map(([k,label])=>input('control-next-'+k,label,c[k],b(k))).join(''):''}`;
 }
 function studioReveals(){
  const d=editor.draft,g=activeGoal(),catalog=TutorialEffects.catalog(d.sample),key=studio.collection;
  return `<p class="studio-help">Changes made directly on the page are saved at this action and carried forward. Build sample story edits the reusable source; the lanes below reveal its pieces.</p><div class="studio-inline">${button('edit-sample','Build sample story')}${sbtn('sample-view','See full sample')}</div><div class="studio-reveal-lanes">${SM.phases.map((phase,i)=>{const mem=SM.members(d,g,phase),count=Object.values(mem).reduce((a,b)=>a+b.length,0),entries=mem[key],shown=studio.revealExpanded[phase]?entries:entries.slice(0,3);return `<section class="studio-reveal-lane${studio.revealPhase===phase?' selected':''}" data-studio-drop="reveal" data-phase="${phase}"><header>${sbtn('phase', ['On entry','On completion','On Next'][i],`data-phase="${phase}" aria-pressed="${studio.revealPhase===phase}"`)}<span>${count} pieces</span>${count?sbtn('clear-reveal','×',`data-phase="${phase}" aria-label="Clear ${['entry','completion','Next'][i]} reveals"`):''}</header><div class="studio-lane-chips">${shown.map(id=>`<span class="studio-chip">${esc(catalog[key].find(x=>x.id===id)?.label||id)}<button type="button" data-studio="remove-reveal" data-phase="${phase}" data-key="${key}" data-id="${esc(id)}" aria-label="Remove ${esc(catalog[key].find(x=>x.id===id)?.label||id)} from this reveal">×</button></span>`).join('')}${entries.length>3?sbtn('expand-reveal',studio.revealExpanded[phase]?'Show less':`+ ${entries.length-3} more ${SM.names[key].toLowerCase()}`,`data-phase="${phase}"`):''}${!count?'<span class="studio-empty-lane">Drop a piece here</span>':!entries.length?'<span class="studio-empty-lane">No '+SM.names[key].toLowerCase()+' in this lane</span>':''}</div></section>`;}).join('')}</div><h4>Sample pieces</h4>${select('studio-collection','Type',Object.entries(SM.names),key,'data-studio-collection')}${input('studio-find-piece','Find a piece',studio.filter,'data-studio-filter placeholder="Search sample…" type="search"')}<div class="studio-catalog">${catalog[key].map(item=>`<div class="studio-catalog-item" data-studio-search="${esc(item.label.toLowerCase())}"${studio.filter&&!item.label.toLowerCase().includes(studio.filter.toLowerCase())?' hidden':''}><button type="button" class="studio-grip" data-studio-drag="reveal" data-key="${key}" data-id="${esc(item.id)}" aria-label="Drag ${esc(item.label)}">⠿</button><span>${esc(item.label)}</span><button type="button" class="studio-add-piece" data-studio="add-reveal" data-key="${key}" data-id="${esc(item.id)}" aria-label="Reveal ${esc(item.label)} on ${esc(studio.revealPhase)}">+</button></div>`).join('')||'<p class="studio-help">No sample pieces yet. Build the sample story first.</p>'}</div><p class="studio-help">The lanes affect this action only. The canvas’s “Completed” and “On Next” states show the expected sample result, not a learner’s saved progress.</p>`;
 }
 const studioRuleKinds=[['read','Read, then press Next'],['create','Create a piece or person'],['demo-node','Fill an outline field'],['edit','Revise a field'],['contains','Add a link'],['timed-change','Change a character over time'],['before','Put one piece before another'],['archived','Archive a piece'],['restored','Restore a piece'],['plot-created','Create a plot'],['plot-assigned','Assign a plot'],['plot-cycle','Visit a plot and return'],['reference','Add a reference'],['action','Use an app control'],['order','Reorder pieces'],['restore-order','Restore previous order'],['count','Increase a count'],['copy','Switch story']];
 function studioRules(){
  const d=editor.draft,g=activeGoal(),c=g.check,optional=arr=>[['','Keep current'],...arr],nodes=d.sample.nodes.map(n=>[n.id,n.title||n.id]),people=d.sample.characters.map(c=>[c.id,c.name]);
  const f={create:['entity','id','type','parent','character','blockKind'],'demo-node':['id','field'],edit:['entity','id','character','field'],contains:['entity','id','character','field','value'],'timed-change':['character','block','at'],before:['id','anchor','parent'],archived:['id'],restored:['id'],'plot-created':['label'],'plot-assigned':['id','label'],reference:['id'],action:['action','id'],count:['entity'],'restore-order':['from']}[c.kind]||[];
  const entities=c.kind==='count'?['nodes','characters','world','connections','plots','archive','swatches']:c.kind==='create'?['node','character','block','world','connection']:['node','character','block','change','world','connection'];
  const options={entity:entities.map(k=>[k,k]),type:[['','Any'],...['M','I','C','E','B'].map(k=>[k,Workshop.TYPES[k]?.name||k])],character:optional(people),action:CounterplotTutorial.actionNames().map(k=>[k,k])};
  let html=`<h4>Starting view</h4>${select('setup-page','Page',optional([['outline','Workbench'],['characters','Characters'],['world','World'],['connections','Connections'],['archive','Archive']]),g.setup.page||'',bound('setup.page'))}<div class="two-fields">${select('setup-mode','Workbench',optional([['outline','Outline'],['write','Write']]),g.setup.mode||(g.setup.write?'write':''),bound('setup.mode'))}${select('setup-inspector','Details',optional([['hidden','Hidden'],['side','Side'],['full','Full width']]),g.setup.inspector||'',bound('setup.inspector'))}</div>${select('setup-piece','Piece',optional(nodes),g.setup.piece||g.setup.reveal||'',bound('setup.piece'))}${select('setup-character','Character',optional(people),g.setup.character||'',bound('setup.character'))}${input('setup-time','Story moment · optional',g.setup.at||'',bound('setup.at'))}${select('setup-action','Open a control · optional',[['','None'],...CounterplotTutorial.actionNames().map(k=>[k,k])],g.setup.action||'',bound('setup.action'))}${input('setup-id','Control item ID · optional',g.setup.id||'',bound('setup.id'))}<h4>Complete when…</h4>${select('rule-kind','Learner action',studioRuleKinds,c.kind,'data-studio-rule-kind')}<div class="two-fields">${f.map(k=>options[k]?select('rule-'+k,k,options[k],c[k]??'',bound('check.'+k)):input('rule-'+k,k,c[k]??'',bound('check.'+k))).join('')}</div><p class="studio-help">Completion checks the saved story, not a “Done” checkbox. Use the canvas picker below to select an app control without typing its action name.</p>${sbtn('pick-rule','Pick completion control')}<h4>Exact rule</h4>${area('author-check','Completion data',JSON.stringify(c,null,2),bound('check','goal','data-json="yes"'),5)}`;
  return html;
 }
 function studioDetails(){return `<h3>Tutorial details</h3>${input('studio-title','Tutorial name',editor.draft.title,bound('title','tutorial'))}${area('studio-description','Description on the selection screen',editor.draft.description,bound('description','tutorial'),4)}<p class="studio-help">Stable ID: ${esc(editor.id)}. Save applies this definition; JSON and HTML exports include the complete tutorial.</p>${sbtn('details-done','Back to action')}`;}
 const studioContextNames={sections:'Popup sections',style:'Text appearance',sample:'Sample wording',placement:'Popup position',highlight:'Highlight',timing:'Writing & motion',controls:'Button properties',reveals:'Story reveals'};
 function studioTextAppearance(){
  const v=effectivePresentation();
  return `${scopeSelect()}${snum('author-font','Text size · px',v.style.fontSize,'style.fontSize',11,22)}<div class="two-fields">${input('author-accent','Accent',v.style.accent,sbind('style.accent'),'color')}${input('author-background','Paper',v.style.background,sbind('style.background'),'color')}</div>${scheck('author-showIntro','Show writeup',v.showIntro,'showIntro')}${scheck('author-showWhy','Show explanation',v.showWhy,'showWhy')}${scheck('author-showSample','Show sample wording',v.showSample,'showSample')}<p class="studio-help">Edit the actual words in the popup. These controls change its presentation.</p>`;
 }
 function studioPopupPosition(){
  const v=effectivePresentation(),p=v.placement;
  return `${scopeSelect()}<p class="studio-help">Drag the header grip. Drag the right edge to resize.</p><div class="studio-presets">${[['dock','Dock'],['top-left','Top left'],['top-right','Top right'],['bottom-left','Bottom left'],['bottom-right','Bottom right'],['custom','Custom']].map(([mode,label])=>sbtn('position',label,`data-value="${mode}"${p.mode===mode?' aria-pressed="true"':''}`)).join('')}</div><div class="two-fields">${snum('author-width','Width · px',p.width,'placement.width',220,700)}${snum('author-height','Max height · px',p.maxHeight,'placement.maxHeight',200,1400)}${snum('author-x','X',p.x,'placement.x',0,10000)}${snum('author-y','Y',p.y,'placement.y',0,10000)}</div>${select('author-unit','Coordinates',[['percent','Percent'],['px','Pixels']],p.unit,sbind('placement.unit'))}<h4>Small screens</h4><div class="two-fields">${select('author-mobile-edge','Dock',[['bottom','Bottom'],['top','Top']],v.mobile.edge,sbind('mobile.edge'))}${snum('author-mobile-height','Height · %',v.mobile.height,'mobile.height',25,55)}</div>`;
 }
 function studioHighlight(){
  const v=effectivePresentation(),g=activeGoal();
  return `${scopeSelect()}${sbtn('pick-target','Choose target on page','',true)}${scheck('author-highlight-enabled','Show highlight',v.highlight,'highlight')}${input('author-focus','Target',g.focus,bound('focus'))}${select('target-policy','Target follows',[['auto','Relevant control or open form'],['exact','Exactly this selection']],g.targetPolicy||'auto',bound('targetPolicy'))}${input('author-drop','Drop zone · optional',g.drop||'',bound('drop'))}${sbtn('pick-drop','Choose drop zone')}<div class="two-fields">${input('author-highlight','Color',v.style.highlight,sbind('style.highlight'),'color')}${snum('highlight-border','Border · px',v.overlay.border,'overlay.border',0,8)}${snum('highlight-padding','Padding · px',v.overlay.padding,'overlay.padding',0,50)}${snum('highlight-radius','Corners · px',v.overlay.radius,'overlay.radius',0,40)}</div>${studioRange('author-dim','Background dimming',v.style.dim,'style.dim',0,.7,.05)}${studioRange('highlight-fill','Highlight fill',v.overlay.fill,'overlay.fill',0,.3,.01)}`;
 }
 function studioChoose(kind){
  if(!studio||studio.playing)return;
  studio.selection=kind;studio.selectionKey=activeGoal().id;studio.contextPanel='';studio.panel='canvas';dialog.dataset.panel='canvas';
  studioContext();
 }
 function studioContext(){
  if(!studio||!dialog.open)return;
  const tools=dialog.querySelector('.studio-context-tools');if(!tools)return;
  const root=studio.frameReady?studio.frame.contentDocument?.querySelector('#tutorial-companion'):null;
  const contextual=!!studio.contextPanel;
  dialog.classList.toggle('studio-contextual',contextual);
  const inspector=dialog.querySelector('.studio-inspector');
  inspector.querySelector('.studio-rail-head strong').textContent=contextual?studioContextNames[studio.contextPanel]||'Properties':'Action settings';
  inspector.querySelector('.studio-tabs').hidden=contextual;
  // A selection never adds another permanent rail. It is dismissed with the
  // selection, and it never changes the page size, scale, or story data.
  tools.hidden=!(root&&!studio.popupHidden&&studio.selection&&studio.panel==='canvas'&&!studio.playing&&!studio.pick);
  if(!tools.hidden){
   const kind=studio.selection;
   const choices=kind==='text'?[['style','Style'],['timing','Typing'],['sample','Sample']]:[['sections','Sections'],['placement','Position'],['highlight','Highlight'],['controls','Buttons']];
   const html=`<span>${kind==='text'?'Text':'Popup'}</span>${choices.map(([section,label])=>sbtn('context',label,`data-section="${section}"`)).join('')}${sbtn('deselect','×','aria-label="Dismiss element tools"')}`;
   if(tools.dataset.kind!==kind){tools.innerHTML=html;tools.dataset.kind=kind;}
  }
  if(!root)return;
  const r=root.getBoundingClientRect(),vw=innerWidth,vh=innerHeight,top=studioTopInset(),gap=10;
  const place=(el,width,height)=>{
   let x,y;
   if(vw>=740&&r.left-width-gap>=8){x=r.left-width-gap;y=r.top;}
   else if(vw>=740&&r.right+width+gap<=vw-8){x=r.right+gap;y=r.top;}
   else{x=Math.max(8,Math.min(r.left,vw-width-8));y=r.top-height-gap>=top?r.top-height-gap:r.bottom+height+gap<=vh-8?r.bottom+gap:top;}
   el.style.left=Math.round(Math.max(8,Math.min(x,vw-width-8)))+'px';
   el.style.top=Math.round(Math.max(top,Math.min(y,vh-height-8)))+'px';
  };
  if(!tools.hidden)place(tools,tools.offsetWidth,tools.offsetHeight);
  if(contextual&&studio.panel==='settings'){
   // Readable property popover beside the object, not a viewport-shrinking sidebar.
   inspector.style.width=Math.min(340,vw-16)+'px';
   place(inspector,inspector.offsetWidth,inspector.offsetHeight);
  }else{inspector.style.removeProperty('left');inspector.style.removeProperty('top');inspector.style.removeProperty('width');}
 }
 function studioPanel(){
  if(studio.showDetails)return studioDetails();if(studio.contextPanel==='sections'||editor.tab==='sections')return studioSections();if(studio.contextPanel==='style')return studioTextAppearance();if(studio.contextPanel==='sample')return studioSampleFields();if(studio.contextPanel==='placement')return studioPopupPosition();if(studio.contextPanel==='highlight')return studioHighlight();return editor.tab==='copy'?studioWords():editor.tab==='placement'?studioPosition():editor.tab==='timing'?studioTiming():editor.tab==='controls'?studioButtons():editor.tab==='reveals'?studioReveals():editor.tab==='rules'?studioRules():advancedPanel();}
 function studioRender(){
  if(!editor)return;studioInit();studioRecord();
  const fresh=!dialog.querySelector('.studio-shell');
  if(fresh){
   dialog.className='visual-studio';
   dialog.innerHTML=`<div class="studio-shell">
    <div class="studio-viewport"><div class="studio-frame-wrap"><iframe id="studio-frame" title="Counterplot · tutorial edit mode" sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-downloads"></iframe></div><div class="studio-loading">Opening tutorial…</div></div>
    <header class="studio-head"><div class="studio-location"><h2 id="tutorial-editor-title">MGS3</h2><span class="studio-mode-label" title="Story edits and instructions are kept in this tutorial draft">Editing</span></div>
     <div class="studio-stage-location">${sbtn('panel','Stage 1.1 ▾','data-panel="stages" aria-label="Stages and actions"')}<span class="studio-current-title"></span></div>
     <div class="studio-head-actions"><div class="studio-undo">${sbtn('undo','↶','aria-label="Undo tutorial edit"')}${sbtn('redo','↷','aria-label="Redo tutorial edit"')}</div>${sbtn('panel','Settings','data-panel="settings" aria-label="Action settings"')}${sbtn('play','▶ Play','title="Try this action without changing your practice or stories"')}${sbtn('panel','•••','data-panel="menu" aria-label="Tutorial options and exports"')}<button type="button" class="btn primary" data-author="save">Save</button>${button('close','Done','aria-label="Close tutorial editor"')}</div>
    </header>
    <aside class="studio-stages studio-drawer" aria-label="Stages and actions"><div class="studio-rail-head"><strong>Stages & actions</strong>${button('add-stage','+ Stage')}${sbtn('panel','×','data-panel="canvas" aria-label="Close stages"')}</div><div class="studio-stage-list"></div><div class="studio-stage-actions">${button('stage-up','↑','aria-label="Move stage earlier"')}${button('stage-down','↓','aria-label="Move stage later"')}${sbtn('duplicate-stage','Duplicate stage')}${button('remove-stage','Remove stage')}</div><div class="studio-action-row"><div class="studio-action-list"></div>${button('add-step','+ Action')}</div><div class="studio-action-tools"><span class="studio-action-identity"></span><div>${button('step-up','←','aria-label="Move action earlier"')}${button('step-down','→','aria-label="Move action later"')}${button('duplicate-step','Duplicate')}${button('remove-step','Remove')}</div></div></aside>
    <aside class="studio-inspector studio-drawer" aria-label="Action settings"><div class="studio-rail-head"><strong>Action settings</strong>${sbtn('panel','×','data-panel="canvas" aria-label="Close settings"')}</div><nav class="studio-tabs" aria-label="Tutorial editor sections">${studioTabs.map(([id,label])=>`<button type="button" data-author="tab" data-tab="${id}">${label}</button>`).join('')}</nav><div class="studio-properties"></div></aside>
    <aside class="studio-menu studio-drawer" aria-label="Tutorial options"><strong>Show this action</strong><div class="studio-phase-controls">${[['enter','At start'],['complete','Completed'],['exit','On Next']].map(([p,label])=>sbtn('scene',label,`data-phase="${p}"`)).join('')}</div>${sbtn('details','Tutorial details')}${button('export','Export tutorial · JSON')}${button('export-playable','Export playable · HTML')}${sbtn('copy-tutorial','Save as a new tutorial…')}${sbtn('export-scene','Export visible story · JSON')}${sbtn('copy-to-work','Copy visible story to My work')}${sbtn('import-scene','Import revised story here…')}${sbtn('use-practice','Use current practice here…')}${button('import','Import tutorial')}${button('reset','Restore built-in')}<span id="tutorial-save-state" role="status"></span></aside>
    <button type="button" class="btn primary studio-show-popup" data-studio="show-popup" hidden>Show popup</button><div class="studio-context-tools" role="toolbar" aria-label="Selected tutorial element" hidden></div><div class="studio-canvas-message" role="status" hidden></div><div id="tutorial-author-error" role="alert" hidden></div>
   </div>`;
   studio.frame=$('#studio-frame');studio.resize=new ResizeObserver(()=>studioFit());studio.resize.observe(dialog.querySelector('.studio-viewport'));
  }
  const l=activeStage(),g=activeGoal();
  try{TS.setItem('counterplot.tutorial.cursor.'+editor.id+'.v1',JSON.stringify({stage:l.id,goal:g.id})).catch(()=>{});}catch{}
  if(studio.hiddenFor&&studio.hiddenFor!==g.id){studio.popupHidden=false;studio.hiddenFor='';}
  if(studio.selectionKey&&studio.selectionKey!==g.id){studio.selection='';studio.contextPanel='';studio.selectionKey='';}
  $('#tutorial-editor-title').textContent=editor.draft.title;
  dialog.dataset.panel=studio.panel;dialog.classList.toggle('studio-playing',studio.playing);
  for(const part of dialog.querySelectorAll('.studio-inspector,.studio-stages,.studio-action-row,.studio-action-tools'))part.inert=studio.playing;
  const rail=dialog.querySelector('.studio-stage-list'),railScroll=rail.scrollTop;
  rail.innerHTML=editor.draft.lessons.map((l,i)=>`<div class="studio-stage${i===editor.index?' active':''}" data-studio-drop="stage" data-index="${i}"><button type="button" class="studio-grip" data-studio-drag="stage" data-index="${i}" aria-label="Drag stage ${i+1}">⠿</button><button type="button" data-author="stage" data-index="${i}"${i===editor.index?' aria-current="step"':''}><small>${String(i+1).padStart(2,'0')}</small><span>${esc(l.title)}</span><em>${l.goals.length}</em></button></div>`).join('');rail.scrollTop=railScroll;
  if(studio.lastIndex!==editor.index){rail.querySelector('.active')?.scrollIntoView({block:'nearest'});studio.lastIndex=editor.index;}
  const strip=dialog.querySelector('.studio-action-list'),stripScroll=strip.scrollTop;
  strip.innerHTML=l.goals.map((g,j)=>`<div class="studio-action${j===editor.step?' active':''}" data-studio-drop="action" data-index="${j}"><button type="button" class="studio-grip" data-studio-drag="action" data-index="${j}" aria-label="Drag action ${j+1}">⠿</button><button type="button" data-author="step" data-index="${j}"${j===editor.step?' aria-current="step"':''}><b>${editor.index+1}.${j+1}</b><span>${esc(g.text)}</span></button></div>`).join('');strip.scrollTop=stripScroll;
  if(studio.lastStep!==editor.index+':'+editor.step){strip.querySelector('.active')?.scrollIntoView({block:'nearest',inline:'nearest'});studio.lastStep=editor.index+':'+editor.step;}
  dialog.querySelector('.studio-action-identity').textContent=`Stage ${editor.index+1} · Action ${editor.step+1} of ${l.goals.length}`;
  const props=dialog.querySelector('.studio-properties'),same=studio.propKey===editor.tab+':'+g.id+':'+studio.contextPanel,scroll=props.scrollTop;studio.propKey=editor.tab+':'+g.id+':'+studio.contextPanel;
  props.innerHTML=studioPanel();props.scrollTop=same?scroll:0;
  dialog.querySelectorAll('[data-author="tab"]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===editor.tab);b.setAttribute('aria-pressed',String(b.dataset.tab===editor.tab));});
  dialog.querySelectorAll('[data-studio="panel"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.panel===studio.panel)));
  dialog.querySelectorAll('[data-studio="scene"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.phase===studio.phase)));
  dialog.querySelector('[data-studio="play"]').textContent=studio.playing?'■ Back to edit':'▶ Play';
  dialog.querySelector('.studio-mode-label').textContent=studio.playing?'Playtest':'Editing';
  dialog.querySelector('.studio-stage-location [data-panel="stages"]').textContent=`Stage ${editor.index+1}.${editor.step+1} ▾`;
  dialog.querySelector('.studio-current-title').textContent=l.title;
  dialog.querySelector('.studio-current-title').title=l.title;
  for(const [action,disabled]of Object.entries({'add-stage':editor.draft.lessons.length>=D.limits.stages,'stage-up':editor.index===0,'stage-down':editor.index===editor.draft.lessons.length-1,'step-up':editor.step===0,'step-down':editor.step===l.goals.length-1,'remove-step':l.goals.length===1,'remove-stage':editor.draft.lessons.length===1,'add-step':l.goals.length>=30,'duplicate-step':l.goals.length>=30}))dialog.querySelectorAll(`[data-author="${action}"]`).forEach(b=>b.disabled=disabled);
  for(const el of dialog.querySelectorAll('[data-bind]'))el.dataset.loaded=el.type==='checkbox'?String(el.checked):el.value;
  for(const el of dialog.querySelectorAll('[data-json]'))el.dataset.untouched='true';
  $('#tutorial-save-state').textContent=editor.dirty?'Unsaved tutorial changes':'Saved definition loaded';studioUpdateHistory();
  studio.anchorIndex=editor.index;studio.anchorStep=editor.step;
  // The scene depends on the whole preceding sequence, not only the current action ID.
  // Imports, resets, moves, and raw edits must not leave stale story content in the canvas.
  const sceneData=JSON.stringify({starter:editor.draft.starter,sample:editor.draft.sample,assemblies:editor.draft.assemblies,steps:editor.draft.lessons.map(l=>l.goals.map(g=>({id:g.id,check:g.check,setup:g.setup,sampleNode:g.sampleNode,nodeFields:g.nodeFields,demo:g.demo,inlineDemo:g.inlineDemo,enter:g.enterAssemblies,complete:g.completeAssemblies,exit:g.exitAssemblies,storyEdits:g.storyEdits})))});
  const sceneKey=[editor.index,editor.step,g.id,studio.sceneVersion,studio.phase,studio.playing,studio.view,sceneData].join('|');
  if(sceneKey!==studio.sceneKey){studio.sceneKey=sceneKey;studioLoadFrame();}else studioSyncGuide();
  requestAnimationFrame(studioFit);
 }
 function studioDocument(d,workspace,progress){
  const doc=document.documentElement.cloneNode(true);
  doc.querySelectorAll('#tutorial-hub,#tutorial-companion,#tutorial-spotlight,#details-sheet,#tutorial-picker,#tutorial-preview-controls,.drag-ghost,[data-studio-bootstrap],[data-studio-frame-style],[data-test-bootstrap]').forEach(e=>e.remove());
  for(const id of ['app','dialog','toast','save-alert']){const el=doc.querySelector('#'+id);if(el){el.innerHTML='';el.removeAttribute('open');el.removeAttribute('style');}}
  doc.querySelector('#toast').className='';doc.querySelector('#save-alert').hidden=true;
  const body=doc.querySelector('body');body.className='';body.removeAttribute('style');
  const encode=x=>JSON.stringify(x).replace(/</g,'\\u003c');
  doc.querySelector('#tutorial-data').textContent=JSON.stringify({tutorials:[d]}).replace(/</g,'\\u003c');
  doc.querySelector('#embedded-workspace').textContent=encode(d.starter);
  const key=d.id==='mgs3'?'counterplot.tutorial.build.v2':'counterplot.tutorial.practice.'+d.id+'.v1';
  const seed={[key]:JSON.stringify(workspace),'counterplot.guide.library.v1':JSON.stringify(progress)};
  const boot=document.createElement('script');boot.type='application/json';boot.id='studio-seed';boot.dataset.studioBootstrap='true';boot.textContent=encode(seed);
  const nativeStyle=document.createElement('style');nativeStyle.dataset.studioFrameStyle='native';
  nativeStyle.textContent=`body.studio-native .topbar{visibility:hidden;height:var(--studio-head-height,61px)!important;min-height:var(--studio-head-height,61px)!important}
   @media(max-width:680px){body.studio-native .sidebar{display:block;padding:calc(var(--studio-head-height,90px) + 4px) 10px 7px}body.studio-native .sidebar>.brand,body.studio-native .sidebar>.mobile-brand{display:none}body.studio-native .sidebar nav{margin:0}body.studio-native .topbar{display:none!important;height:0!important;min-height:0!important}}`;
  doc.querySelector('head').append(boot,nativeStyle);body.classList.add(studio.playing?'studio-playtest':'studio-native');
  return '<!doctype html>\n'+doc.outerHTML;
 }
 function studioLoadFrame(){
  if(!studio?.frame)return;const s=studio,frame=s.frame,gen=++s.frameGeneration;
  const identity=[editor.id,activeGoal().id,s.phase,s.view,s.playing,s.pick].join(':');
  // Rebuilding the SAME action for Undo/Save must not jump back to the top or
  // switch World/Characters back to Outline. A different action uses its own setup.
  if(s.frameReady&&s.frameIdentity===identity&&!s.playing&&!s.pick&&!s.pendingView)s.pendingView=frame.contentWindow.CounterplotTutorial.editorView();
  s.frameIdentity=identity;s.frameReady=false;
  dialog.querySelector('.studio-loading').hidden=false;
  try{
   const d=D.validate(editor.draft,Workshop,sel=>document.querySelector(sel));
   let scene=SM.expectedScene(d,editor.index,editor.step,s.playing?'enter':s.phase);
   if(s.phase==='sample'&&!s.playing){scene.workspace=copy(d.starter);const p=copy(d.sample);p.id=scene.workspace.active;p.tutorialId=d.id;scene.workspace.projects=[p];scene.warnings=[];}
   Workshop.validate(scene.workspace);
   const progress=SM.playProgress(d,editor.index,editor.step,scene.workspace);
   if(s.playing){const pr=scene.workspace.projects.find(p=>p.id===scene.workspace.active);pr.tutorialSceneEdits=d.lessons.flatMap((l,i)=>l.goals.flatMap((g,j)=>i<editor.index||i===editor.index&&j<editor.step?['enter','complete','exit'].map(p=>g.id+':'+p):i===editor.index&&j===editor.step?[g.id+':enter']:[]));}
   if(!s.playing)progress.projects[d.id+':'+scene.workspace.active].running=false;
   frame.onload=()=>{
    if(studio!==s||gen!==s.frameGeneration)return;
    const fw=frame.contentWindow,fd=frame.contentDocument;
    if(!fw?.CounterplotGuide){error('The live canvas could not start. Your tutorial draft is still here.');dialog.querySelector('.studio-loading').hidden=true;return;}
    s.frameReady=true;dialog.querySelector('.studio-loading').hidden=true;
    if(!s.playing){try{
     const setupGoal=copy(activeGoal());
     if(s.phase!=='enter'){
      setupGoal.enterAssemblies=[];delete setupGoal.setup.action;delete setupGoal.setup.reference;
      const pr=scene.workspace.projects.find(p=>p.id===scene.workspace.active);
      for(const key of ['piece','reveal'])if(setupGoal.setup[key]&&!pr.nodes.some(n=>n.id===setupGoal.setup[key]))delete setupGoal.setup[key];
      if(setupGoal.setup.character&&!pr.characters.some(c=>c.id===setupGoal.setup.character))delete setupGoal.setup.character;
      // Completion can remove its own target; do not re-run an entry-only prerequisite.
      setupGoal.check={kind:'action',action:'projects'};
     }
     fw.CounterplotTutorial.prepare(setupGoal,copy(editor.draft));
    }catch(e){scene.warnings.push(e.message);}studioSetFrameView();studioSyncGuide();}
    studioWireFrame(fw,fd);if(s.pendingView){fw.CounterplotTutorial.restoreEditorView?.(s.pendingView);s.pendingView=null;}if(s.pendingForm){fw.CounterplotTutorial.restoreForm(s.pendingForm);s.pendingForm=null;}if(s.playing)studioPlayerChrome();if(s.pick)studioPickChrome();studioMessage(scene.warnings.length?'Scene note: '+[...new Set(scene.warnings)].join(' '):'');studioFit();
   };
   frame.srcdoc=studioDocument(d,scene.workspace,progress);studioFit();
  }catch(e){studioMessage('Cannot render this draft yet: '+e.message);dialog.querySelector('.studio-loading').hidden=true;}
 }
 function studioMessage(text){const el=dialog.querySelector('.studio-canvas-message');if(el){el.textContent=text;el.hidden=!text;}}
 function studioFit(){
  if(!studio||!dialog.open)return;
  const viewport=dialog.querySelector('.studio-viewport');if(!viewport?.clientWidth)return;
  // Match the actual browser viewport. There is deliberately no fit-to-canvas,
  // transform, zoom, fake device frame, panning, or double layer of app chrome.
  studio.scale=1;studio.frameWidth=viewport.clientWidth;studio.frameHeight=viewport.clientHeight;
  Object.assign(studio.frame.style,{width:'100%',height:'100%',transform:'none'});
  const fd=studio.frame.contentDocument,topbar=fd?.querySelector('.topbar'),head=dialog.querySelector('.studio-head');
  const left=topbar?Math.round(topbar.getBoundingClientRect().left):innerWidth>1190?206:innerWidth>980?180:innerWidth>680?166:0;
  dialog.style.setProperty('--studio-sidebar',Math.max(0,left)+'px');
  const height=studio.playing||studio.pick?Math.ceil(topbar?.getBoundingClientRect().bottom)||61:Math.ceil(head.getBoundingClientRect().height)||61;
  dialog.style.setProperty('--studio-head-height',height+'px');
  if(fd?.documentElement)fd.documentElement.style.setProperty('--studio-head-height',height+'px');
  studioPopupVisibility();studioContext();
 }
 // Play/picking uses the real app toolbar, including Undo, Redo and export.
 // Reuse its breadcrumb slot for returning; do not cover controls with an author bar.
 function studioPlayerChrome(){
  if(!studio?.frameReady)return;const fd=studio.frame.contentDocument,crumb=fd?.querySelector('.topbar .breadcrumb');
  if(!crumb||(!studio.playing&&!studio.pick))return;
  let back=crumb.querySelector('[data-studio-frame-return]');
  if(!back){back=fd.createElement('button');back.type='button';back.dataset.studioFrameReturn='';back.className='btn';back.style.cssText='white-space:nowrap;font-size:12px;min-height:30px;max-width:none';crumb.replaceChildren(back);}
  const label=studio.playing?'← Back to edit':'Cancel picking';if(back.textContent!==label)back.textContent=label;
  back.setAttribute('aria-label',studio.playing?'Back to tutorial editor':'Cancel target selection');
 }
 function studioSetFrameView(){
  if(!studio?.frameReady||studio.view==='action')return;
  studio.frame.contentWindow.CounterplotTutorial.studioView?.(studio.view);
 }
 function studioSyncGuide(resetSections=false){
  if(!studio?.frameReady||studio.playing)return;
  try{studio.frame.contentWindow.CounterplotGuide.preview(copy(editor.draft),editor.index,editor.step,{studio:true,completed:['complete','exit'].includes(studio.phase),resetSections});studioDecorate();}catch(e){studioMessage('Popup note: '+e.message);}
 }
 function studioDecorate(){
  if(!studio?.frameReady||studio.playing)return;const fd=studio.frame.contentDocument,root=fd.querySelector('#tutorial-companion');if(!root)return;
  fd.body.classList.add('studio-frame-editing');fd.body.classList.toggle('studio-frame-buttons',editor.tab==='controls');
  if(!fd.querySelector('[data-studio-frame-style="editing"]')){
   const style=fd.createElement('style');style.dataset.studioFrameStyle='editing';style.textContent=`
    body.studio-native .topbar{visibility:hidden;height:var(--studio-head-height,61px)!important;min-height:var(--studio-head-height,61px)!important}
    .studio-popup-hidden #tutorial-companion,.studio-popup-hidden #tutorial-spotlight{visibility:hidden!important;pointer-events:none!important}
    .studio-popup-hidden.tutorial-docked #app{margin-right:0}
    .studio-frame-editing #tutorial-companion{outline:1px solid #70997d;overflow:visible!important}
    .studio-frame-editing #tutorial-companion .guide-body{overflow:auto}
    .studio-frame-editing .guide-section{position:relative}.studio-section-handle{position:absolute;right:0;top:0;z-index:3;opacity:0;border:1px solid #b9cab6;border-radius:4px;background:#fffdf5;color:#2e5141;cursor:grab;touch-action:none;width:24px;height:25px}.guide-section:hover>.studio-section-handle,.studio-section-handle:focus{opacity:1}.studio-section-drop{outline:2px solid #48765b!important}.studio-frame-editing [data-studio-text]{border-radius:3px;cursor:text;outline:1px solid transparent;white-space:pre-wrap}
    .studio-frame-editing [data-studio-text]:hover{outline:1px dashed #70997d}
    .studio-frame-editing [data-studio-text]:focus{outline:2px solid #467554;background:#fffff8}
    [data-studio-handle=panel]{position:absolute;left:-28px;top:12px;width:28px;height:40px;border:1px solid #517962;background:#f5f7ed;color:#2e5141;border-radius:7px 0 0 7px;cursor:grab;touch-action:none}
    [data-studio-handle=resize]{position:absolute;right:-7px;top:40%;width:14px;height:54px;color:#567d63;font:17px system-ui;border:2px solid #567d63;border-radius:8px;background:#fffdf5;cursor:ew-resize;touch-action:none}
    .studio-frame-buttons [data-guide]{cursor:grab;touch-action:none}
    .studio-frame-buttons .guide-control-group{display:flex!important;outline:1px dashed #61806a;min-height:32px;padding:3px;border-radius:4px}
    .studio-frame-buttons .guide-control-group:empty:after{content:attr(aria-label);font:11px system-ui;color:#627563;display:block;min-height:24px}
    .studio-pick-hover{outline:3px solid #2e805a!important;outline-offset:3px}
    .studio-control-selected{box-shadow:0 0 0 3px #e5b967!important}
    .studio-drop-region{background:#e0ebdc!important;outline:2px solid #50795e!important}
    .studio-frame-editing #tutorial-companion .guide-message{display:none}
    .studio-frame-editing #tutorial-companion header>span{font-size:12px;letter-spacing:.8px}
    .studio-frame-editing:not(.studio-frame-buttons) #tutorial-companion [data-guide=edit],.studio-frame-editing:not(.studio-frame-buttons) #tutorial-companion [data-guide=leave],.studio-frame-editing:not(.studio-frame-buttons) #tutorial-companion [data-guide=close]{display:none}
    .studio-frame-editing #tutorial-companion .guide-body>small{display:none}
    .studio-action-inline{display:flex;align-items:center;gap:5px;margin-top:10px;padding-top:8px;border-top:1px solid var(--line,#ddd)}
    .studio-action-inline span{flex:1;font:11px var(--mono,monospace);color:var(--muted,#65755c)}
    .studio-action-inline button{min-width:32px;min-height:32px;border:1px solid #d2dbc6;border-radius:5px;background:#fafcf2;color:#2e5141;padding:4px 8px;font:12px system-ui;cursor:pointer}
    .studio-action-inline button:disabled{opacity:.35;cursor:default}
    .studio-frame-editing #guide-select{cursor:pointer}
    .studio-frame-editing .guide-instruction p{min-height:1.5em}
    body.studio-native #tutorial-companion{--guide-dim:0}

    .studio-frame-editing #tutorial-companion header>span{max-width:55%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .studio-frame-editing #tutorial-companion header{position:relative;padding-left:36px}
    .studio-frame-editing #tutorial-companion>header>[data-studio-handle]{left:5px;top:8px;width:24px;height:28px;border-radius:4px;background:transparent;color:inherit;border-color:currentColor}
    .studio-frame-editing .guide-control{max-width:100%}
   `;fd.head.append(style);
  }
  const makeText=(el,path,scope,id='')=>{if(!el)return;el.contentEditable='plaintext-only';el.dataset.studioText=path;el.dataset.studioScope=scope;if(id)el.dataset.studioSection=id;el.setAttribute('role','textbox');el.setAttribute('aria-label','Edit '+path);el.spellcheck=true;el.dataset.studioOriginal=el.textContent;};
  makeText(root.querySelector('h2'),'title','stage');
  for(const section of SS.flatten(studioSectionList()).map(x=>x.section)){
   const node=root.querySelector(`[data-section-id="${CSS.escape(section.id)}"]`);if(!node)continue;
   const info=({writeup:['intro','stage'],explanation:['why','stage'],action:['text','goal'],text:['text','section']})[section.kind];
   if(info)makeText(node.querySelector(`[data-section-body="${CSS.escape(section.id)}"]`),...info,section.id);
   makeText(node.querySelector(`[data-section-title="${CSS.escape(section.id)}"]`),'title','section',section.id);
   if(!node.querySelector(':scope > [data-studio-section-handle]')){const handle=fd.createElement('button');handle.type='button';handle.textContent='⠿';handle.dataset.studioSectionHandle=section.id;handle.className='studio-section-handle';handle.title='Drag to reorder · click for section controls';handle.setAttribute('aria-label','Arrange '+(section.title||'section'));node.prepend(handle);}
  }
  if(!root.querySelector('[data-studio-handle=panel]')){const grip=fd.createElement('button');grip.type='button';grip.textContent='⠿';grip.dataset.studioHandle='panel';grip.setAttribute('aria-label','Drag popup');grip.title='Drag popup · use arrow keys to nudge';root.querySelector('header').append(grip);const resize=fd.createElement('button');resize.type='button';resize.dataset.studioHandle='resize';resize.textContent='⋮';resize.setAttribute('aria-label','Resize popup');root.append(resize);}
  const groups=[...root.querySelectorAll('.guide-control-group')],regions=['header','body-top','body-bottom','tools','navigation'];
  groups.forEach((group,i)=>{group.dataset.region=regions[i];group.setAttribute('aria-label',regions[i]+' buttons');});
  root.querySelectorAll('[data-guide]').forEach(b=>{
   let id=b.dataset.controlId||b.dataset.guide;if(id==='resume'||id==='waiting')id='next';if(!D.buttonDefaults[id])return;b.dataset.studioControl=id;b.disabled=false;b.classList.toggle('studio-control-selected',editor.tab==='controls'&&studio.selectedControl===id);
   b.title=editor.tab!=='controls'&&id==='pause'?'Hide popup · Alt-click to edit this button':editor.tab!=='controls'&&['next','back'].includes(id)?(id==='next'?'Next action':'Previous action')+' · Alt-click to edit this button':'Edit '+id+' button'+(editor.tab==='controls'?' · drag to a different region':'');
  });
  const status=fd.querySelector('#save-status');if(status)status.textContent='Story edits join the tutorial draft';
  const title=root.querySelector('header>span');if(title)title.textContent=editor.draft.title+' · EDITING';
  const choose=root.querySelector('#guide-select');if(choose)choose.disabled=false;
  const instruction=root.querySelector('.guide-instruction > .guide-section-heading');
  if(instruction&&!instruction.querySelector('[data-studio-local]')){
   const add=fd.createElement('button');add.type='button';add.dataset.studioLocal='add';
   add.textContent='+ Action';add.setAttribute('aria-label','Add action');add.disabled=activeStage().goals.length>=30;
   add.style.cssText='float:right;padding:1px 5px;border:1px solid #cdd8c2;background:transparent;color:#2e5141;border-radius:4px;font:11px system-ui;cursor:pointer';
   instruction.append(add);
  }
  studioContext();
  // Hidden controls can still be selected from the inspector. Navigation remains available in the real player.
 }
 function studioFrameField(el){
  const owner=el.dataset.studioScope==='section'?SS.find(studioOwnSections(),el.dataset.studioSection):el.dataset.studioScope==='stage'?activeStage():activeGoal(),path=el.dataset.studioText;
  if(!owner)return;
  if(el.dataset.studioOriginal===el.textContent||owner[path]===el.textContent)return;
  owner[path]=el.textContent;el.dataset.studioOriginal=el.textContent;studioReflectWords();markDirty('canvas:'+path);studioRecord('canvas:'+path);
  const field=dialog.querySelector(`[data-bind="${path}"][data-scope="${el.dataset.studioScope}"]`);if(field){field.value=owner[path];field.dataset.loaded=field.value;}
 }
 function studioWireFrame(fw,fd){
  const s=studio;
  fd.addEventListener('close',()=>{if(studio===s&&!s.playing&&!s.pick)studioStoreDraft();},true);
  fd.addEventListener('counterplot:edit',e=>{if(studio===s)studioCaptureStory(e.detail);});
  fd.addEventListener('input',e=>{if(studio!==s||s.playing||s.pick||e.target.closest('[data-tutorial-ui]'))return;clearTimeout(s.canvasTimer);s.storyGroup=e.target.dataset.inline?'story:'+e.target.dataset.inline+':'+e.target.dataset.id+':'+e.target.dataset.field:'story-form';s.canvasTimer=setTimeout(()=>{if(studio===s){studioFlushCanvas(false);studioStoreDraft();}},350);});
  fd.addEventListener('focusout',e=>{if(studio===s&&!s.playing&&!s.pick&&e.target.dataset.inline){studioFlushCanvas(false);s.lastGroup='';}});
  fd.addEventListener('beforeinput',e=>{if(studio!==s||s.playing||s.pick||!['historyUndo','historyRedo'].includes(e.inputType)||e.target.closest('input,textarea,[contenteditable]:not([contenteditable="false"])'))return;e.preventDefault();e.stopImmediatePropagation();studioUndo(e.inputType==='historyRedo');},true);
  // Responsive rendering and ordinary app saves can replace the whole toolbar,
  // without dispatching a user action. Keep the return control in that toolbar.
  s.frameObserver?.disconnect();s.frameObserver=new MutationObserver(()=>{
   if(studio!==s||(!s.playing&&!s.pick))return;
   if(!fd.querySelector('.topbar .breadcrumb [data-studio-frame-return]')){studioPlayerChrome();studioFit();}
  });s.frameObserver.observe(fd.querySelector('#app'),{childList:true,subtree:true});

  fd.addEventListener('change',e=>{if(studio!==s||s.playing||e.target.id!=='guide-select')return;e.preventDefault();e.stopImmediatePropagation();if(!commit())return;editor.index=Number(e.target.value);editor.step=0;s.view='action';s.phase='enter';s.panel='canvas';renderEditor();},true);
  fd.addEventListener('counterplot:action',()=>{if(studio!==s)return;requestAnimationFrame(()=>{if(studio===s){if(s.playing||s.pick)studioPlayerChrome();else studioDecorate();studioFit();}});});
  fd.addEventListener('focusin',e=>{if(studio!==s||s.playing)return;if(e.target.closest('[data-studio-text]'))studioChoose('text');},true);
  fd.addEventListener('scroll',()=>{if(studio===s)studioContext();},true);
  fd.addEventListener('input',e=>{const el=e.target.closest('[data-studio-text]');if(el&&!s.playing){e.stopPropagation();studioFrameField(el);}},true);
  fd.addEventListener('blur',e=>{if(e.target.matches?.('[data-studio-text]')&&!s.playing){studioFrameField(e.target);}},true);
  fd.addEventListener('keydown',e=>{
   if(studio!==s)return;
   if(e.key==='Escape'&&s.pick){e.preventDefault();e.stopImmediatePropagation();studioTogglePick('');return;}
   if(e.key==='Escape'&&!s.playing&&(s.selection||s.panel!=='canvas')){e.preventDefault();e.stopImmediatePropagation();s.selection='';s.contextPanel='';s.panel='canvas';dialog.dataset.panel='canvas';studioContext();return;}
   const handle=e.target.closest('[data-studio-handle]');
   if(handle&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&!s.playing){e.preventDefault();e.stopImmediatePropagation();const root=fd.querySelector('#tutorial-companion'),r=root.getBoundingClientRect(),v=effectivePresentation(),delta=e.shiftKey?10:1;
    if(handle.dataset.studioHandle==='resize')studioSet('placement.width',Math.max(220,Math.min(700,r.width+(e.key==='ArrowLeft'?-delta:delta))));
    else studioSetPosition(r.left+(e.key==='ArrowLeft'?-delta:e.key==='ArrowRight'?delta:0),r.top+(e.key==='ArrowUp'?-delta:e.key==='ArrowDown'?delta:0),r.width,r.height,fw.innerWidth,fw.innerHeight);
    markDirty();studioSyncGuide();return;
   }
   if(!s.playing&&(e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='s'){e.preventDefault();e.stopImmediatePropagation();saveEditor();}
   if(!s.playing&&(e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'&&!e.target.closest('input,textarea,[contenteditable]:not([contenteditable="false"])')){e.preventDefault();e.stopImmediatePropagation();studioUndo(e.shiftKey);}
  },true);
  fd.addEventListener('pointermove',e=>{
   if(!s.pick||s.playing||s.frameDrag)return;s.hover?.classList.remove('studio-pick-hover');s.hover=e.target.closest('[data-action],[data-nav],[data-node],[data-inline],input,button,select,textarea,[data-drop]')||e.target;
   if(!s.hover.closest('#tutorial-companion'))s.hover.classList.add('studio-pick-hover');
  },true);
  fd.addEventListener('pointerdown',e=>{
   const handle=e.target.closest('[data-studio-section-handle]');if(!handle||s.playing||e.button>0)return;
   e.preventDefault();e.stopImmediatePropagation();if(!commit())return;
   s.sectionDrag={id:handle.dataset.studioSectionHandle,x:e.clientX,y:e.clientY,started:false};handle.setPointerCapture?.(e.pointerId);
  },true);
  fd.addEventListener('pointermove',e=>{const d=s.sectionDrag;if(!d)return;if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>6)d.started=true;if(!d.started)return;e.preventDefault();fd.querySelectorAll('.studio-section-drop').forEach(x=>x.classList.remove('studio-section-drop'));const target=fd.elementFromPoint(e.clientX,e.clientY)?.closest('[data-section-id]');if(target&&target.dataset.sectionId!==d.id)target.classList.add('studio-section-drop');},true);
  fd.addEventListener('pointerup',e=>{const d=s.sectionDrag;if(!d)return;s.sectionDrag=null;e.preventDefault();e.stopImmediatePropagation();fd.querySelectorAll('.studio-section-drop').forEach(x=>x.classList.remove('studio-section-drop'));
   if(d.started){const target=fd.elementFromPoint(e.clientX,e.clientY)?.closest('[data-section-id]');if(target)try{SS.move(studioOwnSections(),d.id,target.dataset.sectionId,false);studioSectionChanged('Reordered popup sections');renderEditor();}catch(err){error(err.message);}}
   else studioSectionCommand('select-section',d.id);
   s.sectionClickUntil=Date.now()+250;
  },true);
  fd.addEventListener('pointercancel',()=>s.sectionDrag=null,true);
  fd.addEventListener('pointerdown',e=>{
   if(studio!==s)return;
   if(s.playing)return;
   const root=e.target.closest('#tutorial-companion');
   if(s.pick&&!root){e.preventDefault();e.stopImmediatePropagation();return;}
   const handle=e.target.closest('[data-studio-handle]'),control=e.target.closest('[data-studio-control]');
   if(handle||(control&&editor.tab==='controls')){
    e.preventDefault();e.stopImmediatePropagation();const panel=fd.querySelector('#tutorial-companion'),r=panel.getBoundingClientRect();
    s.frameDrag={kind:handle?.dataset.studioHandle||'control',id:control?.dataset.studioControl,x:e.clientX,y:e.clientY,left:r.left,top:r.top,width:r.width,height:r.height,started:false,el:handle||control};
    try{(handle||control).setPointerCapture(e.pointerId);}catch{}return;
   }
   if(s.pick&&!root){e.preventDefault();e.stopImmediatePropagation();}
  },true);
  fd.addEventListener('pointermove',e=>{
   const d=s.frameDrag;if(!d||studio!==s)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.hypot(dx,dy)>3)d.started=true;if(!d.started)return;e.preventDefault();
   const root=fd.querySelector('#tutorial-companion');
   if(d.kind==='panel'){root.style.left=Math.max(12,Math.min(fw.innerWidth-d.width-12,d.left+dx))+'px';root.style.top=Math.max(studioTopInset(),Math.min(fw.innerHeight-d.height-12,d.top+dy))+'px';root.style.transition='none';}
   else if(d.kind==='resize')root.style.width=Math.max(220,Math.min(700,fw.innerWidth-24,d.width+dx))+'px';
   else {const group=fd.elementFromPoint(e.clientX,e.clientY)?.closest('[data-region]');fd.querySelectorAll('.studio-drop-region').forEach(x=>x.classList.remove('studio-drop-region'));group?.classList.add('studio-drop-region');}
  },true);
  fd.addEventListener('pointerup',e=>{
   const d=s.frameDrag;if(!d||studio!==s)return;s.frameDrag=null;
   if(d.started){e.preventDefault();e.stopImmediatePropagation();s.suppressClick=true;setTimeout(()=>s.suppressClick=false,100);const root=fd.querySelector('#tutorial-companion'),r=root.getBoundingClientRect();
    if(d.kind==='panel')studioSetPosition(r.left,r.top,r.width,r.height,fw.innerWidth,fw.innerHeight);
    else if(d.kind==='resize')studioSet('placement.width',Math.round(r.width));
    else {const target=fd.elementFromPoint(e.clientX,e.clientY),group=target?.closest('[data-region]');if(group)studioMoveControl(d.id,group.dataset.region,target.closest('[data-studio-control]')?.dataset.studioControl);}
    fd.querySelectorAll('.studio-drop-region').forEach(x=>x.classList.remove('studio-drop-region'));if(d.kind!=='control')studioChoose('popup');markDirty('drag');renderEditor();
   }else if(d.kind==='control'){s.selectedControl=d.id;renderEditor();}else{studioChoose('popup');}
  },true);
  fd.addEventListener('pointercancel',()=>{if(s.frameDrag){s.frameDrag=null;studioSyncGuide();}},true);
  fd.addEventListener('click',e=>{
   if(e.target.closest('[data-studio-section-handle]')||Date.now()<(s.sectionClickUntil||0)){e.preventDefault();e.stopImmediatePropagation();return;}
   if(studio!==s)return;
   if(e.target.closest('[data-studio-frame-return]')){e.preventDefault();e.stopImmediatePropagation();if(s.playing)studioStopPlay();else studioTogglePick('');return;}
   if(s.playing){if(e.target.closest('[data-guide="edit"],[data-guide="leave"],[data-tutorial="browse"],[data-tutorial="leave"]')){e.preventDefault();e.stopImmediatePropagation();studioStopPlay();}return;}
   if(s.suppressClick){e.preventDefault();e.stopImmediatePropagation();return;}
   const text=e.target.closest('[data-studio-text]');if(text)return;
   const control=e.target.closest('[data-studio-control]');if(control){e.preventDefault();e.stopImmediatePropagation();if(!commit())return;
    if(editor.tab!=='controls'&&!e.altKey&&control.dataset.studioControl==='pause'){studioSetPopup(true);return;}
    if(editor.tab!=='controls'&&!e.altKey&&['next','back'].includes(control.dataset.studioControl)){studioLocal(control.dataset.studioControl==='next'?'next':'previous');return;}
    s.selectedControl=control.dataset.studioControl;editor.tab='controls';s.selection='popup';s.selectionKey=activeGoal().id;s.contextPanel='controls';s.panel='settings';renderEditor();return;}
   const local=e.target.closest('[data-studio-local]');if(local){e.preventDefault();e.stopImmediatePropagation();studioLocal(local.dataset.studioLocal);return;}
   const root=e.target.closest('#tutorial-companion');if(root){if(e.target.closest('summary,#guide-select'))return;e.preventDefault();e.stopImmediatePropagation();studioChoose('popup');return;}
   if(!s.pick&&e.target.closest('[data-action="import"]')){e.preventDefault();e.stopImmediatePropagation();if(commit()){studioStoryFile.value='';studioStoryFile.click();}return;}
   const historyControl=e.target.closest('[data-action="undo"],[data-action="redo"]');
   if(!s.pick&&historyControl){e.preventDefault();e.stopImmediatePropagation();studioUndo(historyControl.dataset.action==='redo');return;}
   if(!s.pick&&e.target.closest('[data-action="projects"],[data-tutorial="browse"],[data-tutorial="leave"]')){e.preventDefault();e.stopImmediatePropagation();studioMessage('Use Done to return to your story shelf. These edits belong to this tutorial.');return;}
   if(!s.pick){s.selection='';s.contextPanel='';if(s.panel!=='canvas'){s.panel='canvas';dialog.dataset.panel='canvas';}studioContext();return;}
   e.preventDefault();e.stopImmediatePropagation();
   const sel=selectorFor(e.target),a=e.target.closest('[data-action]');
   if(s.pick==='drop')activeGoal().drop=sel;
   else if(s.pick==='rule'){if(!a){studioMessage('Choose an app button or command for this completion rule.');return;}activeGoal().check={kind:'action',action:a.dataset.action,...(a.dataset.id?{id:a.dataset.id}:{})};editor.tab='rules';}
   else{activeGoal().focus=sel;activeGoal().targetPolicy='exact';editor.tab='placement';}
   s.contextPanel=s.pick==='rule'?'':'highlight';s.selection='popup';s.selectionKey=activeGoal().id;s.pick='';s.hover?.classList.remove('studio-pick-hover');studioPickChrome();markDirty('target');studioMessage('');s.panel='settings';renderEditor();
  },true);
 }
 function studioLocal(action){
  if(!commit())return;
  if(action==='settings'){studio.panel='settings';renderEditor();return;}
  if(action==='add'){dialog.querySelector('[data-author="add-step"]').click();return;}
  const l=activeStage();
  if(action==='next'){if(editor.step<l.goals.length-1)editor.step++;else if(editor.index<editor.draft.lessons.length-1){editor.index++;editor.step=0;}}
  else if(action==='previous'){if(editor.step>0)editor.step--;else if(editor.index>0){editor.index--;editor.step=activeStage().goals.length-1;}}
  studio.view='action';studio.phase='enter';studio.panel='canvas';renderEditor();
 }

 function studioSet(path,value){const owner=presentationOwner();owner.presentation||={};setPath(owner.presentation,path,value);}
 function studioTopInset(){return Math.max(12,(parseFloat(dialog.style.getPropertyValue('--studio-head-height'))||61)+12);}
 function studioSetPosition(x,y,w,h,vw,vh){
  if(vw<1180){studioSet('mobile.edge',y<vh/2-h/2?'top':'bottom');return;}
  studioSet('placement.mode','custom');studioSet('placement.unit','percent');studioSet('placement.x',Math.round(Math.max(0,Math.min(100,(x-12)/Math.max(1,vw-w-24)*100))*10)/10);studioSet('placement.y',Math.round(Math.max(0,Math.min(100,(y-studioTopInset())/Math.max(1,vh-h-studioTopInset()-12)*100))*10)/10);
 }
 function studioMoveControl(id,region,before){
  const cs=effectivePresentation().controls,ids=Object.keys(cs).filter(k=>k!==id&&cs[k].region===region).sort((a,b)=>cs[a].order-cs[b].order);let at=ids.indexOf(before);if(at<0)at=ids.length;ids.splice(at,0,id);ids.forEach((key,i)=>{studioSet('controls.'+key+'.region',region);studioSet('controls.'+key+'.order',i);});
 }
 function studioPopupVisibility(){
  if(!studio?.frameReady)return;
  const hidden=studio.popupHidden&&!studio.playing&&!studio.pick,fd=studio.frame.contentDocument;
  fd.body.classList.toggle('studio-popup-hidden',hidden);
  const show=dialog.querySelector('.studio-show-popup');if(show){show.hidden=!hidden;const tray=fd.querySelector('.tray'),r=tray?.getBoundingClientRect();show.style.bottom=(r&&r.height&&r.top>0?Math.max(12,innerHeight-r.top+10):12)+'px';}
 }
 function studioSetPopup(hidden){
  studio.popupHidden=hidden;studio.hiddenFor=hidden?activeGoal().id:'';
  studio.selection='';studio.contextPanel='';studio.panel='canvas';dialog.dataset.panel='canvas';
  studioPopupVisibility();studioContext();
 }
 function studioTogglePick(kind){
  const next=studio.pick===kind?'':kind;if(next&&!studio.pick)studio.pickReturnPanel=studio.panel;
  studio.pick=next;studio.hover?.classList.remove('studio-pick-hover');studio.panel=next?'canvas':studio.pickReturnPanel||'canvas';dialog.dataset.panel=studio.panel;studioMessage(next?'Choose '+(kind==='drop'?'a drop zone':kind==='rule'?'the app command that completes this action':'a control to highlight')+' in the workspace. Escape cancels.':'');studioPickChrome();if(!next)renderEditor();
 }
 function studioPickChrome(){
  if(!studio?.frameReady)return;const fd=studio.frame.contentDocument;
  fd.body.classList.toggle('studio-native',!studio.pick&&!studio.playing);
  fd.body.classList.toggle('studio-picking',!!studio.pick);dialog.classList.toggle('studio-picking',!!studio.pick);
  if(studio.pick)studioPlayerChrome();
  studioFit();
 }
 function studioStopPlay(){studio.playing=false;studio.sceneVersion++;renderEditor();}
 function studioNudgeStatus(text){const el=$('#tutorial-save-state');if(el)el.textContent=text;}
 function studioReflectWords(){
  const title=dialog.querySelector('.studio-stage.active [data-author=stage] span'),action=dialog.querySelector('.studio-action.active [data-author=step] span');
  if(title)title.textContent=activeStage().title;if(action)action.textContent=activeGoal().text;
  const heading=dialog.querySelector('#tutorial-editor-title');if(heading)heading.textContent=editor.draft.title;
  const current=dialog.querySelector('.studio-current-title');if(current){current.textContent=activeStage().title;current.title=activeStage().title;}
  const option=studio?.frameReady&&!studio.playing?studio.frame.contentDocument?.querySelector('#guide-select')?.options[editor.index]:null;if(option)option.textContent=(editor.index+1)+'. '+activeStage().title;
 }
 function studioInput(e){
  if(!studio||!editor)return;const el=e.target;
  if(el.matches('[data-section-field]')){
   if(!studioFlushCanvas())return;const item=SS.find(studioOwnSections(),studio.selectedSection),key=el.dataset.sectionField;if(!item)return;
   const value=el.type==='checkbox'?el.checked:el.value;if(item[key]===value)return;item[key]=value;
   if(key==='collapsible'&&value)item.heading=true;if(key==='heading'&&!value)item.collapsible=false;
   studioSectionChanged('Edited popup section');if(['expanded','heading','collapsible'].includes(key))studioSyncGuide(true);if(['kind','heading','collapsible'].includes(key))renderEditor();return;
  }
  if(el.matches('[data-studio-filter]')){studio.filter=el.value;dialog.querySelectorAll('[data-studio-search]').forEach(x=>x.hidden=!x.dataset.studioSearch.includes(el.value.toLowerCase()));return;}
  if(el.matches('[data-studio-sample-field]')){const n=editor.draft.sample.nodes.find(x=>x.id===activeGoal().sampleNode);if(n){n[el.dataset.studioSampleField]=el.value;markDirty('sample');studioRecord('sample');}return;}
  if(el.matches('[data-bind]')&&!el.dataset.json){
   if(!commit())return;if(['presentation.placement.x','presentation.placement.y'].includes(el.dataset.bind)){studioSet('placement.mode','custom');markDirty('position');}studioReflectWords();studioRecord('field:'+el.dataset.bind);el.dataset.loaded=el.type==='checkbox'?String(el.checked):el.value;
   el.closest('.studio-range')?.querySelector('output')?.replaceChildren(document.createTextNode(el.value));
   clearTimeout(studioTimer);studioTimer=setTimeout(()=>{if(!studio)return;if(el.dataset.bind.startsWith('setup.')||el.dataset.bind.startsWith('check.')||el.dataset.bind==='sampleNode'){studio.sceneVersion++;studio.sceneKey='';studioLoadFrame();}else studioSyncGuide();},160);
  }
 }
 function studioChange(e){
  if(!studio||!editor)return;const el=e.target;
  if(el.matches('[data-section-parent]')){if(!commit())return;const list=studioOwnSections();try{SS.move(list,studio.selectedSection,el.value,!!el.value);studioSectionChanged('Nested popup section');renderEditor();}catch(e){error(e.message);}return;}
  if(el.matches('[data-studio-view]')){studio.view=el.value;studio.viewChanged=true;studioSetFrameView();dialog.querySelector('[data-studio="use-view"]')?.toggleAttribute('hidden',studio.view==='action');studioSyncGuide();return;}
  if(el.matches('[data-studio-collection]')){if(!commit())return;studio.collection=el.value;renderEditor();return;}
  if(el.matches('[data-studio-node-field]')){if(!commit())return;activeGoal().nodeFields=[...dialog.querySelectorAll('[data-studio-node-field]:checked')].map(e=>e.dataset.studioNodeField);if(!activeGoal().nodeFields.length)activeGoal().nodeFields=['title'];markDirty();renderEditor();return;}
  if(el.matches('[data-studio-sample-type]')){
   if(!commit())return;const g=activeGoal(),kind=el.value,first=editor.draft.sample.nodes[0];
   if((kind==='node'||kind==='inline')&&!first){renderEditor();error('Build at least one sample outline piece first. Your existing sample has been kept.');return;}
   delete g.sampleNode;delete g.nodeFields;delete g.demo;delete g.inlineDemo;
   if(kind==='node'){g.sampleNode=first.id;g.nodeFields=['title'];}
   if(kind==='inline')g.inlineDemo={id:first.id,field:'prose',text:first.prose||''};
   if(kind==='form')g.demo={form:'character',fields:{name:'New character',identity:''},selects:{}};
   markDirty();renderEditor();return;
  }
  if(el.matches('[data-studio-sample-form]')){
   if(!commit())return;const form=el.value;
   const fields={character:{name:'New character',identity:''},block:{text:''},change:{text:'',reason:''},world:{name:'New setting',notes:''},connection:{label:'',notes:''},plot:{label:'A',title:''},reference:{title:'',note:''},swatch:{name:'New color',hex:'#2e5141'}};
   activeGoal().demo={form,fields:fields[form],selects:form==='world'?{type:'place'}:{}};markDirty();renderEditor();return;
  }
  if(el.matches('[data-studio-rule-kind]')){
   if(!commit())return;const kind=el.value,id=activeGoal().sampleNode||editor.draft.sample.nodes[0]?.id||'new-piece',person=editor.draft.sample.characters[0]?.id||'new-person';
   const defaults={create:{entity:'node',id:'new-piece',type:'C',parent:''},'demo-node':{entity:'node',id,field:'opening'},edit:{entity:'node',id,field:'title'},contains:{entity:'node',id,field:'cast',value:person},'timed-change':{character:person,block:editor.draft.sample.characters[0]?.blocks[0]?.id||'block',at:id+':close'},before:{id,anchor:editor.draft.sample.nodes[1]?.id||'anchor',parent:''},archived:{id},restored:{id},'plot-created':{label:'A'},'plot-assigned':{id,label:'A'},reference:{id},action:{action:'projects'},count:{entity:'nodes'},'restore-order':{from:''}};
   activeGoal().check={kind,...defaults[kind]};markDirty();studio.sceneVersion++;renderEditor();return;
  }
 }
 dialog.addEventListener('input',studioInput);
 dialog.addEventListener('change',studioChange);
 dialog.addEventListener('click',async e=>{
  const b=e.target.closest('[data-studio]');if(!b||b.disabled||!editor)return;e.preventDefault();const a=b.dataset.studio;
  if(a==='undo'||a==='redo'){studioUndo(a==='redo');return;}
  if(!commit())return;studioRecord();
  if(a==='sections'||a==='select-section'||a.startsWith('section-')){studioSectionCommand(a,b.dataset.id);return;}
  if(a==='copy-to-work'){
   if(!commit()||!studio.frameReady)return;
   const scene=studio.frame.contentWindow.CounterplotTutorial.snapshot();
   if(!await studioStoreDraft())return;
   if(await CounterplotSession.copyToMyWork(scene)){await closeEditor();}return;
  }
  if(a==='export-scene'){
   const w=studio.frame.contentWindow.CounterplotTutorial.snapshot();download(JSON.stringify(w,null,2),editor.draft.title+' — Visible story.json');return;
  }
  if(a==='import-scene'){studioStoryFile.value='';studioStoryFile.click();return;}
  if(a==='use-practice'){
   if(!CounterplotSession.isPractice()){error('Open a saved tutorial practice story first, then edit its tutorial.');return;}
   if(confirm('Use the currently open practice story at this tutorial action? This adds your story edits to the tutorial draft without changing the saved practice.'))studioImportStory(CounterplotTutorial.snapshot());return;
  }
  if(a==='copy-tutorial'){
   const title=prompt('Name your independent tutorial:',editor.draft.title+' · My version');if(!title?.trim())return;
   try{const sourceEditor=editor,sourceStudio=studio,d=copy(editor.draft),index=editor.index,step=editor.step;d.id='tutorial-'+Workshop.uid();d.title=title.trim();d.revision='custom-1';const valid=D.validate(d,Workshop,s=>document.querySelector(s));await storeDefinition(valid);if(editor!==sourceEditor||studio!==sourceStudio)return;if(await studioStoreDraft()===false||editor!==sourceEditor||studio!==sourceStudio)return;studioDispose();editor=null;openEditor(valid.id,index,step);}
   catch(err){error('Could not save the tutorial copy: '+err.message);}return;
  }
  if(a==='show-popup'){studioSetPopup(false);return;}
  if(a==='panel'){if(b.dataset.panel==='settings'&&studio.popupHidden)studioSetPopup(false);const contextual=!!studio.contextPanel;studio.contextPanel='';studio.selection='';studio.showDetails=false;studio.panel=b.dataset.panel==='settings'&&contextual?'settings':studio.panel===b.dataset.panel?'canvas':b.dataset.panel;dialog.dataset.panel=studio.panel;dialog.querySelectorAll('[data-studio="panel"]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.panel===studio.panel)));if(studio.panel==='settings')renderEditor();else requestAnimationFrame(studioFit);return;}
  if(a==='context'){studio.contextPanel=b.dataset.section;studio.panel='settings';studio.showDetails=false;editor.tab=({style:'placement',sample:'copy',highlight:'placement'})[b.dataset.section]||b.dataset.section;renderEditor();return;}
  if(a==='deselect'){studio.selection='';studio.contextPanel='';studioContext();return;}
  if(a==='play'){
   if(studio.playing){studioStopPlay();return;}
   try{D.validate(editor.draft,Workshop,s=>document.querySelector(s));}catch(err){error(err.message);return;}
   studio.playing=true;studio.selection='';studio.contextPanel='';studio.pick='';studio.view='action';studio.panel='canvas';studio.sceneVersion++;renderEditor();return;
  }
  if(a==='scene'){studio.phase=b.dataset.phase;studio.pick='';studio.panel='canvas';studio.sceneVersion++;renderEditor();return;}
  if(a==='position'){studioSet('placement.mode',b.dataset.value);markDirty();renderEditor();return;}
  if(a==='inherit'){delete presentationOwner().presentation;if(editor.scope==='all')editor.draft.presentation=copy(D.defaults);markDirty();renderEditor();return;}
  if(a==='pick-target'||a==='pick-drop'||a==='pick-rule'){studioTogglePick(a==='pick-target'?'target':a==='pick-drop'?'drop':'rule');return;}
  if(a==='select-button'){studio.selectedControl=b.dataset.id;renderEditor();return;}
  if(a==='duplicate-stage'){try{SM.duplicateStage(editor.draft,editor.index);editor.index++;editor.step=0;markDirty();renderEditor();}catch(err){error(err.message);}return;}
  if(a==='phase'){studio.revealPhase=b.dataset.phase;renderEditor();return;}
  if(a==='add-reveal'||a==='remove-reveal'){
   try{SM.editReveal(editor.draft,activeGoal(),b.dataset.phase||studio.revealPhase,b.dataset.key,b.dataset.id,a==='add-reveal');markDirty();studio.sceneVersion++;renderEditor();}catch(err){error(err.message);}return;
  }
  if(a==='clear-reveal'){activeGoal()[b.dataset.phase]=[];markDirty();studio.sceneVersion++;renderEditor();return;}
  if(a==='expand-reveal'){studio.revealExpanded[b.dataset.phase]=!studio.revealExpanded[b.dataset.phase];renderEditor();return;}
  if(a==='sample-view'){studio.phase=studio.phase==='sample'?'enter':'sample';studio.sceneVersion++;renderEditor();return;}
  if(a==='use-view'){
   const view=studio.view;if(view==='action')return;activeGoal().setup.page=['write','outline'].includes(view)?'outline':view==='arc'?'characters':view;
   if(['write','outline'].includes(view)){activeGoal().setup.mode=view;delete activeGoal().setup.write;}
   if(view==='characters'||view==='arc'){const cid=studio.frame.contentWindow.CounterplotTutorial.status().character;if(cid)activeGoal().setup.character=cid;}
   else delete activeGoal().setup.character;
   if(!['write','outline'].includes(view)){delete activeGoal().setup.piece;delete activeGoal().setup.reveal;}
   markDirty();studioNudgeStatus('Starting view updated · Save to apply');return;
  }
  if(a==='details'||a==='details-done'){studio.contextPanel='';studio.selection='';studio.showDetails=a==='details';studio.panel='settings';renderEditor();return;}
  if(a==='try-timing'){
   clearInterval(studio.demoTimer);const v=effectivePresentation(),out=dialog.querySelector('[data-studio-type-text]'),text='Every story starts with a choice.';out.textContent='';let i=0;
   setTimeout(()=>{if(!out.isConnected)return;if(v.sample.mode==='instant'||matchMedia('(prefers-reduced-motion:reduce)').matches){out.textContent=text;return;}studio.demoTimer=setInterval(()=>{if(!out.isConnected||i>=text.length){clearInterval(studio?.demoTimer);return;}out.textContent=text.slice(0,++i);},1000/v.sample.charactersPerSecond);},v.sample.delay);return;
  }
  if(a==='focus-guide'){studio.panel='canvas';dialog.dataset.panel='canvas';studio.frame.contentDocument?.querySelector('#tutorial-companion')?.focus();return;}

 });
 dialog.addEventListener('beforeinput',e=>{if(!studio||!['historyUndo','historyRedo'].includes(e.inputType)||e.target.closest('input,textarea,[contenteditable]:not([contenteditable="false"])'))return;e.preventDefault();e.stopPropagation();studioUndo(e.inputType==='historyRedo');});
 dialog.addEventListener('keydown',e=>{
  if(!studio)return;
  if(e.key==='Escape'&&(studio.panel!=='canvas'||studio.selection)){e.preventDefault();e.stopPropagation();studio.panel='canvas';studio.selection='';studio.contextPanel='';dialog.dataset.panel='canvas';studioContext();return;}
  const inField=e.target.matches?.('input,textarea,select,[contenteditable]');
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();e.stopPropagation();saveEditor();return;}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!inField){e.preventDefault();e.stopPropagation();studioUndo(e.shiftKey);}
  if(e.key==='Escape'&&studio.pick){e.preventDefault();e.stopPropagation();studioTogglePick('');}
  const grip=e.target.closest('[data-studio-drag]');
  if(grip&&(e.altKey||e.ctrlKey)&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){
   e.preventDefault();if(!commit())return;const type=grip.dataset.studioDrag,from=Number(grip.dataset.index),delta=['ArrowUp','ArrowLeft'].includes(e.key)?-1:1;
   if(type==='stage'&&SM.moveStage(editor.draft,from,from+delta)){editor.index=from+delta;editor.step=0;}
   else if(type==='action'&&SM.moveGoal(editor.draft,editor.index,from,editor.index,from+delta))editor.step=from+delta;
   else return;markDirty();renderEditor();dialog.querySelector(`[data-studio-drag="${type}"][data-index="${from+delta}"]`)?.focus();
  }
 });
 function studioEndDrag(){if(!studio)return;studio.drag?.ghost?.remove();dialog.querySelectorAll('.studio-drop-active').forEach(x=>x.classList.remove('studio-drop-active'));studio.drag=null;}
 dialog.addEventListener('pointerdown',e=>{
  const grip=e.target.closest('[data-studio-drag]');if(!grip||e.button>0||!studio||studio.playing)return;
  if(!commit())return;
  studio.drag={kind:grip.dataset.studioDrag,index:Number(grip.dataset.index),key:grip.dataset.key,id:grip.dataset.id,el:grip,x:e.clientX,y:e.clientY,started:false};
  grip.setPointerCapture?.(e.pointerId);
 });
 dialog.addEventListener('pointermove',e=>{
  const d=studio?.drag;if(!d)return;if(!d.started&&Math.hypot(e.clientX-d.x,e.clientY-d.y)>5){d.started=true;d.ghost=document.createElement('div');d.ghost.className='studio-drag-ghost';d.ghost.textContent=d.kind==='stage'?editor.draft.lessons[d.index].title:d.kind==='action'?activeStage().goals[d.index].text:d.el.parentElement.textContent.replace(/[⠿+]/g,'');dialog.append(d.ghost);}
  if(!d.started)return;e.preventDefault();Object.assign(d.ghost.style,{left:e.clientX+12+'px',top:e.clientY+12+'px'});
  const hit=document.elementFromPoint(e.clientX,e.clientY),drop=hit?.closest('[data-studio-drop]');
  dialog.querySelectorAll('.studio-drop-active').forEach(x=>x.classList.remove('studio-drop-active'));
  if(drop&&(drop.dataset.studioDrop===d.kind||d.kind==='action'&&drop.dataset.studioDrop==='stage'))drop.classList.add('studio-drop-active');
  const rail=hit?.closest('.studio-stage-list,.studio-catalog,.studio-properties,.studio-action-list');if(rail){const r=rail.getBoundingClientRect();rail.scrollTop+=e.clientY<r.top+36?-12:e.clientY>r.bottom-36?12:0;}
 },{passive:false});
 dialog.addEventListener('pointerup',e=>{
  const d=studio?.drag;if(!d)return;const drop=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-studio-drop]');studioEndDrag();if(!d.started||!drop)return;e.preventDefault();
  try{
   if(d.kind==='stage'&&drop.dataset.studioDrop==='stage'){const id=activeStage().id;SM.moveStage(editor.draft,d.index,Number(drop.dataset.index));editor.index=editor.draft.lessons.findIndex(l=>l.id===id);}
   else if(d.kind==='action'&&['action','stage'].includes(drop.dataset.studioDrop)){
    const toStage=drop.dataset.studioDrop==='stage'?Number(drop.dataset.index):editor.index,to=drop.dataset.studioDrop==='stage'?editor.draft.lessons[toStage].goals.length:Number(drop.dataset.index);
    if(!SM.moveGoal(editor.draft,editor.index,d.index,toStage,to)){error('Keep at least one action per stage and no more than 30.');return;}editor.index=toStage;editor.step=Math.min(to,activeStage().goals.length-1);
   }else if(d.kind==='section'&&drop.dataset.studioDrop==='section'){SS.move(studioOwnSections(),d.id,drop.dataset.id||'',false);}
   else if(d.kind==='reveal'&&drop.dataset.studioDrop==='reveal'){SM.editReveal(editor.draft,activeGoal(),drop.dataset.phase,d.key,d.id,true);studio.sceneVersion++;}
   else return;markDirty('drag');renderEditor();
  }catch(err){error(err.message);}
 });
 dialog.addEventListener('pointercancel',studioEndDrag);
