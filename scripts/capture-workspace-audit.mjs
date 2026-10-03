// Reproducible visual evidence using disposable fixture data; no account credentials.
import {chromium} from 'playwright';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const out=resolve(process.env.AUDIT_OUTPUT||'test-results/visual-audit');await mkdir(out,{recursive:true});
const source=await readFile(new URL('../index.html',import.meta.url),'utf8');
const fixture=JSON.parse(await readFile(new URL('../browser-tests/fixtures/rich-v2-workspace.json',import.meta.url),'utf8'));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
const page=await browser.newPage();const metrics=[];const action=n=>page.locator(`[data-action=${n}]:visible`).first();
await page.route('http://visual.test/',r=>r.fulfill({contentType:'text/html',body:source.replace('data-hosted="true"','data-hosted="false"')}));
await page.goto('http://visual.test/');await page.evaluate(w=>counterplotBridge.replace(w),fixture);
for(const [width,height]of [[1440,1000],[768,1024],[390,844],[320,640],[844,390]]){
 await page.setViewportSize({width,height});
 for(const nav of ['story','characters','connections','world','structure']){await page.locator(`[data-nav=${nav}]`).first().click();await page.screenshot({path:out+`/${nav}-${width}.png`});if(nav==='structure'){await page.locator('.plotline-tab:not(.master)[data-id]').first().click();await page.locator('.mice-palette').scrollIntoViewIfNeeded();await page.screenshot({path:out+`/outline-controls-${width}.png`});}}
 await page.locator('[data-nav=characters]').first().click();await page.locator('[data-action=edit-block][data-kind=want]').first().click();await page.locator('.dialog-body').evaluate(e=>e.scrollTop=600);await page.screenshot({path:out+`/want-scrolled-${width}.png`});await page.keyboard.press('Escape');
 await page.locator('[data-nav=story]').first().click();await action('edit-scene').click();await page.screenshot({path:out+`/writing-${width}.png`});
 metrics.push(await page.evaluate(()=>({width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,prose:document.querySelector('[data-draft=notes]').getBoundingClientRect().toJSON(),footer:document.querySelector('.dialog-foot').getBoundingClientRect().toJSON()})));
 await page.keyboard.press('Escape');
}
// CSS zoom is a supplementary stress check, not native browser zoom certification.
await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>document.documentElement.style.zoom='200%');await page.locator('[data-nav=structure]').first().click();await page.screenshot({path:out+'/outline-css-zoom-200.png'});await page.evaluate(()=>document.documentElement.style.zoom='');
await page.route('http://account-visual.test/**',r=>{const path=new URL(r.request().url()).pathname;return r.fulfill(path==='/api/auth/session'?{json:{user:'audit',email:'writer@example.test'}}:path==='/api/auth/recovery'?{json:{remaining:0}}:path==='/api/workspace'?{json:{workspace:fixture,revision:1}}:{contentType:'text/html',body:source});});
await page.goto('http://account-visual.test/');await page.locator('.sync-panel').waitFor({state:'hidden'});
for(const [width,height]of [[1440,1000],[390,844],[320,640],[844,390]]){await page.setViewportSize({width,height});await page.locator('.account-button:visible').first().click();await page.locator('[data-recovery-state]').filter({hasText:'No recovery'}).waitFor();await page.screenshot({path:out+`/account-${width}.png`});await page.keyboard.press('Escape');}
await writeFile(out+'/geometry.json',JSON.stringify(metrics,null,2));await browser.close();console.log(out);
