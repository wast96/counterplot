import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {readFile} from 'node:fs/promises';
import {sceneField,showNotes} from './helpers/scene-ui.js';
const source=(await readFile(new URL('../index.html',import.meta.url),'utf8')).replace('data-hosted="true"','data-hosted="false"');
const rich=JSON.parse(await readFile(new URL('./fixtures/rich-v2-workspace.json',import.meta.url),'utf8'));
const action=(p,n)=>p.locator(`[data-action=${n}]:visible`).first();
async function local(page,w){await page.route('http://experience.test/',r=>r.fulfill({contentType:'text/html',body:source}));await page.goto('http://experience.test/');await page.evaluate(w=>counterplotBridge.replace(w),w);}
function manuscript(count=3){const w=structuredClone(rich),p=w.projects[0],seed=p.scenes[0];p.drafts=[];p.scenes=Array.from({length:count},(_,i)=>({...structuredClone(seed),id:i?'scene-'+i:seed.id,title:'Scene '+(i+1),notes:('A paragraph to return to.\n\n').repeat(400),parent:i?(i===1?seed.id:'scene-'+(i-1)):'',momentId:i?'harbor-change':'',storyDate:'2040-12-01'}));return w;}

test('180 long scenes form a compact overview; direct moves preserve story time and all references',async({page})=>{
 const w=manuscript(180);await local(page,w);await expect(page.locator('.sequence-row')).toHaveCount(180);expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBeLessThan(80000);
 await page.locator('[data-action=move-scene-to]').first().click();await page.locator('[data-draft=position]').selectOption('179');await action(page,'confirm-scene-position').click();
 const p=await page.evaluate(()=>counterplotDiagnostics.snapshot().projects[0]);expect(p.scenes.at(-1)).toEqual(w.projects[0].scenes[0]);expect(p.scenes[0]).toEqual(w.projects[0].scenes[1]);expect(p.moments).toEqual(w.projects[0].moments);expect(p.structure).toEqual(w.projects[0].structure);await expect(page.locator('.sequence-cause').first()).toContainText('appears later');
 await page.locator('[data-action=toggle-scene-preview]').first().click();await expect(page.locator('.scene-card')).toHaveCount(1);await page.locator('.sequence-row [data-action=toggle-scene-preview]').first().click();await expect(page.locator('.scene-card')).toHaveCount(1);
 await page.reload();expect(await page.evaluate(()=>counterplotDiagnostics.snapshot().projects[0].scenes.at(-1).id)).toBe(w.projects[0].scenes[0].id);
});

test('scene traversal returns to the prose selection and independent scroll; saved notes remain reachable',async({page})=>{
 await local(page,manuscript());await action(page,'edit-scene').click();let prose=await sceneField(page,'notes');await prose.focus();await prose.evaluate(e=>{e.setSelectionRange(1600,1620);e.scrollTop=600;});const before=await prose.evaluate(e=>({start:e.selectionStart,end:e.selectionEnd,top:e.scrollTop}));
 await action(page,'scene-next').click();await expect(page.locator('[data-draft=title]')).toHaveValue('Scene 2');await action(page,'scene-previous').click();prose=page.locator('[data-draft=notes]');await expect(prose).toBeFocused();expect(await prose.evaluate(e=>({start:e.selectionStart,end:e.selectionEnd,top:e.scrollTop}))).toEqual(before);
 await (await sceneField(page,'ideaNotes')).fill('Keep both possible endings.');await action(page,'scene-next').click();await action(page,'scene-previous').click();await showNotes(page);await expect(page.locator('[data-draft=ideaNotes]')).toBeVisible();await expect(page.locator('[data-draft=ideaNotes]')).toHaveValue('Keep both possible endings.');
 const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(scan.violations).toEqual([]);
});

test('story context follows historical character state and knowledge without exposing future facts',async({page})=>{
 await local(page,manuscript());await action(page,'edit-scene').click();await showNotes(page);if(!await page.locator('.scene-reference').evaluate(e=>e.open))await page.locator('.scene-reference>summary').click();await expect(page.locator('.scene-reference')).toContainText('Preserve the harbor’s old songs');await expect(page.locator('.scene-reference')).not.toContainText('Carry the songs to another port');await expect(page.locator('.scene-reference')).not.toContainText('The closure is scheduled for winter.');
 await action(page,'scene-next').click();await showNotes(page);if(!await page.locator('.scene-reference').evaluate(e=>e.open))await page.locator('.scene-reference>summary').click();await expect(page.locator('.scene-reference')).toContainText('Carry the songs to another port');await page.locator('.scene-reference summary').filter({hasText:'Known to Mara'}).click();await expect(page.locator('.scene-reference')).toContainText('The closure is scheduled for winter.');
});

test('long filters fit tablet; World reaches material sooner; Outline MICE stays floating with end clearance',async({page})=>{
 const w=manuscript();w.projects[0].characters[0].name='Mara '+('an exceptionally long character name ').repeat(6);await local(page,w);
 for(const [width,height]of [[1440,1000],[768,1024],[390,844],[320,640],[844,390]]){
  await page.setViewportSize({width,height});await page.locator('[data-nav=world]').first().click();if(width===390){expect(await page.locator('.world-card').first().evaluate(e=>e.getBoundingClientRect().top)).toBeLessThan(600);}
  await page.locator('[data-nav=structure]').click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);const palette=page.locator('.mice-palette');expect(await palette.evaluate(e=>getComputedStyle(e).position)).toBe('fixed');await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));const g=await palette.boundingBox();expect(g.y+g.height).toBeLessThanOrEqual(height);expect(height-g.y-g.height).toBeLessThan(30);expect(await page.locator('[data-mice-root=end]').evaluate(e=>e.getBoundingClientRect().bottom)).toBeLessThan(g.y);
 }
});
