// Uses only disposable accounts on an isolated local Pages/D1 server.
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.TEST_SERVER_URL;
if(!base||!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Use an isolated local TEST_SERVER_URL');
const out=process.env.AUDIT_OUTPUT||'/tmp/counterplot-large-verification';await fs.mkdir(out,{recursive:true});
const rich=JSON.parse(await fs.readFile(new URL('../browser-tests/fixtures/rich-v2-workspace.json',import.meta.url),'utf8'));
const large=structuredClone(rich),dest=large.projects[0],seed=structuredClone(dest);const arrays=Object.keys(seed).filter(k=>Array.isArray(seed[k]));for(const k of arrays)dest[k]=[];
for(let i=0;i<60;i++){const ids=new Set();const gather=v=>{if(v&&typeof v==='object'){if(typeof v.id==='string')ids.add(v.id);Object.values(v).forEach(gather)}};gather(seed);const remap=v=>typeof v==='string'?(ids.has(v)?v+'-'+i:v):Array.isArray(v)?v.map(remap):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[ids.has(k)?k+'-'+i:k,remap(x)])):v;const copy=remap(seed);if(i===0)dest.lab=copy.lab;for(const k of arrays)dest[k].push(...copy[k]);}
dest.title='Large manuscript';dest.drafts=[];dest.plotlines=dest.plotlines.slice(0,1);const plot=dest.plotlines[0].id;
for(const [i,c]of dest.characters.entries())c.name+=' '+i;
for(const n of dest.structure){n.plotlineId=plot;n.plotlineIds=[plot];}for(const m of dest.moments)m.plotlineId=plot;
for(const s of dest.scenes){s.plotlineId=plot;s.sources.rolePlotIds=[plot];s.notes=('The tide returned to the silent streets. She waited for the remembered voice, listening without an answer.\n\n').repeat(140);}
for(let i=0;i<120;i++){const s=structuredClone(dest.scenes[i%60]);s.id='extra-scene-'+i;s.title='Scene '+(i+61);s.parent=dest.scenes.at(-1).id;dest.scenes.push(s);}
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH});const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1440,height:1000}});const page=await context.newPage();page.setDefaultTimeout(45000);const errors=[],responses=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/api/workspace')&&r.status()>=400)responses.push({status:r.status(),url:r.url()});});
const action=n=>page.locator(`[data-action=${n}]:visible`).first();const saved=async()=>{await page.evaluate(()=>counterplotSync.flush());await page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved across devices',null,{timeout:60000});};
await page.goto(base);await page.getByRole('button',{name:'New here? Create an account'}).click();await page.locator('[name=email]').fill('large-'+crypto.randomUUID()+'@example.test');await page.locator('[name=password]').fill('Synthetic large manuscript password 123');await page.getByRole('button',{name:'Create account ↗',exact:true}).click();await page.locator('.sync-panel').waitFor({state:'hidden'});await saved();
await page.evaluate(w=>{const valid=counterplotDiagnostics.validate(w);counterplotBridge.replace(valid);counterplotSync.enqueue(valid)},large);await saved();const initial=await(await page.request.get(base+'/api/workspace')).json();assert.equal(initial.workspace.projects[0].scenes.length,180);
const metrics={bytes:Buffer.byteLength(JSON.stringify(initial.workspace)),navigation:{},errors,responses};
for(const name of ['structure','characters','connections','world','story']){const t=performance.now();await page.locator(`[data-nav=${name}]`).first().click();metrics.navigation[name]=performance.now()-t;}
await page.locator('[data-nav=structure]').click();await page.locator('[data-mice-field=opening]').first().focus();metrics.outlineInput=await page.locator('[data-mice-field=opening]').first().evaluate(el=>{const times=[];for(let i=0;i<20;i++){const t=performance.now();el.value+='a';el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:'a'}));times.push(performance.now()-t);}return times;});
await page.locator('[data-nav=story]').click();await action('edit-scene').click();metrics.proseInput=await page.locator('[data-draft=notes]').evaluate(el=>{const times=[];for(let i=0;i<20;i++){const t=performance.now();el.value+='b';el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:'b'}));times.push(performance.now()-t);}return times;});await action('save-scene').click();await saved();
await action('projects').click();await action('fork-project').click();await saved();const expected=await page.evaluate(()=>counterplotDiagnostics.snapshot());metrics.forkBytes=Buffer.byteLength(JSON.stringify(expected));assert.ok(metrics.forkBytes>5000000);
await page.reload();await page.locator('.sync-panel').waitFor({state:'hidden'});assert.deepEqual(await page.evaluate(()=>counterplotDiagnostics.snapshot()),expected);
const old=await(await page.request.get(base+'/api/workspace?revision='+initial.revision)).json();assert.deepEqual(old.workspace,initial.workspace);
metrics.projectsAfterReload=expected.projects.length;metrics.historyExact=true;assert.deepEqual(errors,[]);assert.deepEqual(responses,[]);
await fs.writeFile(out+'/results.json',JSON.stringify(metrics,null,2));console.log(JSON.stringify(metrics,null,2));await browser.close();
