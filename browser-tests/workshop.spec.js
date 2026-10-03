import {sceneField} from './helpers/scene-ui.js';
import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const source=await readFile(new URL('../index.html',import.meta.url),'utf8');
const html=source.replace('data-hosted="true"','data-hosted="false"');
const rich=JSON.parse(await readFile(new URL('./fixtures/rich-v2-workspace.json',import.meta.url),'utf8'));
const historical=JSON.parse(await readFile(new URL('./fixtures/rich-v2-expected.json',import.meta.url),'utf8'));

test.beforeEach(async({page})=>{
 page.auditErrors=[];page.on('pageerror',e=>page.auditErrors.push(e.message));
 await page.route('http://workshop.test/',r=>r.fulfill({contentType:'text/html',body:html}));
 await page.goto('http://workshop.test/');
});
test.afterEach(async({page})=>expect(page.auditErrors).toEqual([]));
const action=(page,name)=>page.locator(`[data-action="${name}"]:visible`).first();
async function create(page,text='An image without a narrator.\n\nThe tide returns.'){
 await action(page,'new-blank-scene').click();await page.locator('[data-draft="notes"]').fill(text);await action(page,'save-scene').click();
}

test('a character-free scene supports writing, persistence, reading, continuation and search',async({page})=>{
 await create(page);let w=await page.evaluate(()=>counterplotDiagnostics.snapshot());expect(w.projects[0].characters).toHaveLength(0);expect(w.projects[0].scenes[0].focus).toBe('');expect(w.schema).toBe(3);
 await expect(page.locator('.story-start')).toHaveCount(0);
 await page.locator('[data-mode="reading"]').click();await expect(page.locator('.manuscript-prose')).toContainText('The tide returns.');
 await page.reload();await expect(page.locator('.manuscript-prose')).toContainText('The tide returns.');await page.locator('[data-mode=sequence]').click();await action(page,'continue-scene').click();await (await sceneField(page,'notes')).fill('The bell rings again.');await action(page,'save-scene').click();
 w=await page.evaluate(()=>counterplotDiagnostics.snapshot());expect(w.projects[0].scenes[1].parent).toBe(w.projects[0].scenes[0].id);
 await action(page,'search').click();await page.locator('[data-global-search]').fill('tide returns');await expect(page.locator('.search-result')).toHaveCount(1);await page.locator('.search-result').click();await expect(page.locator('[data-draft="notes"]')).toBeFocused();
});

test('ordinary prose saves across navigation and reload without separate unfinished versions',async({page})=>{
 await action(page,'new-blank-scene').click();await page.locator('[data-draft="notes"]').fill('Do not lose this unfinished paragraph.');
 await page.locator('[data-nav="world"]').first().click();await page.locator('[data-nav="story"]').first().click();
 await action(page,'edit-scene').click();await expect(page.locator('[data-draft="notes"]')).toHaveValue('Do not lose this unfinished paragraph.');
 await action(page,'save-scene').click();await page.reload();await action(page,'edit-scene').click();expect(await page.locator('.scene-canvas-section h3').first().innerText()).toBe('Write freely');
 expect(await page.evaluate(()=>counterplotDiagnostics.snapshot().projects[0].drafts.length)).toBe(0);
});

test('every scene craft field and development beat is searchable and opens its matching field',async({page})=>{
 await page.evaluate(data=>{const w=counterplotDiagnostics.validate(data),s=w.projects[0].scenes[0];for(const key of ['goal','tension','development','turn','reaction','purpose','stakes','readerExpectation','entry','exit','ideaNotes'])s[key]='unique-'+key;s.beats=['unique-beat'];counterplotBridge.replace(w);},rich);
 for(const key of ['goal','tension','development','turn','reaction','purpose','stakes','readerExpectation','entry','exit','ideaNotes']){
  await action(page,'search').click();await page.locator('[data-global-search]').fill('unique-'+key);await page.locator('[data-action="search-open-scene"]').click();await expect(page.locator(`[data-draft="${key}"]`)).toBeVisible();await expect(page.locator(`[data-draft="${key}"]`)).toBeFocused();await page.keyboard.press('Escape');
 }
 await action(page,'search').click();await page.locator('[data-global-search]').fill('unique-beat');await expect(page.locator('[data-action="search-open-scene"]')).toHaveCount(1);
 await page.locator('[data-global-search]').fill('Unfinished words');await expect(page.locator('[data-action="resume-draft"]')).toHaveCount(1);
});

test('v2 migration preserves histories, pins, unknown metadata and references without mutating the input',async({page})=>{
 const result=await page.evaluate(data=>{const original=JSON.stringify(data),once=counterplotDiagnostics.validate(data),twice=counterplotDiagnostics.validate(once);counterplotBridge.replace(once);const p=once.projects[0];return {inputUntouched:JSON.stringify(data)===original,idempotent:JSON.stringify(once)===JSON.stringify(twice),projects:counterplotDiagnostics.snapshot().projects,stale:counterplotDiagnostics.staleSceneIds(),state:counterplotDiagnostics.stateAt(p.characters[0].id,p.moments[0].id),knowledge:counterplotDiagnostics.factKnownAt(p.entities.find(e=>e.type==='fact').id,p.characters[0].id,p.moments[0].id),outline:counterplotDiagnostics.nestedOutline()};},rich);
 expect(result.inputUntouched).toBe(true);expect(result.idempotent).toBe(true);expect(result.projects).toEqual(rich.projects);expect(result.stale).toEqual(historical.stale);expect(result.state).toEqual(historical.state);expect(result.knowledge).toEqual(historical.knowledge);expect(result.outline).toBe(historical.outline);
 await action(page,'export').click();const download=page.waitForEvent('download');await action(page,'export-json').click();const exported=JSON.parse(await readFile(await (await download).path(),'utf8'));expect(exported.projects).toEqual(rich.projects);
 await action(page,'import').click();await page.locator('#import-file').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});await action(page,'confirm-import').click();const restored=await page.evaluate(()=>counterplotDiagnostics.snapshot());expect(restored.projects).toHaveLength(2);expect(restored.projects[1].scenes).toEqual(rich.projects[0].scenes);expect(restored.projects[1].characters).toEqual(rich.projects[0].characters);
});

test('queued life, world and reader changes commit together and undo preserves historical data',async({page})=>{
 await page.evaluate(data=>counterplotBridge.replace(data),rich);await page.locator('[data-nav="story"]').click();await action(page,'en-outcome').click();
 await page.locator('[data-action="en-queue-continuity"][data-kind="life"]').click();await page.locator('[data-draft="value"]').selectOption('dead');await action(page,'en-save').click();
 await page.locator('[data-action="en-queue-continuity"][data-kind="world"]').click();await page.locator('[data-draft="value"]').fill('Reopened');await action(page,'en-save').click();
 await page.locator('[data-action="en-queue-continuity"][data-kind="reader"]').click();await page.locator('[data-draft="reason"]').fill('A different reading of the notice.');await action(page,'en-save').click();
 await expect(page.locator('.en-queued-row')).toHaveCount(3);await action(page,'en-apply-outcome').click();
 const changed=await page.evaluate(()=>counterplotDiagnostics.snapshot().projects[0]);expect(changed.characters[0].lifeChanges.at(-1).status).toBe('dead');expect(changed.entities.find(e=>e.type==='group').stateChanges[0].value).toBe('Reopened');expect(changed.entities.find(e=>e.type==='fact').readerAppearances).toHaveLength(2);expect(changed.moments).toHaveLength(rich.projects[0].moments.length);
 await action(page,'undo').click();const undone=await page.evaluate(()=>counterplotDiagnostics.snapshot().projects[0]);expect(undone.characters).toEqual(rich.projects[0].characters);expect(undone.entities).toEqual(rich.projects[0].entities);
});

test('populated screens and expanded MICE controls fit narrow widths',async({page})=>{
 await page.evaluate(data=>counterplotBridge.replace(data),rich);
 for(const width of [320,390,768,1024,1440]){
  await page.setViewportSize({width,height:844});
  for(const name of ['story','characters','connections','world','structure']){await page.locator(`[data-nav="${name}"]`).first().click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${name} at ${width}`).toBe(true);}
  await expect(page.locator('.mice-palette')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`expanded palette ${width}`).toBe(true);
 }
 await page.setViewportSize({width:320,height:568});await page.locator('[data-nav="story"]').click();await action(page,'new-blank-scene').click();await expect(page.locator('[data-draft="notes"]')).toBeVisible();await expect(action(page,'save-scene')).toBeVisible();expect(await page.locator('#dialog').evaluate(d=>d.getBoundingClientRect().right<=innerWidth)).toBe(true);
});

test('hosted portable export opens without a backend and retains the embedded project',async({page,browser})=>{
 await page.route('http://hosted.test/**',r=>{const path=new URL(r.request().url()).pathname;if(path==='/api/auth/session')return r.fulfill({json:{user:'audit',email:'audit@example.test'}});if(path==='/api/auth/recovery')return r.fulfill({json:{remaining:8}});if(path==='/api/workspace')return r.fulfill({json:{workspace:rich,revision:1}});return r.fulfill({contentType:'text/html',body:source});});
 await page.goto('http://hosted.test/');await action(page,'export').click();const pending=page.waitForEvent('download');await action(page,'export-portable').click();const portable=await readFile(await (await pending).path(),'utf8');expect(portable).toContain('data-hosted="false"');
 const tab=await browser.newPage();const errors=[];tab.on('pageerror',e=>errors.push(e.message));let apiCalls=0;await tab.route('http://portable.test/**',r=>{if(r.request().url().includes('/api/'))apiCalls++;return r.fulfill({contentType:'text/html',body:portable});});await tab.goto('http://portable.test/');expect(await tab.evaluate(()=>counterplotDiagnostics.snapshot().projects)).toEqual(rich.projects);await expect(tab.locator('.sync-panel')).toHaveCount(0);await create(tab,'Portable edits survive reload.');await tab.reload();expect(await tab.evaluate(()=>counterplotDiagnostics.snapshot().projects[0].scenes.at(-1).notes)).toBe('Portable edits survive reload.');expect(apiCalls).toBe(0);expect(errors).toEqual([]);await tab.close();
});

test('first-save conflict through hosted client retains the unsynced local story',async({page})=>{
 let mode='offline';await page.route('http://fresh.test/**',r=>{const path=new URL(r.request().url()).pathname;if(path==='/api/auth/session')return r.fulfill({json:{user:'first-save',email:'first@example.test'}});if(path==='/api/auth/recovery')return r.fulfill({json:{remaining:8}});if(path==='/api/workspace'){if(r.request().method()==='GET')return r.fulfill({json:{workspace:null,revision:0}});return mode==='offline'?r.fulfill({status:503,json:{error:'Simulated outage'}}):r.fulfill({status:409,json:{workspace:rich,revision:1}});}return r.fulfill({contentType:'text/html',body:source});});
 await page.goto('http://fresh.test/');await create(page,'LOCAL WORDS BEFORE FIRST SAVE');await page.evaluate(()=>counterplotSync.flush());mode='conflict';await page.evaluate(()=>counterplotSync.flush());await expect.poll(()=>page.evaluate(id=>counterplotDiagnostics.snapshot().projects.some(p=>p.id===id),rich.projects[0].id)).toBe(true);
 const w=await page.evaluate(()=>counterplotDiagnostics.snapshot());expect(JSON.stringify(w)).toContain('LOCAL WORDS BEFORE FIRST SAVE');expect(w.projects.some(p=>p.id===rich.projects[0].id)).toBe(true);await expect(page.locator('.sync-live-notice')).toContainText('Both versions');
});

test('legacy what-if tools honor pins and can discard or adopt a single block',async({page})=>{
 await page.evaluate(data=>{data.projects[0].lab.momentId='';const b=data.projects[0].characters[0].blocks[0];data.projects[0].characters[0].blocks.push({...b,id:'unpinned-method',kind:'method',key:'custom',text:'Check the public record',locked:false});counterplotBridge.replace(data);},structuredClone(rich));await page.locator('[data-nav=world]').first().click();await page.getByText('Earlier exploration tools',{exact:true}).click();await action(page,'legacy-explorer').click();await page.locator('[data-lab=pressure]').selectOption({index:1});await action(page,'generate').click();await expect(page.locator('.legacy-routes .route-card')).toHaveCount(3);
 const original=await page.evaluate(()=>counterplotDiagnostics.snapshot().projects[0].characters[0].blocks);await action(page,'what-if').click();for(const b of original.filter(b=>b.locked))await expect(page.locator(`[data-action=pick-whatif][data-id="${b.id}"]`)).toHaveCount(0);
 const target=await page.locator('[data-action=pick-whatif]').first().getAttribute('data-id');await action(page,'pick-whatif').click();await page.locator('[data-draft=text]').fill('Ask for help without explaining why');await action(page,'save-block').click();await expect(action(page,'adopt-variant')).toBeVisible();expect(await page.evaluate(()=>counterplotDiagnostics.snapshot().projects[0].characters[0].blocks)).toEqual(original);await action(page,'discard-variant').click();expect(await page.evaluate(()=>counterplotDiagnostics.snapshot().projects[0].characters[0].blocks)).toEqual(original);
 await action(page,'what-if').click();await page.locator(`[data-action=pick-whatif][data-id="${target}"]`).click();await page.locator('[data-draft=text]').fill('Ask for help without explaining why');await action(page,'save-block').click();await action(page,'adopt-variant').click();const changed=await page.evaluate(()=>counterplotDiagnostics.snapshot().projects[0].characters[0].blocks);expect(changed.find(b=>b.id===target).text).toBe('Ask for help without explaining why');expect(changed.filter(b=>b.id!==target)).toEqual(original.filter(b=>b.id!==target));
});

test('reader-only outcomes create no story moment and reject duplicate queued records',async({page})=>{
 await page.evaluate(data=>counterplotBridge.replace(data),rich);await action(page,'en-outcome').click();await page.locator('[data-action=en-queue-continuity][data-kind=reader]').click();await page.locator('[data-draft=reason]').fill('Only the reader revises an assumption.');await action(page,'en-save').click();await page.locator('[data-action=en-queue-continuity][data-kind=reader]').click();await action(page,'en-save').click();await expect(page.locator('#modal-error')).toContainText('already queued');await page.keyboard.press('Escape');await action(page,'drafts').click();await page.locator('[data-action=resume-draft]').first().click();
 // The parent outcome remains a separate resumable draft.
 if(await page.locator('[data-action=en-apply-outcome]').count()===0){await page.keyboard.press('Escape');await action(page,'en-outcome').click();}
 await action(page,'en-apply-outcome').click();const p=await page.evaluate(()=>counterplotDiagnostics.snapshot().projects[0]);expect(p.moments).toEqual(rich.projects[0].moments);expect(p.characters).toEqual(rich.projects[0].characters);expect(p.entities.find(e=>e.type==='fact').knownFrom).toEqual(rich.projects[0].entities.find(e=>e.type==='fact').knownFrom);
});

test('page and scene guides open and keyboard-close without losing unfinished prose',async({page})=>{
 for(const name of ['story','characters','connections','structure','world']){await page.locator(`[data-nav="${name}"]`).first().click();await action(page,'help').click();await expect(page.locator('#page-guide')).toBeVisible();await page.locator('[data-guide=start]').click();await page.keyboard.press('Escape');await expect(page.locator('#page-guide')).not.toBeVisible();}
 await page.locator('[data-nav=story]').first().click();await action(page,'new-blank-scene').click();await page.locator('[data-draft=notes]').fill('Keep this while showing help.');await page.locator('[data-guide-form]').click();await expect(page.locator('#page-guide')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('[data-draft=notes]')).toHaveValue('Keep this while showing help.');await page.keyboard.press('Escape');await action(page,'edit-scene').click();await expect(page.locator('[data-draft=notes]')).toHaveValue('Keep this while showing help.');
});

test('character changes preserve block details and failed outcome batches leave history intact',async({page})=>{
 await page.evaluate(data=>counterplotBridge.replace(data),rich);await action(page,'en-outcome').click();await page.locator('[data-action=en-queue-continuity][data-kind=block]').click();await page.locator('[data-draft=value]').fill('A changed commitment');await action(page,'en-save').click();await action(page,'en-apply-outcome').click();let p=await page.evaluate(()=>counterplotDiagnostics.snapshot().projects[0]);const change=p.characters[0].changes.at(-1);expect(change.block.text).toBe('A changed commitment');expect(change.block.locked).toBe(true);expect(change.block.targetId).toBe(rich.projects[0].characters[0].blocks[0].targetId);
 await action(page,'undo').click();await create(page,'A later reader-only scene.');const snapshot=await page.evaluate(()=>counterplotDiagnostics.snapshot().projects[0]);await page.locator('[data-action=en-outcome]').last().click();await page.locator('[data-action=en-queue-continuity][data-kind=reader]').click();await page.locator('[data-draft=readerKind]').selectOption('shown');await action(page,'en-save').click();await action(page,'en-apply-outcome').click();await expect(page.locator('#modal-error')).toContainText('already has a first appearance');p=await page.evaluate(()=>counterplotDiagnostics.snapshot().projects[0]);expect(p.entities).toEqual(snapshot.entities);expect(p.characters).toEqual(snapshot.characters);expect(p.moments).toEqual(snapshot.moments);
});

test('browser Back closes the writing workspace and Forward restores unfinished text',async({page})=>{
 await page.locator('[data-nav=characters]').first().click();await page.locator('[data-nav=world]').first().click();await page.goBack();await expect(page.locator('[data-nav=characters]')).toHaveClass(/active/);await page.locator('[data-nav=story]').first().click();await action(page,'new-blank-scene').click();await page.locator('[data-draft=notes]').fill('Retained through browser history.');await page.goBack();await expect(page.locator('#dialog')).not.toBeVisible();await page.goForward();await expect(page.locator('[data-draft=notes]')).toHaveValue('Retained through browser history.');await action(page,'save-scene').click();expect(await page.evaluate(()=>counterplotDiagnostics.snapshot().projects[0].scenes[0].notes)).toBe('Retained through browser history.');
});
