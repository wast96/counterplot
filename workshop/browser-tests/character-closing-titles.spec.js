const {test,expect}=require('@playwright/test');
const fixture=require('./ui-fixture.cjs');

test('character moments follow closing titles, including edits and untitled fallbacks',async({page})=>{
 const data=fixture(),thread=data.projects[0].nodes[0];
 thread.closingTitle='The police beat the thief';
 await page.goto('/');
 await page.locator('#import-file').setInputFiles({name:'closing-titles.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
 await page.locator('[data-action=accept-import]').click();
 await expect(page.locator('#dialog')).not.toBeVisible();
 const characters=()=>page.locator('[data-nav=characters]').click();
 const closing=page.locator('.time-stop[data-id="ui-node-0:close"]');
 await characters();
 await expect(page.locator('.time-stop[data-id="ui-node-0:open"] span')).toHaveText(thread.title);
 await expect(closing.locator('span')).toHaveText(thread.closingTitle);
 await closing.click();
 await expect(page.locator('.state-caption')).toContainText('Closing · '+thread.closingTitle);
 await expect(page.locator('.character-profile')).toContainText('Closing · '+thread.closingTitle);
 for(const title of ['An escape & a new beginning','']){
  await page.locator('[data-nav=outline]').click();
  await page.locator('[data-node="ui-node-0"] [data-field=closingTitle]').fill(title);
  await page.keyboard.press('Tab');
  await characters();
  await expect(closing.locator('span')).toHaveText(title||thread.title);
  await closing.click();
  await expect(page.locator('.state-caption')).toContainText('Closing · '+(title||thread.title));
  await page.reload();await characters();
  await expect(closing.locator('span')).toHaveText(title||thread.title);
 }
});
