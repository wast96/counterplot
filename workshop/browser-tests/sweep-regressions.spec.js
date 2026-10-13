const {test,expect}=require('@playwright/test');
const {fixture,load}=require('../../docs/audits/2026-10-13-beat-board-sweep/audit.cjs');
const snapshot=page=>page.evaluate(()=>{const d=CounterplotTutorial.snapshot();return d.projects.find(p=>p.id===d.active);});
test('Refine details record changes at the selected closing, including after visiting a board',async({page})=>{
 await load(page,fixture());await page.getByRole('tab',{name:'Refine',exact:true}).click();await page.locator('.moment-navigation [data-id=event][data-edge=close]').click();
 await page.locator('.refine-moment-tools [data-action=board-node]').click();await page.getByRole('button',{name:'Refine this scene',exact:true}).click();
 await page.getByRole('button',{name:'Show details',exact:true}).click();const action=page.locator('.inspector [data-action=record-piece-state]');await expect(action).toHaveAttribute('data-at','event:close');await action.click();
 await page.locator('#dialog [name=source]').selectOption('block:jun:belief');await page.getByRole('textbox',{name:'New state',exact:true}).fill('She has lost trust in the police');await page.getByRole('button',{name:'Keep change',exact:true}).click();
 const change=(await snapshot(page)).characters[0].changes.find(x=>x.block?.text==='She has lost trust in the police');expect(change.at).toBe('event:close');
});
test('a failed cloud sync has a direct explanation and retry while local editing continues',async({page})=>{
 let data=fixture(),revision=1,fail=false;
 await page.route('**/api/auth/session',r=>r.fulfill({json:{user:'sync-review',email:'writer@example.test'}}));
 await page.route('**/api/workspace',async r=>{if(fail)return r.fulfill({status:503,json:{error:'Temporarily unavailable. Try syncing again.'}});if(r.request().method()==='PUT'){data=r.request().postDataJSON().workspace;revision++;}return r.fulfill({json:{workspace:data,revision}});});
 await page.goto('/');await expect(page.locator('#account-status')).toHaveText('Saved across devices');fail=true;
 await page.locator('[data-node=beat] > .node-head .node-title').fill('An edit saved on this device');await page.keyboard.press('Tab');await page.evaluate(()=>counterplotSync.flush());
 await expect(page.getByRole('button',{name:'Review sync issue',exact:true})).toBeVisible();await expect(page.locator('.account-sync-status')).toHaveClass(/needs-attention/);
 await page.getByRole('button',{name:'Review sync issue',exact:true}).click();await expect(page.locator('#account-detail')).toContainText('Temporarily unavailable');fail=false;await page.getByRole('button',{name:'Sync now',exact:true}).click();
 await expect(page.locator('#account-status')).toHaveText('Saved across devices');await expect(page.getByRole('button',{name:'Review sync issue',exact:true})).toHaveCount(0);expect(data.projects.find(p=>p.id===data.active).nodes.find(n=>n.id==='beat').title).toBe('An edit saved on this device');
});
test('a newly gained block supports a custom label and retains it after reload',async({page})=>{
 await load(page,fixture());await page.locator('[data-node=beat] > .node-foot [data-action=record-piece-state]').click();await page.getByRole('button',{name:'Character block options',exact:true}).click();await page.getByRole('button',{name:'Gain a new piece here',exact:true}).click();
 await page.getByRole('combobox',{name:'Kind of piece',exact:true}).selectOption('belief');await page.getByLabel('Custom label · optional',{exact:true}).fill('Trust in authority');await page.getByLabel('What is true afterward?',{exact:true}).fill('She questions every uniform');await page.getByRole('button',{name:'Keep this change',exact:true}).click();
 expect((await snapshot(page)).characters[0].changes.find(c=>c.block?.text==='She questions every uniform').block.label).toBe('Trust in authority');
 await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();await page.locator('.story-viewbar').waitFor();expect((await snapshot(page)).characters[0].changes.find(c=>c.block?.text==='She questions every uniform').block.label).toBe('Trust in authority');
});
test('long state text stays inside the details panel',async({page})=>{
 await load(page,fixture(true));if(await page.locator('[data-action=show-details]').isVisible())await page.locator('[data-action=show-details]').click();
 const panel=page.locator('.inspector');if(await panel.isVisible())expect(await panel.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
});
test('Add change creates a new character state at the beat without altering starting states',async({page})=>{
 await load(page,fixture());const before=await snapshot(page);
 await page.locator('[data-node=beat] > .node-foot [data-action=record-piece-state]').click();
 await page.locator('#dialog [name=source]').selectOption('new-character-state');
 await page.getByRole('combobox',{name:'Character',exact:true}).selectOption('jun');
 await page.getByRole('combobox',{name:'Kind of state',exact:true}).selectOption('custom');
 await page.getByLabel('State label',{exact:true}).fill('Legal status');
 await page.getByLabel('New state',{exact:true}).fill('Wanted criminal');
 await expect(page.locator('#piece-state-fork')).toBeHidden();
 await page.getByRole('button',{name:'Keep change',exact:true}).click();
 const after=await snapshot(page),c=after.characters.find(c=>c.id==='jun'),change=c.changes.find(x=>x.block?.text==='Wanted criminal');
 expect(change).toMatchObject({at:'beat:open',op:'add',block:{kind:'custom',label:'Legal status'}});expect(c.blocks).toEqual(before.characters.find(c=>c.id==='jun').blocks);
 await expect(page.getByRole('textbox',{name:'Liu Jun · Legal status after this beat',exact:true})).toHaveValue('Wanted criminal');
 await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();await page.locator('.story-viewbar').waitFor();expect((await snapshot(page)).characters.find(c=>c.id==='jun').changes).toContainEqual(change);
});
test('linking an ending state inline removes its redundant recorded field immediately',async({page})=>{
 const W=require('../src/integration.js'),data=fixture(),p=data.projects[0],n=p.nodes.find(n=>n.type==='C'),c=p.characters[0];
 c.changes=[];W.setArcCharacter(p,n,c.id);const row=W.characterArc(p,n).changes[0];W.setArcState(p,n,'from',{rowId:row.id,value:c.blocks[0].text,blockId:c.blocks[0].id});W.setArcState(p,n,'to',{rowId:row.id,value:''});
 W.setPieceState(p,n,'block:'+c.id+':'+c.blocks[0].id,'close','Wanted criminal');
 await load(page,data);const closing=page.locator(`[data-node="${n.id}"] > .closing`);
 await expect(closing.locator('[data-piece-state]')).toHaveCount(1);
 await closing.locator('[data-arc-inline]').first().fill('Wanted criminal');await page.keyboard.press('Tab');
 await expect(closing.locator('[data-piece-state]')).toHaveCount(0);
 await expect(closing.locator('[data-arc-inline]').first()).toHaveValue('Wanted criminal');
});
test('thread closings have independent titles and immediately writable notes',async({page})=>{
 await load(page,fixture());const before=await snapshot(page);
 for(const n of before.nodes.filter(n=>n.type!=='B')){
 const closing=page.locator(`[data-node="${n.id}"] > .closing`),title=closing.locator('[data-field=closingTitle]'),note=closing.locator('[data-field=closing]');
 await expect(title).toBeVisible();await expect(note).toBeVisible();await expect(closing.getByRole('button',{name:'Add closing note',exact:true})).toHaveCount(0);
 await title.fill('Resolution of '+n.id);await note.fill('The ending of '+n.id);await page.keyboard.press('Tab');
 }
 await expect(page.locator('#save-status')).toContainText('Saved on this device');await page.reload();await page.locator('.story-viewbar').waitFor();
 const after=await snapshot(page);for(const n of before.nodes.filter(n=>n.type!=='B'))expect(after.nodes.find(x=>x.id===n.id)).toMatchObject({title:n.title,closingTitle:'Resolution of '+n.id,closing:'The ending of '+n.id});
 await page.getByRole('tab',{name:'Refine',exact:true}).click();await page.locator('.moment-navigation [data-id=event][data-edge=close]').click();await expect(page.getByRole('textbox',{name:'Closing title',exact:true})).toHaveValue('Resolution of event');
});
