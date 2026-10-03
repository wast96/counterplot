// Exercise the same disclosure controls a writer uses; never reveal fields through DOM mutation.
export async function showNotes(page){
 const toggle=page.locator('[data-action=scene-toggle-notes]');
 if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
}
export async function sceneField(page,key){
 const field=page.locator(`[data-draft="${key}"]`);
 if(key==='title'||key==='notes'){
  if(key==='notes'&&!await field.isVisible())await page.locator('[data-action=scene-prose]').click();
  return field;
 }
 await showNotes(page);
 const planning=page.locator('.scene-planning');
 if(!await planning.evaluate(e=>e.open))await planning.locator('summary').first().click();
 const wrapper=key==='beats'?page.locator('[data-planning-field=beats]'):field.locator('xpath=ancestor::*[@data-planning-field]');
 if(await wrapper.count()&&await wrapper.getAttribute('hidden')!==null)await page.locator('[data-add-scene-field]').selectOption(key);
 if(key==='beats'){
  const beats=page.locator('.scene-beats');if(!await beats.evaluate(e=>e.open))await beats.locator('summary').click();return beats;
 }
 const detail=key==='sceneKind'?page.locator('.scene-prompt-options'):field.locator('xpath=ancestor::details[contains(@class,"scene-metadata")]');
 if(await detail.count()&&!await detail.evaluate(e=>e.open))await detail.locator('summary').first().click();
 return field;
}
export async function previewScene(page){await page.locator('[data-action=toggle-scene-preview]').first().click();}
