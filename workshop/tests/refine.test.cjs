const test=require('node:test'),assert=require('node:assert/strict');
const W=require('../src/integration.js'),fixture=require('../browser-tests/ui-fixture.cjs');
function data(){const d=fixture(),n=d.projects[0].nodes[0];n.closingProse='The pearl falls into the sea.';n.closingWritingStatus='done';n.closingCraft={cast:['ui-other'],worldIds:[],goal:'Escape',povId:'ui-other',ensemble:[{id:'ui-other',role:'oppose'}],parent:'ui-node-1',closeSceneId:'ui-node-1',miceLinks:[{miceId:n.id,edge:'close',role:'close'}],refinement:{earned:'The clues prepare this answer.'}};return W.validate(d);}
test('closing writing and refinement survive JSON, archived branches, and manuscript export',()=>{
 const d=data(),p=d.projects[0],n=p.nodes[0],before=W.copy(n),time=W.copy(p.timeline);assert.deepEqual(W.validate(JSON.parse(JSON.stringify(d))).projects[0].nodes[0],before);
 W.reorder(p,'readingSequence',n.id+':close','ui-node-1:open');const md=W.markdown(p);assert.match(md,/Closing\n\nThe pearl falls into the sea/);assert.match(md,/The clues prepare this answer/);assert.deepEqual(p.timeline,time);
 W.archiveNode(p,n.id);W.validate(d);assert.equal(W.allNodes(p).find(x=>x.id===n.id).closingProse,before.closingProse);
});
test('rekey and purge keep closing references valid',()=>{
 const d=data(),p=d.projects[0];W.rekeyEntity(p,'character','ui-other','new-person');W.rekeyEntity(p,'node','ui-node-1','new-beat');W.validate(d);let c=p.nodes[0].closingCraft;assert.deepEqual(c.cast,['new-person']);assert.equal(c.povId,'new-person');assert.equal(c.parent,'new-beat');assert.equal(c.closeSceneId,'new-beat');
 W.archiveNode(p,'new-beat');W.purgeArchive(p,p.archive.map(x=>x.id));W.validate(d);c=p.nodes[0].closingCraft;assert.equal(c.parent,'');assert.equal(c.closeSceneId,'');
});
test('closing prose and refinement reject malformed backup values',()=>{
 for(const edit of [n=>n.closingProse={},n=>n.closingCraft.refinement={earned:[]},n=>n.closingCraft.parent='missing',n=>n.closingCraft.cast=['missing']]){const d=data();edit(d.projects[0].nodes[0]);assert.throws(()=>W.validate(d));}
});
test('removing a frame keeps closing prose and craft as an editable beat at the same manuscript moment',()=>{
 const d=data(),p=d.projects[0],time=W.copy(p.timeline),key='ui-node-0:close',position=p.readingSequence.indexOf(key),mid=p.timeline.find(e=>e.key===key).id;
 W.removeFrame(p,'ui-node-0');W.validate(d);const closing=p.nodes.find(n=>n.prose==='The pearl falls into the sea.');assert.ok(closing);assert.equal(closing.type,'B');assert.equal(closing.refinement.earned,'The clues prepare this answer.');assert.equal(p.readingSequence[position],closing.id+':open');assert.deepEqual(p.timeline.map(e=>e.id),time.map(e=>e.id));assert.equal(p.timeline.find(e=>e.id===mid).nodeId,closing.id);assert.match(W.markdown(p),/The pearl falls into the sea/);
});
