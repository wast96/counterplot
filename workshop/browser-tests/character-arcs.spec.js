const {test,expect}=require('@playwright/test');
const AxeBuilder=require('@axe-core/playwright').default;
const W=require('../src/integration.js'),fixture=require('./ui-fixture.cjs');
const snapshot=page=>page.evaluate(()=>{const d=CounterplotTutorial.snapshot();return d.projects.find(p=>p.id===d.active);});
async function load(page,{beats=false,beliefs=false}={}){
 const data=fixture(),p=data.projects[0],n=p.nodes[0],c=p.characters[0];n.type='C';n.cast.push('ui-other');n.title='From Innocent civilian to Communist agent';
 c.blocks=[['status','Innocent civilian'],['allegiance','Neutral']].map(([kind,text])=>({...W.block(kind),id:kind,text}));
 c.changes=c.blocks.map((b,i)=>({id:'change-'+i,at:n.id+':close',momentId:W.momentId(p,n.id+':close'),blockId:b.id,op:'develop',block:{...b,text:i?'Communist':'Communist agent'},reason:''}));
 if(beliefs)c.blocks.push({...W.block('belief'),id:'trust',text:'The system can be trusted'},{...W.block('belief'),id:'city',text:'Shanghai is a dangerous place'});
 if(beats){c.changes.push({id:'beat-status',at:'ui-node-1:open',blockId:'status',op:'develop',block:{...c.blocks[0],text:'Wanted by the law'},reason:''});p.world[0].stateValue='Hidden';p.world[0].stateChanges=[{id:'beat-world',momentId:W.momentId(p,'ui-node-1:open'),value:'Discovered',reason:''}];const beat=W.node('B',n.id);beat.id='ui-node-2';beat.title='An offer of protection';p.nodes.push(beat);}
 p.nodes[1].title='A wanted criminal';p.world.push({id:'resistance',name:'The resistance',type:'group',notes:''});
 await page.goto('/');await expect(page.locator('.story-viewbar')).toBeVisible();
 await page.locator('#import-file').setInputFiles({name:'arc.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await page.locator('[data-action=accept-import]').click();await expect(page.locator('#dialog')).not.toBeVisible();
}
const header=page=>page.locator('[data-node=ui-node-0]');
const state=(page,edge,row='state-status')=>header(page).locator(`[data-arc-row=${row}] input[data-edge=${edge}]`);
const edit=async(page,edge,row='state-status')=>{await header(page).locator(`[data-arc-row=${row}] button[data-edge=${edge}]`).click();};
test('an immediately focused state field keeps keyboard input when the next frame arrives',async({page})=>{
 await load(page);
 const focused=await page.evaluate(()=>{
  document.querySelector('[data-node="ui-node-0"] [data-arc-row="state-allegiance"] button[data-edge="from"]').click();
  document.querySelector('#dialog [name="arcText"]').focus();
  return new Promise(resolve=>requestAnimationFrame(()=>resolve(document.activeElement.name)));
 });
 expect(focused).toBe('arcText');await page.keyboard.press('ControlOrMeta+A');await page.keyboard.press('Backspace');
 await page.getByRole('button',{name:'Keep state',exact:true}).click();await expect(state(page,'from','state-allegiance')).toHaveValue('');
});
test('multiple modular changes edit independently, preserve history, accept blanks, and survive undo and reload',async({page})=>{
 await load(page);const h=header(page),before=await snapshot(page);
 await expect(h.locator('.arc-state')).toHaveCount(4);await expect(state(page,'from','state-allegiance')).toHaveValue('Neutral');await expect(state(page,'to')).toHaveValue('Communist agent');await expect(h.locator('[data-arc-subject]')).toHaveValue('ui-person');
 await expect(page.locator('[data-node=ui-node-0] > .node-head .node-title')).toBeVisible();
 await edit(page,'to');await page.getByRole('textbox',{name:'State · optional',exact:true}).fill('Independent agent');await page.getByRole('button',{name:'Keep state',exact:true}).click();
 await expect(state(page,'to')).toHaveValue('Independent agent');let p=await snapshot(page);expect(p.characters[0].blocks).toEqual(before.characters[0].blocks);expect(p.characters[0].changes[1]).toEqual(before.characters[0].changes[1]);expect(p.nodes[0].cast).toEqual(['ui-person','ui-other']);
 await page.locator('.topbar [data-action=undo]').click();await expect(state(page,'to')).toHaveValue('Communist agent');await page.locator('.topbar [data-action=redo]').click();
 await edit(page,'from','state-allegiance');await page.getByRole('textbox',{name:'State · optional',exact:true}).fill('');await expect(page.getByRole('textbox',{name:'State · optional',exact:true})).toHaveValue('');await page.getByRole('button',{name:'Keep state',exact:true}).click();await expect(state(page,'from','state-allegiance')).toHaveValue('');
 await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();await expect(state(page,'to')).toHaveValue('Independent agent');await expect(header(page).locator('.arc-state')).toHaveCount(4);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width+1);
 const results=await new AxeBuilder({page}).include('#main').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(results.violations).toEqual([]);
 await page.screenshot({path:'/tmp/character-arcs-'+test.info().project.name+'.png'});
});
test('new pairs and states can be made here; deleting a pair keeps history, and groups can have arcs',async({page})=>{
 await load(page);await header(page).getByRole('button',{name:'Add state change',exact:true}).click();await page.getByRole('textbox',{name:'State · optional',exact:true}).fill('Needs approval');await page.getByLabel('Connect to a building block').selectOption('new');await page.getByLabel('Type of change').fill('Want');await page.getByRole('button',{name:'Keep state',exact:true}).click();
 let p=await snapshot(page),row=p.nodes[0].characterArc.changes[2];expect(p.characters[0].changes).toHaveLength(3);
 await edit(page,'to',row.id);await page.getByRole('textbox',{name:'State · optional',exact:true}).fill('Trusts herself');await page.getByRole('button',{name:'Keep state',exact:true}).click();p=await snapshot(page);expect(p.characters[0].changes).toHaveLength(4);
 await edit(page,'to',row.id);await page.getByRole('button',{name:'Remove this pair',exact:true}).click();await expect(header(page).locator('.arc-state')).toHaveCount(4);expect((await snapshot(page)).characters[0].changes).toHaveLength(4);
 await header(page).locator('[data-arc-subject]').selectOption('resistance');await expect(header(page).locator('[data-arc-subject]')).toHaveValue('resistance');
 await edit(page,'from','state-empty');await page.getByRole('textbox',{name:'State · optional',exact:true}).fill('Survive');await page.getByLabel('Connect to a building block').selectOption('new');await page.getByLabel('Type of change').fill('Want');await page.getByRole('button',{name:'Keep state',exact:true}).click();
 await edit(page,'to','state-empty');await page.getByRole('textbox',{name:'State · optional',exact:true}).fill('Take power');await page.getByRole('button',{name:'Keep state',exact:true}).click();p=await snapshot(page);expect(p.world.find(w=>w.id==='resistance').faction.changes).toHaveLength(2);expect(p.characters[0].changes).toHaveLength(4);
});
test('beats are tactile cards with working edits, and archived writing routes lead to Refine without losing prose',async({page})=>{
 await load(page);const before=await snapshot(page);await expect(page.getByRole('tab')).toHaveText(['Outline','Chronology','Sequence','Refine','Scene constructor']);
 const beat=page.locator('[data-node=ui-node-1]');const style=await beat.evaluate(el=>{const s=getComputedStyle(el);return {radius:s.borderRadius,shadow:s.boxShadow,left:s.borderLeftWidth,top:s.borderTopWidth};});expect(style.radius).toBe('9px');expect(style.left).toBe('3px');expect(style.shadow).not.toBe('none');
 await beat.locator('[data-action=select-node]').click();await expect(page.locator('.inspector')).toBeVisible();await expect(page.getByRole('button',{name:'Write this piece',exact:true})).toHaveCount(0);await page.locator('.inspector [data-action=write-node]').click();await expect(page.getByRole('tab',{name:'Refine',exact:true})).toHaveAttribute('aria-selected','true');await expect(page.locator('.refine-piece').getByLabel('Beat plan')).toBeVisible();expect((await snapshot(page)).nodes[1].prose).toEqual(before.nodes[1].prose);
 await page.evaluate(()=>{const b=document.createElement('button');b.dataset.action='story-view';b.dataset.id='read';document.body.append(b);b.click();b.remove();});await expect(page.getByRole('tab',{name:'Refine',exact:true})).toHaveAttribute('aria-selected','true');
});
test('forking a starting state creates two independently editable outcomes',async({page})=>{
 await load(page);await header(page).locator('[data-arc-group=state-status] [data-action=arc-fork]').click();await page.getByRole('textbox',{name:'State · optional',exact:true}).fill('Wanted by the law');await expect(page.getByRole('combobox',{name:'Connect to a building block',exact:true})).toHaveValue('new');await page.getByRole('button',{name:'Keep state',exact:true}).click();
 const h=header(page),row=h.locator('[data-arc-row=state-status]');await expect(row.locator('input[data-edge=from]')).toHaveCount(1);await expect(row.locator('input[data-edge=to]')).toHaveCount(2);await expect(row.locator('input[data-edge=to]').first()).toHaveValue('Communist agent');await expect(row.locator('input[data-edge=to]').last()).toHaveValue('Wanted by the law');
 const p=await snapshot(page);expect(p.characters[0].changes).toHaveLength(3);expect(p.characters[0].changes[0].block.text).toBe('Communist agent');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width+1);
 await row.locator('button[data-edge=to]').last().click();await page.getByRole('textbox',{name:'State · optional',exact:true}).fill('Pursued across the city');await page.getByRole('button',{name:'Keep state',exact:true}).click();await expect(row.locator('input[data-edge=to]').first()).toHaveValue('Communist agent');await expect(row.locator('input[data-edge=to]').last()).toHaveValue('Pursued across the city');
 await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();await expect(state(page,'to').last()).toHaveValue('Pursued across the city');
 await page.screenshot({path:'/tmp/arc-fork-'+test.info().project.name+'.png'});
});
test('the compact connection builder labels both sides and preserves optional details',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await load(page);await page.locator('[data-nav=connections]').first().click();await page.locator('[data-action=new-connection]').first().click();
 const dialog=page.locator('#dialog');await expect(dialog.locator('.connection-builder')).toBeVisible();await expect(dialog.locator('[name=aWant]')).not.toBeVisible();await expect(dialog.locator('[type=submit]')).toBeVisible();
 await dialog.locator('[name=label]').fill('is hunted by');await dialog.locator('[name=b]').selectOption('ui-other');await expect(dialog.locator('#connection-preview')).toContainText('Liu Jun · is hunted by · Ocelot');
 await dialog.getByText('Wants & tensions',{exact:true}).click();await page.getByRole('textbox',{name:'What Liu Jun wants',exact:true}).fill('Stay hidden');await page.getByRole('textbox',{name:'What Ocelot wants',exact:true}).fill('Capture Liu Jun');await page.getByRole('button',{name:'Keep connection',exact:true}).click();
 let p=await snapshot(page);expect(p.connections[0].aWant).toBe('Stay hidden');expect(p.connections[0].bWant).toBe('Capture Liu Jun');await page.locator('[data-action=edit-connection]').first().click();await dialog.getByText('Wants & tensions',{exact:true}).click();await expect(page.getByRole('textbox',{name:'What Liu Jun wants',exact:true})).toHaveValue('Stay hidden');
 await page.getByRole('button',{name:'Swap connection sides',exact:true}).click();await expect(dialog.locator('[name=a]')).toHaveValue('ui-other');await expect(dialog.locator('[name=aWant]')).toHaveValue('Capture Liu Jun');await page.getByRole('button',{name:'Keep connection',exact:true}).click();p=await snapshot(page);expect(p.connections[0].a).toBe('ui-other');expect(p.connections[0].aWant).toBe('Capture Liu Jun');
 await page.locator('[data-action=edit-connection]').first().click();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width+1);const results=await new AxeBuilder({page}).include('#dialog').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(results.violations).toEqual([]);await page.screenshot({path:'/tmp/connection-builder-'+test.info().project.name+'.png'});
});

test('titles and inline states edit independently, with starting states above beats and final states at the closing',async({page})=>{
 await load(page,{beats:true});const root=header(page),title=root.locator(':scope > .node-head .node-title'),start=root.locator(':scope > .node-opening > .node-content > .arc-edge-from'),end=root.locator(':scope > .closing .arc-edge-to'),beat=page.locator('[data-node=ui-node-1]');
 await expect(start.locator('[data-edge=to]')).toHaveCount(0);await expect(end.locator('[data-edge=from]')).toHaveCount(0);await expect(page.locator('.inspector .character-arc-heading')).toHaveCount(0);
 await title.fill('The making of an agent');await title.press('Tab');await state(page,'to').fill('An independent agent');await state(page,'to').press('Enter');await expect(page.locator('#dialog')).not.toBeVisible();
 let p=await snapshot(page);expect(p.nodes[0].title).toBe('The making of an agent');expect(p.characters[0].changes[0].block.text).toBe('An independent agent');expect(p.characters[0].blocks[0].text).toBe('Innocent civilian');
 const changes=beat.locator('.beat-states');await expect(changes).toContainText('Innocent civilian');await expect(changes.getByRole('textbox',{name:/Liu Jun/})).toHaveValue('Wanted by the law');await expect(changes).toContainText('Hidden');await expect(changes.getByRole('textbox',{name:/blood pearl/})).toHaveValue('Discovered');
 await changes.getByRole('textbox',{name:/Liu Jun/}).fill('Hunted across the city');await changes.getByRole('textbox',{name:/Liu Jun/}).press('Enter');p=await snapshot(page);expect(p.characters[0].changes.find(x=>x.id==='beat-status').block.text).toBe('Hunted across the city');expect(p.characters[0].changes[0].block.text).toBe('An independent agent');
 await page.locator('.topbar [data-action=undo]').click();await expect(beat.locator('.beat-states input').first()).toHaveValue('Wanted by the law');await expect(title).toHaveValue('The making of an agent');
 for(const width of [320,390,900,1440]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);if(width===1440){expect((await start.boundingBox()).height).toBeLessThan(95);const last=await root.locator(':scope > .closing').boundingBox();expect(last.y+last.height).toBeLessThan(1150);for(const fields of await root.locator('.beat-plan-fields').filter({visible:true}).all())expect((await fields.boundingBox()).height).toBeLessThan(65);}}
 const scan=await new AxeBuilder({page}).include('#main').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(scan.violations.map(x=>({id:x.id,targets:x.nodes.map(n=>n.target)}))).toEqual([]);
 await expect(page.locator('#save-status')).toContainText('Saved on this device');await state(page,'to','state-allegiance').fill('Communist organizer');await expect.poll(async()=>(await snapshot(page)).characters[0].changes[1].block.text).toBe('Communist organizer');await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();await expect(state(page,'to','state-allegiance')).toHaveValue('Communist organizer');await expect(header(page).locator(':scope > .node-head .node-title')).toHaveValue('The making of an agent');await expect(state(page,'to')).toHaveValue('An independent agent');await page.setViewportSize({width:test.info().project.name==='mobile'?390:1440,height:1000});await page.screenshot({path:'/tmp/compact-flow-'+test.info().project.name+'.png',fullPage:true});
});

test('state types come first, support keyboard search and custom labels, and survive later edits',async({page})=>{
 await load(page);await edit(page,'from');const type=page.getByRole('combobox',{name:'Type of change',exact:true});
 expect(await type.evaluate(el=>!!(el.compareDocumentPosition(el.form.elements.arcText)&Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
 await type.fill('Alleg');await expect(page.locator('#arc-type-list').getByRole('option',{name:'Allegiance',exact:true})).toBeVisible();await type.press('ArrowDown');await type.press('ArrowDown');await type.press('Enter');await expect(type).toHaveValue('Allegiance');await expect(type).toHaveAttribute('aria-expanded','false');
 await type.fill('Legal standing');await type.press('ArrowDown');await type.press('Enter');await expect(type).toHaveValue('Legal standing');
 await type.focus();await type.press('ArrowDown');await expect(type).toHaveAttribute('aria-expanded','true');await type.press('Escape');await expect(page.locator('#dialog')).toBeVisible();await expect(type).toHaveAttribute('aria-expanded','false');
 const results=await new AxeBuilder({page}).include('#dialog').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(results.violations).toEqual([]);
 await page.getByRole('button',{name:'Keep state',exact:true}).click();await expect(header(page).locator('[data-arc-row=state-status] .arc-state-label')).toHaveText(['Legal standing','Legal standing']);
 await state(page,'to').fill('Wanted criminal');await state(page,'to').press('Enter');await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();
 await expect(header(page).locator('[data-arc-row=state-status] .arc-state-label')).toHaveText(['Legal standing','Legal standing']);let p=await snapshot(page);expect(p.characters[0].blocks.find(b=>b.id==='status').label).toBe('Legal standing');expect(p.characters[0].changes.find(x=>x.blockId==='status').block.label).toBe('Legal standing');
 await header(page).getByRole('button',{name:'Add state change',exact:true}).click();await type.fill('Legal');await expect(page.locator('#arc-type-list').getByRole('option',{name:'Legal standing',exact:true})).toBeVisible();await page.locator('#arc-type-list').getByRole('option',{name:'Legal standing',exact:true}).click();await page.getByRole('button',{name:'Keep state',exact:true}).click();
 p=await snapshot(page);expect(p.nodes[0].characterArc.changes.at(-1).label).toBe('Legal standing');expect(p.nodes[0].characterArc.changes.at(-1).from.text).toBe('');
});

test('same-type building blocks show their actual wording and the selected prior state',async({page})=>{
 await load(page,{beliefs:true});await edit(page,'to');const block=page.getByRole('combobox',{name:'Connect to a building block',exact:true});
 await expect(block.locator('option[value=trust]')).toHaveText('Belief · The system can be trusted');await expect(block.locator('option[value=city]')).toHaveText('Belief · Shanghai is a dangerous place');
 await block.selectOption('trust');await expect(page.locator('#arc-current-state')).toContainText('The system can be trusted');await expect(page.getByLabel('Type of change')).toHaveValue('Belief');
 await block.selectOption('city');await expect(page.locator('#arc-current-state')).toContainText('Shanghai is a dangerous place');await page.getByRole('textbox',{name:'State · optional',exact:true}).fill('There are allies in Shanghai');await page.getByRole('button',{name:'Keep state',exact:true}).click();
 const p=await snapshot(page);expect(p.characters[0].changes.find(x=>x.blockId==='city').block.text).toBe('There are allies in Shanghai');expect(p.characters[0].blocks.find(x=>x.id==='trust').text).toBe('The system can be trusted');
});
