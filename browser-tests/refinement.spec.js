import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../index.html',import.meta.url),'utf8');
const rich=JSON.parse(await readFile(new URL('./fixtures/rich-v2-workspace.json',import.meta.url),'utf8'));
const action=(p,n)=>p.locator(`[data-action=${n}]:visible`).first();
async function local(page,w=rich){await page.route('http://refinement.test/',r=>r.fulfill({contentType:'text/html',body:source.replace('data-hosted="true"','data-hosted="false"')}));await page.goto('http://refinement.test/');await page.evaluate(w=>counterplotBridge.replace(w),w);}

test('an older unfinished scene cannot overwrite newer writing; keeping both preserves links and words',async({page})=>{
 await local(page);await page.locator('[data-nav=story]').click();await action(page,'edit-scene').click();await page.locator('[data-draft=notes]').fill('The new canonical ending.');await page.keyboard.press('Escape');
 expect(await page.evaluate(()=>counterplotDiagnostics.snapshot().projects[0].drafts.length)).toBe(1);
 await action(page,'drafts').click();await action(page,'resume-draft').click();await expect(page.locator('.draft-conflict')).toContainText('The new canonical ending.');
 await action(page,'save-scene').click();expect(await page.evaluate(()=>counterplotDiagnostics.snapshot().projects[0].scenes[0].notes)).toBe('The new canonical ending.');
 await action(page,'scene-keep-both').click();const data=await page.evaluate(()=>counterplotDiagnostics.snapshot());
 expect(data.projects[0].scenes).toHaveLength(2);expect(data.projects[0].scenes[0].notes).toBe('The new canonical ending.');expect(data.projects[0].scenes[1].notes).toBe(rich.projects[0].drafts[0].draft.notes);expect(data.projects[0].scenes[1].focus).toBe(rich.projects[0].scenes[0].focus);expect(data.projects[0].drafts).toHaveLength(0);
 await page.reload();expect(await page.evaluate(()=>counterplotDiagnostics.snapshot().projects[0].scenes)).toEqual(data.projects[0].scenes);
});

test('105 unfinished versions remain loadable and exportable',async({page})=>{
 const w=structuredClone(rich);w.projects[0].drafts=Array.from({length:105},(_,i)=>({...structuredClone(w.projects[0].drafts[0]),id:'unfinished-'+i}));await local(page,w);await page.reload();expect(await page.evaluate(()=>counterplotDiagnostics.snapshot().projects[0].drafts.length)).toBe(105);await action(page,'drafts').click();await expect(page.locator('.saved-draft')).toHaveCount(105);
});

test('Outline restores scroll and keyboard focus after visiting another page and writing from a thread',async({page})=>{
 await local(page);await page.setViewportSize({width:1280,height:720});await page.locator('[data-nav=structure]').click();await page.evaluate(()=>scrollTo({top:400,behavior:'instant'}));const position=await page.evaluate(()=>scrollY);
 await page.locator('[data-nav=world]').click();await page.locator('[data-nav=structure]').click();expect(await page.evaluate(()=>scrollY)).toBe(position);await expect(page.locator('#main h1')).toBeFocused();
 await action(page,'thread-lab').click();await page.locator('[data-draft=notes]').fill('Written without leaving this thread behind.');await action(page,'save-scene').click();await expect(page.locator('[data-nav=structure]')).toHaveClass(/active/);await expect(page.locator('#main h1')).toBeFocused();expect(await page.evaluate(()=>counterplotDiagnostics.snapshot().projects[0].scenes.at(-1).notes)).toBe('Written without leaving this thread behind.');
});

test('plot actions have interior space and stay grouped; the floating tray and landscape editor fit',async({page})=>{
 await local(page);
 for(const [width,height] of [[1920,1080],[768,1024],[390,844],[320,640],[844,390]]){
  await page.setViewportSize({width,height});await page.locator('[data-nav=structure]').click();await page.locator('.plotline-tab:not(.master)[data-id]').first().click();
  const g=await page.locator('.plotline-summary').evaluate(el=>{const b=el.getBoundingClientRect(),t=el.querySelector('p').getBoundingClientRect(),a=[...el.querySelectorAll('button')].map(x=>x.getBoundingClientRect());return {left:t.left-b.left,right:b.right-a.at(-1).right,gap:a[1].left-a[0].right,sameRow:Math.abs(a[0].top-a[1].top)<2};});expect(g.left).toBeGreaterThanOrEqual(12);expect(g.right).toBeGreaterThanOrEqual(12);expect(g.gap).toBeGreaterThanOrEqual(12);expect(g.gap).toBeLessThanOrEqual(24);expect(g.sameRow).toBe(true);
  expect(await page.locator('.mice-palette').evaluate(e=>getComputedStyle(e).position)).toBe('fixed');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await action(page,'open-scene-explorer').click();const g=await page.evaluate(()=>({body:document.querySelector('#dialog .dialog-body').clientHeight,footer:document.querySelector('#dialog .dialog-foot').getBoundingClientRect().bottom,height:innerHeight}));expect(g.body).toBeGreaterThan(220);expect(g.footer).toBe(g.height);
});

const base=process.env.TEST_SERVER_URL;
test('real account changes cannot send old-tab writing to another owner; expired sessions recover in place',async({browser})=>{
 test.skip(!base,'Requires isolated Pages/D1 server');test.setTimeout(60000);const context=await browser.newContext({ignoreHTTPSErrors:true});const page=await context.newPage();const second=await context.newPage();const password='Synthetic private password 123';const email='boundary-'+crypto.randomUUID()+'@example.test';
 const signup=async(p,email)=>{await p.goto(base);await p.getByRole('button',{name:'New here? Create an account'}).click();await p.locator('[name=email]').fill(email);await p.locator('[name=password]').fill(password);await p.getByRole('button',{name:'Create account ↗',exact:true}).click();await expect(p.locator('.sync-panel')).toBeHidden();};
 const saved=async p=>{await p.evaluate(()=>counterplotSync.flush());await expect(p.locator('#save-status')).toHaveText('Saved across devices');};
 await signup(page,email);await action(page,'new-blank-scene').click();await page.locator('[data-draft=notes]').fill('Account A original.');await action(page,'save-scene').click();await saved(page);
 await second.goto(base);await expect(second.locator('.sync-panel')).toBeHidden();await page.route('**/api/workspace*',r=>r.abort('internetdisconnected'));await action(page,'edit-scene').click();await page.locator('[data-draft=notes]').fill('Account A private unsynced ending.');await action(page,'save-scene').click();await page.evaluate(()=>counterplotSync.flush());
 await second.locator('.account-button:visible').first().click();await second.getByRole('button',{name:'Sign out on this device',exact:true}).click();await signup(second,'other-'+crypto.randomUUID()+'@example.test');await saved(second);await page.unroute('**/api/workspace*');await page.evaluate(()=>counterplotSync.flush());
 await expect(page.locator('.sync-panel')).toBeVisible();expect(JSON.stringify((await(await second.request.get(base+'/api/workspace')).json()).workspace)).not.toContain('Account A');
 await page.getByRole('button',{name:'Sign in again',exact:true}).click();await page.locator('[name=password]').fill(password);await page.getByRole('button',{name:'Sign in ↗',exact:true}).click();await expect(page.locator('.sync-panel')).toBeHidden();await saved(page);expect(JSON.stringify((await(await page.request.get(base+'/api/workspace')).json()).workspace)).toContain('Account A private unsynced ending.');
 await page.request.post(base+'/api/auth/logout',{headers:{Origin:base}});await action(page,'edit-scene').click();await page.locator('[data-draft=notes]').fill('Preserved after session expiry.');await action(page,'save-scene').click();await page.evaluate(()=>counterplotSync.flush());await page.locator('.account-button:visible').first().click();await page.getByRole('button',{name:'Sign in again',exact:true}).click();await page.locator('[name=password]').fill(password);await page.getByRole('button',{name:'Sign in ↗',exact:true}).click();await expect(page.locator('.sync-panel')).toBeHidden();await saved(page);await page.reload();await expect(page.locator('.sync-panel')).toBeHidden();expect(await page.evaluate(()=>counterplotDiagnostics.snapshot().projects[0].scenes[0].notes)).toBe('Preserved after session expiry.');await context.close();
});

test('offline writing survives reload with split recovery checkpoints and legacy cache records',async({page})=>{
 let revision=1;const w=structuredClone(rich);w.schema=3;w.projects[0].drafts=[];
 await page.route('http://cache.test/**',route=>{const path=new URL(route.request().url()).pathname;if(path==='/api/auth/session')return route.fulfill({json:{user:'cache-owner',email:'cache@example.test'}});if(path==='/api/auth/recovery')return route.fulfill({json:{remaining:8}});if(path==='/api/workspace')return route.request().method()==='GET'?route.fulfill({json:{owner:'cache-owner',workspace:w,revision}}):route.abort('internetdisconnected');return route.fulfill({contentType:'text/html',body:source});});
 await page.goto('http://cache.test/');await expect(page.locator('.sync-panel')).toBeHidden();await action(page,'edit-scene').click();await page.locator('[data-draft=notes]').fill('Offline text that must survive a refresh.');await action(page,'save-scene').click();await page.evaluate(()=>counterplotSync.flush());await page.reload();await expect(page.locator('.sync-panel')).toBeHidden();expect(await page.evaluate(()=>counterplotDiagnostics.snapshot().projects[0].scenes[0].notes)).toBe('Offline text that must survive a refresh.');
 // Replace only this disposable account's cache with the prior single-record format.
 await page.evaluate(async base=>{const pending=counterplotDiagnostics.snapshot();pending.projects[0].scenes[0].notes='Retained from the legacy recovery format.';await new Promise((resolve,reject)=>{const req=indexedDB.open('counterplot-private-v2',1);req.onsuccess=()=>{const db=req.result,tx=db.transaction('workspaces','readwrite'),slot='cache-owner:'+sessionStorage.getItem('counterplot.tab');tx.objectStore('workspaces').put({owner:'cache-owner',slot,base,revision:1,pending,inflight:null},slot);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error);};});},w);
 await page.reload();await expect(page.locator('.sync-panel')).toBeHidden();expect(await page.evaluate(()=>counterplotDiagnostics.snapshot().projects[0].scenes[0].notes)).toBe('Retained from the legacy recovery format.');
});

test('deferred Outline focus respects a writer moving to a different field',async({page})=>{
 await local(page);await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));await page.locator('[data-nav=structure]').click();await action(page,'new-thread').click();
 await page.locator('[data-mice-compose=opening]').fill('A quiet beginning.');await page.locator('[data-mice-compose=title]').focus();await page.clock.runFor(100);await expect(page.locator('[data-mice-compose=title]')).toBeFocused();await page.keyboard.type('The unhurried title');
 await action(page,'mice-compose-save').click();const n=await page.evaluate(()=>counterplotDiagnostics.snapshot().projects[0].structure.at(-1));expect(n.title).toBe('The unhurried title');expect(n.opening).toBe('A quiet beginning.');
});
