const {test,expect}=require('@playwright/test');
const {fixture,load}=require('../../docs/audits/2026-10-13-beat-board-sweep/audit.cjs');
const W=require('../src/integration.js');
const snapshot=page=>page.evaluate(()=>{const d=CounterplotTutorial.snapshot();return d.projects.find(p=>p.id===d.active);});

test('outline badges, first title lines and controls align without hover movement',async({page})=>{
 const data=fixture(),p=data.projects[0];p.nodes.push({...W.node('B'),id:'standalone',title:'An independent beat'});
 await load(page,data);
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  for(const id of ['event','beat','standalone']){
   const header=page.locator(`[data-node=${id}] > .node-head`);await header.scrollIntoViewIfNeeded();
   const measure=()=>header.evaluate(e=>{const rect=x=>x.getBoundingClientRect(),center=x=>{const r=rect(x);return r.top+r.height/2;},title=e.querySelector('.node-title'),s=getComputedStyle(title);return {badge:center(e.querySelector('.piece-mark')),grip:center(e.querySelector('.grip')),text:rect(title).top+parseFloat(s.paddingTop)+parseFloat(s.lineHeight)/2,left:rect(e).left,width:rect(e).width};});
   const before=await measure();expect(Math.abs(before.badge-before.text)).toBeLessThan(1);expect(Math.abs(before.grip-before.text)).toBeLessThan(1);
   await header.hover();const after=await measure();expect(after.left).toBeCloseTo(before.left,1);expect(after.width).toBeCloseTo(before.width,1);
  }
 }
});

test('long titles remain fully readable as the viewport narrows',async({page})=>{
 await load(page,fixture());const title=page.locator('[data-node=beat] > .node-head .node-title');
 await title.fill('A long scene title that should stay visible while editing and resizing. '.repeat(12));await page.keyboard.press('Tab');
 for(const width of [1440,768,390,320,1440]){await page.setViewportSize({width,height:900});await expect.poll(()=>title.evaluate(e=>e.scrollHeight<=e.clientHeight+1)).toBe(true);}
});

test('the details editor distinguishes Development from the beat plan and mirrors live edits',async({page},info)=>{
 await load(page,fixture());await page.locator('[data-node=beat] > .node-head [data-action=select-node]').click();
 if(info.project.name!=='mobile')await page.getByRole('button',{name:'Expand details to full width',exact:true}).click();
 const details=page.locator('.inspector'),development=details.getByRole('textbox',{name:'Beat Development',exact:true}),plan=details.getByRole('textbox',{name:'Beat plan',exact:true});
 await development.fill('She asks the police for help');await plan.fill('The request begins politely, then turns into an accusation.');await page.keyboard.press('Tab');
 const n=(await snapshot(page)).nodes.find(n=>n.id==='beat');expect(n.development).toBe('She asks the police for help');expect(n.opening).toBe('The request begins politely, then turns into an accusation.');
 await expect(page.locator('[data-node=beat] [data-field=development]')).toHaveValue(n.development);
 await expect(page.locator('[data-node=beat] [data-field=opening]')).toHaveValue(n.opening);
 await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();await page.locator('.story-viewbar').waitFor();
 expect((await snapshot(page)).nodes.find(n=>n.id==='beat').development).toBe(n.development);
});

test('Development wraps long text without clipping while typing or resizing',async({page})=>{
 await load(page,fixture());await page.locator('[data-node=beat] > .node-head .node-title').click();const field=page.locator('[data-node=beat] [data-field=development]');
 await field.fill('Help');const short=(await field.boundingBox()).height;
 const text='She questions the officers and realizes that the system may not be perfect. '.repeat(8);await field.fill(text);
 expect((await field.boundingBox()).height).toBeGreaterThan(short+20);
 for(const width of [320,390,900,1440]){await page.setViewportSize({width,height:1000});await expect.poll(()=>field.evaluate(el=>el.scrollWidth<=el.clientWidth+1&&el.scrollHeight<=el.clientHeight+1)).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.keyboard.press('Tab');await expect(field).toHaveValue(text);await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();await expect(field).toHaveValue(text);
 await page.screenshot({path:'/tmp/development-'+test.info().project.name+'.png',fullPage:true});
});

test('leaving mobile details clears its old editor controls',async({page})=>{
 await page.setViewportSize({width:390,height:844});await load(page,fixture());await page.locator('[data-node=beat] > .node-head [data-action=select-node]').click();await expect(page.locator('#details-sheet')).toBeVisible();await page.locator('#details-sheet [data-action=write-node]').click();await expect(page.locator('.refine-piece').getByRole('textbox',{name:'Beat plan',exact:true})).toBeVisible();await expect(page.locator('#details-sheet')).not.toBeVisible();await expect(page.locator('#details-sheet [data-inline]')).toHaveCount(0);
});
