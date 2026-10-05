from studio import *
from regressions import pointer_drag

def test_reopen_and_import_lifecycle(p,f):
 open_editor(f);saved(f);ab(f,'close');open_editor(f);ready(f);assert state(f)['ready']
 d=export(p,f,name='lifecycle-source.json');d['id']='lifecycle-copy';d['title']='Lifecycle copy';ab(f,'close');f.locator('[data-tutorial="browse"]').first.click();f.locator('[data-tutorial="import-tutorial"]').click();f.locator('#tutorial-definition-file').set_input_files({'name':'copy.json','mimeType':'application/json','buffer':json.dumps(d).encode()});ready(f);assert state(f)['draft']['id']=='lifecycle-copy';saved(f)
 ab(f,'close');f.locator('[data-tutorial="browse"]').first.click();f.locator('[data-tutorial="edit"][data-id="lifecycle-copy"]').click();ready(f);assert state(f)['ready']

def test_blank_visual_authoring_and_export(p,f):
 f.locator('[data-tutorial="browse"]').first.click();p.once('dialog',lambda d:d.accept('A little story'));f.locator('[data-tutorial="new-tutorial"]').click();ready(f)
 tab(f,'copy');f.locator('[data-studio-sample-type]').select_option('form');p.wait_for_timeout(100);before=state(f)['draft'];f.locator('[data-studio-sample-type]').select_option('node');assert state(f)['draft']==before;expect(f.locator('#tutorial-author-error')).to_contain_text('kept')
 f.locator('[data-studio-sample-type]').select_option('none');tab(f,'reveals');ab(f,'edit-sample')
 click(f,'quick-piece','M');title=f.locator('[data-inline="node"][data-field="title"]').first;title.fill('A strange island');title.press('Tab')
 f.locator('[data-nav="world"]').click();click(f,'new-world');form(f,'world').locator('[name="name"]').fill('Island customs');form(f,'world').locator('[name="type"]').select_option('culture');form(f,'world').locator('[type="submit"]').click();f.locator('[data-tutorial="keep-sample"]').click();ready(f)
 f.locator('[data-studio="add-reveal"]').first.click();f.locator('[data-studio-collection]').select_option('world');f.locator('[data-studio="add-reveal"]').first.click();saved(f)
 d=export(p,f,name='little-story.json');assert len(d['sample']['nodes'])==1;assert len(d['sample']['world'])==1
 html=export(p,f,'export-playable','little-story.html');ab(f,'close');f=mount(p,html);expect(f.locator('#studio-frame')).to_have_count(0)
 expect(f.locator('[data-inline="node"][data-field="title"]').first).to_have_value('A strange island');click(f,'projects');expect(f.locator('.guide-complete')).to_be_visible()

def test_editor_retains_open_writer_form(p,f):
 f.locator('[data-nav="characters"]').click();click(f,'new-character');form(f,'character').locator('[name="name"]').fill('An unfinished writer character');form(f,'character').locator('[name="identity"]').fill('Do not lose these words')
 f.locator('#dialog [data-tutorial="browse"]').click();f.locator('[data-tutorial="edit"]').first.click();ready(f);sb(f,'play');ready(f);sb(f,'play');ready(f);ab(f,'close')
 expect(form(f,'character').locator('[name="name"]')).to_have_value('An unfinished writer character');expect(form(f,'character').locator('[name="identity"]')).to_have_value('Do not lose these words');form(f,'character').locator('[type="submit"]').click()
 assert any(c['name']=='An unfinished writer character' for c in f.evaluate('CounterplotTutorial.snapshot()')['projects'][0]['characters'])

def test_sample_dirty_form_and_discard(p,f):
 open_editor(f);before=state(f)['draft'];tab(f,'reveals');ab(f,'edit-sample');f.locator('[data-nav="characters"]').click();click(f,'new-character');form(f,'character').locator('[name="name"]').fill('Not yet saved');assert f.evaluate('CounterplotSession.endAuthoring(true)') is None;expect(form(f,'character')).to_be_visible();expect(form(f,'character').locator('[name="name"]')).to_have_value('Not yet saved')
 # Return with the form explicitly closed; then discard the sample session.
 p.on('dialog',lambda d:d.accept());click(f,'close-dialog');f.locator('[data-tutorial="discard-sample"]').click();ready(f);assert state(f)['draft']==before

def test_json_refreshes_actual_scene(p,f):
 c=open_editor(f);tab(f,'advanced');f.locator('[data-author-raw-mode]').select_option('full');d=json.loads(f.locator('#author-json').input_value());n=d['sample']['nodes'][0];d['starter']['projects'][0]['nodes']=[dict(n,cast=[],worldIds=[],parentId='')];d['starter']['projects'][0]['nodes'][0]['title']='A changed starting scene'
 f.locator('#author-json').fill(json.dumps(d));ab(f,'apply-json');c=ready(f);expect(c.locator('[data-inline="node"][data-field="title"]').first).to_have_value('A changed starting scene')
 sb(f,'undo');c=ready(f);expect(c.locator('[data-node]')).to_have_count(0)

def test_drop_picker_has_stable_selector(p,f):
 c=open_editor(f);tab(f,'placement');sb(f,'pick-drop');c.locator('.outline-tail').hover();c.locator('.outline-tail').click();g=state(f)['draft']['lessons'][0]['goals'][0];assert 'studio-' not in g['drop'];assert c.locator(g['drop']).count()>0;saved(f)

def test_mobile_touch_stage_drag(p,f):
 p.set_viewport_size({'width':390,'height':844});open_editor(f);panel(f,'stages');before=state(f)['draft']['lessons'][0]['id'];a=f.locator('[data-studio-drag="stage"][data-index="0"]').bounding_box();b=f.locator('[data-studio-drop="stage"][data-index="2"]').bounding_box();assert a and b
 c=p.context.new_cdp_session(p);x,y=a['x']+a['width']/2,a['y']+a['height']/2;tx,ty=b['x']+b['width']/2,b['y']+b['height']/2
 c.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
 for i in range(1,14):c.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+(tx-x)*i/13,'y':y+(ty-y)*i/13}]})
 expect(f.locator('.studio-drag-ghost')).to_be_visible();c.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});c.detach();p.wait_for_timeout(150);assert state(f)['draft']['lessons'][2]['id']==before;expect(f.locator('.studio-drag-ghost')).to_have_count(0);saved(f)

def test_play_undo_redo_from_action(p,f):
 open_editor(f);panel(f,'stages');ab(f,'stage','[data-index="16"]');ready(f);panel(f,'canvas');ab(f,'step','[data-index="1"]');ready(f);sb(f,'play');c=ready(f);click(c,'undo');expect(c.locator('.guide-complete')).to_be_visible();sb(f,'play');ready(f)
 ab(f,'step','[data-index="2"]');ready(f);sb(f,'play');c=ready(f);click(c,'redo');expect(c.locator('.guide-complete')).to_be_visible();sb(f,'play');ready(f)

def test_invalid_setting_retains_last_recoverable_draft(p,f):
 open_editor(f);tab(f,'copy');edit(f,'author-stage-title','A safe draft');p.wait_for_timeout(800);old=storage(p).get('counterplot.tutorial.draft.mgs3.v2');assert old
 tab(f,'timing');edit(f,'author-speed',2);p.wait_for_timeout(800);assert storage(p)['counterplot.tutorial.draft.mgs3.v2']==old;expect(f.locator('#tutorial-save-state')).to_contain_text('needs correction')
 edit(f,'author-speed',28);saved(f)

def test_normal_size_popup_no_focus_or_zoom_required(p,f):
 c=open_editor(f)
 for motion in ['reduce','no-preference']:
  p.emulate_media(reduced_motion=motion)
  for w,h in [(1600,1000),(390,844)]:
   p.set_viewport_size({'width':w,'height':h});p.wait_for_timeout(150)
   popup=c.locator('#tutorial-companion').bounding_box();viewport=f.locator('.studio-viewport').bounding_box();head=f.locator('.studio-head').bounding_box()
   assert popup['x']>=viewport['x']-1 and popup['x']+popup['width']<=viewport['x']+viewport['width']+1,(motion,popup,viewport)
   assert popup['y']>=head['y']+head['height']-1 and popup['y']+popup['height']<=h+1,(motion,popup,viewport)
   assert c.evaluate('innerWidth')==w and c.evaluate('innerHeight')==h
   assert f.locator('#studio-frame').evaluate('(e)=>getComputedStyle(e).transform')=='none'
   assert not f.locator('[data-studio-zoom],[data-studio-device]').count()
 p.screenshot(path=str(ROOT/'screenshots'/'studio-normal-size.png'))

TESTS=[v for k,v in list(globals().items()) if k.startswith('test_') and v.__module__==__name__]
if __name__=='__main__':
 results=[]
 with sync_playwright() as pw:
  b=launch(pw)
  for t in TESTS:
   if len(sys.argv)>1 and sys.argv[1] not in t.__name__:continue
   p=b.new_page(viewport={'width':1600,'height':1000},reduced_motion='reduce',has_touch=True,accept_downloads=True);p.set_default_timeout(7000);errs=[];p.on('pageerror',lambda e:errs.append(str(e)))
   try:
    f=mount(p);t(p,f);assert not errs,errs;results.append({'name':t.__name__,'result':'PASS'});print('PASS',t.__name__,flush=True)
   except Exception as e:results.append({'name':t.__name__,'result':'FAIL','error':str(e),'pageerrors':errs});traceback.print_exc();p.screenshot(path=str(ROOT/'screenshots'/f'{t.__name__}-failure.png'))
   finally:p.close()
  b.close()
 (ROOT/('studio-extended'+('-'+sys.argv[1] if len(sys.argv)>1 else '')+'-results.json')).write_text(json.dumps({'sha256':hashlib.sha256(APP.read_bytes()).hexdigest(),'tests':results},indent=2))
 if any(t['result']!='PASS' for t in results):raise SystemExit(1)
