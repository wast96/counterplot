const {test,expect}=require('@playwright/test');
const W=require('../src/integration.js'),fixture=require('./ui-fixture.cjs');
const snapshot=page=>page.evaluate(()=>{const d=CounterplotTutorial.snapshot();return d.projects.find(p=>p.id===d.active);});
async function load(page){
 const data=fixture(),p=data.projects[0],c=p.characters[0],b=W.block('belief');b.id='trust';b.text='distrust';c.blocks=[b];
 c.changes=[['ui-node-1:open','curiosity'],['ui-node-0:close','trust']].map(([at,text],i)=>({id:'trust-'+i,at,momentId:W.momentId(p,at),blockId:b.id,op:'develop',block:{...b,text},reason:''}));
 p.world[0].stateValue='hidden';p.connections=[{id:'bond',a:c.id,b:p.characters[1].id,label:'strangers',notes:''}];
 await page.goto('/');await expect(page.locator('.story-viewbar')).toBeVisible();
 await page.locator('#import-file').setInputFiles({name:'changes.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await page.locator('[data-action=accept-import]').click();await expect(page.locator('#dialog')).not.toBeVisible();
}
async function refine(page,id){await page.getByRole('tab',{name:'Refine',exact:true}).click();await page.locator(`.moment-navigation [data-action=refine-node][data-id=${id}][data-edge=open]`).click();}
const nameButton=page=>page.locator('.refine-piece [data-action=name-from-change]');
test('a beat names its intermediate change and its thread names the whole shift; undo and reload preserve state',async({page})=>{
 await load(page);const before=await snapshot(page);
 await refine(page,'ui-node-1');await nameButton(page).click();await expect(page.getByRole('textbox',{name:'From',exact:true})).toHaveValue('distrust');await expect(page.getByRole('textbox',{name:'To',exact:true})).toHaveValue('curiosity');await expect(page.locator('#change-title-preview')).toHaveText('From distrust to curiosity');await page.getByRole('button',{name:'Use this title',exact:true}).click();
 await expect(page.getByLabel('Refine title')).toHaveValue('From distrust to curiosity');
 await refine(page,'ui-node-0');await nameButton(page).click();await expect(page.getByRole('textbox',{name:'To',exact:true})).toHaveValue('trust');await page.getByRole('button',{name:'Use this title',exact:true}).click();
 const after=await snapshot(page);expect(after.characters).toEqual(before.characters);expect(after.timeline).toEqual(before.timeline);expect(after.world).toEqual(before.world);expect(after.connections).toEqual(before.connections);
 await page.locator('.topbar [data-action=undo]').click();await expect(page.getByLabel('Refine title')).toHaveValue(before.nodes[0].title);await page.locator('.topbar [data-action=redo]').click();await expect(page.getByLabel('Refine title')).toHaveValue('From distrust to trust');
 await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();await refine(page,'ui-node-1');await expect(page.getByLabel('Refine title')).toHaveValue('From distrust to curiosity');
 await page.getByLabel('Refine title').fill('A freely edited title');await page.getByLabel('Beat plan').click();await expect.poll(async()=> (await snapshot(page)).nodes[1].title).toBe('A freely edited title');
});
test('manual state naming is optional for every thread type and a beat',async({page})=>{
 await load(page);await refine(page,'ui-node-1');await nameButton(page).click();await page.getByLabel('Start with a recorded change').selectOption('');await expect(page.getByRole('button',{name:'Use this title',exact:true})).toBeDisabled();await page.getByRole('textbox',{name:'From',exact:true}).fill('a fragile truce');await page.getByRole('textbox',{name:'To',exact:true}).fill('open conflict');await page.getByRole('button',{name:'Use this title',exact:true}).click();await expect(page.getByLabel('Refine title')).toHaveValue('From a fragile truce to open conflict');
 const after=await snapshot(page);expect(after.characters[0].changes).toHaveLength(2);expect(after.nodes[1].status).toBe('open');
 await page.getByRole('tab',{name:'Outline',exact:true}).click();await page.locator('[data-node=ui-node-0] > .node-head [data-action=select-node]').click();
 for(const type of ['M','I','E']){await page.locator(`.inspector [data-action=node-type][data-type=${type}]`).click();await expect(page.locator('.inspector [data-action=name-from-change]')).toBeVisible();}
});
test('beats record world and connection steps and offer both as titles on desktop and mobile',async({page})=>{
 await load(page);await refine(page,'ui-node-1');await page.locator('.refine-piece [data-action=consequences]').click();
 await page.locator('#dialog summary').filter({hasText:'World state'}).click();await page.getByLabel('the blood pearl',{exact:true}).fill('discovered');
 await page.locator('#dialog summary').filter({hasText:'Connections'}).click();await page.getByLabel('strangers',{exact:true}).fill('uneasy allies');await page.getByRole('button',{name:'Keep consequences',exact:true}).click();
 await expect(page.locator('#dialog')).not.toBeVisible();await nameButton(page).click();await page.getByLabel('Start with a recorded change').selectOption('world:ui-pearl');await expect(page.locator('#change-title-preview')).toHaveText('From hidden to discovered');
 await page.getByLabel('Start with a recorded change').selectOption('connection:bond:bond');await expect(page.locator('#change-title-preview')).toHaveText('From strangers to uneasy allies');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width+1);
 await page.getByRole('button',{name:'Use this title',exact:true}).click();const p=await snapshot(page);expect(p.world[0].stateChanges[0].at).toBe('ui-node-1:open');expect(p.connections[0].changes[0].at).toBe('ui-node-1:open');expect(p.nodes[1].title).toBe('From strangers to uneasy allies');
});
