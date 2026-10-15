const {test,expect}=require('@playwright/test');
const Axe=require('@axe-core/playwright').default;
const {fixture,load}=require('../../docs/audits/2026-10-13-beat-board-sweep/audit.cjs');
const snapshot=page=>page.evaluate(()=>{const d=CounterplotTutorial.snapshot();return d.projects.find(p=>p.id===d.active);});
const fields=(page,id,edge='open')=>({async click(){const title=page.locator(`[data-node="${id}"] > .node-head .node-title`);if(await title.isVisible())await title.click();await page.locator(`[data-action=story-fields][data-id="${id}"][data-edge="${edge}"]`).filter({visible:true}).first().click();}});
async function add(page,label,value){await page.getByRole('button',{name:'Add field',exact:true}).click();const row=page.locator('.story-field-editor').last();await row.getByLabel('Field label',{exact:true}).fill(label);await row.getByLabel('Field value · optional',{exact:true}).fill(value);}
async function keep(page){await page.getByRole('button',{name:'Keep fields',exact:true}).click();await expect(page.locator('#dialog')).not.toBeVisible();}
test('story fields can be created, edited, removed and restored independently at each edge',async({page})=>{
 test.setTimeout(60000);
 await load(page,fixture());await page.locator('[data-node=beat] > .node-head .node-title').click();const development=page.getByRole('textbox',{name:'Beat Development',exact:true});await development.fill('She asks for help and is turned away');await page.keyboard.press('Tab');
 await fields(page,'beat').click();await add(page,'Obstacle','The officer ignores her');await keep(page);
 await expect(page.getByRole('textbox',{name:'Beat Obstacle',exact:true})).toHaveValue('The officer ignores her');
 await fields(page,'event').click();await page.getByLabel('Before value',{exact:true}).fill('A quiet carriage');await page.getByLabel('Show Before',{exact:true}).uncheck();await add(page,'Clue','A stolen wallet');await keep(page);
 const event=page.locator('[data-node=event]');await expect(event.getByRole('textbox',{name:'Event Before',exact:true})).toHaveCount(0);await expect(event.getByRole('textbox',{name:'Event Disruption',exact:true})).toBeVisible();
 await fields(page,'event','close').click();await add(page,'Consequence','She loses trust');await keep(page);
 await expect(page.getByRole('textbox',{name:'Event Consequence',exact:true})).toHaveValue('She loses trust');
 await fields(page,'event').click();await page.getByLabel('Show Before',{exact:true}).check();await page.getByRole('button',{name:'Remove custom field Clue',exact:true}).click();await keep(page);
 await expect(page.getByRole('textbox',{name:'Event Before',exact:true})).toHaveValue('A quiet carriage');await expect(page.getByRole('textbox',{name:'Event Clue',exact:true})).toHaveCount(0);
 await page.locator('[data-action=undo]').first().click();await expect(page.getByRole('textbox',{name:'Event Clue',exact:true})).toHaveValue('A stolen wallet');
 await page.getByRole('tab',{name:'Refine',exact:true}).click();await page.locator('.moment-navigation [data-id=beat]').click();await expect(development).toHaveValue('She asks for help and is turned away');
 await fields(page,'beat').click();await page.getByLabel('Show Development',{exact:true}).uncheck();await keep(page);await expect(development).toHaveCount(0);
 await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();await page.locator('.story-viewbar').waitFor();await page.getByRole('tab',{name:'Outline',exact:true}).click();
 await expect(development).toHaveCount(0);await expect(page.getByRole('textbox',{name:'Beat Obstacle',exact:true})).toHaveValue('The officer ignores her');
 await fields(page,'beat').click();await page.getByLabel('Show Development',{exact:true}).check();await keep(page);await expect(development).toHaveValue('She asks for help and is turned away');
});
test('removing character fields preserves state records and is reversible',async({page})=>{
 await load(page,fixture());const before=await snapshot(page);await fields(page,'arc').click();await page.getByLabel('Show Belief',{exact:true}).uncheck();await add(page,'Doubt','Whom can she trust?');await keep(page);
 await expect(page.getByRole('textbox',{name:'Starting Belief',exact:true})).toHaveCount(0);await expect(page.getByRole('textbox',{name:'Ending Belief',exact:true})).toBeVisible();
 const after=await snapshot(page);expect(after.characters).toEqual(before.characters);expect(after.nodes[0].characterArc).toEqual(before.nodes[0].characterArc);
 await fields(page,'arc').click();await page.getByLabel('Show Belief',{exact:true}).check();await keep(page);await expect(page.getByRole('textbox',{name:'Starting Belief',exact:true})).toBeVisible();
});
test('story field editor and long labels stay usable on narrow screens with keyboard and accessible labels',async({page})=>{
 await load(page,fixture());await fields(page,'beat').click();await add(page,'Obstacle'.repeat(12),'A'.repeat(150));

 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:width<680?568:900});await page.emulateMedia({reducedMotion:'reduce'});const g=await page.locator('#dialog').evaluate(d=>({fits:d.scrollWidth<=d.clientWidth+1,body:d.querySelector('.dialog-body').scrollWidth<=d.querySelector('.dialog-body').clientWidth+1}));expect(g).toEqual({fits:true,body:true});}
 expect((await new Axe({page}).include('#dialog').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);await keep(page);
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
});
test('unfinished custom field edits can be resumed after closing and reloading',async({page})=>{
 await load(page,fixture());await fields(page,'beat').click();await add(page,'Obstacle','An unfinished thought');await page.getByRole('button',{name:'Close dialog',exact:true}).click();
 await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();await page.locator('.story-viewbar').waitFor();await page.locator('[data-nav=archive]').first().click();await page.getByRole('tab',{name:/Unfinished edits/}).click();await page.getByRole('button',{name:'Resume',exact:true}).click();
 await expect(page.getByLabel('Field label',{exact:true})).toHaveValue('Obstacle');await expect(page.getByLabel('Field value · optional',{exact:true})).toHaveValue('An unfinished thought');await keep(page);
 const after=await snapshot(page);expect(after.nodes.find(n=>n.id==='beat').storyFields['B:open'].custom[0].text).toBe('An unfinished thought');expect(after.drafts).toEqual([]);
});
