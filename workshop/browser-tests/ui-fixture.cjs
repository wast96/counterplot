const W=require('../src/integration.js');
module.exports=function uiFixture({stress=false}={}){
 const p=W.project(stress?'A long story title about a mysterious object and the people who want it':'UI review story');
 const c=W.character(stress?'Alexandra of the unusually long family name':'Liu Jun');c.id='ui-person';c.identity='A witness who follows the clues.';c.prominence={opening:'Main cast',changes:[],checkpoints:[]};const other=W.character('Ocelot');other.id='ui-other';p.characters=[c,other];
 p.world=[{id:'ui-pearl',type:'object',name:'the blood pearl',notes:'A small object that connects the scenes.'},{id:'ui-long-world',type:'place',name:stress?'AnExtremelyLongUnbrokenWorldEntryName'.repeat(3):'The harbor',notes:''}];
 p.plots=[{id:'ui-plot',label:'A',title:'The investigation',notes:''}];
 let parent='';for(let i=0;i<(stress?8:2);i++){const n=W.node(i===7||(!stress&&i===1)?'B':'E',parent);n.id='ui-node-'+i;n.title=stress?'A long scene title: following the evidence through the city — '+i:'Discovery of the body and pearl';n.opening='A clue changes what the witness knows.';n.closing='The scene leaves a new question.';n.cast=[c.id];n.worldIds=['ui-pearl','ui-long-world'];n.plotIds=['ui-plot'];n.prose='A paragraph of story prose.';p.nodes.push(n);parent=n.id;}
 W.normalize(p);const event=p.timeline.find(e=>e.nodeId==='ui-node-0'&&e.edge==='close');c.lifeChanges=[{id:'ui-death',momentId:event.id,status:'dead',reason:'The story changes here.'}];
 return W.validate({format:'counterplot-workshop',schema:2,active:p.id,projects:[p]});
};
