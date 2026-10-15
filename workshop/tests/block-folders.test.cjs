const test=require('node:test'),assert=require('node:assert/strict'),W=require('../src/integration.js');
function fixture(){const p=W.project(),c=W.character('Mara'),n=W.node('B');p.characters=[c];p.nodes=[n];c.blocks=[W.block('want','Find her family'),W.block('capability','Tailoring')];W.normalize(p);const data={format:'counterplot-workshop',schema:2,active:p.id,projects:[p]};return {p,c,n,data};}
test('folders group, rename and move cards without changing their states or story timing',()=>{
 const {p,c,data}=fixture(),blocks=W.copy(c.blocks),time=W.copy(p.timeline),a=W.setBlockFolder(p,c.id,{label:' Family ',blockIds:[c.blocks[0].id]}),b=W.setBlockFolder(p,c.id,{label:'Skills'});
 assert.equal(c.blockFolders[0].label,'Family');W.moveBlockToFolder(p,c.id,c.blocks[0].id,b);assert.equal(c.blockFolders[0].blockIds.length,0);assert.deepEqual(c.blockFolders[1].blockIds,[c.blocks[0].id]);
 W.setBlockFolder(p,c.id,{id:a,label:'Background',blockIds:c.blocks.map(x=>x.id)});assert.equal(c.blockFolders[1].blockIds.length,0);assert.equal(c.blockFolders[0].blockIds.length,2);
 c.blockFolders[0].collapsed=true;const restored=W.validate(JSON.parse(JSON.stringify(data))).projects[0].characters[0];assert.deepEqual(restored.blockFolders,c.blockFolders);
 W.moveBlockToFolder(p,c.id,c.blocks[0].id);assert.deepEqual(c.blocks,blocks);assert.deepEqual(p.timeline,time);assert.deepEqual(c.changes,[]);W.validate(data);
});
test('folders follow timed cards and survive archive, restore, and permanent deletion',()=>{
 const {p,c,n,data}=fixture(),b=W.block('status','A witness');c.changes.push({id:'later',at:n.id+':open',momentId:W.momentId(p,n.id+':open'),blockId:b.id,op:'add',block:b,reason:''});
 const id=W.setBlockFolder(p,c.id,{label:'Identity',blockIds:[b.id]});assert.ok(!W.stateAt(p,c,'').some(x=>x.id===b.id));assert.ok(W.stateAt(p,c,n.id+':open').some(x=>x.id===b.id));
 const a=W.archiveCharacterBlock(p,c.id,b.id);assert.deepEqual(c.blockFolders[0].blockIds,[b.id]);assert.ok(!W.characterFolderBlocks(p,c).some(x=>x.id===b.id));W.validate(data);W.restore(p,a.id);assert.equal(c.blockFolders[0].id,id);assert.ok(W.characterFolderBlocks(p,c).some(x=>x.id===b.id));
 const again=W.archiveCharacterBlock(p,c.id,b.id);W.purgeArchive(p,[again.id]);assert.deepEqual(c.blockFolders[0].blockIds,[]);W.validate(data);
});
test('copying and rekeying characters preserves independent folder membership',()=>{
 const {p,c,data}=fixture();W.setBlockFolder(p,c.id,{label:'Skills',blockIds:[c.blocks[1].id]});const clone=W.duplicateCharacter(p,c.id);
 assert.notEqual(clone.blockFolders[0].id,c.blockFolders[0].id);assert.deepEqual(clone.blockFolders[0].blockIds,[clone.blocks[1].id]);assert.notEqual(clone.blocks[1].id,c.blocks[1].id);
 const before=c.blocks[1].id;W.rekeyEntity(p,'block',before,'renamed-card',c.id);assert.deepEqual(c.blockFolders[0].blockIds,['renamed-card']);W.validate(data);
});
test('folder validation rejects duplicate membership, foreign cards, and malformed labels',()=>{
 const {p,c,data}=fixture();const folder=W.setBlockFolder(p,c.id,{label:'Family',blockIds:[c.blocks[0].id]});const before=JSON.stringify(c.blockFolders);
 assert.throws(()=>W.setBlockFolder(p,c.id,{label:' ',blockIds:[]}),/Name/);assert.throws(()=>W.moveBlockToFolder(p,c.id,'missing',folder),/belonging/);assert.equal(JSON.stringify(c.blockFolders),before);
 for(const change of [d=>d.blockFolders.push({...d.blockFolders[0],id:'second'}),d=>d.blockFolders[0].blockIds.push('foreign'),d=>d.blockFolders[0].label='x'.repeat(101),d=>d.blockFolders[0].collapsed='yes']){const copy=W.copy(data);change(copy.projects[0].characters[0]);assert.throws(()=>W.validate(copy));}
});
test('retiming a grouped card preserves its folder, while undoing its only appearance removes the stale membership',()=>{
 const {p,c,n,data}=fixture(),bid=c.blocks[0].id;W.setBlockFolder(p,c.id,{label:'Family',blockIds:[bid]});
 W.setCharacterBlockStart(p,c.id,bid,n.id+':open');W.validate(data);assert.deepEqual(c.blockFolders[0].blockIds,[bid]);
 W.setCharacterBlockStart(p,c.id,bid,'');W.validate(data);assert.deepEqual(c.blockFolders[0].blockIds,[bid]);
 W.setCharacterBlockStart(p,c.id,bid,n.id+':open');W.removeCharacterChange(p,c.id,c.changes.find(x=>x.blockId===bid).id);W.validate(data);assert.deepEqual(c.blockFolders[0].blockIds,[]);
});
test('independent folder and character edits merge across devices without affecting story history',()=>{
 const Sync=require('../src/sync-core.js'),{p,c,data}=fixture();W.setBlockFolder(p,c.id,{label:'Family',blockIds:[c.blocks[0].id]});const local=W.copy(data),remote=W.copy(data);
 local.projects[0].characters[0].blockFolders[0].label='Family ties';remote.projects[0].characters[0].identity='A traveller';const merged=Sync.merge(data,local,remote);W.validate(merged.workspace);assert.equal(merged.forks.length,0);const result=merged.workspace.projects[0].characters[0];assert.equal(result.blockFolders[0].label,'Family ties');assert.equal(result.identity,'A traveller');assert.deepEqual(result.changes,[]);
});
