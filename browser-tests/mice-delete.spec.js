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

test('direct deletion is immediate, preserves nested pieces and history, and supports Undo/Redo and reload',async({page})=>{
 const before=await snapshot(page);await page.locator(`#thread-${parent} > header .mice-delete-control`).click();await expect(page.locator('#dialog')).toBeHidden();const after=await snapshot(page);expect(after.structure.map(n=>n.id)).toEqual([beat]);expect(after.structure[0].parentId).toBe('');expect(after.characters).toEqual(before.characters);expect(after.scenes[0].miceId).toBe('');expect(after.moments[0].nodeId).toBe('');
 await action(page,'undo').click();expect((await snapshot(page)).structure).toEqual(before.structure);expect((await snapshot(page)).scenes).toEqual(before.scenes);await action(page,'redo').click();await page.reload();expect((await snapshot(page)).structure).toEqual(after.structure);
});
async function drag(page,source,target){await source.scrollIntoViewIfNeeded();const h=await source.boundingBox(),t=await target.boundingBox();await page.mouse.move(h.x+h.width/2,h.y+h.height/2);await page.mouse.down();await page.mouse.move(t.x+t.width/2,t.y+t.height/2,{steps:12});await page.mouse.up();}
test('toolbar groups MICE, Beat and archive/delete; delete tray supports repeated deletion without confirmation',async({page})=>{
 expect(await page.locator('.mice-palette-items button').evaluateAll(es=>es.map(e=>e.dataset.miceNewType||e.dataset.action))).toEqual(['M','I','C','E','beat','mice-archive-tray','mice-trash']);await expect(page.locator('.mice-palette-separator')).toHaveCount(2);
 await action(page,'mice-trash').click();await page.locator(`.mice-storage [data-id="${parent}"]`).click();expect((await snapshot(page)).structure.map(n=>n.id)).toEqual([beat]);await page.locator(`.mice-storage [data-id="${beat}"]`).click();expect((await snapshot(page)).structure).toEqual([]);await expect(page.locator('#dialog')).toBeHidden();await expect(page.locator('.mice-storage')).toContainText('No blocks here');await action(page,'undo').click();expect((await snapshot(page)).structure).toHaveLength(1);
});
test('dragging a block to trash deletes immediately and keeps its children',async({page})=>{
 await drag(page,page.locator(`[data-mice-handle="${parent}"]`),action(page,'mice-trash'));expect((await snapshot(page)).structure.map(n=>n.id)).toEqual([beat]);await expect(page.locator('#dialog')).toBeHidden();
});
test('archive persists full branches and links across reload, restores by dragging, and supports Undo',async({page})=>{
 const before=await snapshot(page);await drag(page,page.locator(`[data-mice-handle="${parent}"]`),action(page,'mice-archive-tray'));let after=await snapshot(page);expect(after.structure.every(n=>n.archived)).toBe(true);expect(after.scenes).toEqual(before.scenes);expect(after.moments).toEqual(before.moments);expect(after.characters).toEqual(before.characters);await expect(page.locator('.mice-board [data-mice-handle]')).toHaveCount(0);
 await page.reload();await action(page,'mice-archive-tray').click();await expect(page.locator('.mice-storage [data-mice-handle]')).toHaveCount(1);
 await drag(page,page.locator(`.mice-storage [data-mice-handle="${parent}"]`),page.locator('[data-mice-root=start]'));after=await snapshot(page);expect(after.structure).toEqual(before.structure);expect(after.scenes).toEqual(before.scenes);await expect(page.locator(`#thread-${parent}`)).toBeVisible();await action(page,'undo').click();expect((await snapshot(page)).structure.every(n=>n.archived)).toBe(true);await action(page,'mice-archive-tray').click();await action(page,'mice-restore').click();expect((await snapshot(page)).structure).toEqual(before.structure);
});
test('archived blocks can be placed by keyboard and do not reappear in plot or chronology views',async({page})=>{
 await drag(page,page.locator(`[data-mice-handle="${parent}"]`),action(page,'mice-archive-tray'));await action(page,'mice-storage-close').click();await page.locator('[data-action=structure-view][data-mode=chronology]').click();await expect(page.locator('[data-action=edit-thread]')).toHaveCount(0);await page.locator('[data-action=structure-view][data-mode=structure]').click();await action(page,'mice-archive-tray').click();const handle=page.locator('.mice-storage [data-mice-handle]');await handle.focus();await page.keyboard.press('Enter');await page.locator('[data-mice-root=start] [data-action=mice-place]').click();expect((await snapshot(page)).structure.every(n=>!n.archived)).toBe(true);
});
test('new palette pieces cannot be dropped into archive or trash',async({page})=>{const before=await snapshot(page);for(const name of ['mice-archive-tray','mice-trash'])await drag(page,page.locator('[data-mice-new-type=I]'),action(page,name));expect(await snapshot(page)).toEqual(before);});
test('delete controls fit narrow, landscape and nested layouts; floating tray clears the last block and remains accessible',async({page},info)=>{
 for(const [width,height]of [[1440,1000],[768,1024],[390,844],[320,640],[844,390]]){
  await page.setViewportSize({width,height});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const button of await page.locator('.mice-delete-control').all()){const b=await button.boundingBox();expect(b.width).toBeGreaterThanOrEqual(24);expect(b.height).toBeGreaterThanOrEqual(24);expect(b.x+b.width).toBeLessThanOrEqual(width);}
  await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));const g=await page.locator('.mice-palette').evaluate(e=>({position:getComputedStyle(e).position,top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom}));expect(g.position).toBe('fixed');expect(height-g.bottom).toBeGreaterThanOrEqual(0);expect(height-g.bottom).toBeLessThan(30);expect(await page.locator('[data-mice-root=end]').evaluate(e=>e.getBoundingClientRect().bottom)).toBeLessThan(g.top);await page.screenshot({path:info.outputPath(`outline-${width}.png`)});
 }
 await page.setViewportSize({width:390,height:844});expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);await action(page,'mice-trash').click();expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
});

test('character picker puts custom last and headings share spacing',async({page})=>{
 await page.locator('[data-nav=characters]').click();
 const gap=()=>page.locator('.page-heading').evaluate(e=>e.querySelector('h1').getBoundingClientRect().top-e.querySelector('.eyebrow').getBoundingClientRect().bottom);
 const blocks=await gap();await page.locator('[data-action=character-tab][data-tab=evolution]').click();expect(Math.abs(await gap()-blocks)).toBeLessThan(1);
 await page.locator('[data-action=character-tab][data-tab=blocks]').click();await page.getByRole('button',{name:/Add a building block/}).click();expect(await page.locator('.kind-option').evaluateAll(es=>es.slice(-3).map(e=>e.dataset.kind))).toEqual(['fear','mask','custom']);
});
