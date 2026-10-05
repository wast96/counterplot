'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const W=require('../src/core.js'),D=require('../tutorial/definition.js');
const d=JSON.parse(fs.readFileSync(path.join(__dirname,'../tutorial/MGS3 — Tutorial definition.json'),'utf8'));
const wrap=p=>({format:'counterplot-workshop',schema:1,active:p.id,projects:[p],swatches:W.copy(d.starter.swatches||[])});
test('MGS3 defaults demonstrate text automatically but never auto-advance',()=>{
 for(const l of d.lessons)for(const g of l.goals){const p=D.presentation(d,l,g);assert.equal(p.sample.mode,'type');assert.equal(p.sample.trigger,'ready');assert.equal(p.advance.mode,'manual');assert.equal(p.sample.delay,600);assert.equal(p.sample.charactersPerSecond,32);}
});
test('Explicit saved author speed/click trigger still overrides new built-in defaults',()=>{
 const authored=W.copy(d);authored.presentation.sample.trigger='click';const patched=D.apply(d,D.diff(d,authored));assert.equal(patched.presentation.sample.trigger,'click');
 // Test with the normal field inheritance independently of patch representation.
 const goal=W.copy(d.lessons[0].goals[0]);goal.presentation={sample:{mode:'instant',trigger:'click',charactersPerSecond:11}};
 const p=D.presentation(d,d.lessons[0],goal);assert.equal(p.sample.trigger,'click');assert.equal(p.sample.mode,'instant');assert.equal(p.sample.charactersPerSecond,11);
});
test('Rekey archived root keeps descendants and timed history independently restorable',()=>{
 const p=W.copy(d.sample);const a=W.archiveNode(p,'loyalty');assert(a);
 const times=a.changes.filter(x=>x.change.at.startsWith('loyalty:')).length;
 assert(W.rekeyEntity(p,'node','loyalty','old-loyalty'));
 assert.equal(a.nodes[0].id,'old-loyalty');assert(!a.nodes.some(n=>n.parentId==='loyalty'));
 assert.equal(a.changes.filter(x=>x.change.at.startsWith('old-loyalty:')).length,times);
 const replacement=W.node('C');replacement.id='loyalty';replacement.title='New attempt';p.nodes.push(replacement);
 W.validate(wrap(p));W.restore(p,a.id);W.validate(wrap(p));
 assert(p.nodes.some(n=>n.id==='old-loyalty'));assert(p.nodes.some(n=>n.id==='loyalty'&&n.title==='New attempt'));
});
test('Rekey updates saved parent and previous-sibling restore anchors',()=>{
 const p=W.project('Test'),root=W.node('C'),a=W.node('E',root.id),b=W.node('M',root.id);p.nodes=[root,a,b];
 const archived=W.archiveNode(p,b.id);W.rekeyEntity(p,'node',root.id,'new-root');W.rekeyEntity(p,'node',a.id,'new-first');
 assert.equal(archived.parentId,'new-root');assert.equal(archived.previousId,'new-first');W.restore(p,archived.id);W.validate(wrap(p));assert.equal(p.nodes.find(n=>n.id===b.id).parentId,'new-root');
});
test('Rekey archived character keeps cast, connection endpoints and change ownership',()=>{
 const p=W.copy(d.sample),c=p.characters[0],id=c.id;
 p.characters=p.characters.filter(x=>x!==c);p.archive.push({id:'archive-person',kind:'character',item:c,title:c.name,created:new Date().toISOString()});
 W.rekeyEntity(p,'character',id,'old-person');assert.equal(c.id,'old-person');assert(!p.nodes.some(n=>n.cast.includes(id)));assert(!p.connections.some(x=>x.a===id||x.b===id));
 W.validate(wrap(p));W.restore(p,'archive-person');W.validate(wrap(p));
});
test('World rekey preserves optional Milieu links across live and archived pieces',()=>{
 const p=W.copy(d.sample),world=p.world[0],n=p.nodes[0];n.worldIds=[world.id];
 const oldId=world.id;W.rekeyEntity(p,'world',oldId,'older-world');assert.equal(n.worldIds[0],'older-world');assert.equal(world.id,'older-world');W.validate(wrap(p));
});
test('Block rekey keeps the timed replacement block identity',()=>{
 const p=W.copy(d.sample),c=p.characters.find(x=>x.blocks.length),b=c.blocks[0],old=b.id;
 W.rekeyEntity(p,'block',old,'older-block',c.id);assert.equal(b.id,'older-block');
 for(const change of c.changes){assert.notEqual(change.blockId,old);if(change.block)assert.notEqual(change.block.id,old);}W.validate(wrap(p));
});
test('Rekey rejects collisions before changing any entity or relationship',()=>{
 const p=W.copy(d.sample),before=W.copy(p);assert.throws(()=>W.rekeyEntity(p,'node',p.nodes[0].id,p.nodes[1].id),/already in use/);assert.deepEqual(p,before);assert.equal(W.rekeyEntity(p,'node','missing','unused'),false);assert.deepEqual(p,before);
});
test('Editor source contains no zoom/device selectors or transform scaling',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../tutorial/studio.js'),'utf8');assert(!s.includes('data-studio-zoom'));assert(!s.includes('data-studio-device'));assert(!s.includes('scale(${scale})'));assert(s.includes("studio.scale=1"));
});
