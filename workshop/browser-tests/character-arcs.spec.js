const {test,expect}=require('@playwright/test');
const AxeBuilder=require('@axe-core/playwright').default;
const W=require('../src/integration.js'),fixture=require('./ui-fixture.cjs');
const snapshot=page=>page.evaluate(()=>{const d=CounterplotTutorial.snapshot();return d.projects.find(p=>p.id===d.active);});
async function load(page){
 const data=fixture(),p=data.projects[0],n=p.nodes[0],c=p.characters[0];n.type='C';n.cast.push('ui-other');n.title='From Innocent civilian to Communist agent';
 c.blocks=[['status','Innocent civilian'],['allegiance','Neutral']].map(([kind,text])=>({...W.block(kind),id:kind,text}));
 c.changes=c.blocks.map((b,i)=>({id:'change-'+i,at:n.id+':close',momentId:W.momentId(p,n.id+':close'),blockId:b.id,op:'develop',block:{...b,text:i?'Communist':'Communist agent'},reason:''}));
 p.nodes[1].title='A wanted criminal';p.world.push({id:'resistance',name:'The resistance',type:'group',notes:''});
 await page.goto('/');await expect(page.locator('.story-viewbar')).toBeVisible();
 await page.locator('#import-file').setInputFiles({name:'arc.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await page.locator('[data-action=accept-import]').click();await expect(page.locator('#dialog')).not.toBeVisible();
}
const header=page=>page.locator('[data-node=ui-node-0] > .node-head .character-arc-heading');
const edit=async(page,edge,row='state-status')=>{await header(page).locator(`[data-arc-row=${row}] [data-edge=${edge}]`).click();};
test('multiple modular changes edit independently, preserve history, accept blanks, and survive undo and reload',async({page})=>{
 await load(page);const h=header(page),before=await snapshot(page);
 await expect(h.locator('.arc-state')).toHaveCount(4);await expect(h).toContainText('Neutral');await expect(h).toContainText('Communist agent');await expect(h.locator('.arc-person')).toHaveAccessibleName('Change thread subject: Liu Jun');
 await expect(page.locator('[data-node=ui-node-0] > .node-head input')).toHaveCount(0);
 await edit(page,'to');await page.getByRole('textbox',{name:'State · optional',exact:true}).fill('Independent agent');await page.getByRole('button',{name:'Keep state',exact:true}).click();
 await expect(h).toContainText('Independent agent');let p=await snapshot(page);expect(p.characters[0].blocks).toEqual(before.characters[0].blocks);expect(p.characters[0].changes[1]).toEqual(before.characters[0].changes[1]);expect(p.nodes[0].cast).toEqual(['ui-person','ui-other']);
 await page.locator('.topbar [data-action=undo]').click();await expect(h).toContainText('Communist agent');await page.locator('.topbar [data-action=redo]').click();
 await edit(page,'from','state-allegiance');await page.getByRole('textbox',{name:'State · optional',exact:true}).fill('');await page.getByRole('button',{name:'Keep state',exact:true}).click();await expect(h.locator('[data-arc-row=state-allegiance] [data-edge=from]')).toContainText('Add state');
 await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();await expect(header(page)).toContainText('Independent agent');await expect(header(page).locator('.arc-state')).toHaveCount(4);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width+1);
 const results=await new AxeBuilder({page}).include('#main').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(results.violations).toEqual([]);
 await page.screenshot({path:'/tmp/character-arcs-'+test.info().project.name+'.png'});
});
test('new pairs and states can be made here; deleting a pair keeps history, and groups can have arcs',async({page})=>{
 await load(page);await header(page).getByRole('button',{name:'Add state change',exact:true}).click();await page.getByRole('textbox',{name:'State · optional',exact:true}).fill('Needs approval');await page.getByLabel('Connect to a building block').selectOption('new');await page.getByLabel('Type of change').selectOption('want');await page.getByRole('button',{name:'Keep state',exact:true}).click();
 let p=await snapshot(page),row=p.nodes[0].characterArc.changes[2];expect(p.characters[0].changes).toHaveLength(3);
 await edit(page,'to',row.id);await page.getByRole('textbox',{name:'State · optional',exact:true}).fill('Trusts herself');await page.getByRole('button',{name:'Keep state',exact:true}).click();p=await snapshot(page);expect(p.characters[0].changes).toHaveLength(4);
 await edit(page,'to',row.id);await page.getByRole('button',{name:'Remove this pair',exact:true}).click();await expect(header(page).locator('.arc-state')).toHaveCount(4);expect((await snapshot(page)).characters[0].changes).toHaveLength(4);
 await header(page).locator('.arc-person').click();await page.getByRole('combobox',{name:'Character or group',exact:true}).selectOption('resistance');await page.getByRole('button',{name:'Keep subject',exact:true}).click();await expect(header(page)).toContainText('The resistance');
 await edit(page,'from','state-empty');await page.getByRole('textbox',{name:'State · optional',exact:true}).fill('Survive');await page.getByLabel('Connect to a building block').selectOption('new');await page.getByLabel('Type of change').selectOption('want');await page.getByRole('button',{name:'Keep state',exact:true}).click();
 await edit(page,'to','state-empty');await page.getByRole('textbox',{name:'State · optional',exact:true}).fill('Take power');await page.getByRole('button',{name:'Keep state',exact:true}).click();p=await snapshot(page);expect(p.world.find(w=>w.id==='resistance').faction.changes).toHaveLength(2);expect(p.characters[0].changes).toHaveLength(4);
});
test('beats are dividers with working edits, and archived writing routes lead to Refine without losing prose',async({page})=>{
 await load(page);const before=await snapshot(page);await expect(page.getByRole('tab')).toHaveText(['Outline','Chronology','Sequence','Refine','Choices']);
 const beat=page.locator('[data-node=ui-node-1]');const style=await beat.evaluate(el=>{const s=getComputedStyle(el);return {radius:s.borderRadius,shadow:s.boxShadow,left:s.borderLeftWidth,top:s.borderTopWidth};});expect(style).toEqual({radius:'0px',shadow:'none',left:'0px',top:'1px'});
 await beat.locator('[data-action=select-node]').click();await expect(page.locator('.inspector')).toBeVisible();await expect(page.getByRole('button',{name:'Write this piece',exact:true})).toHaveCount(0);await page.locator('.inspector [data-action=write-node]').click();await expect(page.getByRole('tab',{name:'Refine',exact:true})).toHaveAttribute('aria-selected','true');await expect(page.getByLabel('Beat plan')).toBeVisible();expect((await snapshot(page)).nodes[1].prose).toEqual(before.nodes[1].prose);
 await page.evaluate(()=>{const b=document.createElement('button');b.dataset.action='story-view';b.dataset.id='read';document.body.append(b);b.click();b.remove();});await expect(page.getByRole('tab',{name:'Refine',exact:true})).toHaveAttribute('aria-selected','true');
});
test('forking a starting state creates two independently editable outcomes',async({page})=>{
 await load(page);await header(page).locator('[data-arc-row=state-status] [data-action=arc-fork]').click();await page.getByRole('textbox',{name:'State · optional',exact:true}).fill('Wanted by the law');await expect(page.getByRole('combobox',{name:'Connect to a building block',exact:true})).toHaveValue('new');await page.getByRole('button',{name:'Keep state',exact:true}).click();
 const h=header(page),row=h.locator('[data-arc-row=state-status]');await expect(row.locator('[data-edge=from]')).toHaveCount(1);await expect(row.locator('[data-edge=to]')).toHaveCount(2);await expect(row).toContainText('Communist agent');await expect(row).toContainText('Wanted by the law');
 const p=await snapshot(page);expect(p.characters[0].changes).toHaveLength(3);expect(p.characters[0].changes[0].block.text).toBe('Communist agent');
 if(page.viewportSize().width===390)expect((await row.locator('[data-edge=from]').boundingBox()).width).toBeGreaterThan(115);
 await row.locator('[data-edge=to]').last().click();await page.getByRole('textbox',{name:'State · optional',exact:true}).fill('Pursued across the city');await page.getByRole('button',{name:'Keep state',exact:true}).click();await expect(row).toContainText('Communist agent');await expect(row).toContainText('Pursued across the city');
 await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();await expect(header(page)).toContainText('Pursued across the city');
 await page.screenshot({path:'/tmp/arc-fork-'+test.info().project.name+'.png'});
});
test('the compact connection builder labels both sides and preserves optional details',async({page})=>{
 await load(page);await page.locator('[data-nav=connections]').first().click();await page.locator('[data-action=new-connection]').first().click();
 const dialog=page.locator('#dialog');await expect(dialog.locator('.connection-builder')).toBeVisible();await expect(dialog.locator('[name=aWant]')).not.toBeVisible();await expect(dialog.locator('[type=submit]')).toBeVisible();
 await dialog.locator('[name=label]').fill('is hunted by');await dialog.locator('[name=b]').selectOption('ui-other');await expect(dialog.locator('#connection-preview')).toContainText('Liu Jun · is hunted by · Ocelot');
 await dialog.getByText('Wants & tensions',{exact:true}).click();await page.getByRole('textbox',{name:'What Liu Jun wants',exact:true}).fill('Stay hidden');await page.getByRole('textbox',{name:'What Ocelot wants',exact:true}).fill('Capture Liu Jun');await page.getByRole('button',{name:'Keep connection',exact:true}).click();
 let p=await snapshot(page);expect(p.connections[0].aWant).toBe('Stay hidden');expect(p.connections[0].bWant).toBe('Capture Liu Jun');await page.locator('[data-action=edit-connection]').first().click();await dialog.getByText('Wants & tensions',{exact:true}).click();await expect(page.getByRole('textbox',{name:'What Liu Jun wants',exact:true})).toHaveValue('Stay hidden');
 await page.getByRole('button',{name:'Swap connection sides',exact:true}).click();await expect(dialog.locator('[name=a]')).toHaveValue('ui-other');await expect(dialog.locator('[name=aWant]')).toHaveValue('Capture Liu Jun');await page.getByRole('button',{name:'Keep connection',exact:true}).click();p=await snapshot(page);expect(p.connections[0].a).toBe('ui-other');expect(p.connections[0].aWant).toBe('Capture Liu Jun');
 await page.locator('[data-action=edit-connection]').first().click();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width+1);const results=await new AxeBuilder({page}).include('#dialog').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(results.violations).toEqual([]);await page.screenshot({path:'/tmp/connection-builder-'+test.info().project.name+'.png'});
});
