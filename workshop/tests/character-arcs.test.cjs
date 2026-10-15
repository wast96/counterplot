const test=require('node:test'),assert=require('node:assert/strict');
const W=require('../src/integration.js');
function fixture(){
 const p=W.project(),n=W.node('C'),c=W.character('Liu Jun'),other=W.character('Cao Jian'),b=W.block('status'),a=W.block('allegiance');b.text='Innocent civilian';a.text='Neutral';c.blocks=[b,a];n.cast=[c.id];n.title='From Innocent civilian to Communist agent';p.nodes=[n];p.characters=[c,other];W.normalize(p);
 c.changes=[{id:'status-change',at:n.id+':close',momentId:W.momentId(p,n.id+':close'),blockId:b.id,op:'develop',block:{...b,text:'Communist agent'},reason:''},{id:'allegiance-change',at:n.id+':close',momentId:W.momentId(p,n.id+':close'),blockId:a.id,op:'develop',block:{...a,text:'Communist'},reason:''}];
 const data={format:'counterplot-workshop',schema:2,active:p.id,projects:[p]};W.validate(data);return {data,p,n,c,other,b};
}
test('the existing From/to title selects the right change without rewriting historical data',()=>{
 const {p,n,c,b}=fixture(),before=JSON.stringify(p),arc=W.characterArc(p,n);
 assert.equal(arc.subjectId,c.id);assert.equal(arc.changes.length,2);assert.equal(arc.changes[1].kind,'allegiance');assert.equal(arc.changes[1].from.text,'Neutral');assert.equal(arc.changes[1].to.text,'Communist');assert.equal(arc.changes[0].from.blockId,b.id);assert.equal(arc.changes[0].from.text,'Innocent civilian');assert.equal(arc.changes[0].to.text,'Communist agent');assert.equal(JSON.stringify(p),before);
 assert.equal(W.pieceTitle(p,n),'Liu Jun · Innocent civilian → Communist agent · Neutral → Communist');
});
test('editing linked endpoints records independent opening and closing states and keeps the baseline',()=>{
 const {data,p,n,c,b}=fixture();W.setArcState(p,n,'from',{value:'Disillusioned civilian',blockId:b.id});W.setArcState(p,n,'to',{value:'Double agent',blockId:b.id});W.validate(data);
 assert.equal(c.blocks[0].text,'Innocent civilian');assert.equal(W.stateAt(p,c,n.id+':open').find(x=>x.id===b.id).text,'Disillusioned civilian');assert.equal(W.stateAt(p,c,n.id+':close').find(x=>x.id===b.id).text,'Double agent');assert.equal(c.changes.length,3);
 c.changes.find(x=>x.id==='status-change').block.text='Independent agent';assert.equal(W.characterArc(p,n).changes[0].to.text,'Independent agent');
 W.validate(data);assert.match(n.title,/Independent agent/);assert.match(W.markdown(p),/Liu Jun · Disillusioned civilian → Independent agent/);
 const restored=W.validate(JSON.parse(JSON.stringify(data)));assert.equal(W.characterArc(restored.projects[0],restored.projects[0].nodes[0]).changes[0].to.text,'Independent agent');
});
test('reusing a current state links it without adding history, while restoring an older state is a real change',()=>{
 const {data,p,n,c,b}=fixture(),original=W.copy(c.changes);
 W.setArcState(p,n,'from',{blockId:b.id,value:b.text});assert.deepEqual(c.changes,original);assert.equal(W.characterArc(p,n).changes[0].from.linked,true);
 W.setArcState(p,n,'from',{blockId:b.id,value:'A fugitive'});assert.equal(c.changes.length,3);
 W.setArcState(p,n,'from',{blockId:b.id,value:b.text});assert.deepEqual(c.changes,original);
 const later=W.node('C');p.nodes.push(later);W.normalize(p);W.setArcCharacter(p,later,c.id);
 W.setArcState(p,later,'from',{blockId:b.id,value:'Communist agent'});assert.equal(c.changes.length,2);
 W.setArcState(p,later,'to',{blockId:b.id,value:'Innocent civilian'});assert.equal(c.changes.length,3);assert.equal(W.stateAt(p,c,later.id+':close').find(x=>x.id===b.id).text,'Innocent civilian');W.validate(data);
});
test('history hides old unchanged records without deleting them or hiding detail changes and same-moment reversals',()=>{
 const {data,p,n,c,b}=fixture();
 const repeated={id:'repeat',at:n.id+':open',blockId:b.id,op:'develop',block:W.copy(b),reason:'Set in character thread'};c.changes.push(repeated);
 const raw=JSON.stringify(c.changes);assert.equal(W.characterHistory(p,c).length,3);assert.equal(W.characterHistory(p,c,{changesOnly:true}).length,2);assert.equal(JSON.stringify(c.changes),raw);
 repeated.block.detail='A new obligation';assert.equal(W.characterHistory(p,c,{changesOnly:true}).length,3);
 repeated.block=W.copy(b);c.changes.splice(2,0,{...repeated,id:'first',block:{...b,text:'A fugitive'}});
 const visible=W.characterHistory(p,c,{changesOnly:true});assert.equal(visible.length,4);assert.equal(visible.find(x=>x.change.id==='repeat').before.text,'A fugitive');
 W.setArcState(p,n,'from',{blockId:b.id,value:b.text});assert.equal(c.changes.length,4);assert.equal(W.stateAt(p,c,n.id+':open').find(x=>x.id===b.id).text,b.text);W.validate(data);
});
test('unchanged faction states are references, and newly appearing or forked blocks remain real additions',()=>{
 const {data,p,n}=fixture(),g={id:'collective',type:'group',name:'Collective',notes:'',faction:{blocks:[],changes:[],checkpoints:[]}};p.world.push(g);W.normalize(p);W.setArcCharacter(p,n,g.id);
 W.setArcState(p,n,'from',{blockId:'new',kind:'want',value:'Survive'});const row=W.characterArc(p,n).changes[0],bid=row.from.blockId;
 W.setArcState(p,n,'to',{blockId:bid,value:'Survive'});assert.equal(g.faction.changes.length,1);assert.equal(W.characterArc(p,n).changes[0].to.linked,true);
 W.setArcState(p,n,'to',{blockId:bid,value:'Take power'});assert.equal(g.faction.changes.length,2);
 W.setArcState(p,n,'to',{blockId:bid,value:'Survive'});assert.equal(g.faction.changes.length,1);
 const outcome=W.addArcOutcome(p,n,row.id);W.setArcState(p,n,'to',{rowId:row.id,outcomeId:outcome,blockId:'new',kind:'want',value:'Survive'});assert.equal(g.faction.changes.length,2);W.validate(data);
});
test('history uses saved selves, including empty checkpoints, before classifying changes',()=>{
 const {data,p,n,c,b}=fixture();c.stateCheckpoints=[{id:'empty-self',at:n.id+':open',blocks:[],lifeStatus:'alive'}];
 c.changes.push({id:'reappears',at:n.id+':open',blockId:b.id,op:'add',block:W.copy(b),reason:''});
 const entry=W.characterHistory(p,c,{changesOnly:true}).find(x=>x.change.id==='reappears');assert.ok(entry);assert.equal(entry.before,undefined);
 c.stateCheckpoints[0].blocks=[W.copy(b)];assert.ok(!W.characterHistory(p,c,{changesOnly:true}).some(x=>x.change.id==='reappears'));
 assert.ok(W.characterHistory(p,c,{changesOnly:true}).some(x=>x.checkpoint));W.validate(data);
});
test('all three title fields may be blank without deleting history or requiring completion',()=>{
 const {data,p,n,c}=fixture(),before=JSON.stringify(c.changes);
 W.setArcState(p,n,'from',{value:''});W.setArcState(p,n,'to',{value:''});assert.equal(JSON.stringify(c.changes),before);
 W.setArcCharacter(p,n,'');W.validate(data);assert.deepEqual([n.characterArc.subjectId,n.characterArc.changes[0].from.text,n.characterArc.changes[0].to.text],['','','']);assert.equal(n.status,'open');
 W.setArcState(p,n,'from',{value:'An unnamed witness'});assert.equal(W.characterArc(p,n).changes[0].from.text,'An unnamed witness');assert.equal(JSON.stringify(c.changes),before);
});
test('new blocks start at the selected endpoint and can develop into another state',()=>{
 const {data,p,n,c}=fixture();W.setArcState(p,n,'from',{value:'Needs approval',blockId:'new',kind:'want'});const bid=n.characterArc.changes[0].from.blockId;
 assert.ok(!c.blocks.some(b=>b.id===bid));assert.equal(c.changes.find(x=>x.blockId===bid).op,'add');
 W.setArcState(p,n,'to',{value:'Trusts her judgment',blockId:bid});assert.equal(c.changes.find(x=>x.blockId===bid&&x.at.endsWith(':close')).op,'develop');W.validate(data);
});
test('changing people, renaming identities, and purging retain valid independent history',()=>{
 const {data,p,n,c,other,b}=fixture();W.setArcState(p,n,'to',{value:'Agent',blockId:b.id});W.rekeyEntity(p,'character',c.id,'jun');W.rekeyEntity(p,'block',b.id,'status-block','jun');W.validate(data);
 assert.equal(n.characterArc.subjectId,'jun');assert.equal(n.characterArc.changes[0].to.blockId,'status-block');
 const before=JSON.stringify(p.characters[0].changes);W.setArcCharacter(p,n,other.id);assert.equal(n.characterArc.changes[0].from.text,'');assert.equal(n.characterArc.changes[0].to.text,'');assert.equal(JSON.stringify(p.characters[0].changes),before);
 W.setArcCharacter(p,n,'jun');W.setArcState(p,n,'to',{value:'Agent',blockId:'status-block'});p.archive.push({id:'archived-jun',kind:'character',title:'Jun',created:new Date().toISOString(),item:W.copy(p.characters.find(c=>c.id==='jun'))});p.characters=p.characters.filter(c=>c.id!=='jun');W.purgeArchive(p,p.archive.map(a=>a.id));W.validate(data);assert.equal(n.characterArc.subjectId,'');assert.equal(n.characterArc.changes[0].to.text,'Agent');
});
test('plain legacy titles remain recoverable and malformed arc backups are rejected',()=>{
 const {data,p,n}=fixture();n.title='Her long road home';const original=n.title;W.setArcState(p,n,'from',{value:'Lost'});assert.equal(n.characterArc.legacyTitle,original);
 n.characterArc.changes[0].to=[];assert.throws(()=>W.validate(data),/Character thread states/);
});

test('each pair is independently editable and removable, and another participant does not become its subject',()=>{
 const {data,p,n,c,other}=fixture();n.cast.push(other.id);const arc=W.characterArc(p,n),allegiance=arc.changes[1];
 W.setArcState(p,n,'to',{rowId:allegiance.id,value:'Independent',blockId:allegiance.to.blockId});
 assert.equal(W.characterArc(p,n).changes[0].to.text,'Communist agent');assert.equal(W.characterArc(p,n).changes[1].to.text,'Independent');
 const newId=W.addArcChange(p,n);W.setArcState(p,n,'from',{rowId:newId,value:'Afraid',kind:'fear'});assert.equal(W.characterArc(p,n).changes.length,3);
 const history=JSON.stringify(c.changes);W.removeArcChange(p,n,allegiance.id);assert.equal(JSON.stringify(c.changes),history);assert.equal(n.characterArc.subjectId,c.id);assert.ok(n.cast.includes(other.id));
 W.validate(data);assert.equal(W.characterArc(p,n).changes.length,2);
});
test('a group can be the arc subject with its own states and participants remain independent',()=>{
 const {data,p,n,c}=fixture(),g={id:'collective',name:'The resistance',type:'group',notes:'',faction:{blocks:[],changes:[],checkpoints:[]}};p.world.push(g);W.normalize(p);
 const history=JSON.stringify(c.changes);W.setArcCharacter(p,n,g.id);W.setArcState(p,n,'from',{value:'Protect the neighborhood',blockId:'new',kind:'want'});const bid=n.characterArc.changes[0].from.blockId;
 W.setArcState(p,n,'to',{value:'Overthrow the regime',blockId:bid});W.validate(data);
 assert.equal(W.factionAt(p,g,n.id+':open')[0].text,'Protect the neighborhood');assert.equal(W.factionAt(p,g,n.id+':close')[0].text,'Overthrow the regime');assert.equal(JSON.stringify(c.changes),history);
 assert.equal(W.characterArc(p,n).subjectId,g.id);W.rekeyEntity(p,'world',g.id,'resistance');W.validate(data);assert.equal(n.characterArc.subjectId,'resistance');
 delete n.characterArc;n.title='From Protect the neighborhood to Overthrow the regime';assert.equal(W.characterArc(p,n).subjectId,'resistance');assert.equal(W.characterArc(p,n).changes.length,1);
});
test('one starting block forks into independent ending blocks without overwriting the first outcome',()=>{
 const {data,p,n,c,b}=fixture(),row=W.characterArc(p,n).changes[0];
 W.setArcState(p,n,'from',{rowId:row.id,value:'Safe',blockId:b.id});W.setArcState(p,n,'to',{rowId:row.id,value:'Hunted by Palmerston’s Thralls',blockId:b.id});
 const outcomeId=W.addArcOutcome(p,n,row.id);W.setArcState(p,n,'to',{rowId:row.id,outcomeId,value:'Wanted by the law',blockId:'new',kind:'status'});W.validate(data);
 const arc=W.characterArc(p,n),end=W.stateAt(p,c,n.id+':close');assert.equal(arc.changes[0].from.text,'Safe');assert.equal(arc.changes[0].outcomes[0].text,'Wanted by the law');assert.ok(end.some(b=>b.text==='Hunted by Palmerston’s Thralls'));assert.ok(end.some(b=>b.text==='Wanted by the law'));assert.equal(c.blocks[0].text,'Innocent civilian');
 assert.throws(()=>W.setArcState(p,n,'to',{rowId:row.id,outcomeId,value:'Accidental overwrite',blockId:b.id}),/own building block/);
 const restored=W.validate(JSON.parse(JSON.stringify(data)));assert.equal(restored.projects[0].nodes[0].characterArc.changes[0].outcomes.length,1);
 const before=JSON.stringify(c.changes);W.removeArcOutcome(p,n,row.id,outcomeId);assert.equal(JSON.stringify(c.changes),before);assert.equal(n.characterArc.changes[0].outcomes.length,0);
});

test('free character thread titles stay independent of linked states, blank fields, and subject changes',()=>{
 const {data,p,n,other,b}=fixture();W.setPieceTitle(p,n,'The making of an agent');W.setArcState(p,n,'to',{value:'Double agent',blockId:b.id});W.validate(data);
 assert.equal(W.pieceTitle(p,n),'The making of an agent');assert.equal(W.editableTitle(p,n),'The making of an agent');assert.equal(W.characterArc(p,n).changes[0].to.text,'Double agent');
 W.setArcCharacter(p,n,other.id);W.validate(data);assert.equal(n.title,'The making of an agent');
 n.type='E';W.setPieceTitle(p,n,'A different path');n.type='C';W.validate(data);assert.equal(W.pieceTitle(p,n),'A different path');
 W.setPieceTitle(p,n,'');W.validate(data);assert.equal(W.editableTitle(p,n),'');assert.equal(W.pieceTitle(p,n),'Untitled character thread');
 const restored=W.validate(JSON.parse(JSON.stringify(data)));assert.equal(restored.projects[0].nodes[0].characterArc.title,'');
});

test('custom labels survive old state snapshots, checkpoints and forks without rewriting history on read',()=>{
 const {data,p,n,c,b}=fixture();b.label='Status';n.characterArc=W.characterArc(p,n);n.characterArc.changes[0].label='';
 const row=n.characterArc.changes[0],fork={...W.block('status'),text:'Wanted by the law'};
 c.changes.push({id:'fork',at:n.id+':close',blockId:fork.id,op:'add',block:fork,reason:''});
 row.outcomes=[{id:'fork-outcome',text:fork.text,blockId:fork.id,linked:true}]; // Older forks have no forkedFrom.
 const before=JSON.stringify(data),end=W.stateAt(p,c,n.id+':close');
 assert.equal(end.find(x=>x.id===b.id).label,'Status');assert.equal(end.find(x=>x.id===fork.id).label,'Status');assert.equal(W.characterArc(p,n).changes[0].label,'Status');
 assert.equal(W.pieceChanges(p,n).find(x=>x.id==='block:'+c.id+':'+b.id).label,'Status');
 assert.equal(JSON.stringify(data),before);
 c.stateCheckpoints=[{id:'checkpoint',at:n.id+':open',blocks:[{...b,label:'',text:'At the checkpoint'}],lifeStatus:'alive'}];
 assert.equal(W.characterState(p,c,n.id+':open').blocks[0].label,'Status');
 const restored=W.validate(JSON.parse(JSON.stringify(data)));assert.equal(W.stateAt(restored.projects[0],restored.projects[0].characters[0],n.id+':close').find(x=>x.id===fork.id).label,'Status');
});
test('renaming and clearing a block label update saved and archived changes while preserving state text',()=>{
 const {p,n,c,b}=fixture();n.characterArc=W.characterArc(p,n);const a=W.archiveNode(p,n.id),texts=a.changes.map(x=>x.change.block.text);
 W.setBlockLabel(p,c.id,b.id,'Standing');assert.equal(a.changes[0].change.block.label,'Standing');assert.equal(W.stateAt(p,c,n.id+':close').find(x=>x.id===b.id).label,'Standing');
 W.restore(p,a.id);assert.equal(W.characterArc(p,n).changes[0].label,'Standing');assert.deepEqual(c.changes.map(x=>x.block.text),texts);
 W.setBlockLabel(p,c.id,b.id,'');assert.equal(W.stateAt(p,c,n.id+':close').find(x=>x.id===b.id).label,'');assert.equal(W.characterArc(p,n).changes[0].label,'');
});
test('new forked outcomes inherit a custom label and independently named forks retain their own label',()=>{
 const {data,p,n,c,b}=fixture();b.label='Status';const row=W.characterArc(p,n).changes[0];
 W.setArcState(p,n,'to',{rowId:row.id,value:'Hunted',blockId:b.id});
 const outcomeId=W.addArcOutcome(p,n,row.id);W.setArcState(p,n,'to',{rowId:row.id,outcomeId,value:'Wanted',blockId:'new',kind:'status'});
 const outcome=W.characterArc(p,n).changes[0].outcomes[0],fork=c.changes.find(x=>x.blockId===outcome.blockId).block;assert.equal(fork.label,'Status');
 W.setBlockLabel(p,c.id,fork.id,'Legal standing');W.setBlockLabel(p,c.id,b.id,'Social standing');
 assert.equal(W.stateAt(p,c,n.id+':close').find(x=>x.id===fork.id).label,'Legal standing');assert.equal(W.characterArc(p,n).changes[0].label,'Social standing');W.validate(data);
});

test('arc custom labels apply across linked states, later edits, inherited forks and restored backups',()=>{
 const {data,p,n,c,b}=fixture();const row=W.characterArc(p,n).changes[0];
 W.setArcState(p,n,'from',{rowId:row.id,value:'Innocent civilian',blockId:b.id,kind:'status',label:'Legal standing'});
 W.setArcState(p,n,'to',{rowId:row.id,value:'Wanted criminal',blockId:b.id});
 const outcomeId=W.addArcOutcome(p,n,row.id);W.setArcState(p,n,'to',{rowId:row.id,outcomeId,value:'Hunted',blockId:'new',kind:'status'});
 const restored=W.validate(JSON.parse(JSON.stringify(data))),rp=restored.projects[0],arc=W.characterArc(rp,rp.nodes[0]);
 assert.equal(arc.changes[0].label,'Legal standing');assert.equal(arc.changes[0].outcomes[0].text,'Hunted');
 assert.ok(W.stateAt(rp,rp.characters[0],n.id+':close').filter(x=>x.kind==='status').every(x=>x.label==='Legal standing'));
 assert.equal(c.blocks[0].text,'Innocent civilian');assert.equal(c.blocks[1].label,'');
});
test('custom type wording stays with blank states, new recorded blocks and groups',()=>{
 const {data,p,n}=fixture();const id=W.addArcChange(p,n);W.setArcState(p,n,'from',{rowId:id,value:'',kind:'custom',label:'Trust in authority'});
 W.setArcState(p,n,'from',{rowId:id,value:'Unquestioning',blockId:'new',kind:'custom'});assert.equal(W.characterArc(p,n).changes.at(-1).label,'Trust in authority');
 const g={id:'group',name:'Collective',type:'group',notes:'',faction:{blocks:[],changes:[],checkpoints:[]}};p.world.push(g);W.normalize(p);W.setArcCharacter(p,n,g.id);
 W.setArcState(p,n,'from',{value:'Local',blockId:'new',kind:'custom',label:'Reach'});const blockId=n.characterArc.changes[0].from.blockId;
 W.setArcState(p,n,'to',{value:'National',blockId});W.validate(data);assert.equal(W.characterArc(p,n).changes[0].label,'Reach');assert.ok(W.factionAt(p,g,n.id+':close').every(b=>b.title==='Reach'));
});
