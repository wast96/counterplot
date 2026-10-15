const {test,expect}=require('@playwright/test');
const AxeBuilder=require('@axe-core/playwright').default;
const path=require('node:path');
async function load(page){await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await expect(page.locator('.story-viewbar')).toBeVisible();await page.locator('#import-file').setInputFiles(path.resolve(__dirname,'../../browser-tests/fixtures/rich-v2-workspace.json'));await page.locator('[data-action=accept-import]').click();await expect(page.locator('#dialog')).not.toBeVisible();}
test('editors start at their first field and keyboard navigation wraps in both directions',async({page})=>{
 await load(page);await page.locator('[data-nav=characters]').click();await page.getByRole('button',{name:'New character',exact:true}).click();
 const dialog=page.locator('#dialog'),name=dialog.locator('[name=name]');await expect(name).toBeFocused();
 const controls=()=>dialog.locator('button,input,select,textarea,a[href],[tabindex],summary').filter({visible:true});
 const first=controls().first(),last=controls().last();await last.focus();await page.keyboard.press('Tab');await expect(first).toBeFocused();await page.keyboard.press('Shift+Tab');await expect(last).toBeFocused();
 for(let i=0;i<24;i++){await page.keyboard.press('Tab');expect(await page.evaluate(()=>!!document.activeElement.closest('#dialog'))).toBe(true);}
 await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'New character',exact:true})).toBeFocused();
 await page.locator('[data-nav=world]').click();await page.locator('.world-card h2 button').first().click();await expect(dialog.locator('[name=name]')).toBeFocused();
 await page.keyboard.press('Escape');await expect(page.locator('.world-card h2 button').first()).toBeFocused();
});
test('block picker is readable and opening a block focuses its editable label',async({page})=>{
 await load(page);await page.locator('[data-nav=characters]').click();await page.getByRole('button',{name:'Add block',exact:true}).click();
 await expect(page.locator('#kind-search')).toBeFocused();
 const scan=await new AxeBuilder({page}).include('#dialog').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(scan.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
 await page.locator('#kind-search').fill('belief');await page.locator('[data-action=choose-kind][data-id=belief]').click();await expect(page.locator('#dialog [name=label]')).toBeFocused();
 await page.locator('#dialog [name=label]').fill('Trust');await page.locator('#dialog [name=text]').fill('People deserve a second chance');await page.locator('#dialog button[type=submit]').click();await expect(page.locator('.block')).toContainText(['Trust']);
});

test('Tab leaves a type suggestion list for the next form field without losing focus',async({page})=>{
 await load(page);await page.locator('[data-action=arc-state]').first().click();
 const type=page.locator('#arc-type-input');await type.focus();await expect(page.locator('#arc-type-list')).toBeVisible();
 await page.keyboard.press('Tab');await expect(page.locator('#dialog [name=arcText]')).toBeFocused();await expect(page.locator('#arc-type-list')).not.toBeVisible();
 await page.keyboard.press('Shift+Tab');await expect(type).toBeFocused();await expect(page.locator('#arc-type-list')).toBeVisible();
 await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await expect(type).toBeFocused();await page.keyboard.press('Tab');await expect(page.locator('#dialog [name=arcText]')).toBeFocused();
});

test('short-screen keyboard focus stays above the sticky dialog actions',async({page})=>{
 await page.setViewportSize({width:320,height:568});await load(page);await page.locator('[data-nav=characters]').click();await page.locator('.block-body').first().click();
 for(let i=0;i<22;i++){
  await page.keyboard.press('Tab');
  await expect(async()=>{const focus=await page.evaluate(()=>{const el=document.activeElement,r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;return{inside:!!el.closest('#dialog'),visible:x>=0&&x<innerWidth&&y>=0&&y<innerHeight&&el.contains(document.elementFromPoint(x,y)),label:el.getAttribute('aria-label')||el.name||el.textContent.slice(0,40)}});
  expect(focus.inside,focus.label).toBe(true);expect(focus.visible,focus.label).toBe(true);}).toPass({timeout:5000});
 }
});
