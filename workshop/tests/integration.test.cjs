const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const W=require('../src/integration.js'),L=require('../src/legacy.js');
const fixture=()=>JSON.parse(fs.readFileSync(__dirname+'/../../browser-tests/fixtures/rich-v2-workspace.json'));
test('migration preserves editable records and does not mutate the source',()=>{
  const input=fixture(),before=JSON.stringify(input); input.customExtension={value:'root metadata'}; const data=W.legacy(input),p=data.projects[0],old=L.validateWorkspace(input).projects[0];
  assert.equal(JSON.stringify({...input,customExtension:undefined}),before);
  assert.deepEqual(data.customExtension,input.customExtension);assert.equal(p.id,old.id);assert.equal(data.active,input.active);
  for(const s of old.scenes){const n=W.allNodes(p).find(n=>n.sceneId===s.id);assert.equal(n.prose,s.notes);for(const key of ['goal','tension','development','reaction','parent','extraParents','ensemble','miceLinks','sourceSnapshot'])if(s[key]!==undefined)assert.deepEqual(n[key],s[key],key);}
  assert.deepEqual(p.drafts.filter(d=>!d.recoveredFrom),old.drafts);assert.deepEqual(p.drafts.filter(d=>d.recoveredFrom).map(d=>d.draft),old.lab.suggestions);assert.deepEqual(p.world,old.entities);assert.equal(p.source,null);
});
test('all historical character states match the original at every saved moment',()=>{
  const input=fixture(),old=L.validateWorkspace(input).projects[0],p=W.legacy(input).projects[0];
  for(const c of old.characters)for(const m of old.moments){const expected=L.CounterplotStory.state(old,c,m.id),actual=W.characterState(p,W.allCharacters(p).find(x=>x.id===c.id),p.timeline.find(x=>x.id===m.id).key);assert.equal(actual.lifeStatus,expected.lifeStatus);assert.deepEqual(actual.blocks.map(b=>[b.id,b.text,b.detail,b.pinned]),expected.blocks.map(b=>[b.id,b.text,b.detail,b.locked]));}
});
test('outline movement leaves chronology, manuscript order, and character state unchanged',()=>{
  const p=W.legacy(fixture()).projects[0],before=JSON.stringify(p.timeline),reading=JSON.stringify(p.readingOrder),c=p.characters[0],last=p.timeline.at(-1).key,state=W.stateAt(p,c,last);
  const n=p.nodes.at(-1);W.move(p,n.id,'','inside');assert.equal(JSON.stringify(p.timeline),before);assert.equal(JSON.stringify(p.readingOrder),reading);assert.deepEqual(W.stateAt(p,c,last),state);
});
test('archived characters and branches stay archived and are independently restorable',()=>{
  const input=fixture(),old=input.projects[0];old.characters[1].archived=true;old.structure.forEach(n=>n.archived=true);old.scenes.forEach(n=>n.archived=true);
  const p=W.legacy(input).projects[0];assert.equal(p.characters.length,1);assert.equal(p.nodes.length,0);assert.ok(p.archive.some(a=>a.kind==='character'));assert.ok(p.archive.some(a=>a.kind==='branch'));
  const character=p.archive.find(a=>a.kind==='character');W.restore(p,character.id);for(const a of [...p.archive].filter(a=>a.kind==='branch'))W.restore(p,a.id);
  W.validate({format:'counterplot-workshop',schema:2,active:p.id,projects:[p]});assert.equal(p.characters.length,2);assert.ok(p.nodes.some(n=>n.prose));
});
test('archiving an old outline frame does not archive its independent active manuscript scenes',()=>{
  const input=fixture(),old=input.projects[0];old.structure.forEach(n=>n.archived=true);old.scenes[0].miceId=old.structure[0].id;const data=W.legacy(input),p=data.projects[0];assert.equal(W.reading(p).filter(n=>n.sceneId).length,old.scenes.filter(s=>!s.archived).length);assert.equal(W.reading(p).find(n=>n.sceneId===old.scenes[0].id).prose,old.scenes[0].notes);assert.ok(p.archive.some(a=>a.kind==='branch'));assert.doesNotThrow(()=>W.validate(data));
});
test('Workshop schema 1 freezes its existing time and reading sequence on first load',()=>{
  const p=W.project(),a=W.node('C'),b=W.node('B',a.id);p.nodes=[a,b];const data={format:'counterplot-workshop',schema:1,active:p.id,projects:[p]};W.validate(data);const events=JSON.stringify(p.timeline);W.move(p,b.id,a.id,'before');W.validate(data);assert.equal(JSON.stringify(p.timeline),events);assert.deepEqual(p.readingOrder,[a.id,b.id]);assert.equal(data.schema,2);
});
test('a failed consequence batch leaves every part of the original story intact',()=>{
  const p=W.legacy(fixture()).projects[0],before=JSON.stringify(p);assert.throws(()=>W.consequences(p,p.timeline[0].key,[{kind:'life',targetId:p.characters[0].id,value:{status:'dead'}},{kind:'world',targetId:'missing',value:{value:'broken'}}]));assert.equal(JSON.stringify(p),before);
});
test('knowledge and reader disclosure remain separate and JSON round trips preserve both',()=>{
  const data=W.legacy(fixture()),p=data.projects[0],world=p.world.find(w=>w.type==='fact');assert.ok(world);const again=W.validate(JSON.parse(JSON.stringify(data))).projects[0];assert.deepEqual(again.world.find(w=>w.id===world.id).knownFrom,world.knownFrom);assert.deepEqual(again.world.find(w=>w.id===world.id).readerAppearances,world.readerAppearances);
});
test('permanent archive deletion cleans knowledge and cast references without invalidating history',()=>{
  const input=fixture();input.projects[0].characters[1].archived=true;const data=W.legacy(input),p=data.projects[0],entry=p.archive.find(a=>a.kind==='character');W.purgeArchive(p,[entry.id]);assert.doesNotThrow(()=>W.validate(data));assert.ok(!JSON.stringify(p.world.map(w=>w.knownBy)).includes('ivo'));assert.ok(p.timeline.length);
});
test('tagged original outline imports nested threads and exports their closing words',()=>{
  const p=W.project();p.nodes=W.parseOutline('<C> An opening\n<I> A question\nA clue\n</I> An answer\n</C> A changed self');W.normalize(p);assert.equal(p.nodes.length,3);assert.equal(p.nodes[1].parentId,p.nodes[0].id);assert.equal(p.nodes[2].parentId,p.nodes[1].id);const result=W.taggedOutline(p);assert.ok(result.includes('</I> An answer'));assert.ok(result.includes('</C> A changed self'));
});
test('saved checkpoints and backwards manuscript chronology preserve original block states',()=>{
  const input=fixture(),old=input.projects[0],c=old.characters[0],first=old.moments[0];const second={...W.copy(first),id:'later-moment',sceneId:'',title:'Later'};old.moments.push(second);c.stateCheckpoints=[{id:'checkpoint',momentId:second.id,lifeStatus:'alive',blocks:c.blocks.map(b=>({...b,text:'Saved earlier self'}))}];const canonical=L.validateWorkspace(input).projects[0],data=W.legacy(input),p=data.projects[0],migrated=p.characters.find(x=>x.id===c.id);for(const m of canonical.moments){assert.deepEqual(W.stateAt(p,migrated,p.timeline.find(e=>e.id===m.id).key).map(b=>b.text),L.CounterplotStory.state(canonical,canonical.characters[0],m.id).blocks.map(b=>b.text));}
});
test('adding an earlier self preserves all existing character states even after editing new opening',()=>{
  const data=W.legacy(fixture()),p=data.projects[0],c=p.characters[0],before=p.timeline.map(e=>[e.key,W.characterState(p,c,e.key)]);W.addEarlierSelf(p,c.id,{preservedLabel:'Original arrival',seed:'blank',lifeStatus:'alive'});c.blocks.push(W.block('want','A much earlier ambition'));for(const [key,state]of before)assert.deepEqual(W.stateAt(p,c,key).map(b=>b.text),state.blocks.map(b=>b.text));assert.equal(W.stateAt(p,c,'')[0].text,'A much earlier ambition');assert.doesNotThrow(()=>W.validate(data));
});
test('faction transitions preserve opening membership and apply transfer only at the chosen moment',()=>{
  const data=W.legacy(fixture()),p=data.projects[0],source=p.world.find(w=>w.type==='group'),c=p.characters[0],moment=p.timeline[0].key;const r={id:'membership',a:c.id,b:source.id,label:'Member',notes:'',terms:{active:true,membership:'member'},changes:[]};p.connections.push(r);const [dest]=W.transitionFaction(p,{sourceId:source.id,mode:'split',names:['New choir'],moment,memberIds:[c.id]});assert.equal(W.connectionState(p,r,'').terms.membership,'member');assert.equal(W.connectionState(p,r,moment).terms.membership,'former');const joined=p.connections.find(x=>x.a===c.id&&x.b===dest.id);assert.equal(W.connectionState(p,joined,'').terms.active,false);assert.equal(W.connectionState(p,joined,moment).terms.membership,'member');assert.doesNotThrow(()=>W.validate(data));
});
test('identity replacement preserves schema 2 reading, chronology, knowledge, and checkpoint links',()=>{
 const p=W.project(),n=W.node('C'),c=W.character('Ada'),b=W.block('want','Find home');c.blocks=[b];p.nodes=[n];p.characters=[c];W.normalize(p);const key=n.id+':open',mid=p.timeline[0].id;
 c.stateCheckpoints=[{id:'checkpoint',at:key,momentId:mid,lifeStatus:'alive',blocks:[W.copy(b)]}];c.blocks[0].knownBy=[c.id];c.blocks[0].knownFrom={[c.id]:mid};n.povId=c.id;n.ensemble=[{id:c.id,roles:['lead']}];
 W.rekeyEntity(p,'node',n.id,'replacement');W.rekeyEntity(p,'character',c.id,'replacement-person');W.rekeyEntity(p,'block',b.id,'replacement-block','replacement-person');
 assert.equal(p.timeline[0].nodeId,'replacement');assert.equal(p.readingOrder[0],'replacement');assert.equal(c.stateCheckpoints[0].at,'replacement:open');assert.equal(c.stateCheckpoints[0].momentId,'replacement-open');assert.equal(c.stateCheckpoints[0].blocks[0].id,'replacement-block');assert.equal(c.blocks[0].knownFrom['replacement-person'],'replacement-open');assert.equal(n.ensemble[0].id,'replacement-person');
 p.nodes.push({...W.node('C'),id:key.split(':')[0]});assert.doesNotThrow(()=>W.validate({format:'counterplot-workshop',schema:2,active:p.id,projects:[p]}));
});
test('duplicating a migrated beat gives it independent manuscript and timeline identities',()=>{
 const data=W.legacy(fixture()),p=data.projects[0],source=p.nodes.find(n=>n.sceneId),clone=W.duplicateNode(p,source.id);assert.notEqual(clone.writingId,source.writingId);assert.equal(clone.prose,source.prose);assert.ok(p.readingOrder.includes(clone.id));assert.ok(p.timeline.some(e=>e.nodeId===clone.id));assert.doesNotThrow(()=>W.validate(data));
});
test('permanently deleting evidence sources cleans inquiry links',()=>{
 const data=W.legacy(fixture()),p=data.projects[0],fact=p.world.find(w=>w.type==='fact'),inquiry=p.nodes.find(n=>n.type==='I')||p.nodes[0];inquiry.evidenceLinks=[{id:'evidence',sourceType:'fact',sourceId:fact.id,bearing:'supports',note:''}];p.world=p.world.filter(w=>w!==fact);p.archive.push({id:'archived-fact',kind:'world',title:fact.name,created:new Date().toISOString(),item:fact});W.purgeArchive(p,['archived-fact']);assert.deepEqual(inquiry.evidenceLinks,[]);assert.doesNotThrow(()=>W.validate(data));
});
test('tutorial records reject storage keys outside the tutorial namespace',()=>{
 const data=W.legacy(fixture());data.tutorialRecords={'counterplot.tutorial.custom.index.v1.unexpected':'[]'};assert.throws(()=>W.validate(data),/storage key/);data.tutorialRecords={'counterplot.tutorial.cursor.mgs3.v1':'{"stage":"build-c"}'};assert.doesNotThrow(()=>W.validate(data));
});

test('tutorial starters clear the sample timeline before the first learner creates a piece',()=>{
 const {data}=require('../tutorial/mgs3-project.cjs'),construction=require('../tutorial/construction.js');const starter=construction.starter(data),p=starter.projects[0];assert.equal(p.timeline.length,0);assert.equal(p.readingOrder.length,0);const n=W.node('C');p.nodes.push(n);W.validate(starter);W.rekeyEntity(p,'node',n.id,'loyalty');assert.doesNotThrow(()=>W.validate(starter));assert.equal(p.timeline.length,2);assert.deepEqual(p.readingOrder,['loyalty']);
});
test('causal links cannot form a loop when editing imported scenes',()=>{
 const data=W.legacy(fixture()),p=data.projects[0],a=p.nodes[0],b=p.nodes[1];a.parent=b.sceneId||b.writingId;b.parent=a.sceneId||a.writingId;assert.throws(()=>W.validate(data),/cycle/);
});
test('later historical changes do not falsely mark an earlier scene stale',()=>{
 const p=W.project(),a=W.node('B'),b=W.node('B'),c=W.character('Ada');p.nodes=[a,b];p.characters=[c];a.cast=[c.id];W.normalize(p);W.acceptContinuity(p,a);c.lifeChanges.push({id:'later-life',momentId:p.timeline[1].id,status:'dead'});assert.equal(W.continuity(p,a).stale,false);c.blocks.push(W.block('want','A new opening ambition'));assert.equal(W.continuity(p,a).stale,true);
});
test('large imported shelves can restore a deleted story up to the supported project limit',()=>{
 const projects=Array.from({length:201},()=>W.project()),data={format:'counterplot-workshop',schema:2,active:projects[0].id,projects};const id=projects[0].id;
 W.trashProject(data,id);W.restoreProject(data,id);assert.equal(data.projects.length,201);assert.equal(data.trash.length,0);assert.doesNotThrow(()=>W.validate(data));
 W.trashProject(data,id);while(data.projects.length<1000)data.projects.push(W.project());const before=W.copy(data);assert.throws(()=>W.restoreProject(data,id),/shelf is full/);assert.deepEqual(data,before);
});
