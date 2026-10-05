const {test,expect}=require('@playwright/test');
const fixture=require('./ui-fixture.cjs');
const action=(p,a)=>p.locator(`[data-action="${a}"]:visible`).first();
async function load(page,stress=false){await page.goto('/');await expect(page.locator('.story-viewbar')).toBeVisible();await page.locator('#import-file').setInputFiles({name:'ui-story.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture({stress})))});await action(page,'accept-import').click();await expect(page.locator('#dialog')).not.toBeVisible();}
async function close(page){await page.locator('#dialog [data-action="close-dialog"]').click();}
async function inside(child,parent){const [c,p]=await Promise.all([child.boundingBox(),parent.boundingBox()]);expect(c.x).toBeGreaterThanOrEqual(p.x-1);expect(c.x+c.width).toBeLessThanOrEqual(p.x+p.width+1);}
test('world tags and the persistent add-person control belong to each card',async({page})=>{
 await load(page);for(const id of ['ui-node-0','ui-node-1']){const tags=page.locator(`[data-node="${id}"]>.node-foot>.cast-chips`);await expect(tags.locator('.world-chip')).toHaveCount(2);await expect(tags.locator('.cast-chip + .add-cast')).toHaveText('+ Add someone');await inside(tags, page.locator(`[data-node="${id}"]`));}
 const row=page.locator('[data-node="ui-node-0"]>.node-foot>.cast-chips');await row.locator('.add-cast').click();await expect(page.locator('#dialog input[value="ui-person"]')).toBeChecked();await page.locator('#dialog input[value="ui-other"]').check();await page.locator('#dialog [type=submit]').click();await expect(row.locator('.cast-chip')).toHaveCount(2);await expect(row.locator('.cast-chip + .add-cast')).toBeVisible();
 await row.getByRole('button',{name:'Open world entry: the blood pearl',exact:true}).click();await expect(page.locator('#dialog [name="name"]')).toHaveValue('the blood pearl');await page.locator('#dialog [name="name"]').fill('The renamed pearl');await page.locator('#dialog [type=submit]').click();await expect(page.locator('.node-foot .world-chip').filter({hasText:'The renamed pearl'})).toHaveCount(2);
 await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();await expect(page.locator('.node-foot .world-chip').filter({hasText:'The renamed pearl'})).toHaveCount(2);
});
test('life status and prominence stay with the character and follow the selected time',async({page})=>{
 await load(page);await page.locator('[data-nav=characters]').click();const hero=page.locator('.character-hero');await expect(hero.locator('.character-presence')).toContainText('Alive');await expect(hero.locator('.character-presence')).toContainText('Main cast');await expect(hero.locator('.character-presence')).toContainText('At the beginning');await inside(hero.locator('.character-presence'),hero);
 await page.locator('.time-stop[data-id="ui-node-0:close"]').click();await expect(hero.locator('[data-life-status]')).toHaveText('Dead');await expect(hero.locator('.character-presence small')).toContainText('Closing');await page.locator('.time-stop').first().click();await expect(hero.locator('[data-life-status]')).toHaveText('Alive');await hero.locator('[data-action=edit-character]').click();await expect(page.locator('#dialog [name=name]')).toHaveValue('Liu Jun');
});
test('story tabs expose selection and keyboard navigation independently of actions',async({page})=>{
 await page.goto('/');const outline=page.getByRole('tab',{name:'Outline',exact:true});await outline.focus();await outline.press('ArrowRight');await expect(page.getByRole('tab',{name:'Refine',exact:true})).toBeFocused();await page.keyboard.press('ArrowRight');await expect(page.getByRole('tab',{name:'Write',exact:true})).toBeFocused();await expect(page.getByRole('tabpanel')).toHaveAttribute('aria-labelledby','story-tab-write');await expect(page.locator('.page-head h1')).toHaveText('Write your story');await page.keyboard.press('End');await expect(page.getByRole('tab',{name:'Choices',exact:true})).toHaveAttribute('aria-selected','true');await page.keyboard.press('Home');await expect(page.getByRole('tab',{name:'Outline',exact:true})).toBeFocused();
 if(await action(page,'story-tools').isVisible()){await action(page,'story-tools').click();await action(page,'outline-text').click();}else await action(page,'outline-text').click();await expect(page.locator('#dialog textarea[name=outline]')).toBeVisible();
});
test('dialog headings and account recovery links remain inside narrow dialogs',async({page})=>{
 await load(page);for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});for(const name of ['account','export','projects']){await action(page,name).click();const dialog=page.locator('#dialog'),title=dialog.locator('#dialog-title'),utilities=dialog.locator('.dialog-utilities');await inside(title,dialog);await inside(utilities,dialog);const [a,b]=await Promise.all([title.boundingBox(),utilities.boundingBox()]);expect(a.x>=b.x+b.width||a.x+a.width<=b.x||a.y>=b.y+b.height||a.y+a.height<=b.y).toBeTruthy();expect(await dialog.evaluate(e=>e.scrollWidth-e.clientWidth)).toBeLessThanOrEqual(1);if(name==='account'){await action(page,'account-reset').click();await expect(dialog.locator('[name=code]')).toBeVisible();await inside(dialog.locator('[name=code]'),dialog);}await close(page);}}
});
test('deep outlines and long world tags fit the page and their own cards',async({page})=>{
 await load(page,true);for(const width of [320,390,680,681,900,1180,1440]){await page.setViewportSize({width,height:950});await page.getByRole('tab',{name:'Outline',exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);for(const id of ['ui-node-0','ui-node-7']){const card=page.locator(`[data-node="${id}"]`);await inside(card.locator(':scope>.node-foot>.cast-chips'),card);await inside(card.locator(':scope>.node-foot .world-chip').last(),card);expect(await card.locator(':scope>.node-head>.node-title').evaluate(e=>e.getBoundingClientRect().width)).toBeGreaterThan(35);}for(const mode of ['Sequence','Chronology','Choices','Read']){await page.getByRole('tab',{name:mode,exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);}}
});

test('all tab labels fit their hit targets at phone and tablet widths',async({page})=>{
 await page.goto('/');
 await expect(page.getByRole('tablist',{name:'Story views'})).toBeVisible();
 for(const width of [320,351,360,375,390,414,680,768]){
  await page.setViewportSize({width,height:900});
  // Crossing the mobile breakpoint rerenders the page. Measure related elements
  // together and wait for the new layout instead of retaining detached handles.
  await expect.poll(()=>page.evaluate(()=>{
   const tabs=[...document.querySelectorAll('[role=tablist][aria-label="Story views"] [role=tab]')];
   const clipped=tabs.filter(tab=>{
    const range=document.createRange();range.selectNodeContents(tab);
    const text=range.getBoundingClientRect(),box=tab.getBoundingClientRect();
    return text.left<box.left+2||text.right>box.right-2;
   }).map(t=>t.textContent);
   const heading=document.querySelector('.first-story-tip strong')?.getBoundingClientRect();
   const copy=document.querySelector('.first-story-tip p')?.getBoundingClientRect();
   return {tabCount:tabs.length,clipped,tipFits:!!heading&&!!copy&&heading.bottom<=copy.top+1,overflow:document.documentElement.scrollWidth>innerWidth+1};
  }),{message:`Tab and tip layout at ${width}px`}).toEqual({tabCount:7,clipped:[],tipFits:true,overflow:false});
 }
});
