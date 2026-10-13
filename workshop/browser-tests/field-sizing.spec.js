const {test,expect}=require('@playwright/test');
const {fixture,load}=require('../../docs/audits/2026-10-13-beat-board-sweep/audit.cjs');
const longText='The police beat the thief up mercilessly ahtoaihtioaehtaoihtoiahte';
async function readable(field){
 await expect.poll(()=>field.evaluate(el=>({width:el.scrollWidth<=el.clientWidth+1,height:el.scrollHeight<=el.clientHeight+1}))).toEqual({width:true,height:true});
 const blank=await field.evaluate(el=>{const box=el.closest('.thread-word'),right=Math.max(...[...box.children].map(c=>c.getBoundingClientRect().right));return box.getBoundingClientRect().right-right;});
 expect(blank).toBeLessThanOrEqual(13);
}
test('Resolution wraps as it grows without an expanding empty container and shrinks on deletion',async({page})=>{
 await load(page,fixture());await page.locator('[data-node=event] > .node-head .node-title').click();const field=page.getByRole('textbox',{name:'Event Resolution',exact:true});
 await field.fill('The police');const short=(await field.boundingBox()).height;
 await field.press('End');await field.pressSequentially(' beat the thief up mercilessly ahtoaihtioaehtaoihtoiahte');
 await field.screenshot({path:'/tmp/resolution-field-'+test.info().project.name+'.png'});
 await readable(field);expect((await field.boundingBox()).height).toBeGreaterThan(short+5);await expect(field).toHaveValue(longText);
 for(const width of [320,390,900,1440]){await page.setViewportSize({width,height:1000});await expect(field).toHaveValue(longText);await readable(field);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}
 await field.fill('Resolved');await readable(field);expect((await field.boundingBox()).height).toBeLessThan(short+5);
 await field.fill(longText);await page.keyboard.press('Tab');await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();await expect(field).toHaveValue(longText);await readable(field);
 await page.getByRole('tab',{name:'Refine',exact:true}).click();await page.locator('.moment-navigation [data-id=event][data-edge=close]').click();await readable(page.getByRole('textbox',{name:'Event Resolution',exact:true}));
});
test('all opening, closing, additional outcome, custom and Development fields share wrapping behavior',async({page})=>{
 const data=fixture();data.projects[0].nodes.find(n=>n.id==='beat').storyFields={'B:open':{hidden:[],custom:[{id:'obstacle',label:'Obstacle',text:''}]}};await load(page,data);await page.locator('[data-node=event] > .node-head .node-title').click();await page.getByRole('button',{name:'Add another resolution',exact:true}).click();
 const fields=page.locator('.thread-word textarea,.thread-word input');
 for(const field of await fields.all()){const id=await field.evaluate(el=>el.closest('[data-node]')?.dataset.node);if(id)await page.locator(`[data-node="${id}"] > .node-head .node-title`).click();await field.fill(longText);await readable(field);}
 await page.keyboard.press('Tab');
 await page.setViewportSize({width:1800,height:1000});const development=page.getByRole('textbox',{name:'Beat Development',exact:true});await expect.poll(()=>development.evaluate(el=>el.clientHeight<parseFloat(getComputedStyle(el).lineHeight)*2)).toBe(true);
 await page.setViewportSize({width:390,height:1000});for(const field of await fields.all())await readable(field);
 await page.getByRole('button',{name:'Remove additional resolution',exact:true}).click();await expect(page.getByRole('textbox',{name:'Event Resolution · additional outcome',exact:true})).toHaveCount(0);
});
test('empty World and Leaving hints stay one line before and after editing or resizing',async({page})=>{
 await load(page,fixture());await page.locator('[data-node=milieu] > .node-head .node-title').click();
 for(const label of ['Milieu World','Milieu Leaving']){const field=page.getByRole('textbox',{name:label,exact:true});
 for(const width of [1440,390,320]){await page.setViewportSize({width,height:1000});await expect.poll(()=>field.evaluate(el=>el.clientHeight<parseFloat(getComputedStyle(el).lineHeight)*2)).toBe(true);await field.fill(longText);await readable(field);await field.fill('');await expect.poll(()=>field.evaluate(el=>el.clientHeight<parseFloat(getComputedStyle(el).lineHeight)*2)).toBe(true);}
 }
});
