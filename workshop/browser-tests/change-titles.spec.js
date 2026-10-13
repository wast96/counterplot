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
test('titles edit independently of recorded changes and survive undo and reload',async({page})=>{
 await load(page);const before=await snapshot(page);await refine(page,'ui-node-1');await expect(page.getByRole('button',{name:'Name from a change',exact:true})).toHaveCount(0);
 await page.getByLabel('Refine title').fill('A freely edited title');await page.getByLabel('Beat plan').click();await expect.poll(async()=>(await snapshot(page)).nodes[1].title).toBe('A freely edited title');
 await page.locator('.topbar [data-action=undo]').click();await expect(page.getByLabel('Refine title')).toHaveValue(before.nodes[1].title);await page.locator('.topbar [data-action=redo]').click();await expect(page.getByLabel('Refine title')).toHaveValue('A freely edited title');
 const after=await snapshot(page);for(const key of ['characters','timeline','world','connections'])expect(after[key]).toEqual(before[key]);await expect(page.locator('.refine-piece [data-beat-inline]').first()).toHaveValue('curiosity');
 await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();await refine(page,'ui-node-1');await expect(page.getByLabel('Refine title')).toHaveValue('A freely edited title');
});
test('all thread types and beats use free titles with no change-naming action in Outline or Refine',async({page})=>{
 await load(page);await page.locator('[data-node=ui-node-0] > .node-head [data-action=select-node]').click();
 for(const type of ['M','I','C','E']){await page.locator(`.inspector [data-action=node-type][data-type=${type}]`).click();await expect(page.locator('[data-action=name-from-change]')).toHaveCount(0);await expect(page.locator('[data-node=ui-node-0] > .node-head [data-field=title]')).toBeVisible();}
 if(await page.locator('#details-sheet[open]').count())await page.locator('#details-sheet [data-action=collapse-inspector]').click();
 for(const id of ['ui-node-0','ui-node-1']){await refine(page,id);await expect(page.locator('[data-action=name-from-change]')).toHaveCount(0);await page.getByLabel('Refine title').fill('');await page.locator('.refine-plan textarea').click();await expect(page.getByLabel('Refine title')).toHaveValue('');}
});
test('recording World and connection changes keeps them visible without renaming the beat',async({page})=>{
 await load(page);const before=await snapshot(page);await refine(page,'ui-node-1');await page.locator('.refine-piece [data-action=consequences]').click();
 await page.locator('#dialog summary').filter({hasText:'World state'}).click();await page.getByLabel('the blood pearl',{exact:true}).fill('discovered');
 await page.locator('#dialog summary').filter({hasText:'Connections'}).click();await page.getByLabel('strangers',{exact:true}).fill('uneasy allies');await page.getByRole('button',{name:'Keep consequences',exact:true}).click();
 await expect(page.locator('#dialog')).not.toBeVisible();await expect(page.locator('.refine-piece [data-beat-inline][data-change="world:ui-pearl"]')).toHaveValue('discovered');await expect(page.locator('.refine-piece [data-beat-inline][data-change="connection:bond:bond"]')).toHaveValue('uneasy allies');
 const p=await snapshot(page);expect(p.nodes[1].title).toBe(before.nodes[1].title);expect(p.world[0].stateChanges[0].at).toBe('ui-node-1:open');expect(p.connections[0].changes[0].at).toBe('ui-node-1:open');await expect(page.locator('[data-action=name-from-change]')).toHaveCount(0);
});
