const {test,expect}=require('@playwright/test');
const fixture=require('./ui-fixture.cjs');
async function load(page){await page.goto('/');await expect(page.locator('.story-viewbar')).toBeVisible();const data=fixture();data.projects[0].nodes[0].goal='Find the pearl';await page.locator('#import-file').setInputFiles({name:'refine.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await page.locator('[data-action=accept-import]').click();await expect(page.locator('#dialog')).not.toBeVisible();}
const view=(page,name)=>page.getByRole('tab',{name,exact:true}).click();
const snapshot=page=>page.evaluate(()=>{const d=CounterplotTutorial.snapshot();return d.projects.find(p=>p.id===d.active);});
const moment=(page,action,id,edge)=>page.locator(`.moment-navigation [data-action=${action}][data-id=${id}][data-edge=${edge}]`);

test('closing prose has its own draft, status, undo, reload, and manuscript position',async({page})=>{
 await load(page);const before=await snapshot(page);await view(page,'Write');await expect(page.locator('.moment-navigation button')).toHaveCount(3);
 await moment(page,'write-node','ui-node-0','close').click();await page.getByLabel('Closing draft prose').fill('The pearl falls into the sea.');await expect(page.locator('#word-count')).toHaveText('6 words');await page.getByRole('button',{name:'Mark on the page',exact:true}).click();
 let p=await snapshot(page);expect(p.nodes[0].prose).toBe(before.nodes[0].prose);expect(p.nodes[0].closing).toBe(before.nodes[0].closing);expect(p.nodes[0].closingWritingStatus).toBe('done');expect(p.nodes[0].writingStatus).toBeUndefined();expect(p.timeline).toEqual(before.timeline);
 await page.locator('.topbar [data-action=undo]').click();expect((await snapshot(page)).nodes[0].closingWritingStatus).toBe('draft');await page.locator('.topbar [data-action=undo]').click();await expect(page.getByLabel('Closing draft prose')).toHaveValue('');await page.locator('.topbar [data-action=redo]').click();
 await view(page,'Read');await expect(page.locator('.manuscript-prose')).toHaveText(['A paragraph of story prose.','A paragraph of story prose.','The pearl falls into the sea.']);
 await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();await view(page,'Write');await moment(page,'write-node','ui-node-0','close').click();await expect(page.getByLabel('Closing draft prose')).toHaveValue('The pearl falls into the sea.');
});

test('Refine edits opening, closing and beat craft independently and scene craft links route there',async({page})=>{
 await load(page);await view(page,'Write');await moment(page,'write-node','ui-node-0','close').click();
 if(test.info().project.name==='mobile'){await page.getByRole('button',{name:'Refine this closing',exact:true}).click();}else{await page.getByRole('button',{name:'Scene craft & links',exact:true}).click();}
 await expect(page.getByRole('tab',{name:'Refine',exact:true})).toHaveAttribute('aria-selected','true');await expect(page.locator('#dialog')).not.toBeVisible();await expect(page.locator('.refine-piece')).toHaveAttribute('data-refine-moment','ui-node-0:close');
 await page.getByLabel('Closing plan',{exact:true}).fill('She lets it go.');await page.locator('[data-inline=prompt][data-field=earned]').fill('The clues prepare the escape.');
 await page.getByRole('button',{name:'Add someone',exact:true}).click();await page.getByLabel('Find a person').fill('Ocelot');await page.locator('#refine-picker-results [data-id=ui-other]').click();await expect(page.locator('.refine-person')).toHaveCount(2);await page.getByLabel('Role for Ocelot').selectOption('oppose');await page.getByLabel('Viewpoint',{exact:true}).selectOption('ui-other');
 await page.getByRole('button',{name:'Link a piece',exact:true}).click();await page.getByLabel('How are they connected?').selectOption('parent');await page.locator('#refine-picker-results [data-id=ui-node-1]').click();await expect(page.locator('.refine-link')).toContainText('Follows from');
 const p=await snapshot(page);expect(p.nodes[0].goal).toBe('Find the pearl');expect(p.nodes[0].closingCraft.refinement.earned).toBe('The clues prepare the escape.');expect(p.nodes[0].closingCraft.parent).toBe('ui-node-1');expect(p.nodes[0].closingCraft.povId).toBe('ui-other');expect(p.nodes[0].povId).toBeUndefined();expect(p.nodes[0].cast).toEqual(['ui-person']);
 await moment(page,'refine-node','ui-node-0','open').click();await page.locator('[data-inline=prompt][data-field=onPage]').fill('A witness finds a clue.');await page.getByText('Additional craft notes',{exact:true}).click();await expect(page.locator('.refine-form [name=goal]')).toHaveValue('Find the pearl');
 await expect(page.getByText('Lane label',{exact:true})).toHaveCount(0);await expect(page.getByText('Approach',{exact:true})).toHaveCount(0);await expect(page.getByText('Thread links',{exact:true})).toHaveCount(0);
 await moment(page,'refine-node','ui-node-1','open').click();await page.locator('[data-inline=prompt][data-field=change]').fill('The witness becomes a suspect.');await page.getByRole('button',{name:'Write this beat',exact:true}).click();await expect(page.locator('.manuscript')).toHaveAttribute('data-writing-moment','ui-node-1:open');
 await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();await view(page,'Refine');await moment(page,'refine-node','ui-node-0','close').click();await expect(page.locator('[data-inline=prompt][data-field=earned]')).toHaveValue('The clues prepare the escape.');await expect(page.getByLabel('Closing plan',{exact:true})).toHaveValue('She lets it go.');
 await moment(page,'refine-node','ui-node-0','open').click();await expect(page.locator('[data-inline=prompt][data-field=onPage]')).toHaveValue('A witness finds a clue.');
});

test('Refine sits before Write, supports keyboard tabs and fits narrow screens',async({page})=>{
 await load(page);const outline=page.getByRole('tab',{name:'Outline',exact:true});await outline.focus();await outline.press('ArrowRight');await expect(page.getByRole('tab',{name:'Refine',exact:true})).toBeFocused();await expect(page.getByRole('tabpanel')).toHaveAttribute('aria-labelledby','story-tab-refine');await page.keyboard.press('ArrowRight');await expect(page.getByRole('tab',{name:'Write',exact:true})).toBeFocused();
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:950});for(const mode of ['Refine','Write']){await view(page,mode);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);}}
});

test('thread questions reflect MICE and beat prompts describe a contribution',async({page},testInfo)=>{
 await load(page);await view(page,'Refine');
 await expect(page.getByText('What prevents things from being put right immediately?',{exact:true})).toBeVisible();await expect(page.locator('.refine-person')).toHaveCount(1);await expect(page.locator('.refine-form [name=goal]')).not.toBeVisible();
 await view(page,'Outline');await page.locator('[data-action=select-node][data-id=ui-node-0]').click();await page.locator('[data-action=node-type][data-type=C]').click();await page.getByRole('button',{name:'Scene craft & links',exact:true}).click();
 await expect(page.getByText('What belief, desire, or dissatisfaction starts this character’s change?',{exact:true})).toBeVisible();await expect(page.getByText('What puts pressure on this way of thinking or living?',{exact:true})).toBeVisible();
 await page.screenshot({path:testInfo.outputPath('refine.png'),fullPage:true});
 await moment(page,'refine-node','ui-node-0','close').click();await expect(page.getByText('What earlier choices make this change believable?',{exact:true})).toBeVisible();
 await moment(page,'refine-node','ui-node-1','open').click();await expect(page.getByText('What changes because of this beat?',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Link a piece',exact:true}).click();await page.getByLabel('Find a piece').fill('Discovery');await page.locator('#refine-picker-results [data-id=ui-node-0]').click();await expect(page.locator('.refine-link')).toContainText('Advances the thread');await page.locator('.refine-link [data-action=refine-remove-link]').click();await expect(page.locator('.refine-link')).toHaveCount(0);await page.locator('.topbar [data-action=undo]').click();await expect(page.locator('.refine-link')).toHaveCount(1);
});

test('Refine and Write share page geometry and details controls',async({page})=>{
 await load(page);
 for(const width of [390,1440,1800]){
  await page.setViewportSize({width,height:1000});await view(page,'Write');
  const geometry=()=>page.locator('.writing-layout').evaluate(el=>{const sels=['.scene-list','.manuscript','.draft-title','.moment-switcher'];return sels.map(s=>{const n=el.querySelector(s),r=n.getBoundingClientRect(),c=getComputedStyle(n);return {x:r.x,width:r.width,font:c.fontSize,padding:c.padding};});});
  const write=await geometry();await view(page,'Refine');expect(await geometry()).toEqual(write);await expect(page.locator('.tray')).toHaveCount(0);await expect(page.getByRole('button',{name:'Manage plots',exact:true})).toBeVisible();
 }
 await page.getByRole('button',{name:'Focus on refining',exact:true}).click();await expect(page.locator('.refine-piece')).toBeVisible();await expect(page.locator('.inspector')).not.toBeVisible();await page.getByRole('button',{name:'Leave focus mode',exact:true}).click();await expect(page.locator('.workbench-grid>.inspector')).toBeVisible();
});
