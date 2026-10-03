import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const base=process.env.TEST_SERVER_URL;
const fixture=JSON.parse(await readFile(new URL('./fixtures/rich-v2-workspace.json',import.meta.url),'utf8'));

test('confirmed deletion and Undo synchronize with a second device without losing nested pieces or prose',async({browser})=>{
 test.skip(!base,'Requires isolated Pages/D1 server');test.setTimeout(60000);
 const a=await browser.newContext({ignoreHTTPSErrors:true}),email='mice-delete-'+crypto.randomUUID()+'@example.test';
 const registration=await a.request.post(base+'/api/auth/register',{headers:{Origin:base},data:{email,password:'Synthetic outline deletion passphrase 123'}});expect(registration.status()).toBe(201);
 const page=await a.newPage();await page.goto(base);await expect(page.locator('.sync-panel')).toBeHidden();
 const w=structuredClone(fixture);w.projects[0].drafts=[];await page.evaluate(w=>{counterplotBridge.replace(w);counterplotSync.enqueue(counterplotDiagnostics.snapshot());},w);
 const saved=async()=>{await page.evaluate(()=>counterplotSync.flush());await expect(page.locator('#save-status')).toHaveText('Saved across devices');};await saved();
 const b=await browser.newContext({ignoreHTTPSErrors:true,storageState:await a.storageState()}),second=await b.newPage();await second.goto(base);await expect(second.locator('.sync-panel')).toBeHidden();const before=await second.evaluate(()=>counterplotDiagnostics.snapshot().projects[0]);
 await page.locator('[data-nav=structure]').click();await page.locator(`#thread-${before.structure[0].id} > header .mice-delete-control`).click();await page.locator('[data-action=mice-remove]').click();await saved();await second.evaluate(()=>dispatchEvent(new Event('focus')));await expect.poll(async()=>second.evaluate(()=>counterplotDiagnostics.snapshot().projects[0].structure.length)).toBe(1);
 const after=await second.evaluate(()=>counterplotDiagnostics.snapshot().projects[0]);expect(after.structure[0].id).toBe(before.structure[1].id);expect(after.structure[0].parentId).toBe('');expect(after.scenes).toEqual(before.scenes);expect(after.characters).toEqual(before.characters);
 await page.locator('[data-action=undo]:visible').first().click();await saved();await second.reload();await expect(second.locator('.sync-panel')).toBeHidden();expect(await second.evaluate(()=>counterplotDiagnostics.snapshot().projects[0].structure)).toEqual(before.structure);await a.close();await b.close();
});
