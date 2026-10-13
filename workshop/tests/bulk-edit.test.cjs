const test=require('node:test'),assert=require('node:assert/strict'),W=require('../src/integration.js');
function fixture(){const p=W.project(),a=W.node('C'),b=W.node('B',a.id),other=W.node('E'),c=W.character('Jun'),d=W.character('Cao');p.nodes=[a,b,other];p.characters=[c,d];a.cast=[c.id];p.world=[{id:'harbor',type:'place',name:'Harbor',notes:''},{id:'pearl',type:'object',name:'Pearl',notes:''}];p.plots=[{id:'plot-a',label:'A',title:'Investigation',notes:''}];W.normalize(p);return {p,a,b,other,c,d,data:{format:'counterplot-workshop',schema:2,active:p.id,projects:[p]}};}
test('a bulk edit is additive, deduplicated, and limited to selected pieces, including both thread ends',()=>{
 const {p,a,b,other,c,d,data}=fixture(),before=W.copy(other),history=W.copy(p.timeline);
 assert.equal(W.applyBulk(p,[a.id,b.id,a.id],{cast:[c.id,d.id],worldIds:['harbor','pearl'],plotIds:['plot-a'],povId:d.id,status:'planned'}),2);W.validate(data);
 for(const n of [a,b]){assert.deepEqual(n.cast,[c.id,d.id]);assert.deepEqual(n.worldIds,['harbor','pearl']);assert.deepEqual(n.plotIds,['plot-a']);assert.equal(n.povId,d.id);assert.equal(n.status,'planned');}
 assert.equal(a.characterArc.subjectId,c.id);assert.equal(a.closingCraft.povId,d.id);assert.deepEqual(a.closingCraft.worldIds,['harbor','pearl']);assert.deepEqual(other,before);assert.deepEqual(p.timeline,history);
});
test('selecting only a thread does not modify nested beats; unchanged fields and existing closing notes remain',()=>{
 const {p,a,b,c,d,data}=fixture();a.closingCraft={cast:[],worldIds:[],povId:d.id,goal:'Hold the bridge'};const before=W.copy(b);
 W.applyBulk(p,[a.id],{worldIds:['harbor']});W.validate(data);assert.deepEqual(b,before);assert.equal(a.closingCraft.goal,'Hold the bridge');assert.equal(a.characterArc.subjectId,c.id);assert.equal(a.closingCraft.povId,d.id);
 W.applyBulk(p,[a.id],{povId:''});assert.equal(a.povId,'');assert.equal(a.closingCraft.povId,'');
});
test('stale selections or invalid references reject the entire batch before any edit',()=>{
 const {p,a}=fixture(),before=JSON.stringify(p);for(const args of [[['gone'],{status:'planned'}],[[a.id],{cast:['gone']}],[[a.id],{worldIds:['gone']}],[[a.id],{povId:'gone'}],[[a.id],{status:'wrong'}]]){assert.throws(()=>W.applyBulk(p,...args));assert.equal(JSON.stringify(p),before);}
});
