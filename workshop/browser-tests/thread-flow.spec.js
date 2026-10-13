const {test,expect}=require('@playwright/test'),AxeBuilder=require('@axe-core/playwright').default,W=require('../src/integration.js');
function fixture(){
 const p=W.project('Interleaved threads'),c=W.character('Liu Jun'),b=W.block('status','Safe');c.id='jun';b.id='status';c.blocks=[b];p.characters=[c];p.world=[{id:'harbor',type:'place',name:'The harbor',notes:'',stateLabel:'Access',stateValue:'Open',stateChanges:[]}];
 p.nodes=[['C','character','','Liu Jun’s allegiance'],['I','mystery','character','Who killed Liu Guiying?'],['E','event','mystery','The raid'],['B','beat','event','A target on her back'],['M','milieu','','Into the harbor']].map(([type,id,parentId,title])=>({...W.node(type,parentId),id,title,cast:['jun'],worldIds:['harbor']}));W.normalize(p);
 c.changes=[{id:'agent',at:'character:close',momentId:W.momentId(p,'character:close'),blockId:'status',op:'develop',block:{...b,text:'Communist agent'},reason:''}];W.setPieceTitle(p,p.nodes[0],'Liu Jun’s allegiance');
 c.changes.push({id:'hunted',at:'beat:open',momentId:W.momentId(p,'beat:open'),blockId:'status',op:'develop',block:{...b,text:'Hunted by Palmerston’s Thralls'},reason:''});
 return W.validate({format:'counterplot-workshop',schema:2,active:p.id,projects:[p]});
}
async function load(page,data=fixture()){await page.goto('/');await expect(page.locator('.story-viewbar')).toBeVisible();await page.locator('#import-file').setInputFiles({name:'flow.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await page.locator('[data-action=accept-import]').click();await expect(page.locator('#dialog')).not.toBeVisible();}
const snapshot=page=>page.evaluate(()=>{const d=CounterplotTutorial.snapshot();return d.projects.find(p=>p.id===d.active);});
const card=(page,id)=>page.locator(`[data-node=${id}]`);
function dragFixture(){const data=fixture(),p=data.projects[0];p.nodes.find(n=>n.id==='beat').parentId='character';p.nodes.push({...W.node('B','event'),id:'inner',title:'Inside the event'});W.normalize(p);return data;}
test('dragging a character beat onto a nested closing keeps its larger arc with undo and reload',async({page})=>{
 await load(page,dragFixture());const before=await snapshot(page);
 await page.evaluate(()=>{const source=document.querySelector('[data-drag=node][data-drag-id=beat]'),target=document.querySelector('[data-node=event] > .closing');window.testDragData=new DataTransfer();source.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:testDragData}));target.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:testDragData}));});
 await expect(card(page,'event').locator(':scope > .closing')).toHaveAttribute('data-drop-label','Release before this thread closes · stays with Character thread');
 await page.evaluate(()=>document.querySelector('[data-node=event] > .closing').dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:testDragData})));
 const after=await snapshot(page),beat=after.nodes.find(n=>n.id==='beat');expect(beat.parentId).toBe('event');expect(beat.miceLinks.map(x=>x.miceId)).toEqual(['character']);expect(after.timeline).toEqual(before.timeline);expect(after.characters).toEqual(before.characters);
 await expect(card(page,'beat')).toHaveAttribute('data-flow-owner','character');await expect(card(page,'beat').locator('.still-open')).toHaveText('I + E still open');await expect(page.locator('#dialog')).not.toBeVisible();
 const events=W.outlineEvents(after).map(e=>e.key);expect(events.indexOf('beat:open')).toBeGreaterThan(events.indexOf('inner:open'));expect(events.indexOf('beat:open')).toBeLessThan(events.indexOf('event:close'));
 await page.waitForTimeout(200);await page.locator('.topbar [data-action=undo]').click();expect((await snapshot(page)).nodes).toEqual(before.nodes);await page.locator('.topbar [data-action=redo]').click();await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();await expect(card(page,'beat')).toHaveAttribute('data-flow-owner','character');
});
test('pointer dragging into an inner gap preserves the outer thread and shows the destination before release',async({page})=>{
 await load(page,dragFixture());const source=page.locator('[data-drag=node][data-drag-id=beat]');await source.scrollIntoViewIfNeeded();let a=await source.boundingBox();
 await source.dispatchEvent('pointerdown',{button:0,pointerId:77,clientX:a.x+a.width/2,clientY:a.y+a.height/2,pointerType:'touch'});await page.locator('body').dispatchEvent('pointermove',{pointerId:77,clientX:a.x+a.width/2+15,clientY:a.y+a.height/2,pointerType:'touch'});
 const target=page.locator('[data-drop=position][data-anchor=inner][data-where=before]');await target.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));const b=await target.boundingBox();await page.locator('body').dispatchEvent('pointermove',{pointerId:77,clientX:b.x+b.width/2,clientY:b.y+b.height/2,pointerType:'touch'});
 await expect(target).toHaveClass(/landing/);await expect(target.locator('.slot-label')).toContainText('stays with Character thread');const landing=await target.boundingBox();await page.locator('body').dispatchEvent('pointerup',{pointerId:77,clientX:landing.x+landing.width/2,clientY:landing.y+landing.height/2,pointerType:'touch'});
 const p=await snapshot(page),beat=p.nodes.find(n=>n.id==='beat');expect(beat.parentId).toBe('event');expect(beat.miceLinks.map(x=>x.miceId)).toEqual(['character']);const events=W.outlineEvents(p).map(e=>e.key);expect(events.indexOf('beat:open')).toBeLessThan(events.indexOf('inner:open'));await expect(card(page,'beat')).toHaveAttribute('data-flow-owner','character');await expect(page.locator('#dialog')).not.toBeVisible();
});
test('Beat here creates an outer-arc beat before the inner closing without moving existing moments',async({page})=>{
 await load(page);const before=await snapshot(page);await card(page,'event').locator(':scope > .node-children > .inside-drop').getByRole('button',{name:'Beat here',exact:true}).click();
 await page.locator('#dialog [name=threads][value=event]').uncheck();await page.locator('#dialog [name=threads][value=character]').check();await page.getByRole('button',{name:'Keep thread links'}).click();
 const p=await snapshot(page),added=p.nodes.find(n=>!before.nodes.some(x=>x.id===n.id));expect(added.type).toBe('B');expect(added.parentId).toBe('event');expect(added.miceLinks.map(x=>x.miceId)).toEqual(['character']);
 expect(W.outlineEvents(p).map(e=>e.key)).toEqual(['character:open','mystery:open','event:open','beat:open',added.id+':open','event:close','mystery:close','character:close','milieu:open','milieu:close']);
 expect(p.timeline.filter(x=>before.timeline.some(y=>y.id===x.id))).toEqual(before.timeline);await expect(card(page,added.id)).toHaveAttribute('data-flow-owner','character');
 await card(page,'event').getByRole('button',{name:'Add opening note',exact:true}).click();await card(page,'event').getByRole('textbox',{name:'Opening · The raid',exact:true}).fill('The police surround the harbor.');await page.keyboard.press('Tab');await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();await expect(card(page,'event').getByRole('textbox',{name:'Opening · The raid',exact:true})).toHaveValue('The police surround the harbor.');
});
test('a beat forks a state and all containing threads reflect the new outcome without changing earlier history',async({page})=>{
 await load(page);const beat=card(page,'beat');await beat.getByRole('button',{name:'Fork Liu Jun Status'}).click();await page.getByRole('textbox',{name:'Additional state',exact:true}).fill('Wanted by the law');await page.getByRole('button',{name:'Add state',exact:true}).click();
 for(const id of ['character','mystery','event'])await expect(card(page,id).locator(':scope > .closing [data-piece-state]').filter({visible:true}).last()).toHaveValue('Wanted by the law');
 await expect(beat.locator('[data-beat-inline]').last()).toHaveValue('Wanted by the law');await expect(beat.locator('.beat-state-before').last()).toHaveText('Safe');
 let p=await snapshot(page);expect(p.characters[0].blocks[0].text).toBe('Safe');expect(p.characters[0].changes.find(x=>x.id==='hunted').block.text).toBe('Hunted by Palmerston’s Thralls');const fork=p.characters[0].changes.find(x=>x.block?.text==='Wanted by the law').blockId;
 await card(page,'event').locator(`:scope > .closing [data-piece-state="block:jun:${fork}"]`).fill('Cleared of the charges');await page.keyboard.press('Enter');
 p=await snapshot(page);expect(p.characters[0].changes.find(x=>x.blockId===fork&&x.at==='beat:open').block.text).toBe('Wanted by the law');await expect(card(page,'character').locator(':scope > .closing [data-piece-state]').last()).toHaveValue('Cleared of the charges');
 await page.locator('.topbar [data-action=undo]').click();await expect(card(page,'character').locator(':scope > .closing [data-piece-state]').last()).toHaveValue('Wanted by the law');await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();await expect(card(page,'character').locator(':scope > .closing [data-piece-state]').last()).toHaveValue('Wanted by the law');
});
test('Milieu, Inquiry and Event fields retain independent titles, notes, blank fields and parallel outcomes',async({page})=>{
 await load(page);
 for(const [id,type,focus,from,to]of [['milieu','Milieu','World','Entering','Leaving'],['mystery','Inquiry','Question','Known','Answer'],['event','Event','Disruption','Before','Resolution']]){
  const n=card(page,id);await n.locator(':scope > .thread-plan-fields').getByRole('textbox',{name:type+' '+focus,exact:true}).fill(type+' focus');await page.keyboard.press('Enter');
  await n.locator(':scope > .thread-plan-fields').getByRole('textbox',{name:type+' '+from,exact:true}).fill('');
  await n.locator(':scope > .closing').getByRole('textbox',{name:type+' '+to,exact:true}).fill(type+' ending');await page.keyboard.press('Enter');
  await n.locator(':scope > .closing').getByRole('button',{name:'Add another '+to.toLowerCase(),exact:true}).click();await n.locator(':scope > .closing').getByRole('textbox',{name:type+' '+to+' · additional outcome',exact:true}).fill('A second outcome');await page.keyboard.press('Enter');
 }
 let p=await snapshot(page);expect(p.nodes.find(n=>n.id==='mystery').title).toBe('Who killed Liu Guiying?');expect(p.nodes.find(n=>n.id==='mystery').threadPlans.I.outcomes[0].text).toBe('A second outcome');
 await card(page,'event').getByRole('button',{name:'Add change at closing',exact:true}).click();await page.getByRole('combobox',{name:'Building block, World entry, or connection'}).selectOption('world:harbor');await page.getByRole('textbox',{name:'New state',exact:true}).fill('Under siege');await page.getByRole('button',{name:'Keep change',exact:true}).click();
 p=await snapshot(page);expect(p.world[0].stateValue).toBe('Open');expect(p.world[0].stateChanges[0].at).toBe('event:close');await expect(card(page,'character').locator(':scope > .closing [data-piece-state="world:harbor"]')).toHaveValue('Under siege');
 await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();await expect(card(page,'mystery').locator(':scope > .closing [data-thread-field=to]').last()).toHaveValue('A second outcome');
});
test('a character beat remains before open Event and Inquiry closings and can advance both outer threads',async({page})=>{
 await load(page);const beat=card(page,'beat');const before=await snapshot(page);await beat.getByRole('button',{name:'Choose threads advanced by this beat'}).click();await page.locator('#dialog [name=threads][value=event]').uncheck();await page.locator('#dialog [name=threads][value=character]').check();await page.locator('#dialog [name=threads][value=mystery]').check();await page.getByRole('button',{name:'Keep thread links'}).click();
 await expect(beat).toHaveAttribute('data-flow-owner','character');await expect(beat.locator('.still-open')).toHaveText('I + E still open');const p=await snapshot(page);expect(p.nodes.find(n=>n.id==='beat').parentId).toBe('event');expect(p.timeline).toEqual(before.timeline);expect(p.nodes.find(n=>n.id==='beat').miceLinks.map(x=>x.miceId)).toEqual(['character','mystery']);
 const preceding=await beat.evaluate(el=>['event','mystery','character'].every(id=>!!(el.compareDocumentPosition(document.querySelector(`[data-node="${id}"] > .closing`))&Node.DOCUMENT_POSITION_FOLLOWING)));expect(preceding).toBe(true);
 for(const width of [320,390,900,1440]){await page.setViewportSize({width,height:1000});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);await expect.poll(async()=>{const b=await beat.boundingBox(),parent=await card(page,'character').locator(':scope > .node-children').boundingBox();return Math.abs(b.x-parent.x);}).toBeLessThan(3);}
 const scan=await new AxeBuilder({page}).include('#main').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(scan.violations.map(x=>({id:x.id,targets:x.nodes.map(n=>n.target)}))).toEqual([]);
 await page.setViewportSize({width:test.info().project.name==='mobile'?390:1440,height:1000});await page.screenshot({path:'/tmp/thread-flow-'+test.info().project.name+'.png',fullPage:true});
 await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();await expect(card(page,'beat')).toHaveAttribute('data-flow-owner','character');
});
