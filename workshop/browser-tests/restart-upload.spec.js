const {test,expect}=require('@playwright/test');
const fixture=require('./ui-fixture.cjs');
const W=require('../src/integration.js');
const latest=page=>page.evaluate(()=>CounterplotTutorial.snapshot());
async function setup(page,{failCleanup=false,missingPart=false,lostAcknowledgement=false}={}){
 let workspace=fixture(),revision=1,full=!lostAcknowledgement,clears=0,failedCleanup=failCleanup,missing=missingPart;const parts=new Map(),writes=[];
 workspace.projects[0].nodes[1].prose='The story continues. '.repeat(12000);workspace.projects.push(W.project('Another story'));
 workspace.swatches=[{id:'custom-green',name:'Green',hex:'#123456'}];workspace.tutorialRecords={'counterplot.tutorial.cursor.mgs3.v1':JSON.stringify({stage:'build-c'})};
 await page.route('**/api/auth/session',r=>r.fulfill({json:{user:'upload-test',email:'writer@example.test'}}));
 await page.route('**/api/workspace-chunk',async r=>{
  if(r.request().method()==='DELETE'){clears++;if(failedCleanup){failedCleanup=false;return r.fulfill({status:500,json:{error:'Cleanup unavailable'}});}full=false;parts.clear();return r.fulfill({json:{owner:'upload-test',cleared:4}});}
  if(full)return r.fulfill({status:413,json:{error:'Temporary upload storage is full.',code:'capacity'}});
  const body=r.request().postDataJSON();parts.set(body.hash,body.content);await r.fulfill({json:{owner:'upload-test',hash:body.hash}});
 });
 await page.route('**/api/workspace',async r=>{
  if(r.request().method()==='PUT'){
   const body=r.request().postDataJSON();
   if(missing)return r.fulfill({status:409,json:{error:'A save part is missing. Retry to finish saving.',code:'missing-chunk'}});
   if(body.revision!==revision)return r.fulfill({status:409,json:{owner:'upload-test',workspace,revision}});
   workspace=body.manifest?JSON.parse(body.manifest.chunks.map(h=>parts.get(h)).join('')):body.workspace;revision++;writes.push(workspace);
   if(lostAcknowledgement){lostAcknowledgement=false;return r.fulfill({status:500,json:{error:'The save acknowledgement was lost'}});}
   return r.fulfill({json:{owner:'upload-test',revision,ok:true}});
  }
  await r.fulfill({json:{owner:'upload-test',workspace,revision}});
 });
 await page.goto('/');await expect(page.locator('#account-status')).toHaveText('Saved across devices');
 const title=page.locator('[data-node=ui-node-0] > .node-head [data-field=title]');await title.fill('An earlier pending edit');await page.keyboard.press('Tab');await expect(page.locator('#account-status')).toHaveText('Sync needs attention');
 await title.fill('The latest writing');await page.keyboard.press('Tab');await expect(page.locator('#save-status')).toContainText('Saved on this device');
 await page.getByRole('button',{name:'Review sync issue'}).click();
 return {writes,clears:()=>clears,remote:()=>workspace,restoreMissingPart:()=>{missing=false;}};
}
test('one button clears upload capacity and sends the latest complete library rather than the stale retry',async({page})=>{
 const state=await setup(page);await page.getByRole('button',{name:'Clear temporary uploads & save latest',exact:true}).click();
 await expect(page.locator('#account-status')).toHaveText('Saved across devices');expect(state.clears()).toBe(1);expect(state.writes).toHaveLength(1);
 const saved=state.remote();expect(saved.projects[0].nodes[0].title).toBe('The latest writing');expect(saved.projects).toHaveLength(2);expect(saved.projects[0].nodes[1].prose.length).toBeGreaterThan(200000);expect(saved.swatches[0].id).toBe('custom-green');expect(saved.tutorialRecords['counterplot.tutorial.cursor.mgs3.v1']).toBe(JSON.stringify({stage:'build-c'}));
 await page.getByRole('button',{name:'Close dialog',exact:true}).click();await page.reload();await expect(page.locator('#account-status')).toHaveText('Saved across devices');expect((await latest(page)).projects[0].nodes[0].title).toBe('The latest writing');
});
test('failed cleanup and missing upload parts retain writing and allow retry without a false merge',async({page})=>{
 const state=await setup(page,{failCleanup:true,missingPart:true});const button=page.getByRole('button',{name:'Clear temporary uploads & save latest',exact:true});
 await button.click();await expect(page.locator('#account-detail')).toContainText('Cleanup unavailable');expect(state.writes).toHaveLength(0);expect((await latest(page)).projects[0].nodes[0].title).toBe('The latest writing');
 await button.click();await expect(page.locator('#account-detail')).toContainText('A save part is missing');expect((await latest(page)).projects).toHaveLength(2);expect(state.writes).toHaveLength(0);
 // Keep the simulated fault active until it has been inspected; background
 // retries must not race the assertions by consuming a one-shot error.
 state.restoreMissingPart();
 await page.getByRole('button',{name:'Sync now',exact:true}).click();await expect(page.locator('#account-status')).toHaveText('Saved across devices');expect(state.remote().projects).toHaveLength(2);expect(state.remote().projects[0].nodes[0].title).toBe('The latest writing');
});

test('restarting recognizes an already committed upload without forking the newer local edits',async({page})=>{
 const state=await setup(page,{lostAcknowledgement:true});await page.getByRole('button',{name:'Clear temporary uploads & save latest',exact:true}).click();
 await expect(page.locator('#account-status')).toHaveText('Saved across devices');expect(state.remote().projects).toHaveLength(2);expect(state.remote().projects[0].nodes[0].title).toBe('The latest writing');
});

test('background retry recognizes its already committed copy before merging newer typing',async({page})=>{
 const state=await setup(page,{lostAcknowledgement:true});await page.getByRole('button',{name:'Close dialog',exact:true}).click();
 const title=page.locator('[data-node=ui-node-0] > .node-head [data-field=title]');await title.fill('Still writing after the lost acknowledgement');await page.keyboard.press('Tab');
 await expect(page.locator('#account-status')).toHaveText('Saved across devices');expect(state.remote().projects).toHaveLength(2);expect(state.remote().projects[0].nodes[0].title).toBe('Still writing after the lost acknowledgement');
});
