const {test,expect}=require('@playwright/test'),AxeBuilder=require('@axe-core/playwright').default;
const fixture=require('./ui-fixture.cjs');
const snapshot=page=>page.evaluate(()=>{const d=CounterplotTutorial.snapshot();return d.projects.find(p=>p.id===d.active);});
async function load(page,data=fixture()){
 await page.goto('/');await expect(page.locator('.story-viewbar')).toBeVisible();
 await page.locator('#import-file').setInputFiles({name:'board.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
 await page.locator('[data-action=accept-import]').click();await expect(page.locator('#dialog')).not.toBeVisible();
 await page.getByRole('tab',{name:'Scene constructor',exact:true}).click();
}
const add=page=>page.locator('.beat-board-tools [data-action=board-add]').click();
const titles=page=>page.locator('[data-field=beats]').evaluateAll(xs=>xs.map(x=>x.value));
function legacyBoard(){const data=fixture();delete data.projects[0].scenes;Object.assign(data.projects[0].nodes[0],{entry:'Before',exit:'After',beats:['First','Same','Same','Last']});return data;}
test('a scene can be planned before adding outline moments and beat writeups persist independently',async({page})=>{
 await load(page);const before=await snapshot(page);await expect(page.locator('.beat-board')).toHaveCount(0);
 await page.getByRole('button',{name:'Start your first scene',exact:true}).click();
 await page.getByRole('textbox',{name:'Scene title',exact:true}).fill('The arrest');await page.getByRole('textbox',{name:'Scene plan',exact:true}).fill('A witness must choose between safety and loyalty.');
 await page.getByRole('button',{name:'Choose story moments',exact:true}).click();
 for(const key of ['ui-node-0:open','ui-node-1:open','ui-node-0:close'])await page.locator(`#dialog input[value="${key}"]`).check();
 await page.getByRole('button',{name:'Keep story moments',exact:true}).click();await expect(page.locator('.scene-includes li')).toHaveCount(3);
 await add(page);await page.getByRole('textbox',{name:'Beat 1 title',exact:true}).fill('The warning');await page.getByRole('textbox',{name:'Beat 1 writeup',exact:true}).fill('A quiet gesture reveals the trap.');
 await add(page);await page.getByRole('textbox',{name:'Beat 2 title',exact:true}).fill('The choice');await page.getByRole('textbox',{name:'Beat 2 writeup',exact:true}).fill('She stays to protect the witness.');await page.keyboard.press('Tab');
 await page.getByRole('button',{name:'Move beat 2 earlier',exact:true}).click();await expect(page.getByRole('textbox',{name:'Beat 1 writeup',exact:true})).toHaveValue('She stays to protect the witness.');
 await page.locator('.topbar [data-action=undo]').click();await expect(page.getByRole('textbox',{name:'Beat 1 writeup',exact:true})).toHaveValue('A quiet gesture reveals the trap.');
 const after=await snapshot(page);expect(after.nodes).toEqual(before.nodes);expect(after.timeline).toEqual(before.timeline);expect(after.readingSequence).toEqual(before.readingSequence);expect(after.characters).toEqual(before.characters);
 await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();await page.getByRole('tab',{name:'Scene constructor',exact:true}).click();await expect(page.getByRole('textbox',{name:'Scene plan',exact:true})).toHaveValue('A witness must choose between safety and loyalty.');await expect(page.getByRole('textbox',{name:'Beat 2 writeup',exact:true})).toHaveValue('She stays to protect the witness.');
 await page.getByRole('button',{name:'Start a scene',exact:true}).click();await expect(page.getByRole('textbox',{name:'Scene plan',exact:true})).toHaveValue('');await expect(page.locator('[data-field=beats]')).toHaveCount(0);
 await page.getByRole('button',{name:'Archive scene',exact:true}).click();await page.locator('.topbar [data-action=undo]').click();expect((await snapshot(page)).scenes).toHaveLength(2);
});
test('legacy boards migrate once and remain after archiving their linked outline pieces and exporting',async({page})=>{
 const data=legacyBoard();data.projects[0].nodes[0].closingCraft={cast:[],worldIds:[],entry:'Closing start',exit:'Closing end',beats:['Closing card']};await load(page,data);
 await expect(page.locator('[aria-label=Scenes] button')).toHaveCount(2);await expect.poll(()=>titles(page)).toEqual(['First','Same','Same','Last']);
 await page.getByRole('tab',{name:'Outline',exact:true}).click();await page.locator('[data-node=ui-node-0] > .node-head .piece-menu>summary').click();await page.locator('[data-node=ui-node-0] > .node-head [data-action=archive-node]').click();await page.getByRole('tab',{name:'Scene constructor',exact:true}).click();await expect(page.locator('.scene-includes')).toContainText('Archived or removed piece');await expect.poll(()=>titles(page)).toEqual(['First','Same','Same','Last']);
 await page.locator('[aria-label=Scenes] button').nth(1).click();await expect(page.locator('#board-card-0')).toHaveValue('Closing card');
 await page.locator('.topbar [data-action=export]').click();const downloaded=page.waitForEvent('download');await page.locator('[data-action=export-json]').click();const file=await downloaded,fs=require('node:fs'),exported=JSON.parse(fs.readFileSync(await file.path(),'utf8'));await page.keyboard.press('Escape');
 await load(page,exported);await expect(page.locator('[aria-label=Scenes] button')).toHaveCount(2);await page.locator('[aria-label=Scenes] button').nth(1).click();await expect(page.locator('#board-exit')).toHaveValue('Closing end');
});
test('scene beat drag and keyboard reorder move the complete beat with its writeup',async({page})=>{
 await load(page,legacyBoard());await page.getByRole('textbox',{name:'Beat 4 writeup',exact:true}).fill('Final beat writeup');await page.keyboard.press('Tab');
 await page.evaluate(()=>{const source=document.querySelector('[data-board-drag="3"]'),target=document.querySelector('[data-board-index="0"]'),dataTransfer=new DataTransfer();source.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer}));target.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer}));target.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer}));});
 await expect.poll(()=>titles(page)).toEqual(['Last','First','Same','Same']);await expect(page.getByRole('textbox',{name:'Beat 1 writeup',exact:true})).toHaveValue('Final beat writeup');
 await page.locator('[data-board-drag="0"]').focus();await page.keyboard.press('Alt+ArrowRight');await expect.poll(()=>titles(page)).toEqual(['First','Last','Same','Same']);await expect(page.locator('[data-board-drag="1"]')).toBeFocused();await expect(page.getByRole('textbox',{name:'Beat 2 writeup',exact:true})).toHaveValue('Final beat writeup');
 await expect(page.locator('#board-entry')).toHaveValue('Before');await expect(page.locator('#board-exit')).toHaveValue('After');
 await page.locator('[data-board-index="1"] [data-action=board-add]').click();await expect(page.locator('#board-card-2')).toBeFocused();await page.locator('#board-card-2').fill('Inserted');await page.getByRole('button',{name:'Archive beat 3',exact:true}).click();await expect(page.locator('#board-card-2')).toBeFocused();
});
test('scene planning and beat writeups fit narrow and wide screens and are accessible',async({page})=>{
 const data=legacyBoard();data.projects[0].nodes[0].beats=['A'.repeat(400),'A quiet moment'];await load(page,data);
 for(const width of [320,390,768,1024,1440,1920]){await page.setViewportSize({width,height:1000});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);}
 const scan=await new AxeBuilder({page}).include('#main').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(scan.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
 await page.setViewportSize({width:test.info().project.name==='mobile'?390:1440,height:1000});await page.screenshot({path:'/tmp/scene-constructor-'+test.info().project.name+'.png',fullPage:true});
});
test('Match outline resets each whole view independently and supports Undo, filters and reload',async({page})=>{
 const data=fixture(),p=data.projects[0];p.readingSequence.reverse();p.readingOrder=p.readingSequence.filter(k=>k.endsWith(':open')).map(k=>k.slice(0,-5));p.timeline.reverse();
 p.timeline.splice(1,0,{id:'memory',key:'memory:moment',nodeId:'',edge:'open',title:'Before arriving',storyDate:'1929-01-01'});
 await load(page,data);const before=await snapshot(page),expected=['ui-node-0:open','ui-node-1:open','ui-node-0:close'];
 await page.getByRole('tab',{name:'Sequence',exact:true}).click();await page.getByRole('button',{name:'Match outline',exact:true}).click();
 expect((await snapshot(page)).readingSequence).toEqual(expected);expect((await snapshot(page)).timeline).toEqual(before.timeline);
 await page.locator('.topbar [data-action=undo]').click();expect((await snapshot(page)).readingSequence).toEqual(before.readingSequence);await page.locator('.topbar [data-action=redo]').click();
 await page.getByRole('tab',{name:'Chronology',exact:true}).click();await page.getByRole('button',{name:'Group by date',exact:true}).click();await page.locator('.story-filter-menu summary').click();await page.locator('#story-cast-filter').selectOption('ui-other');await page.locator('.story-filter-menu summary').click();
 await page.getByRole('button',{name:'Match outline',exact:true}).click();const after=await snapshot(page);expect(after.timeline.filter(e=>e.nodeId).map(e=>e.key)).toEqual(expected);expect(after.timeline[1]).toEqual(before.timeline[1]);expect(after.readingSequence).toEqual(expected);
 await expect(page.getByRole('button',{name:'Group by date',exact:true})).toBeVisible();await page.getByRole('button',{name:'Clear filters',exact:true}).last().click();await expect(page.locator('.timeline-moment')).toHaveCount(4);
 await page.locator('.topbar [data-action=undo]').click();expect((await snapshot(page)).timeline).toEqual(before.timeline);await page.locator('.topbar [data-action=redo]').click();
 await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();await expect(page.locator('.story-viewbar')).toBeVisible();expect((await snapshot(page)).timeline).toEqual(after.timeline);
});
