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
test('Milieu context shares one compact group without repeating linked settings',async({page})=>{
 await load(page);const milieu=card(page,'milieu'),row=milieu.locator(':scope > .node-opening > .node-foot > .cast-chips');
 await expect(milieu.locator('[data-action=edit-world][data-id=harbor]')).toHaveCount(1);await expect(row.getByRole('button',{name:'Open setting: The harbor',exact:true})).toBeVisible();await expect(milieu.locator(':scope > .milieu-world')).toHaveCount(0);
 expect(await row.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 await row.getByRole('button',{name:'Open setting: The harbor',exact:true}).click();await expect(page.locator('#dialog [name=name]')).toHaveValue('The harbor');await page.keyboard.press('Escape');
 await row.getByRole('button',{name:'Unlink The harbor from Into the harbor',exact:true}).click();await expect(row.locator('.milieu-chip')).toHaveCount(0);expect((await snapshot(page)).world.some(w=>w.id==='harbor')).toBe(true);
 await row.getByRole('button',{name:'Link setting or culture',exact:true}).click();await page.locator('[data-action=milieu-choose][data-world=harbor]').click();await expect(row.locator('[data-action=edit-world][data-id=harbor]')).toHaveCount(1);await expect(row.locator('.cast-chip')).toContainText('Liu Jun');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width+1);await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();await expect(card(page,'milieu').locator('[data-action=edit-world][data-id=harbor]')).toHaveCount(1);
});
function dragFixture(){const data=fixture(),p=data.projects[0];p.nodes.find(n=>n.id==='beat').parentId='character';p.nodes.push({...W.node('B','event'),id:'inner',title:'Inside the event'});W.normalize(p);return data;}
test('sibling beats advancing the same outer thread stay aligned after a drag animation, resize and reload',async({page})=>{
 const data=dragFixture(),p=data.projects[0];W.setAdvancedThreads(p,p.nodes.find(n=>n.id==='inner'),['character']);await load(page,data);
 await page.evaluate(()=>{const source=document.querySelector('[data-drag=node][data-drag-id=beat]'),target=document.querySelector('[data-node=event] > .closing'),transfer=new DataTransfer();source.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:transfer}));target.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:transfer}));target.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));});
 for(const id of ['beat','inner'])await expect(card(page,id)).toHaveAttribute('data-flow-owner','character');
 await card(page,'beat').evaluate(async el=>{await Promise.all(el.getAnimations().map(animation=>animation.finished));});
 const alignment=()=>page.evaluate(()=>{const left=id=>document.querySelector(`[data-node="${id}"]`).getBoundingClientRect().left,target=document.querySelector('[data-node=character] > .node-children').getBoundingClientRect().left;return Math.max(Math.abs(left('beat')-left('inner')),Math.abs(left('beat')-target));});
 await expect.poll(alignment).toBeLessThan(2);
 for(const width of [320,390,900,1440]){await page.setViewportSize({width,height:1000});await expect.poll(alignment).toBeLessThan(2);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);}
 await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();await expect(card(page,'beat')).toBeVisible();await expect.poll(alignment).toBeLessThan(2);
});
test('dragging a character beat onto a nested closing keeps its larger arc with undo and reload',async({page})=>{
 await load(page,dragFixture());const before=await snapshot(page);
 await page.evaluate(()=>{const source=document.querySelector('[data-drag=node][data-drag-id=beat]'),target=document.querySelector('[data-node=event] > .closing');window.testDragData=new DataTransfer();source.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:testDragData}));target.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:testDragData}));});
 await expect(card(page,'event').locator(':scope > .closing')).toHaveAttribute('data-drop-label','Before closing · The raid · stays with Character thread');
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
test('the MICE bar adds an outer-arc beat at a compact thread closing without moving existing moments',async({page})=>{
 await load(page);const before=await snapshot(page);
 await expect(page.locator('.outline .inside-drop')).toHaveCount(0);
 expect(await card(page,'event').evaluate(el=>el.querySelector(':scope > .closing').getBoundingClientRect().top-el.querySelector('[data-node=beat]').getBoundingClientRect().bottom)).toBeLessThanOrEqual(14);
 await page.mouse.move(0,0);await expect(card(page,'event').locator(':scope > .node-opening > .node-foot .add-cast')).toHaveCSS('opacity','1');await expect(card(page,'event').locator(':scope > .node-opening > .node-foot .beat-add-change')).toHaveCSS('opacity','1');
 await page.evaluate(()=>{const source=document.querySelector('[data-drag=palette][data-drag-id=B]'),target=document.querySelector('[data-node=event] > .closing'),transfer=new DataTransfer();source.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:transfer}));target.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:transfer}));target.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));});
 const created=(await snapshot(page)).nodes.find(n=>!before.nodes.some(x=>x.id===n.id));await page.waitForTimeout(200);await card(page,created.id).locator(':scope > .node-head .piece-menu>summary').click();await card(page,created.id).locator(':scope > .node-head [data-action=thread-links]').click();
 await page.locator('#dialog [name=threads][value=event]').uncheck();await page.locator('#dialog [name=threads][value=character]').check();await page.getByRole('button',{name:'Keep thread links'}).click();
 const p=await snapshot(page),added=p.nodes.find(n=>!before.nodes.some(x=>x.id===n.id));expect(added.type).toBe('B');expect(added.parentId).toBe('event');expect(added.miceLinks.map(x=>x.miceId)).toEqual(['character']);
 expect(W.outlineEvents(p).map(e=>e.key)).toEqual(['character:open','mystery:open','event:open','beat:open',added.id+':open','event:close','mystery:close','character:close','milieu:open','milieu:close']);
 expect(p.timeline.filter(x=>before.timeline.some(y=>y.id===x.id))).toEqual(before.timeline);await expect(card(page,added.id)).toHaveAttribute('data-flow-owner','character');
 await card(page,'event').locator(':scope > .node-head .piece-menu>summary').click();await card(page,'event').locator(':scope > .node-head [data-action=reveal-thread-note][data-edge=open]').click();await card(page,'event').getByRole('textbox',{name:'Opening · The raid',exact:true}).fill('The police surround the harbor.');await page.keyboard.press('Tab');await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();await expect(card(page,'event').getByRole('textbox',{name:'Opening · The raid',exact:true})).toHaveValue('The police surround the harbor.');
});
test('a beat fork stays in history without repeated closing fields and can change at a later closing',async({page})=>{
 await load(page);const beat=card(page,'beat');await beat.getByRole('button',{name:'Fork Liu Jun Status'}).click();await page.getByRole('textbox',{name:'Additional state',exact:true}).fill('Wanted by the law');await page.getByRole('button',{name:'Add state',exact:true}).click();
 for(const id of ['character','mystery','event'])await expect(card(page,id).locator(':scope > .closing [data-piece-state]')).toHaveCount(0);
 await expect(beat.locator('[data-beat-inline]').last()).toHaveValue('Wanted by the law');await expect(beat.locator('.beat-state-before').last()).toHaveText('Safe');
 let p=await snapshot(page);expect(p.characters[0].blocks[0].text).toBe('Safe');expect(p.characters[0].changes.find(x=>x.id==='hunted').block.text).toBe('Hunted by Palmerston’s Thralls');const fork=p.characters[0].changes.find(x=>x.block?.text==='Wanted by the law').blockId;
 await card(page,'event').getByRole('button',{name:'Add change at closing',exact:true}).click();await page.getByRole('combobox',{name:'Building block, World entry, or connection'}).selectOption('block:jun:'+fork);await page.getByRole('textbox',{name:'New state',exact:true}).fill('Cleared of the charges');await page.getByRole('button',{name:'Keep change',exact:true}).click();
 p=await snapshot(page);expect(p.characters[0].changes.find(x=>x.blockId===fork&&x.at==='beat:open').block.text).toBe('Wanted by the law');await expect(card(page,'event').locator(':scope > .closing [data-piece-state]').last()).toHaveValue('Cleared of the charges');await expect(card(page,'character').locator(':scope > .closing [data-piece-state]')).toHaveCount(0);
 await page.locator('.topbar [data-action=undo]').click();await expect(card(page,'event').locator(':scope > .closing [data-piece-state]')).toHaveCount(0);await expect(beat.locator('[data-beat-inline]').last()).toHaveValue('Wanted by the law');await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();await expect(card(page,'event').locator(':scope > .closing [data-piece-state]')).toHaveCount(0);await expect(beat.locator('[data-beat-inline]').last()).toHaveValue('Wanted by the law');
});
test('Milieu, Inquiry and Event fields retain independent titles, notes, blank fields and parallel outcomes',async({page})=>{
 await load(page);
 for(const [id,type,focus,from,to]of [['milieu','Milieu','World','Entering','Leaving'],['mystery','Inquiry','Question','Known','Answer'],['event','Event','Disruption','Before','Resolution']]){
  const n=card(page,id);await n.locator(':scope > .node-head .node-title').click();await n.locator(':scope > .node-opening > .node-content > .thread-plan-fields').getByRole('textbox',{name:type+' '+focus,exact:true}).fill(type+' focus');await page.keyboard.press('Enter');
  await n.locator(':scope > .node-opening > .node-content > .thread-plan-fields').getByRole('textbox',{name:type+' '+from,exact:true}).fill('');
  await n.locator(':scope > .closing').getByRole('textbox',{name:type+' '+to,exact:true}).fill(type+' ending');await page.keyboard.press('Enter');
  await n.locator(':scope > .closing').getByRole('button',{name:'Add another '+to.toLowerCase(),exact:true}).click();await n.locator(':scope > .closing').getByRole('textbox',{name:type+' '+to+' · additional outcome',exact:true}).fill('A second outcome');await page.keyboard.press('Enter');
 }
 let p=await snapshot(page);expect(p.nodes.find(n=>n.id==='mystery').title).toBe('Who killed Liu Guiying?');expect(p.nodes.find(n=>n.id==='mystery').threadPlans.I.outcomes[0].text).toBe('A second outcome');
 await card(page,'event').getByRole('button',{name:'Add change at closing',exact:true}).click();await page.getByRole('combobox',{name:'Building block, World entry, or connection'}).selectOption('world:harbor');await page.getByRole('textbox',{name:'New state',exact:true}).fill('Under siege');await page.getByRole('button',{name:'Keep change',exact:true}).click();
 p=await snapshot(page);expect(p.world[0].stateValue).toBe('Open');expect(p.world[0].stateChanges[0].at).toBe('event:close');await expect(card(page,'event').locator(':scope > .closing [data-piece-state="world:harbor"]')).toHaveValue('Under siege');await expect(card(page,'character').locator(':scope > .closing [data-piece-state="world:harbor"]')).toHaveCount(0);
 await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();await expect(card(page,'mystery').locator(':scope > .closing [data-thread-field=to]').last()).toHaveValue('A second outcome');
});
test('a character beat remains before open Event and Inquiry closings and can advance both outer threads',async({page})=>{
 await load(page);const beat=card(page,'beat');const before=await snapshot(page);await beat.locator(':scope > .node-head .piece-menu>summary').click();await beat.locator(':scope > .node-head [data-action=thread-links]').click();await page.locator('#dialog [name=threads][value=event]').uncheck();await page.locator('#dialog [name=threads][value=character]').check();await page.locator('#dialog [name=threads][value=mystery]').check();await page.getByRole('button',{name:'Keep thread links'}).click();
 await expect(beat).toHaveAttribute('data-flow-owner','character');await expect(beat.locator('.still-open')).toHaveText('I + E still open');const p=await snapshot(page);expect(p.nodes.find(n=>n.id==='beat').parentId).toBe('event');expect(p.timeline).toEqual(before.timeline);expect(p.nodes.find(n=>n.id==='beat').miceLinks.map(x=>x.miceId)).toEqual(['character','mystery']);
 const preceding=await beat.evaluate(el=>['event','mystery','character'].every(id=>!!(el.compareDocumentPosition(document.querySelector(`[data-node="${id}"] > .closing`))&Node.DOCUMENT_POSITION_FOLLOWING)));expect(preceding).toBe(true);
 for(const width of [320,390,900,1440]){await page.setViewportSize({width,height:1000});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);await expect.poll(()=>page.evaluate(()=>{const beat=document.querySelector('[data-node=beat]'),parent=document.querySelector('[data-node=character] > .node-children');return beat&&parent?Math.abs(beat.getBoundingClientRect().left-parent.getBoundingClientRect().left):Infinity;})).toBeLessThan(3);}
 const scan=await new AxeBuilder({page}).include('#main').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(scan.violations.map(x=>({id:x.id,targets:x.nodes.map(n=>n.target)}))).toEqual([]);
 await page.setViewportSize({width:test.info().project.name==='mobile'?390:1440,height:1000});await page.screenshot({path:'/tmp/thread-flow-'+test.info().project.name+'.png',fullPage:true});
 await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();await expect(card(page,'beat')).toHaveAttribute('data-flow-owner','character');
});

test('custom block labels persist through existing changes, edits, forks and reload',async({page})=>{
 const data=fixture();data.projects[0].characters[0].blocks[0].label='Status';await load(page,data);
 const beat=card(page,'beat');await expect(beat.getByRole('button',{name:'Fork Liu Jun Status',exact:true})).toBeVisible();
 await beat.getByRole('button',{name:'Fork Liu Jun Status',exact:true}).click();await page.getByRole('textbox',{name:'Additional state',exact:true}).fill('Wanted by the law');await page.getByRole('button',{name:'Add state',exact:true}).click();
 await expect(beat.getByRole('button',{name:'Fork Liu Jun Status',exact:true})).toHaveCount(2);
 await page.locator('[data-nav=characters]').first().click();await page.locator('[data-action=time][data-id="beat:open"]').click();
 await expect(page.locator('.blocks-grid .block-label')).toHaveText(['Status','Status']);
 await page.locator('.block[data-block=status] [data-action=edit-block]').click();await page.locator('#dialog [name=label]').fill('Standing');await page.getByRole('button',{name:'Save piece',exact:true}).click();
 await page.locator('[data-action=time][data-id="character:close"]').click();await expect(page.locator('.block[data-block=status] .block-label')).toHaveText('Standing');await expect(page.locator('.block[data-block=status] .block-body')).toHaveText('Communist agent');
 await page.locator('[data-action=character-tab][data-id=arc]').click();await expect(page.locator('.change-list .eyebrow').filter({hasText:'Standing'})).toHaveCount(2);
 await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();
 await page.locator('[data-nav=characters]').first().click();await page.locator('[data-action=character-tab][data-id=blocks]').click();await page.locator('[data-action=time][data-id="beat:open"]').click();await expect(page.locator('.block[data-block=status] .block-label')).toHaveText('Standing');await expect(page.locator('.block[data-block=status] .block-body')).toHaveText('Hunted by Palmerston’s Thralls');
 const p=await snapshot(page);expect(p.characters[0].blocks[0].text).toBe('Safe');expect(p.characters[0].changes.find(x=>x.block.text==='Wanted by the law').block.label).toBe('Status');
});

test('character and chronology timelines omit archived and deleted anchors while keeping explicit moments and restorable history',async({page})=>{
 const data=fixture(),p=data.projects[0];p.nodes.push({...W.node('I'),id:'previously-deleted'});W.normalize(p);const removed=W.archiveNode(p,'previously-deleted');W.purgeArchive(p,[removed.id]);
 p.timeline.push({id:'backstory',key:'backstory:moment',nodeId:'',edge:'open',title:'Historical moment'});
 await load(page,data);const original=await snapshot(page),stops=page.locator('.time-strip');
 await page.locator('[data-nav=characters]').first().click();await expect(stops.locator('[data-id="previously-deleted:open"]')).toHaveCount(0);await expect(stops.locator('[data-id="previously-deleted:close"]')).toHaveCount(0);
 await expect(stops.locator('[data-id="backstory:moment"]')).toContainText('Story moment');await stops.locator('[data-id="character:close"]').click();
 await page.locator('[data-nav=outline]').first().click();await card(page,'character').locator(':scope > .node-head .piece-menu>summary').click();await card(page,'character').locator(':scope > .node-head [data-action=archive-node]').click();
 await page.locator('[data-nav=characters]').first().click();await expect(stops.locator('[data-id="character:close"]')).toHaveCount(0);await expect(stops.locator('[data-id="beat:open"]')).toHaveCount(0);await expect(stops.getByRole('button',{name:'Before the story The beginning',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.locator('.character-presence')).toContainText('At the beginning');
 await expect(stops.locator('[data-id="milieu:open"]')).toBeVisible();await expect(stops.locator('[data-id="backstory:moment"]')).toContainText('Historical moment');
 await page.locator('[data-nav=outline]').first().click();await page.getByRole('tab',{name:'Chronology',exact:true}).click();
 await expect(page.locator('.timeline-moment')).toHaveCount(3);
 await expect(page.locator('.chronology-track')).not.toContainText('Archived piece');
 await expect(page.locator('[data-moment-key="previously-deleted:open"]')).toHaveCount(0);
 await expect(page.locator('[data-moment-key="backstory:moment"]')).toContainText('Historical moment');
 await page.getByRole('button',{name:'Group by date',exact:true}).click();await expect(page.locator('.timeline-moment')).toHaveCount(3);
 await page.getByRole('button',{name:'Story order',exact:true}).click();await page.getByRole('tab',{name:'Outline',exact:true}).click();
 let archived=await snapshot(page);expect(archived.timeline).toEqual(original.timeline);expect(archived.archive[0].changes).toHaveLength(2);
 await page.locator('[data-nav=archive]').first().click();await page.locator('[data-action=restore]').first().click();await page.locator('[data-nav=characters]').first().click();await expect(stops.locator('[data-id="character:close"]')).toBeVisible();expect((await snapshot(page)).characters[0].changes).toEqual(original.characters[0].changes);
 await page.locator('[data-nav=outline]').first().click();await card(page,'character').locator(':scope > .node-head .piece-menu>summary').click();await card(page,'character').locator(':scope > .node-head [data-action=archive-node]').click();await page.locator('[data-nav=archive]').first().click();await page.locator('[data-action=purge-item]').first().click();await page.locator('#dialog').getByRole('button',{name:'Delete permanently',exact:true}).click();
 await page.locator('[data-nav=characters]').first().click();await expect(stops.locator('[data-id="character:close"]')).toHaveCount(0);await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();await page.locator('[data-nav=characters]').first().click();
 await expect(stops.locator('[data-id="character:open"]')).toHaveCount(0);await expect(stops.locator('[data-id="previously-deleted:open"]')).toHaveCount(0);await expect(stops.locator('[data-id="backstory:moment"]')).toContainText('Historical moment');
 expect((await snapshot(page)).timeline.map(e=>e.id)).toEqual(original.timeline.map(e=>e.id));
 await page.locator('[data-nav=outline]').first().click();await page.getByRole('tab',{name:'Chronology',exact:true}).click();await expect(page.locator('.timeline-moment')).toHaveCount(3);

});

test('outline and inspector Add change use the same editor and preserve the chosen endpoint',async({page})=>{
 await load(page);const beat=card(page,'beat');await beat.getByRole('button',{name:'Add change',exact:true}).click();await expect(page.locator('#dialog [data-form=record-piece-state]')).toBeVisible();const sources=await page.locator('#dialog [name=source] option').allTextContents();await page.keyboard.press('Escape');
 await beat.locator('[data-action=select-node]').click();await page.locator('.inspector .text-btn[data-action=record-piece-state]').click();await expect(page.locator('#dialog [name=source] option')).toHaveText(sources);
 await page.getByRole('button',{name:'Character block options',exact:true}).click();await expect(page.locator('#dialog')).toContainText('Liu Jun');await page.keyboard.press('Escape');
 if(test.info().project.name==='mobile')await page.locator('.inspector [data-action=collapse-inspector]').click();
 await card(page,'event').locator(':scope > .closing [data-action=record-piece-state]').click();await page.locator('#dialog [name=source]').selectOption('block:jun:status');await page.getByLabel('New state',{exact:true}).fill('Safe again');await page.getByRole('button',{name:'Keep change',exact:true}).click();
 const p=await snapshot(page);expect(p.characters[0].changes.find(x=>x.block?.text==='Safe again').at).toBe('event:close');await expect(card(page,'event').locator(':scope > .node-opening > .node-content > .thread-plan-fields label > span')).toHaveText(['Before','Disruption']);
});

test('selected nested beats keep their position when hovered',async({page})=>{
 await load(page);
 const beat=card(page,'beat');
 await beat.getByRole('button',{name:'Edit details for A target on her back',exact:true}).click();
 if(await page.locator('#details-sheet').isVisible()){await page.keyboard.press('Escape');await expect(page.locator('#details-sheet')).not.toBeVisible();}
 await beat.locator(':scope > .node-head').hover();
 await page.mouse.move(0,0);
 const before=await beat.boundingBox();
 await beat.locator(':scope > .node-head').hover();
 const after=await beat.boundingBox();
 expect(after.x).toBeCloseTo(before.x,1);expect(after.width).toBeCloseTo(before.width,1);
});
test('gained pieces have grouped kinds and keep the selected kind after saving',async({page})=>{
 await load(page);await card(page,'beat').getByRole('button',{name:'Add change',exact:true}).click();
 await page.getByRole('button',{name:'Character block options',exact:true}).click();
 await page.locator('[data-action=gain-block]').click();
 const kinds=page.getByRole('combobox',{name:'Kind of piece',exact:true});await expect(kinds).toBeVisible();
 expect(await kinds.locator('optgroup').evaluateAll(xs=>xs.map(x=>x.label))).toEqual(['Inner life','Presence','History','Everyday life','Their world','Your own']);
 const values=await kinds.locator('option').evaluateAll(xs=>xs.map(x=>x.value));expect(values).toHaveLength(50);expect(new Set(values).size).toBe(50);
 await expect(kinds.locator('optgroup[label="Presence"] option[value="alias"]')).toHaveText('Names & aliases');
 await kinds.selectOption('alias');await page.getByLabel('What is true afterward?',{exact:true}).fill('Known as the night courier');
 await page.getByRole('button',{name:'Keep this change',exact:true}).click();await expect(page.locator('#dialog')).not.toBeVisible();
 await expect(page.locator('#save-status')).toContainText('Saved on this device');
 await page.reload();await expect(page.locator('.story-viewbar')).toBeVisible();const p=await snapshot(page);expect(p.characters[0].changes.find(x=>x.block?.text==='Known as the night courier').block.kind).toBe('alias');
});
