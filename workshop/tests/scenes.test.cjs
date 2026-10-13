const test=require('node:test'),assert=require('node:assert/strict'),W=require('../src/integration.js');
function fixture(){const p=W.project('Scenes'),n=W.node('C');n.title='The pursuit';p.nodes=[n,{...W.node('B',n.id),title:'A warning'}];return {p,n,data:{format:'counterplot-workshop',schema:2,active:p.id,projects:[p]}};}
test('only authored legacy boards migrate, once, with opening and closing plans intact',()=>{
 const {p,n,data}=fixture();n.entry='Before';n.beats=['Warning','Choice'];n.opening='Opening plan';n.closing='Closing plan';n.closingCraft={cast:[],worldIds:[],exit:'After',beats:['Escape']};
 W.validate(data);assert.equal(p.scenes.length,2);assert.equal(p.scenes[0].plan,'Opening plan');assert.deepEqual(p.scenes[0].beats.map(b=>b.title),n.beats);assert.equal(p.scenes[1].plan,'Closing plan');assert.equal(p.scenes[1].moments[0].edge,'close');
 const saved=JSON.stringify(p.scenes);W.normalize(p);assert.equal(JSON.stringify(p.scenes),saved);p.scenes=[];W.normalize(p);assert.deepEqual(p.scenes,[]);
});
test('independent scenes preserve references and writeups through archive, rekey, validation and export',()=>{
 const {p,n,data}=fixture();W.normalize(p);const s=W.scene('The arrest');s.plan='A moral choice';s.moments=[{nodeId:n.id,edge:'close',title:n.title}];s.beats=[{id:'card',title:'The decision',writeup:'She stays.'}];p.scenes.push(s);
 W.rekeyEntity(p,'node',n.id,'renamed');assert.equal(s.moments[0].nodeId,'renamed');W.archiveNode(p,'renamed');const restored=W.validate(JSON.parse(JSON.stringify(data)));assert.deepEqual(restored.projects[0].scenes,p.scenes);assert.match(W.markdown(p),/She stays\./);
});
test('scene validation rejects malformed writeups and duplicate included moments',()=>{
 const {p,data}=fixture();W.normalize(p);const s=W.scene();p.scenes.push(s);s.beats=[{id:'b',title:'A beat',writeup:{}}];assert.throws(()=>W.validate(data),/writeup/);s.beats=[];s.moments=[{nodeId:'a',edge:'open',title:'A'},{nodeId:'a',edge:'open',title:'A'}];assert.throws(()=>W.validate(data),/duplicate included/);
});
test('a story with only a scene is retained on the story shelf',()=>{const p=W.project('Untitled story');p.shelfPlaceholder=true;W.normalize(p);assert.equal(W.shelfEmpty(p),true);p.scenes.push(W.scene('A scene before the outline'));assert.equal(W.shelfEmpty(p),false);});
test('collapsed thread beats follow explicit development links, not unrelated nested threads',()=>{
 const {p,n}=fixture(),nested=W.node('E',n.id),inner=W.node('B',nested.id),linked=W.node('B',nested.id),outside=W.node('B');linked.miceLinks=[{miceId:n.id,edge:'advance'}];outside.miceLinks=[{miceId:n.id,edge:'advance'}];p.nodes.push(nested,inner,linked,outside);W.normalize(p);
 assert.deepEqual(new Set(W.developingBeats(p,n.id).map(x=>x.id)),new Set([p.nodes[1].id,linked.id,outside.id]));assert.deepEqual(W.developingBeats(p,nested.id).map(x=>x.id),[inner.id]);
});
