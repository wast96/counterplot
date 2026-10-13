const {test,expect}=require('@playwright/test'),AxeBuilder=require('@axe-core/playwright').default;
const fixture=require('./ui-fixture.cjs');
const snapshot=page=>page.evaluate(()=>{const d=CounterplotTutorial.snapshot();return d.projects.find(p=>p.id===d.active);});
async function load(page,data=fixture()){
 await page.goto('/');await expect(page.locator('.story-viewbar')).toBeVisible();
 await page.locator('#import-file').setInputFiles({name:'board.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
 await page.locator('[data-action=accept-import]').click();await expect(page.locator('#dialog')).not.toBeVisible();
 await page.getByRole('tab',{name:'Beat board',exact:true}).click();
}
const select=async(page,id,edge='open')=>page.locator(`.moment-navigation [data-id="${id}"][data-edge="${edge}"]`).click();
const add=page=>page.locator('.beat-board-tools [data-action=board-add]').click();
test('scene boards keep opening, closing and beat cards independent through edits, undo, reorder and reload',async({page})=>{
 const data=fixture();Object.assign(data.projects[0].nodes[0],{entry:'An empty platform',exit:'The train departs',beats:['A whistle','A goodbye']});
 await load(page,data);const before=await snapshot(page);
 await expect(page.locator('.story-viewbar [role=tab]')).toHaveText(['Outline','Chronology','Sequence','Refine','Beat board']);
 await expect(page.getByRole('textbox',{name:'Beginning of scene',exact:true})).toHaveValue('An empty platform');
 await expect.poll(()=>page.locator('[data-field=beats]').evaluateAll(xs=>xs.map(x=>x.value))).toEqual(['A whistle','A goodbye']);
 await page.getByRole('button',{name:'Move moment 2 earlier',exact:true}).click();
 await expect.poll(()=>page.locator('[data-field=beats]').evaluateAll(xs=>xs.map(x=>x.value))).toEqual(['A goodbye','A whistle']);
 await page.locator('.topbar [data-action=undo]').click();await expect.poll(()=>page.locator('[data-field=beats]').evaluateAll(xs=>xs.map(x=>x.value))).toEqual(['A whistle','A goodbye']);
 await page.locator('.topbar [data-action=redo]').click();await add(page);await expect(page.locator('#board-card-2')).toBeFocused();
 await page.locator('#board-card-2').fill('A decision\nShe boards the train.');await page.keyboard.press('Tab');
 await page.getByRole('button',{name:'Remove moment 2',exact:true}).click();await page.locator('.topbar [data-action=undo]').click();
 await select(page,'ui-node-0','close');await expect(page.locator('#board-entry')).toHaveValue('');await expect(page.locator('[data-field=beats]')).toHaveCount(0);
 await page.locator('#board-entry').fill('At the station');await page.locator('#board-exit').fill('A new destination');await add(page);await page.locator('#board-card-0').fill('She chooses a new route');
 await select(page,'ui-node-1');await expect(page.locator('[data-field=beats]')).toHaveCount(0);await add(page);await page.locator('#board-card-0').fill('She spots the pearl');
 await page.getByRole('button',{name:'Refine this scene',exact:true}).click();await expect(page.getByRole('tab',{name:'Refine',exact:true})).toHaveAttribute('aria-selected','true');await expect(page.locator('.refine-piece')).toHaveAttribute('data-refine-moment','ui-node-1:open');
 await page.locator('.refine-moment-tools [data-action=board-node]').click();await expect(page.locator('#board-card-0')).toHaveValue('She spots the pearl');
 const after=await snapshot(page);expect(after.timeline).toEqual(before.timeline);expect(after.readingSequence).toEqual(before.readingSequence);expect(after.characters).toEqual(before.characters);
 await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();await page.getByRole('tab',{name:'Beat board',exact:true}).click();
 await select(page,'ui-node-0');await expect.poll(()=>page.locator('[data-field=beats]').evaluateAll(xs=>xs.map(x=>x.value))).toEqual(['A goodbye','A whistle','A decision\nShe boards the train.']);
 await select(page,'ui-node-0','close');await expect(page.locator('#board-entry')).toHaveValue('At the station');await expect(page.locator('#board-exit')).toHaveValue('A new destination');await expect(page.locator('#board-card-0')).toHaveValue('She chooses a new route');
});
test('scene card drag and keyboard reordering preserve endpoints and support duplicate text',async({page})=>{
 const data=fixture();Object.assign(data.projects[0].nodes[0],{entry:'Before',exit:'After',beats:['First','Same','Same','Last']});await load(page,data);
 await page.evaluate(()=>{const source=document.querySelector('[data-board-drag="3"]'),target=document.querySelector('[data-board-index="0"]');const dataTransfer=new DataTransfer();source.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer}));target.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer}));target.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer}));});
 await expect.poll(()=>page.locator('[data-field=beats]').evaluateAll(xs=>xs.map(x=>x.value))).toEqual(['Last','First','Same','Same']);
 await page.locator('[data-board-drag="0"]').focus();await page.keyboard.press('Alt+ArrowRight');await expect.poll(()=>page.locator('[data-field=beats]').evaluateAll(xs=>xs.map(x=>x.value))).toEqual(['First','Last','Same','Same']);await expect(page.locator('[data-board-drag="1"]')).toBeFocused();
 await expect(page.locator('#board-entry')).toHaveValue('Before');await expect(page.locator('#board-exit')).toHaveValue('After');
 await page.locator('[data-board-index="1"] [data-action=board-add]').click();await expect(page.locator('#board-card-2')).toBeFocused();await page.locator('#board-card-2').fill('Inserted');
 await expect.poll(()=>page.locator('[data-field=beats]').evaluateAll(xs=>xs.map(x=>x.value))).toEqual(['First','Last','Inserted','Same','Same']);
 await page.getByRole('button',{name:'Remove moment 3',exact:true}).click();await expect(page.locator('#board-card-2')).toBeFocused();
});
test('scene boards survive archive, restoration and a JSON export/import round trip',async({page})=>{
 const data=fixture();Object.assign(data.projects[0].nodes[0],{entry:'Before',exit:'After',beats:['One','Two'],closingCraft:{cast:[],worldIds:[],entry:'Closing start',exit:'Closing end',beats:['Closing card']}});await load(page,data);
 await page.getByRole('tab',{name:'Outline',exact:true}).click();await page.locator('[data-node=ui-node-0] > .node-head [data-action=archive-node]').click();
 await page.getByRole('tab',{name:'Beat board',exact:true}).click();await expect(page.locator('.beat-board')).toHaveCount(0);
 await page.locator('[data-nav=archive]').first().click();await page.locator('[data-action=restore]').first().click();await page.locator('[data-nav=outline]').first().click();await page.getByRole('tab',{name:'Beat board',exact:true}).click();
 await select(page,'ui-node-0','close');await expect(page.locator('#board-card-0')).toHaveValue('Closing card');
 await page.locator('.topbar [data-action=export]').click();const downloadPromise=page.waitForEvent('download');await page.locator('[data-action=export-json]').click();const download=await downloadPromise,fs=require('node:fs');const exported=JSON.parse(fs.readFileSync(await download.path(),'utf8'));await page.keyboard.press('Escape');
 await load(page,exported);await select(page,'ui-node-0');await expect.poll(()=>page.locator('[data-field=beats]').evaluateAll(xs=>xs.map(x=>x.value))).toEqual(['One','Two']);await select(page,'ui-node-0','close');await expect(page.locator('#board-exit')).toHaveValue('Closing end');
});
test('boards remain readable, keyboard accessible and within the viewport at narrow and wide widths',async({page})=>{
 const data=fixture({stress:true});data.projects[0].nodes[0].beats=['A'.repeat(400),'A quiet moment','An unexpected turn'];await load(page,data);
 for(const width of [320,390,768,1024,1440,1920]){
  await page.setViewportSize({width,height:1000});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
  const clipped=await page.locator('.scene-card-grid').evaluate(grid=>[...grid.children].some(el=>el.getBoundingClientRect().right>grid.getBoundingClientRect().right+1));expect(clipped).toBe(false);
 }
 const scan=await new AxeBuilder({page}).include('#main').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(scan.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
 await page.getByRole('tab',{name:'Refine',exact:true}).focus();await page.keyboard.press('End');await expect(page.getByRole('tab',{name:'Beat board',exact:true})).toBeFocused();
 await page.setViewportSize({width:test.info().project.name==='mobile'?390:1440,height:1000});
 await page.screenshot({path:'/tmp/beat-board-'+test.info().project.name+'.png',fullPage:true});
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
