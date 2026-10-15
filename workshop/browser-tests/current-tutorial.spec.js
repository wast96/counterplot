const {test,expect}=require('@playwright/test');
const visible=(page,selector)=>page.locator(selector).filter({visible:true}).first();
async function action(page,name,id,extra=''){
 const selector=`[data-action="${name}"]${id===undefined?'':`[data-id="${id}"]`}${extra}`;
 const dialog=page.locator('#dialog[open] '+selector).filter({visible:true});
 await (await dialog.count()?dialog.first():visible(page,selector)).click();
}
const form=(page,name)=>page.locator(`#dialog form[data-form="${name}"]`);
async function sample(page,lesson,g){
 if(g.sampleNode&&Array.isArray(g.nodeFields)&&!g.nodeFields.length)return;
 await expect.poll(()=>page.evaluate(({lesson,goal})=>{const d=CounterplotSession.definition(),w=CounterplotTutorial.snapshot(),r=CounterplotGuide.progress().projects[d.id+':'+w.active];return !!r.samples[lesson+':'+goal]&&!document.querySelector('#tutorial-companion').classList.contains('guide-typing');},{lesson:lesson.id,goal:g.id}),{timeout:45000}).toBe(true);
}
test('the complete shipped tutorial works with the current controls',async({page})=>{
 test.setTimeout(360000);page.setDefaultTimeout(15000);await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await page.locator('[data-tutorial=browse]').first().click();await page.locator('[data-tutorial=enter]').first().click();
 const lessons=await page.evaluate(()=>{const d=CounterplotSession.definition();return d.lessons.map(l=>({...l,goals:l.goals.filter(g=>CounterplotTutorial.features.drafting!==false||(!['prose','closingProse'].includes(g.check?.field)&&!g.setup?.write&&!['write','read'].includes(g.setup?.mode)))})).filter(l=>l.goals.length);});
 for(let li=0;li<lessons.length;li++)for(let gi=0;gi<lessons[li].goals.length;gi++){
  const lesson=lessons[li],g=lesson.goals[gi],c=g.check;
  await test.step(`${li+1}.${gi+1} ${lesson.id}`,async()=>{
   console.log(`Tutorial ${test.info().project.name}: ${li+1}.${gi+1} ${lesson.id}`);
   if(li||gi)await page.locator('[data-guide=next]').click();
   await expect(page.locator('#guide-select')).toHaveValue(String(li));
   if(c.kind==='read'){await expect(page.locator('[data-guide=next]')).toBeEnabled();return;}
   if(c.kind==='create'){
    if(c.entity==='node'){
     await action(page,'quick-piece',c.type);
     if(c.parent){const id=await page.evaluate(()=>{const w=CounterplotTutorial.snapshot();return w.projects.find(p=>p.id===w.active).nodes.at(-1).id;});await action(page,'move-node',id);await form(page,'move').locator('[name=anchor]').selectOption(c.parent);await form(page,'move').locator('[name=where]').selectOption('inside');await form(page,'move').locator('[type=submit]').click();}
     await sample(page,lesson,g);
    }else{
     if(c.entity==='block'){await action(page,'add-block');await action(page,'choose-kind',g.picker);}
     else if(g.milieuFor){await action(page,'milieu-link',g.milieuFor);await action(page,'milieu-new',g.milieuFor,'[data-type=place]');}
     else await action(page,{character:'new-character',world:'new-world',connection:'new-connection'}[c.entity]);
     await sample(page,lesson,g);await form(page,g.demo.form).locator('[type=submit]').click();
    }
   }else if(c.kind==='demo-node')await sample(page,lesson,g);
   else if(c.kind==='edit'){await action(page,'edit-block',c.id);await form(page,'block').locator('[name=text]').fill('Rescue Sokolov.');await form(page,'block').locator('[type=submit]').click();}
   else if(c.kind==='contains'){await action(page,c.field==='cast'?'cast':'link-world',c.id);await form(page,'links').locator(`input[value="${c.value}"]`).check();await form(page,'links').locator('[type=submit]').click();}
   else if(c.kind==='timed-change'){await action(page,'record-piece-state','bridge','[data-edge=close]');await action(page,'change-at','bridge','[data-at="bridge:close"]');await action(page,'choose-change-block',c.block);await sample(page,lesson,g);await form(page,g.demo.form).locator('[type=submit]').click();}
   else if(c.kind==='before'){await action(page,'move-node',c.id);await form(page,'move').locator('[name=anchor]').selectOption(c.anchor);await form(page,'move').locator('[name=where]').selectOption('before');await form(page,'move').locator('[type=submit]').click();}
   else if(c.kind==='archived'){if(!gi)await page.locator(`[data-node="${c.id}"] > .node-head .piece-menu > summary`).click();await action(page,gi?'redo':'archive-node',gi?undefined:c.id);}
   else if(c.kind==='restored'){if(lesson.id==='archive')await action(page,'undo');else await page.locator('.archive-row').filter({hasText:'Help EVA after the crash'}).locator('[data-action=restore]').click();}
   else if(c.kind==='plot-created'){await action(page,'manage-plots');await action(page,'new-plot');await sample(page,lesson,g);await form(page,g.demo.form).locator('[type=submit]').click();}
   else if(c.kind==='plot-assigned'){await action(page,'plot-membership',c.id);await form(page,'plot-membership').locator('[name=plots]').first().check();await form(page,'plot-membership').locator('[name=branch]').check();await form(page,'plot-membership').locator('[type=submit]').click();}
   else if(c.kind==='plot-cycle'){await page.locator('[data-action=plot-view]:not([data-id=""])').first().click();await action(page,'plot-view','');}
   else if(c.kind==='reference'){await action(page,'references',c.id,'[data-owner=node]');await action(page,'new-reference');await sample(page,lesson,g);await form(page,g.demo.form).locator('[type=submit]').click();}
   else if(c.kind==='action'){if(c.action==='export-json'){await action(page,'export');const download=page.waitForEvent('download');await action(page,'export-json');expect((await download).suggestedFilename()).toMatch(/json$/);}else await action(page,c.action,c.id);}
   else throw Error('Uncovered tutorial action: '+c.kind);
   await expect(page.locator('.guide-complete')).toBeVisible({timeout:10000});
  });
 }
 await page.locator('[data-guide=next]').click();await expect.poll(()=>page.evaluate(()=>{const d=CounterplotSession.definition(),w=CounterplotTutorial.snapshot();return CounterplotGuide.progress().projects[d.id+':'+w.active].finished;})).toBe(true);
 await page.reload();await expect(page.locator('#tutorial-companion')).toContainText('complete');
});
