// Generated from the shared Workshop model. Run npm run build:workshop.
/* Counterplot Workshop. Pure story operations; no network or DOM dependencies. */
const Workshop = (() => {
  const copy = value => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
  const uid = () => 'w' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : Date.now().toString(36) + Math.random().toString(36).slice(2));
  const TYPES = {
    M: { name: 'Milieu', hint: 'Entering and leaving a place or situation.', opening: 'What unfamiliar world do they enter?', closing: 'How do they leave, or find a place in it?', color: 'green' },
    I: { name: 'Inquiry', hint: 'A question the story will answer.', opening: 'What question pulls us forward?', closing: 'What answer do they find?', color: 'blue' },
    C: { name: 'Character', hint: 'How a character changes over the story.', opening: 'What can no longer stay the same?', closing: 'Who do they become?', color: 'orange' },
    E: { name: 'Event', hint: 'A disruption and how it is resolved.', opening: 'What knocks the world off balance?', closing: 'What settles into place?', color: 'purple' },
    B: { name: 'Beat', hint: 'A small development within a thread.', opening: 'What small development happens here?', closing: '', color: 'neutral' }
  };
  const PALETTE = [
    {id:'orange',name:'Terracotta',hex:'#b25c30'}, {id:'green',name:'Forest',hex:'#2e5748'},
    {id:'blue',name:'Slate blue',hex:'#51778c'}, {id:'purple',name:'Heather',hex:'#80698e'},
    {id:'rose',name:'Dusty rose',hex:'#ac657b'}, {id:'gold',name:'Old gold',hex:'#917b2f'}
  ];
  const palette = data => [...PALETTE, ...(data.swatches || [])].filter(s=>!(data.hiddenSwatches||[]).includes(s.id));
  function deleteSwatch(data,id){if(!palette(data).some(s=>s.id===id))return;data.hiddenSwatches=[...new Set([...(data.hiddenSwatches||[]),id])];}
  function safeURL(value) { try { const u = new URL(value); return ['http:','https:'].includes(u.protocol) && !u.username && !u.password ? u.href : ''; } catch { return ''; } }
  function colorTokens(hex) {
    if (!/^#[0-9a-f]{6}$/i.test(hex)) hex='#2e5748';
    const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
    const lum=c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4};
    const luminance=c=>.2126*lum(c[0])+.7152*lum(c[1])+.0722*lum(c[2]);
    const format=c=>'#'+c.map(x=>Math.round(x).toString(16).padStart(2,'0')).join('');
    const tint=rgb.map(c=>c*.10+255*.90);let ink=[...rgb];
    while((luminance(tint)+.05)/(luminance(ink)+.05)<4.5) ink=ink.map(c=>c*.9);
    return {swatch:hex,ink:format(ink),tint:format(tint)};
  }
  function walkStyleObjects(pr, visit) {
    const seen=new Set();
    const collections=new Set(['nodes','characters','world','connections','archive','item','blocks','changes','change','block','stateCheckpoints','checkpoints','faction','plots','references']);
    function walk(x) { if(!x||typeof x!=='object'||seen.has(x))return;seen.add(x);if(!Array.isArray(x))visit(x);for(const [k,v] of Object.entries(x))if(Array.isArray(x)||collections.has(k))walk(v); }
    walk(pr);
  }
  function mergeSwatches(target,incoming) {
    target.swatches ||= []; const existing=[...PALETTE,...target.swatches], remap=new Map();
    for(const s of incoming.swatches||[]) {
      const same=existing.find(x=>x.id===s.id);
      if(same&&same.hex.toLowerCase()===s.hex.toLowerCase())continue;
      const next={...s,id:same?uid():s.id};target.swatches.push(next);existing.push(next);if(same)remap.set(s.id,next.id);
    }
    for(const pr of [...incoming.projects,...(incoming.trash||[]).map(x=>x.project)])walkStyleObjects(pr,x=>{if(remap.has(x.color))x.color=remap.get(x.color)});
  }
  function purgeArchive(p, ids) {
    const chosen=new Set(ids), chars=new Set(), worlds=new Set(), blocks=new Map(), priorArchive=p.archive.slice();
    for(const a of p.archive.filter(a=>chosen.has(a.id))) {
      if(a.kind==='character')chars.add(a.item.id);
      if(a.kind==='world')worlds.add(a.item.id);
      if(a.kind==='block'){if(!blocks.has(a.characterId))blocks.set(a.characterId,new Set());blocks.get(a.characterId).add(a.item.id);}
    }
    p.archive=p.archive.filter(a=>!chosen.has(a.id)&&!(a.kind==='block'&&chars.has(a.characterId))&&!(a.kind==='connection'&&(chars.has(a.item.a)||chars.has(a.item.b))));
    // Tutorial assemblies must respect a learner’s deliberate permanent removals too.
    if(p.tutorialId){
      const removed=new Set(Array.isArray(p.tutorialRemoved)?p.tutorialRemoved:[]);
      for(const a of priorArchive.filter(a=>!p.archive.includes(a))){
        for(const n of a.nodes||[])removed.add(n.id);
        if(a.item?.id)removed.add(a.item.id);
        for(const b of a.item?.blocks||[])removed.add(b.id);
        for(const x of a.changes||a.item?.changes||[])removed.add((x.change||x).id);
      }
      p.tutorialRemoved=[...removed].filter(id=>typeof id==='string');
    }
    p.connections=p.connections.filter(r=>!chars.has(r.a)&&!chars.has(r.b));
    const nodes=[...p.nodes,...p.archive.filter(a=>a.kind==='branch').flatMap(a=>a.nodes)];
    for(const n of nodes){n.cast=n.cast.filter(id=>!chars.has(id));n.worldIds=n.worldIds.filter(id=>!worlds.has(id));}
    for(const a of p.archive.filter(a=>a.kind==='branch'))a.changes=a.changes.filter(x=>!chars.has(x.characterId)&&!blocks.get(x.characterId)?.has(x.change.blockId));
    for(const {characterId,owner} of changeOwners(p))owner.changes=(owner.changes||[]).filter(x=>!blocks.get(characterId)?.has(x.blockId));
  }
  function duplicateNode(p,id) {
    const ids=descendants(p,id);ids.add(id);const list=ordered(p).map(x=>x.node).filter(n=>ids.has(n.id));if(!list.length)throw Error('Choose a piece to duplicate.');
    const mapping=new Map(list.map(n=>[n.id,uid()])), clones=list.map(n=>{const c=copy(n);c.id=mapping.get(n.id);c.parentId=mapping.get(n.parentId)||n.parentId;return c});
    clones[0].title=(clones[0].title||TYPES[clones[0].type].name)+' · variation';p.nodes.push(...clones);move(p,clones[0].id,id,'after');
    // Changes are deliberately independent: each variation can cause its own changes.
    return clones[0];
  }
  function project(title = 'Untitled story') { return { id: uid(), title, subtitle: '', nodes: [], characters: [], world: [], connections: [], archive: [], source: null }; }
  function node(type, parentId = '') { if (!Object.hasOwn(TYPES,type)) throw Error('Choose a MICE thread or a scene.'); return { id: uid(), type, parentId, title: '', opening: '', closing: '', notes: '', prose: '', status: 'open', cast: [], worldIds: [] }; }
  function character(name = 'New character') { return { id: uid(), name, identity: '', color: 'orange', notes: '', blocks: [], changes: [] }; }
  function block(kind, text = '') { return { id: uid(), kind, label: '', text, detail: '', pinned: false }; }
  function children(p, parentId = '') { return p.nodes.filter(n => n.parentId === parentId); }
  function ordered(p) {
    const by = new Map(); for (const n of p.nodes) { if (!by.has(n.parentId)) by.set(n.parentId, []); by.get(n.parentId).push(n); }
    const out = [], seen = new Set(), stack = (by.get('') || []).slice().reverse().map(n => ({ node: n, depth: 0 }));
    while (stack.length) { const x = stack.pop(); if (seen.has(x.node.id)) throw Error('An outline piece appears twice.'); seen.add(x.node.id); out.push(x); for (const n of (by.get(x.node.id) || []).slice().reverse()) stack.push({ node: n, depth: x.depth + 1 }); }
    return out;
  }
  function descendants(p, id) { const result = new Set(), todo = [id]; for (let i = 0; i < todo.length; i++) for (const n of children(p, todo[i])) if (!result.has(n.id) && n.id !== id) { result.add(n.id); todo.push(n.id); } return result; }
  function outlineEvents(p) {
    const by = new Map(); for (const n of p.nodes) { if (!by.has(n.parentId)) by.set(n.parentId, []); by.get(n.parentId).push(n); }
    const out = [], stack = (by.get('') || []).slice().reverse().map(n => ({ node: n, edge: 'open' }));
    while (stack.length) { const x = stack.pop(); out.push({ ...x, key: x.node.id + ':' + x.edge }); if (x.edge === 'open' && x.node.type !== 'B') { stack.push({ node: x.node, edge: 'close' }); for (const n of (by.get(x.node.id) || []).slice().reverse()) stack.push({ node: n, edge: 'open' }); } }
    return out;
  }
  function events(p) {
    const outline = outlineEvents(p);
    if (!Array.isArray(p.timeline)) return outline;
    const nodes = [...p.nodes, ...p.archive.filter(a=>a.kind==='branch').flatMap(a=>a.nodes)];
    const byId = new Map(nodes.map(n=>[n.id,n])), active = new Set(p.nodes.map(n=>n.id));
    const known = new Set(p.timeline.map(e=>e.key));
    const covered = new Set(p.timeline.map(e=>e.nodeId+':'+e.edge));
    return [...p.timeline.map(e=>({...e,node:byId.get(e.nodeId)||{id:e.nodeId||e.id,type:'B',title:e.title||'Story moment'},archived:!active.has(e.nodeId)})),
      ...outline.filter(e=>!known.has(e.key)&&!covered.has(e.key))];
  }
  function characterState(p,c,key='',before=false) {
    const result=copy(c), ev=events(p), stop=ev.findIndex(e=>e.key===key);
    result.lifeStatus=c.lifeStatus==='dead'?'dead':'alive';
    if(stop<0)return result;
    const order=new Map(ev.flatMap((e,i)=>[[e.key,i],[e.id||e.key,i]]));
    const archived=p.archive.filter(a=>a.kind==='branch').flatMap(a=>a.changes.filter(x=>x.characterId===c.id).map(x=>x.change));
    const changes=[...(c.stateCheckpoints||[]).map((x,i)=>({x,i,rank:0})),
      ...[...c.changes,...archived.filter(x=>!c.changes.some(y=>y.id===x.id))].map((x,i)=>({x,i,rank:1})),
      ...(c.lifeChanges||[]).map((x,i)=>({x,i,rank:2}))]
      .filter(({x})=>order.has(x.at||x.momentId)&&order.get(x.at||x.momentId)<=stop&&!(before&&order.get(x.at||x.momentId)===stop))
      .sort((a,b)=>order.get(a.x.at||a.x.momentId)-order.get(b.x.at||b.x.momentId)||a.rank-b.rank||a.i-b.i);
    for(const {x,rank} of changes){
      if(rank===0){result.blocks=copy(x.blocks);result.lifeStatus=x.lifeStatus||result.lifeStatus;continue;}
      if(rank===2){result.lifeStatus=x.status;continue;}
      const i=result.blocks.findIndex(b=>b.id===x.blockId);
      if(x.op==='retire'){if(i>=0)result.blocks.splice(i,1);}
      else if(x.op==='add'){if(i<0)result.blocks.push(copy(x.block));}
      else if(i>=0)result.blocks[i]=copy(x.block);
    }
    return result;
  }
  function stateAt(p,c,key='',before=false){return characterState(p,c,key,before).blocks;}
  function move(p, id, anchorId = '', where = 'inside') {
    const moving = p.nodes.find(n => n.id === id), anchor = p.nodes.find(n => n.id === anchorId);
    if (!moving) throw Error('That piece is no longer in the outline.');
    if (!['inside', 'before', 'after'].includes(where)) throw Error('Choose where to put this piece.');
    const branch = descendants(p, id); branch.add(id);
    if (branch.has(anchorId)) throw Error('A piece cannot go inside itself or its own contents.');
    if (anchorId && !anchor) throw Error('That destination is no longer in the outline.');
    if (!anchor && where !== 'inside') throw Error('Choose a destination piece.');
    if (where === 'inside' && anchor?.type === 'B') throw Error('Scenes go inside threads; scenes cannot hold other pieces.');
    const seq = ordered(p).map(x => x.node), group = seq.filter(n => branch.has(n.id)), rest = seq.filter(n => !branch.has(n.id));
    let at = rest.length;
    if (anchor) { at = rest.indexOf(anchor); if (where !== 'before') { const family = descendants(p, anchor.id); family.add(anchor.id); at = rest.reduce((last, n, i) => family.has(n.id) ? i + 1 : last, at + 1); } }
    moving.parentId = where === 'inside' ? anchorId : anchor.parentId;
    rest.splice(at, 0, ...group); p.nodes = rest;
  }
  function changeOwners(p) {
    return [...p.characters.map(c => ({ characterId: c.id, owner: c })), ...p.archive.filter(a => a.kind === 'character').map(a => ({ characterId: a.item.id, owner: a.item })), ...p.archive.filter(a => a.kind === 'block').map(a => ({ characterId: a.characterId, archiveBlockId: a.id, owner: a }))];
  }
  function review(p, c) {
    const ids = new Set(c.blocks.map(b => b.id)), order = new Map(events(p).map((e,i) => [e.key,i])), issues = [];
    for (const x of [...c.changes].sort((a,b) => order.get(a.at)-order.get(b.at))) {
      if (x.op === 'add') { if (ids.has(x.blockId)) issues.push({id:x.id,message:'This piece already exists at this point. Review its timing.'}); else ids.add(x.blockId); }
      else if (!ids.has(x.blockId)) issues.push({id:x.id,message:'This piece is absent at this point. Move the change after the piece is gained, or restore its starting block.'});
      else if (x.op === 'retire') ids.delete(x.blockId);
    }
    return issues;
  }
  function archiveNode(p, id) {
    const root = p.nodes.find(n => n.id === id); if (!root) return;
    const ids = descendants(p, id); ids.add(id); const seq = ordered(p).map(x => x.node), index = seq.indexOf(root), previous = seq.slice(0, index).reverse().find(n => n.parentId === root.parentId);
    const owners = changeOwners(p);
    const keys = new Set(events(p).filter(e=>ids.has(e.nodeId||e.node.id)).flatMap(e=>[e.key,e.id]));
    const belongs = x => keys.has(x.at||x.momentId) || ids.has((x.at||'').split(':')[0]);
    const changes = owners.flatMap(({owner,...who}) => (owner.changes||[]).filter(belongs).map(x => ({ ...who, change: copy(x) })));
    const entry = { id: uid(), kind: 'branch', title: root.title || TYPES[root.type].name, created: new Date().toISOString(), parentId: root.parentId, previousId: previous?.id || '', nodes: copy(seq.filter(n => ids.has(n.id))), changes };
    p.archive.unshift(entry); p.nodes = p.nodes.filter(n => !ids.has(n.id)); for (const {owner} of owners) owner.changes = (owner.changes||[]).filter(x => !belongs(x)); return entry;
  }
  function restore(p, id) {
    const a = p.archive.find(x => x.id === id); if (!a) return;
    if (a.kind === 'branch') {
      const list = copy(a.nodes), root = list[0], parent = p.nodes.find(n => n.id === a.parentId && n.type !== 'B'); root.parentId = parent?.id || '';
      const ids = new Set(p.nodes.map(n => n.id)); if (list.some(n => ids.has(n.id))) throw Error('This branch already exists.');
      p.nodes.push(...list);
      const previous = p.nodes.find(n => n.id === a.previousId && n.parentId === root.parentId);
      if (previous) move(p, root.id, previous.id, 'after'); else if (children(p, root.parentId).find(n => n.id !== root.id)) move(p, root.id, children(p, root.parentId).find(n => n.id !== root.id).id, 'before');
      for (const { characterId, archiveBlockId, change } of a.changes) { const c = (archiveBlockId && p.archive.find(x => x.id === archiveBlockId)) || p.characters.find(c => c.id === characterId) || p.archive.find(x => x.kind === 'character' && x.item.id === characterId)?.item; if (c) { c.changes ||= []; if (!c.changes.some(x => x.id === change.id)) c.changes.push(copy(change)); } }
    } else if (a.kind === 'character') { p.characters.push(copy(a.item)); }
    else if (a.kind === 'world') { p.world.push(copy(a.item)); }
    else if (a.kind === 'connection') { p.connections.push(copy(a.item)); }
    else if (a.kind === 'block') { const c = p.characters.find(c => c.id === a.characterId); if (!c) throw Error('Restore this character first.'); c.blocks.push(copy(a.item)); c.changes.push(...copy(a.changes || [])); }
    p.archive = p.archive.filter(x => x.id !== id);
  }
  // Rekey a story entity without changing its content or disconnecting its history.
  // Tutorial replacement cards use this to keep archived attempts independently restorable.
  function rekeyEntity(p, entity, from, to, cid = '') {
    if (from === to) return false;
    if (!/^[a-zA-Z0-9_-]{1,120}$/.test(to)) throw Error('Invalid replacement identifier.');
    const branches = p.archive.filter(a => a.kind === 'branch');
    const nodes = [...p.nodes, ...branches.flatMap(a => a.nodes)];
    const characters = [...p.characters, ...p.archive.filter(a => a.kind === 'character').map(a => a.item)];
    const connections = [...p.connections, ...p.archive.filter(a => a.kind === 'connection').map(a => a.item)];
    const list = entity === 'node' ? nodes : entity === 'character' ? characters :
      entity === 'world' ? [...p.world, ...p.archive.filter(a => a.kind === 'world').map(a => a.item)] :
      entity === 'connection' ? connections : entity === 'block' ? [
        ...characters.filter(c => c.id === cid).flatMap(c => c.blocks),
        ...p.archive.filter(a => a.kind === 'block' && a.characterId === cid).map(a => a.item)
      ] : null;
    if (!list) throw Error('Unknown entity collection.');
    if (!list.some(x => x.id === from)) return false;
    if (list.some(x => x.id === to)) throw Error('The replacement identifier is already in use.');
    for (const item of list) if (item.id === from) item.id = to;
    const changes = [
      ...changeOwners(p).flatMap(({characterId, owner}) => (owner.changes || []).map(change => ({characterId, change}))),
      ...branches.flatMap(a => a.changes)
    ];
    if (entity === 'node') {
      for (const n of nodes) if (n.parentId === from) n.parentId = to;
      for (const a of branches) {
        if (a.parentId === from) a.parentId = to;
        if (a.previousId === from) a.previousId = to;
      }
      for (const {change} of changes) if (change.at.startsWith(from + ':')) change.at = to + change.at.slice(from.length);
    } else if (entity === 'character') {
      for (const n of nodes) n.cast = n.cast.map(id => id === from ? to : id);
      for (const r of connections) { if (r.a === from) r.a = to; if (r.b === from) r.b = to; }
      for (const a of p.archive) if (a.kind === 'block' && a.characterId === from) a.characterId = to;
      for (const a of branches) for (const x of a.changes) if (x.characterId === from) x.characterId = to;
    } else if (entity === 'world') {
      for (const n of nodes) n.worldIds = n.worldIds.map(id => id === from ? to : id);
    } else if (entity === 'block') {
      for (const {characterId, change} of changes) if (characterId === cid && change.blockId === from) {
        change.blockId = to; if (change.block) change.block.id = to;
      }
    }
    return true;
  }
  function plotView(p,id='') {
    if(!id)return p.nodes;
    const included=new Set(p.nodes.filter(n=>(n.plotIds||[]).includes(id)).map(n=>n.id));
    for(const n of p.nodes.filter(n=>included.has(n.id))){let parent=n.parentId;while(parent){included.add(parent);parent=p.nodes.find(x=>x.id===parent)?.parentId||'';}}
    return p.nodes.filter(n=>included.has(n.id));
  }
  function assignPlot(p,nodeId,plotIds,branch=false){
    const allowed=new Set((p.plots||[]).map(x=>x.id));if(plotIds.some(id=>!allowed.has(id)))throw Error('Choose an existing plot.');
    const ids=branch?descendants(p,nodeId):new Set();ids.add(nodeId);
    for(const n of p.nodes)if(ids.has(n.id))n.plotIds=[...new Set(plotIds)];
  }
  function removePlot(p,id){p.plots=(p.plots||[]).filter(x=>x.id!==id);for(const n of [...p.nodes,...p.archive.flatMap(a=>a.nodes||[])])n.plotIds=(n.plotIds||[]).filter(x=>x!==id);}

  function shelfEmpty(p){return !!p.shelfPlaceholder&&p.title==='Untitled story'&&!p.subtitle&&!p.notes&&!p.nodes.length&&!p.characters.length&&!p.world.length&&!p.connections.length&&!p.archive.length&&!(p.references||[]).length&&!(p.plots||[]).length;}
  function shelfProjects(data){return data.projects.filter(p=>!shelfEmpty(p));}
  function trashProject(data,id){
    const pr=data.projects.find(p=>p.id===id);if(!pr||shelfEmpty(pr))throw Error('That story is no longer on the shelf.');
    if((data.trash||[]).length>=200)throw Error('Deleted stories is full. Export a backup and permanently delete a story there before deleting another.');
    (data.trash||=[]).unshift({project:copy(pr),deletedAt:new Date().toISOString()});
    data.projects=data.projects.filter(p=>p.id!==id);
    if(!data.projects.length){const blank=project();blank.shelfPlaceholder=true;data.projects.push(blank);}
    if(!data.projects.some(p=>p.id===data.active))data.active=data.projects[0].id;
    return pr.title;
  }
  function restoreProject(data,id){
    const entry=(data.trash||[]).find(x=>x.project.id===id);if(!entry)throw Error('That deleted story is no longer available.');
    if(data.projects.some(p=>p.id===id))throw Error('A story with that identity already exists.');
    const real=shelfProjects(data);if(real.length>=1000)throw Error('The shelf is full. Export a backup and delete a story before restoring this one.');
    const wasEmpty=!real.length,pr=copy(entry.project);data.projects=real;data.projects.push(pr);data.trash=data.trash.filter(x=>x!==entry);
    if(wasEmpty||!data.projects.some(p=>p.id===data.active))data.active=pr.id;return pr;
  }
  function purgeProject(data,id){
    const i=(data.trash||[]).findIndex(x=>x.project.id===id);if(i<0)throw Error('That deleted story is no longer available.');
    return data.trash.splice(i,1)[0].project;
  }
  function validate(data) {
    const fail = message => { throw Error(message); };
    const arr = (v, label, max = 20000) => { if (!Array.isArray(v) || v.length > max) fail(label + ' must be a supported list.'); return v; };
    const txt = (v, label, max = 2000000) => { if (typeof v !== 'string' || v.length > max) fail(label + ' must be text.'); };
    const ident = v => { if (typeof v !== 'string' || !/^[a-zA-Z0-9_-]{1,120}$/.test(v)) fail('Invalid identifier.'); };
    const unique = list => { const set = new Set(); for (const x of list) { ident(x.id); if (set.has(x.id)) fail('Duplicate identifier.'); set.add(x.id); } return set; };
    if (data?.format !== 'counterplot-workshop' || ![1,2].includes(data.schema)) fail('This is not a supported Workshop backup.');
    arr(data.hiddenSwatches||[], 'Removed swatches', 126).forEach(ident);
    const colors=new Set(PALETTE.map(x=>x.id)); unique(arr(data.swatches||[], 'Color swatches', 120)); for(const s of data.swatches||[]){ if(colors.has(s.id))fail('A swatch identifier is already used.'); colors.add(s.id);txt(s.name,'Swatch name',80);if(!/^#[0-9a-f]{6}$/i.test(s.hex))fail('Use a six-digit hex color.'); }
    const checkExtra=x=>{if(x.color && !colors.has(x.color))fail('Unknown color swatch.');if(x.portrait)checkImage(x.portrait);if(x.references!==undefined){unique(arr(x.references,'References',100));for(const r of x.references){txt(r.title,'Reference title',1000);txt(r.note,'Reference note',50000);txt(r.url,'Reference link',4000);if(r.url&&!safeURL(r.url))fail('Reference links must use https or http.');if(r.image)checkImage(r.image);}}};
    const checkImage=v=>{if(typeof v!=='string'||v.length>650000||!/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(v))fail('Choose a supported image smaller than 650 KB.');};
    const ps = arr(data.projects, 'Projects', 1000); if (!ps.length) fail('Keep at least one story.'); const projectIds = unique(ps); if (!projectIds.has(data.active)) fail('Active story is missing.');
    const trash=arr(data.trash||[], 'Deleted stories', 200);
    for(const item of trash)if(!item||typeof item!=='object'||!item.project||typeof item.deletedAt!=='string'||!Number.isFinite(Date.parse(item.deletedAt)))fail('Invalid deleted story.');
    const all=[...ps,...trash.map(x=>x.project)];unique(all);
    for (const p of all) {
      if(p.plots===undefined&&Array.isArray(p.source?.plotlines)){p.plots=p.source.plotlines.map(pl=>({id:pl.id,label:pl.label||'',title:pl.title||'',notes:pl.notes||''}));for(const n of p.nodes||[]){const original=(p.source.structure||[]).find(x=>x.id===n.id);if(original)n.plotIds=[...new Set([original.plotlineId,...(original.plotlineIds||[])].filter(id=>p.plots.some(x=>x.id===id)))];}}
      walkStyleObjects(p,checkExtra); txt(p.title, 'Story title'); txt(p.subtitle, 'Story description'); const ns = arr(p.nodes, 'Outline'), ids = unique(ns); const cs = arr(p.characters, 'Characters', 20000); unique(cs); unique(arr(p.world, 'World')); unique(arr(p.connections, 'Connections')); arr(p.archive, 'Archive');
      for (const n of ns) { if (!Object.hasOwn(TYPES,n.type)) fail('Unknown outline piece.'); if (n.parentId && (!ids.has(n.parentId) || ns.find(x => x.id === n.parentId).type === 'B')) fail('Invalid containing thread.'); ['title', 'opening', 'closing', 'notes', 'prose', 'status'].forEach(k => txt(n[k], k)); arr(n.cast, 'Cast').forEach(ident); arr(n.worldIds, 'World links').forEach(ident); }
      const plotIds=unique(arr(p.plots||[], 'Plots',100));for(const plot of p.plots||[]){txt(plot.label,'Plot label',80);txt(plot.title,'Plot title',1000);txt(plot.notes,'Plot notes',50000);}for(const n of ns)for(const id of arr(n.plotIds||[],'Plot memberships',100))if(!plotIds.has(id))fail('A piece references a missing plot.');
      const structureOrder=ordered(p); if (structureOrder.length !== ns.length) fail('The outline has circular or disconnected nesting.'); if (structureOrder.some(x=>x.depth>80)) fail('This outline is more than 80 levels deep. Flatten a few nested threads before importing.');
      const ev = new Set(events(p).map(e => e.key));
      const checkBlock = b => { ident(b.id); txt(b.kind, 'Block type', 100); ['text', 'detail', 'label'].forEach(k => txt(b[k], 'Block ' + k)); };
      for (const c of cs) { txt(c.name, 'Character name'); txt(c.identity, 'Identity'); txt(c.notes, 'Character notes'); if (!colors.has(c.color)) fail('Unknown character color.'); unique(arr(c.blocks, 'Blocks')); c.blocks.forEach(checkBlock); unique(arr(c.changes, 'Changes')); for (const x of c.changes) { if (!ev.has(x.at)) fail('A character change points to a missing story moment.'); if (!['add', 'develop', 'retire'].includes(x.op)) fail('Invalid change operation.'); ident(x.blockId); txt(x.reason, 'Reason'); if (x.op !== 'retire') { checkBlock(x.block); if (x.block.id !== x.blockId) fail('The change and block identifiers differ.'); } } }
      for (const w of p.world) { txt(w.name, 'World name'); txt(w.type, 'World type'); txt(w.notes, 'World notes'); }
      for (const r of p.connections) { txt(r.a, 'First character'); txt(r.b, 'Second character'); txt(r.label, 'Connection'); txt(r.notes, 'Connection notes'); }
      unique(p.archive);
      const archivedCharacters=p.archive.filter(a=>a.kind==='character').map(a=>a.item);
      unique([...cs,...archivedCharacters]);
      const archiveEvents=new Set([...ev,...p.archive.filter(a=>a.kind==='branch').flatMap(a=>(a.nodes||[]).flatMap(n=>[n.id+':open',n.id+':close']))]);
      const checkChange=x=>{ident(x.id);ident(x.blockId);if(!archiveEvents.has(x.at))fail('An archived change points to a missing story moment.');if(!['add','develop','retire'].includes(x.op))fail('Invalid archived change operation.');txt(x.reason,'Change reason');if(x.op!=='retire'){checkBlock(x.block);if(x.block.id!==x.blockId)fail('The change and block identifiers differ.');}};
      for (const a of p.archive) {
        ident(a.id);if (!['branch','character','world','connection','block'].includes(a.kind)) fail('Unknown archive item.');txt(a.title,'Archive title');
        if(a.kind==='branch'){
          unique(arr(a.nodes,'Archived outline'));arr(a.changes,'Archived changes');
          for(const n of a.nodes){if(!Object.hasOwn(TYPES,n.type))fail('Unknown archived outline piece.');if(n.parentId)ident(n.parentId);['title','opening','closing','notes','prose','status'].forEach(k=>txt(n[k],k));arr(n.cast,'Archived cast').forEach(ident);arr(n.worldIds,'Archived world links').forEach(ident);}
          for(const x of a.changes){ident(x.characterId);checkChange(x.change);}
        }else{
          if(!a.item||typeof a.item!=='object')fail('Archive item is missing.');ident(a.item.id);
          if(a.kind==='character'){const c=a.item;['name','identity','notes'].forEach(k=>txt(c[k],k));unique(arr(c.blocks,'Archived character blocks'));c.blocks.forEach(checkBlock);unique(arr(c.changes,'Archived character changes'));c.changes.forEach(checkChange);}
          if(a.kind==='block'){ident(a.characterId);checkBlock(a.item);arr(a.changes||[],'Archived block changes').forEach(checkChange);}
          if(a.kind==='world')['name','type','notes'].forEach(k=>txt(a.item[k],k));
          if(a.kind==='connection')['a','b','label','notes'].forEach(k=>txt(a.item[k],k));
        }
      }
    }
    return data;
  }
  function legacy(raw) {
    if (raw?.format !== 'counterplot' || ![1, 2, 3].includes(raw.schema) || !Array.isArray(raw.projects) || !raw.projects.length) throw Error('Choose a Counterplot workspace JSON backup.');
    const out = { format: 'counterplot-workshop', schema: 1, active: '', projects: [] };
    for (const old of raw.projects) {
      const p = project(String(old.title || 'Imported story')); p.source = copy(old); p.subtitle = old.world?.setting || ''; const str = v => typeof v === 'string' ? v : '';
      p.plots=(old.plotlines||[]).map(x=>({id:x.id,label:str(x.label),title:str(x.title),notes:str(x.notes)}));
      const convertBlock = b => ({ id: b.id || uid(), kind: str(b.kind) || 'custom', label: str(b.title), text: str(b.text), detail: [b.detail, b.context].filter(Boolean).join('\n'), pinned: !!b.locked });
      p.characters = (old.characters || []).filter(c => !c.archived).map(c => ({ ...character(str(c.name)), id: c.id, identity: str(c.identity), notes: str(c.notes), blocks: (c.blocks || []).map(convertBlock) }));
      const map = new Map(); for (const n of old.structure || []) { const nn = { ...node(n.type === 'beat' ? 'B' : n.type), id: n.id, parentId: n.parentId || '', title: str(n.title) || str(n.opening).slice(0, 90), opening: str(n.opening), closing: str(n.closing), notes: str(n.notes), status: n.status || 'open', cast: [...new Set([n.characterId, n.povId].filter(id => p.characters.some(c => c.id === id)))] }; nn.plotIds=[...new Set([n.plotlineId,...(n.plotlineIds||[])].filter(id=>p.plots.some(x=>x.id===id)))];p.nodes.push(nn); map.set(n.id, nn); }
      const sceneMap = new Map();
      for (const s of old.scenes || []) { if (s.archived) continue; let n = p.nodes.find(n => (old.structure || []).find(o => o.id === n.id)?.openSceneId === s.id && n.type === 'B'); if (!n) { const parent = map.get(s.miceId); n = node('B', parent && parent.type !== 'B' ? parent.id : ''); p.nodes.push(n); } n.title = str(s.title) || n.title; n.opening = [s.context, s.action || s.turn || s.development, s.after].filter(Boolean).join('\n\n') || n.opening; n.prose = str(s.notes); n.status = s.status === 'On the page' ? 'done' : 'open'; n.cast = [...new Set([...n.cast, s.focus, s.partner, ...(s.ensemble || []).map(x => x.id)].filter(id => p.characters.some(c => c.id === id)))]; sceneMap.set(s.id, n.id + ':open'); }
      const momentMap = new Map();
      for (const m of old.moments || []) { let key = sceneMap.get(m.sceneId); if (!key && map.has(m.nodeId)) key = m.nodeId + ':' + (map.get(m.nodeId).type === 'B' ? 'open' : m.edge === 'close' ? 'close' : 'open'); if (!key) { const n = node('B'); n.title = str(m.title) || 'Imported story moment'; n.opening = 'Character history from the original workspace.'; p.nodes.push(n); key = n.id + ':open'; } momentMap.set(m.id, key); }
      for (const c of p.characters) { const prev = old.characters.find(x => x.id === c.id); for (const x of prev.changes || []) { const at = momentMap.get(x.momentId); if (!at || x.pinOnly) continue; c.changes.push({ id: x.id || uid(), at, blockId: x.blockId, op: x.operation === 'retire' ? 'retire' : x.operation === 'add' ? 'add' : 'develop', block: x.block ? convertBlock(x.block) : null, reason: str(x.reason) }); } }
      p.world = (old.entities || []).map(e => ({ id: e.id, name: str(e.name), type: str(e.type), notes: str(e.notes) }));
      p.connections = (old.connections || []).map(r => ({ id: r.id || uid(), a: str(r.a), b: str(r.b), label: str(r.bond) || 'Connected', notes: [r.notes, r.aWant && 'One wants: ' + r.aWant, r.bWant && 'The other wants: ' + r.bWant].filter(Boolean).join('\n') }));
      out.projects.push(p); if (old.id === raw.active) out.active = p.id;
    }
    out.active ||= out.projects[0].id; return validate(out);
  }
  function markdown(p) {
    const refs=o=>(o.references||[]).flatMap(r=>['', '**Reference: '+r.title+'**',r.url,r.note,r.image?'Image included in HTML and JSON copies.':'']);
    const lines = ['# ' + p.title, '', p.subtitle, '', '## Outline'];
    for (const e of events(p)) { const n = e.node; if (e.edge === 'close') { lines.push('', '**Closes: ' + (n.title || TYPES[n.type].name) + '**', n.closing || '(Open ending)'); continue; } lines.push('', '### ' + (n.type === 'B' ? 'Scene' : TYPES[n.type].name) + ' · ' + (n.title || 'Untitled'), n.opening); if (n.prose) lines.push('', n.prose); if (n.notes) lines.push('', 'Notes: ' + n.notes); lines.push(...refs(n)); }
    lines.push('', '## Characters'); for (const c of p.characters) { lines.push('', '### ' + c.name, c.identity); for (const b of c.blocks) lines.push('- **' + (b.label || b.kind) + ':** ' + b.text + (b.detail ? ' — ' + b.detail : '')); for (const x of c.changes) { const ev = events(p).find(e => e.key === x.at); lines.push('- At ' + (ev?.node.title || 'a story moment') + ' (' + ev?.edge + '): ' + (x.op === 'retire' ? 'Retire ' + x.blockId : x.block.text) + (x.reason ? ' · ' + x.reason : '')); } if (c.notes) lines.push(c.notes); lines.push(...refs(c)); }
    lines.push('', '## World'); for (const w of p.world) lines.push('', '### ' + w.name + ' · ' + w.type, w.notes,...refs(w));
    lines.push('', '## Connections'); for (const r of p.connections) lines.push('', '### ' + (p.characters.find(c => c.id === r.a)?.name || 'Archived character') + ' ↔ ' + (p.characters.find(c => c.id === r.b)?.name || 'Archived character'), r.label, r.notes);
    lines.push('', '## Story references',...refs(p)); return lines.join('\n');
  }
  return { shelfEmpty, shelfProjects, trashProject, restoreProject, purgeProject, rekeyEntity, plotView, assignPlot, removePlot, copy, uid, TYPES, PALETTE, palette, deleteSwatch, safeURL, colorTokens, mergeSwatches, walkStyleObjects, purgeArchive, duplicateNode, project, node, character, block, children, ordered, descendants, outlineEvents, events, characterState, stateAt, review, move, archiveNode, restore, validate, legacy, markdown };
})();


/* Original schema reader; no scene generator or original UI. */
const CounterplotLegacy = (() => {
// Generated by scripts/generate-runtime.mjs. Edit the browser source, then regenerate.
const KINDS = {
    want: { label: 'Want', plural: 'Wants', prefix: 'Wants', symbol: '→', question: 'What do they want?', hint: 'A direction, not a whole biography.', description: 'Something they seek, keep, change, or escape.', detail: 'What would getting it look like?', options: [
            ['protect', 'Protect', 'Keep someone or something safe.'], ['escape', 'Escape', 'Get free of a situation or obligation.'], ['find', 'Find', 'Locate something missing or unknown.'], ['win', 'Win', 'Gain a position, contest, or opportunity.'], ['belong', 'Belong', 'Be accepted without pretending.'], ['understand', 'Understand', 'Make sense of something unresolved.'], ['repair', 'Repair', 'Put right something damaged.'], ['create', 'Create', 'Bring something into the world.'], ['keep', 'Keep', 'Hold on to what is already theirs.'], ['change', 'Change', 'Make a situation different.'], ['reveal', 'Reveal', 'Bring something hidden into the open.'], ['hide', 'Conceal', 'Keep something from being discovered.'], ['destroy', 'Destroy', 'End something they cannot tolerate.'], ['return', 'Return', 'Get back to a person, place, or former life.'], ['connect', 'Get closer', 'Make a real connection.'], ['release', 'Let go', 'Stop carrying what no longer serves them.'], ['experience', 'Experience', 'Feel, witness, or try something for itself.'], ['choose', 'Choose freely', 'Recover the right to decide.']
        ] },
    method: { label: 'Method', plural: 'Methods', prefix: 'Usually tries to', symbol: '↗', question: 'How do they go after it?', hint: 'The move they tend to make first.', description: 'A repeatable strategy, useful somewhere and costly elsewhere.', detail: 'When does this work or fail?', options: [
            ['trade', 'Trade favors', 'Turn usefulness into an exchange.'], ['control', 'Control information', 'Decide who learns what, and when.'], ['trust', 'Earn trust', 'Become someone others will rely on.'], ['charm', 'Use charm', 'Make people want to say yes.'], ['force', 'Apply pressure', 'Make refusal difficult or costly.'], ['rules', 'Follow the rules', 'Seek legitimacy and an established route.'], ['defy', 'Break the rules', 'Act outside a system that blocks them.'], ['care', 'Care for someone', 'Meet a real need before asking for anything.'], ['observe', 'Observe and wait', 'Notice what impatient people miss.'], ['cooperate', 'Cooperate', 'Make a plan people can pursue together.'], ['withdraw', 'Keep their distance', 'Protect room to think or avoid exposure.'], ['truth', 'Tell the truth', 'Give others the information to decide.'], ['conceal', 'Hide vulnerability', 'Keep weakness out of the transaction.'], ['humor', 'Use humor', 'Change the emotional terms of an encounter.'], ['experiment', 'Try an experiment', 'Test a small, reversible version first.'], ['endure', 'Outlast the pressure', 'Keep going when others would stop.'], ['ask', 'Ask for help', 'Accept dependence instead of disguising it.'], ['perform', 'Prove their worth', 'Let skill or accomplishment make the case.']
        ] },
    value: { label: 'Value', plural: 'Values', prefix: 'Values', symbol: '◇', question: 'What matters to them?', hint: 'Add more than one. Let them disagree.', description: 'A real commitment, not a virtue score.', detail: 'Who or what makes this personal?', options: [
            ['loyalty', 'Loyalty', 'Stand by a person or commitment.'], ['freedom', 'Freedom', 'Keep the ability to choose.'], ['care', 'Compassion', 'Take another person’s needs seriously.'], ['justice', 'Justice', 'Insist that wrongs and power be answered.'], ['dignity', 'Dignity', 'Refuse to treat people as disposable.'], ['security', 'Security', 'Build a life that is not always at risk.'], ['belonging', 'Belonging', 'Have somewhere to be fully known.'], ['curiosity', 'Curiosity', 'Pursue what is not yet understood.'], ['recognition', 'Recognition', 'Have their contribution seen.'], ['pleasure', 'Pleasure', 'Make room for delight and enjoyment.'], ['order', 'Order', 'Make the world predictable enough to trust.'], ['faith', 'Faith', 'Stay committed beyond what can be proved.'], ['mastery', 'Mastery', 'Do something exceptionally well.'], ['honesty', 'Honesty', 'Keep language and intention aligned.'], ['beauty', 'Beauty', 'Care about how life feels and looks.'], ['solidarity', 'Solidarity', 'Tie their well-being to other people’s.'], ['peace', 'Peace', 'Make space without domination or constant struggle.'], ['independence', 'Independence', 'Avoid having their choices owned by others.']
        ] },
    boundary: { label: 'Boundary', plural: 'Boundaries', prefix: 'Will not', symbol: '⊣', question: 'Where is their line?', hint: 'A refusal can protect them—or trap them.', description: 'What they refuse to do, even when refusal costs them.', detail: 'What might make holding this line costly?', options: [
            ['betray', 'Betray someone who trusts them', 'A relationship puts a limit on ambition.'], ['beg', 'Ask for what should be freely given', 'Pride or dignity closes an easy route.'], ['harm', 'Hurt someone uninvolved', 'Success cannot be paid for by a bystander.'], ['lie', 'Lie to someone they love', 'An intimate relationship needs honesty.'], ['abandon', 'Leave someone behind', 'They will not be the only one to escape.'], ['obey', 'Obey an order they believe is wrong', 'Authority cannot settle the question.'], ['depend', 'Become dependent on someone', 'Even offered help has a price.'], ['sell', 'Sell out their work', 'A standard they will not exchange for success.'], ['forgive', 'Pretend the harm never happened', 'Reconciliation cannot erase accountability.'], ['control', 'Take away another person’s choice', 'Care is not ownership.'], ['admit', 'Admit they were wrong', 'A limit that may be part of the problem.'], ['surrender', 'Give up without trying', 'Persistence protects hope, but may prolong damage.']
        ] },
    belief: { label: 'Belief', plural: 'Beliefs', prefix: 'Believes', symbol: '“', description: 'An operating rule. It may be true, false, partial, or useful.', detail: 'What experience makes this credible to them?', options: [
            ['needed', 'Being needed keeps me safe', 'Usefulness feels like protection.'], ['control', 'Someone must stay in control', 'Uncertainty feels irresponsible.'], ['truth', 'Truth gives people a choice', 'Information is a form of agency.'], ['mercy', 'Mercy leaves room for change', 'A person is not only their worst act.'], ['earned', 'Care has to be earned', 'Affection seems conditional.'], ['alone', 'Depending on people gives them power', 'Self-reliance feels safer.'], ['rules', 'The rules protect people like us', 'Legitimacy has real value to them.'], ['break', 'Some rules exist to keep us small', 'Disobedience can be self-respect.'], ['together', 'We survive by taking care of each other', 'Reciprocity makes risk bearable.'], ['cost', 'Every victory asks someone to pay', 'They look for the hidden payer.'], ['ordinary', 'An ordinary life is worth defending', 'Not everything must become an achievement.'], ['uncertain', 'I can act without being certain', 'Doubt need not mean paralysis.']
        ] },
    contradiction: { label: 'Competing selves', plural: 'Competing selves', prefix: 'Can be', symbol: '↔', description: 'Two real ways of being, brought out by different situations.', detail: 'What brings out each side?', options: [
            ['bold', 'Bold with strangers; careful with loved ones', 'Intimacy changes the stakes.'], ['gentle', 'Gentle in private; severe in public', 'Audience changes their behavior.'], ['generous', 'Generous with money; guarded with time', 'Giving does not mean the same thing everywhere.'], ['principled', 'Principled in theory; pragmatic for family', 'Commitments do not weigh equally.'], ['social', 'Socially effortless; privately lonely', 'Performance is not connection.'], ['fearless', 'Calm in danger; afraid of being known', 'Physical and emotional risk diverge.'], ['skeptical', 'Skeptical of authority; hungry for approval', 'They want something they distrust.'], ['patient', 'Patient with others; brutal with themself', 'Compassion has an exception.']
        ] },
    joy: { label: 'Ordinary life', plural: 'Ordinary life', prefix: 'Finds life in', symbol: '✳', description: 'Pleasure, play, habits, taste, and a life outside the plot.', detail: 'A concrete detail that makes it theirs', options: [
            ['make', 'Making things nobody asked for', 'Pleasure without a task or audience.'], ['food', 'Sharing a familiar meal', 'A small ritual of belonging.'], ['music', 'Playing with rhythm and sound', 'They notice a world others pass over.'], ['repair', 'Repairing small, broken things', 'Attention with a tangible result.'], ['walk', 'Walking without a destination', 'A way to be present rather than useful.'], ['tease', 'Affectionate teasing', 'A private language with someone else.'], ['collect', 'Collecting objects with no obvious value', 'Meaning need not be practical.'], ['routine', 'A carefully kept daily ritual', 'A modest pocket of continuity.'], ['animals', 'Being around animals', 'A relationship outside performance.'], ['games', 'Taking an unimportant game seriously', 'Competition without enormous stakes.'], ['garden', 'Tending something that grows', 'Care measured over time.'], ['story', 'Telling a story better each time', 'Memory as a shared pleasure.']
        ] },
    capability: { label: 'Ability & limit', plural: 'Abilities & limits', prefix: 'Can', symbol: '∴', description: 'A skill, advantage, or extraordinary power with an actual boundary.', detail: 'Hard limit, condition, or cost', options: [
            ['social', 'Read a room', 'Notice alliances, omissions, and discomfort.'], ['physical', 'Move where others cannot', 'An unusual physical route or aptitude.'], ['technical', 'Make a system do something unexpected', 'Knowledge creates access.'], ['memory', 'Remember what others overlook', 'Attention or memory becomes useful.'], ['status', 'Get through a closed door', 'Status or credentials confer access.'], ['language', 'Move between languages and worlds', 'Translation includes social context.'], ['care', 'Make people feel understood', 'Listening can change an encounter.'], ['improvise', 'Build something from what is at hand', 'Constraints become material.'], ['uncanny', 'Perceive something ordinarily hidden', 'An extraordinary ability; define its limits.'], ['endurance', 'Keep going past an ordinary limit', 'Specify what makes recovery necessary.']
        ] },
    obligation: { label: 'Obligation', plural: 'Obligations', prefix: 'Owes', symbol: '↩', description: 'A promise, debt, role, or duty that competes with a want.', detail: 'What comes due, and when?', options: [
            ['promise', 'A promise that has become costly', 'The old commitment still makes a claim.'], ['debt', 'A favor they have not repaid', 'Someone may now ask for it back.'], ['care', 'Care to someone who depends on them', 'A legitimate need outside their ambition.'], ['role', 'The duties of a role they accepted', 'An identity comes with work.'], ['repair', 'Repair for harm they caused', 'Responsibility is not just a feeling.'], ['inherit', 'A duty inherited from someone else', 'They did not choose the original agreement.'], ['deadline', 'A result by a particular time', 'Delay changes the available choices.'], ['silence', 'Keeping someone else’s confidence', 'Information cannot be spent freely.']
        ] },
    allegiance: { label: 'Allegiance', plural: 'Allegiances', prefix: 'Tied to', symbol: '⚑', description: 'An institution, community, cause, or chosen family.', detail: 'What do they give, and what do they receive?', options: [
            ['institution', 'An institution that gave them a place', 'Security and status can create loyalty.'], ['community', 'A community that needs them', 'Belonging is also responsibility.'], ['cause', 'A cause larger than their own comfort', 'A chosen commitment with consequences.'], ['family', 'A family with competing expectations', 'Love and obligation can disagree.'], ['profession', 'The standards of their work', 'Craft can demand refusal.'], ['patron', 'A patron whose help was not free', 'Gratitude and dependence overlap.'], ['outsiders', 'People the system leaves outside', 'Solidarity may cost access.'], ['self', 'No group they trust completely', 'Independence can be a position, not an absence.']
        ] },
    secret: { label: 'Private knowledge', plural: 'Private knowledge', prefix: 'Keeps private', symbol: '◒', description: 'Something hidden. A summary, not automatic viewpoint knowledge.', detail: 'Author-only truth or supporting detail', options: [
            ['identity', 'A concealed identity', 'Their public role omits something important.'], ['loyalty', 'An undisclosed allegiance', 'Someone has an incomplete picture of their loyalties.'], ['harm', 'Their part in an earlier harm', 'Responsibility has not been recognized.'], ['need', 'A need they cannot admit', 'They conceal something they want from others.'], ['evidence', 'Evidence someone else wants', 'Information has not yet been shared.'], ['love', 'A feeling they have not expressed', 'Silence is not the absence of attachment.'], ['doubt', 'Doubt beneath public certainty', 'Their performed position is not the whole truth.'], ['gift', 'An ability they keep hidden', 'Knowledge of the ability would change its value.']
        ] },
    experience: { label: 'Formative experience', plural: 'Formative experiences', prefix: 'Carries', symbol: '⌁', description: 'Something that shaped them. Not a compulsory wound or explanation.', detail: 'What did they take from it—and what else could it mean?', options: [
            ['victory', 'A victory won the wrong way', 'Success and discomfort share a memory.'], ['care', 'Care received when it was not earned', 'A counterexample to conditional affection.'], ['loss', 'A loss nobody could prevent', 'Not every harm has a villain.'], ['betrayal', 'Trust that was used against them', 'A strategy may have once been protective.'], ['recognition', 'Being seen at the right moment', 'Approval changed what seemed possible.'], ['failure', 'A public failure they survived', 'Shame and resilience may coexist.'], ['escape', 'Leaving a world they still miss', 'Freedom does not erase attachment.'], ['discovery', 'Discovering they were wrong', 'An unsettling experience of learning.']
        ] },
    custom: { label: 'Your own block', plural: 'Your own blocks', prefix: 'Also', symbol: '+', description: 'Anything this vocabulary misses. Define it on your terms.', detail: 'Context or detail', options: [] }
};
const PRESSURES = [
    { id: 'access', label: 'The way in is closed', family: 'ACCESS', text: 'A needed person, place, or opportunity is no longer available on the old terms.', tags: ['adventure', 'political'], setup: 'The usual route to the goal is unavailable.', question: 'Who controls the route, and what do they genuinely need?' },
    { id: 'exchange', label: 'A favor comes due', family: 'OBLIGATION', text: 'Someone asks for a return on help that was not as unconditional as it seemed.', tags: ['political', 'intimate'], setup: 'A prior favor now carries a request that competes with the goal.', question: 'Why is this request reasonable from the other person’s side?' },
    { id: 'values', label: 'Two good things collide', family: 'COMMITMENT', text: 'Protecting one genuine commitment makes another harder to keep.', tags: ['intimate', 'political'], setup: 'Two genuine commitments cannot both continue on their current terms.', question: 'What prevents an easy way of keeping both?' },
    { id: 'evidence', label: 'The evidence disagrees', family: 'DISCOVERY', text: 'An observable fact resists the explanation someone has been relying on.', tags: ['uncanny', 'political'], setup: 'Something observable challenges the working explanation.', question: 'What did they actually observe, before interpreting it?' },
    { id: 'shortcut', label: 'The easy route has a price', family: 'TEMPTATION', text: 'A credible shortcut would work, but touches a boundary or competing value.', tags: ['adventure', 'political'], setup: 'A useful shortcut is offered at a price that is not merely money.', question: 'Why is the shortcut genuinely attractive?' },
    { id: 'care', label: 'Someone needs care', family: 'ORDINARY LIFE', text: 'A legitimate need interrupts a plan. It is not a trick or a hostage situation.', tags: ['intimate'], setup: 'Someone’s real need for care interrupts the current pursuit.', question: 'What does care require here, rather than what would look noble?' },
    { id: 'invitation', label: 'A door opens between people', family: 'CONNECTION', text: 'Someone offers closeness, trust, or shared pleasure. Accepting it means something.', tags: ['intimate', 'comic'], setup: 'An invitation makes a closer relationship possible.', question: 'What small action would make accepting the invitation real?' },
    { id: 'misread', label: 'The same moment, misread', family: 'INTERPRETATION', text: 'Two people give a reasonable but different meaning to the same action.', tags: ['comic', 'intimate'], setup: 'The same gesture has been understood in two different ways.', question: 'What made each interpretation reasonable?' },
    { id: 'limit', label: 'Their advantage meets a limit', family: 'CAPABILITY', text: 'An established condition makes an ability insufficient by itself.', tags: ['uncanny', 'adventure'], setup: 'A previously useful advantage is insufficient under the present conditions.', question: 'Which already-established limit is doing the work?' },
    { id: 'offer', label: 'Success changes the deal', family: 'AFTERMATH', text: 'Getting something they wanted creates a new role, expectation, or responsibility.', tags: ['political', 'intimate'], setup: 'A gain changes what other people now expect from them.', question: 'What new responsibility follows specifically from this gain?' },
    { id: 'time', label: 'Waiting changes the options', family: 'TIME', text: 'Delay is not neutral. Something closes, matures, or becomes harder to ignore.', tags: ['adventure'], setup: 'Waiting will change which options are available.', question: 'What changes with time, and who knows it?' },
    { id: 'routine', label: 'An ordinary moment shifts', family: 'QUIET', text: 'A shared task or ritual feels different, revealing a changed relationship or perception.', tags: ['intimate'], setup: 'An ordinary shared moment no longer means quite what it used to.', question: 'What is different in their attention, not necessarily in the event?' },
    { id: 'resist', label: 'The other person says no', family: 'AGENCY', text: 'Another person refuses for a reason of their own, not to delay the plot.', tags: ['political', 'intimate'], setup: 'The person whose cooperation is needed has a credible reason to refuse.', question: 'What are they trying to protect by saying no?' },
    { id: 'wonder', label: 'Something changes their attention', family: 'WONDER', text: 'An encounter invites curiosity, delight, uncertainty, or a different way of seeing.', tags: ['uncanny', 'intimate'], setup: 'An unexpected encounter changes what seems worth noticing.', question: 'What can they observe without explaining it away?' },
    { id: 'relief', label: 'There is finally room to breathe', family: 'RELEASE', text: 'Immediate pressure recedes. People must decide what to do with the space.', tags: ['intimate', 'comic'], setup: 'An immediate demand has lifted, leaving an unclaimed interval.', question: 'What becomes visible when nobody has to perform urgency?' },
    { id: 'public', label: 'A private choice has an audience', family: 'EXPOSURE', text: 'Someone must act where a community, institution, or loved one can see.', tags: ['political', 'comic'], setup: 'A choice that could once remain private now has witnesses.', question: 'What can this audience actually observe, rather than know?' },
    { id: 'opposition', label: 'One thing, incompatible plans', family: 'SHARED TARGET', text: 'Two people have explicitly incompatible plans for the same thing.', tags: ['political', 'adventure'], setup: 'Two people’s plans for the same shared target cannot both succeed unchanged.', question: 'Which action makes the two plans incompatible?' }
];
const TONES = [['intimate', 'Intimate'], ['adventure', 'Adventurous'], ['political', 'Political'], ['uncanny', 'Uncanny'], ['comic', 'Comic']];
const ENTITY_TYPES = { object: 'Object / resource', place: 'Place', group: 'Group / institution', idea: 'Idea / commitment', fact: 'Fact / secret', rule: 'World rule' };
const ARC_EFFECTS = ['Not yet interpreted', 'Holds a conviction', 'Revises a conviction', 'Changes behavior', 'Doubles down', 'Reveals a hidden side', 'Remains ambiguous'];
const STORY_RANGE = {
  audience: [['open','Open / not decided'],['children','Children'],['teen','Teen'],['adult','Adult']],
  mood: [['open','Let the scene decide'],['warm','Warm'],['playful','Playful'],['tense','Tense'],['bleak','Bleak'],['uncanny','Uncanny']],
  violence: [['open','Not specified'],['none','No violence'],['offpage','Off-page'],['shown','On-page, non-graphic'],['graphic','Graphic aftermath']]
};
const SCENE_KINDS = [
        ['open', 'Let the scene decide'], ['attempt', 'An attempt'], ['discovery', 'A discovery'],
        ['relationship', 'A relationship moment'], ['aftermath', 'An aftermath']
    ];
const SCENE_FIELDS = ['goal','stakes','tension','development','turn','reaction','purpose','readerExpectation','entry','exit','ideaNotes'];
const OUTCOMES = [['varied','Different possibilities'],['gain','Make progress'],['price','Succeed at a price'],['setback','Meet a setback'],['reversal','Reverse the situation'],['connection','Change a relationship'],['open','Leave it open']];
const SCENE_ROLES = [['assist','Helps the pursuit'],['oppose','Works against it'],['complicate','Changes the terms'],['witness','Witnesses the choice']];
const CONTEXTS = [['any','Any situation'],['public','In public'],['private','In private'],['danger','Under threat'],['ease','At ease']];
const CounterplotStory = (() => {
  const copy = v => JSON.parse(JSON.stringify(v));
  const types = {
    C: {name:'Character', short:'A person changes', open:'Who are they at the opening?', close:'Who have they become?', hint:'A shift in identity, priorities, or self-understanding. Growth, loss, refusal, and uncertainty all belong.'},
    M: {name:'Milieu', short:'Enter → leave', open:'What place or situation do they enter?', close:'How do they leave—or find a way to belong?', hint:'A journey into a place or unfamiliar environment, and the passage out. Small places can sit inside larger ones.'},
    I: {name:'Inquiry', short:'Question → answer', open:'What question is opened?', close:'What answer is found—or deliberately withheld?', hint:'The question carries the thread. Clues and answers are author plans, not knowledge automatically granted to the cast.'},
    E: {name:'Event', short:'Disruption → new normal', open:'What breaks the existing situation?', close:'What settles, restores, or replaces it?', hint:'A disruption and its resolution—not simply anything that happens. A party going wrong counts as readily as an attack.'},
    beat: {name:'Story beat', short:'A moment inside a thread', open:'What happens?', close:'', hint:'An action, discovery, conversation, or pause. It does not need its own MICE promise.'}
  };
  const roles = [['target','Also wants'],['for','For / on behalf of'],['from','From'],['at','At / in'],['with','With'],['against','Against']];
  const relations = b => [...(b?.targetId ? [{targetId:b.targetId,role:'target'}] : []), ...(b?.links || [])];
  const nodes = p => p.structure || [];
  const node = (p,id) => nodes(p).find(n=>n.id===id);
  const title = n => n ? n.title || n.opening || types[n.type]?.name || 'Untitled thread' : 'Whole story';
  function descendants(p,id) {
    const byParent=new Map();for(const n of nodes(p)){if(!byParent.has(n.parentId))byParent.set(n.parentId,[]);byParent.get(n.parentId).push(n.id);}
    const found=new Set(), todo=[id]; for(let at=0;at<todo.length;at++)for(const child of byParent.get(todo[at])||[])if(!found.has(child)){found.add(child);todo.push(child);}
    found.delete(id);return found;
  }
  function ancestors(p,id) {const result=[],seen=new Set();let n=node(p,id);while(n?.parentId&&!seen.has(n.parentId)){seen.add(n.parentId);n=node(p,n.parentId);if(n)result.unshift(n);}return result;}
  function ordered(p,root='') {
    const byParent=new Map();for(const n of nodes(p)){if(!byParent.has(n.parentId))byParent.set(n.parentId,[]);byParent.get(n.parentId).push(n);}
    const out=[], stack=(root?[node(p,root)].filter(Boolean):byParent.get('')||[]).slice().reverse().map(n=>({node:n,depth:0}));
    while(stack.length){const item=stack.pop();out.push(item);const children=byParent.get(item.node.id)||[];for(let i=children.length-1;i>=0;i--)stack.push({node:children[i],depth:item.depth+1});}
    return out;
  }
  function events(p,root='') {
    const children=new Map();nodes(p).forEach(n=>{if(!children.has(n.parentId))children.set(n.parentId,[]);children.get(n.parentId).push(n);});
    const out=[],stack=(root?[node(p,root)].filter(Boolean):children.get('')||[]).slice().reverse().map(n=>({node:n,edge:'open',depth:0}));
    while(stack.length){const x=stack.pop();out.push(x);if(x.edge==='open'&&x.node.type!=='beat'){stack.push({...x,edge:'close'});for(const n of (children.get(x.node.id)||[]).slice().reverse())stack.push({node:n,edge:'open',depth:x.depth+1});}}
    return out;
  }
  // Saved openings are full states, not a guessed series of inverse edits.
  // They run before ordinary changes at the same story moment.
  function characterEvents(p,c,momentId='') {
    const order=new Map((p.moments||[]).map((m,i)=>[m.id,i]));
    const stop=order.get(momentId)??-1;
    return [
      ...(c.stateCheckpoints||[]).map((x,i)=>({x,i,type:'checkpoint',rank:0})),
      ...(c.changes||[]).map((x,i)=>({x,i,type:'block',rank:1})),
      ...(c.lifeChanges||[]).map((x,i)=>({x,i,type:'life',rank:2}))
    ].filter(({x})=>order.has(x.momentId)&&order.get(x.momentId)<=stop)
      .sort((a,b)=>order.get(a.x.momentId)-order.get(b.x.momentId)||a.rank-b.rank||a.i-b.i);
  }
  function state(p,c,momentId='') {
    if(!c)return null;
    const result=copy(c);
    for(const key of ['changes','lifeChanges','stateCheckpoints','openingLabel'])delete result[key];
    result.lifeStatus=c.lifeStatus==='dead'?'dead':'alive';
    for(const {x,type} of characterEvents(p,c,momentId)){
      if(type==='checkpoint'){result.blocks=copy(x.blocks);result.lifeStatus=x.lifeStatus;continue;}
      if(type==='life'){result.lifeStatus=x.status;continue;}
      const i=result.blocks.findIndex(b=>b.id===x.blockId);
      if(x.operation==='retire'){if(i>=0)result.blocks.splice(i,1);}
      else if(x.operation==='add'){if(i<0)result.blocks.push(copy(x.block));}
      else if(i>=0)result.blocks[i]=copy(x.block);
    }
    return result;
  }
  function changesThrough(p,c,momentId='') {const order=new Map((p.moments||[]).map((m,i)=>[m.id,i]));const stop=order.get(momentId)??-1;return(c?.changes||[]).filter(x=>order.has(x.momentId)&&order.get(x.momentId)<=stop);}
  function lifeChangesThrough(p,c,momentId='') {const order=new Map((p.moments||[]).map((m,i)=>[m.id,i]));const stop=order.get(momentId)??-1;return(c?.lifeChanges||[]).filter(x=>order.has(x.momentId)&&order.get(x.momentId)<=stop);}
  function beforeChange(p,c,change) {const pr=copy(p),target=pr.characters.find(x=>x.id===c.id);const idx=(target.changes||[]).findIndex(x=>x.id===change.id);target.changes=target.changes.filter((x,i)=>x.id!==change.id&&(x.momentId!==change.momentId||i<(idx<0?target.changes.length:idx)));return state(pr,target,change.momentId);}
  function beforeLifeChange(p,c,change) {const pr=copy(p),target=pr.characters.find(x=>x.id===c.id);target.lifeChanges=(target.lifeChanges||[]).filter(x=>x.id!==change.id);return state(pr,target,change.momentId);}
  function move(p,id,parentId,direction=0) {
    const n=node(p,id);if(!n)throw Error('That thread no longer exists.');if(parentId===id||descendants(p,id).has(parentId))throw Error('A thread cannot sit inside itself.');
    if(parentId&&(!node(p,parentId)||node(p,parentId).type==='beat'))throw Error('Choose a MICE thread as the container.');
    if(n.parentId!==parentId){n.parentId=parentId;return;}
    const siblings=nodes(p).filter(x=>x.parentId===parentId),at=siblings.indexOf(n),other=siblings[at+direction];if(!other)return;
    const a=p.structure.indexOf(n),b=p.structure.indexOf(other);p.structure[a]=other;p.structure[b]=n;
  }
  // Position a complete branch relative to a visible anchor. Reading order,
  // moment order, identities and scene references deliberately remain untouched.
  function place(p,id,anchorId='',where='inside') {
    const moving=node(p,id);if(!moving)throw Error('That thread no longer exists.');
    if(!['before','after','inside','start','end'].includes(where))throw Error('Choose a valid drop position.');
    const branchIds=descendants(p,id);branchIds.add(id);
    const anchor=anchorId?node(p,anchorId):null;
    if(anchorId&&!anchor)throw Error('That destination no longer exists.');
    if(branchIds.has(anchorId))throw Error('A thread cannot move into itself or its own contents.');
    if(['before','after'].includes(where)&&!anchor)throw Error('Choose a thread to move beside.');
    if(['inside','start','end'].includes(where)&&anchor?.type==='beat')throw Error('A beat cannot hold other pieces. Choose a thread.');
    const parentId=['before','after'].includes(where)?anchor.parentId:anchorId;
    const original=p.structure,originalShape=JSON.stringify(ordered(p).map(x=>[x.node.id,x.node.parentId]));
    const sequence=ordered(p).map(x=>x.node),branch=sequence.filter(n=>branchIds.has(n.id)),rest=sequence.filter(n=>!branchIds.has(n.id));
    let at=0;
    if(where==='before')at=rest.findIndex(n=>n.id===anchorId);
    else if(where==='after'){const family=descendants(p,anchorId);family.add(anchorId);at=rest.reduce((last,n,i)=>family.has(n.id)?i+1:last,0);}
    else if(!anchorId)at=where==='start'?0:rest.length;
    else if(where==='start')at=rest.findIndex(n=>n.id===anchorId)+1;
    else {const family=descendants(p,anchorId);family.add(anchorId);at=rest.reduce((last,n,i)=>family.has(n.id)?i+1:last,0);}
    moving.parentId=parentId||'';
    rest.splice(at,0,...branch);p.structure=rest;
    if(originalShape===JSON.stringify(ordered(p).map(x=>[x.node.id,x.node.parentId])))p.structure=original;
    return moving;
  }
  function removeFrame(p,id) {
    const n=node(p,id);if(!n)return;
    // Rebuild depth-first ordering so promoted children occupy the removed frame's slot.
    const sequence=ordered(p).map(x=>x.node);for(const x of sequence)if(x.parentId===id)x.parentId=n.parentId;
    p.structure=sequence.filter(x=>x.id!==id);
    for(const m of p.moments||[])if(m.nodeId===id){m.nodeId='';m.edge='';}
    for(const s of [...p.scenes,...(p.lab?.suggestions||[])]){if(s.miceId===id){s.miceId='';s.miceRole='advance';}s.miceLinks=(s.miceLinks||[]).filter(x=>x.miceId!==id);if(s.sources?.miceId===id)s.sources.miceId='';if(s.sources?.miceIds)s.sources.miceIds=s.sources.miceIds.filter(x=>x!==id);}
    if(p.lab.miceId===id)p.lab.miceId='';p.lab.miceLinks=(p.lab.miceLinks||[]).filter(x=>x.miceId!==id);
  }
  function parse(text,idFactory) {
    const result=[],stack=[];let count=0;
    for(const [index,line] of String(text).split(/\r?\n/).entries()){
      const s=line.trim();if(!s)continue;const match=s.match(/^<(\/)?([CMIE])>\s*(.*)$/i);
      if(!match){if(/^<\/?[A-Za-z][^>]*>/.test(s))throw Error('Line '+(index+1)+': use C, M, I, or E markers; ordinary prose needs no marker.');result.push({id:idFactory(),type:'beat',parentId:stack.at(-1)?.id||'',title:'',opening:s,closing:'',status:'open',characterId:'',targetId:'',openSceneId:'',closeSceneId:'',notes:'',plotlineId:'',plotlineIds:[],povId:'',storyDate:'',storyEndDate:''});continue;}
      const closing=!!match[1],type=match[2].toUpperCase(),words=match[3];
      if(closing){const current=stack.at(-1);if(!current||current.type!==type)throw Error('Line '+(index+1)+': close '+(current?current.type:'an opened thread')+' before closing '+type+'.');current.closing=words;current.status=words?'planned':'open';stack.pop();}
      else {if(++count>5000)throw Error('Import at most 5,000 threads at a time.');const n={id:idFactory(),type,parentId:stack.at(-1)?.id||'',title:'',opening:words,closing:'',status:'open',characterId:'',targetId:'',openSceneId:'',closeSceneId:'',notes:'',plotlineId:'',plotlineIds:[],povId:'',storyDate:'',storyEndDate:''};result.push(n);stack.push(n);}
    }
    if(!result.length)throw Error('Paste at least one thread or beat.');
    return {nodes:result,unclosed:stack.map(n=>n.id)};
  }
  function issues(p) {
    const out=[],ns=nodes(p),map=new Map(ns.map(n=>[n.id,n])),order=new Map(p.scenes.map((s,i)=>[s.id,i]));
    for(const n of ns){if(n.type==='beat')continue;
      if(n.status==='resolved'&&!n.closing.trim())out.push({id:n.id,text:'Marked resolved, but no closing is recorded.'});
      if(['planned','resolved'].includes(n.status)&&ns.some(x=>x.parentId===n.id&&x.type!=='beat'&&x.status==='open'))out.push({id:n.id,text:'This frame has an ending, but a thread inside it has no ending yet.'});
      if(n.openSceneId&&n.closeSceneId&&order.get(n.openSceneId)>order.get(n.closeSceneId))out.push({id:n.id,text:'The closing appears before the opening in reading order. Check whether this is deliberate.'});
      const parent=map.get(n.parentId);if(parent){if(parent.openSceneId&&n.openSceneId&&order.get(n.openSceneId)<order.get(parent.openSceneId))out.push({id:n.id,text:'Opens before its containing thread in reading order.'});if(parent.closeSceneId&&n.closeSceneId&&order.get(n.closeSceneId)>order.get(parent.closeSceneId))out.push({id:n.id,text:'Closes after its containing thread. Nest differently or keep this as a deliberate overlap.'});}
      if([n.openSceneId,n.closeSceneId].some(id=>id&&p.scenes.find(s=>s.id===id)?.archived))out.push({id:n.id,text:'An opening or closing is linked to an archived scene.'});
    }
    // Sibling spans that cross are advisory; nested outlines are not a ban on interwoven novels.
    const spans=ns.filter(n=>n.type!=='beat'&&n.openSceneId&&n.closeSceneId);for(let i=0;i<spans.length;i++)for(let j=i+1;j<spans.length;j++){const a=spans[i],b=spans[j];if(a.parentId!==b.parentId)continue;const as=order.get(a.openSceneId),ae=order.get(a.closeSceneId),bs=order.get(b.openSceneId),be=order.get(b.closeSceneId);if((as<bs&&bs<ae&&ae<be)||(bs<as&&as<be&&be<ae))out.push({id:b.id,text:'This thread crosses a sibling in reading order. Keep the overlap deliberately, or revise the scene links.'});}
    return out;
  }
  function validDate(value){
    if(value==='')return true;
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
    const [year,month,day]=value.split('-').map(Number);
    if(year<1||month<1||month>12||day<1)return false;
    const days=[31,(year%4===0&&(year%100!==0||year%400===0))?29:28,31,30,31,30,31,31,30,31,30,31];
    return day<=days[month-1];
  }
  function validate(p,validKinds) {
    const fail=s=>{throw Error('Story structure: '+s);};
    const arr=(x,label,max=20000)=>{if(!Array.isArray(x)||x.length>max)fail(label+' must be a supported list.');return x;};
    const str=(x,label,max=30000)=>{if(typeof x!=='string'||x.length>max)fail(label+' must be text.');};
    const ident=(x,label,optional=false)=>{if(optional&&x==='')return;if(typeof x!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(x))fail(label+' has an invalid ID.');};
    const unique=(xs,label)=>{const seen=new Set();for(const x of xs){if(!x||typeof x!=='object')fail(label+' needs an object.');ident(x.id,label);if(seen.has(x.id))fail(label+' has duplicate IDs.');seen.add(x.id);}return seen;};
    const chars=new Set(p.characters.map(c=>c.id)),scenes=new Set(p.scenes.map(s=>s.id)),plotIds=new Set((p.plotlines||[]).map(x=>x.id)),targets=new Set([...chars,...p.entities.map(e=>e.id)]);
    const ref=(id,set,label)=>{ident(id,label,true);if(id&&!set.has(id))fail(label+' no longer exists.');};
    const date=(value,label)=>{if(!validDate(value))fail(label+' must be a real calendar date (YYYY-MM-DD), or blank.');};
    function links(b){if(b.links!==undefined){const seen=new Set();for(const l of arr(b.links,'attached links',200)){if(!l||!roles.some(r=>r[0]===l.role))fail('unknown attachment role.');ref(l.targetId,targets,'attachment');if(!l.targetId)fail('an attachment needs a target.');const key=l.role+'|'+l.targetId;if(seen.has(key))fail('duplicate attachment.');seen.add(key);}}}
    const ns=arr(p.structure||[],'threads',5000),nodeIds=unique(ns,'thread');const map=new Map(ns.map(n=>[n.id,n]));
    for(const n of ns){
      if(n.archived!==undefined&&typeof n.archived!=='boolean')fail('thread archive state must be true or false.');
      if(n.parentId&&!!map.get(n.parentId)?.archived!==!!n.archived)fail('a branch must share its archive state.');
      if(!Object.hasOwn(types,n.type))fail('unknown thread type.');for(const k of ['title','opening','closing','notes'])str(n[k],k,k==='notes'?100000:30000);if(!['open','planned','resolved','open-ended'].includes(n.status))fail('unknown resolution status.');ref(n.parentId,nodeIds,'parent thread');if(n.parentId&&map.get(n.parentId).type==='beat')fail('a beat cannot contain a thread.');
      if(n.plotlineId===undefined)n.plotlineId='';if(n.plotlineIds===undefined)n.plotlineIds=n.plotlineId?[n.plotlineId]:[];if(n.povId===undefined)n.povId='';if(n.storyDate===undefined)n.storyDate='';if(n.storyEndDate===undefined)n.storyEndDate='';
      ref(n.plotlineId,plotIds,'thread primary plot');const memberships=new Set();for(const pid of arr(n.plotlineIds,'thread plot memberships',100)){ref(pid,plotIds,'thread plot membership');if(memberships.has(pid))fail('thread has a duplicate plot membership.');memberships.add(pid);}if(n.plotlineId&&!memberships.has(n.plotlineId))n.plotlineIds.unshift(n.plotlineId);if(!n.plotlineId&&n.plotlineIds.length)n.plotlineId=n.plotlineIds[0];
      ref(n.povId,chars,'thread POV');date(n.storyDate,'thread story date');date(n.storyEndDate,'thread story end date');if(n.storyDate&&n.storyEndDate&&n.storyEndDate<n.storyDate)fail('thread story end date cannot be before its start date.');ref(n.characterId,chars,'thread character');ref(n.targetId,targets,'thread target');ref(n.openSceneId,scenes,'opening scene');ref(n.closeSceneId,scenes,'closing scene');
    }
    // Linear parent walk with completed paths: rejects cycles, supports deep trees without recursion.
    const done=new Set();for(const n of ns){const path=new Set();let id=n.id;while(id&&!done.has(id)){if(path.has(id))fail('nesting contains a cycle.');path.add(id);id=map.get(id)?.parentId||'';}for(const key of path)done.add(key);}
    const moments=arr(p.moments||[],'story moments',10000),momentIds=unique(moments,'story moment');
    for(const m of moments){str(m.title,'moment title',1000);if(m.date===undefined)m.date='';if(m.endDate===undefined)m.endDate='';if(m.plotlineId===undefined)m.plotlineId='';if(m.povId===undefined)m.povId='';if(m.affectedCharacterIds===undefined)m.affectedCharacterIds=[];date(m.date,'moment date');date(m.endDate,'moment end date');if(m.date&&m.endDate&&m.endDate<m.date)fail('moment end date cannot be before its start date.');ref(m.plotlineId,plotIds,'moment plotline');ref(m.povId,chars,'moment POV');const affected=new Set();for(const id of arr(m.affectedCharacterIds,'moment affected characters',1000)){ref(id,chars,'affected character');if(affected.has(id))fail('moment has a duplicate affected character.');affected.add(id);}ref(m.sceneId,scenes,'moment scene');ref(m.nodeId,nodeIds,'moment thread');if(!['','open','close'].includes(m.edge))fail('unknown moment edge.');if(!m.nodeId&&m.edge)fail('a thread edge needs a thread.');if(m.nodeId&&map.get(m.nodeId).type==='beat'&&m.edge==='close')fail('a beat has no closing edge.');}
    const blockOwners=new Map();for(const c of p.characters)for(const b of c.blocks){blockOwners.set(b.id,c.id);links(b);}
    const changeIds=new Set();
    for(const c of p.characters){const changes=arr(c.changes||[],'character changes',20000);unique(changes,'character change');for(const x of changes){if(changeIds.has(x.id))fail('change IDs must be unique across the cast.');changeIds.add(x.id);ref(x.momentId,momentIds,'change moment');if(!x.momentId)fail('a change needs a story moment.');ident(x.blockId,'changed block');if(!['add','replace','retire'].includes(x.operation))fail('unknown change operation.');str(x.reason,'reason');str(x.direction,'direction',200);if(x.operation!=='retire'){const b=x.block;if(!b||b.id!==x.blockId||!Object.hasOwn(validKinds,b.kind))fail('invalid changed block.');for(const k of ['key','text','title','context','detail'])str(b[k],k,k==='detail'?100000:30000);if(typeof b.locked!=='boolean')fail('block pin must be boolean.');if(b.when!==undefined&&!['any','public','private','danger','ease'].includes(b.when))fail('unknown block circumstance.');ref(b.targetId,targets,'changed block target');arr(b.knownBy,'changed knowledge').forEach(id=>ref(id,chars,'knower'));links(b);}
      if(x.operation==='add'){if(blockOwners.has(x.blockId))fail('a new block reuses an existing ID.');blockOwners.set(x.blockId,c.id);}}
      const checkpoints=arr(c.stateCheckpoints||[],'saved starting states',1000),checkpointMoments=new Set();
      unique(checkpoints,'saved starting state');
      if(c.openingLabel!==undefined)str(c.openingLabel,'opening state name',1000);
      for(const cp of checkpoints){
        if(changeIds.has(cp.id))fail('change IDs must be unique across the cast.');changeIds.add(cp.id);
        ref(cp.momentId,momentIds,'saved starting state moment');if(!cp.momentId)fail('a saved starting state needs a moment.');
        if(checkpointMoments.has(cp.momentId))fail('two saved starting states occupy the same moment.');checkpointMoments.add(cp.momentId);
        if(!['alive','dead'].includes(cp.lifeStatus))fail('invalid saved life status.');
        unique(arr(cp.blocks,'saved starting blocks'),'saved starting block');
        for(const b of cp.blocks){
          if(!Object.hasOwn(validKinds,b.kind))fail('invalid saved block kind.');
          for(const key of ['key','text','title','context','detail'])str(b[key],key,key==='detail'?100000:30000);
          if(typeof b.locked!=='boolean')fail('saved block pin must be boolean.');
          if(b.when!==undefined&&!['any','public','private','danger','ease'].includes(b.when))fail('unknown saved block circumstance.');
          ref(b.targetId,targets,'saved block target');arr(b.knownBy,'saved block knowledge').forEach(id=>ref(id,chars,'saved block knower'));links(b);
          if(blockOwners.has(b.id)&&blockOwners.get(b.id)!==c.id)fail('saved block belongs to another character.');
          blockOwners.set(b.id,c.id);
        }
      }
      // Check every intermediate state, including moments with a full saved opening.
      const active=new Set(c.blocks.map(b=>b.id));
      const finalMoment=moments.at(-1)?.id||'';
      for(const {x,type} of characterEvents(p,c,finalMoment)){
        if(type==='checkpoint'){active.clear();x.blocks.forEach(b=>active.add(b.id));continue;}
        if(type!=='block')continue;
        if(x.operation==='add'){if(active.has(x.blockId))fail('a new block is already active at that moment.');active.add(x.blockId);}
        else {if(!active.has(x.blockId))fail('a change edits a block that is not active at that moment. Reorder or revise the changes first.');if(x.operation==='retire')active.delete(x.blockId);}
      }
      if(c.lifeStatus!==undefined&&!['alive','dead'].includes(c.lifeStatus))fail('unknown opening life status.');
      const lifeChanges=arr(c.lifeChanges||[],'life status changes',20000);unique(lifeChanges,'life status change');const lifeMoments=new Set();
      for(const x of lifeChanges){if(changeIds.has(x.id))fail('change IDs must be unique across the cast.');changeIds.add(x.id);ref(x.momentId,momentIds,'life status moment');if(!x.momentId)fail('a life status change needs a story moment.');if(!['alive','dead'].includes(x.status))fail('unknown life status.');str(x.reason,'life status reason');if(lifeMoments.has(x.momentId))fail('a character can have only one life status change at a story moment.');lifeMoments.add(x.momentId);}
    }
    for(const s of [p.lab,...p.scenes,...(p.lab.suggestions||[])]){if(s.plotlineId!==undefined)ref(s.plotlineId,plotIds,'scene plotline');if(s.momentId!==undefined)ref(s.momentId,momentIds,'scene moment');if(s.miceId!==undefined)ref(s.miceId,nodeIds,'scene thread');if(s.miceRole!==undefined&&!['advance','open','close'].includes(s.miceRole))fail('unknown thread role.');if(s.miceLinks!==undefined){const linked=new Set([s.miceId].filter(Boolean));for(const l of arr(s.miceLinks,'additional MICE contributions',200)){if(!l||typeof l!=='object')fail('additional MICE contribution needs an object.');ref(l.miceId,nodeIds,'additional MICE thread');if(!l.miceId||linked.has(l.miceId))fail('duplicate MICE contribution.');if(!['advance','open','close'].includes(l.role))fail('unknown additional MICE role.');linked.add(l.miceId);}}if(s.sources?.timeline!==undefined&&typeof s.sources.timeline!=='boolean')fail('source timeline must be boolean.');if(s.sources?.timeline){ref(s.sources.momentId,momentIds,'source moment');if(s.sources.miceId)ref(s.sources.miceId,nodeIds,'source thread');if(s.sources.miceIds!==undefined)for(const id of arr(s.sources.miceIds,'source MICE threads',200))ref(id,nodeIds,'source MICE thread');}}
    return p;
  }
  return Object.freeze({types,roles,relations,nodes,node,title,descendants,ancestors,ordered,events,state,characterEvents,validDate,changesThrough,lifeChangesThrough,beforeChange,beforeLifeChange,move,place,removeFrame,parse,issues,validate});
})();
const CounterplotEnsemble = (() => {
  const copy = x => JSON.parse(JSON.stringify(x));
  const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
  const termsDefault = () => ({active:true,membership:'unspecified',position:'',leadership:false,visibility:'open',aTie:'',bTie:'',factId:''});
  const roleDefault = () => ({inPlot:false,roles:[],note:''});
  const order = p => new Map((p.moments||[]).map((m,i)=>[m.id,i]));
  function events(p,changes,mid){const idx=order(p),stop=idx.get(mid)??-1;return (changes||[]).map((x,i)=>({x,i})).filter(v=>idx.has(v.x.momentId)&&idx.get(v.x.momentId)<=stop).sort((a,b)=>idx.get(a.x.momentId)-idx.get(b.x.momentId)||a.i-b.i).map(v=>v.x);}
  function fold(p,opening,changes,mid,keys,checkpoints=[]){let st=copy(opening);const idx=order(p),stop=idx.get(mid)??-1;const all=[...checkpoints.map((x,i)=>({x,i,cp:true})),...(changes||[]).map((x,i)=>({x,i,cp:false}))].filter(v=>idx.has(v.x.momentId)&&idx.get(v.x.momentId)<=stop).sort((a,b)=>idx.get(a.x.momentId)-idx.get(b.x.momentId)||(a.cp?0:1)-(b.cp?0:1)||a.i-b.i);for(const {x,cp} of all){if(cp)st=copy(x.value);else for(const k of keys)if(own(x,k))st[k]=copy(x[k]);}return st;}
  function roleAt(p,track,mid=''){return track?fold(p,track.opening,track.changes,mid,['inPlot','roles','note'],track.checkpoints):roleDefault();}
  function prominenceAt(p,c,mid=''){return fold(p,{value:c?.prominence?.opening||''},c?.prominence?.changes||[],mid,['value'],c?.prominence?.checkpoints||[]).value;}
  function termsAt(p,r,mid=''){let out={...termsDefault(),...(r.terms||{})};for(const x of events(p,r.changes,mid))if(x.terms)Object.assign(out,copy(x.terms));return out;}
  function factionAt(p,e,mid=''){
    const f=e?.faction;if(!f)return [];
    let blocks=copy(f.blocks);const idx=order(p),stop=idx.get(mid)??-1;
    const all=[...(f.checkpoints||[]).map((x,i)=>({x,i,cp:true})),...f.changes.map((x,i)=>({x,i,cp:false}))].filter(v=>idx.has(v.x.momentId)&&idx.get(v.x.momentId)<=stop).sort((a,b)=>idx.get(a.x.momentId)-idx.get(b.x.momentId)||(a.cp?0:1)-(b.cp?0:1)||a.i-b.i);
    for(const {x,cp} of all){if(cp){blocks=copy(x.blocks);continue;}const i=blocks.findIndex(b=>b.id===x.blockId);if(x.operation==='retire'){if(i>=0)blocks.splice(i,1);}else if(x.operation==='add'){if(i<0)blocks.push(copy(x.block));}else if(i>=0)blocks[i]=copy(x.block);}
    return blocks;
  }
  function factionBefore(p,e,x){const cp=copy(e),i=cp.faction.changes.findIndex(y=>y.id===x.id);cp.faction.changes=cp.faction.changes.filter((y,j)=>y.id!==x.id&&(y.momentId!==x.momentId||j<i));return factionAt(p,cp,x.momentId);}
  function plotIdsFor(p,s){const ids=[s.plotlineId];for(const id of [s.miceId,...(s.miceLinks||[]).map(l=>l.miceId)].filter(Boolean)){const n=(p.structure||[]).find(x=>x.id===id);if(n){ids.push(n.plotlineId,...(n.plotlineIds||[]));}}return [...new Set(ids.filter(Boolean))];}
  function prepare(p){
    for(const c of p.characters){if(c.prominence===undefined)c.prominence={opening:'',changes:[],checkpoints:[]};}
    if(p.castOrder===undefined)p.castOrder=p.characters.map(c=>c.id);
    // Append only newly created people. Invalid and duplicate references are not silently repaired.
    if(Array.isArray(p.castOrder))for(const c of p.characters)if(!p.castOrder.includes(c.id))p.castOrder.push(c.id);
    for(const pl of p.plotlines||[]){if(pl.cast===undefined){pl.cast=[];if(pl.protagonistId)pl.cast.push({id:'role-'+pl.id.slice(0,80),characterId:pl.protagonistId,opening:{inPlot:true,roles:['Protagonist'],note:''},changes:[],checkpoints:[]});}delete pl.protagonistId;}
    for(const e of p.entities)if(e.type==='group'&&e.faction===undefined)e.faction={blocks:[],changes:[],checkpoints:[]};
    for(const s of [...p.scenes,...(p.lab?.suggestions||[]),...(p.lab?[p.lab]:[]),...(p.structure||[])])if(s.factionIds===undefined)s.factionIds=[];
  }
  function validate(p){
    const fail=m=>{throw Error('Faction / story-role data: '+m);};
    const obj=(x,l)=>{if(!x||typeof x!=='object'||Array.isArray(x))fail(l+' must be an object.');return x;};
    const list=(x,l,max=20000)=>{if(!Array.isArray(x)||x.length>max)fail(l+' must be a supported list.');return x;};
    const str=(x,l,max=30000)=>{if(typeof x!=='string'||x.length>max)fail(l+' must be text within its limit.');};
    const bool=(x,l)=>{if(typeof x!=='boolean')fail(l+' must be true or false.');};
    const id=(x,l)=>{if(typeof x!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(x))fail(l+' has an invalid ID.');};
    const chars=new Set(p.characters.map(c=>c.id)),groups=new Set(p.entities.filter(e=>e.type==='group').map(e=>e.id)),targets=new Set([...chars,...p.entities.map(e=>e.id)]),mids=new Set((p.moments||[]).map(m=>m.id)),facts=new Set(p.entities.filter(e=>e.type==='fact').map(e=>e.id));
    const ref=(x,set,l,optional=false)=>{if(optional&&x==='')return;id(x,l);if(!set.has(x))fail(l+' points to a missing record.');};
    const seen=new Set();const unique=(xs,l)=>{for(const x of xs){obj(x,l);id(x.id,l);if(seen.has(x.id))fail('duplicate '+l+' ID.');seen.add(x.id);}};
    const keys=(x,allowed,l)=>{for(const k of Object.keys(x))if(!allowed.includes(k))fail('unknown '+l+' field '+k+'.');};
    const timing=(xs,l)=>{unique(list(xs,l),l);const at=new Set();for(const x of xs){ref(x.momentId,mids,l+' moment');if(at.has(x.momentId))fail(l+' has two changes at the same moment. Edit the existing change.');at.add(x.momentId);if(x.reason!==undefined)str(x.reason,l+' reason');}};
    const castSeen=new Set();for(const cid of list(p.castOrder,'cast order')){ref(cid,chars,'cast order');if(castSeen.has(cid))fail('duplicate cast order entry.');castSeen.add(cid);}
    function roleValue(v,partial=false){obj(v,'plot role');if(!partial||own(v,'inPlot'))bool(v.inPlot,'in plot');if(!partial||own(v,'roles')){const rs=new Set();for(const text of list(v.roles,'role labels',30)){str(text,'role label',120);if(!text.trim()||rs.has(text.toLocaleLowerCase()))fail('role labels must be nonempty and unique.');rs.add(text.toLocaleLowerCase());}}if(!partial||own(v,'note'))str(v.note,'role qualifier',3000);}
    for(const c of p.characters){const pr=obj(c.prominence,'prominence');str(pr.opening,'opening prominence',150);timing(pr.changes,'prominence change');for(const x of pr.changes){keys(x,['id','momentId','value','reason'],'prominence change');str(x.value,'prominence',150);}pr.checkpoints??=[];timing(pr.checkpoints,'prominence checkpoint');for(const x of pr.checkpoints){obj(x.value,'prominence checkpoint');str(x.value.value,'prominence',150);}}
    for(const pl of p.plotlines){const roster=list(pl.cast,'plot cast',10000);unique(roster,'plot cast track');const members=new Set();for(const tr of roster){ref(tr.characterId,chars,'plot character');if(members.has(tr.characterId))fail('a plot already has a role track for this character.');members.add(tr.characterId);roleValue(tr.opening);timing(tr.changes,'plot role change');for(const x of tr.changes){keys(x,['id','momentId','inPlot','roles','note','reason'],'role change');roleValue(x,true);if(!['inPlot','roles','note'].some(k=>own(x,k)))fail('role change is empty.');}tr.checkpoints??=[];timing(tr.checkpoints,'plot role checkpoint');for(const cp of tr.checkpoints)roleValue(cp.value);}}
    function terms(t){obj(t,'relationship terms');keys(t,Object.keys(termsDefault()),'relationship term');for(const k of ['active','leadership'])if(own(t,k))bool(t[k],k);for(const k of ['membership','position','visibility','aTie','bTie','factId'])if(own(t,k))str(t[k],k,k==='position'?1000:500);if(own(t,'membership')&&!['unspecified','member','associate','former','none'].includes(t.membership))fail('unknown membership category.');if(own(t,'visibility')&&!['open','concealed','contested'].includes(t.visibility))fail('unknown visibility.');if(t.factId)ref(t.factId,facts,'relationship fact');}
    for(const r of p.connections){if(r.terms!==undefined)terms(r.terms);for(const x of r.changes||[])if(x.terms!==undefined){terms(x.terms);if(!Object.keys(x.terms).length)fail('empty relationship term patch.');}}
    const bIds=new Map();for(const c of p.characters)for(const b of [...c.blocks,...(c.changes||[]).flatMap(x=>x.block?[x.block]:[]),...(c.stateCheckpoints||[]).flatMap(x=>x.blocks)])bIds.set(b.id,c.id);
    function block(b,e){obj(b,'faction block');id(b.id,'faction block');if(bIds.has(b.id)&&bIds.get(b.id)!==e.id)fail('a faction block reuses another owner’s ID.');bIds.set(b.id,e.id);if(!['want','method','value','boundary','capability','obligation','custom'].includes(b.kind))fail('unsupported faction block category.');for(const k of ['key','text','title','context','detail'])str(b[k],k,k==='detail'?100000:30000);bool(b.locked,'pin');ref(b.targetId,targets,'block target',true);for(const who of list(b.knownBy,'block knowers',1000))ref(who,chars,'block knower');const ls=new Set();for(const l of list(b.links||[],'block links',200)){obj(l,'block link');if(!['target','for','from','at','with','against'].includes(l.role))fail('invalid attachment role.');ref(l.targetId,targets,'faction attachment');const key=l.role+'|'+l.targetId;if(ls.has(key))fail('duplicate faction attachment.');ls.add(key);}}
    for(const e of p.entities){if(e.faction===undefined)continue;if(e.type!=='group')fail('only World groups can carry faction history.');const f=obj(e.faction,'faction');const opening=list(f.blocks,'faction opening');const bs=new Set();for(const b of opening){block(b,e);if(bs.has(b.id))fail('duplicate faction opening block.');bs.add(b.id);}unique(list(f.changes,'faction changes'),'faction change');f.checkpoints??=[];timing(f.checkpoints,'faction checkpoint');for(const cp of f.checkpoints){const ids=new Set();for(const b of list(cp.blocks,'saved faction blocks')){block(b,e);if(ids.has(b.id))fail('duplicate saved faction block.');ids.add(b.id);}}
      const perMoment=new Set();for(const x of f.changes){ref(x.momentId,mids,'faction change moment');id(x.blockId,'changed faction block');if(!['add','replace','retire'].includes(x.operation))fail('invalid faction change operation.');str(x.reason,'faction reason');const key=x.momentId+'|'+x.blockId;if(perMoment.has(key))fail('edit the existing faction block change at this moment.');perMoment.add(key);if(x.operation!=='retire'){block(x.block,e);if(x.block.id!==x.blockId)fail('changed block ID does not match.');}}
      let active=new Set(f.blocks.map(b=>b.id));const ix=order(p),all=[...f.checkpoints.map((x,i)=>({x,i,cp:true})),...f.changes.map((x,i)=>({x,i,cp:false}))].sort((a,b)=>ix.get(a.x.momentId)-ix.get(b.x.momentId)||(a.cp?0:1)-(b.cp?0:1)||a.i-b.i);for(const {x,cp} of all){if(cp){active=new Set(x.blocks.map(b=>b.id));continue;}if(x.operation==='add'){if(active.has(x.blockId))fail('faction block already exists at this moment.');active.add(x.blockId);}else{if(!active.has(x.blockId))fail('faction change targets an inactive block. Reorder or revise its history.');if(x.operation==='retire')active.delete(x.blockId);}}
    }
    for(const s of [...p.scenes,...(p.lab?.suggestions||[]),p.lab,...(p.structure||[])]){const ids=new Set();for(const gid of list(s.factionIds||[],'faction involvement',500)){ref(gid,groups,'faction involvement');if(ids.has(gid))fail('duplicate faction involvement.');ids.add(gid);}}
    return p;
  }
  return Object.freeze({copy,events,fold,roleDefault,termsDefault,roleAt,prominenceAt,termsAt,factionAt,factionBefore,plotIdsFor,prepare,validate});
})();
const clone = value => JSON.parse(JSON.stringify(value));
function dependencies(s){return [...(s.parent?[{id:s.parent,hash:s.parentHash}]:[]),...(s.extraParents||[]).filter(x=>x.id!==s.parent)];}
function validateWorkspace(raw) {
        raw = clone(raw); // Validation/migration must never mutate a recovery or server snapshot.
        const fail = message => { throw new Error('Invalid Counterplot backup: ' + message); };
        const object = (v, label) => { if (!v || typeof v !== 'object' || Array.isArray(v))
            fail(label + ' must be an object.'); return v; };
        const array = (v, label, max = 20000) => { if (!Array.isArray(v) || v.length > max)
            fail(label + ' must be a supported array.'); return v; };
        const text = (v, label, max = 1000000) => { if (typeof v !== 'string' || v.length > max)
            fail(label + ' must be text within the size limit.'); return v; };
        const identifier = (v, label, optional = false) => { if (optional && v === '')
            return v; if (typeof v !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(v))
            fail(label + ' has an invalid identifier.'); return v; };
        const bool = (v, label) => { if (typeof v !== 'boolean')
            fail(label + ' must be true or false.'); };
        const unique = (items, label) => { const set = new Set(); items.forEach(v => { identifier(v.id, label + ' id'); if (set.has(v.id))
            fail(label + ' has duplicate identifiers.'); set.add(v.id); }); return set; };
        const stringFields = (v, keys, label) => keys.forEach(k => text(v[k], label + '.' + k));
        const ids = (v, label) => array(v, label).forEach(x => identifier(x, label));
        const checkSources = (v, label) => { object(v, label); ids(v.characters, label + '.characters'); ids(v.entities, label + '.entities'); identifier(v.connection, label + '.connection', true); if(v.connections!==undefined)ids(v.connections,label+'.connections'); if(v.cast!==undefined)ids(v.cast,label+'.cast'); if(v.miceIds!==undefined)ids(v.miceIds,label+'.miceIds'); if(v.range!==undefined)bool(v.range,label+'.range'); };
        function checkRange(r){object(r,'story range');for(const [key,values] of Object.entries(STORY_RANGE)){if(!values.some(x=>x[0]===r[key]))fail('unknown '+key);}}
        function checkSceneCraft(v,label){SCENE_FIELDS.forEach(key=>{if(v[key]!==undefined)text(v[key],label+'.'+key,100000);});if(v.sceneKind!==undefined&&!SCENE_KINDS.some(k=>k[0]===v.sceneKind))fail('unknown scene prompt kind');if(v.beats!==undefined)array(v.beats,label+' beats',100).forEach(beat=>text(beat,label+' beat',30000));}
        object(raw, 'workspace');
        if (raw.format !== 'counterplot' || ![1,2,3].includes(raw.schema))
            fail('this file is not a supported Counterplot workspace.');
        identifier(raw.id, 'workspace id');
        identifier(raw.active, 'active project');
        const projects = array(raw.projects, 'projects', 1000);
        if (!projects.length)
            fail('at least one project is required.');
        const projectIds = unique(projects, 'project');
        if (!projectIds.has(raw.active))
            fail('the active project does not exist.');
        for (const project of projects) {
            object(project, 'project');
            stringFields(project, ['title', 'version', 'createdAt', 'updatedAt'], 'project');
            const characters = array(project.characters, 'characters'), entities = array(project.entities, 'world entries'), connections = array(project.connections, 'connections'), scenes = array(project.scenes, 'scenes');
            const charIds = unique(characters, 'character'), entityIds = unique(entities, 'world entry'), sceneIds = unique(scenes, 'scene');
            unique(connections, 'connection');
            // Older Counterplot workspaces predate named A/B/C plots. Migrate them into one A Plot in memory.
            if(project.plotlines===undefined){const pid='plot-'+project.id.slice(0,24);project.plotlines=[{id:pid,label:'A',title:'Main plot',protagonistId:'',notes:''}];for(const n of project.structure||[]){n.plotlineId=pid;n.plotlineIds=[pid];if(n.povId===undefined)n.povId='';if(n.storyDate===undefined)n.storyDate='';if(n.storyEndDate===undefined)n.storyEndDate='';}for(const s of project.scenes||[]){if(s.plotlineId===undefined)s.plotlineId=pid;if(s.storyDate===undefined)s.storyDate='';if(s.storyEndDate===undefined)s.storyEndDate='';}if(project.lab){if(project.lab.plotlineId===undefined)project.lab.plotlineId=pid;} }
            CounterplotEnsemble.prepare(project);
            const plots=array(project.plotlines,'plotlines',100);const plotIdsLocal=unique(plots,'plotline');const plotLabels=new Set();for(const pl of plots){object(pl,'plotline');for(const k of ['label','title','notes'])if(pl[k]===undefined)pl[k]='';stringFields(pl,['label','title','notes'],'plotline');if(!pl.label.trim())fail('a plotline needs a label.');const key=pl.label.trim().toUpperCase();if(plotLabels.has(key))fail('plotline labels must be unique.');plotLabels.add(key);}
            if(!plots.length)fail('at least one plotline is required.');
            const momentIdsLocal=new Set((project.moments||[]).map(m=>m.id)),nodeIdsLocal=new Set((project.structure||[]).map(n=>n.id));
            for (const id of entityIds)
                if (charIds.has(id))
                    fail('a shared target id is ambiguous.');
            const targets = new Set([...charIds, ...entities.map(e => e.id)]);
            const stateTargets = new Set([...charIds, ...entities.filter(e => e.type !== 'fact' && e.type !== 'rule').map(e => e.id)]);
            const knowerIds=new Set([...charIds,...entities.filter(e=>e.type==='group').map(e=>e.id)]);
            const checkKnows = (v, label,allowGroups=false) => { ids(v, label); v.forEach(id => { if (!(allowGroups?knowerIds:charIds).has(id))
                fail(label + ' points to a missing knower.'); }); };
            const allBlockIds = new Set();
            for (const c of characters) {
                object(c, 'character');
                stringFields(c, ['name', 'identity', 'notes'], 'character');
                bool(c.archived, 'character archived');
                if(c.lifeStatus===undefined)c.lifeStatus='alive';
                if(c.lifeChanges===undefined)c.lifeChanges=[];
                if(!['alive','dead'].includes(c.lifeStatus))fail('unknown character life status.');
                array(c.lifeChanges,'life status changes');
                unique(array(c.blocks, 'building blocks'), 'building block');
                for (const b of c.blocks) {
                    object(b, 'block');
                    if (!Object.hasOwn(KINDS, b.kind))
                        fail('unknown building block kind.');
                    stringFields(b, ['key', 'text', 'title', 'context', 'detail'], 'block');
                    bool(b.locked, 'block pinned'); if(b.when!==undefined&&!CONTEXTS.some(x=>x[0]===b.when))fail('unknown block circumstance');
                    identifier(b.targetId, 'block target', true);
                    if (b.targetId && !targets.has(b.targetId))
                        fail('a building block references a missing or invalid target.');
                    checkKnows(b.knownBy, 'block knowledge');
                    if (allBlockIds.has(b.id))
                        fail('building block identifiers must be unique within a project.');
                    allBlockIds.add(b.id);
                }
            }
            for (const e of entities) {
                object(e, 'world entry');
                if (!Object.hasOwn(ENTITY_TYPES, e.type)) fail('unknown world entry type.');
                stringFields(e, ['name', 'notes'], 'world entry');
                checkKnows(e.knownBy, 'fact knowledge',true);
                if(e.knownFrom===undefined)e.knownFrom={};object(e.knownFrom,'fact knowledge timing');
                for(const [cid,mid] of Object.entries(e.knownFrom)){identifier(cid,'fact knower');if(!knowerIds.has(cid))fail('fact knowledge timing points to a missing knower.');if(!(e.knownBy||[]).includes(cid))fail('fact knowledge timing exists for a character who is not marked as knowing the fact.');identifier(mid,'fact knowledge moment',true);if(mid&&!momentIdsLocal.has(mid))fail('fact knowledge timing points to a missing story moment.');}
                if(e.readerAppearances===undefined)e.readerAppearances=[];unique(array(e.readerAppearances,'reader appearances',5000),'reader appearance');let firstShown=0;for(const a of e.readerAppearances){object(a,'reader appearance');identifier(a.sceneId,'reader appearance scene');if(!sceneIds.has(a.sceneId))fail('reader appearance points to a missing scene.');if(!['shown','reinterpreted'].includes(a.kind))fail('unknown reader appearance kind.');text(a.note,'reader appearance note',30000);if(a.kind==='shown')firstShown++;}if(firstShown>1)fail('a fact can have only one first-shown scene.');if(e.type!=='fact'&&e.readerAppearances.length)fail('reader-facing appearances belong to facts.');
                if(e.stateLabel===undefined)e.stateLabel='';if(e.stateValue===undefined)e.stateValue='';if(e.stateTargetId===undefined)e.stateTargetId='';if(e.stateChanges===undefined)e.stateChanges=[];text(e.stateLabel,'world state label',500);text(e.stateValue,'world opening state',3000);identifier(e.stateTargetId,'world opening state target',true);if(e.stateTargetId&&!stateTargets.has(e.stateTargetId))fail('world opening state target is missing or is not a stateful person/place/thing.');unique(array(e.stateChanges,'world state changes',20000),'world state change');const stateMoments=new Set();for(const x of e.stateChanges){object(x,'world state change');identifier(x.momentId,'world state moment');if(!momentIdsLocal.has(x.momentId))fail('world state change points to a missing story moment.');text(x.value,'world state value',3000);identifier(x.targetId,'world state target',true);if(x.targetId&&!stateTargets.has(x.targetId))fail('world state target is missing or is not a stateful person/place/thing.');text(x.reason,'world state reason',30000);if(stateMoments.has(x.momentId))fail('a World entry can have only one tracked-state change at a story moment.');stateMoments.add(x.momentId);}if((e.stateLabel||e.stateChanges.length)&&['fact','rule'].includes(e.type))fail('facts and rules cannot use tracked World state.');
            }
            const pairs = new Set(),connectionChangeIds=new Set();
            for (const r of connections) {
                object(r, 'connection');
                stringFields(r, ['bond', 'aWant', 'bWant', 'notes'], 'connection');
                if (!knowerIds.has(r.a) || !knowerIds.has(r.b) || r.a === r.b) fail('a connection needs two different existing people or groups.');
                const pair = [r.a, r.b].sort().join('|');if (pairs.has(pair)) fail('duplicate relationship record.');pairs.add(pair);
                if(r.changes===undefined)r.changes=[];unique(array(r.changes,'connection changes',20000),'connection change');
                const momentSeen=new Set();for(const x of r.changes){object(x,'connection change');if(connectionChangeIds.has(x.id))fail('connection change IDs must be unique across the project.');connectionChangeIds.add(x.id);identifier(x.momentId,'connection change moment');if(!momentIdsLocal.has(x.momentId))fail('connection change points to a missing story moment.');text(x.reason,'connection change.reason');let changed=0;for(const key of ['bond','aWant','bWant','notes'])if(Object.hasOwn(x,key)){text(x[key],'connection change.'+key);changed++;}if(x.terms!==undefined){object(x.terms,'organizational terms');if(Object.keys(x.terms).length)changed++;}if(!changed)fail('a connection change must change at least one relationship term.');if(momentSeen.has(x.momentId))fail('a Connection can have only one recorded change at a story moment.');momentSeen.add(x.momentId);}
            }
            object(project.world, 'world'); if(project.world.range!==undefined)checkRange(project.world.range);
            if(project.drafts!==undefined){unique(array(project.drafts,'unfinished edits',Number.MAX_SAFE_INTEGER),'unfinished edit');project.drafts.forEach(d=>{if(!['en-continuity','en-role','en-prominence','en-faction-block','en-tie','en-knowledge','en-transition','en-outcome','block','name','connection','connection-change','entity','entity-state','scene','projects','range','path','change','life','moment','mice','mice-import','evidence','reader-appearance','scene-reader','discovery','plotline','earlier-opening'].includes(d.kind))fail('unknown unfinished edit');object(d.draft,'unfinished edit content');if(d.kind==='scene')checkSceneCraft(d.draft,'unfinished scene');if(JSON.stringify(d).length>32000000)fail('unfinished edit too large');});}
            stringFields(project.world, ['setting', 'reality', 'notes'], 'world');
            array(project.world.tones, 'tones', 50).forEach(t => { if (!TONES.some(a => a[0] === t))
                fail('unknown tone.'); });
            function checkScene(s, label) { object(s, label); checkSceneCraft(s,label); checkExtras(s,true); identifier(s.id, label + ' id'); if(s.plotlineId!==undefined){identifier(s.plotlineId,label+' plotline',true);if(s.plotlineId&&!plotIdsLocal.has(s.plotlineId))fail(label+' references a missing plotline.');} if(s.storyDate!==undefined&&!CounterplotStory.validDate(s.storyDate))fail(label+' has an invalid story date.'); if(s.storyEndDate!==undefined&&!CounterplotStory.validDate(s.storyEndDate))fail(label+' has an invalid story end date.'); if(s.storyDate&&s.storyEndDate&&s.storyEndDate<s.storyDate)fail(label+' story end date cannot be before its start date.'); stringFields(s, ['title', 'focus', 'partner', 'context', 'action', 'gain', 'cost', 'response', 'after', 'next', 'notes', 'arc', 'status', 'parent', 'parentHash', 'sourceHash', 'createdAt', 'updatedAt', 'pressure', 'route', 'routeLabel', 'why'], label); if (s.focus && !charIds.has(s.focus) || s.partner && (!charIds.has(s.partner) || s.partner === s.focus))
                fail('a scene references invalid participants.'); identifier(s.parent, label + ' cause', true); if (s.parent && !sceneIds.has(s.parent))
                fail('a causal parent is missing.'); bool(s.archived, label + ' archived'); if (s.status !== 'Planned' && s.status !== 'On the page')
                fail('unknown scene status.'); if (!ARC_EFFECTS.includes(s.arc))
                fail('unknown arc interpretation.'); checkSources(s.sources, label + ' sources'); array(s.assumptions, label + ' assumptions').forEach(v => text(v, 'assumption')); array(s.blockSources, label + ' block snapshots').forEach(b => { object(b, 'block snapshot'); stringFields(b, ['kind', 'text', 'id'], 'block snapshot'); }); array(s.knowledge, label + ' knowledge').forEach(f => { object(f, 'knowledge snapshot'); stringFields(f, ['title', 'detail'], 'knowledge snapshot'); }); if (s.inherited !== undefined)
                text(s.inherited, 'inherited consequence'); if (s.alternativeGroup !== undefined)
                text(s.alternativeGroup, 'alternative group'); if (s.generation !== undefined && (!Number.isSafeInteger(s.generation) || s.generation < 0))
                fail('invalid generation number.'); if(s.ideaIds===undefined)s.ideaIds=[];const seenIdeas=new Set();for(const id of array(s.ideaIds,label+' idea links',500)){identifier(id,label+' idea');const e=entities.find(x=>x.id===id);if(!e||e.type!=='idea')fail(label+' references a missing or non-Idea thematic link.');if(seenIdeas.has(id))fail(label+' has a duplicate idea link.');seenIdeas.add(id);} if (s.kept !== undefined)
                bool(s.kept, 'kept state'); }
            for(const s of scenes){if(s.plotlineId===undefined)s.plotlineId=plots[0]?.id||'';if(s.storyDate===undefined)s.storyDate='';if(s.storyEndDate===undefined)s.storyEndDate='';if(s.miceLinks===undefined)s.miceLinks=[];if(s.ideaIds===undefined)s.ideaIds=[];if(s.sources&&s.sources.cast===undefined)s.sources.cast=[...new Set([s.focus,s.partner,...(s.ensemble||[]).map(x=>x.id)].filter(Boolean))];if(s.sources&&s.sources.miceIds===undefined)s.sources.miceIds=(s.miceLinks||[]).map(x=>x.miceId).filter(Boolean);}
            scenes.forEach(s => checkScene(s, 'scene'));
            // Linear-time cycle detection keeps large imports from causing recursive failure.
            const degrees=new Map(scenes.map(s=>[s.id,dependencies(s).length])), children=new Map();
            scenes.forEach(s=>dependencies(s).forEach(d=>{if(!sceneIds.has(d.id))fail('a causal parent is missing');if(!children.has(d.id))children.set(d.id,[]);children.get(d.id).push(s.id);}));
            const ready=scenes.filter(s=>degrees.get(s.id)===0).map(s=>s.id); let processed=0;
            for(let at=0;at<ready.length;at++){const id=ready[at];processed++;for(const child of children.get(id)||[]){degrees.set(child,degrees.get(child)-1);if(!degrees.get(child))ready.push(child);}}
            if(processed!==scenes.length)fail('causal links contain a cycle.');
            for(const n of project.structure||[]){if(n.plotlineId===undefined)n.plotlineId=plots[0]?.id||'';if(n.plotlineIds===undefined)n.plotlineIds=n.plotlineId?[n.plotlineId]:[];if(n.plotlineId&&!n.plotlineIds.includes(n.plotlineId))n.plotlineIds.unshift(n.plotlineId);if(!n.plotlineId&&n.plotlineIds.length)n.plotlineId=n.plotlineIds[0];if(n.povId===undefined)n.povId='';if(n.storyDate===undefined)n.storyDate='';if(n.storyEndDate===undefined)n.storyEndDate='';if(n.evidenceLinks===undefined)n.evidenceLinks=[];unique(array(n.evidenceLinks,'Inquiry evidence links',5000),'Inquiry evidence link');if(n.type!=='I'&&n.evidenceLinks.length)fail('evidence links belong only to Inquiry threads.');for(const ev of n.evidenceLinks){object(ev,'Inquiry evidence link');if(!['fact','scene'].includes(ev.sourceType))fail('unknown Inquiry evidence source type.');identifier(ev.sourceId,'Inquiry evidence source');if(ev.sourceType==='fact'){const e=entities.find(x=>x.id===ev.sourceId);if(!e||e.type!=='fact')fail('Inquiry evidence points to a missing fact.');}else if(!sceneIds.has(ev.sourceId))fail('Inquiry evidence points to a missing scene.');if(!['supports','challenges','complicates'].includes(ev.bearing))fail('unknown Inquiry evidence bearing.');text(ev.note,'Inquiry evidence note',30000);}}
            CounterplotStory.validate(project,KINDS);
            CounterplotEnsemble.validate(project);
            const lab = object(project.lab, 'scene explorer');if(lab.miceLinks===undefined)lab.miceLinks=[];checkExtras(lab,false);
            function checkExtras(v,kept){
                if(v.thread!==undefined)text(v.thread,'plotline',500);
                if(v.ensemble!==undefined){const members=new Set([v.focus,v.partner].filter(Boolean));array(v.ensemble,'ensemble',1000).forEach(x=>{object(x,'ensemble member');if(!charIds.has(x.id)||members.has(x.id)||!SCENE_ROLES.some(y=>y[0]===x.role))fail('invalid or duplicate ensemble member');members.add(x.id);});}
                if(v.extraParents!==undefined){const used=new Set([kept?v.parent:v.from].filter(Boolean));array(v.extraParents,'additional causes',10000).forEach(x=>{const id=kept?x.id:x;identifier(id,'additional cause');if(!sceneIds.has(id)||used.has(id))fail('missing or duplicate causal parent');used.add(id);if(kept)text(x.hash,'additional cause snapshot');});}
                if(v.outcome!==undefined&&!OUTCOMES.some(x=>x[0]===v.outcome))fail('unknown outcome shape');
                if(v.circumstance!==undefined&&!CONTEXTS.some(x=>x[0]===v.circumstance))fail('unknown scene circumstance');
                if(v.rangeSnapshot!==undefined)checkRange(v.rangeSnapshot);
                if(v.treatment!==undefined)text(v.treatment,'treatment');
                if(v.effects!==undefined)array(v.effects,'effects').forEach(x=>text(x,'effect',500));
                if(v.miceLinks===undefined)v.miceLinks=[];const usedMice=new Set([v.miceId].filter(Boolean));for(const l of array(v.miceLinks,'additional MICE contributions',200)){object(l,'additional MICE contribution');identifier(l.miceId,'additional MICE thread');if(!nodeIdsLocal.has(l.miceId))fail('additional MICE thread is missing.');if(usedMice.has(l.miceId))fail('duplicate MICE contribution.');if(!['advance','open','close'].includes(l.role))fail('unknown additional MICE role.');usedMice.add(l.miceId);}
            }
            ['focus', 'partner', 'pressure', 'context', 'from', 'basis'].forEach(k => text(lab[k], 'lab.' + k));
            if (lab.focus && !charIds.has(lab.focus) || lab.partner && (!charIds.has(lab.partner) || lab.partner === lab.focus) || lab.from && !sceneIds.has(lab.from))
                fail('the scene explorer has invalid references.');
            if (lab.pressure && !PRESSURES.some(a => a.id === lab.pressure))
                fail('unknown scene situation.');
            if (!Number.isSafeInteger(lab.revision) || lab.revision < 0)
                fail('invalid scene revision.');
            ['wantId', 'methodId', 'valueId'].forEach(k => { if (lab[k] === undefined)
                lab[k] = ''; identifier(lab[k], 'lab ' + k, true); });
            array(lab.suggestions, 'scene suggestions', 3).forEach(s => checkScene(s, 'suggestion'));
        }
        raw.schema=3;return raw;
    }
return { validateWorkspace, CounterplotStory, CounterplotEnsemble };

})();


/* Shared, DOM-free Workshop migration and story operations. */
(() => {
  const W = Workshop;
  const L = CounterplotLegacy;
  const baseValidate = W.validate, baseMarkdown = W.markdown,basePurge=W.purgeArchive,baseRekey=W.rekeyEntity,baseDuplicate=W.duplicateNode;
  const copy = W.copy, text = value => typeof value === 'string' ? value : '';
  const list = value => Array.isArray(value) ? value : [];
  const allNodes = p => [...p.nodes, ...p.archive.filter(a => a.kind === 'branch').flatMap(a => a.nodes)];
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
    p.drafts ||= []; p.plots ||= []; p.storyWorld ||= {}; p.version ||= 'Main draft';
    for (const n of allNodes(p)) { n.writingId ||= n.sceneId || n.id; n.plotIds ||= []; }
    for (const c of allCharacters(p)) {
      c.lifeStatus ||= 'alive'; c.lifeChanges ||= []; c.stateCheckpoints ||= [];
      c.prominence ||= {opening:'',changes:[],checkpoints:[]};
    }
    return p;
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
      const people=allCharacters(p),world=allWorld(p),targets=new Set([...people,...world].map(x=>x.id));
      const timing=(xs,label)=>{unique(array(xs||[],label).map(x=>x.id),label+' identity');for(const x of xs||[])if(!eventIds.has(x.at||x.momentId))fail(label+' points to a missing story moment.');};
      const knowledge=o=>{for(const id of o.knownBy||[])if(!targets.has(id))fail('Knowledge points to a missing person or faction.');for(const [id,mid] of Object.entries(o.knownFrom||{})){if(!(o.knownBy||[]).includes(id)||mid&&!eventIds.has(mid))fail('Invalid knowledge timing.');}};
      const block=b=>{knowledge(b);for(const link of [...(b.targetId?[{targetId:b.targetId,role:'target'}]:[]),...list(b.links)])if(!targets.has(link.targetId)||!['target','for','from','at','with','against'].includes(link.role))fail('A block attachment is invalid.');};
      for(const c of people){timing(c.lifeChanges,'Life history');for(const x of [{status:c.lifeStatus},...c.lifeChanges])if(!['alive','dead'].includes(x.status))fail('Invalid life status.');timing(c.stateCheckpoints,'Character checkpoints');for(const x of c.stateCheckpoints){if(!['alive','dead'].includes(x.lifeStatus))fail('Invalid checkpoint life status.');unique(array(x.blocks,'Checkpoint pieces').map(b=>b.id),'checkpoint piece');for(const b of x.blocks)block(b);}for(const b of [...c.blocks,...c.changes.flatMap(x=>x.block?[x.block]:[])])block(b);timing(c.prominence.changes,'Prominence');timing(c.prominence.checkpoints,'Prominence checkpoints');}
      for(const n of nodes){if(!date(n.storyDate)||!date(n.storyEndDate))fail('Use a valid scene date.');for(const id of n.cast)if(!targets.has(id))fail('A scene participant is missing.');for(const id of n.worldIds)if(!targets.has(id))fail('A world link is missing.');for(const evidence of n.evidenceLinks||[]){if(!['supports','challenges','complicates'].includes(evidence.bearing))fail('Invalid evidence interpretation.');if(evidence.sourceType==='fact'?!world.some(w=>w.id===evidence.sourceId&&w.type==='fact'):evidence.sourceType!=='scene'||!nodes.some(x=>[x.id,x.writingId,x.sceneId].includes(evidence.sourceId)))fail('Evidence points to a missing fact or scene.');}}
      const scenes=new Set(nodes.flatMap(n=>[n.id,n.writingId,n.sceneId].filter(Boolean)));
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
  function reorder(p,collection,id,beforeId='') {const xs=collection==='timeline'?p.timeline:collection==='readingOrder'?p.readingOrder:p.characters;const at=xs.findIndex(x=>(typeof x==='string'?x:x.key||x.id)===id);if(at<0)throw Error('That item no longer exists.');const dest=beforeId?xs.findIndex(x=>(typeof x==='string'?x:x.key||x.id)===beforeId):xs.length;if(dest<0)throw Error('That destination no longer exists.');const [item]=xs.splice(at,1);xs.splice(dest-(at<dest?1:0),0,item);}
  function removeFrame(p,id){const n=p.nodes.find(n=>n.id===id);if(!n||n.type==='B')throw Error('Choose a thread frame.');const index=p.nodes.indexOf(n);for(const child of p.nodes)if(child.parentId===id)child.parentId=n.parentId;
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
  function continueScene(p,id){const parent=p.nodes.find(n=>n.id===id);if(!parent)throw Error('Choose a scene to continue.');const n=W.node('B',parent.parentId);n.title='After '+(parent.title||'this scene');n.parent=parent.sceneId||parent.id;n.cast=copy(parent.cast);n.plotIds=copy(parent.plotIds||[]);p.nodes.push(n);normalize(p);const at=p.readingOrder.indexOf(id);p.readingOrder=p.readingOrder.filter(x=>x!==n.id);p.readingOrder.splice(at+1,0,n.id);acceptContinuity(p,n);return n;}
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
    for(const n of allNodes(p)){n.cast=n.cast.filter(id=>people.has(id));n.worldIds=n.worldIds.filter(id=>world.has(id));n.ensemble=(n.ensemble||[]).filter(x=>people.has(x.id));n.factionIds=(n.factionIds||[]).filter(id=>world.has(id));for(const key of ['povId','focus','partner','characterId'])if(n[key]&&!people.has(n[key]))n[key]='';if(n.parent&&!scenes.has(n.parent))n.parent='';n.extraParents=(n.extraParents||[]).filter(x=>scenes.has(x.id));n.miceLinks=(n.miceLinks||[]).filter(x=>nodes.has(x.miceId));n.evidenceLinks=(n.evidenceLinks||[]).filter(x=>x.sourceType==='fact'?world.has(x.sourceId):scenes.has(x.sourceId));for(const key of ['openSceneId','closeSceneId'])if(n[key]&&!scenes.has(n[key]))n[key]='';}
    for(const plot of p.plots)plot.cast=(plot.cast||[]).filter(x=>people.has(x.characterId));
    p.readingOrder=p.readingOrder.filter(id=>nodes.has(id));
    for(const e of p.timeline)if(e.nodeId&&!nodes.has(e.nodeId)){e.title ||= beforeNodes.get(e.nodeId)?.title||'Historical moment';e.nodeId='';}
  }
  // Extend the original tutorial identity operation to the retained story histories.
  function rekeyEntity(p,entity,from,to,cid='') {
    const changed=baseRekey(p,entity,from,to,cid);if(!changed)return false;
    const rename=id=>id===from?to:id, timeMap=new Map();
    if(entity==='node'){
      p.readingOrder=(p.readingOrder||[]).map(rename);
      for(const e of p.timeline||[]){
        if(e.nodeId===from)e.nodeId=to;
        for(const field of ['id','key'])if(e[field]===from+'-open'||e[field]===from+'-close'||e[field]?.startsWith(from+':')){
          const old=e[field];e[field]=to+old.slice(from.length);timeMap.set(old,e[field]);
        }
      }
      for(const n of allNodes(p)){
        if(n.writingId===from)n.writingId=to;if(n.sceneId===from)n.sceneId=to;
        for(const key of ['parent','openSceneId','closeSceneId','miceId'])if(n[key]===from)n[key]=to;
        for(const x of n.extraParents||[])x.id=rename(x.id);
        for(const x of n.miceLinks||[])x.miceId=rename(x.miceId);
        for(const x of n.evidenceLinks||[])if(x.sourceType==='scene')x.sourceId=rename(x.sourceId);
      }
    }
    if(entity==='character'||entity==='world'){
      for(const r of allConnections(p)){r.a=rename(r.a);r.b=rename(r.b);}
      for(const n of allNodes(p)){
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
    const lines=[baseMarkdown(p),'','## Version',p.version||'Main draft','','## Manuscript',...reading(p).filter(n=>n.prose).flatMap(n=>['','### '+n.title,'',n.prose]),'','## Story chronology',...W.events(p).map(e=>'- '+when(e.id||e.key)+' · '+e.edge),'','## Scene craft'];
    for(const n of reading(p)){lines.push('','### '+(n.title||'Untitled'));for(const key of ['goal','purpose','context','entry','tension','stakes','development','turn','action','gain','cost','response','reaction','after','readerExpectation','next','exit','ideaNotes'])if(n[key])lines.push('**'+key.replace(/([A-Z])/g,' $1')+':** '+n[key]);if(n.beats?.length)lines.push('**Internal beats:**',...n.beats.map(b=>'- '+b));}
    lines.push('','## World rules and priorities',p.storyWorld.setting||'',p.storyWorld.reality||'',(p.storyWorld.tones||[]).join(', '),p.storyWorld.priorities||'',p.storyWorld.notes||'','## Author knowledge and reader disclosure','These notes may include secrets the reader or cast does not yet know.');
    for(const e of allWorld(p)){lines.push('','### '+e.name,e.notes);if(e.knownBy?.length)lines.push('Known by: '+e.knownBy.map(id=>label(id)+' (from '+when(e.knownFrom?.[id])+')').join('; '));for(const a of e.readerAppearances||[])lines.push('- Reader '+a.kind+' in '+(allNodes(p).find(n=>n.sceneId===a.sceneId||n.writingId===a.sceneId)?.title||a.sceneId)+(a.note?': '+a.note:''));if(e.stateLabel)lines.push(e.stateLabel+': '+e.stateValue);for(const x of e.stateChanges||[])lines.push('- '+when(x.momentId)+': '+x.value+(x.targetId?' · '+label(x.targetId):'')+(x.reason?' — '+x.reason:''));for(const b of e.faction?.blocks||[])lines.push('- '+(b.title||b.kind)+': '+b.text);for(const x of e.faction?.changes||[])lines.push('- '+when(x.momentId)+': '+x.operation+' '+(x.block?.text||x.blockId)+(x.reason?' — '+x.reason:''));}
    lines.push('','## Character life and saved selves');for(const c of allCharacters(p)){lines.push('','### '+c.name,'Opening: '+c.lifeStatus);for(const x of c.lifeChanges)lines.push('- '+when(x.momentId||x.at)+': '+x.status+' — '+(x.reason||''));for(const x of c.stateCheckpoints)lines.push('- Saved self at '+when(x.momentId||x.at)+': '+x.blocks.map(b=>b.text).join('; '));for(const b of c.blocks)if(b.knownBy?.length)lines.push('- '+(b.label||b.kind)+': known by '+b.knownBy.map(id=>label(id)+' (from '+when(b.knownFrom?.[id])+')').join('; '));}
    lines.push('','## Connections and membership');for(const r of allConnections(p)){lines.push('','### '+label(r.a)+' ↔ '+label(r.b),r.label,'One wants: '+(r.aWant||''),'The other wants: '+(r.bWant||''),r.notes);if(r.terms)lines.push(Object.entries(r.terms).filter(([,v])=>v!==''&&v!==undefined).map(([k,v])=>k+': '+v).join(' · '));for(const x of r.changes||[])lines.push('- '+when(x.momentId)+': '+[x.bond,x.aWant,x.bWant,x.notes,x.reason].filter(Boolean).join(' · '));}
    lines.push('','## Plot roles');for(const pl of p.plots){lines.push('','### '+pl.label+' · '+pl.title,pl.notes);for(const tr of pl.cast||[]){lines.push('- '+label(tr.characterId)+': '+(tr.opening.roles||[]).join(', ')+' · '+tr.opening.note);for(const x of tr.changes||[])lines.push('  - '+when(x.momentId)+': '+(x.roles||[]).join(', ')+' · '+(x.note||''));}}
    lines.push('','## Unfinished drafts');for(const d of p.drafts)lines.push('','### '+(d.title||d.draft?.title||'Unfinished draft'),d.draft?.notes||d.draft?.text||'An unfinished form is retained in the JSON backup.');return lines.join('\n');
  }
  Object.assign(W,{normalize,validate,legacy:migrate,migrate,allNodes,allCharacters,allWorld,allConnections,reading,reorder,removeFrame,duplicateCharacter,worldState,connectionState,knownAt,readerAt,fold,momentId,continuity,acceptContinuity,consequences,usedHere,search,sharedStakes,taggedOutline,parseOutline,structureIssues,continueScene,addEarlierSelf,transitionFaction,purgeArchive,rekeyEntity,duplicateNode,markdown,
    factionAt:(p,e,key)=>L.CounterplotEnsemble.factionAt(timelineProject(p),e,momentId(p,key)),
    roleAt:(p,track,key)=>L.CounterplotEnsemble.roleAt(timelineProject(p),track,momentId(p,key)),
    prominenceAt:(p,c,key)=>L.CounterplotEnsemble.prominenceAt(timelineProject(p),c,momentId(p,key))});

})();

export const validateWorkshop = value => Workshop.validate(value);
