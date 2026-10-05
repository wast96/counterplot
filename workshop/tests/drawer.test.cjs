const test=require('node:test'),assert=require('node:assert/strict');
const W=require('../src/integration.js'),fixture=require('../browser-tests/ui-fixture.cjs');
test('Drawer preserves a complete branch, independent orders, references and historical states through JSON',()=>{
 const data=fixture(),p=data.projects[0],before=W.copy(p),c=p.characters[0];
 c.blocks=[{id:'drawer-block',kind:'want',label:'',text:'Find the pearl',detail:'',pinned:false}];
 c.changes=[{id:'drawer-change',at:'ui-node-0:close',blockId:'drawer-block',op:'develop',reason:'A discovery',block:{...c.blocks[0],text:'Keep the pearl'}}];
 W.validate(data);const states=W.events(p).map(e=>W.stateAt(p,c,e.key)),originalNodes=W.copy(p.nodes),originalChanges=W.copy(c.changes);
 const a=W.stashNode(p,'ui-node-0');assert.equal(p.nodes.length,0);assert.equal(W.archivedItems(p).length,0);assert.equal(W.drawerEntries(p).length,1);
 assert.deepEqual(p.timeline,before.timeline);assert.deepEqual(p.readingSequence,before.readingSequence);assert.deepEqual(p.readingOrder,before.readingOrder);
 const restored=W.validate(JSON.parse(JSON.stringify(data))).projects[0];assert.equal(W.drawerEntries(restored).length,1);
 assert.deepEqual(W.events(restored).map(e=>W.stateAt(restored,restored.characters[0],e.key)),states);
 W.returnFromDrawer(restored,a.id);W.validate({...data,projects:[restored]});assert.deepEqual(restored.nodes,originalNodes);assert.deepEqual(restored.characters[0].changes,originalChanges);assert.equal(restored.archive.length,0);
});
test('Drawer return can place a branch precisely; rejected destinations leave storage intact',()=>{
 const data=fixture(),p=data.projects[0],a=W.stashNode(p,'ui-node-1'),before=W.copy(p);
 assert.throws(()=>W.returnFromDrawer(p,a.id,'missing','before'),/destination/);assert.deepEqual(p,before);
 assert.throws(()=>W.returnFromDrawer(p,a.id,'ui-node-1','inside'),/itself/);assert.deepEqual(p,before);
 W.returnFromDrawer(p,a.id,'ui-node-0','after');assert.equal(p.nodes.find(n=>n.id==='ui-node-1').parentId,'');W.validate(data);
});
test('Drawer fallback works if its original parent is gone; ordinary Archive deletion is isolated',()=>{
 const data=fixture(),p=data.projects[0],a=W.stashNode(p,'ui-node-1');W.archiveNode(p,'ui-node-0');
 W.purgeArchive(p,W.archivedItems(p).map(a=>a.id));assert.equal(W.drawerEntries(p).length,1);
 W.returnFromDrawer(p,a.id);assert.equal(p.nodes[0].id,'ui-node-1');assert.equal(p.nodes[0].parentId,'');assert.ok(p.nodes[0].prose);W.validate(data);
});
