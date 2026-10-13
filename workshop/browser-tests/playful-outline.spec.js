const {test,expect}=require('@playwright/test');
const W=require('../src/integration.js');
const Axe=require('@axe-core/playwright').default;
function fixture(){
 const p=W.project('Shanghai story');
 p.nodes=[['E','train','','The train arrives'],['I','mystery','train','Who took the pearl?'],['B','beat','mystery','She follows a clue'],['M','city','','Shanghai']].map(([type,id,parentId,title])=>({...W.node(type,parentId),id,title}));
 W.setThreadPlan(p.nodes[0],'from','Liu Jun is travelling to Shanghai');
 W.setThreadPlan(p.nodes[0],'focus','She notices a theft');
 W.normalize(p);return W.validate({format:'counterplot-workshop',schema:2,active:p.id,projects:[p]});
}
async function load(page){await page.goto('/');await page.locator('.outline').waitFor();await page.locator('#import-file').setInputFiles({name:'play.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture()))});await page.locator('[data-action=accept-import]').click();await expect(page.locator('#dialog')).not.toBeVisible();}
const card=(page,id)=>page.locator(`[data-node="${id}"]`);
const title=(page,id)=>card(page,id).locator(':scope > .node-head .node-title');
const menu=(page,id)=>card(page,id).locator(':scope > .node-head .piece-menu > summary');
const snapshot=page=>page.evaluate(()=>{const w=CounterplotTutorial.snapshot();return w.projects.find(p=>p.id===w.active);});
test('selecting and editing a card keeps details closed, and the panel preference survives reload',async({page})=>{
 await load(page);await expect(page.locator('.workbench-grid')).toHaveClass(/details-hidden/);
 await title(page,'beat').fill('She follows the thief');await page.keyboard.press('Tab');
 await expect(page.locator('.workbench-grid')).toHaveClass(/details-hidden/);
 await card(page,'beat').locator('[data-action=select-node]').click();await expect(page.locator('.inspector').filter({visible:true})).toBeVisible();
 await page.locator('.inspector [data-action=collapse-inspector]').filter({visible:true}).click();
 await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();await expect(title(page,'beat')).toHaveValue('She follows the thief');await expect(page.locator('.workbench-grid')).toHaveClass(/details-hidden/);
 await expect(page.locator('.tray-piece b')).toHaveText(['M','I','C','E','+']);
});
test('empty fields reveal on selection, authored fields remain readable, and optional closing notes save',async({page})=>{
 await load(page);await title(page,'train').click();await expect(card(page,'beat').getByRole('textbox',{name:'Beat Development',exact:true})).not.toBeVisible();
 await title(page,'beat').click();await card(page,'beat').getByRole('textbox',{name:'Beat Development',exact:true}).fill('The thief leaves a blood pearl behind.');await title(page,'city').click();
 await expect(card(page,'beat').getByRole('textbox',{name:'Beat Development',exact:true})).toHaveValue('The thief leaves a blood pearl behind.');await expect(card(page,'train').getByRole('textbox',{name:'Event Before',exact:true})).toBeVisible();
 await menu(page,'train').click();await card(page,'train').locator(':scope > .node-head [data-action=reveal-thread-note][data-edge=close]').click();
 const note=card(page,'train').locator(':scope > .closing .closing-note');await expect(note).toBeFocused();await note.fill('Her trust in the police begins to fracture.');await title(page,'city').click();await expect(note).toBeVisible();await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();await expect(note).toHaveValue('Her trust in the police begins to fracture.');
});
test('folding keeps nested expansion choices and the keyboard menu can set a whole branch aside and undo',async({page})=>{
 await load(page);await card(page,'mystery').locator(':scope > .node-head [data-action=fold]').click();
 await card(page,'train').locator(':scope > .node-head [data-action=fold]').click();await expect(card(page,'train').locator(':scope > .folded-count')).toHaveText('2 pieces inside');
 await card(page,'train').locator(':scope > .node-head [data-action=fold]').click();await expect(card(page,'mystery')).toHaveClass(/is-folded/);await expect(card(page,'beat')).toHaveCount(0);
 const before=await snapshot(page);await menu(page,'train').focus();await page.keyboard.press('Enter');await expect(card(page,'train').locator(':scope > .node-head .piece-menu')).toHaveAttribute('open','');await page.keyboard.press('Escape');await expect(menu(page,'train')).toBeFocused();
 await menu(page,'train').click();await card(page,'train').locator(':scope > .node-head [data-action=stash-node]').click();await expect(card(page,'train')).toHaveCount(0);await page.locator('.tray-drawer').click();await expect(page.locator('#piece-drawer')).toContainText('The train arrives');
 await page.locator('.topbar [data-action=undo]').click();expect((await snapshot(page)).nodes).toEqual(before.nodes);
});
test('drag previews describe the whole branch, identify the destination and cancel without changing the story',async({page})=>{
 await load(page);const before=await snapshot(page);await page.emulateMedia({reducedMotion:'reduce'});
 const grip=card(page,'train').locator(':scope > .node-head .grip');await grip.scrollIntoViewIfNeeded();const a=await grip.boundingBox();
 await grip.dispatchEvent('pointerdown',{button:0,pointerId:87,pointerType:'touch',clientX:a.x+8,clientY:a.y+8});await page.locator('body').dispatchEvent('pointermove',{pointerId:87,pointerType:'touch',clientX:a.x+28,clientY:a.y+8});
 await expect(page.locator('.piece-preview')).toContainText('The train arrives');await expect(page.locator('.piece-preview')).toContainText('2 pieces inside');await expect(card(page,'train')).toHaveClass(/piece-in-hand/);
 const target=card(page,'city');await target.scrollIntoViewIfNeeded();const b=await target.locator(':scope > .node-head').boundingBox();await page.locator('body').dispatchEvent('pointermove',{pointerId:87,pointerType:'touch',clientX:b.x+b.width/2,clientY:b.y+10});
 await expect(target).toHaveAttribute('data-drop-label','Inside · Shanghai');await page.keyboard.press('Escape');await expect(page.locator('.piece-preview')).toHaveCount(0);await expect(page.locator('.piece-in-hand,.landing')).toHaveCount(0);expect(await snapshot(page)).toEqual(before);
 expect((await new Axe({page}).include('#main').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
});

test('piece menus fit above the MICE bar at phone and desktop sizes',async({page})=>{
 await load(page);
 for(const width of [320,390,900,1440]){
  await page.setViewportSize({width,height:844});await menu(page,'train').click();const panel=card(page,'train').locator(':scope > .node-head .piece-menu-actions');await expect(panel).toBeVisible();await page.evaluate(()=>window.scrollBy(0,20));await expect(panel).toBeVisible();
  await expect.poll(async()=>{const r=await panel.boundingBox(),tray=await page.locator('.tray').boundingBox();return !!r&&r.x>=0&&r.x+r.width<=width+1&&r.y>=0&&r.y+r.height<=tray.y;}).toBe(true);
  await page.keyboard.press('Escape');
 }
});
