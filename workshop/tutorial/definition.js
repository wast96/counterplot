/* Tutorial definitions are data, not executable code. Shared by the editor and tests. */
const TutorialDefinition = (() => {
  'use strict';
  const copy = value => JSON.parse(JSON.stringify(value));
  const Sections=typeof TutorialSections!=='undefined'?TutorialSections:require('./sections.js');
  const SceneEdits=typeof TutorialStoryEdits!=='undefined'?TutorialStoryEdits:require('./story-edits.js');
  const Effects=typeof TutorialEffects!=='undefined'?TutorialEffects:require('./effects.js');
  const buttonDefaults={sample:{label:'Insert sample',region:'tools',order:0,visible:true},locate:{label:'Locate',region:'tools',order:1,visible:true},back:{label:'Back',region:'navigation',order:0,visible:true},next:{label:'Next →',stageLabel:'Next stage →',finishLabel:'Finish',waitingLabel:'Complete the action',resumeLabel:'Resume action',region:'navigation',order:1,visible:true},edit:{label:'Edit',region:'header',order:0,visible:true},leave:{label:'My work',region:'header',order:1,visible:true},pause:{label:'×',region:'header',order:2,visible:true}};
  const defaults = {
    placement: {mode:'dock', width:340, maxHeight:720, side:'right', gap:16, unit:'percent', x:100, y:0},
    mobile: {edge:'bottom', height:36},
    style: {fontSize:13, accent:'#2e5141', background:'#fffdf5', highlight:'#e5b967', dim:0},
    sample: {mode:'instant', charactersPerSecond:28, delay:0, trigger:'click'},
    motion:{panel:0,highlight:100,insertion:180,stagger:30,scroll:180,completion:120,easing:'ease-out'},
    overlay:{padding:5,radius:6,border:2,shade:'#132319',fill:0},
    advance:{mode:'manual',delay:2500},
    controls:copy(buttonDefaults), sections:copy(Sections.defaults),
    showIntro:true, showWhy:true, showSample:true, highlight:true, scroll:'instant'
  };
  const limits = Object.freeze({stages:200,actions:30,assemblies:1000});
  const kinds = new Set(['read','create','demo-node','edit','contains','timed-change','before','archived','restored','plot-created','plot-assigned','plot-cycle','reference','action','order','restore-order','copy','count']);
  const ids = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}$/;
  const object = x => !!x && typeof x === 'object' && !Array.isArray(x);
  function mergePresentation(...values) {
    const out = copy(defaults);
    for (const value of values) if (object(value)) {
      for (const [key,v] of Object.entries(value)) {
        if(key==='controls'&&object(v)){for(const [name,settings]of Object.entries(v))if(object(settings))out.controls[name]={...(out.controls[name]||{}),...settings};}
        else if (['placement','mobile','style','sample','motion','overlay','advance'].includes(key) && object(v)) Object.assign(out[key],v);
        else out[key]=v;
      }
    }
    return out;
  }
  function cleanObject(value,path='definition',depth=0) {
    if (depth>35) throw Error('The tutorial data is nested too deeply.');
    if (value===null || typeof value!=='object') return;
    for (const [key,v] of Object.entries(value)) {
      if (['__proto__','prototype','constructor'].includes(key)) throw Error('Unsupported key at '+path+'.'+key);
      cleanObject(v,path+'.'+key,depth+1);
    }
  }
  function normalize(source) {
    cleanObject(source);
    const d=copy(source);
    d.format ||= 'counterplot-tutorial'; d.schemaVersion ??= 1; d.id ||= 'mgs3'; d.title ||= 'MGS3';
    d.description ??= 'Build the story from an empty outline. Full MGS3 spoilers.';
    d.presentation=mergePresentation(d.presentation);
    d.assemblies ??= d.sample ? Effects.presets(d.sample) : [];
    d.starter && (d.starter.tutorialBuild=true);
    for (const l of d.lessons || []) {
      l.goals?.forEach((g,i)=>{g.id ||= l.id+'-action-'+(i+1);g.setup??={};g.enterAssemblies??=[];g.completeAssemblies??=[];g.exitAssemblies??=[];if(g.setup.stage){if(!g.enterAssemblies.includes(g.setup.stage))g.enterAssemblies.push(g.setup.stage);delete g.setup.stage;}});
      l.steps=l.goals?.map(g=>g.text)||[]; l.target=l.goals?.[0]?.setup||{}; l.look=l.why;
    }
    d.parents={};
    for (const n of d.sample?.nodes || []) {
      const seen=new Set([n.id]),parents=[]; let id=n.parentId;
      while(id) {
        if(seen.has(id)) throw Error('The sample contains a nesting loop.');
        seen.add(id); parents.unshift(id); id=d.sample.nodes.find(x=>x.id===id)?.parentId||'';
      }
      d.parents[n.id]=parents;
    }
    return d;
  }
  function validate(source, W, checkSelector) {
    if (!object(source)) throw Error('Choose a tutorial definition JSON file.');
    const d=normalize(source);
    if(d.format!=='counterplot-tutorial'||d.schemaVersion!==1) throw Error('This is not a supported tutorial definition. Story backups belong in the story Import menu.');
    if(!ids.test(d.id))throw Error('Use a stable tutorial ID: letters, numbers, dots, underscores, or hyphens.');
    function text(v,label,limit=20000,required=false){if(typeof v!=='string'||v.length>limit||(required&&!v.trim()))throw Error(label+' must be '+(required?'nonempty ':'')+'text (up to '+limit+' characters).');}
    function number(v,label,min,max){if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error(label+' must be between '+min+' and '+max+'.');}
    function selector(v,label){if(v===undefined||v==='')return;text(v,label,2000);if(checkSelector)try{checkSelector(v)}catch{throw Error(label+' is not a valid CSS selector.');}}
    function presentation(p,label){
      if(!object(p))throw Error(label+' must be an object.'); const v=mergePresentation(p); Sections.validate(v.sections);
      if(!['dock','auto','top-left','top-right','bottom-left','bottom-right','custom','target'].includes(v.placement.mode))throw Error(label+': choose a valid popup position.');
      if(!['left','right','top','bottom'].includes(v.placement.side))throw Error(label+': choose a valid target side.');
      if(!['percent','px'].includes(v.placement.unit))throw Error(label+': position units must be percent or px.');
      number(v.placement.width,label+' width',220,700);number(v.placement.maxHeight,label+' maximum height',200,1400);number(v.placement.gap,label+' gap',0,100);
      number(v.placement.x,label+' X position',0,v.placement.unit==='percent'?100:10000);number(v.placement.y,label+' Y position',0,v.placement.unit==='percent'?100:10000);
      if(!['top','bottom'].includes(v.mobile.edge))throw Error(label+': mobile edge must be top or bottom.');number(v.mobile.height,label+' mobile height',25,55);
      number(v.style.fontSize,label+' text size',11,22);number(v.style.dim,label+' dimming',0,0.7);
      for(const k of ['accent','background','highlight'])if(!/^#[\da-f]{6}$/i.test(v.style[k]))throw Error(label+' '+k+' must be a six-digit hex color.');
      if(!['instant','type'].includes(v.sample.mode))throw Error(label+': choose instant insertion or typing.');number(v.sample.charactersPerSecond,label+' typing speed',5,200);number(v.sample.delay,label+' sample delay',0,10000);
      if(!['click','ready'].includes(v.sample.trigger))throw Error(label+': sample trigger must be click or ready.');
      for(const k of ['panel','highlight','insertion','stagger','scroll','completion'])number(v.motion[k],label+' '+k+' animation',0,k==='stagger'?500:3000);
      if(!['linear','ease','ease-in','ease-out','ease-in-out'].includes(v.motion.easing))throw Error(label+': choose a supported easing.');
      number(v.overlay.padding,label+' highlight padding',0,50);number(v.overlay.radius,label+' highlight radius',0,40);number(v.overlay.border,label+' highlight border',0,8);number(v.overlay.fill,label+' highlight fill',0,.3);
      if(!/^#[\da-f]{6}$/i.test(v.overlay.shade))throw Error(label+': overlay color must be a six-digit hex color.');
      if(!['manual','after'].includes(v.advance.mode))throw Error(label+': advancement must be manual or after a delay.');number(v.advance.delay,label+' advancement delay',500,60000);
      for(const [id,b] of Object.entries(v.controls)){if(!Object.hasOwn(buttonDefaults,id))throw Error(label+': unknown guide button '+id);if(typeof b.visible!=='boolean'||!['header','body-top','body-bottom','tools','navigation'].includes(b.region))throw Error(label+': invalid button placement.');number(b.order,label+' button order',0,100);text(b.label,label+' button label',80,true);for(const k of ['stageLabel','finishLabel','waitingLabel','resumeLabel'])if(b[k]!==undefined)text(b[k],label+' '+k,80,true);if(b.align!==undefined&&!['auto','start','center','end','stretch'].includes(b.align))throw Error(label+': invalid button alignment.');if(b.width!==undefined)number(b.width,label+' button width',0,500);if(b.minHeight!==undefined)number(b.minHeight,label+' button height',24,100);}
      if(!v.controls.next.visible||!v.controls.pause.visible)throw Error(label+': Next and Close must remain available.');
      for(const k of ['showIntro','showWhy','showSample','highlight'])if(typeof v[k]!=='boolean')throw Error(label+' '+k+' must be true or false.');
      if(!['instant','smooth','none'].includes(v.scroll))throw Error(label+': choose instant, smooth, or no scrolling.');
    }
    text(d.title,'Tutorial name',120,true);text(d.description,'Tutorial description',2000);presentation(d.presentation,'Default popup');
    if(!Array.isArray(d.lessons)||d.lessons.length<1||d.lessons.length>limits.stages)throw Error('Keep between 1 and '+limits.stages+' stages.');
    if(!object(d.sample)||!Array.isArray(d.sample.nodes)||!object(d.starter))throw Error('The sample story and empty starter are required.');
    if(d.starter.projects?.length!==1)throw Error('A tutorial starter must contain exactly one practice project.');
    d.starter.saveKey=d.id==='mgs3'?'counterplot.tutorial.build.v2':'counterplot.tutorial.practice.'+d.id+'.v1';
    d.starter.projects[0].tutorialId=d.id;
    if(d.id!=='mgs3'){d.starter.active=d.starter.projects[0].id=d.id.replace(/\./g,'_')+'-build-v1';}
    if(W){W.validate(copy(d.starter));const w=copy(d.starter);w.projects=[copy(d.sample)];w.active=d.sample.id;W.validate(w);}
    if(!Array.isArray(d.assemblies)||d.assemblies.length>limits.assemblies)throw Error('Use at most '+limits.assemblies+' story assemblies.');
    const assemblyIds=new Set();for(const a of d.assemblies){Effects.validate(a,d.sample);if(assemblyIds.has(a.id))throw Error('Assembly IDs must be unique.');assemblyIds.add(a.id);}
    const stageIds=new Set(),goalIds=new Set();
    for(const [li,l] of d.lessons.entries()){
      const label='Stage '+(li+1);
      if(!ids.test(l.id)||stageIds.has(l.id))throw Error(label+' needs a unique stable ID.');stageIds.add(l.id);
      text(l.title,label+' title',200,true);text(l.intro,label+' introduction');text(l.why,label+' explanation');
      if(l.presentation)presentation(l.presentation,label+' popup');
      if(!Array.isArray(l.goals)||!l.goals.length||l.goals.length>30)throw Error(label+' needs between 1 and 30 actions.');
      for(const [gi,g]of l.goals.entries()){
        const where=label+', action '+(gi+1);
        if(!ids.test(g.id)||goalIds.has(g.id))throw Error(where+' needs a unique stable ID.');goalIds.add(g.id);
        text(g.text,where+' instruction',20000,true);text(g.focus,where+' target',2000,true);selector(g.focus,where+' target');selector(g.drop,where+' drop target');
        if(!object(g.setup))throw Error(where+' setup must be an object.');
        if(g.storyEdits!==undefined){if(!object(g.storyEdits)||Object.keys(g.storyEdits).some(k=>!['enter','complete','exit'].includes(k)))throw Error(where+' has invalid scene edit phases.');for(const ops of Object.values(g.storyEdits))SceneEdits.validate(ops);}
        for(const phase of ['enterAssemblies','completeAssemblies','exitAssemblies']){if(!Array.isArray(g[phase])||g[phase].some(id=>!assemblyIds.has(id)))throw Error(where+' references an unknown assembly.');}
        if(g.setup.mode&&!['outline','write'].includes(g.setup.mode))throw Error(where+' has an unknown workbench view.');
        if(g.setup.inspector&&!['hidden','side','full'].includes(g.setup.inspector))throw Error(where+' has an unknown inspector view.');
        if(g.setup.page&&!['outline','characters','world','connections','archive'].includes(g.setup.page))throw Error(where+' uses an unknown page.');
        if(!object(g.check)||!kinds.has(g.check.kind))throw Error(where+' has an unsupported completion check.');
        const c=g.check;
        if(g.targetPolicy!==undefined&&!['auto','exact'].includes(g.targetPolicy))throw Error(where+' has an unknown target policy.');
        for(const key of ['action','id','piece','reveal','character','at'])if(g.setup[key]!==undefined&&typeof g.setup[key]!=='string')throw Error(where+' setup '+key+' must be text.');
        if(g.setup.action&&!/^[a-z][a-z0-9-]*$/.test(g.setup.action))throw Error(where+' setup action name is invalid.');
        const entities={create:['node','character','block','world','connection'],edit:['node','character','block','change','world','connection'],contains:['node','character','block','world','connection'],'demo-node':['node'],count:['nodes','characters','world','connections','plots','archive','swatches']};
        if(entities[c.kind]&&!entities[c.kind].includes(c.entity))throw Error(where+' has an unsupported entity for this completion rule.');
        for(const key of ['id','anchor','character','block','at','field','parent','value','label','from'])if(c[key]!==undefined&&typeof c[key]!=='string')throw Error(where+' completion '+key+' must be text.');
        const required={create:['id'],edit:['id','field'],contains:['id','field','value'],'demo-node':['id','field'],'timed-change':['character','block','at'],before:['id','anchor'],archived:['id'],restored:['id'],'plot-assigned':['id'],reference:['id']};
        for(const key of required[c.kind]||[])text(c[key],where+' completion '+key,2000,true);
        if(c.kind==='create'&&c.entity==='node'){
         if(!['M','I','C','E','B'].includes(c.type)||typeof c.parent!=='string')throw Error(where+' creation rule needs a piece type and parent ID (blank for the outer outline).');
        }
        if(['create','edit','contains'].includes(c.kind)&&['block','change'].includes(c.entity))text(c.character,where+' character ID',120,true);
        if(c.kind==='before'&&typeof c.parent!=='string')throw Error(where+' order rule needs the parent ID (blank for the outer outline).');
        if(c.kind==='action'){text(c.action,where+' action name',100,true);if(!/^[a-z][a-z0-9-]*$/.test(c.action))throw Error(where+' action name is invalid.');}

        if(g.sampleNode&&!d.sample.nodes.some(n=>n.id===g.sampleNode))throw Error(where+' sample piece does not exist.');
        if(g.nodeFields&&(!Array.isArray(g.nodeFields)||g.nodeFields.some(f=>!['title','opening','closing','notes','prose'].includes(f))))throw Error(where+' sample fields are invalid.');
        if(g.demo){if(!object(g.demo)||!object(g.demo.fields))throw Error(where+' form sample needs a fields object.');if(!['character','block','change','world','connection','plot','reference','swatch'].includes(g.demo.form))throw Error(where+' has an unknown sample form.');for(const [k,v]of Object.entries(g.demo.fields)){if(!/^[\w-]+$/.test(k))throw Error(where+' has an invalid field name.');text(v,where+' sample '+k);}if(g.demo.selects&&!object(g.demo.selects))throw Error(where+' selections must be an object.');for(const [name,value]of Object.entries(g.demo.selects||{}))if(!/^[\w-]+$/.test(name)||typeof value!=='string')throw Error(where+' sample selections must have field names and text values.');}
        if(g.inlineDemo){if(!object(g.inlineDemo))throw Error(where+' prose sample must be an object.');text(g.inlineDemo.text,where+' prose sample');if(!d.sample.nodes.some(n=>n.id===g.inlineDemo.id))throw Error(where+' prose sample piece is missing.');if(!['prose','opening','closing','notes','title'].includes(g.inlineDemo.field))throw Error(where+' prose field is invalid.');}
        if(g.presentation)presentation(g.presentation,where+' popup');
      }
    }
    return d;
  }
  function presentation(d,l,g){return mergePresentation(d.presentation,l?.presentation,g?.presentation);}
  function upgradeMGS3(source){
    const d=copy(source),l=d.lessons?.[0];
    if(d.id!=='mgs3'||l?.id!=='build-c'||d.readingIntroVersion||l.goals.some(g=>g.id==='mgs3-welcome'))return d;
    // Leave intentionally redesigned first stages alone. The legacy construction
    // task keeps its stable ID, saved wording, dependencies and all authored fields.
    const first=l.goals[0];if(first?.id!=='build-c-action-1'||first.check?.kind!=='create'||first.check?.id!=='loyalty')return d;
    l.goals.unshift({id:'mgs3-welcome',text:'Read the introduction, then press Next to start building the outline.',setup:{page:'outline',inspector:'hidden'},focus:'#main',check:{kind:'read'},enterAssemblies:[],completeAssemblies:[],exitAssemblies:[],presentation:{highlight:false,advance:{mode:'manual'}}});
    d.readingIntroVersion=1;l.steps=l.goals.map(g=>g.text);l.target=copy(l.goals[0].setup);return d;
  }
  function restoreJournal(base,r){
    const source=copy(base);
    // Legacy array-index patches were authored before the optional read-only
    // introduction existed. Apply them against that exact layout, then migrate.
    if(!r.flowVersion&&source.id==='mgs3'&&source.readingIntroVersion===1&&source.lessons[0]?.goals[0]?.id==='mgs3-welcome'){
      source.lessons[0].goals.shift();source.lessons[0].steps=source.lessons[0].goals.map(g=>g.text);delete source.readingIntroVersion;
    }
    const before=apply(source,r.changes),index=Math.max(0,Math.min(r.index||0,before.lessons.length-1));
    const stageId=r.stageId||before.lessons[index].id,goalId=r.goalId||before.lessons[index].goals[Math.max(0,Math.min(r.step||0,before.lessons[index].goals.length-1))].id;
    const draft=upgradeMGS3(before),at=Math.max(0,draft.lessons.findIndex(l=>l.id===stageId));
    return {draft,index:at,step:Math.max(0,draft.lessons[at].goals.findIndex(g=>g.id===goalId))};
  }
  function uniqueId(prefix,existing){let id=prefix,i=2;while(existing.has(id))id=prefix+'-'+i++;return id;}
  function diff(base,next,path=[]){
    if(JSON.stringify(base)===JSON.stringify(next))return [];
    if(object(base)&&object(next)){
      const out=[];for(const key of Object.keys(base))if(!Object.hasOwn(next,key))out.push({op:'remove',path:[...path,key]});
      for(const [key,value]of Object.entries(next))out.push(...(Object.hasOwn(base,key)?diff(base[key],value,[...path,key]):[{op:'set',path:[...path,key],value:copy(value)}]));return out;
    }
    if(Array.isArray(base)&&Array.isArray(next)&&base.length===next.length)return next.flatMap((value,i)=>diff(base[i],value,[...path,i]));
    return [{op:'set',path,value:copy(next)}];
  }
  function apply(base,changes){
    if(!Array.isArray(changes)||changes.length>10000)throw Error('Invalid tutorial edit list.');
    let out=copy(base);cleanObject(changes);
    for(const change of changes){
      if(!object(change)||!['set','remove'].includes(change.op)||!Array.isArray(change.path)||change.path.some(k=>!['string','number'].includes(typeof k)||['__proto__','prototype','constructor'].includes(k)))throw Error('Invalid tutorial edit.');
      if(!change.path.length){if(change.op==='remove')throw Error('Cannot remove the tutorial.');out=copy(change.value);continue;}
      let owner=out;for(const key of change.path.slice(0,-1)){if(!owner||typeof owner!=='object'||!Object.hasOwn(owner,key))throw Error('An edit no longer matches the built-in tutorial.');owner=owner[key];}
      const key=change.path.at(-1);if(change.op==='remove'){if(Array.isArray(owner))throw Error('Remove arrays by replacing them.');delete owner[key];}else owner[key]=copy(change.value);
    }
    return out;
  }
  return {upgradeMGS3,restoreJournal,defaults,buttonDefaults,limits,copy,normalize,validate,presentation,mergePresentation,uniqueId,diff,apply};
})();
if(typeof module!=='undefined')module.exports=TutorialDefinition;
