const {test,expect}=require('@playwright/test');
const fixture=require('./ui-fixture.cjs');
const W=require('../src/integration.js');
async function load(page,data){
 await page.goto('/');
 await page.locator('#import-file').setInputFiles({name:'spacing.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
 await page.locator('[data-action=accept-import]').click();await expect(page.locator('#dialog')).not.toBeVisible();
}
async function fits(page){expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width+1);}

test('outline headings size to content with empty and populated stories',async({page})=>{
 for(const empty of [true,false]){
  const p=W.project('Spacing review');p.nodes=empty?[]:[{...W.node('C'),id:'new-character-thread'}];W.normalize(p);const data=W.validate({format:'counterplot-workshop',schema:2,active:p.id,projects:[p]});
  await load(page,data);
  for(const width of [320,400,768,1024,1440]){
   await page.setViewportSize({width,height:900});await fits(page);
   const head=await page.locator('.page-head').boundingBox(),title=await page.locator('.page-head h1').boundingBox(),actions=await page.locator('.page-actions').boundingBox();
   expect(head.height).toBeLessThan(145);
   expect(actions.y-(title.y+title.height)).toBeLessThan(25);
   if(!empty&&width===400){
    const card=page.locator('[data-node=new-character-thread]');expect((await card.boundingBox()).height).toBeLessThan(400);
    const header=card.locator(':scope > .node-head'),text=await header.locator('.node-title').boundingBox(),buttons=await header.locator('.node-actions').boundingBox();
    expect(buttons.x).toBeGreaterThanOrEqual(text.x+text.width);
    expect(Math.abs(buttons.y-text.y)).toBeLessThan(2);
    await expect(card.getByRole('combobox',{name:'Starting State',exact:true})).toBeVisible();
    await expect(card.getByRole('combobox',{name:'Ending State',exact:true})).toBeVisible();
   }
  }
 }
});

test('main views and editors stay inside phone, tablet, and desktop layouts',async({page})=>{
 await load(page,fixture());
 for(const width of [320,400,768,1024,1440]){
  await page.setViewportSize({width,height:900});
  await page.locator('[data-nav=outline]').click();
  for(const view of ['Outline','Chronology','Sequence','Refine','Scene constructor']){
   await page.getByRole('tab',{name:view,exact:true}).click();await fits(page);
   expect((await page.locator('.page-head').boundingBox()).height,view).toBeLessThan(260);
  }
  for(const nav of ['characters','world','connections','archive']){await page.locator(`[data-nav=${nav}]`).click();await fits(page);}
  await page.locator('[data-nav=characters]').click();await page.getByRole('button',{name:'New character',exact:true}).click();
  const dialog=page.locator('#dialog'),box=await dialog.boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width);
  expect(await dialog.evaluate(e=>e.scrollWidth-e.clientWidth)).toBeLessThanOrEqual(1);
  await page.keyboard.press('Escape');
 }
});
