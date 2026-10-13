const test=require('node:test'),assert=require('node:assert/strict'),W=require('../src/integration.js');
function fixture(){const p=W.project('Order');p.nodes=[{...W.node('E'),id:'outer'},{...W.node('B','outer'),id:'beat'},{...W.node('M','outer'),id:'inner'}];W.normalize(p);return p;}
test('matching chronology reorders whole event records and preserves standalone, archived and duplicate anchors',()=>{
 const p=fixture();const archived={...W.node('B'),id:'old'};p.nodes.push(archived);W.normalize(p);W.archiveNode(p,'old');
 p.timeline.reverse();p.timeline.splice(2,0,{id:'memory',key:'memory:moment',nodeId:'',edge:'open',title:'A real memory'});
 p.timeline.splice(4,0,{id:'duplicate',key:'duplicate:moment',nodeId:'outer',edge:'open',title:'Old duplicate'});
 p.timeline.forEach((e,i)=>{e.storyDate='1930-01-'+String(i+1).padStart(2,'0');});
 const before=W.copy(p),active=new Set(W.outlineEvents(p).map(e=>e.key));W.matchOutlineOrder(p,'timeline');
 assert.deepEqual(p.timeline.filter(e=>active.has(e.key)).map(e=>e.key),W.outlineEvents(p).map(e=>e.key));
 for(const key of ['memory:moment','old:open','duplicate:moment'])assert.deepEqual(p.timeline[before.timeline.findIndex(e=>e.key===key)],before.timeline.find(e=>e.key===key));
 assert.deepEqual([...p.timeline].sort((a,b)=>a.id.localeCompare(b.id)),[...before.timeline].sort((a,b)=>a.id.localeCompare(b.id)));
 assert.deepEqual(p.readingSequence,before.readingSequence);assert.deepEqual(p.nodes,before.nodes);W.validate({format:'counterplot-workshop',schema:2,active:p.id,projects:[p]});
});
test('matching Sequence includes nested closings, updates readingOrder and leaves chronology intact',()=>{
 const p=fixture();p.readingSequence.reverse();p.readingOrder=p.readingSequence.filter(k=>k.endsWith(':open')).map(k=>k.slice(0,-5));const before=W.copy(p.timeline);
 W.matchOutlineOrder(p,'readingSequence');assert.deepEqual(p.readingSequence,['outer:open','beat:open','inner:open','inner:close','outer:close']);assert.deepEqual(p.readingOrder,['outer','beat','inner']);assert.deepEqual(p.timeline,before);
 const once=W.copy(p);W.matchOutlineOrder(p,'readingSequence');assert.deepEqual(p,once);assert.throws(()=>W.matchOutlineOrder(p,'characters'));
});
test('scene boards reject malformed cards and preserve multiline content on both edges',()=>{
 const p=fixture(),workspace={format:'counterplot-workshop',schema:2,active:p.id,projects:[p]};p.nodes[0].beats=['line one\nline two'];p.nodes[0].closingCraft={cast:[],worldIds:[],entry:'begin',exit:'end',beats:['Closing card']};W.validate(workspace);
 for(const invalid of [42,{},[{}]]){const data=W.copy(workspace);data.projects[0].nodes[0].beats=invalid;assert.throws(()=>W.validate(data));}
});
test('custom story fields round trip and malformed settings are rejected',()=>{
 const p=fixture(),workspace={format:'counterplot-workshop',schema:2,active:p.id,projects:[p]};p.nodes[0].storyFields={'E:open':{hidden:['from'],custom:[{id:'clue',label:'Clue',text:'The missing ledger'}]},'E:close':{hidden:[],custom:[]}};
 assert.deepEqual(W.validate(JSON.parse(JSON.stringify(workspace))).projects[0].nodes[0].storyFields,p.nodes[0].storyFields);assert.match(W.markdown(p),/Clue.*The missing ledger/);
 for(const invalid of [null,[],{'E:open':{}},{'E:open':{hidden:[],custom:[{id:'x',label:'',text:''}]}},{'E:open':{hidden:['bad'],custom:[]}}]){const copy=W.copy(workspace);copy.projects[0].nodes[0].storyFields=invalid;assert.throws(()=>W.validate(copy));}
});
