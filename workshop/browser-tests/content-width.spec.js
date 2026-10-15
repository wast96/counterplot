const {test,expect}=require('@playwright/test');
const {fixture,load}=require('../../docs/audits/2026-10-13-beat-board-sweep/audit.cjs');
// Measure browser-rendered glyphs independently of the canvas used by the UI.
const measureFields=elements=>(Array.isArray(elements)?elements:[elements]).map(el=>{
   const style=getComputedStyle(el),span=document.createElement('span');
   Object.assign(span.style,{position:'fixed',left:'-10000px',font:style.font,letterSpacing:style.letterSpacing,whiteSpace:'pre'});
   span.textContent=el.value||el.placeholder;document.body.append(span);const text=span.getBoundingClientRect().width;span.remove();
   return {name:el.getAttribute('aria-label'),value:el.value,extra:el.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)-text,height:el.clientHeight,scroll:el.scrollHeight,line:parseFloat(style.lineHeight),padding:parseFloat(style.paddingTop)+parseFloat(style.paddingBottom)};
});
function expectSnug(box){
 const label=JSON.stringify(box);expect(box.extra,label).toBeGreaterThanOrEqual(-1);expect(box.extra,label).toBeLessThanOrEqual(5);
 expect(box.height,label).toBeGreaterThan(0);expect(box.scroll,label).toBeLessThanOrEqual(box.height+1);expect(box.height,label).toBeLessThan(box.line*2+box.padding);
}
async function snug(field){
 await expect(async()=>{const [box]=await field.evaluate(measureFields);expectSnug(box);}).toPass({timeout:5000});
}
test('compact fields follow proportional, wide, and multilingual text during typing and deletion',async({page})=>{
 await load(page,fixture());const field=page.getByRole('textbox',{name:'Event Before',exact:true});
 for(const value of ["She's on a train from Jiax",'iiiiiiiiiiii','WWWWWWWWWWWW','短语与宽字符','A train 🚂']){await field.fill(value);await snug(field);await expect(field).toBeFocused();}
 await field.fill('A train');await field.press('End');await field.pressSequentially(' from Jiax');await snug(field);
 for(let i=0;i<8;i++)await field.press('Backspace');await snug(field);
 await field.press('Tab');await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();await snug(field);
});
test('opening, closing, custom, Development and character fields stay compact across viewports',async({page})=>{
 const data=fixture();data.projects[0].nodes.find(n=>n.id==='beat').storyFields={'B:open':{hidden:[],custom:[{id:'obstacle',label:'Obstacle',text:'A narrow door'}]}};
 await load(page,data);
 const fields=page.locator('textarea.story-field-text,textarea[data-arc-inline],textarea[data-beat-inline],textarea[data-piece-state]');
 expect(await fields.count()).toBeGreaterThan(10);
 for(const field of await fields.all()){await field.fill('iiiiiiiiiiii');await snug(field);}
 await page.keyboard.press('Tab');
 // Crossing the phone breakpoint rebuilds the outline. Read the current set
 // atomically: unchanged state rows may disappear during that render.
 for(const width of [320,768,1440]){await page.setViewportSize({width,height:1000});await expect(async()=>{const boxes=await fields.evaluateAll(measureFields);expect(boxes.length).toBeGreaterThan(10);boxes.forEach(expectSnug);}).toPass({timeout:5000});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);}
 await page.getByRole('tab',{name:'Refine',exact:true}).click();await page.locator('.moment-navigation [data-id=event][data-edge=close]').click();await snug(page.getByRole('textbox',{name:'Event Resolution',exact:true}));
});

test('long planning and state phrases use available card width before wrapping',async({page})=>{
 const data=fixture(),pr=data.projects[0];
 pr.nodes.find(n=>n.id==='beat').development='Jun finds herself getting angry that her father lives in such a nice house when she and her mother lived so modestly';
 pr.nodes.find(n=>n.id==='beat').storyFields={'B:open':{hidden:[],custom:[{id:'obstacle',label:'Obstacle',text:'Her father has made a comfortable life in Shanghai without them'}]}};
 pr.nodes.find(n=>n.id==='event').threadPlans={E:{focus:'A pickpocket',from:'A peaceful journey',to:'They mercilessly beat the thief until the crowd falls silent'}};
 pr.nodes.find(n=>n.id==='inquiry').threadPlans={I:{focus:'Where is her mother?',from:'He sent for her mother as well, but only Jun showed up',to:'Her mother died seven years ago'}};
 await load(page,data);
 const fields=[page.getByRole('textbox',{name:'Event Resolution',exact:true}),page.getByRole('textbox',{name:'Inquiry Known',exact:true}),page.getByRole('textbox',{name:'Beat Development',exact:true}),page.getByRole('textbox',{name:'Beat Obstacle',exact:true})];
 for(const width of [1920,1440,1024,768,390,320]){
  await page.setViewportSize({width,height:1100});
  for(const field of fields){await expect(async()=>{
   const box=await field.evaluate(el=>{const s=getComputedStyle(el),label=el.closest('.thread-word'),row=label.parentElement,r=row.getBoundingClientRect(),l=label.getBoundingClientRect(),f=el.getBoundingClientRect(),span=document.createElement('span');span.style.cssText='position:fixed;white-space:pre;font:'+s.font;span.textContent=el.value;document.body.append(span);const text=span.getBoundingClientRect().width;span.remove();return {available:r.right-l.left-(f.left-l.left)-20,text,width:el.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight),height:el.clientHeight,line:parseFloat(s.lineHeight),padding:parseFloat(s.paddingTop)+parseFloat(s.paddingBottom),scroll:el.scrollHeight};});
   expect(box.scroll).toBeLessThanOrEqual(box.height+1);
   if(box.text+4<box.available){expect(box.width).toBeGreaterThanOrEqual(box.text);expect(box.height).toBeLessThan(box.line*2+box.padding);}
  }).toPass({timeout:3000});}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
 }
 // Character states share the same content sizing, including long recorded wording.
 await page.setViewportSize({width:1920,height:1100});
 const state=page.locator('textarea[data-arc-inline]').first();await state.fill('She wants to reconnect with her father after many years apart');await snug(state);
 const resolution=fields[0];await resolution.fill('Resolved');await snug(resolution);
});
