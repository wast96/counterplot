/* The guide observes saved actions. MGS3 demonstrates writing automatically; Next stays learner-controlled. */
(() => {
 'use strict';
 const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const bridge=window.CounterplotTutorial, sessions=window.CounterplotSession, library=window.CounterplotTutorialLibrary;
 const key='counterplot.guide.library.v1';
 let definition=library.definition('mgs3')||library.definition(library.list()[0]?.id), state={version:3,projects:{}}, lastSaved='',storageOkay=true;
 let message='',generation=0,busy=false,internal=false,frame=0,checking=false,preview=null,suspended=false,signature='',abortSample=null;
 let lastPosition=null,placementToken='',currentTarget=null,autoTimer=0,autoSampleToken='',autoNextToken='',scrollAnimation=0;
 const panelStates=new Map();
 const root=document.createElement('aside'),spot=document.createElement('div');
 root.id='tutorial-companion';root.dataset.tutorialUi='guide';root.setAttribute('aria-label','MGS3 tutorial guide');
 spot.id='tutorial-spotlight';spot.setAttribute('aria-hidden','true');spot.innerHTML='<i></i><i></i><i></i><i></i><b></b>';
 document.body.append(spot,root);
 const snapshot=()=>bridge.snapshot();
 function enabled(){return sessions.isPractice()&&!suspended;}
 function migrate(old){
  const result={version:3,projects:{}};
  for(const[id,r]of Object.entries(old.projects||{})){
   // Legacy numeric action keys predate the new reading introduction. Translate
   // against the original tasks before adding the welcome completion/cursor.
   const hasWelcome=definition.id==='mgs3'&&definition.lessons[0]?.goals[0]?.id==='mgs3-welcome';
   const translate=k=>{for(const l of definition.lessons){const goals=hasWelcome?l.goals.filter(g=>g.id!=='mgs3-welcome'):l.goals;for(let i=0;i<goals.length;i++)if(k===l.id+':'+i)return l.id+':'+goals[i].id;}return k;};
   const done=(r.done||[]).map(translate),index=Math.max(0,Math.min(definition.lessons.length-1,old.index||0));
   const baselines=Object.fromEntries(Object.entries(r.baselines||{}).map(([k,v])=>[translate(k),v]));
   if(hasWelcome&&(index>0||done.length||Object.keys(baselines).length)&&!done.includes('build-c:mgs3-welcome'))done.push('build-c:mgs3-welcome');
   const next=definition.lessons[index].goals.findIndex(g=>!done.includes(definition.lessons[index].id+':'+g.id));
   result.projects[id]={index,goal:Math.max(0,next),cursorVersion:1,open:old.open!==false,running:true,done,baselines,samples:{},events:{},visitedPlots:{}};
  }
  return result;
 }
 try{
  lastSaved=CounterplotTutorialStore.getItem(key)||'';
  if(lastSaved){const old=JSON.parse(lastSaved);if(old.version!==3||!old.projects||Array.isArray(old.projects))throw Error('Unsupported progress format');state=old;}
  else{
   const previous=CounterplotTutorialStore.getItem('counterplot.guide.mgs3.build.v3');if(previous){const parsed=JSON.parse(previous);if(parsed.version===3&&parsed.projects)state={version:3,projects:Object.fromEntries(Object.entries(parsed.projects).map(([id,r])=>['mgs3:'+id,r]))};}
   // Sandboxed/embedded previews can use an opaque URL (about:srcdoc).
   // That is not a storage failure: migrate the current path and only add the
   // historical sibling path when a hierarchical base URL is available.
   const candidates=[location.pathname];
   try{candidates.push(new URL('./tutorial/MGS3 — Counterplot tutorial.html',document.baseURI||location.href).pathname);}catch{}
   for(const path of candidates){const old=CounterplotTutorialStore.getItem('counterplot.guide.mgs3.build.v2.'+path);if(old&&!previous){const migrated=migrate(JSON.parse(old));state={version:3,projects:Object.fromEntries(Object.entries(migrated.projects).map(([id,r])=>['mgs3:'+id,r]))};break;}}
  }
 }catch{storageOkay=false;message='The saved tutorial progress could not be read. It has not been overwritten. Export your practice story before starting a new run.';}
 function record(){
  if(preview)return preview.record||=( {index:preview.index,goal:preview.step,open:true,running:false,done:[],baselines:{},samples:{},events:{},visitedPlots:{}} );
  if(!sessions.isPractice())return {index:0,goal:0,open:false,running:false,done:[],baselines:{},samples:{},events:{},visitedPlots:{}};
  const id=definition.id+':'+bridge.activeId();
  if(!state.projects[id])state.projects[id]={index:0,goal:0,open:true,running:true,done:[],baselines:{},samples:{},events:{},visitedPlots:{}};
  const r=state.projects[id];
  if(!r.cursorVersion&&definition.id==='mgs3'&&definition.lessons[0]?.goals[0]?.id==='mgs3-welcome'){
   const oldWork=r.index>0||Object.keys(r.baselines||{}).some(k=>k.startsWith('build-c:build-c-action-'))||(r.done||[]).some(k=>k.startsWith('build-c:build-c-action-'));
   if(oldWork){if(r.index===0)r.goal=(r.goal||0)+1;r.done||=[];if(!r.done.includes('build-c:mgs3-welcome'))r.done.push('build-c:mgs3-welcome');}r.cursorVersion=1;
  }
  r.index=Math.max(0,Math.min(Number.isInteger(r.index)?r.index:0,definition.lessons.length-1));
  r.goal=Math.max(0,Math.min(Number.isInteger(r.goal)?r.goal:0,definition.lessons[r.index].goals.length-1));
  for(const k of ['baselines','samples','events','visitedPlots'])if(!r[k]||typeof r[k]!=='object'||Array.isArray(r[k]))r[k]={};
  if(!Array.isArray(r.done))r.done=[];return r;
 }
 function lesson(){return preview?.lesson||definition.lessons[record().index];}
 function goal(){return preview?.goal||lesson().goals[record().goal];}
 function token(){return lesson().id+':'+goal().id;}
 function display(){const v=TutorialDefinition.presentation(preview?.definition||definition,lesson(),goal());if(goal().check.kind==='read')v.highlight=false;return v;}
 let progressWriter=null;
 function persist(){
  if(!storageOkay)return false;
  try{
   if(!progressWriter)progressWriter=TutorialStorage.writer(CounterplotTutorialStore,key,lastSaved,status=>{
    lastSaved=status.acknowledged;
    if(!status.pending&&!status.error&&enabled())schedule();
    if(status.error){storageOkay=false;message='Tutorial progress could not be saved. Keep this tab open and export a backup.';render();}
   });
   const r=record();if(sessions.isPractice()){r.stageId=lesson().id;r.goalId=goal().id;r.cursorVersion=1;}
   return progressWriter.queue(JSON.stringify(state));
  }catch(error){console.warn('Tutorial progress save failed:',error);storageOkay=false;message='Tutorial progress could not be saved. Your open work is still here; export a backup before closing.';return false;}
 }
 async function retryProgress(){
  if(!progressWriter)return false;
  progressWriter.queue(JSON.stringify(state));const okay=await progressWriter.retry();
  if(okay){storageOkay=true;message='Tutorial progress saved.';render();}return okay;
 }
 function visible(el){return !!el&&el.isConnected&&el.getBoundingClientRect().width>0&&el.getBoundingClientRect().height>0&&getComputedStyle(el).visibility!=='hidden';}
 function action(name,id,extra={}){return $$('[data-action="'+name+'"]').find(e=>visible(e)&&(id===undefined||e.dataset.id===id)&&Object.entries(extra).every(([k,v])=>e.dataset[k]===v));}
 function selectTarget(selector){
  try{
   const choices=$$(selector).filter(visible),active=$('#dialog[open]');
   if(active&&choices.some(el=>active.contains(el)))return choices.find(el=>active.contains(el));
   // Repeated actions exist in the cast dock and in page headers. Prefer the
   // working surface, rather than pointing behind the guide at a sidebar copy.
   return choices.find(el=>el.closest('#main'))||choices[0]||null;
  }catch{return null;}
 }
 function matchesForm(g){
  if(!g.demo)return null;
  const f=$('#dialog[open] form[data-form="'+g.demo.form+'"]');if(!f)return null;
  const d=f.dataset,c=g.check;
  if(['character','world','connection','plot'].includes(g.demo.form)&&d.contextId)return null;
  if(g.demo.form==='block'&&(d.contextCid!==c.character||d.contextBid||d.contextKindId!==c.blockKind))return null;
  if(g.demo.form==='change'&&(d.contextCid!==c.character||d.contextBid!==c.block))return null;
  if(g.demo.form==='reference'&&(d.contextType!=='node'||d.contextId!==c.id))return null;
  return f;
 }
 function sampleSpec(g=goal()){
  const d=preview?.definition||definition;
  if(g.sampleNode){const n=d.sample.nodes.find(n=>n.id===g.sampleNode);if(!n)return [];return (g.nodeFields||['title','opening',...(n.type==='B'?[]:['closing'])]).map(field=>({label:field,text:n[field]||'',selector:`[data-inline="node"][data-id="${CSS.escape(n.id)}"][data-field="${field}"]`}));}
  if(g.demo)return Object.entries(g.demo.fields).map(([name,text])=>({label:name,text,selector:`#dialog form[data-form="${g.demo.form}"] [name="${name}"]`}));
  if(g.inlineDemo){const d=g.inlineDemo;return [{label:d.field,text:d.text,selector:`textarea[data-id="${CSS.escape(d.id)}"][data-field="${d.field}"]`}];}
  return [];
 }
 function sampleReady(){
  if(preview||!record().running)return false;const g=goal();if(g.demo&&!matchesForm(g))return false;
  const fields=sampleSpec();return fields.length>0&&fields.every(f=>!!selectTarget(f.selector));
 }
 function findTarget(){
  const g=goal();let el=selectTarget(g.focus),dialog=$('#dialog[open]');if(g.targetPolicy==='exact')return el;
  if(g.sampleNode){
   if(g.check.kind==='create'){
    const item=snapshot().projects.find(p=>p.id===bridge.activeId())?.nodes.find(n=>n.id===g.check.id);
    if(item)el=selectTarget(sampleSpec()[0]?.selector)||el;
    else if(dialog)el=action('create-piece',g.check.type)||el;
   }
  }
  const form=matchesForm(g);
  if(form)el=form.querySelector('[type="submit"]')||form;
  else if(g.demo?.form==='block'&&dialog)el=action('choose-kind',g.picker)||el;
  else if(g.demo?.form==='change'&&dialog)el=action('choose-change-block',g.picker)||el;
  if(g.check.kind==='contains'&&dialog?.querySelector('form[data-form="links"]'))el=dialog.querySelector('[type="submit"]');
  if(g.inlineDemo)el=selectTarget(sampleSpec()[0]?.selector)||el;
  if(dialog&&(!el||!dialog.contains(el))){
   el=dialog.querySelector(g.check.kind==='edit'?'[name="'+CSS.escape(g.check.field)+'"]':'[data-action="new-plot"],[data-action="new-reference"],form [type="submit"]')||dialog.querySelector('.dialog-body');
  }
  return visible(el)?el:null;
 }
 function mount(){
  const parent=$('#dialog[open]')||$('#details-sheet[open]')||document.body;
  if(root.parentElement!==parent)parent.append(spot,root);
 }
 function removeLayout(){
  for(const c of ['tutorial-active','tutorial-open','tutorial-docked','tutorial-small','tutorial-mobile-top'])document.body.classList.remove(c);
  document.body.style.removeProperty('--tutorial-column');document.body.style.removeProperty('--tutorial-mobile-height');document.body.style.removeProperty('--tutorial-floor');
  $$('.tutorial-drop-target').forEach(e=>e.classList.remove('tutorial-drop-target'));
 }
 function layout(){
  if((!enabled()&&!preview)||library.isOpen()){root.hidden=true;spot.hidden=true;removeLayout();return;}
  root.hidden=false;mount();
  const r=record(),open=preview||r.open,v=display(),vw=visualViewport?.width||innerWidth,vh=visualViewport?.height||innerHeight;
  const small=vw<1180;
  // Do not hide the guide header under the app/editor toolbar. The editor's
  // native-size header is fixed; normal writing uses the toolbar's visible edge.
  const toolbarBottom=document.body.classList.contains('studio-native')?parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--studio-head-height'))||61:$('.topbar')?.getBoundingClientRect().bottom||0;
  const navBottom=vw<=680&&document.body.classList.contains('studio-native')?$('.sidebar')?.getBoundingClientRect().bottom||0:0;
  const topInset=root.closest('dialog')?12:Math.max(12,Math.min(vh-190,Math.max(toolbarBottom,navBottom)+12));
  const tray=$('.tray'),floor=small&&tray&&visible(tray)&&!root.closest('dialog')?Math.max(12,vh-tray.getBoundingClientRect().top+8):12;
  document.body.style.setProperty('--tutorial-floor',floor+'px');
  document.body.classList.add('tutorial-active');document.body.classList.toggle('tutorial-open',!!open);
  document.body.classList.toggle('tutorial-docked',!!open&&v.placement.mode==='dock'&&!small);
  document.body.classList.toggle('tutorial-small',!!open&&small);
  document.body.classList.toggle('tutorial-mobile-top',!!open&&small&&v.mobile.edge==='top');
  document.body.style.setProperty('--tutorial-column',(Math.min(v.placement.width,vw-24)+32)+'px');
  document.body.style.setProperty('--tutorial-mobile-height',Math.round(vh*v.mobile.height/100)+'px');
  const contrast=hex=>{const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]>.179?'#172c22':'#ffffff';};
  root.style.setProperty('--guide-text',contrast(v.style.background));root.style.setProperty('--guide-on-accent',contrast(v.style.accent));
  root.style.setProperty('--guide-accent',v.style.accent);root.style.setProperty('--guide-background',v.style.background);root.style.setProperty('--guide-size',v.style.fontSize+'px');spot.style.setProperty('--guide-highlight',v.style.highlight);spot.style.setProperty('--guide-dim',v.style.dim);
  const shade=v.overlay.shade;spot.style.setProperty('--guide-shade',`${parseInt(shade.slice(1,3),16)} ${parseInt(shade.slice(3,5),16)} ${parseInt(shade.slice(5,7),16)}`);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;root.style.transition=`left ${reduced?0:v.motion.panel}ms ${v.motion.easing}, top ${reduced?0:v.motion.panel}ms ${v.motion.easing}`;
  root.style.setProperty('--guide-completion-ms',(reduced?0:v.motion.completion)+'ms');
  root.style.width=Math.min(v.placement.width,vw-24)+'px';root.style.maxHeight=Math.min(v.placement.maxHeight,vh-topInset-12)+'px';root.style.height='auto';
  root.style.right='auto';root.style.bottom='auto';
  if(!open){root.style.width='auto';root.style.left='auto';root.style.top='auto';root.style.right='12px';root.style.bottom=floor+'px';spot.hidden=true;return;}
  if(small){root.style.width=(vw-24)+'px';root.style.height=Math.round(vh*v.mobile.height/100)+'px';root.style.maxHeight=Math.max(100,vh-floor-topInset-12)+'px';}
  currentTarget=findTarget();const box=currentTarget?.getBoundingClientRect();const w=root.offsetWidth,h=root.offsetHeight;
  let x=vw-w-16,y=topInset;const mode=v.placement.mode,gap=v.placement.gap;
  if(small){x=12;y=v.mobile.edge==='top'?topInset:vh-h-floor;}
  else if(mode==='custom'){x=v.placement.unit==='percent'?12+(vw-w-24)*v.placement.x/100:v.placement.x;y=v.placement.unit==='percent'?topInset+(vh-h-topInset-12)*v.placement.y/100:v.placement.y;}
  else if(mode==='target'&&box){if(v.placement.side==='left'){x=box.left-w-gap;y=box.top;}if(v.placement.side==='right'){x=box.right+gap;y=box.top;}if(v.placement.side==='top'){x=box.left;y=box.top-h-gap;}if(v.placement.side==='bottom'){x=box.left;y=box.bottom+gap;}}
  else if(mode.startsWith('top-')||mode.startsWith('bottom-')){x=mode.endsWith('left')?12:vw-w-12;y=mode.startsWith('top')?12:vh-h-12;}
  else if(mode==='auto'){
   const candidates=lastPosition?[lastPosition,[12,12],[vw-w-12,12],[12,vh-h-12],[vw-w-12,vh-h-12]]:[[vw-w-12,12],[12,12],[vw-w-12,vh-h-12],[12,vh-h-12]];
   const score=([a,b])=>box?Math.max(0,Math.min(a+w,box.right+8)-Math.max(a,box.left-8))*Math.max(0,Math.min(b+h,box.bottom+8)-Math.max(b,box.top-8)):0;
   [x,y]=candidates.reduce((best,c)=>score(c)<score(best)?c:best);
  }
  x=Math.max(12,Math.min(x,vw-w-12));y=Math.max(topInset,Math.min(y,vh-h-12));
  root.style.left=Math.round(x)+'px';root.style.top=Math.round(y)+'px';lastPosition=[x,y];
  $$('.tutorial-drop-target').forEach(e=>e.classList.remove('tutorial-drop-target'));
  if(!preview&&r.running&&goal().drop&&!r.done.includes(token()))selectTarget(goal().drop)?.classList.add('tutorial-drop-target');
  spot.hidden=!v.highlight||!box||(!preview&&!r.running)||!visible(currentTarget);
  if(!spot.hidden){
   const padding=v.overlay.padding,left=Math.max(3,box.left-padding),top=Math.max(3,box.top-padding),right=Math.min(vw-3,box.right+padding),bottom=Math.min(vh-3,box.bottom+padding);
   if(right<=left||bottom<=top){spot.hidden=true;return;}
   const boxes=[[0,0,vw,top],[0,bottom,vw,vh-bottom],[0,top,left,bottom-top],[right,top,vw-right,bottom-top]];
   [...spot.querySelectorAll('i')].forEach((e,i)=>{const [a,b,c,d]=boxes[i];e.style.cssText=`left:${a}px;top:${b}px;width:${c}px;height:${d}px`;});
   spot.querySelector('b').style.cssText=`left:${left}px;top:${top}px;width:${right-left}px;height:${bottom-top}px;border-width:${v.overlay.border}px;border-radius:${v.overlay.radius}px;background:color-mix(in srgb, ${v.style.highlight} ${v.overlay.fill*100}%, transparent);transition:${reduced||document.body.classList.contains('drag-active')?0:v.motion.highlight}ms ${v.motion.easing}`;
  }
 }
 function controls(region,ctx){
  const {v,done,r,ready,spec,stageIndex,goalIndex,l,activeDef}=ctx;
  return Object.entries(v.controls).filter(([,c])=>c.visible&&c.region===region).sort((a,b)=>a[1].order-b[1].order).map(([id,c])=>{
   if(preview&&!preview.studio&&id!=='edit'&&id!=='pause')return '';
   if(id==='sample'&&!spec.length&&!preview?.studio)return '';
   let action=id,label=c.label,disabled=false,primary=false;
   if(id==='sample'){disabled=!ready||busy;label=busy?'Inserting…':label;}
   if(id==='locate')disabled=busy;
   if(id==='back')disabled=(stageIndex===0&&goalIndex===0)||busy;
   if(id==='next'){action=done?'next':r.running?'waiting':'resume';disabled=(r.running&&!done)||busy;primary=true;label=done?(stageIndex===activeDef.lessons.length-1&&goalIndex===l.goals.length-1?c.finishLabel:goalIndex===l.goals.length-1?c.stageLabel:c.label):r.running?c.waitingLabel:c.resumeLabel;}
   if(id==='edit'&&preview&&!preview.studio){label='Back to editor';primary=true;}
   if(preview?.studio){action=id;disabled=false;label=done&&id==='next'?(stageIndex===activeDef.lessons.length-1&&goalIndex===l.goals.length-1?c.finishLabel:goalIndex===l.goals.length-1?c.stageLabel:c.label):c.label;}
   const style=`order:${c.order};${c.width?'width:'+c.width+'px;max-width:100%;flex:none;':''}${c.minHeight?'min-height:'+c.minHeight+'px;':''}${c.align==='stretch'?'flex:1;':c.align==='end'?'margin-left:auto;':c.align==='center'?'margin-inline:auto;':''}`;
   const titles={sample:'Insert sample wording',locate:'Locate this action’s control',back:'Previous tutorial action',next:'Next tutorial action',edit:'Edit tutorial',leave:'Return to my work',pause:'Pause tutorial'};
   return `<button type="button" data-guide="${action}" data-control-id="${id}" class="guide-control${primary?' guide-primary':''}" style="${style}"${disabled?' disabled':''} aria-label="${esc(id==='next'?label:titles[id])}" title="${esc(titles[id])}">${esc(label)}</button>`;
  }).join('');
 }
 function scheduleAutomatic(){
  if(preview||!enabled()||busy||!record().running)return;const r=record(),k=token(),v=display(),stamp=bridge.activeId()+':'+k+':'+generation;
  if(v.advance.mode==='after'&&r.done.includes(k)&&autoNextToken!==stamp){autoNextToken=stamp;clearTimeout(autoTimer);autoTimer=setTimeout(()=>{if(enabled()&&record().running&&token()===k&&!busy)next();},v.advance.delay);return;}
  if(v.sample.trigger==='ready'&&sampleReady()&&!r.samples[k]&&!r.done.includes(k)&&autoSampleToken!==stamp){
   autoSampleToken=stamp;clearTimeout(autoTimer);
   // Leave the fields editable during this reading/settling delay. Recheck their
   // contents on entry so typing by the learner always takes precedence.
   autoTimer=setTimeout(()=>{
    if(enabled()&&record().running&&token()===k&&generation===Number(stamp.split(':').at(-1))&&!library.isOpen()&&sampleReady())insertSample({automatic:true});
    else autoSampleToken='';
   },v.sample.delay);
  }
 }
 function renderSections(sections,ctx){
  const {l,g,v,spec,panels,goalIndex}=ctx;
  return sections.map(section=>{
   const {id,kind}=section;
   if(kind==='writeup'&&!v.showIntro||kind==='explanation'&&!v.showWhy||kind==='sample'&&(!v.showSample||!spec.length))return '';
   const cls=({writeup:'guide-intro',explanation:'guide-why',action:'guide-instruction',sample:'guide-sample',text:'guide-custom'})[kind];
   const text=({writeup:l.intro,explanation:l.why,action:g.text,text:section.text||''})[kind];
   const title=kind==='action'&&section.title==='Action'?'Action '+(goalIndex+1)+' of '+l.goals.length:section.title;
   const titleHTML=`<span data-section-title="${esc(id)}">${esc(title)}</span>`;
   const body=kind==='sample'?spec.map(s=>`<div><small>${esc(s.label)}</small><p>${esc(s.text)}</p></div>`).join(''):`<p data-section-body="${esc(id)}">${esc(text)}</p>`;
   const children=renderSections(section.children,ctx),attrs=`class="guide-section ${cls}" data-section-id="${esc(id)}" data-section-kind="${kind}"`;
   if(section.collapsible){const open=Object.hasOwn(panels,'section:'+id)?panels['section:'+id]:section.expanded;return `<details ${attrs} data-panel="section:${esc(id)}"${open?' open':''}><summary>${titleHTML}</summary>${body}${children}</details>`;}
   return `<section ${attrs}${kind==='writeup'?' aria-label="Writeup"':''}>${section.heading?`<h3 class="guide-section-heading">${titleHTML}</h3>`:''}${body}${children}</section>`;
  }).join('');
 }
 function render(force=false){
  if((!enabled()&&!preview)||library.isOpen()){layout();return;}
  const r=record(),l=lesson(),g=goal(),k=token(),done=preview?.studio?!!preview.completed:!preview&&(r.done.includes(k)||g.check.kind==='read'),v=display(),activeDef=preview?.definition||definition;
  const stageIndex=preview?preview.index:r.index,goalIndex=preview?preview.step:r.goal;
  const total=activeDef.lessons.filter(l=>l.goals.every(g=>r.done.includes(l.id+':'+g.id))).length;
  const ready=sampleReady(),spec=sampleSpec(),open=!!preview||r.open;
  const nextSignature=JSON.stringify([k,stageIndex,goalIndex,open,r.running,done,ready,message,busy,storageOkay,progressWriter?.status().pending,progressWriter?.status().dirty,total,preview&&'preview',g.text,l.title,l.intro,l.why,v]);
  if(!force&&signature===nextSignature){layout();scheduleAutomatic();return;}signature=nextSignature;
  const previousScroll=root.querySelector('.guide-body')?.scrollTop||0;
  if(root.querySelector('.guide-body'))panelStates.set(placementToken,Object.fromEntries([...root.querySelectorAll('details[data-panel]')].map(e=>[e.dataset.panel,e.open])));
  const same=placementToken===k;placementToken=k;
  const panels=same&&!preview?.resetSections?(panelStates.get(k)||{}):{};if(preview)preview.resetSections=false;
  root.className=open?'guide-expanded':'guide-folded';
  if(!open){root.innerHTML=`<button type="button" data-guide="open" class="guide-reopen">${esc(definition.title)} · Resume tutorial · ${total}/${definition.lessons.length}</button>`;layout();return;}
  const ctx={v,done,r,ready,spec,stageIndex,goalIndex,l,activeDef};
  const assemblies=(g.enterAssemblies||[]).map(id=>activeDef.assemblies.find(a=>a.id===id)?.title).filter(Boolean);
  root.innerHTML=`<header><span>${esc(activeDef.title)}${preview?' · PREVIEW':''}</span><div class="guide-control-group">${controls('header',ctx)}</div></header><div class="guide-body"><div class="guide-control-group">${controls('body-top',ctx)}</div><label for="guide-select">Stage ${stageIndex+1} of ${activeDef.lessons.length}</label><select id="guide-select" aria-label="Choose tutorial stage"${preview?' disabled':''}>${activeDef.lessons.map((x,j)=>{const complete=x.goals.every(g=>r.done.includes(x.id+':'+g.id));const allowed=j<=r.index||definition.lessons.slice(0,j).every(l=>l.goals.every(g=>r.done.includes(l.id+':'+g.id)));return `<option value="${j}"${j===stageIndex?' selected':''}${!preview&&!allowed?' disabled':''}>${complete?'✓ ':''}${j+1}. ${esc(x.title)}</option>`;}).join('')}</select><h2>${esc(l.title)}</h2>${renderSections(v.sections,{l,g,v,spec,panels,goalIndex})}${assemblies.length?`<details class="guide-assembly-note"><summary>Story section added</summary><p>${esc(assemblies.join(', '))}. Existing writing and archived material are kept.</p></details>`:''}${done&&g.check.kind!=='read'?`<div class="guide-complete" role="status">✓ Action complete${goalIndex===l.goals.length-1?' · Stage complete':''}. Read or revise the result, then continue.</div>`:''}${message?`<p class="guide-message" role="status">${esc(message)}</p>`:''}${preview?'<p class="guide-message">Popup preview only. No story data or tutorial progress is changed.</p>':''}<small>${total}/${activeDef.lessons.length} stages complete · ${!storageOkay?'Progress is not saving':progressWriter?.status().pending||progressWriter?.status().dirty?'Saving progress…':'Progress saved on this device'}</small><div class="guide-control-group">${controls('body-bottom',ctx)}</div></div><footer><div class="guide-tools guide-control-group">${controls('tools',ctx)}${!storageOkay&&progressWriter?'<button type="button" data-guide="retry-progress">Retry progress save</button>':''}${message.includes('Archive')?'<button type="button" data-guide="archive">Open Archive</button>':''}</div><div class="guide-navigation guide-control-group">${controls('navigation',ctx)}</div></footer>`;
  if(same)root.querySelector('.guide-body').scrollTop=previousScroll;
  root.classList.toggle('guide-typing',busy);layout();scheduleAutomatic();
 }

 function locate(){
  if(goal().check.kind==='read'){layout();return;}
  const el=findTarget();if(!el){message='The control is not visible on this page. Use Resume action to return to it; open editor text will be preserved.';record().running=false;persist();render();return;}
  const v=display();if(v.scroll==='none'){layout();return;}
  const rect=el.getBoundingClientRect(),small=innerWidth<1180;
  const top=small&&v.mobile.edge==='top'?root.getBoundingClientRect().bottom+14:20;
  const bottom=small&&v.mobile.edge==='bottom'?root.getBoundingClientRect().top-14:innerHeight-110;
  if(rect.top>=top&&rect.bottom<=bottom){layout();return;}
  const containers=[];for(let parent=el.parentElement;parent&&parent!==document.body;parent=parent.parentElement)if(parent.scrollHeight>parent.clientHeight&&/(auto|scroll)/.test(getComputedStyle(parent).overflowY))containers.push({el:parent,from:parent.scrollTop,left:parent.scrollLeft});
  const windowBefore={x:scrollX,y:scrollY};
  el.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});
  if(small&&!el.closest('dialog')){const after=el.getBoundingClientRect();window.scrollBy({top:after.top-(top+Math.max(0,(bottom-top-after.height)/2)),behavior:'instant'});}
  const windowAfter={x:scrollX,y:scrollY};for(const c of containers)c.to=c.el.scrollTop;
  const duration=v.scroll==='smooth'&&!matchMedia('(prefers-reduced-motion: reduce)').matches?v.motion.scroll:0;
  if(duration){
   cancelAnimationFrame(scrollAnimation);for(const c of containers)c.el.scrollTo({top:c.from,left:c.left,behavior:'instant'});scrollTo({top:windowBefore.y,left:windowBefore.x,behavior:'instant'});
   const began=performance.now();const frame=now=>{const raw=Math.min(1,(now-began)/duration),t=v.motion.easing==='linear'?raw:v.motion.easing==='ease-in'?raw*raw:v.motion.easing==='ease-in-out'?raw<.5?2*raw*raw:1-(-2*raw+2)**2/2:1-(1-raw)**3;for(const c of containers)if(c.el.isConnected)c.el.scrollTo({top:c.from+(c.to-c.from)*t,left:c.left,behavior:'instant'});scrollTo({top:windowBefore.y+(windowAfter.y-windowBefore.y)*t,left:windowBefore.x+(windowAfter.x-windowBefore.x)*t,behavior:'instant'});layout();if(raw<1)scrollAnimation=requestAnimationFrame(frame);};scrollAnimation=requestAnimationFrame(frame);
  }
  layout();
 }

 function start(prepare=true){
  if(!enabled())return;const r=record();cancelTyping();r.open=true;r.running=true;message='';internal=true;
  try{
   if(prepare)bridge.prepare(goal(),definition);
   const k=token();if(!(k in r.baselines))r.baselines[k]=TutorialChecks.value(snapshot(),goal().check);
   persist();
  }catch(e){r.running=false;message=e.message;persist();}
  finally{internal=false;render(true);requestAnimationFrame(()=>{if(r.running)locate();schedule();});}
 }
 function items(w,c){const p=TutorialChecks.project(w);return c.entity==='node'?p.nodes:c.entity==='character'?p.characters:c.entity==='block'?p.characters.find(x=>x.id===c.character)?.blocks||[]:c.entity==='world'?p.world:p.connections;}
 function context(){return enabled()&&record().running?{generation,project:bridge.activeId(),key:token(),goal:goal()}:null;}
 function satisfies(g,r,k,w,event){
  const c=g.check,p=TutorialChecks.project(w),now=TutorialChecks.value(w,c);
  if(c.kind==='read')return r.done.includes(k);
  if(c.kind==='create'){
   const item=items(w,c).find(x=>x.id===c.id);if(!item)return false;
   if(c.type&&item.type!==c.type||c.entity==='node'&&item.parentId!==c.parent||c.blockKind&&item.kind!==c.blockKind)return false;
   if(g.sampleNode){const fields=g.nodeFields||['title','opening',...(item.type==='B'?[]:['closing'])];if(fields.some(f=>!String(item[f]||'').trim()))return false;}
  }
  if(c.kind==='demo-node')return !!p.nodes.find(n=>n.id===c.id)&&String(now||'').trim()!=='';
  if(c.kind==='plot-cycle')return !!r.visitedPlots[k]&&(event||r.events[k])?.action==='plot-view'&&!(event||r.events[k])?.id;
  return TutorialChecks.completed(c,r.baselines[k],now,event||r.events[k],r.baselines[c.from]);
 }
 function check(event,ctx=context()){
  if(internal||busy||!ctx||!enabled()||!record().running||ctx.generation!==generation||ctx.key!==token()||ctx.project!==bridge.activeId()||bridge.status().blocked)return;
  const r=record(),g=goal(),k=token();if(!(k in r.baselines))return;
  if(g.check.kind==='plot-cycle'&&event?.action==='plot-view'&&event.id)r.visitedPlots[k]=true;
  if(event&&g.check.kind==='action'&&TutorialChecks.completed(g.check,null,null,event))r.events[k]=event;
  if(g.check.kind==='plot-cycle'&&event?.action==='plot-view'&&!event.id&&r.visitedPlots[k])r.events[k]=event;
  const okay=satisfies(g,r,k,snapshot(),event);
  if(okay&&!r.done.includes(k)){
   if(!bridge.settle())return;try{const added=bridge.applyAssemblies(definition,g.completeAssemblies);const storyEdited=bridge.applyStoryEdits(g,'complete');if(added.length||storyEdited){bridge.redraw();bridge.animateAdded(added,display());}}catch(e){message=e.message;r.running=false;persist();render();return;}r.done.push(k);message='';persist();render();
  }else if(!okay&&r.done.includes(k)&&(!r.review||(g.sampleNode&&!TutorialChecks.project(snapshot()).nodes.some(n=>n.id===g.sampleNode)))){r.done=r.done.filter(x=>x!==k);persist();render();}
 }
 async function reconcile(){
  if(checking||internal||busy||!enabled()||!record().open||!record().running)return;
  checking=true;
  try{
   const r=record(),g=goal(),k=token();if(!(k in r.baselines)){r.baselines[k]=TutorialChecks.value(snapshot(),g.check);persist();}
   if(g.check.kind==='create'&&!r.done.includes(k)){
    const c=g.check,w=snapshot(),list=items(w,c),base=r.baselines[k]||[];
    if(!list.some(x=>x.id===c.id)){
     const candidates=list.filter(x=>!base.includes(x.id)&&(!c.type||x.type===c.type)&&(!c.blockKind||x.kind===c.blockKind));
     const item=candidates.find(x=>c.entity!=='node'||x.parentId===c.parent);
     if(item){
      if(!bridge.adopt(c.entity,item.id,c.id,c.character)){message='The replacement could not be saved. Your new piece and archived work have been kept; check the save warning, then resume.';r.running=false;}
      else{
       // Replacing a previous attempt is a fresh demonstration, even when this
       // action was already visited. Do not carry its old sample/checkmark over.
       for(const l of definition.lessons)for(const other of l.goals){
        const same=c.entity==='node'?other.sampleNode===c.id:other.check.kind==='create'&&other.check.entity===c.entity&&other.check.id===c.id&&other.check.character===c.character;
        if(same){const key=l.id+':'+other.id;delete r.samples[key];r.done=r.done.filter(x=>x!==key);}
       }
       autoSampleToken='';r.review=false;persist();
      }
     }
     else if(candidates.length&&c.entity==='node'){const parent=definition.sample.nodes.find(n=>n.id===c.parent)?.title||'the outer outline';message='Move the new '+c.type+' thread inside '+parent+'. Its wording has been kept.';}
    }
   }
   check();render();
  }catch(e){message=e.message;record().running=false;render();}finally{checking=false;}
 }
 function schedule(){if(frame)return;frame=requestAnimationFrame(()=>{frame=0;layout();reconcile();});}
 function fitSample(el){if(el.tagName==='TEXTAREA'&&el.dataset.inline&&['opening','closing'].includes(el.dataset.field)){el.style.height='auto';el.style.height=Math.min(220,Math.max(24,el.scrollHeight))+'px';}}
 function cancelTyping(){generation++;clearTimeout(autoTimer);cancelAnimationFrame(scrollAnimation);if(abortSample)abortSample();abortSample=null;}
 async function insertSample({automatic=false}={}){
  if(!enabled()||!record().running||busy||!sampleReady())return;
  const r=record(),g=goal(),k=token(),spec=sampleSpec(),form=matchesForm(g),ctx=context(),v=display();
  let fields=spec.map(s=>({...s,el:selectTarget(s.selector)}));
  if(automatic)fields=fields.filter(f=>!f.el.value.trim());
  if(!fields.length)return; // Never overwrite learner wording or prompt automatically.
  const nonempty=fields.some(f=>f.el.value.trim()&&f.el.value!==f.text);
  if(nonempty&&!confirm('Replace the current text in these sample fields? Other fields and story pieces will be kept.'))return;
  const originals=fields.map(f=>({el:f.el,value:f.el.value,readOnly:f.el.readOnly,height:f.el.style.height}));
  const selects=Object.entries(g.demo?.selects||{}).map(([name,value])=>({el:form?.querySelector(`[name="${name}"]`),value})).filter(x=>x.el&&(!automatic||!x.el.options||x.el.value===([...x.el.options].find(o=>o.defaultSelected)||x.el.options[0])?.value));
  const selectedBefore=selects.map(x=>({el:x.el,value:x.el.value}));
  const submits=form?[...form.querySelectorAll('[type="submit"]')].map(el=>({el,disabled:el.disabled})):[];
  const expectedGeneration=generation;let cancelled=false,finished=false;
  busy=true;
  const restore=()=>{
   if(finished||cancelled)return;cancelled=true;
   if(bridge.activeId()===ctx.project){for(const {el,value,height}of [...originals,...selectedBefore])if(el.isConnected){el.value=value;if(height!==undefined)el.style.height=height;el.dispatchEvent(new Event('input',{bubbles:true}));}bridge.settle();}
   for(const {el,readOnly}of originals)el.readOnly=readOnly;for(const {el,disabled}of submits)el.disabled=disabled;
   busy=false;
  };
  if(!bridge.settle()){busy=false;return;}
  abortSample=restore;submits.forEach(x=>x.el.disabled=true);originals.forEach(x=>x.el.readOnly=true);render();
  const valid=()=>!cancelled&&generation===expectedGeneration&&enabled()&&r.running&&bridge.activeId()===ctx.project;
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  try{
   if(!automatic&&v.sample.delay)await wait(v.sample.delay);
   if(!valid())return;
   for(const {el,value}of selects){el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));}
   for(const f of fields){
    if(!valid()||!f.el.isConnected)throw Error('Sample insertion stopped. Your previous text was kept.');
    const typing=v.sample.mode==='type'&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(typing){f.el.value='';for(const chunk of Array.from(f.text)){if(!valid()||!f.el.isConnected)throw Error('Sample insertion stopped. Your previous text was kept.');f.el.value+=chunk;fitSample(f.el);await wait(1000/v.sample.charactersPerSecond);}}
    else{f.el.value=f.text;fitSample(f.el);}
    if(!valid())return;
   }
   if(!valid())return;
   // Commit only completed wording. A reload or navigation mid-animation must
   // not save half a title and then mistake it for the learner's own writing.
   for(const f of fields)f.el.dispatchEvent(new Event('input',{bubbles:true}));
   for(const f of fields)f.el.dispatchEvent(new Event('change',{bubbles:true}));
   if(!bridge.settle())throw Error('The sample is visible, but browser saving failed. Export a backup before closing.');
   r.samples[k]=true;
   if(g.inlineDemo){r.baselines[k]=TutorialChecks.value(snapshot(),g.check);message='Sample inserted. Revise one detail, then click outside the writing field to save.';}
   else if(g.demo)message='Sample inserted. Review or edit it, then save the form.';
   else{const n=definition.sample.nodes.find(n=>n.id===g.sampleNode);if(n)bridge.fillNode(n.id,{notes:n.notes,status:'planned'});message='Sample inserted. Read or revise it before continuing.';}
   finished=true;persist();
  }catch(e){if(generation===expectedGeneration){restore();message=e.message;}}
  finally{
   for(const {el,readOnly}of originals)el.readOnly=readOnly;for(const {el,disabled}of submits)el.disabled=disabled;
   if(generation===expectedGeneration){busy=false;abortSample=null;check(null,ctx);render();schedule();}
  }
 }
 let advancing=false;
 async function next(){
  const r=record(),g=goal();if(advancing||!r.done.includes(token())&&g.check.kind!=='read')return;
  advancing=true;try{
  if(!await sessions.commit()){message='Save failed. Your changes are still here; export a backup or retry saving before continuing.';render();return;}
  if(g.check.kind==='read'&&!r.done.includes(token())){bridge.applyAssemblies(definition,g.completeAssemblies);bridge.applyStoryEdits(g,'complete');r.done.push(token());}
  if(sessions.editorIsDirty()){message='Save or close the open editor before continuing. Its unsaved text has been kept.';render();return;}
  cancelTyping();message='';r.review=false;
  try{bridge.applyAssemblies(definition,goal().exitAssemblies);if(bridge.applyStoryEdits(goal(),'exit'))bridge.redraw();}catch(e){message=e.message;r.running=false;persist();render();return;}
  if(r.goal<lesson().goals.length-1)r.goal++;
  else if(r.index<definition.lessons.length-1){r.index++;r.goal=0;}
  else{r.finished=true;r.open=false;r.running=false;persist();render();return;}
  r.review=r.done.includes(token());persist();start();
  }catch(e){message=e.message||'This action could not be completed. Your work is still here.';r.running=false;render();}finally{advancing=false;}
 }
 function previous(){
  const r=record();if(sessions.editorIsDirty()){message='Save or close the open editor before going back.';render();return;}
  cancelTyping();if(r.goal>0)r.goal--;else if(r.index>0){r.index--;r.goal=definition.lessons[r.index].goals.length-1;}
  r.review=true;message='';persist();start();
 }
 root.addEventListener('click',e=>{
  const el=e.target.closest('[data-guide]');if(!el)return;e.preventDefault();e.stopPropagation();if(el.disabled)return;
  const a=el.dataset.guide;
  if(a==='retry-progress'){retryProgress();return;}
  if(a==='edit'){library.openEditor((preview?.definition||definition).id,preview?.index??record().index,preview?.step??record().goal);return;}
  if(a==='leave'){preview=null;sessions.switchTo('');return;}
  if(a==='sample'){insertSample();return;}
  if(a==='next'){next();return;}if(a==='back'){previous();return;}if(a==='locate'){locate();return;}
  if(a==='resume'){start();return;}
  if(a==='archive'){bridge.goArchive();record().running=false;persist();render();return;}
  if(a==='pause'){if(preview){preview=null;library.endPreview();return;}cancelTyping();record().open=false;record().running=false;message='';persist();render();return;}
  if(a==='open'){record().open=true;record().running=true;persist();render();schedule();}
 });
 root.addEventListener('change',e=>{
  if(e.target.id!=='guide-select')return;
  if(sessions.editorIsDirty()){message='Save or close the open editor before changing stages.';render(true);return;}
  cancelTyping();record().index=Number(e.target.value);record().goal=0;record().review=true;message='';persist();start();
 });
 function interruptSample(e){
  if(!busy||e.target.closest?.('[data-tutorial-ui]'))return;
  cancelTyping();render();
 }
 document.addEventListener('pointerdown',interruptSample,true);
 document.addEventListener('click',interruptSample,true);
 document.addEventListener('keydown',e=>{if(e.key!=='Tab'&&e.key!=='Shift')interruptSample(e);},true);
 window.addEventListener('beforeunload',e=>{cancelTyping();if(progressWriter?.status().dirty||!storageOkay){e.preventDefault();e.returnValue='';}},true);
 document.addEventListener('counterplot:action',e=>{if(internal||e.detail.mode!==sessions.mode())return;const ctx=context();queueMicrotask(()=>{check(e.detail,ctx);schedule();});});
 document.addEventListener('submit',e=>{if(internal||e.target.closest('[data-tutorial-ui]'))return;const ctx=context();setTimeout(()=>{check(null,ctx);schedule();},30);},true);
 document.addEventListener('focusout',e=>{if(internal||!e.target.matches?.('[data-inline]'))return;const ctx=context();setTimeout(()=>{check(null,ctx);schedule();},20);},true);
 document.addEventListener('input',e=>{if(e.target.closest('[data-tutorial-ui]'))return;schedule();},true);
 document.addEventListener('change',e=>{if(!e.target.closest('[data-tutorial-ui]'))schedule();},true);
 document.addEventListener('drop',()=>setTimeout(schedule,30),true);
 document.addEventListener('pointerup',()=>setTimeout(schedule,30),true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&enabled()&&!library.isOpen()&&!e.target.closest('dialog')){cancelTyping();record().running=false;record().open=false;persist();render();}},true);
 new MutationObserver(list=>{if(list.some(m=>!root.contains(m.target)&&!spot.contains(m.target)&&!m.target.closest?.('[data-tutorial-ui]')))schedule();}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
 document.addEventListener('close',schedule,true);window.visualViewport?.addEventListener('resize',schedule);addEventListener('resize',schedule);addEventListener('scroll',()=>layout(),true);
 document.addEventListener('counterplot:before-mode-change',()=>{cancelTyping();if(sessions.isPractice())persist();suspended=true;root.hidden=true;spot.hidden=true;document.body.append(spot,root);removeLayout();});
 function activate(event){
  suspended=false;preview=null;signature='';lastPosition=null;message='';definition=sessions.definition()||library.definition('mgs3')||library.definition(library.list()[0]?.id);
  if(sessions.isPractice()){
   const r=record(),fresh=!(token() in r.baselines);
   // First entry and a browser reload must honor first-step assemblies/setup.
   // Returning to a cached session leaves the learner's view and form alone.
   if(r.open&&r.running&&(fresh||event?.initial)&&!sessions.editorIsDirty()){
    internal=true;try{bridge.prepare(goal(),definition);}catch(e){r.running=false;message=e.message;}finally{internal=false;}
   }
   if(fresh)r.baselines[token()]=TutorialChecks.value(snapshot(),goal().check);persist();
  }
  render(true);schedule();
 }
 document.addEventListener('counterplot:mode-change',activate);document.addEventListener('counterplot:practice-change',activate);
 document.addEventListener('counterplot:definition-change',()=>{const l=lesson()?.id,g=goal()?.id;definition=sessions.definition()||library.definition(definition.id);if(sessions.isPractice()){const r=record(),li=definition.lessons.findIndex(x=>x.id===l);if(li>=0){r.index=li;r.goal=Math.max(0,definition.lessons[li].goals.findIndex(x=>x.id===g));}persist();}signature='';render(true);});
 window.CounterplotGuide={
 suspend(){cancelTyping();suspended=true;root.hidden=true;spot.hidden=true;document.body.append(spot,root);removeLayout();},
 resume(){suspended=false;preview=null;signature='';render(true);schedule();},
 preview(d,index,step,options={}){cancelTyping();preview={definition:d,index,step,lesson:d.lessons[index],goal:d.lessons[index].goals[step],studio:!!options.studio,completed:!!options.completed,resetSections:!!options.resetSections};suspended=false;signature='';render(true);},
 progress(){return TutorialDefinition.copy(state);}
 };
 activate({initial:true});
})();
