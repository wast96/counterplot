const {test,expect}=require('@playwright/test');
const W=require('../src/integration.js');
const {fixture,load}=require('../../docs/audits/2026-10-13-beat-board-sweep/audit.cjs');
const snapshot=page=>page.evaluate(()=>{const d=CounterplotTutorial.snapshot();return d.projects.find(p=>p.id===d.active);});
async function open(page){await page.locator('[data-node=beat] [data-action=record-piece-state]').click();await page.getByRole('button',{name:'Life, world & connection options',exact:true}).click();}
test('consequences save with custom colors, undo as a batch, and persist after reload',async({page})=>{
 const data=fixture();data.swatches=[{id:'sea-glass',name:'Sea glass',hex:'#b9ebdd'}];data.projects[0].nodes[0].color='sea-glass';await load(page,data);const before=await snapshot(page);
 await open(page);await page.getByRole('combobox',{name:'Liu Jun',exact:true}).selectOption('dead');await page.locator('#dialog summary').filter({hasText:'World state'}).click();await page.getByLabel('Shanghai',{exact:true}).fill('Under siege');await page.getByRole('button',{name:'Keep consequences',exact:true}).click();await expect(page.locator('#dialog')).not.toBeVisible();
 let saved=await snapshot(page);expect(saved.characters[0].lifeChanges.at(-1)).toMatchObject({status:'dead',at:'beat:open'});expect(saved.world[0].stateChanges.at(-1)).toMatchObject({value:'Under siege',at:'beat:open'});
 await page.locator('.topbar [data-action=undo]').click();expect((await snapshot(page)).characters).toEqual(before.characters);expect((await snapshot(page)).world).toEqual(before.world);
 await page.locator('.topbar [data-action=redo]').click();await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();await expect(page.locator('.story-viewbar')).toBeVisible();expect((await snapshot(page)).characters).toEqual(saved.characters);expect((await snapshot(page)).world).toEqual(saved.world);
});
test('empty sections explain prerequisites and incomplete consequences are not silently saved',async({page})=>{
 const data=fixture();data.projects[0].world=data.projects[0].world.filter(w=>w.type==='place');data.projects[0].connections=[];await load(page,data);const before=await snapshot(page);await open(page);
 for(const [title,hint]of [['Connections','Add a connection'],['Knowledge and reader disclosure','Add a fact'],['Faction pieces','Add pieces to a group']]){const section=page.locator('#dialog details').filter({has:page.locator('summary',{hasText:title})});await section.locator('summary').click();await expect(section.locator('.help')).toContainText(hint);}
 await page.getByRole('button',{name:'Keep consequences',exact:true}).click();await expect(page.locator('#form-error')).toContainText('Choose at least one consequence');expect({...await snapshot(page),drafts:[]}).toEqual({...before,drafts:[]});
 await page.locator('#dialog summary').filter({hasText:'Character pieces'}).click();await page.getByLabel('New words for Liu Jun',{exact:true}).fill('A new belief');await page.getByRole('button',{name:'Keep consequences',exact:true}).click();await expect(page.locator('#form-error')).toContainText('Choose a piece and enter its new words');expect({...await snapshot(page),drafts:[]}).toEqual({...before,drafts:[]});
});
test('closings show local changes without repeating states inherited from nested beats',async({page})=>{
 const data=fixture(),p=data.projects[0],n=p.nodes.find(n=>n.id==='event');W.setPieceState(p,n,'block:jun:want','close','Find shelter');await load(page,data);
 await expect(page.locator('[data-recorded-node=event][data-recorded-edge=close] [data-piece-state]')).toHaveCount(1);await expect(page.locator('[data-recorded-node=event][data-recorded-edge=close] textarea')).toHaveValue('Find shelter');
 for(const id of ['milieu','inquiry','arc'])await expect(page.locator(`[data-recorded-node=${id}][data-recorded-edge=close] [data-piece-state]`)).toHaveCount(0);
 await expect(page.locator('[data-node=beat] [data-beat-inline]').first()).toHaveValue('The city is dangerous');await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();await expect(page.locator('[data-recorded-node=event][data-recorded-edge=close] textarea')).toHaveValue('Find shelter');
});
