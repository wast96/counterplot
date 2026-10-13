const test=require('node:test'),assert=require('node:assert/strict'),W=require('../src/integration.js');
function fixture(){
 const p=W.project('Interleaved threads'),c=W.character('Liu Jun'),b=W.block('status','Safe');c.id='jun';b.id='status';c.blocks=[b];p.characters=[c];
 const nodes=[['C','character',''],['I','mystery','character'],['E','event','mystery'],['B','beat','event']].map(([type,id,parent])=>({...W.node(type,parent),id,title:id,cast:['jun']}));p.nodes=nodes;W.normalize(p);
 c.changes.push({id:'hunted',at:'beat:open',momentId:W.momentId(p,'beat:open'),blockId:'status',op:'develop',block:{...b,text:'Hunted by Palmerston’s Thralls'},reason:''});
 W.setPieceTitle(p,nodes[0],'A dangerous allegiance');
 return {p,c,nodes,data:{format:'counterplot-workshop',schema:2,active:p.id,projects:[p]}};
}
test('forks added after an arc was configured appear in all containing MICE threads',()=>{
 const {p,c,nodes,data}=fixture(),baseline=JSON.stringify(c.blocks),oldArc=JSON.stringify(nodes[0].characterArc);
 const fork=W.setPieceState(p,nodes[3],'block:jun:status','open','Wanted by the law',{fork:true});W.validate(data);
 assert.equal(JSON.stringify(nodes[0].characterArc),oldArc);assert.equal(JSON.stringify(c.blocks),baseline);
 assert.ok(W.recordedThreadStates(p,nodes[0],'close').some(x=>x.value==='Wanted by the law'));
 for(const n of nodes.slice(1,3))assert.deepEqual(W.recordedThreadStates(p,n,'close').map(x=>x.value),['Hunted by Palmerston’s Thralls','Wanted by the law']);
 assert.ok(!W.recordedThreadStates(p,nodes[0],'open').some(x=>x.value==='Wanted by the law'));
 assert.equal(W.pieceChanges(p,nodes[3]).find(x=>x.id.endsWith(fork)).from,'Safe');
 W.setPieceState(p,nodes[2],'block:jun:'+fork,'close','Cleared of the charges');W.validate(data);
 assert.equal(W.stateAt(p,c,'beat:open').find(b=>b.id===fork).text,'Wanted by the law');
 assert.equal(W.recordedThreadStates(p,nodes[0],'close').find(x=>x.id.endsWith(fork)).value,'Cleared of the charges');
 const restored=W.validate(JSON.parse(JSON.stringify(data)));assert.ok(W.recordedThreadStates(restored.projects[0],restored.projects[0].nodes[0],'close').some(x=>x.value==='Cleared of the charges'));
});
test('an inferred fork shares one starting state while exposing both outcomes',()=>{
 const {p,nodes,data}=fixture();W.setPieceState(p,nodes[3],'block:jun:status','open','Wanted by the law',{fork:true});delete nodes[0].characterArc;
 const arc=W.characterArc(p,nodes[0]);assert.equal(arc.changes.length,1);assert.equal(arc.changes[0].from.text,'Safe');assert.equal(arc.changes[0].outcomes[0].text,'Wanted by the law');W.validate(data);
});
test('thread planning fields keep titles and prose, allow blanks and multiple endings, and survive type changes',()=>{
 const {p,nodes,data}=fixture(),n=nodes[1];n.opening='Existing planning prose';
 for(const type of ['M','I','E']){n.type=type;W.setThreadPlan(n,'focus',type+' focus');W.setThreadPlan(n,'from','');W.setThreadPlan(n,'to',type+' resolution');const id=W.addThreadOutcome(n);W.setThreadPlan(n,'to','A parallel outcome',id);W.validate(data);}
 n.type='I';assert.equal(W.threadPlan(n).focus,'I focus');assert.equal(W.threadPlan(n).outcomes[0].text,'A parallel outcome');assert.equal(n.title,'mystery');assert.equal(n.opening,'Existing planning prose');
 assert.match(W.markdown(p),/Question: I focus/);W.removeThreadOutcome(n,W.threadPlan(n).outcomes[0].id);assert.equal(W.threadPlan(n).outcomes.length,0);
 const bad=W.copy(data);bad.projects[0].nodes[1].threadPlans.I.from=[];assert.throws(()=>W.validate(bad),/Thread fields|thread fields/);
});
test('a beat advances outer threads without closing or moving inner threads',()=>{
 const {p,nodes,data}=fixture(),before=JSON.stringify(p.timeline);W.setAdvancedThreads(p,nodes[3],['character','mystery']);const ctx=W.openThreadContext(p,nodes[3]);
 assert.equal(nodes[3].parentId,'event');assert.equal(ctx.owner.id,'character');assert.deepEqual(ctx.stillOpen.map(n=>n.id),['mystery','event']);assert.equal(JSON.stringify(p.timeline),before);
 assert.deepEqual(W.outlineEvents(p).map(e=>e.key),['character:open','mystery:open','event:open','beat:open','event:close','mystery:close','character:close']);
 W.validate(data);assert.throws(()=>W.setAdvancedThreads(p,nodes[3],['beat']),/existing threads/);assert.throws(()=>W.setAdvancedThreads(p,nodes[3],['missing']),/existing threads/);
});
test('moving a beat deeper into its larger thread keeps that thread without retiming history',()=>{
 for(const where of ['inside','before','after']){
  const {p,nodes,data}=fixture(),beat=nodes[3];beat.parentId='character';const inner={...W.node('B','event'),id:'inner'};p.nodes.push(inner);W.normalize(p);
  const timeline=JSON.stringify(p.timeline),history=JSON.stringify(p.characters),anchor=where==='inside'?'event':'inner';
  assert.equal(W.retainedBeatThread(p,beat.id,anchor,where).id,'character');W.move(p,beat.id,anchor,where);W.validate(data);
  assert.equal(beat.parentId,'event');assert.deepEqual(beat.miceLinks,[{miceId:'character',edge:'advance',role:'advance'}]);assert.equal(W.openThreadContext(p,beat).owner.id,'character');assert.equal(JSON.stringify(p.timeline),timeline);assert.equal(JSON.stringify(p.characters),history);
  W.move(p,beat.id,'event','inside');assert.equal(beat.miceLinks.length,1);
 }
});
test('beat moves preserve chosen links, reject invalid placements atomically, and leave unrelated moves ordinary',()=>{
 const {p,nodes}=fixture(),beat=nodes[3];beat.parentId='character';W.setAdvancedThreads(p,beat,['character','mystery']);const links=JSON.stringify(beat.miceLinks);W.move(p,beat.id,'event','inside');assert.equal(JSON.stringify(beat.miceLinks),links);
 const before=JSON.stringify(p);assert.throws(()=>W.move(p,beat.id,beat.id,'inside'));assert.equal(JSON.stringify(p),before);
 delete beat.miceLinks;beat.parentId='character';const other={...W.node('M'),id:'other'};p.nodes.push(other);W.move(p,beat.id,other.id,'inside');assert.equal(beat.parentId,'other');assert.equal(beat.miceLinks,undefined);
});
test('a parallel status that existed before a later thread is still visible beside its tracked source',()=>{
 const {p,nodes,data}=fixture(),fork=W.setPieceState(p,nodes[3],'block:jun:status','open','Wanted by the law',{fork:true});
 const later={...W.node('C'),id:'later',cast:['jun'],title:'A later arc'};p.nodes.push(later);W.normalize(p);W.setArcCharacter(p,later,'jun');W.setArcState(p,later,'from',{blockId:'status',value:'Communist agent'});W.setArcState(p,later,'to',{blockId:'status',value:'Independent agent'});
 for(const edge of ['open','close'])assert.ok(W.recordedThreadStates(p,later,edge).some(x=>x.id==='block:jun:'+fork&&x.value==='Wanted by the law'));W.validate(data);
});
test('group forks, World changes and connection changes preserve their baselines and other fields',()=>{
 const {p,nodes,data}=fixture(),g={id:'group',name:'The resistance',type:'group',notes:'',stateValue:'Hidden',faction:{blocks:[{id:'method',kind:'method',title:'Method',text:'Peaceful',detail:'',context:'any',knownBy:[],links:[]}],changes:[],checkpoints:[]}};p.world.push(g);p.connections=[{id:'tie',a:'jun',b:'group',label:'Strangers',aWant:'Safety',bWant:'Support',notes:'',changes:[]}];
 W.setPieceState(p,nodes[3],'faction:group:method','open','Public protest');W.setPieceState(p,nodes[3],'faction:group:method','open','Underground work',{fork:true});W.setPieceState(p,nodes[2],'world:group','close','Exposed');W.setPieceState(p,nodes[3],'connection:tie:bond','open','Allies');W.validate(data);
 assert.deepEqual(W.factionAt(p,g,'beat:open').map(b=>b.text),['Public protest','Underground work']);assert.equal(g.faction.blocks[0].text,'Peaceful');assert.equal(g.stateValue,'Hidden');assert.equal(W.worldState(p,g,'event:close').value,'Exposed');assert.equal(W.connectionState(p,p.connections[0],'beat:open').aWant,'Safety');assert.equal(p.connections[0].label,'Strangers');
 assert.ok(W.recordedThreadStates(p,nodes[1],'close').some(x=>x.value==='Underground work'));assert.ok(W.recordedThreadStates(p,nodes[1],'close').some(x=>x.value==='Allies'));
});
test('copied characters and thread variations retain their own fork and thread links',()=>{
 const {p,c,nodes,data}=fixture();W.setPieceState(p,nodes[3],'block:jun:status','open','Wanted by the law',{fork:true});const clone=W.duplicateCharacter(p,c.id),fork=clone.changes.find(x=>x.block.forkedFrom);
 assert.equal(fork.block.forkedFrom,clone.blocks[0].id);assert.notEqual(fork.block.forkedFrom,'status');W.setAdvancedThreads(p,nodes[3],['character','mystery']);
 const root=W.duplicateNode(p,'character'),copied=W.ordered(p).map(x=>x.node).filter(n=>W.descendants(p,root.id).has(n.id)),beat=copied.find(n=>n.type==='B'),mystery=copied.find(n=>n.type==='I');
 assert.deepEqual(beat.miceLinks.map(x=>x.miceId),[root.id,mystery.id]);assert.equal(W.openThreadContext(p,beat).owner.id,root.id);W.validate(data);
});
test('older saved fork outcomes remain visible in later arcs without a lineage field',()=>{
 const {p,nodes,data}=fixture();W.setArcCharacter(p,nodes[0],'jun');W.setArcState(p,nodes[0],'from',{blockId:'status',value:'Safe'});W.setArcState(p,nodes[0],'to',{blockId:'status',value:'Hunted'});
 const row=W.characterArc(p,nodes[0]).changes[0],outcome=W.addArcOutcome(p,nodes[0],row.id);W.setArcState(p,nodes[0],'to',{rowId:row.id,outcomeId:outcome,blockId:'new',kind:'status',value:'Wanted'});
 for(const record of p.characters[0].changes)delete record.block?.forkedFrom;
 const later={...W.node('C'),id:'later',cast:['jun']};p.nodes.push(later);W.normalize(p);W.setArcCharacter(p,later,'jun');W.setArcState(p,later,'from',{blockId:'status',value:'Hunted'});W.setArcState(p,later,'to',{blockId:'status',value:'Free'});
 for(const edge of ['open','close'])assert.ok(W.recordedThreadStates(p,later,edge).some(x=>x.value==='Wanted'));W.validate(data);
});
