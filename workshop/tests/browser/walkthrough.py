from common import APP, ROOT, launch
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
import json,sys,traceback,re
LESSONS=json.loads((APP.parent/'tutorial/MGS3 — Tutorial definition.json').read_text())['lessons']

def loc(p,action,id=None,extra=''):
 s=f'[data-action="{action}"]'+(f'[data-id="{id}"]' if id is not None else '')+extra
 in_dialog=p.locator('#dialog[open] '+s).filter(visible=True)
 if in_dialog.count():return in_dialog.first
 in_main=p.locator('#main '+s).filter(visible=True)
 return in_main.first if in_main.count() else p.locator(s).filter(visible=True).first

def click(p,action,id=None,extra=''):loc(p,action,id,extra).click()
def sample(p):
 # Exercise the shipped trigger. Automatic demonstrations must work without the
 # test clicking Insert sample; explicitly authored click triggers still work.
 automatic=p.evaluate("""() => {const d=CounterplotSession.definition(),w=CounterplotTutorial.snapshot(),r=CounterplotGuide.progress().projects[d.id+':'+w.active];return TutorialDefinition.presentation(d,d.lessons[r.index],d.lessons[r.index].goals[r.goal]).sample.trigger==='ready'}""")
 if automatic:
  p.wait_for_function("""() => {const d=CounterplotSession.definition(),w=CounterplotTutorial.snapshot(),r=CounterplotGuide.progress().projects[d.id+':'+w.active];return !!r.samples[d.lessons[r.index].id+':'+d.lessons[r.index].goals[r.goal].id]&&!document.querySelector('#tutorial-companion').classList.contains('guide-typing')}""",timeout=90000)
 else:
  b=p.locator('[data-guide="sample"]');expect(b).to_be_enabled(timeout=7000);b.click();expect(b).to_be_enabled(timeout=90000)

def form(p,name):return p.locator(f'#dialog form[data-form="{name}"]')
def do_goal(p,li,gi,g):
 c=g['check'];k=c['kind']
 if k=='read':
  expect(p.locator('[data-guide=next]')).to_be_enabled();return
 elif k=='create':
  if c['entity']=='node':
   if c['parent']:click(p,'add-inside',c['parent']);click(p,'create-piece',c['type'])
   else:click(p,'quick-piece',c['type'])
   sample(p)
  else:
   if c['entity']=='block':click(p,'add-block');click(p,'choose-kind',g['picker'])
   elif g.get('milieuFor'):
    click(p,'milieu-link',g['milieuFor']);click(p,'milieu-new',g['milieuFor'],'[data-type="place"]')
   else:click(p,{'character':'new-character','world':'new-world','connection':'new-connection'}[c['entity']])
   sample(p);form(p,g['demo']['form']).locator('[type="submit"]').click()
 elif k=='demo-node':sample(p)
 elif k=='edit':
  if g.get('inlineDemo'):
   click(p,'write-node',c['id']);sample(p)
   t=p.locator(f'textarea[data-id="{c["id"]}"][data-field="{c["field"]}"]');t.fill(t.input_value()+' QA learner wording remains here.');t.press('Tab')
  else:
   click(p,'edit-block',c['id']);fm=form(p,'block');fm.locator('[name="text"]').fill('Rescue Sokolov.');fm.locator('[type="submit"]').click()
 elif k=='contains':
  click(p,'cast' if c['field']=='cast' else 'link-world',c['id']);fm=form(p,'links');fm.locator(f'input[value="{c["value"]}"]').check();fm.locator('[type="submit"]').click()
 elif k=='timed-change':
  click(p,'show-changes','bridge','[data-at="bridge:close"]')
  if not p.locator('[data-action="choose-change-block"]').count():click(p,'change-at','bridge','[data-at="bridge:close"]')
  click(p,'choose-change-block',c['block']);sample(p);form(p,g['demo']['form']).locator('[type="submit"]').click()
 elif k=='before':
  click(p,'move-node',c['id']);fm=form(p,'move');fm.locator('[name="anchor"]').select_option(c['anchor']);fm.locator('[name="where"]').select_option('before');fm.locator('[type="submit"]').click()
 elif k=='archived':click(p,'redo' if gi else 'archive-node',None if gi else c['id'])
 elif k=='restored':
  if li==16:click(p,'undo')
  else:p.locator('.archive-row').filter(has_text='Help EVA after the crash').locator('[data-action="restore"]').click()
 elif k=='plot-created':click(p,'manage-plots');click(p,'new-plot');sample(p);form(p,g['demo']['form']).locator('[type="submit"]').click()
 elif k=='plot-assigned':
  click(p,'plot-membership',c['id']);fm=form(p,'plot-membership');fm.locator('[name="plots"]').first.check();fm.locator('[name="branch"]').check();fm.locator('[type="submit"]').click()
 elif k=='plot-cycle':
  p.locator('[data-action="plot-view"]:not([data-id=""])').first.click();p.wait_for_timeout(200);click(p,'plot-view','')
 elif k=='reference':click(p,'references',c['id'],'[data-owner="node"]');click(p,'new-reference');sample(p);form(p,g['demo']['form']).locator('[type="submit"]').click()
 elif k=='action':
  if c['action']=='export-json':
   click(p,'export')
   with p.page.expect_download() as dl:click(p,'export-json')
   dl.value.save_as(str(ROOT/f'flow-export-{p.page.viewport_size["width"]}.json'))
  elif c['action']=='show-changes':p.locator(g['focus']).filter(visible=True).first.click()
  else:click(p,c['action'],c.get('id'))
 else:raise ValueError(k)
 expect(p.locator('.guide-complete')).to_be_visible(timeout=8000)

def run(p,until=22):
 from common import mount
 p=mount(p,APP.read_text());p.locator('[data-tutorial="browse"]').first.click();p.locator('[data-tutorial="enter"]').first.click()
 expect(p.locator('#tutorial-companion')).to_be_visible()
 for li,l in enumerate(LESSONS[:until]):
  for gi,g in enumerate(l['goals']):
   if li or gi:
    p.locator('[data-guide="next"]').click()
   expect(p.locator('#guide-select')).to_have_value(str(li))
   expect(p.locator('.guide-instruction > .guide-section-heading')).to_have_text(f'Action {gi+1} of {len(l["goals"])}')
   expect(p.locator('#tutorial-companion')).not_to_contain_text('Progress is not saving')
   print(f'{li+1}.{gi+1} {l["id"]} {g["check"]["kind"]}',flush=True)
   do_goal(p,li,gi,g)
 return p
if __name__=='__main__':
 with sync_playwright() as pw:
  b=launch(pw)
  width=int(sys.argv[2]) if len(sys.argv)>2 else 1440
  p=b.new_page(viewport={'width':width,'height':1000 if width>800 else 844},reduced_motion='no-preference' if __import__('os').environ.get('COUNTERPLOT_QA_MOTION')=='full' else 'reduce',accept_downloads=True)
  p.set_default_timeout(6000);errors=[];p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda msg:print('CONSOLE',msg.type,msg.text,flush=True) if msg.type in ['error','warning'] else None)
  try:
   f=run(p,int(sys.argv[1]) if len(sys.argv)>1 else 22)
   if len(sys.argv)>3 and sys.argv[3]=='full-motion':
    # Complete the final Finish control as well as the final export action.
    f.locator('[data-guide="next"]').click()
    f.wait_for_function("() => {const w=CounterplotTutorial.snapshot(),d=CounterplotSession.definition();return CounterplotGuide.progress().projects[d.id+':'+w.active].finished===true}")
    from common import mount
    f=mount(p,reload=True)
    f.wait_for_function("() => {const w=CounterplotTutorial.snapshot(),d=CounterplotSession.definition();return CounterplotGuide.progress().projects[d.id+':'+w.active].finished===true}")
    print('PASS Finish and finished-state reload',flush=True)
   assert not errors, errors
   print('PASS errors=',errors)
   p.screenshot(path=str(ROOT/f'screenshots/flow-success-{width}.png'))
  except Exception:
   traceback.print_exc()
   f=p.frames[-1];print('GUIDE',f.locator('#tutorial-companion').inner_text() if f.locator('#tutorial-companion').count() else 'missing')
   print('DIALOG',f.locator('#dialog[open]').all_inner_texts())
   print('ERRORS',errors);p.screenshot(path=str(ROOT/f'screenshots/flow-failure-{width}.png'));raise
  finally:b.close()
