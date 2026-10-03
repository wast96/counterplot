import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
const source=await readFile(new URL('../index.html',import.meta.url),'utf8');
const html=source.replace('data-hosted="true"','data-hosted="false"');
const rich=JSON.parse(await readFile(new URL('./fixtures/rich-v2-workspace.json',import.meta.url),'utf8'));
const action=(p,n)=>p.locator(`[data-action="${n}"]:visible`).first();
async function local(page){await page.route('http://audit.test/',r=>r.fulfill({contentType:'text/html',body:html}));await page.goto('http://audit.test/');await page.evaluate(w=>counterplotBridge.replace(w),rich);}

test('preset search never paints over choices, and custom wording survives scrolling and reload',async({page})=>{
 await local(page);await page.locator('[data-nav=characters]').click();
 for(const kind of ['want','method','value','boundary']){
  await page.locator(`[data-action=edit-block][data-kind=${kind}]`).first().click();
  await page.locator('.picker-search').fill('');await page.locator('.dialog-body').evaluate(e=>e.scrollTop=650);
  const overlap=await page.locator('.picker-search').evaluate(e=>{const a=e.getBoundingClientRect();return [...document.querySelectorAll('.preset-option')].some(c=>{const b=c.getBoundingClientRect();return a.top<b.bottom&&a.bottom>b.top;});});expect(overlap).toBe(false);
  await page.locator('[data-draft=text]').fill('Listen to the silence before answering.');await action(page,'save-block').click();
 }
 await page.reload();const blocks=await page.evaluate(()=>counterplotDiagnostics.snapshot().projects[0].characters[0].blocks);for(const k of ['want','method','value','boundary'])expect(blocks.some(b=>b.kind===k&&b.text==='Listen to the silence before answering.')).toBe(true);
});

test('Master-only work stays visible after reload and plot/palette controls stay available after actions',async({page})=>{
 await local(page);await page.locator('[data-nav=structure]').click();await expect(page.locator('.mice-palette')).toBeVisible();expect(await page.locator('.mice-palette').evaluate(e=>getComputedStyle(e).position)).toBe('fixed');await expect(page.locator('.plotline-strip')).toBeVisible();await page.locator('.plotline-tab.master').click();
 await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));const tray=await page.locator('.mice-palette').boundingBox();expect(tray.x).toBeGreaterThanOrEqual(0);expect(tray.y+tray.height).toBeLessThanOrEqual(page.viewportSize().height);const end=await page.locator('.structure-bottom').boundingBox();expect(end.y+end.height).toBeLessThan(tray.y);
 await action(page,'new-beat').click();await page.locator('[data-mice-compose=title]').fill('The stillness kept only in Master');await page.locator('[data-mice-compose=opening]').fill('Nothing changes except the light.');await action(page,'mice-compose-save').click();await page.reload();
 await expect(page.locator('[data-mice-field=title]').last()).toHaveValue('The stillness kept only in Master');await expect(page.locator('.plotline-tab.master')).toHaveAttribute('aria-pressed','true');
 await page.locator('.plotline-tab[data-id]:not(.master)').first().click();await expect(page.locator('.plotline-strip')).toBeVisible();await expect(page.locator('.mice-palette')).toBeVisible();await page.locator('[data-mice-new-type=I]').click();await expect(page.locator('.mice-palette')).toBeVisible();await expect(page.locator('.mice-move-banner')).toContainText('Adding: Inquiry');await page.keyboard.press('Escape');
 await page.locator('[data-action=structure-view][data-mode=chronology]').click();await page.reload();await expect(page.locator('.chronology-board')).toContainText('The stillness kept only in Master');
});

test('retired Explorer draft payloads and written possibilities survive editing, export and import',async({page})=>{
 const fixture=structuredClone(rich);const draft=fixture.projects[0].drafts.find(d=>d.kind==='scene');draft.ideasOpen=true;draft.ideaQuestions=[['open','An old prompt','context','Keep this exact old question.']];draft.draft.ideaNotes='My saved possibility, not an event.';
 await local(page);await page.evaluate(w=>counterplotBridge.replace(w),fixture);await action(page,'drafts').click();await action(page,'resume-draft').click();await expect(page.locator('#scene-ideas')).toHaveCount(0);await expect(page.locator('[data-draft=ideaNotes]')).toHaveValue('My saved possibility, not an event.');await page.locator('[data-draft=ideaNotes]').fill('My saved possibility, not an event.\nAnother uncertain image.');await action(page,'save-scene-draft').click();await action(page,'export').click();const pending=page.waitForEvent('download');await action(page,'export-json').click();const exported=JSON.parse(await readFile(await(await pending).path(),'utf8'));expect(exported.projects[0].drafts.find(d=>d.kind==='scene').ideaQuestions).toEqual(draft.ideaQuestions);
 await action(page,'import').click();await page.locator('#import-file').setInputFiles({name:'preserved.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});await action(page,'confirm-import').click();const restored=await page.evaluate(()=>counterplotDiagnostics.snapshot());expect(restored.projects.at(-1).drafts.find(d=>d.kind==='scene').draft.ideaNotes).toContain('Another uncertain image.');
});

test('main pages and scene planning remain accessible at narrow and landscape widths',async({page},info)=>{
 test.setTimeout(120000);await local(page);
 for(const [width,height] of [[320,640],[768,1024],[844,390],[1440,1000]]){
  await page.setViewportSize({width,height});
  for(const n of ['story','characters','connections','structure','world']){await page.locator(`[data-nav=${n}]`).first().click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),n+' overflow '+width).toBe(true);const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),n+' accessibility '+width).toEqual([]);}
  await page.locator('[data-nav=story]').click();await action(page,'edit-scene').click();await page.locator('.scene-planning>summary').click();await page.locator('[data-draft=ideaNotes]').fill('A possibility without an answer.');await expect(page.locator('[data-draft=ideaNotes]')).toBeFocused();await expect(action(page,'save-scene')).toBeVisible();await page.keyboard.press('Escape');
 }
 await page.screenshot({path:info.outputPath('workspace-desktop.png')});
});

async function hosted(page,{outage=false,conflict=false}={}){
 let revision=1,w=structuredClone(rich),offline=outage,conflicting=conflict;
 await page.route('http://account.test/**',async route=>{const path=new URL(route.request().url()).pathname;if(path==='/api/auth/session')return route.fulfill({json:{user:'audit',email:'writer@example.test'}});if(path==='/api/auth/recovery')return route.fulfill({json:{remaining:0}});if(path==='/api/history')return route.fulfill({json:{revisions:[]}});if(path==='/api/workspace'){if(offline)return route.fulfill({status:503,json:{error:'Unavailable'}});if(route.request().method()==='PUT'){if(conflicting){conflicting=false;const remote=structuredClone(rich);remote.projects[0].scenes[0].notes='A different device ending.';return route.fulfill({status:409,json:{workspace:remote,revision:++revision}});}w=route.request().postDataJSON().workspace;revision++;}return route.fulfill({json:{workspace:w,revision}});}return route.fulfill({contentType:'text/html',body:source});});
 await page.goto('http://account.test/');await page.locator('.sync-panel').waitFor({state:'hidden'});return {offline:v=>offline=v};
}

test('Account preserves an unfinished scene, keyboard focus and scroll, without a recovery overlay',async({page},info)=>{
 await hosted(page);await action(page,'edit-scene').click();await page.locator('[data-draft=notes]').fill('Unfinished work in the same editor.');await expect(page.locator('.sync-live-notice')).toHaveCount(0);const before=await page.locator('#dialog .dialog-body').evaluate(e=>e.scrollTop);await page.locator('.account-button:visible').first().click();await expect(page.getByRole('heading',{name:'Account',exact:true})).toBeVisible();await expect(page.locator('[data-recovery-state]')).toContainText('No recovery codes configured');await expect(page.getByRole('button',{name:'Retry connection',exact:true})).toHaveCount(0);const a11y=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(a11y.violations).toEqual([]);await page.screenshot({path:info.outputPath('account.png')});await page.keyboard.press('Escape');await expect(page.locator('#dialog')).toBeVisible();await expect(page.locator('[data-draft=notes]')).toHaveValue('Unfinished work in the same editor.');expect(await page.locator('#dialog .dialog-body').evaluate(e=>e.scrollTop)).toBe(before);await expect(page.locator('.account-button:visible').first()).toBeFocused();
 await page.locator('.account-button:visible').first().click();await page.getByRole('button',{name:'Saved revisions',exact:true}).click();await expect(page.locator('.revision-list')).toContainText('No saved revisions yet.');await page.getByRole('button',{name:'Back',exact:true}).click();await page.getByRole('button',{name:'Back to writing',exact:true}).click();await expect(page.locator('[data-draft=notes]')).toHaveValue('Unfinished work in the same editor.');
});

test('connection retry reports its outcome and conflict notices reserve space below writing',async({page})=>{
 const server=await hosted(page,{conflict:true});await action(page,'edit-scene').click();await page.locator('[data-draft=notes]').fill('A conflicting ending.');await action(page,'save-scene').click();await page.evaluate(()=>counterplotSync.flush());await expect(page.locator('.sync-live-notice')).toContainText('Both versions');await action(page,'edit-scene').click();
 const geometry=await page.evaluate(()=>({editor:document.querySelector('#dialog').getBoundingClientRect().bottom,notice:document.querySelector('.sync-live-notice').getBoundingClientRect().top}));expect(geometry.editor).toBeLessThanOrEqual(geometry.notice+1);await page.getByRole('button',{name:'Dismiss',exact:true}).click();await expect(page.locator('.sync-live-notice')).toHaveCount(0);
 server.offline(true);await page.locator('[data-draft=notes]').fill('Keep this offline too.');await action(page,'save-scene').click();await page.evaluate(()=>counterplotSync.flush());await page.locator('.account-button:visible').first().click();await expect(page.getByRole('button',{name:'Retry connection',exact:true})).toBeVisible();server.offline(false);await page.getByRole('button',{name:'Retry connection',exact:true}).click();await expect(page.locator('.account-feedback')).toContainText('Connection restored');
});

test('leaving a loading account panel prevents late responses from reopening it',async({page})=>{
 await hosted(page);await page.locator('.account-button:visible').first().click();await expect(page.locator('[data-recovery-state]')).toContainText('No recovery');
 await page.getByRole('button',{name:'Sign out on this device',exact:true}).focus();await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Saved revisions',exact:true})).toBeFocused();await page.keyboard.press('Shift+Tab');await expect(page.getByRole('button',{name:'Sign out on this device',exact:true})).toBeFocused();
 let release;const pending=new Promise(resolve=>release=resolve);await page.route('http://account.test/api/auth/recovery',async route=>{await pending;await route.fulfill({json:{remaining:8}});});
 await page.getByRole('button',{name:'Manage recovery codes',exact:true}).click();await expect(page.locator('.sync-panel')).toContainText('Loading recovery settings');await page.keyboard.press('Escape');release();await page.waitForResponse('http://account.test/api/auth/recovery');await expect(page.locator('.sync-panel')).toBeHidden();await expect(page.locator('.account-button:visible').first()).toBeFocused();
});
