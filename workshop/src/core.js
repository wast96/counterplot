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
if (typeof module !== 'undefined') module.exports = Workshop;
