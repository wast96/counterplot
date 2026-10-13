const {test,expect}=require('@playwright/test');
const AxeBuilder=require('@axe-core/playwright').default;
const path=require('node:path');
const fixture=path.resolve(__dirname,'../../browser-tests/fixtures/rich-v2-workspace.json');
async function load(page){await page.goto('/');await expect(page.locator('.story-viewbar')).toBeVisible();await page.locator('#import-file').setInputFiles(fixture);await page.locator('[data-action=accept-import]').click();await expect(page.locator('#dialog')).not.toBeVisible();}
test('filters are discoverable, preserve keyboard focus, and can be cleared across views',async({page})=>{
 await load(page);const menu=page.locator('.story-filter-menu'),trigger=menu.locator('summary');
 await expect(menu.locator('select')).not.toBeVisible();await trigger.click();
 const cast=page.locator('#story-cast-filter');const value=await cast.locator('option').nth(1).getAttribute('value');await cast.selectOption(value);
 await expect(cast).toBeFocused();await expect(cast).toHaveValue(value);await expect(menu.locator('.filter-count')).toHaveText('1');
 await page.keyboard.press('Escape');await expect(trigger).toBeFocused();await expect(cast).not.toBeVisible();
 await page.getByRole('tab',{name:'Sequence',exact:true}).click();await expect(page.locator('.story-filter-status')).toContainText('Cast:');await trigger.click();await expect(cast).toHaveValue(value);
 await page.locator('#story-review-filter').check();await expect(page.locator('#story-review-filter')).toBeFocused();await expect(menu.locator('.filter-count')).toHaveText('2');
 await menu.getByRole('button',{name:'Clear filters',exact:true}).click();await expect(trigger).toBeFocused();await expect(page.locator('.story-filter-status')).toHaveCount(0);
 await trigger.click();await page.locator('.brand').click();await expect(cast).not.toBeVisible();
});
test('main views remain accessible and fit the viewport',async({page})=>{
 test.setTimeout(90000);await page.emulateMedia({reducedMotion:'reduce'});await load(page);
 for(const view of ['Outline','Refine','Sequence','Chronology','Choices']){
  await page.getByRole('tab',{name:view,exact:true}).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width+1);
  const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  expect(scan.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),view).toEqual([]);
 }
 for(const view of ['characters','world','connections','archive']){
  await page.locator(`[data-nav=${view}]`).first().click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width+1);
  const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  expect(scan.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),view).toEqual([]);
 }
});
test('world titles open their editor and mobile form fields stay readable',async({page})=>{
 await load(page);await page.locator('[data-nav=world]').click();const title=await page.locator('.world-card h2').first().innerText();await page.locator('.world-card h2 button').first().click();await expect(page.locator('#dialog [name=name]')).toHaveValue(title);
 if(page.viewportSize().width<=680)expect(await page.locator('#dialog [name=name]').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
 const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(scan.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
 await page.keyboard.press('Escape');await expect(page.locator('.world-card h2 button').first()).toBeFocused();
});

test('immediate filter changes do not depend on the asynchronous disclosure event',async({page})=>{
 await load(page);
 await page.evaluate(()=>{
  document.querySelector('.story-filter-menu>summary').click();
  const select=document.querySelector('#story-cast-filter');select.value=select.options[1].value;
  select.dispatchEvent(new Event('change',{bubbles:true}));
 });
 await expect(page.locator('#story-cast-filter')).toBeVisible();await expect(page.locator('#story-cast-filter')).toBeFocused();await expect(page.locator('.filter-count')).toHaveText('1');
});

test('long outline titles wrap, save on Enter, and retain undo and reload behavior',async({page})=>{
 await load(page);await page.setViewportSize({width:390,height:844});
 const title=page.locator('.node-title').first(),original=await title.inputValue();
 const value='Liu Jun follows the evidence through the old city and discovers why her father disappeared';
 await title.fill(value);await title.press('Enter');await expect(title).toHaveValue(value);
 const box=await title.boundingBox();expect(box.height).toBeGreaterThan(40);expect(await title.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 await page.locator('.topbar [data-action=undo]').click();await expect(title).toHaveValue(original);await page.locator('.topbar [data-action=redo]').click();await expect(title).toHaveValue(value);
 await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();await expect(page.locator('.node-title').first()).toHaveValue(value);
});

test('returning to the workbench reveals the active tab and ordering controls stop at list boundaries',async({page})=>{
 await load(page);await page.setViewportSize({width:390,height:844});
 await page.getByRole('tab',{name:'Outline',exact:true}).focus();await page.keyboard.press('End');await expect(page.getByRole('tab',{name:'Choices',exact:true})).toBeFocused();
 await page.locator('[data-nav=world]').first().click();await page.locator('[data-nav=outline]').first().click();
 const active=page.locator('.story-viewbar [aria-selected=true]');await expect(active).toHaveText('Choices');
 const rects=await active.evaluate(el=>[el.getBoundingClientRect(),el.parentElement.getBoundingClientRect()].map(r=>({left:r.left,right:r.right})));expect(rects[0].left).toBeGreaterThanOrEqual(rects[1].left-1);expect(rects[0].right).toBeLessThanOrEqual(rects[1].right+1);
 for(const name of ['Sequence','Chronology']){
  await page.getByRole('tab',{name,exact:true}).click();const cards=page.locator('.moment-card');
  await expect(cards.first().getByRole('button',{name:'Move earlier',exact:true})).toBeDisabled();await expect(cards.last().getByRole('button',{name:'Move later',exact:true})).toBeDisabled();
  await expect(cards.first().getByRole('button',{name:'Move later',exact:true})).toBeEnabled();
 }
});
