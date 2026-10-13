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
