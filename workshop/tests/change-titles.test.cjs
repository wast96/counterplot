const test=require('node:test'),assert=require('node:assert/strict');
const W=require('../src/integration.js');
function fixture(){
 const p=W.project(),thread=W.node('C'),step=W.node('B',thread.id),step2=W.node('B',thread.id),other=W.node('B');
 p.nodes=[thread,step,step2,other];
 const c=W.character('Jun'),b=W.block('belief');b.text='distrust';c.blocks=[b];p.characters=[c,W.character('Guiying')];
 p.world=[{id:'harbor',name:'Harbor',type:'place',notes:'',stateValue:'open'}];
 p.connections=[{id:'bond',a:c.id,b:p.characters[1].id,label:'strangers',notes:''}];W.normalize(p);
 const change=(n,text)=>W.consequences(p,n.id+':'+(n===thread?'close':'open'),[{kind:'block',targetId:c.id,value:{reason:'',blockId:b.id,op:'develop',block:{...b,text}}}]);
 change(step,'curiosity');change(step2,'conditional trust');change(thread,'trust');
 return {p,thread:p.nodes[0],step:p.nodes[1],step2:p.nodes[2],other:p.nodes[3],c:p.characters[0],b};
}
test('beats describe successive local phases while all MICE threads describe the whole shift',()=>{
 const {p,thread,step,step2}=fixture();
 assert.deepEqual(W.pieceChanges(p,step).map(x=>[x.from,x.to]),[['distrust','curiosity']]);
 assert.deepEqual(W.pieceChanges(p,step2).map(x=>[x.from,x.to]),[['curiosity','conditional trust']]);
 for(const type of ['M','I','C','E']){thread.type=type;assert.deepEqual(W.pieceChanges(p,thread).map(x=>[x.from,x.to]),[['distrust','trust']]);}
 assert.deepEqual(W.pieceChanges(p,thread,{edge:'close'}).map(x=>[x.from,x.to]),[['conditional trust','trust']]);
 p.readingSequence.reverse();p.readingOrder.reverse();assert.equal(W.pieceChanges(p,thread)[0].from,'distrust');
});
test('world and connection changes can name a beat and its enclosing thread',()=>{
 const {p,thread,step,other}=fixture();
 W.consequences(p,step.id+':open',[{kind:'world',targetId:'harbor',value:{value:'blockaded'}},{kind:'connection',targetId:'bond',value:{bond:'uneasy allies'}}]);
 for(const n of [step,thread]){const changes=W.pieceChanges(p,n);assert.ok(changes.some(x=>x.kind==='world'&&x.from==='open'&&x.to==='blockaded'));assert.ok(changes.some(x=>x.kind==='connection'&&x.from==='strangers'&&x.to==='uneasy allies'));}
 assert.deepEqual(W.pieceChanges(p,other),[]);
});
test('reading changes does not mutate story data or rename a piece',()=>{
 const {p,thread}=fixture(),before=JSON.stringify(p);
 assert.equal(W.pieceChanges(p,thread)[0].to,'trust');assert.equal(JSON.stringify(p),before);
});
test('gaining, retiring, and unchanged blocks produce honest state descriptions',()=>{
 const {p,other,c}=fixture(),b=W.block('want');b.text='leave the city';
 W.consequences(p,other.id+':open',[{kind:'block',targetId:c.id,value:{reason:'',blockId:b.id,op:'add',block:b}}]);
 assert.deepEqual(W.pieceChanges(p,other).map(x=>[x.from,x.to]),[['Not yet part of them','leave the city']]);
 const later=W.node('B');p.nodes.push(later);W.normalize(p);W.consequences(p,later.id+':open',[{kind:'block',targetId:c.id,value:{reason:'',blockId:b.id,op:'retire'}}]);
 assert.deepEqual(W.pieceChanges(p,later).map(x=>[x.from,x.to]),[['leave the city','Let go']]);
});
test('threads include linked beats but exclude unrelated changes in their time span',()=>{
 const {p,thread,step,other}=fixture();other.miceLinks=[{miceId:thread.id,edge:'advance'}];
 const event=p.timeline.find(x=>x.nodeId===other.id);p.timeline=p.timeline.filter(x=>x!==event);p.timeline.splice(2,0,event);
 W.consequences(p,other.id+':open',[{kind:'world',targetId:'harbor',value:{value:'closed'}}]);
 assert.ok(W.pieceChanges(p,thread).some(x=>x.kind==='world'));
 p.nodes.find(n=>n.id===other.id).miceLinks=[];assert.ok(!W.pieceChanges(p,thread).some(x=>x.kind==='world'));
 assert.ok(!W.pieceChanges(p,step).some(x=>x.kind==='world'));
});
test('a newly inserted beat starts between its thread boundaries without moving existing history',()=>{
 const {p,thread,c,b}=fixture(),prior=p.timeline.map(x=>x.key),step=W.node('B',thread.id);p.nodes.push(step);W.normalize(p);
 const keys=p.timeline.map(x=>x.key);assert.deepEqual(keys.filter(key=>key!==step.id+':open'),prior);
 assert.ok(keys.indexOf(step.id+':open')>keys.indexOf(thread.id+':open'));assert.ok(keys.indexOf(step.id+':open')<keys.indexOf(thread.id+':close'));
 W.consequences(p,step.id+':open',[{kind:'block',targetId:c.id,value:{reason:'',blockId:b.id,op:'develop',block:{...b,text:'almost trust'}}}]);
 assert.deepEqual(W.pieceChanges(p,step).map(x=>[x.from,x.to]),[['conditional trust','almost trust']]);
 assert.deepEqual(W.pieceChanges(p,thread).map(x=>[x.from,x.to]),[['distrust','trust']]);
});
