import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {readFile} from 'node:fs/promises';
const source=(await readFile(new URL('../index.html',import.meta.url),'utf8')).replace('data-hosted="true"','data-hosted="false"');
const rich=JSON.parse(await readFile(new URL('./fixtures/rich-v2-workspace.json',import.meta.url),'utf8'));
const parent=rich.projects[0].structure[0].id,beat=rich.projects[0].structure[1].id;
const action=(p,n)=>p.locator(`[data-action="${n}"]:visible`).first();
const snapshot=p=>p.evaluate(()=>counterplotDiagnostics.snapshot().projects[0]);
async function open(page){
 await page.route('http://delete.test/',r=>r.fulfill({contentType:'text/html',body:source}));await page.goto('http://delete.test/');
 const w=structuredClone(rich),p=w.projects[0];p.drafts=[];p.scenes[0].miceId=parent;p.scenes[0].miceRole='advance';p.moments[0].nodeId=parent;p.moments[0].edge='open';
 await page.evaluate(w=>counterplotBridge.replace(w),w);await page.locator('[data-nav=structure]').click();await action(page,'unfold-threads').click();
}
test.beforeEach(async({page})=>{page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));await open(page);});
test.afterEach(async({page})=>expect(page.errors).toEqual([]));

test('requested navigation order survives navigation, keyboard use and reload',async({page})=>{
 const order=['characters','world','connections','structure','story'];expect(await page.locator('#navigation [data-nav]').evaluateAll(es=>es.map(e=>e.dataset.nav))).toEqual(order);
 for(const key of order){const link=page.locator(`#navigation [data-nav=${key}]`);await link.focus();await page.keyboard.press('Enter');await expect(link).toHaveAttribute('aria-current','page');await expect(page.locator('#main h1').first()).toBeVisible();}
 await page.reload();expect(await page.locator('#navigation [data-nav]').evaluateAll(es=>es.map(e=>e.dataset.nav))).toEqual(order);await expect(page.locator('#navigation [data-nav=story]')).toHaveAttribute('aria-current','page');
});

test('visible block deletion requires confirmation, preserves descendants and history, and supports Undo/Redo and reload',async({page})=>{
 const before=await snapshot(page),button=page.locator(`#thread-${parent} > header .mice-delete-control`);await expect(button).toBeVisible();await button.focus();await page.keyboard.press('Enter');await expect(action(page,'mice-remove')).toBeVisible();await expect(page.getByRole('button',{name:'Cancel',exact:true})).toBeFocused();expect(await snapshot(page)).toEqual(before);await page.keyboard.press('Escape');await expect(button).toBeFocused();
 await button.click();await action(page,'mice-remove').click();let after=await snapshot(page);expect(after.structure.map(n=>n.id)).toEqual([beat]);expect(after.structure[0].parentId).toBe('');expect(after.scenes[0].notes).toBe(before.scenes[0].notes);expect(after.scenes[0].miceId).toBe('');expect(after.moments[0].nodeId).toBe('');expect(after.characters).toEqual(before.characters);expect(after.entities).toEqual(before.entities);await expect(page.locator(`#thread-${beat} .mice-delete-control`)).toBeFocused();
 await action(page,'undo').click();expect((await snapshot(page)).structure).toEqual(before.structure);expect((await snapshot(page)).scenes).toEqual(before.scenes);expect((await snapshot(page)).moments).toEqual(before.moments);await action(page,'redo').click();expect((await snapshot(page)).structure).toEqual(after.structure);await page.reload();expect((await snapshot(page)).structure).toEqual(after.structure);
});

test('floating trash follows Beat, can delete a chosen beat, and disables when the outline is empty',async({page})=>{
 const ids=await page.locator('.mice-palette-items button').evaluateAll(es=>es.map(e=>e.dataset.miceNewType||e.dataset.action));expect(ids).toEqual(['M','I','C','E','beat','mice-trash']);const before=await snapshot(page);
 await action(page,'mice-trash').click();await expect(action(page,'mice-remove')).toBeDisabled();await page.locator('[data-mice-delete-choice]').selectOption(beat);await expect(action(page,'mice-remove')).toBeEnabled();await action(page,'mice-remove').click();expect((await snapshot(page)).structure).toEqual([before.structure[0]]);expect((await snapshot(page)).scenes).toEqual(before.scenes);
 await page.locator(`#thread-${parent} .mice-delete-control`).click();await action(page,'mice-remove').click();await expect(action(page,'mice-trash')).toBeDisabled();await action(page,'undo').click();await expect(action(page,'mice-trash')).toBeEnabled();
});

test('dragging a block to trash asks before deleting and does not move or erase its children',async({page})=>{
 const before=await snapshot(page),handle=page.locator(`[data-mice-handle="${parent}"]`);await handle.scrollIntoViewIfNeeded();const h=await handle.boundingBox(),t=await action(page,'mice-trash').boundingBox();await page.mouse.move(h.x+h.width/2,h.y+h.height/2);await page.mouse.down();await page.mouse.move(t.x+t.width/2,t.y+t.height/2,{steps:12});await expect(action(page,'mice-trash')).toHaveClass(/mice-drop-target/);await page.mouse.up();await expect(action(page,'mice-remove')).toBeVisible();expect(await snapshot(page)).toEqual(before);await page.keyboard.press('Escape');expect(await snapshot(page)).toEqual(before);
});

test('deleting in a focused branch returns to a usable outline and preserves an unfinished composer',async({page})=>{
 await page.locator(`.mice-node [data-action=focus-thread][data-id="${parent}"]`).click();await page.locator(`#thread-${parent} .mice-delete-control`).click();await action(page,'mice-remove').click();await expect(page.locator(`#thread-${beat}`)).toBeVisible();await action(page,'new-thread').click();await page.locator('[data-mice-compose=opening]').fill('An unfinished idea to keep.');await action(page,'mice-trash').click();await page.locator('[data-mice-delete-choice]').selectOption(beat);await action(page,'mice-remove').click();expect((await snapshot(page)).drafts.some(d=>d.draft.opening==='An unfinished idea to keep.')).toBe(true);await expect(page.locator('[data-mice-compose=opening]')).toHaveValue('An unfinished idea to keep.');
});

test('delete controls fit narrow, landscape and nested layouts; floating tray clears the last block and remains accessible',async({page},info)=>{
 for(const [width,height]of [[1440,1000],[768,1024],[390,844],[320,640],[844,390]]){
  await page.setViewportSize({width,height});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const button of await page.locator('.mice-delete-control').all()){const b=await button.boundingBox();expect(b.width).toBeGreaterThanOrEqual(24);expect(b.height).toBeGreaterThanOrEqual(24);expect(b.x+b.width).toBeLessThanOrEqual(width);}
  await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));const g=await page.locator('.mice-palette').evaluate(e=>({position:getComputedStyle(e).position,top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom}));expect(g.position).toBe('fixed');expect(height-g.bottom).toBeGreaterThanOrEqual(0);expect(height-g.bottom).toBeLessThan(30);expect(await page.locator('[data-mice-root=end]').evaluate(e=>e.getBoundingClientRect().bottom)).toBeLessThan(g.top);await page.screenshot({path:info.outputPath(`outline-${width}.png`)});
 }
 await page.setViewportSize({width:390,height:844});expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);await action(page,'mice-trash').click();expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
});

test('closing and collapsed threads both expose deletion without opening Arrange',async({page})=>{
 await page.locator(`[data-thread-end="${parent}"] .mice-delete-control`).click();await expect(page.locator('#dialog')).toContainText('both opening and closing');await page.keyboard.press('Escape');await page.locator(`[data-action=fold-thread][data-id="${parent}"]`).click();await page.locator(`#thread-${parent} > header .mice-delete-control`).click();await action(page,'mice-remove').click();expect((await snapshot(page)).structure.map(n=>n.id)).toEqual([beat]);
});

test('Escape cancels a trash confirmation even while an add or move operation is active',async({page})=>{
 const before=await snapshot(page);
 for(const select of [()=>page.locator('[data-mice-new-type=I]').click(),()=>page.locator(`[data-mice-handle="${parent}"]`).click()]){
  await select();await action(page,'mice-trash').click();await expect(page.locator('#dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('#dialog')).toBeHidden();expect(await snapshot(page)).toEqual(before);await page.keyboard.press('Escape');
 }
});

test('dragging a new palette piece onto Trash does not create or delete anything',async({page})=>{
 const before=await snapshot(page),h=await page.locator('[data-mice-new-type=I]').boundingBox(),t=await action(page,'mice-trash').boundingBox();await page.mouse.move(h.x+h.width/2,h.y+h.height/2);await page.mouse.down();await page.mouse.move(t.x+t.width/2,t.y+t.height/2,{steps:10});await page.mouse.up();await expect(page.locator('#dialog')).toBeHidden();expect(await snapshot(page)).toEqual(before);
});

test('long unbroken block names keep both confirmation paths and Cancel reachable on small screens',async({page})=>{
 const w=structuredClone(rich);w.projects[0].structure[0].title='X'.repeat(1000);await page.evaluate(w=>counterplotBridge.replace(w),w);await page.setViewportSize({width:320,height:640});
 for(const picker of [false,true]){
  if(picker){await action(page,'mice-trash').click();await page.locator('[data-mice-delete-choice]').selectOption(parent);}else await page.locator(`#thread-${parent} > header .mice-delete-control`).click();
  await expect(page.locator('#mice-delete-selection')).toHaveText('X'.repeat(1000));for(const b of [action(page,'mice-remove'),page.getByRole('button',{name:'Cancel',exact:true})]){const box=await b.boundingBox();expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(640);}expect(await page.locator('#dialog').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);await page.keyboard.press('Escape');
 }
});
