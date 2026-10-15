const {test,expect}=require('@playwright/test');
const {fixture,load}=require('../../docs/audits/2026-10-13-beat-board-sweep/audit.cjs');
const W=require('../src/integration.js');

function stateFixture(label='State'){
 const p=W.project('Inline control review'),n={...W.node('C'),id:'arc',title:'Introducing Liu Jun'};p.nodes=[n];W.normalize(p);
 W.setArcState(p,n,'from',{value:'',label});W.setArcState(p,n,'to',{value:'',label});
 return W.validate({format:'counterplot-workshop',schema:2,active:p.id,projects:[p]});
}
async function aligned(field){
 await expect(field).toBeVisible();
 await expect.poll(()=>field.evaluate(el=>{
  const pill=el.closest('.arc-state,.thread-word'),r=pill.getBoundingClientRect(),f=el.getBoundingClientRect(),label=pill.querySelector('.arc-state-label,span'),l=label.getBoundingClientRect(),button=pill.querySelector('.arc-state-options'),b=button?.getBoundingClientRect(),s=getComputedStyle(el),ring=s.outlineStyle==='none'?0:Math.max(0,parseFloat(s.outlineWidth)+parseFloat(s.outlineOffset));
  return {labelCentered:Math.abs(l.top+l.height/2-r.top-r.height/2)<1,shortLabelUnbroken:label.textContent.length>14||l.height<=parseFloat(getComputedStyle(label).lineHeight)+1,actionCentered:!b||Math.abs(b.top+b.height/2-r.top-r.height/2)<1,separate:l.right<=f.left+1&&(!b||f.right<=b.left+1),readable:!el.value||el.scrollHeight<=el.clientHeight+1&&el.scrollWidth<=el.clientWidth+1,focusContained:f.top-ring>=r.top-1&&f.bottom+ring<=r.bottom+1&&f.left-ring>=r.left-1&&f.right+ring<=r.right+1};
 })).toEqual({labelCentered:true,shortLabelUnbroken:true,actionCentered:true,separate:true,readable:true,focusContained:true});
}

test('state pills keep labels, values and actions aligned when empty, focused or multiline',async({page})=>{
 await load(page,stateFixture());
 for(const width of [320,768,1440]){
  await page.setViewportSize({width,height:1000});
  for(const view of ['Outline','Refine']){
   await page.getByRole('tab',{name:view,exact:true}).click();
   if(view==='Refine')await page.locator('.moment-navigation [data-id=arc][data-edge=close]').click();
   const field=page.getByRole('textbox',{name:'Ending State',exact:true});
   for(const value of ['', 'Trusts herself', 'She learns to trust her own judgment while remaining open to what other people can teach her. '.repeat(3)]){await field.fill(value);await aligned(field);}
   await field.fill('');await aligned(field);
   expect(await field.evaluate(el=>el.clientHeight<parseFloat(getComputedStyle(el).lineHeight)*2)).toBe(true);
   const group=field.locator('xpath=ancestor::*[contains(@class,"arc-outcome")]');
   await expect.poll(()=>group.evaluate(el=>{const p=el.querySelector('.arc-state').getBoundingClientRect(),b=el.querySelector('.arc-fork').getBoundingClientRect();return b.left>=p.right&&Math.abs(b.top+b.height/2-p.top-p.height/2)<1;})).toBe(true);
  }
 }
});

test('long custom state labels wrap without squeezing the value or overlapping its controls',async({page})=>{
 const label='RelationshipWithFamilyAndTheCommunity'.repeat(3);await load(page,stateFixture(label));
 for(const width of [320,768,1440]){
  await page.setViewportSize({width,height:1000});
  const field=page.getByRole('textbox',{name:'Starting '+label,exact:true});await field.fill('A readable state');await aligned(field);
  await expect.poll(()=>field.evaluate(el=>{const label=el.previousElementSibling;return label.scrollWidth<=label.clientWidth+1&&el.clientWidth>=55&&document.documentElement.scrollWidth<=innerWidth+1;})).toBe(true);
 }
});

test('beat changes keep the arrow and actions beside their editable result',async({page})=>{
 await load(page,fixture());const field=page.locator('[data-node=beat] textarea.beat-state-after').first();
 for(const width of [320,768,1440]){
  await page.setViewportSize({width,height:1000});
  for(const value of ['The city is dangerous','She recognizes that the people she trusted have used their authority to protect themselves. '.repeat(3)]){
   await field.fill(value);
   await expect.poll(()=>field.evaluate(el=>{const group=el.closest('.beat-state-result'),r=group.getBoundingClientRect(),f=el.getBoundingClientRect(),arrow=group.querySelector('.state-arrow').getBoundingClientRect(),button=group.querySelector('.arc-state-options').getBoundingClientRect();return arrow.right<=f.left&&f.right<=button.left&&Math.abs(arrow.top+arrow.height/2-f.top-f.height/2)<1&&Math.abs(button.top+button.height/2-f.top-f.height/2)<1&&r.right<=innerWidth+1&&el.scrollHeight<=el.clientHeight+1;})).toBe(true);
  }
 }
});

test('state overview and thread planning fields use the same contained focus and alignment',async({page})=>{
 await load(page,fixture());await page.locator('[data-node=arc] > .node-head [data-action=select-node]').click();await page.locator('.inspector [data-action=arc-overview]').click();
 const state=page.locator('#dialog textarea[data-edge=from]');await state.focus();await aligned(state);
 await page.locator('#dialog [data-action=close-dialog]').first().click();
 if(await page.locator('#details-sheet').evaluate(el=>el.open))await page.locator('#details-sheet [data-action=collapse-inspector]').click();
 await page.getByRole('tab',{name:'Outline',exact:true}).click();
 for(const width of [320,768,1440]){
  await page.setViewportSize({width,height:1000});
  for(const name of ['Milieu World','Event Resolution']){const field=page.getByRole('textbox',{name,exact:true});await field.fill('A short phrase');await aligned(field);if(width===320)expect(await field.evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);}
 }
});

test('tablet toolbar keeps the account menu on the same row as its other actions',async({page})=>{
 await load(page,stateFixture());
 for(const width of [681,768,900,1024]){
  await page.setViewportSize({width,height:1000});
  await expect.poll(()=>page.locator('.top-actions').evaluate(el=>{const account=el.querySelector('.account-menu').getBoundingClientRect(),tutorial=el.querySelector('.tutorial-launch').getBoundingClientRect(),status=el.querySelector('.account-sync-status').getBoundingClientRect();return Math.abs(account.top+account.height/2-tutorial.top-tutorial.height/2)<1&&status.width>0&&el.scrollWidth<=el.clientWidth+1;})).toBe(true);
  await page.getByLabel('Story tools',{exact:true}).click();await expect(page.getByRole('button',{name:'Story settings',exact:true})).toBeVisible();await page.keyboard.press('Escape');
 }
});
