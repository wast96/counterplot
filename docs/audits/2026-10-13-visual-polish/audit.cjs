const {chromium}=require('playwright'),Axe=require('@axe-core/playwright').default,fs=require('fs');
const {fixture,load,geometry}=require('../2026-10-13-beat-board-sweep/audit.cjs');
const out='/tmp/counterplot-visual-polish';fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium'}),rows=[];
for(const stress of [false,true])for(const width of [320,390,768,1024,1440,1920]){
 const context=await browser.newContext({viewport:{width,height:width<680?650:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await load(page,fixture(stress));
 if(!stress&&width===1440){await page.locator('[data-node=beat]').evaluate(e=>window.scrollTo(0,e.getBoundingClientRect().top+scrollY-200));await page.locator('[data-node=beat]').screenshot({path:out+'/beat-alignment.png'});}
 await page.locator('[data-nav=characters]').click();await page.locator('[data-action=time][data-id="beat:open"]').click();const row={stress,width,character:await geometry(page)};
 if(!stress&&[390,1440].includes(width))await page.screenshot({path:out+'/character-'+width+'.png'});
 row.axe=(await new Axe({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}));
 for(const action of ['new','timing']){
  if(action==='new'){await page.getByRole('button',{name:'Add block',exact:true}).click();await page.locator('[data-action=choose-kind][data-id=method]').click();}else await page.locator('[data-block=want] [data-action=block-start]').click();
  row[action]=await page.locator('#dialog').evaluate(e=>({fits:e.scrollWidth<=e.clientWidth+1,bodyFits:e.querySelector('.dialog-body').scrollWidth<=e.querySelector('.dialog-body').clientWidth+1,at:e.querySelector('[name=at]').value}));
  row[action].axe=(await new Axe({page}).include('#dialog').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}));
  if(!stress&&width===390&&action==='timing')await page.locator('#dialog').screenshot({path:out+'/timing-mobile.png'});
  await page.getByRole('button',{name:'Close dialog',exact:true}).click();
 }
 row.errors=errors;rows.push(row);console.log(JSON.stringify(row));await context.close();
}
fs.writeFileSync(out+'/timing-layouts.json',JSON.stringify(rows,null,2));await browser.close();})();
