const {test,expect}=require('@playwright/test');
const fixture=require('./ui-fixture.cjs');
const W=require('../src/integration.js');
async function load(page,{moments=false,stress=false}={}){
 const data=fixture({stress}),p=data.projects[0],c=p.characters[0];
 c.blocks=[W.block('want','Wants to reconnect with her estranged father'),W.block('secret','Knows why he left, but has never told anyone')];
 if(!moments){p.nodes=[];p.timeline=[];p.readingOrder=[];p.readingSequence=[];c.lifeChanges=[];}
 await page.goto('/');await expect(page.locator('.story-viewbar')).toBeVisible();
 await page.locator('#import-file').setInputFiles({name:'characters.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
 await page.locator('[data-action=accept-import]').click();await expect(page.locator('#dialog')).not.toBeVisible();
 await page.locator('[data-nav=characters]').click();await expect(page.locator('.block')).toHaveCount(2);
}
test('building blocks appear above the fold alongside a square profile',async({page},testInfo)=>{
 await load(page);
 const width=page.viewportSize().width;
 const block=await page.locator('.block').first().boundingBox();
 expect(block.y+block.height).toBeLessThan(page.viewportSize().height);
 if(width>1100){const profile=await page.locator('.character-profile').boundingBox();expect(block.x).toBeGreaterThan(profile.x+profile.width);expect(block.y).toBeLessThan(360);}
 const portrait=await page.locator('.character-hero .avatar').boundingBox();expect(Math.abs(portrait.width-portrait.height)).toBeLessThan(1);
 await page.screenshot({path:testInfo.outputPath('character-workspace.png'),fullPage:true});
 await page.locator('.block-body').first().click();await expect(page.locator('#dialog')).toBeVisible();await page.locator('#dialog [data-action=close-dialog]').click();
 await page.locator('[data-action=character-tab][data-id=arc]').click();await expect(page.locator('.character-pieces')).toContainText('They don’t have to stay this way.');
 await page.locator('[data-action=character-tab][data-id=blocks]').first().click();await expect(page.locator('.block')).toHaveCount(2);
 await page.locator('.character-tools [data-action=add-block]').click();await expect(page.locator('#dialog')).toBeVisible();
});
test('long character names and timelines stay within narrow layouts',async({page})=>{
 await load(page,{moments:true,stress:true});
 for(const width of [320,390,680,768,1100,1280,1728]){
  await page.setViewportSize({width,height:900});
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
  const pieces=page.locator('.character-pieces');expect(await pieces.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
 }
 await page.locator('.time-stop[data-id="ui-node-0:close"]').click();await expect(page.locator('[data-life-status]')).toHaveText('Dead');
 await page.locator('.time-stop').first().click();await expect(page.locator('[data-life-status]')).toHaveText('Alive');
});
