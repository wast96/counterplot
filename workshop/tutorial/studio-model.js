/* Pure authoring operations and deterministic sample scenes. Never receives a user's workspace. */
const TutorialStudioModel = (() => {
  'use strict';
  const W = typeof Workshop !== 'undefined' ? Workshop : require('../src/core.js');
  const E = typeof TutorialEffects !== 'undefined' ? TutorialEffects : require('./effects.js');
  const D = typeof TutorialDefinition !== 'undefined' ? TutorialDefinition : require('./definition.js');
  const SE=typeof TutorialStoryEdits!=='undefined'?TutorialStoryEdits:require('./story-edits.js');
  const copy = W.copy;
  const phases = ['enterAssemblies', 'completeAssemblies', 'exitAssemblies'];
  const names = {nodes:'Outline', characters:'Characters', blocks:'Starting blocks', changes:'Changes', world:'World', connections:'Connections', plots:'Plots'};
  function allGoals(d) { return d.lessons.flatMap(l => l.goals); }
  function moveStage(d, from, to) {
    if (from === to || from < 0 || to < 0 || from >= d.lessons.length || to >= d.lessons.length) return false;
    d.lessons.splice(to, 0, d.lessons.splice(from, 1)[0]); return true;
  }
  function moveGoal(d, sourceStage, from, targetStage, to) {
    const a=d.lessons[sourceStage]?.goals, b=d.lessons[targetStage]?.goals;
    if (!a || !b || from<0 || from>=a.length || to<0 || to>b.length) return false;
    if (a!==b && (a.length===1 || b.length>=30)) return false;
    if (a===b && from===to) return false;
    const goal=a[from];b.splice(Math.min(to,b.length-(a===b?1:0)),0,a.splice(from,1)[0]);
    if(a!==b){const old=d.lessons[sourceStage].id+':'+goal.id,replacement=d.lessons[targetStage].id+':'+goal.id;for(const g of allGoals(d))if(g.check?.from===old)g.check.from=replacement;}
    return true;
  }
  function duplicateStage(d,index) {
    if(d.lessons.length>=D.limits.stages)throw Error('This tutorial has reached the stage safety limit.');
    const s=copy(d.lessons[index]), used=new Set(d.lessons.flatMap(l=>[l.id,...l.goals.map(g=>g.id)]));
    s.id=D.uniqueId('stage-copy',used); used.add(s.id); s.title+=' · copy';
    const map=new Map();
    for(const g of s.goals){const old=g.id;g.id=D.uniqueId('action-copy',used);used.add(g.id);map.set(old,g.id);}
    for(const g of s.goals)if(g.check?.from){const [stage,goal]=g.check.from.split(':');if(stage===d.lessons[index].id&&map.has(goal))g.check.from=s.id+':'+map.get(goal);}
    d.lessons.splice(index+1,0,s);return s;
  }
  function members(d,g,phase) {
    const result=Object.fromEntries(E.collections.map(k=>[k,[]]));
    for(const id of g[phase]||[]){const a=d.assemblies.find(x=>x.id===id);if(a)for(const k of E.collections)result[k].push(...a[k]);}
    for(const k of E.collections)result[k]=[...new Set(result[k])];return result;
  }
  function includeDependencies(sample,spec,key,id) {
    const catalog=E.catalog(sample), visited=new Set();
    function add(k,v) {
      const token=k+':'+v;if(visited.has(token))return;visited.add(token);
      if(!catalog[k]?.some(x=>x.id===v))throw Error('That sample item no longer exists.');
      if(!spec[k].includes(v))spec[k].push(v);
      if(k==='nodes'){
        const n=sample.nodes.find(x=>x.id===v);if(n.parentId)add('nodes',n.parentId);
        for(const cid of n.cast||[])add('characters',cid);
        for(const wid of n.worldIds||[])add('world',wid);
        for(const pid of n.plotIds||[])add('plots',pid);
      }
      if(k==='blocks'||k==='changes'){
        const [cid,bid]=v.split(':');add('characters',cid);
        if(k==='changes'){
          const c=sample.characters.find(x=>x.id===cid),x=c.changes.find(x=>x.id===bid);
          add('nodes',x.at.split(':')[0]);if(c.blocks.some(b=>b.id===x.blockId))add('blocks',cid+':'+x.blockId);
        }
      }
      if(k==='connections'){const c=sample.connections.find(x=>x.id===v);add('characters',c.a);add('characters',c.b);}
    }
    add(key,id);return spec;
  }
  function editReveal(d,g,phase,key,id,add=true) {
    if(!phases.includes(phase)||!E.collections.includes(key))throw Error('Unknown reveal lane.');
    const used=new Set(d.assemblies.map(x=>x.id));
    // Copy-on-write: editing one action must never quietly change another action's shared assembly.
    if(add){
      let spec=d.assemblies.find(a=>a.studioOwner===g.id&&a.studioPhase===phase&&(g[phase]||[]).includes(a.id));
      if(!spec){spec=E.empty();spec.id=D.uniqueId('reveal-'+g.id.slice(0,65)+'-'+phases.indexOf(phase),used);spec.title='Pieces for this action';spec.studioOwner=g.id;spec.studioPhase=phase;d.assemblies.push(spec);(g[phase]||=[]).push(spec.id);}
      includeDependencies(d.sample,spec,key,id);
    }else{
      for(const aid of [...g[phase]]){
        let a=d.assemblies.find(x=>x.id===aid);if(!a?.[key].includes(id))continue;
        const references=allGoals(d).flatMap(x=>phases.flatMap(p=>(x[p]||[]).map(v=>({g:x,p,id:v})))).filter(x=>x.id===aid);
        if(references.length>1){a=copy(a);a.id=D.uniqueId('reveal-copy',used);used.add(a.id);d.assemblies.push(a);g[phase]=g[phase].map(v=>v===aid?a.id:v);}
        a[key]=a[key].filter(v=>v!==id);if(key==='nodes')a.placements=a.placements.filter(v=>v.id!==id);
        if(E.collections.every(k=>!a[k].length))g[phase]=g[phase].filter(v=>v!==a.id);
      }
    }
    return members(d,g,phase);
  }
  function expectedScene(d,index,step,phase='enter') {
    const workspace=copy(d.starter),p=workspace.projects[0],sample=d.sample,warnings=[];
    workspace.active=p.id;p.tutorialId=d.id;workspace.tutorialBuild=true;
    const applied=new Set(p.tutorialAssemblies||[]);
    function assemble(g,key){for(const id of g[key]||[]){if(applied.has(id))continue;const spec=d.assemblies.find(a=>a.id===id);if(!spec){warnings.push('Unknown reveal: '+id);continue;}try{E.apply(p,sample,spec);applied.add(id);p.tutorialAssemblies=[...applied];}catch(e){warnings.push(e.message);}}}
    function ensureNode(id){
      let n=p.nodes.find(n=>n.id===id);if(n)return n;
      const source=sample.nodes.find(n=>n.id===id);if(!source)return null;
      if(source.parentId)ensureNode(source.parentId);
      n={...W.node(source.type,source.parentId),id:source.id};p.nodes.push(n);return n;
    }
    function ensureCharacter(id){let c=p.characters.find(c=>c.id===id);if(!c){const s=sample.characters.find(c=>c.id===id);if(!s)return null;c={...copy(s),blocks:[],changes:[]};p.characters.push(c);}return c;}
    function sceneEdits(g,phase){if(!g.storyEdits?.[phase]?.length)return;try{const result=SE.apply(p,g.storyEdits[phase],{force:true});for(const k of Object.keys(p))if(!Object.hasOwn(result.project,k))delete p[k];Object.assign(p,result.project);}catch(e){warnings.push(e.message);}}
    function complete(g){
      const c=g.check,fields=g.demo?.fields||{},sNode=sample.nodes.find(n=>n.id===c.id);
      if(c.kind==='create'){
        if(c.entity==='node'){
          const n=ensureNode(c.id);if(!n){const fresh={...W.node(c.type,c.parent),id:c.id};p.nodes.push(fresh);return;}
          n.type=c.type;n.parentId=c.parent;for(const field of g.nodeFields||['title','opening',...(n.type==='B'?[]:['closing'])])n[field]=sNode?.[field]||'';
        }else if(c.entity==='character'){const char=ensureCharacter(c.id);if(char)Object.assign(char,fields);else warnings.push('No sample character for '+c.id);}
        else if(c.entity==='block'){
          const char=ensureCharacter(c.character),s=sample.characters.find(x=>x.id===c.character)?.blocks.find(x=>x.id===c.id);
          if(char&&!char.blocks.some(x=>x.id===c.id))char.blocks.push({...copy(s||W.block(c.blockKind)),id:c.id,...fields});
        }else if(c.entity==='world'){
          const s=sample.world.find(x=>x.id===c.id);if(s&&!p.world.some(x=>x.id===c.id))p.world.push({...copy(s),...fields,...g.demo?.selects});
        }else if(c.entity==='connection'){
          const s=sample.connections.find(x=>x.id===c.id);if(s){ensureCharacter(s.a);ensureCharacter(s.b);if(!p.connections.some(x=>x.id===c.id))p.connections.push({...copy(s),...fields,...g.demo?.selects});}
        }
      }else if(c.kind==='demo-node'){const n=ensureNode(c.id);if(n)n[c.field]=sNode?.[c.field]||'';}
      else if(c.kind==='edit'){
        const source=c.entity==='node'?sNode:c.entity==='block'?sample.characters.find(x=>x.id===c.character)?.blocks.find(x=>x.id===c.id):(c.entity==='character'?sample.characters:c.entity==='world'?sample.world:c.entity==='connection'?sample.connections:[])?.find(x=>x.id===c.id);
        const target=c.entity==='node'?p.nodes.find(x=>x.id===c.id):c.entity==='block'?p.characters.find(x=>x.id===c.character)?.blocks.find(x=>x.id===c.id):(c.entity==='character'?p.characters:c.entity==='world'?p.world:c.entity==='connection'?p.connections:[])?.find(x=>x.id===c.id);
        if(target)target[c.field]=g.inlineDemo?.text??fields[c.field]??source?.[c.field]??target[c.field];
      }else if(c.kind==='contains'){
        const target=(c.entity==='node'?p.nodes:c.entity==='world'?p.world:c.entity==='character'?p.characters:c.entity==='block'?p.characters.find(x=>x.id===c.character)?.blocks:[])?.find(x=>x.id===c.id);
        if(target){target[c.field]||=[];if(!target[c.field].includes(c.value))target[c.field].push(c.value);}
      }else if(c.kind==='timed-change'){
        const char=ensureCharacter(c.character),s=sample.characters.find(x=>x.id===c.character)?.changes.find(x=>x.blockId===c.block&&x.at===c.at);
        if(char&&s&&!char.changes.some(x=>x.id===s.id))char.changes.push({...copy(s),...fields});
      }else if(c.kind==='before'){
        const a=p.nodes.find(x=>x.id===c.id),b=p.nodes.find(x=>x.id===c.anchor);if(a&&b){p.nodes=p.nodes.filter(x=>x!==a);a.parentId=c.parent;p.nodes.splice(p.nodes.indexOf(b),0,a);}
      }else if(c.kind==='archived'){if(p.nodes.some(x=>x.id===c.id)){const known=new Set(p.archive.map(a=>a.id));W.archiveNode(p,c.id);for(const a of p.archive)if(!known.has(a.id)){a.id='studio-archive-'+g.id;a.created='2000-01-01T00:00:00.000Z';}}}
      else if(c.kind==='restored'){const a=p.archive.find(x=>x.nodes?.some(n=>n.id===c.id));if(a)W.restore(p,a.id);}
      else if(c.kind==='plot-created'){p.plots||=[];if(!p.plots.some(x=>x.label===(c.label||'A')))p.plots.push({id:'studio-plot-'+(c.label||'A'),label:c.label||'A',title:fields.title||'The mission',notes:'',protagonist:''});}
      else if(c.kind==='plot-assigned'){const n=p.nodes.find(x=>x.id===c.id),plot=p.plots?.find(x=>x.label===(c.label||'A'));if(n&&plot)n.plotIds=[...new Set([...(n.plotIds||[]),plot.id])];}
      else if(c.kind==='reference'){const n=p.nodes.find(x=>x.id===c.id);if(n)n.references=[...copy(sNode?.references||[]),{id:'studio-ref-'+g.id,type:'note',title:fields.title||'Reference',note:fields.note||'',url:''}];}
      // General app actions and arbitrary learner edits have no deterministic sample effect.
      // The live Play mode uses actual completion checks instead of this scene illustration.
    }
    for(let i=0;i<d.lessons.length;i++)for(let j=0;j<d.lessons[i].goals.length;j++){
      if(i>index||i===index&&j>step)continue;const g=d.lessons[i].goals[j],current=i===index&&j===step;
      assemble(g,'enterAssemblies');sceneEdits(g,'enter');if(current&&phase==='enter')return finish();
      try{complete(g);}catch(e){warnings.push(e.message);}
      assemble(g,'completeAssemblies');sceneEdits(g,'complete');if(current&&phase==='complete')return finish();
      assemble(g,'exitAssemblies');sceneEdits(g,'exit');if(current)return finish();
    }
    return finish();
    function finish(){return {workspace,warnings:[...new Set(warnings)],illustrative:true};}
  }
  function playProgress(d,index,step,workspace){
    const done=d.lessons.flatMap((l,i)=>l.goals.filter((g,j)=>i<index||i===index&&j<step).map(g=>l.id+':'+g.id));
    return {version:3,projects:{[d.id+':'+workspace.active]:{index,goal:step,cursorVersion:1,open:true,running:true,done,baselines:{},samples:{},events:{},visitedPlots:{}}}};
  }
  function recoverDefinition(bundle){
    if(bundle?.format!=='counterplot-tutorial-recovery'||bundle.version!==1)throw Error('Choose a tutorial recovery bundle.');
    const d=D.validate(bundle.definition,W),incoming=W.validate(copy(bundle.scene));
    const index=Math.max(0,Math.min(Number.isInteger(bundle.index)?bundle.index:0,d.lessons.length-1)),step=Math.max(0,Math.min(Number.isInteger(bundle.step)?bundle.step:0,d.lessons[index].goals.length-1));
    const phase=['enter','complete','exit'].includes(bundle.phase)?bundle.phase:'enter';
    const scene=expectedScene(d,index,step,phase).workspace;
    W.mergeSwatches(scene,incoming);d.starter.swatches=copy(scene.swatches||[]);d.starter.hiddenSwatches=copy(scene.hiddenSwatches||[]);
    const before=scene.projects.find(p=>p.id===scene.active),after=incoming.projects.find(p=>p.id===incoming.active),g=d.lessons[index].goals[step];
    g.storyEdits||={};g.storyEdits[phase]=SE.append(g.storyEdits[phase],SE.diff(before,after));
    d.id='tutorial-'+W.uid();d.title=d.title.slice(0,105)+' · Recovered';d.revision='recovered-1';
    return {definition:D.validate(d,W),index,step,phase};
  }
  return {recoverDefinition,phases,names,moveStage,moveGoal,duplicateStage,members,includeDependencies,editReveal,expectedScene,playProgress};
})();
if(typeof module!=='undefined')module.exports=TutorialStudioModel;
