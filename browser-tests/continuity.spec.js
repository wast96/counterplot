import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../index.html',import.meta.url),'utf8');
const rich=JSON.parse(await readFile(new URL('./fixtures/rich-v2-workspace.json',import.meta.url),'utf8'));
const action=(p,n)=>p.locator(`[data-action=${n}]:visible`).first();
async function local(page){await page.route('http://continuity.test/',r=>r.fulfill({contentType:'text/html',body:source.replace('data-hosted="true"','data-hosted="false"')}));await page.goto('http://continuity.test/');const w=structuredClone(rich);w.projects[0].drafts=[];await page.evaluate(w=>counterplotBridge.replace(w),w);}

test('application undo and redo reconcile the open scene instead of re-saving undone words',async({page})=>{
 await local(page);await action(page,'edit-scene').click();const original=await page.locator('[data-draft=notes]').inputValue();await page.locator('[data-draft=notes]').fill('The ending to undo.');await action(page,'undo').click();await expect(page.locator('[data-draft=notes]')).toHaveValue(original);await action(page,'redo').click();await expect(page.locator('[data-draft=notes]')).toHaveValue('The ending to undo.');await action(page,'undo').click();await action(page,'save-scene').click();await page.reload();expect(await page.evaluate(()=>counterplotDiagnostics.snapshot().projects[0].scenes[0].notes)).toBe(original);
});

test('a clean open scene receives a remote edit and unchanged Done does not overwrite or write a revision',async({page})=>{
 let workspace=structuredClone(rich),revision=1,writes=0;workspace.schema=3;workspace.projects[0].drafts=[];
 await page.route('http://reconcile.test/**',r=>{const path=new URL(r.request().url()).pathname;if(path==='/api/auth/session')return r.fulfill({json:{user:'owner',email:'writer@example.test'}});if(path==='/api/auth/recovery')return r.fulfill({json:{remaining:8}});if(path==='/api/workspace'){if(r.request().method()==='PUT'){writes++;workspace=r.request().postDataJSON().workspace;revision++;}return r.fulfill({json:{owner:'owner',workspace,revision}});}return r.fulfill({contentType:'text/html',body:source});});
 await page.goto('http://reconcile.test/');await page.locator('.sync-panel').waitFor({state:'hidden'});await action(page,'edit-scene').click();await action(page,'save-scene').focus();workspace=structuredClone(workspace);workspace.projects[0].scenes[0].notes='A newer ending from another device.';revision++;
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(page.locator('[data-draft=notes]')).toHaveValue('A newer ending from another device.');await action(page,'save-scene').click();await page.evaluate(()=>counterplotSync.flush());expect(writes).toBe(0);expect(workspace.projects[0].scenes[0].notes).toBe('A newer ending from another device.');
 for(let i=0;i<3;i++){await action(page,'edit-scene').click();await action(page,'save-scene').click();await page.evaluate(()=>counterplotSync.flush());}expect(writes).toBe(0);
});

test('a named fragment needs neither prose nor an assumed viewpoint',async({page})=>{
 await local(page);await action(page,'new-blank-scene').click();await expect(page.locator('[data-draft=focus]')).toHaveValue('');await page.locator('[data-draft=title]').fill('A scene not understood yet');await action(page,'save-scene').click();await page.reload();expect(await page.evaluate(()=>counterplotDiagnostics.snapshot().projects[0].scenes.at(-1))).toMatchObject({title:'A scene not understood yet',notes:'',focus:''});
});
