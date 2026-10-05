"""Visual studio regression checks through real browser UI. No replacement renderer."""
from common import APP,ROOT,mount,launch
from playwright.sync_api import sync_playwright,expect
from walkthrough import do_goal, LESSONS,click,form
import json,traceback,sys,hashlib

def state(f):return f.evaluate('CounterplotTutorialLibrary.studioState()')
def sb(f,action,extra=''):
 if action=='play' and state(f)['playing']:
  ready(f).locator('[data-studio-frame-return]').click();return
 if action in ['details','scene']:panel(f,'menu')
 if action in ['duplicate-stage','duplicate-goal','remove-stage','remove-goal']:panel(f,'stages')
 f.locator(f'[data-studio="{action}"]{extra}').filter(visible=True).first.click()
def ab(f,action,extra=''):
 if action in ['export','export-playable','import','reset-default']:panel(f,'menu')
 if action in ['add-stage','add-goal','stage','goal','step']:panel(f,'stages')
 f.locator(f'#tutorial-editor [data-author="{action}"]{extra}').filter(visible=True).first.click()
def panel(f,which):
 current=f.locator('#tutorial-editor').get_attribute('data-panel')
 if current==which:return
 if which=='canvas':f.locator(f'.studio-head [data-studio="panel"][data-panel="{current}"]').click()
 else:f.locator(f'.studio-head [data-studio="panel"][data-panel="{which}"]').click()
def tab(f,name):
 panel(f,'settings')
 if not f.locator('.studio-tabs').is_visible():
  f.locator('.studio-head [data-panel=settings]').click()
  if f.locator('#tutorial-editor').get_attribute('data-panel')!='settings':panel(f,'settings')
 ab(f,'tab',f'[data-tab="{name}"]')
def ready(f):
 f.wait_for_function('CounterplotTutorialLibrary.studioState()?.ready===true',timeout=12000)
 f.page.wait_for_timeout(150)
 children=[c for c in f.child_frames if c.name=='studio-frame' and not c.is_detached()]
 return children[-1] if children else f.locator('#studio-frame').element_handle(timeout=20000).content_frame()
def open_editor(f):
 f.locator('[data-tutorial="browse"]').first.click();f.locator('[data-tutorial="edit"]').first.click();return ready(f)
def edit(f,name,value):
 el=f.locator(f'#tutorial-editor [name="{name}"]')
 if el.evaluate('(e)=>e.tagName')=='SELECT':el.select_option(str(value))
 else:el.fill(str(value));el.press('Tab')
 f.page.wait_for_timeout(250)
def saved(f):
 ab(f,'save');f.wait_for_function('!CounterplotTutorialLibrary.studioState().dirty');expect(f.locator('#tutorial-author-error')).to_be_hidden()

def drag(page,a,b):
 a.scroll_into_view_if_needed();b.scroll_into_view_if_needed();ar=a.bounding_box();br=b.bounding_box()
 assert ar and br
 page.mouse.move(ar['x']+ar['width']/2,ar['y']+ar['height']/2);page.mouse.down()
 page.mouse.move(br['x']+br['width']/2,br['y']+br['height']/2,steps=18);page.wait_for_timeout(100);page.mouse.up();page.wait_for_timeout(250)
def export(p,f,kind='export',name='studio-definition.json'):
 with p.expect_download() as dl:ab(f,kind)
 path=ROOT/name;dl.value.save_as(str(path));return json.loads(path.read_text()) if kind=='export' else path.read_text()
def storage(p):return p.evaluate('Object.fromEntries(fixtureStorage.items)')

def test_add_stage_save_export_reload(p,f):
 open_editor(f);initial=state(f)['draft'];assert len(initial['lessons'])==22
 panel(f,'stages');ab(f,'add-stage');assert len(state(f)['draft']['lessons'])==23;assert state(f)['index']==22
 tab(f,'copy');edit(f,'author-stage-title','An additional ending');saved(f)
 d=export(p,f);assert d['lessons'][-1]['title']=='An additional ending'
 ab(f,'close');f=mount(p,reload=True);open_editor(f);assert len(state(f)['draft']['lessons'])==23
 assert state(f)['draft']['lessons'][-1]['title']=='An additional ending'

def test_history_stage_action_drag(p,f):
 open_editor(f);base=state(f)['draft'];panel(f,'stages')
 ab(f,'add-stage');sb(f,'undo');assert len(state(f)['draft']['lessons'])==22
 sb(f,'redo');assert len(state(f)['draft']['lessons'])==23;sb(f,'undo')
 # Stage drag, stable IDs, and undo.
 drag(p,f.locator('[data-studio-drag="stage"][data-index="0"]'),f.locator('[data-studio-drop="stage"][data-index="2"]'))
 assert state(f)['draft']['lessons'][2]['id']==base['lessons'][0]['id'];sb(f,'undo')
 ab(f,'stage','[data-index="0"]');panel(f,'stages');ready(f)
 panel(f,'stages');drag(p,f.locator('[data-studio-drag="action"][data-index="0"]'),f.locator('[data-studio-drop="action"][data-index="2"]'))
 assert state(f)['draft']['lessons'][0]['goals'][2]['id']==base['lessons'][0]['goals'][0]['id'];sb(f,'undo')
 sb(f,'duplicate-stage');assert len(state(f)['draft']['lessons'])==23;saved(f)

def test_direct_words_drag_resize(p,f):
 c=open_editor(f);heading=c.locator('#tutorial-companion h2');heading.fill('Snake, changed');heading.press('Tab')
 assert state(f)['draft']['lessons'][0]['title']=='Snake, changed'
 c.locator('.guide-instruction p').fill('Drag this character thread into your outline.');c.locator('.guide-instruction p').press('Tab')
 assert state(f)['draft']['lessons'][0]['goals'][0]['text']=='Drag this character thread into your outline.'
 grip=c.locator('[data-studio-handle="panel"]');b=grip.bounding_box();p.mouse.move(b['x']+10,b['y']+10);p.mouse.down();p.mouse.move(b['x']-150,b['y']+110,steps=16);p.mouse.up();p.wait_for_timeout(250)
 g=state(f)['draft']['lessons'][0]['goals'][0];assert g['presentation']['placement']['mode']=='custom';assert g['presentation']['placement']['x']<100
 c=ready(f);r=c.locator('[data-studio-handle="resize"]').bounding_box();p.mouse.move(r['x']+r['width']/2,r['y']+12);p.mouse.down();p.mouse.move(r['x']+80,r['y']+12,steps=15);p.mouse.up();p.wait_for_timeout(250)
 assert state(f)['draft']['lessons'][0]['goals'][0]['presentation']['placement']['width']>340
 saved(f)

def test_controls_and_timing(p,f):
 c=open_editor(f);tab(f,'timing');edit(f,'author-sample-mode','type');edit(f,'author-speed','12');edit(f,'author-delay','500');edit(f,'motion-panel','250');edit(f,'motion-insertion','400')
 tab(f,'controls');edit(f,'control-next-label','Keep going');edit(f,'control-next-region','body-bottom');edit(f,'control-next-height','42')
 panel(f,'canvas');c=ready(f);expect(c.locator('[data-region="body-bottom"] [data-studio-control="next"]')).to_contain_text('Keep going')
 tab(f,'placement');edit(f,'author-mobile-edge','top');f.locator('[name="author-dim"]').evaluate('(e)=>{e.value="0.2";e.dispatchEvent(new Event("input",{bubbles:true}));}')
 saved(f);g=state(f)['draft']['lessons'][0]['goals'][0];v=g['presentation'];assert v['sample']['charactersPerSecond']==12;assert v['controls']['next']['minHeight']==42;assert v['style']['dim']==.2

def test_button_drag(p,f):
 c=open_editor(f);tab(f,'controls');panel(f,'canvas');c=ready(f)
 drag(p,c.locator('[data-studio-control="next"]'),c.locator('[data-region="body-top"]'))
 assert state(f)['draft']['lessons'][0]['goals'][0]['presentation']['controls']['next']['region']=='body-top'
 saved(f)

def test_reveals_catalog_phases(p,f):
 open_editor(f);tab(f,'reveals');f.locator('[data-studio-collection]').select_option('world');p.wait_for_timeout(100)
 item=f.locator('[data-studio="add-reveal"]').first;id=item.get_attribute('data-id');item.click();ready(f)
 g=state(f)['draft']['lessons'][0]['goals'][0];assert g['enterAssemblies'];spec=next(a for a in state(f)['draft']['assemblies'] if a['id']==g['enterAssemblies'][-1]);assert id in spec['world']
 sb(f,'phase','[data-phase="completeAssemblies"]');f.locator('[data-studio="add-reveal"]').nth(1).click();ready(f)
 f.locator('[data-studio-collection]').select_option('nodes');p.wait_for_timeout(100)
 # Drag a piece into On Next; automatic parent dependencies must be valid.
 drag(p,f.locator('[data-studio-drag="reveal"]').first,f.locator('[data-studio-drop="reveal"][data-phase="exitAssemblies"]'))
 saved(f);d=state(f)['draft'];assert d['lessons'][0]['goals'][0]['exitAssemblies']
 panel(f,'canvas');sb(f,'scene','[data-phase="complete"]');ready(f);expect(f.locator('.studio-canvas-message')).to_be_hidden()
 sb(f,'scene','[data-phase="exit"]');ready(f);expect(f.locator('.studio-canvas-message')).to_be_hidden()

def test_isolated_play(p,f):
 click(f,'quick-piece','M');before=f.evaluate('CounterplotTutorial.snapshot()');stored=storage(p)
 open_editor(f);tab(f,'copy');edit(f,'author-stage-title','A private draft');draft=state(f)['draft'];sb(f,'play');c=ready(f)
 do_goal(c,0,0,draft['lessons'][0]['goals'][0]);c.locator('[data-guide="next"]').click();do_goal(c,0,1,draft['lessons'][0]['goals'][1])
 sb(f,'play');ready(f);assert state(f)['playing']==False;assert state(f)['draft']==draft
 assert f.evaluate('CounterplotTutorial.snapshot()')==before
 after=storage(p);assert all(after.get(k)==v for k,v in stored.items());assert not any('practice' in k for k in after if k not in stored)
 saved(f)

def test_sample_roundtrip(p,f):
 open_editor(f);tab(f,'copy');edit(f,'author-stage-title','Keep this draft');tab(f,'reveals');ab(f,'edit-sample')
 f.locator('[data-nav=world]').click();click(f,'new-world');form(f,'world').locator('[name="name"]').fill('Studio culture');form(f,'world').locator('[name="type"]').select_option('culture');form(f,'world').locator('[type="submit"]').click()
 f.locator('[data-tutorial="keep-sample"]').click();ready(f)
 assert state(f)['draft']['lessons'][0]['title']=='Keep this draft';assert any(w['name']=='Studio culture' for w in state(f)['draft']['sample']['world']);saved(f)

def test_invalid_json_and_conflict(p,f):
 open_editor(f);tab(f,'advanced');f.locator('#author-json').fill('{broken');ab(f,'apply-json');expect(f.locator('#tutorial-author-error')).to_be_visible();ab(f,'reset-json');expect(f.locator('#author-json')).not_to_have_value('{broken')
 tab(f,'copy');edit(f,'author-stage-title','My edits');f.evaluate('localStorage.setItem("counterplot.tutorial.definition.mgs3.v1", "changed elsewhere")');ab(f,'save');expect(f.locator('#tutorial-author-error')).to_contain_text('another window')
 d=export(p,f,name='conflict-recovery.json');assert d['lessons'][0]['title']=='My edits'

def test_recovery_and_details(p,f):
 open_editor(f);sb(f,'details');edit(f,'studio-title','MGS3 authored');edit(f,'studio-description','A locally editable tutorial.');sb(f,'details-done');tab(f,'copy');edit(f,'author-stage-title','Recover me');p.wait_for_timeout(800)
 # Reload without a clean close; recover from its separate journal.
 p.on('dialog',lambda d:d.accept());f=mount(p,reload=True);open_editor(f);assert state(f)['draft']['lessons'][0]['title']=='Recover me';assert state(f)['draft']['title']=='MGS3 authored';saved(f)
 assert not any(k.startswith('counterplot.tutorial.draft.') for k in storage(p))

def test_readonly_navigation_inheritance(p,f):
 open_editor(f);original=state(f)['draft']
 for name in ['placement','timing','controls','reveals','rules','advanced','copy']:tab(f,name)
 assert state(f)['draft']==original;assert not state(f)['dirty']
 tab(f,'timing');f.locator('[data-author-scope]').select_option('all');edit(f,'author-speed','35');f.locator('[data-author-scope]').select_option('goal');assert f.locator('[name="author-speed"]').input_value()=='35';saved(f)
 assert state(f)['draft']['lessons'][0]['goals'][0].get('presentation')==original['lessons'][0]['goals'][0].get('presentation')

def test_pick_target_rule(p,f):
 c=open_editor(f);tab(f,'placement');sb(f,'pick-target');c.locator('[data-drag="palette"][data-drag-id="C"]').click();assert 'C' in state(f)['draft']['lessons'][0]['goals'][0]['focus']
 tab(f,'rules');sb(f,'pick-rule');c.locator('.project-switch [data-action="projects"],.sidebar [data-action="projects"]').filter(visible=True).first.click();g=state(f)['draft']['lessons'][0]['goals'][0];assert g['check']['kind']=='action';assert g['check']['action']=='projects';saved(f)

def main():
 tests=[v for k,v in globals().items() if k.startswith('test_')];results=[]
 with sync_playwright() as pw:
  b=launch(pw)
  for t in tests:
   if len(sys.argv)>1 and sys.argv[1] not in t.__name__:continue
   p=b.new_page(viewport={'width':1600,'height':1000},reduced_motion='reduce',accept_downloads=True);p.set_default_timeout(8000);errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
   try:
    f=mount(p);t(p,f);assert not errors,errors;results.append({'name':t.__name__,'result':'PASS'});print('PASS',t.__name__,flush=True)
   except Exception as e:
    results.append({'name':t.__name__,'result':'FAIL','error':str(e),'pageerrors':errors});traceback.print_exc();p.screenshot(path=str(ROOT/'screenshots'/f'{t.__name__}-failure.png'));print('FAIL',t.__name__,errors,flush=True)
   finally:p.close()
  b.close()
 name='studio'+('-'+sys.argv[1] if len(sys.argv)>1 else '')+'-results.json';(ROOT/name).write_text(json.dumps({'sha256':hashlib.sha256(APP.read_bytes()).hexdigest(),'tests':results},indent=2))
 if any(t['result']!='PASS' for t in results):raise SystemExit(1)
if __name__=='__main__':main()
