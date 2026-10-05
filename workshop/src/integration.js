/* Shared, DOM-free Workshop migration and story operations. */
(() => {
  const W = typeof module !== 'undefined' ? require('./core.js') : Workshop;
  const L = typeof module !== 'undefined' ? require('./legacy.js') : CounterplotLegacy;
  const baseValidate = W.validate, baseMarkdown = W.markdown,basePurge=W.purgeArchive,baseRekey=W.rekeyEntity,baseDuplicate=W.duplicateNode;
  const copy = W.copy, text = value => typeof value === 'string' ? value : '';
  const list = value => Array.isArray(value) ? value : [];
  const allNodes = p => [...p.nodes, ...p.archive.filter(a => a.kind === 'branch').flatMap(a => a.nodes)];
  const craftRecords = p => allNodes(p).flatMap(n=>[n,...(n.closingCraft?[n.closingCraft]:[])]);
  const allCharacters = p => [...p.characters, ...p.archive.filter(a => a.kind === 'character').map(a => a.item)];
  const allWorld = p => [...p.world, ...p.archive.filter(a => a.kind === 'world').map(a => a.item)];
  const allConnections = p => [...p.connections, ...p.archive.filter(a => a.kind === 'connection').map(a => a.item)];
  const convertBlock = b => ({...copy(b), label:text(b.title), text:text(b.text), detail:text(b.detail), pinned:!!b.locked});
  function normalize(p) {
    // Save the initial order once. Moving an outline card never retimes existing events.
    if (!p.timeline) p.timeline = W.outlineEvents(p).map(({key,node,edge}) => ({id:key.replace(':','-'),key,nodeId:node.id,edge,title:'',storyDate:node.storyDate||'',storyEndDate:node.storyEndDate||''}));
    const covered = new Set(p.timeline.map(e => e.nodeId+':'+e.edge));
    for (const e of W.outlineEvents(p)) if (!covered.has(e.key)) p.timeline.push({id:e.key.replace(':','-'),key:e.key,nodeId:e.node.id,edge:e.edge,title:'',storyDate:e.node.storyDate||'',storyEndDate:e.node.storyEndDate||''});
    p.readingOrder ||= W.ordered(p).map(x => x.node.id);
    const readingIds = new Set(p.readingOrder);
    for (const n of p.nodes) if (!readingIds.has(n.id)) {p.readingOrder.push(n.id);readingIds.add(n.id);}
    normalizeReadingSequence(p);
    p.drafts ||= []; p.plots ||= []; p.storyWorld ||= {}; p.version ||= 'Main draft';
    for (const n of allNodes(p)) { n.writingId ||= n.sceneId || n.id; n.plotIds ||= []; if(n.closingCraft&&typeof n.closingCraft==='object'&&!Array.isArray(n.closingCraft)){n.closingCraft.cast ||= [];n.closingCraft.worldIds ||= [];} }
    for (const c of allCharacters(p)) {
      c.lifeStatus ||= 'alive'; c.lifeChanges ||= []; c.stateCheckpoints ||= [];
      c.prominence ||= {opening:'',changes:[],checkpoints:[]};
    }
    return p;
  }
  // Add closing positions without changing the relative order of existing openings.
  // A thread initially closes after its last descendant in manuscript order.
  function seedReadingSequence(p) {
    const nodes=new Map(allNodes(p).map(n=>[n.id,n])), ends=new Map(), depths=new Map();
    p.readingOrder.forEach((id,index)=>{let n=nodes.get(id),depth=0;const seen=new Set();
      while(n&&!seen.has(n.id)){seen.add(n.id);ends.set(n.id,Math.max(ends.get(n.id)??-1,index));n=nodes.get(n.parentId);depth++;}
      depths.set(id,depth);
    });
    const closing=new Map();
    for(const id of p.readingOrder){const n=nodes.get(id);if(!n||n.type==='B')continue;const index=ends.get(id);if(!closing.has(index))closing.set(index,[]);closing.get(index).push(id);}
    return p.readingOrder.flatMap((id,index)=>[id+':open',...(closing.get(index)||[]).sort((a,b)=>depths.get(b)-depths.get(a)).map(id=>id+':close')]);
  }
  function normalizeReadingSequence(p) {
    const nodes=new Map(allNodes(p).map(n=>[n.id,n]));
    if(p.readingSequence===undefined){p.readingSequence=seedReadingSequence(p);return;}
    if(!Array.isArray(p.readingSequence))throw Error('Reading sequence must be a supported list.');
    const known=new Set(p.readingSequence);
    if(p.readingOrder.every(id=>known.has(id+':open')&&(nodes.get(id)?.type==='B'||known.has(id+':close')))){
      // An older open tab may update the piece order without understanding closings.
      // Honor that order in the opening slots, keeping every saved closing position.
      const openings=p.readingSequence.filter(key=>typeof key==='string'&&key.endsWith(':open'));
      if(openings.length===p.readingOrder.length&&new Set(openings).size===openings.length&&openings.some((key,i)=>key!==p.readingOrder[i]+':open')){let i=0;p.readingSequence=p.readingSequence.map(key=>key.endsWith(':open')?p.readingOrder[i++]+':open':key);}
      return;
    }
    const canonical=seedReadingSequence(p);let next='';
    // New pieces inherit an outline-aware position; existing positions never move.
    for(let i=canonical.length-1;i>=0;i--){const key=canonical[i];if(!known.has(key)){const at=next?p.readingSequence.indexOf(next):p.readingSequence.length;p.readingSequence.splice(at,0,key);known.add(key);}next=key;}
    p.readingOrder=p.readingSequence.filter(key=>typeof key==='string'&&key.endsWith(':open')).map(key=>key.slice(0,-5));
  }
  function readingMoments(p) {
    const nodes=new Map(p.nodes.map(n=>[n.id,n]));
    return (p.readingSequence||seedReadingSequence(p)).flatMap(key=>{const split=key.lastIndexOf(':'),n=nodes.get(key.slice(0,split)),edge=key.slice(split+1);return n&&(edge==='open'||n.type!=='B')?[{key,node:n,edge}]:[];});
  }
  function migrate(raw) {
    const data = L.validateWorkspace(raw);
    const out = {...copy(data), format:'counterplot-workshop', schema:2, projects:[]};
    for (const old of data.projects) {
      const p = {...copy(old), ...W.project(old.title), id:old.id, version:old.version, subtitle:text(old.world?.setting), storyWorld:copy(old.world||{}), plots:copy(old.plotlines||[]), drafts:copy(old.drafts||[]), source:null};
      // These collections have canonical Workshop equivalents; never maintain two editable copies.
      for (const key of ['entities','structure','scenes','moments','plotlines','lab']) delete p[key];
      p.retiredPlanning = copy(old.lab||{}); // Recovery data only: no suggestion engine is installed.
      for(const suggestion of old.lab?.suggestions||[])p.drafts.push({id:'recovered-'+suggestion.id,kind:'scene',title:suggestion.title||'Recovered scene suggestion',draft:copy(suggestion),recoveredFrom:'retired-scene-generator'});
      delete p.retiredPlanning.suggestions;
      const nodeMap = new Map(), sceneMap = new Map();
      for (const n of old.structure||[]) {
        const nn = {...copy(n), ...W.node(n.type==='beat'?'B':n.type,n.parentId||''), id:n.id,
          title:text(n.title),opening:text(n.opening),closing:text(n.closing),notes:text(n.notes),status:n.status||'open',
          cast:[...new Set([n.characterId,n.povId].filter(Boolean))],worldIds:[],plotIds:[...new Set([n.plotlineId,...(n.plotlineIds||[])].filter(Boolean))]};
        // Preserve fields not part of the Workshop constructor, including evidence and explicit scene links.
        p.nodes.push(nn); nodeMap.set(n.id,nn);
      }
      const structureArchived=n=>{const seen=new Set();while(n&&!seen.has(n.id)){if(n.archived)return true;seen.add(n.id);n=nodeMap.get(n.parentId);}return false;};
      for (const s of old.scenes||[]) {
        let n=p.nodes.find(n=>n.type==='B'&&n.openSceneId===s.id&&structureArchived(n)===!!s.archived);
        if (!n) { let parent=nodeMap.get(s.miceId);if(!s.archived)while(parent&&structureArchived(parent))parent=nodeMap.get(parent.parentId);n=W.node('B',parent?.type!=='B'?parent?.id||'':''); n.id=nodeMap.has(s.id)?'scene-'+s.id:s.id; p.nodes.push(n); }
        const structure = copy(n);
        Object.assign(n,copy(s),{id:structure.id,type:'B',parentId:structure.parentId,sceneId:s.id,writingId:s.id,
          title:text(s.title)||structure.title,opening:structure.opening||[s.context,s.action||s.turn||s.development,s.after].filter(Boolean).join('\n\n'),
          closing:'',prose:text(s.notes),notes:structure.notes,status:s.status==='On the page'?'done':'open',sceneStatus:s.status,
          cast:[...new Set([...structure.cast,s.focus,s.partner,...(s.ensemble||[]).map(x=>x.id)].filter(Boolean))],
          worldIds:structure.worldIds,plotIds:[...new Set([...(structure.plotIds||[]),...L.CounterplotEnsemble.plotIdsFor(old,s)])],archived:!!s.archived||!!structure.archived,continuityUnreviewed:!!s.sourceHash});
        sceneMap.set(s.id,n.id);
      }
      // Moment IDs survive unchanged. Their chronological sequence is independent of the outline.
      const momentKeys=new Set();
      p.timeline=(old.moments||[]).map(m=>{
        const nodeId=sceneMap.get(m.sceneId)||m.nodeId||'', n=p.nodes.find(x=>x.id===nodeId);
        const edge=n?.type==='B'?'open':m.edge==='close'?'close':'open';
        let key=nodeId?nodeId+':'+edge:m.id+':moment';if(momentKeys.has(key))key=m.id+':moment';momentKeys.add(key);
        return {...copy(m),key,nodeId,edge,title:text(m.title),storyDate:text(m.date||m.storyDate),storyEndDate:text(m.endDate||m.storyEndDate)};
      });
      const timed = xs => list(xs).map(x=>({...copy(x),at:p.timeline.find(e=>e.id===x.momentId)?.key||x.at||''}));
      for (const c of old.characters) {
        const cc={...copy(c),color:'orange',blocks:c.blocks.map(convertBlock),changes:timed(c.changes).map(x=>({...x,op:x.operation==='replace'?'develop':x.operation,block:x.block?convertBlock(x.block):null,reason:text(x.reason)})),
          lifeChanges:timed(c.lifeChanges),stateCheckpoints:timed(c.stateCheckpoints).map(x=>({...x,blocks:x.blocks.map(convertBlock)}))};
        if(c.archived)p.archive.push({id:'archive-'+c.id,kind:'character',title:c.name,created:old.updatedAt,item:cc});else p.characters.push(cc);
      }
      p.characters.sort((a,b)=>(old.castOrder||[]).indexOf(a.id)-(old.castOrder||[]).indexOf(b.id));
      for (const e of old.entities) {
        const item={...copy(e),name:text(e.name),type:text(e.type),notes:text(e.notes)};
        if(e.archived)p.archive.push({id:'archive-'+e.id,kind:'world',title:e.name,created:old.updatedAt,item});else p.world.push(item);
      }
      for (const r of old.connections) {
        const item={...copy(r),label:text(r.bond)||'Connected',notes:text(r.notes)};
        if(r.archived)p.archive.push({id:'archive-'+r.id,kind:'connection',title:item.label,created:old.updatedAt,item});else p.connections.push(item);
      }
      p.readingOrder=(old.scenes||[]).map(s=>sceneMap.get(s.id));
      for(const n of p.nodes)if(!p.readingOrder.includes(n.id))p.readingOrder.push(n.id);
      // Archived branches remain archived, including descendants and their prose.
      const archived=new Set(p.nodes.filter(n=>n.archived).map(n=>n.id));
      for(const id of [...archived])for(const child of W.descendants(p,id))archived.add(child);
      for(const n of [...p.nodes])if(archived.has(n.id)&&!archived.has(n.parentId)&&p.nodes.includes(n))W.archiveNode(p,n.id);
      p.migration={from:'counterplot',schema:raw.schema,sceneIds:Object.fromEntries(sceneMap),version:1};
      out.projects.push(normalize(p));
    }
    return validate(out);
  }
  function validate(data) {
    if(data?.format!=='counterplot-workshop'||![1,2].includes(data.schema))throw Error('Unsupported Counterplot Workshop backup.');
    for(const p of [...list(data.projects),...list(data.trash).map(x=>x.project)])normalize(p);
    const version=data.schema;
    try {data.schema=1;baseValidate(data);} finally {data.schema=version;}
    const fail=s=>{throw Error(s);};
    const array=(v,label,max=20000)=>{if(!Array.isArray(v)||v.length>max)fail(label+' must be a supported list.');return v;};
    const unique=(v,label)=>{const seen=new Set();for(const x of v){if(typeof x!=='string'||!x||seen.has(x))fail('Invalid or duplicate '+label+'.');seen.add(x);}return seen;};
    const date=v=>!v||L.CounterplotStory.validDate(v);
    for(const p of [...data.projects,...list(data.trash).map(x=>x.project)]){
      const nodes=allNodes(p),nodeIds=unique(nodes.map(n=>n.id),'outline identity');
      const events=array(p.timeline,'Chronology');unique(events.map(e=>e.id),'story moment');unique(events.map(e=>e.key),'story event');
      const eventIds=new Set(events.flatMap(e=>[e.id,e.key]));
      for(const e of events){if(e.nodeId&&!nodeIds.has(e.nodeId))fail('Chronology points to a missing piece.');if(!/^[A-Za-z0-9_-]{1,120}$/.test(e.id))fail('Invalid moment identity.');if(typeof e.key!=='string'||!/^[A-Za-z0-9_-]{1,120}:(open|close|moment)$/.test(e.key))fail('Invalid story moment key.');if(!date(e.storyDate)||!date(e.storyEndDate))fail('Use a valid story date.');if(e.storyDate&&e.storyEndDate&&e.storyEndDate<e.storyDate)fail('The end date precedes the start date.');}
      for(const id of unique(array(p.readingOrder,'Reading order'),'reading position'))if(!nodeIds.has(id))fail('Reading order points to a missing piece.');
      for(const key of unique(array(p.readingSequence,'Reading sequence',40000),'reading moment')){const split=key.lastIndexOf(':');if(!nodeIds.has(key.slice(0,split))||!['open','close'].includes(key.slice(split+1)))fail('Reading sequence points to a missing piece or edge.');}
      const people=allCharacters(p),world=allWorld(p),targets=new Set([...people,...world].map(x=>x.id));
      const timing=(xs,label)=>{unique(array(xs||[],label).map(x=>x.id),label+' identity');for(const x of xs||[])if(!eventIds.has(x.at||x.momentId))fail(label+' points to a missing story moment.');};
      const knowledge=o=>{for(const id of o.knownBy||[])if(!targets.has(id))fail('Knowledge points to a missing person or faction.');for(const [id,mid] of Object.entries(o.knownFrom||{})){if(!(o.knownBy||[]).includes(id)||mid&&!eventIds.has(mid))fail('Invalid knowledge timing.');}};
      const block=b=>{knowledge(b);for(const link of [...(b.targetId?[{targetId:b.targetId,role:'target'}]:[]),...list(b.links)])if(!targets.has(link.targetId)||!['target','for','from','at','with','against'].includes(link.role))fail('A block attachment is invalid.');};
      for(const c of people){timing(c.lifeChanges,'Life history');for(const x of [{status:c.lifeStatus},...c.lifeChanges])if(!['alive','dead'].includes(x.status))fail('Invalid life status.');timing(c.stateCheckpoints,'Character checkpoints');for(const x of c.stateCheckpoints){if(!['alive','dead'].includes(x.lifeStatus))fail('Invalid checkpoint life status.');unique(array(x.blocks,'Checkpoint pieces').map(b=>b.id),'checkpoint piece');for(const b of x.blocks)block(b);}for(const b of [...c.blocks,...c.changes.flatMap(x=>x.block?[x.block]:[])])block(b);timing(c.prominence.changes,'Prominence');timing(c.prominence.checkpoints,'Prominence checkpoints');}
      for(const n of nodes){if(!date(n.storyDate)||!date(n.storyEndDate))fail('Use a valid scene date.');for(const id of n.cast)if(!targets.has(id))fail('A scene participant is missing.');for(const id of n.worldIds)if(!targets.has(id))fail('A world link is missing.');for(const evidence of n.evidenceLinks||[]){if(!['supports','challenges','complicates'].includes(evidence.bearing))fail('Invalid evidence interpretation.');if(evidence.sourceType==='fact'?!world.some(w=>w.id===evidence.sourceId&&w.type==='fact'):evidence.sourceType!=='scene'||!nodes.some(x=>[x.id,x.writingId,x.sceneId].includes(evidence.sourceId)))fail('Evidence points to a missing fact or scene.');}}
      const scenes=new Set(nodes.flatMap(n=>[n.id,n.writingId,n.sceneId].filter(Boolean)));
      for(const c of craftRecords(p)){if(c.refinement!==undefined){if(!c.refinement||typeof c.refinement!=='object'||Array.isArray(c.refinement))fail('Refinement must be a record.');for(const value of Object.values(c.refinement))if(typeof value!=='string'||value.length>2000000)fail('Refinement answers must be text.');}}
      for(const n of nodes){
        if(n.closingProse!==undefined&&(typeof n.closingProse!=='string'||n.closingProse.length>2000000))fail('Closing prose must be text.');
        if(n.closingWritingStatus!==undefined&&!['draft','done'].includes(n.closingWritingStatus))fail('Invalid closing writing status.');
        const c=n.closingCraft;if(c===undefined)continue;
        if(!c||typeof c!=='object'||Array.isArray(c))fail('Closing craft must be a record.');
        for(const key of ['ideaNotes','context','goal','purpose','entry','tension','stakes','development','turn','action','after','gain','cost','response','reaction','readerExpectation','next','exit','thread','sceneKind'])if(c[key]!==undefined&&(typeof c[key]!=='string'||c[key].length>2000000))fail('Closing craft fields must be text.');
        for(const id of array(c.cast||[],'Closing cast'))if(!people.some(p=>p.id===id))fail('A closing participant is missing.');
        for(const key of ['povId','focus'])if(c[key]&&!people.some(p=>p.id===c[key]))fail('A closing point of view is missing.');
        for(const id of array(c.worldIds||[],'Closing world links'))if(!world.some(w=>w.id===id))fail('A closing world link is missing.');
        for(const b of array(c.beats||[],'Closing internal beats'))if(typeof b!=='string')fail('Internal beats must be text.');
        for(const x of array(c.ensemble||[],'Closing roles'))if(!x||!people.some(p=>p.id===x.id)||!['present','assist','oppose','complicate','witness'].includes(x.role))fail('Invalid closing role.');
        for(const x of array(c.miceLinks||[],'Closing thread links'))if(!x||!nodes.some(n=>n.id===x.miceId)||!['open','advance','close'].includes(x.edge||x.role))fail('Invalid closing thread link.');
        for(const id of [c.parent,c.openSceneId,c.closeSceneId,...array(c.extraParents||[],'Closing causal links').map(x=>x?.id)].filter(Boolean))if(!scenes.has(id))fail('A closing scene link is missing.');
      }
      const byScene=new Map(nodes.flatMap(n=>[n.id,n.writingId,n.sceneId].filter(Boolean).map(id=>[id,n]))),degrees=new Map(),children=new Map();
      for(const n of nodes){const parents=new Set([n.parent,...(n.extraParents||[]).map(x=>x.id)].filter(Boolean).map(id=>{const parent=byScene.get(id);if(!parent)fail('A causal parent is missing.');return parent.id;}));degrees.set(n.id,parents.size);for(const id of parents){if(!children.has(id))children.set(id,[]);children.get(id).push(n.id);}}
      const ready=nodes.filter(n=>!degrees.get(n.id)).map(n=>n.id);for(let i=0;i<ready.length;i++)for(const child of children.get(ready[i])||[]){degrees.set(child,degrees.get(child)-1);if(!degrees.get(child))ready.push(child);}if(ready.length!==nodes.length)fail('Causal links contain a cycle.');

      for(const e of world){knowledge(e);timing(e.stateChanges,'World history');if(e.faction){timing(e.faction.changes,'Faction history');timing(e.faction.checkpoints,'Faction checkpoints');}for(const r of e.readerAppearances||[])if(!scenes.has(r.sceneId)||!['shown','reinterpreted'].includes(r.kind))fail('A reader appearance is invalid.');}
      for(const r of allConnections(p)){if(!targets.has(r.a)||!targets.has(r.b)||r.a===r.b)fail('Choose two distinct people or factions.');timing(r.changes,'Connection history');for(const terms of [r.terms,...(r.changes||[]).map(x=>x.terms)].filter(Boolean)){if(terms.membership&&!['unspecified','member','associate','former','none'].includes(terms.membership))fail('Invalid membership.');if(terms.visibility&&!['open','concealed','contested'].includes(terms.visibility))fail('Invalid relationship visibility.');}}
      for(const plot of p.plots)for(const tr of plot.cast||[]){if(!targets.has(tr.characterId))fail('A plot role references a missing person.');timing(tr.changes,'Plot roles');timing(tr.checkpoints,'Plot checkpoints');}
    }
    if(data.tutorialRecords!==undefined){if(!data.tutorialRecords||Array.isArray(data.tutorialRecords)||typeof data.tutorialRecords!=='object')fail('Tutorial saves must be records.');for(const [key,value]of Object.entries(data.tutorialRecords)){if(!/^(counterplot\.tutorial\.(custom\.index\.v1|build\.v2|definition\.[A-Za-z0-9_-]+\.v1|draft\.[A-Za-z0-9_-]+\.v2|practice\.[A-Za-z0-9_-]+\.v1|cursor\.[A-Za-z0-9_-]+\.v1)|counterplot\.guide\.(library\.v1|mgs3\.build\.v3|mgs3\.build\.v2\.[A-Za-z0-9_-]+))$/.test(key)||typeof value!=='string')fail('Unsupported tutorial storage key.');try{JSON.parse(value);}catch{fail('Invalid tutorial save JSON.');}}}
    data.schema=2;return data;
  }
  const timelineProject=p=>({moments:W.events(p).map(e=>({id:e.id||e.key}))});
  const momentId=(p,key)=>W.events(p).find(e=>e.key===key||e.id===key)?.id||key;
  function fold(p,opening,changes,key,keys,checkpoints=[]) {return L.CounterplotEnsemble.fold(timelineProject(p),opening,changes||[],momentId(p,key),keys,checkpoints);}
  function worldState(p,e,key='') {return fold(p,{value:e.stateValue||'',targetId:e.stateTargetId||''},e.stateChanges,key,['value','targetId']);}
  function connectionState(p,r,key='') {const state=fold(p,{bond:r.label,aWant:r.aWant||'',bWant:r.bWant||'',notes:r.notes},r.changes,key,['bond','aWant','bWant','notes']);state.terms=L.CounterplotEnsemble.termsAt(timelineProject(p),r,momentId(p,key));return state;}
  function knownAt(p,item,who,key='') {if(!(item.knownBy||[]).includes(who))return false;const from=item.knownFrom?.[who];if(!from)return true;const events=W.events(p),i=events.findIndex(e=>e.id===from||e.key===from),at=events.findIndex(e=>e.id===key||e.key===key);return i>=0&&at>=i;}
  function readerAt(p,item,writingId){const order=reading(p).map(n=>n.sceneId||n.writingId||n.id),stop=order.indexOf(writingId);return list(item.readerAppearances).filter(x=>order.indexOf(x.sceneId)>=0&&order.indexOf(x.sceneId)<=stop);}
  function reading(p,{archived=false}={}){const nodes=new Map((archived?allNodes(p):p.nodes).map(n=>[n.id,n]));return p.readingOrder.map(id=>nodes.get(id)).filter(Boolean);}
  function reorder(p,collection,id,beforeId='') {const xs=collection==='timeline'?p.timeline:collection==='readingOrder'?p.readingOrder:collection==='readingSequence'?p.readingSequence:p.characters;const at=xs.findIndex(x=>(typeof x==='string'?x:x.key||x.id)===id);if(at<0)throw Error('That item no longer exists.');const dest=beforeId?xs.findIndex(x=>(typeof x==='string'?x:x.key||x.id)===beforeId):xs.length;if(dest<0)throw Error('That destination no longer exists.');const [item]=xs.splice(at,1);xs.splice(dest-(at<dest?1:0),0,item);if(collection==='readingSequence')p.readingOrder=xs.filter(key=>key.endsWith(':open')).map(key=>key.slice(0,-5));if(collection==='readingOrder'){const key=id+':open',at=p.readingSequence.indexOf(key);if(at>=0){p.readingSequence.splice(at,1);const dest=beforeId?p.readingSequence.indexOf(beforeId+':open'):p.readingSequence.length;p.readingSequence.splice(dest<0?p.readingSequence.length:dest,0,key);}}}
  function removeFrame(p,id){const n=p.nodes.find(n=>n.id===id);if(!n||n.type==='B')throw Error('Choose a thread frame.');const index=p.nodes.indexOf(n);for(const child of p.nodes)if(child.parentId===id)child.parentId=n.parentId;
    if(n.closingProse||n.closingCraft){
      const closing={...W.node('B',n.parentId),...copy(n.closingCraft||{}),title:(n.title||'Thread')+' · Closing',opening:n.closing,prose:n.closingProse||'',writingStatus:n.closingWritingStatus||'draft',plotIds:copy(n.plotIds||[])};
      if(!n.closingCraft)closing.cast=copy(n.cast);
      p.nodes.splice(index+1,0,closing);
      const oldKey=n.id+':close',newKey=closing.id+':open';
      p.readingSequence=p.readingSequence.map(key=>key===oldKey?newKey:key);
      p.readingOrder=p.readingSequence.filter(key=>key.endsWith(':open')).map(key=>key.slice(0,-5));
      const event=p.timeline.find(e=>e.nodeId===n.id&&e.edge==='close');
      if(event)Object.assign(event,{key:newKey,nodeId:closing.id,edge:'open'});
      // Keep moment IDs and chronological positions; retarget key-based histories.
      const retime=o=>{if(!o||typeof o!=='object')return;if(Array.isArray(o)){o.forEach(retime);return;}for(const key of ['at','momentId'])if(o[key]===oldKey)o[key]=newKey;if(o.knownFrom)for(const id of Object.keys(o.knownFrom))if(o.knownFrom[id]===oldKey)o.knownFrom[id]=newKey;for(const [key,value] of Object.entries(o))if(!['source','migration','drafts','retiredPlanning','continuitySnapshot'].includes(key))retime(value);};retime(p);
      delete n.closingProse;delete n.closingCraft;delete n.closingWritingStatus;
    }
    // The writing remains a stable fragment, and both historical edges remain addressable.
    n.removedFrame={type:n.type,opening:n.opening,closing:n.closing};n.type='B';n.closing='';n.title ||= 'Writing from removed frame';p.nodes.splice(index,1,n);
  }
  function duplicateCharacter(p,id){const c=p.characters.find(x=>x.id===id);if(!c)throw Error('Choose a character.');const clone=copy(c),map=new Map();const newId=id=>{if(!map.has(id))map.set(id,W.uid());return map.get(id);};clone.id=W.uid();clone.name+=' · copy';for(const b of clone.blocks)b.id=newId(b.id);for(const x of clone.changes){x.id=W.uid();x.blockId=newId(x.blockId);if(x.block)x.block.id=x.blockId;}for(const x of clone.stateCheckpoints||[]){x.id=W.uid();for(const b of x.blocks)b.id=newId(b.id);}for(const x of clone.lifeChanges||[])x.id=W.uid();p.characters.push(clone);return clone;}
  function snapshot(p,n){const key=W.events(p).find(e=>e.nodeId===n.id&&e.edge==='open')?.key||'';return {characters:n.cast.map(id=>allCharacters(p).find(c=>c.id===id)).filter(Boolean).map(c=>{const state=W.characterState(p,c,key,true);return {id:c.id,name:c.name,identity:c.identity,blocks:state.blocks,lifeStatus:state.lifeStatus};}),world:n.worldIds.map(id=>allWorld(p).find(w=>w.id===id)).filter(Boolean).map(w=>({id:w.id,...worldState(p,w,key)})),parents:[n.parent,...(n.extraParents||[]).map(x=>x.id)].filter(Boolean).map(id=>{const s=allNodes(p).find(n=>n.id===id||n.sceneId===id);return s?{id,title:s.title,prose:s.prose,action:s.action,after:s.after}: {id,missing:true};})};}
  function continuity(p,n){const current=snapshot(p,n);return {stale:!!n.continuityUnreviewed||!!n.continuitySnapshot&&JSON.stringify(current)!==JSON.stringify(n.continuitySnapshot),previous:n.continuitySnapshot||n.sourceSnapshot||null,current};}
  function acceptContinuity(p,n){n.continuitySnapshot=snapshot(p,n);n.continuityUnreviewed=false;}
  function consequences(p,key,changes){const candidate=copy(p),mid=momentId(candidate,key);if(!W.events(candidate).some(e=>e.id===mid))throw Error('Choose a story moment.');for(const item of changes){const record={...copy(item.value),id:item.value.id||W.uid(),momentId:mid,at:key};let target;
      if(item.kind==='block'){target=candidate.characters.find(c=>c.id===item.targetId);if(!target)throw Error('Missing character.');target.changes.push(record);}
      else if(item.kind==='life'){target=candidate.characters.find(c=>c.id===item.targetId);if(!target)throw Error('Missing character.');target.lifeChanges.push(record);}
      else if(item.kind==='world'){target=candidate.world.find(c=>c.id===item.targetId);if(!target)throw Error('Missing World entry.');(target.stateChanges||=[]).push(record);}
      else if(item.kind==='connection'){target=candidate.connections.find(c=>c.id===item.targetId);if(!target)throw Error('Missing connection.');(target.changes||=[]).push(record);}
      else if(item.kind==='prominence'){target=candidate.characters.find(c=>c.id===item.targetId);if(!target)throw Error('Missing character.');target.prominence.changes.push(record);}
      else if(item.kind==='role'){const plot=candidate.plots.find(c=>c.id===item.plotId);if(!plot)throw Error('Missing plot.');plot.cast||=[];target=plot.cast.find(c=>c.characterId===item.targetId);if(!target){target={id:W.uid(),characterId:item.targetId,opening:{inPlot:false,roles:[],note:''},changes:[],checkpoints:[]};plot.cast.push(target);}target.changes.push(record);}
      else if(item.kind==='faction'){target=candidate.world.find(c=>c.id===item.targetId&&c.type==='group');if(!target)throw Error('Missing faction.');target.faction||={blocks:[],changes:[],checkpoints:[]};target.faction.changes.push(record);}
      else if(item.kind==='knowledge'){target=candidate.world.find(c=>c.id===item.targetId)||allCharacters(candidate).flatMap(c=>c.blocks).find(b=>b.id===item.targetId);if(!target)throw Error('Missing fact or character piece.');target.knownBy=[...new Set([...(target.knownBy||[]),item.value.knowerId])];target.knownFrom={...(target.knownFrom||{}),[item.value.knowerId]:mid};}
      else if(item.kind==='reader'){target=candidate.world.find(c=>c.id===item.targetId&&c.type==='fact');if(!target)throw Error('Missing fact.');target.readerAppearances||=[];if(item.value.kind==='shown'&&target.readerAppearances.some(a=>a.kind==='shown'))throw Error('This fact already has a first appearance. Edit its knowledge record.');target.readerAppearances.push({id:record.id,sceneId:item.value.sceneId,kind:item.value.kind,note:item.value.note||''});}
      else throw Error('Unsupported consequence.');
    }validate({format:'counterplot-workshop',schema:2,active:candidate.id,projects:[candidate]});Object.assign(p,candidate);return p;}
  function usedHere(p,id){const results=[];const linked=v=>{if(!v||typeof v!=='object')return false;return Object.entries(v).some(([key,value])=>!['id','source','references','portrait','retiredPlanning','migration','continuitySnapshot'].includes(key)&&((value===id)||Array.isArray(value)&&value.includes(id)||typeof value==='object'&&linked(value)));};for(const [kind,items]of [['node',allNodes(p)],['character',allCharacters(p)],['world',allWorld(p)],['connection',allConnections(p)],['draft',p.drafts]])for(const item of items)if(linked(item))results.push({kind,id:item.id,label:item.name||item.title||item.label||'Unfinished draft',archived:p.archive.some(a=>a.item?.id===item.id||a.nodes?.some(n=>n.id===item.id))});return results;}
  function search(p,query){const q=query.trim().toLocaleLowerCase();if(!q)return [];const results=[];for(const [kind,items]of [['node',allNodes(p)],['character',allCharacters(p)],['world',allWorld(p)],['connection',allConnections(p)],['draft',p.drafts]])for(const x of items){const clean={...x};delete clean.portrait;delete clean.source;if(JSON.stringify(clean).toLocaleLowerCase().includes(q))results.push({kind,id:x.id,title:x.title||x.name||x.label||'Unfinished draft',archived:p.archive.some(a=>a.item?.id===x.id||a.nodes?.some(n=>n.id===x.id))});}return results;}
  function sharedStakes(p){const targets=new Map();for(const c of p.characters)for(const b of c.blocks)if(b.kind==='want')for(const id of [b.targetId,...(b.links||[]).filter(x=>x.role==='target').map(x=>x.targetId)].filter(Boolean)){if(!targets.has(id))targets.set(id,[]);targets.get(id).push({characterId:c.id,blockId:b.id,text:b.text});}return [...targets].filter(([,xs])=>new Set(xs.map(x=>x.characterId)).size>1).map(([targetId,participants])=>({targetId,participants}));}
  function taggedOutline(p){return W.outlineEvents(p).map(({node:n,edge})=>n.type==='B'?(n.opening||n.title):'<'+(edge==='close'?'/':'')+n.type+'> '+(edge==='close'?n.closing:n.opening||n.title)).join('\n');}
  function parseOutline(value){return L.CounterplotStory.parse(value,W.uid).nodes.map(n=>({...W.node(n.type==='beat'?'B':n.type,n.parentId),...n,type:n.type==='beat'?'B':n.type,prose:'',cast:[],worldIds:[]}));}
  function structureIssues(p){return L.CounterplotStory.issues({structure:p.nodes.map(n=>({...n,type:n.type==='B'?'beat':n.type})),scenes:reading(p,{archived:true}).map(n=>({...n,id:n.sceneId||n.id,archived:!p.nodes.includes(n)}))});}
  function continueScene(p,id){const parent=p.nodes.find(n=>n.id===id);if(!parent)throw Error('Choose a scene to continue.');const n=W.node('B',parent.parentId);n.title='After '+(parent.title||'this scene');n.parent=parent.sceneId||parent.id;n.cast=copy(parent.cast);n.plotIds=copy(parent.plotIds||[]);p.nodes.push(n);normalize(p);const at=p.readingOrder.indexOf(id);p.readingOrder=p.readingOrder.filter(x=>x!==n.id);p.readingOrder.splice(at+1,0,n.id);reorder(p,'readingOrder',n.id,p.readingOrder[at+2]||'');acceptContinuity(p,n);return n;}
  function addEarlierSelf(p,id,{earlierLabel='',preservedLabel,storyDate='',seed='copy',lifeStatus='alive'}){
    const c=p.characters.find(c=>c.id===id);if(!c||!preservedLabel?.trim())throw Error('Name the opening you want to preserve.');if(!['copy','blank'].includes(seed)||!['alive','dead'].includes(lifeStatus)||!L.CounterplotStory.validDate(storyDate))throw Error('Choose valid earlier-state options.');
    const mid=W.uid(),key=mid+':moment';p.timeline.unshift({id:mid,key,nodeId:'',edge:'open',title:preservedLabel.trim(),storyDate,storyEndDate:'',affectedCharacterIds:[id]});
    c.stateCheckpoints.push({id:W.uid(),momentId:mid,at:key,blocks:copy(c.blocks),lifeStatus:c.lifeStatus});
    c.prominence.checkpoints.push({id:W.uid(),momentId:mid,value:{value:c.prominence.opening}});
    for(const pl of p.plots)for(const track of pl.cast||[])if(track.characterId===id)(track.checkpoints||=[]).push({id:W.uid(),momentId:mid,value:copy(track.opening)});
    for(const d of p.drafts)if(d.character===id||d.context?.cid===id)d.preservedMomentId=mid;
    c.openingLabel=earlierLabel;c.blocks=seed==='blank'?[]:copy(c.blocks);c.lifeStatus=lifeStatus;return key;
  }
  function transitionFaction(p,{sourceId,partnerId='',mode='split',names=[],moment,memberIds=[]}){
    const source=p.world.find(w=>w.id===sourceId&&w.type==='group'),partner=p.world.find(w=>w.id===partnerId&&w.type==='group'),mid=momentId(p,moment);
    if(!source||!W.events(p).some(e=>e.id===mid)||!['split','merge','absorb'].includes(mode))throw Error('Choose a faction, a story moment, and a transition.');if(mode!=='split'&&(!partner||source===partner))throw Error('Choose a second faction.');
    const destinations=mode==='absorb'?[partner]:[...new Set(names.map(x=>x.trim()).filter(Boolean))].map(name=>({id:W.uid(),name,type:'group',notes:'',stateLabel:'Institutional status',stateValue:'Not yet formed',stateTargetId:'',stateChanges:[{id:W.uid(),momentId:mid,value:'Formed',targetId:'',reason:'Faction '+mode}],faction:{blocks:[],changes:[],checkpoints:[]}}));
    if(!destinations.length)throw Error('Name at least one successor faction.');if(mode!=='absorb')p.world.push(...destinations);const sources=mode==='merge'?[source,partner]:[source];
    const tie=(a,b,terms)=>{let r=p.connections.find(x=>x.a===a&&x.b===b||x.a===b&&x.b===a);if(!r){r={id:W.uid(),a,b,label:'Faction '+mode,notes:'',aWant:'',bWant:'',terms:{active:false,membership:'none'},changes:[]};p.connections.push(r);}const patch=copy(terms);if(r.a!==a)[patch.aTie,patch.bTie]=[patch.bTie,patch.aTie];const existing=r.changes.find(x=>x.momentId===mid);if(existing)existing.terms={...(existing.terms||{}),...patch};else r.changes.push({id:W.uid(),momentId:mid,terms:patch,reason:'Faction '+mode});};
    for(const dest of destinations)for(const from of sources)tie(from.id,dest.id,{active:true,aTie:mode==='split'?'Has breakaway':mode==='merge'?'Merged into':'Absorbed into',bTie:mode==='split'?'Split from':mode==='merge'?'Formed from':'Absorbed'});
    for(const id of memberIds){if(!p.characters.some(c=>c.id===id))throw Error('A selected member is missing.');for(const r of [...p.connections])if((r.a===id&&sources.some(s=>s.id===r.b))||(r.b===id&&sources.some(s=>s.id===r.a))){const state=connectionState(p,r,moment);if(state.terms.active&&state.terms.membership==='member')tie(r.a,r.b,{membership:'former',leadership:false,position:'',active:true});}tie(id,destinations[0].id,{membership:'member',active:true});}
    return destinations;
  }
  function purgeArchive(p,ids){
    const beforeNodes=new Map(allNodes(p).map(n=>[n.id,n]));basePurge(p,ids);
    const people=new Set(allCharacters(p).map(c=>c.id)),world=new Set(allWorld(p).map(w=>w.id)),targets=new Set([...people,...world]),nodes=new Set(allNodes(p).map(n=>n.id)),scenes=new Set(allNodes(p).flatMap(n=>[n.id,n.sceneId,n.writingId].filter(Boolean)));
    p.connections=p.connections.filter(r=>targets.has(r.a)&&targets.has(r.b));p.archive=p.archive.filter(a=>a.kind!=='connection'||targets.has(a.item.a)&&targets.has(a.item.b));
    const prune=o=>{if(!o||typeof o!=='object')return;if(Array.isArray(o)){o.forEach(prune);return;}if(o.knownBy)o.knownBy=o.knownBy.filter(id=>targets.has(id));if(o.knownFrom)o.knownFrom=Object.fromEntries(Object.entries(o.knownFrom).filter(([id])=>targets.has(id)));if(o.links)o.links=o.links.filter(x=>targets.has(x.targetId));for(const key of ['targetId','stateTargetId'])if(o[key]&&!targets.has(o[key]))o[key]='';if(o.readerAppearances)o.readerAppearances=o.readerAppearances.filter(x=>scenes.has(x.sceneId));for(const [key,value]of Object.entries(o))if(!['source','retiredPlanning','migration','drafts','continuitySnapshot'].includes(key))prune(value);};prune(p);
    for(const n of craftRecords(p)){n.cast=(n.cast||[]).filter(id=>people.has(id));n.worldIds=(n.worldIds||[]).filter(id=>world.has(id));n.ensemble=(n.ensemble||[]).filter(x=>people.has(x.id));n.factionIds=(n.factionIds||[]).filter(id=>world.has(id));for(const key of ['povId','focus','partner','characterId'])if(n[key]&&!people.has(n[key]))n[key]='';if(n.parent&&!scenes.has(n.parent))n.parent='';n.extraParents=(n.extraParents||[]).filter(x=>scenes.has(x.id));n.miceLinks=(n.miceLinks||[]).filter(x=>nodes.has(x.miceId));n.evidenceLinks=(n.evidenceLinks||[]).filter(x=>x.sourceType==='fact'?world.has(x.sourceId):scenes.has(x.sourceId));for(const key of ['openSceneId','closeSceneId'])if(n[key]&&!scenes.has(n[key]))n[key]='';}
    for(const plot of p.plots)plot.cast=(plot.cast||[]).filter(x=>people.has(x.characterId));
    p.readingOrder=p.readingOrder.filter(id=>nodes.has(id));
    p.readingSequence=p.readingSequence.filter(key=>nodes.has(key.slice(0,key.lastIndexOf(':'))));
    for(const e of p.timeline)if(e.nodeId&&!nodes.has(e.nodeId)){e.title ||= beforeNodes.get(e.nodeId)?.title||'Historical moment';e.nodeId='';}
  }
  // Extend the original tutorial identity operation to the retained story histories.
  function rekeyEntity(p,entity,from,to,cid='') {
    const changed=baseRekey(p,entity,from,to,cid);if(!changed)return false;
    const rename=id=>id===from?to:id, timeMap=new Map();
    if(entity==='node'){
      p.readingOrder=(p.readingOrder||[]).map(rename);
      p.readingSequence=(p.readingSequence||[]).map(key=>key.startsWith(from+':')?to+key.slice(from.length):key);
      for(const e of p.timeline||[]){
        if(e.nodeId===from)e.nodeId=to;
        for(const field of ['id','key'])if(e[field]===from+'-open'||e[field]===from+'-close'||e[field]?.startsWith(from+':')){
          const old=e[field];e[field]=to+old.slice(from.length);timeMap.set(old,e[field]);
        }
      }
      for(const n of craftRecords(p)){
        if(n.writingId===from)n.writingId=to;if(n.sceneId===from)n.sceneId=to;
        for(const key of ['parent','openSceneId','closeSceneId','miceId'])if(n[key]===from)n[key]=to;
        for(const x of n.extraParents||[])x.id=rename(x.id);
        for(const x of n.miceLinks||[])x.miceId=rename(x.miceId);
        for(const x of n.evidenceLinks||[])if(x.sourceType==='scene')x.sourceId=rename(x.sourceId);
      }
    }
    if(entity==='character'||entity==='world'){
      for(const r of allConnections(p)){r.a=rename(r.a);r.b=rename(r.b);}
      for(const n of craftRecords(p)){
        if(n.cast)n.cast=n.cast.map(rename);if(n.worldIds)n.worldIds=n.worldIds.map(rename);
        for(const key of ['povId','focus','partner','characterId'])if(n[key]===from)n[key]=to;
        n.factionIds=(n.factionIds||[]).map(rename);
        for(const x of n.ensemble||[])x.id=rename(x.id);
        for(const x of n.evidenceLinks||[])if(x.sourceType==='fact')x.sourceId=rename(x.sourceId);
      }
      for(const plot of p.plots||[])for(const tr of plot.cast||[])tr.characterId=rename(tr.characterId);
    }
    if(entity==='block')for(const c of allCharacters(p).filter(c=>c.id===cid))for(const checkpoint of c.stateCheckpoints||[])for(const b of checkpoint.blocks)if(b.id===from)b.id=to;
    const visit=o=>{
      if(!o||typeof o!=='object')return;if(Array.isArray(o)){o.forEach(visit);return;}
      if(entity==='node'){
        for(const key of ['at','momentId'])if(timeMap.has(o[key]))o[key]=timeMap.get(o[key]);
        if(o.knownFrom)for(const key of Object.keys(o.knownFrom))if(timeMap.has(o.knownFrom[key]))o.knownFrom[key]=timeMap.get(o.knownFrom[key]);
        for(const r of o.readerAppearances||[])r.sceneId=rename(r.sceneId);
      }else if(entity==='character'||entity==='world'){
        if(o.knownBy)o.knownBy=o.knownBy.map(rename);
        if(o.knownFrom&&Object.hasOwn(o.knownFrom,from)){o.knownFrom[to]=o.knownFrom[from];delete o.knownFrom[from];}
        for(const key of ['targetId','stateTargetId'])if(o[key]===from)o[key]=to;
      }
      for(const [key,value]of Object.entries(o))if(!['source','migration','drafts','retiredPlanning','continuitySnapshot','sourceSnapshot'].includes(key))visit(value);
    };visit(p);return true;
  }
  function duplicateNode(p,id){
    const previous=new Set(p.nodes.map(n=>n.id)),root=baseDuplicate(p,id);
    for(const n of p.nodes.filter(n=>!previous.has(n.id))){n.writingId=n.id;delete n.sceneId;delete n.sourceHash;delete n.continuitySnapshot;n.continuityUnreviewed=false;}
    normalize(p);return root;
  }
  function markdown(p){
    const label=id=>[...allCharacters(p),...allWorld(p)].find(x=>x.id===id)?.name||id;
    const when=id=>{const e=W.events(p).find(e=>e.id===id||e.key===id);return e?((e.storyDate?e.storyDate+' · ':'')+(e.title||e.node.title)):id||'Opening';};
    const lines=[baseMarkdown(p),'','## Version',p.version||'Main draft','','## Manuscript',...readingMoments(p).filter(e=>e.edge==='close'?e.node.closingProse:e.node.prose).flatMap(e=>['','### '+e.node.title+(e.edge==='close'?' · Closing':''),'',e.edge==='close'?e.node.closingProse:e.node.prose]),'','## Story chronology',...W.events(p).map(e=>'- '+when(e.id||e.key)+' · '+e.edge),'','## Scene craft'];
    for(const e of readingMoments(p)){const n=e.edge==='close'?e.node.closingCraft:e.node;if(!n)continue;lines.push('','### '+(e.node.title||'Untitled')+(e.edge==='close'?' · Closing':''));for(const key of ['goal','purpose','context','entry','tension','stakes','development','turn','action','gain','cost','response','reaction','after','readerExpectation','next','exit','ideaNotes'])if(n[key])lines.push('**'+key.replace(/([A-Z])/g,' $1')+':** '+n[key]);if(n.beats?.length)lines.push('**Internal beats:**',...n.beats.map(b=>'- '+b));for(const [key,value] of Object.entries(n.refinement||{}))if(value)lines.push('**'+key.replace(/([A-Z])/g,' $1')+':** '+value);}
    lines.push('','## World rules and priorities',p.storyWorld.setting||'',p.storyWorld.reality||'',(p.storyWorld.tones||[]).join(', '),p.storyWorld.priorities||'',p.storyWorld.notes||'','## Author knowledge and reader disclosure','These notes may include secrets the reader or cast does not yet know.');
    for(const e of allWorld(p)){lines.push('','### '+e.name,e.notes);if(e.knownBy?.length)lines.push('Known by: '+e.knownBy.map(id=>label(id)+' (from '+when(e.knownFrom?.[id])+')').join('; '));for(const a of e.readerAppearances||[])lines.push('- Reader '+a.kind+' in '+(allNodes(p).find(n=>n.sceneId===a.sceneId||n.writingId===a.sceneId)?.title||a.sceneId)+(a.note?': '+a.note:''));if(e.stateLabel)lines.push(e.stateLabel+': '+e.stateValue);for(const x of e.stateChanges||[])lines.push('- '+when(x.momentId)+': '+x.value+(x.targetId?' · '+label(x.targetId):'')+(x.reason?' — '+x.reason:''));for(const b of e.faction?.blocks||[])lines.push('- '+(b.title||b.kind)+': '+b.text);for(const x of e.faction?.changes||[])lines.push('- '+when(x.momentId)+': '+x.operation+' '+(x.block?.text||x.blockId)+(x.reason?' — '+x.reason:''));}
    lines.push('','## Character life and saved selves');for(const c of allCharacters(p)){lines.push('','### '+c.name,'Opening: '+c.lifeStatus);for(const x of c.lifeChanges)lines.push('- '+when(x.momentId||x.at)+': '+x.status+' — '+(x.reason||''));for(const x of c.stateCheckpoints)lines.push('- Saved self at '+when(x.momentId||x.at)+': '+x.blocks.map(b=>b.text).join('; '));for(const b of c.blocks)if(b.knownBy?.length)lines.push('- '+(b.label||b.kind)+': known by '+b.knownBy.map(id=>label(id)+' (from '+when(b.knownFrom?.[id])+')').join('; '));}
    lines.push('','## Connections and membership');for(const r of allConnections(p)){lines.push('','### '+label(r.a)+' ↔ '+label(r.b),r.label,'One wants: '+(r.aWant||''),'The other wants: '+(r.bWant||''),r.notes);if(r.terms)lines.push(Object.entries(r.terms).filter(([,v])=>v!==''&&v!==undefined).map(([k,v])=>k+': '+v).join(' · '));for(const x of r.changes||[])lines.push('- '+when(x.momentId)+': '+[x.bond,x.aWant,x.bWant,x.notes,x.reason].filter(Boolean).join(' · '));}
    lines.push('','## Plot roles');for(const pl of p.plots){lines.push('','### '+pl.label+' · '+pl.title,pl.notes);for(const tr of pl.cast||[]){lines.push('- '+label(tr.characterId)+': '+(tr.opening.roles||[]).join(', ')+' · '+tr.opening.note);for(const x of tr.changes||[])lines.push('  - '+when(x.momentId)+': '+(x.roles||[]).join(', ')+' · '+(x.note||''));}}
    lines.push('','## Unfinished drafts');for(const d of p.drafts)lines.push('','### '+(d.title||d.draft?.title||'Unfinished draft'),d.draft?.notes||d.draft?.text||'An unfinished form is retained in the JSON backup.');return lines.join('\n');
  }
  Object.assign(W,{normalize,validate,legacy:migrate,migrate,allNodes,allCharacters,allWorld,allConnections,reading,readingMoments,reorder,removeFrame,duplicateCharacter,worldState,connectionState,knownAt,readerAt,fold,momentId,continuity,acceptContinuity,consequences,usedHere,search,sharedStakes,taggedOutline,parseOutline,structureIssues,continueScene,addEarlierSelf,transitionFaction,purgeArchive,rekeyEntity,duplicateNode,markdown,
    factionAt:(p,e,key)=>L.CounterplotEnsemble.factionAt(timelineProject(p),e,momentId(p,key)),
    roleAt:(p,track,key)=>L.CounterplotEnsemble.roleAt(timelineProject(p),track,momentId(p,key)),
    prominenceAt:(p,c,key)=>L.CounterplotEnsemble.prominenceAt(timelineProject(p),c,momentId(p,key))});
  if(typeof module!=='undefined')module.exports=W;
})();
