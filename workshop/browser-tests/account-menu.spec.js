const {test,expect}=require('@playwright/test');
const fixture=require('./ui-fixture.cjs');

test('profile menu follows Save a copy and keeps save status informational',async({page},testInfo)=>{
 let workspace=fixture(),revision=1;
 await page.route('**/api/auth/session',r=>r.fulfill({json:{user:'profile-test',email:'winston.writer@example.test'}}));
 await page.route('**/api/workspace',async r=>{if(r.request().method()==='PUT'){workspace=r.request().postDataJSON().workspace;revision++;}await r.fulfill({json:{workspace,revision}});});
 await page.goto('/');await expect(page.locator('#account-status')).toHaveText('Saved across devices');
 const trigger=page.getByLabel('Account menu',{exact:true});await expect(trigger).toContainText('WW');
 expect(await page.locator('.account-sync-status').evaluate(el=>!!el.closest('button,a,summary,[data-action]'))).toBe(false);
 const save=await page.getByRole('button',{name:'Save a copy',exact:true}).boundingBox(),avatar=await trigger.boundingBox();expect(avatar.x).toBeGreaterThan(save.x+save.width);
 await page.locator('.account-sync-status').click();await expect(page.locator('.account-popover')).not.toBeVisible();
 await trigger.click();await expect(page.locator('.account-identity')).toContainText('winston.writer@example.test');await expect(page.getByRole('button',{name:'Sign out',exact:true})).toBeVisible();
 await page.screenshot({path:testInfo.outputPath('account-menu.png')});await page.keyboard.press('Escape');await expect(trigger).toBeFocused();await expect(page.locator('.account-popover')).not.toBeVisible();
 await trigger.click();await page.getByRole('button',{name:'Account & sync settings',exact:true}).click();await expect(page.locator('#dialog')).toBeVisible();await expect(page.locator('.account-popover')).not.toBeVisible();await page.getByRole('button',{name:'Close dialog',exact:true}).click();
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:900});await trigger.click();const box=await page.locator('.account-popover').boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);await page.locator('.page-head h1').click();await expect(page.locator('.account-popover')).not.toBeVisible();}
});

test('guest profile menu provides sign in and account creation',async({page})=>{
 await page.goto('/');await page.getByLabel('Account menu',{exact:true}).click();await expect(page.getByRole('button',{name:'Create account',exact:true})).toBeVisible();await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.locator('#dialog [name=email]')).toBeVisible();await expect(page.locator('#dialog [name=password]')).toBeVisible();
});
