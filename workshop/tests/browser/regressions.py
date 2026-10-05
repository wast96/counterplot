from common import APP, ROOT, launch
from pathlib import Path
import json,re,sys,time,traceback
from playwright.sync_api import sync_playwright,expect
from common import mount
from walkthrough import click,loc,form,sample,APP,ROOT
HTML=APP.read_text()
DEFINITION=json.loads((APP.parent/'tutorial/MGS3 — Tutorial definition.json').read_text())
RESULTS=[]
def editor(f):
 f.locator('[data-tutorial="browse"]').filter(visible=True).first.click();f.locator('[data-tutorial="edit"][data-id="mgs3"]').click();tab(f,'copy');return f.locator('#tutorial-editor')
def enter(f):
 f.locator('[data-tutorial="browse"]').filter(visible=True).first.click();f.locator('[data-tutorial="enter"][data-id="mgs3"]').click();expect(f.locator('#guide-select')).to_have_value('0')
 if f.evaluate('''()=>{const d=CounterplotSession.definition(),w=CounterplotTutorial.snapshot(),r=CounterplotGuide.progress().projects[d.id+':'+w.active];return d.lessons[r.index].goals[r.goal].check.kind==='read'}'''):
  f.locator('[data-guide=next]').click();expect(f.locator('.guide-instruction>.guide-section-heading')).to_have_text('Action 2 of 4')
def ab(f,action,extra=''):
 if action in ['export','export-playable','import','reset-default']:
  if f.locator('#tutorial-editor').get_attribute('data-panel')!='menu':f.locator('.studio-head [data-studio=panel][data-panel=menu]').click()
 if action in ['add-stage','add-goal','stage','goal','step']:
  if f.locator('#tutorial-editor').get_attribute('data-panel')!='stages':f.locator('.studio-head [data-studio=panel][data-panel=stages]').click()
 f.locator(f'#tutorial-editor [data-author="{action}"]{extra}').filter(visible=True).first.click()
def tab(f,id):
 if f.locator('#tutorial-editor').get_attribute('data-panel')!='settings':f.locator('.studio-head [data-studio=panel][data-panel=settings]').click()
 id={'behavior':'timing','assemblies':'reveals'}.get(id,id);ab(f,'tab',f'[data-tab="{id}"]')
def save(f):ab(f,'save');expect(f.locator('#tutorial-save-state')).to_have_text('Tutorial changes saved on this device');expect(f.locator('#tutorial-author-error')).to_be_hidden()
def download(p,callback,name):
 with p.expect_download() as result:callback()
 path=ROOT/name;result.value.save_as(str(path));return path

def export_def(p,f,name='test-definition.json'):return json.loads(download(p,lambda:ab(f,'export'),name).read_text())
def export_story(p,f,name='test-story.json'):
 click(f,'export');out=json.loads(download(p,lambda:click(f,'export-json'),name).read_text());click(f,'close-dialog');return out

def drag_mouse(p,src,dst):
 src.scroll_into_view_if_needed();a=src.bounding_box();dst.scroll_into_view_if_needed();b=dst.bounding_box();
 assert a and b
 p.mouse.move(a['x']+a['width']/2,a['y']+a['height']/2);p.mouse.down();p.mouse.move(a['x']+a['width']/2+15,a['y']+a['height']/2-15,steps=3);p.mouse.move(b['x']+b['width']/2,b['y']+b['height']/2,steps=10)

def pointer_drag(p,f,src,dst):
 a=src.bounding_box();b=dst.bounding_box();assert a and b
 c=p.context.new_cdp_session(p)
 def send(kind,x,y):c.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[] if kind=='touchEnd' else [{'x':x,'y':y}]})
 x=a['x']+a['width']/2;y=a['y']+a['height']/2;send('touchStart',x,y)
 for i in range(1,12):send('touchMove',x+(b['x']+b['width']/2-x)*i/11,y+(b['y']+b['height']/2-y)*i/11)
 expect(f.locator('.drag-ghost')).to_be_visible();expect(f.locator('#tutorial-companion')).to_have_css('opacity','0');p.screenshot(path=str(ROOT/'screenshots/touch-landing-visible.png'));send('touchEnd',0,0);c.detach();expect(f.locator('#tutorial-companion')).to_have_css('opacity','1')

def first_piece(f):
 if f.evaluate('''()=>{const d=CounterplotSession.definition(),w=CounterplotTutorial.snapshot(),r=CounterplotGuide.progress().projects[d.id+':'+w.active];return d.lessons[r.index].goals[r.goal].check.kind==='read'}'''):f.locator('[data-guide=next]').click()
 click(f,'quick-piece','C');sample(f);expect(f.locator('.guide-complete')).to_be_visible()

def test_drag_and_stability(p,f):
 enter(f);src=f.locator('[data-drag="palette"][data-drag-id="C"]');dst=f.locator('.outline-tail');drag_mouse(p,src,dst)
 expect(f.locator('.drag-ghost')).to_be_visible();ghost=f.locator('.drag-ghost').evaluate('(e)=>parseInt(getComputedStyle(e).zIndex)');spot=f.locator('#tutorial-spotlight').evaluate('(e)=>parseInt(getComputedStyle(e).zIndex)');assert ghost>spot
 p.screenshot(path=str(ROOT/'screenshots/drag-highlight-desktop.png'));p.mouse.up();expect(f.locator('[data-inline="node"][data-id="loyalty"][data-field="title"]')).to_be_visible();sample(f)
 before=f.locator('#tutorial-companion').bounding_box();f.locator('[data-guide="next"]').click();positions=[]
 for _ in range(6):positions.append(f.locator('#tutorial-companion').bounding_box());p.wait_for_timeout(40)
 assert max(abs(a['x']-before['x']) for a in positions)<=1
 expect(f.locator('.guide-instruction>.guide-section-heading')).to_have_text('Action 3 of 4');sample(f);f.locator('[data-guide="next"]').click();sample(f);f.locator('[data-guide="next"]').click()
 expect(f.locator('#guide-select')).to_have_value('1');click(f,'add-inside','loyalty');click(f,'create-piece','E');sample(f);before=f.locator('#tutorial-companion').bounding_box();f.locator('[data-guide="next"]').click();after=f.locator('#tutorial-companion').bounding_box();assert abs(before['x']-after['x'])<1;sample(f)
 expect(f.locator('[data-inline="node"][data-id="loyalty"][data-field="closing"]')).to_have_value(DEFINITION['sample']['nodes'][0]['closing'])
 expect(f.locator('[data-inline="node"][data-id="defection"][data-field="closing"]')).to_have_value('')

def test_touch(p,f):
 enter(f);pointer_drag(p,f,f.locator('[data-drag="palette"][data-drag-id="C"]'),f.locator('.outline-tail'));sample(f);expect(f.locator('.guide-complete')).to_be_visible();expect(f.locator('.drag-ghost')).to_have_count(0)

def test_wrong_piece(p,f):
 enter(f);click(f,'quick-piece','M');expect(f.locator('[title="Next tutorial action"]')).to_be_disabled();expect(f.locator('#guide-select')).to_have_value('0');click(f,'quick-piece','C');sample(f);expect(f.locator('.guide-complete')).to_be_visible();assert f.locator('.node.thread').count()==2

def test_reload_pause(p,f):
 enter(f);first_piece(f);f.locator('[data-guide="next"]').click();sample(f);f.locator('[data-guide="pause"]').click();expect(f.locator('[data-guide="open"]')).to_be_visible()
 f=mount(p,HTML,reload=True);expect(f.locator('[data-guide="open"]')).to_be_visible();f.locator('[data-guide="open"]').click();expect(f.locator('.guide-instruction>.guide-section-heading')).to_have_text('Action 3 of 4');expect(f.locator('.guide-complete')).to_be_visible();expect(f.locator('#tutorial-companion')).not_to_contain_text('Progress is not saving')
 expect(f.locator('[data-inline="node"][data-id="loyalty"][data-field="opening"]')).not_to_have_value('')

def test_switch_form(p,f):
 f.locator('[data-nav="characters"]').click();click(f,'new-character');form(f,'character').locator('[name="name"]').fill('Unfinished main character');form(f,'character').locator('[name="identity"]').fill('Keep this unsaved identity')
 f.locator('#dialog [data-tutorial="browse"]').click();f.locator('[data-tutorial="enter"]').first.click();expect(f.locator('#dialog')).not_to_have_attribute('open','');first_piece(f)
 assert f.evaluate("() => {const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented;}"),'Unsaved work cached in the other workspace must trigger a close warning'
 f.locator('[data-guide="leave"]').click();expect(form(f,'character').locator('[name="name"]')).to_have_value('Unfinished main character');expect(form(f,'character').locator('[name="identity"]')).to_have_value('Keep this unsaved identity');form(f,'character').locator('[type="submit"]').click()
 main=export_story(p,f,'session-main.json');assert any(c['name']=='Unfinished main character' for c in main['projects'][0]['characters']);assert all(n['id']!='loyalty' for n in main['projects'][0]['nodes'])
 enter(f);expect(f.locator('[data-inline="node"][data-id="loyalty"][data-field="title"]')).to_have_value('Snake becomes Big Boss')

def test_editor_roundtrip(p,f):
 ed=editor(f);original=export_def(p,f,'unmodified-definition.json');assert original==DEFINITION
 ed.locator('[name="author-instruction"]').fill('Edited instruction: drag the Character thread, then choose Insert sample.')
 tab(f,'placement');ed.locator('[name="author-position"]').select_option('custom');ed.locator('[name="author-x"]').fill('63');ed.locator('[name="author-y"]').fill('17');ed.locator('[name="author-width"]').fill('325');ed.locator('[name="highlight-padding"]').fill('9');ed.locator('[name="highlight-radius"]').fill('11')
 tab(f,'behavior');ed.locator('[name="author-sample-mode"]').select_option('type');ed.locator('[name="author-speed"]').fill('45');ed.locator('[name="author-delay"]').fill('300');ed.locator('[name="motion-insertion"]').fill('270');ed.locator('[name="motion-panel"]').fill('120')
 tab(f,'controls');ed.locator('[name="control-next-label"]').fill('Keep building');ed.locator('[name="control-next-region"]').select_option('body-bottom')
 from studio import sb,ready
 sb(f,'play');c=ready(f);expect(c.locator('#tutorial-companion')).to_contain_text('Edited instruction');sb(f,'play');ready(f);expect(ed).to_be_visible();assert f.evaluate('CounterplotTutorialLibrary.studioState().dirty');save(f)
 out=export_def(p,f,'edited-definition.json');g=out['lessons'][0]['goals'][0];assert g['presentation']['sample']=={'mode':'type','charactersPerSecond':45,'delay':300};assert g['presentation']['motion']['panel']==120;assert g['presentation']['controls']['next']['region']=='body-bottom';assert g['presentation']['overlay']['radius']==11
 # A saved export re-imports identically, rather than silently losing unknown settings.
 ab(f,'import');f.locator('#tutorial-definition-file').set_input_files(str(ROOT/'edited-definition.json'));expect(f.locator('#tutorial-save-state')).to_have_text('Imported definition · save to apply');save(f);again=export_def(p,f,'reimported-definition.json');assert out==again
 ab(f,'close');f=mount(p,HTML,reload=True);ed=editor(f);out2=export_def(p,f,'reloaded-definition.json');assert out2==out


def test_inheritance(p,f):
 ed=editor(f);tab(f,'placement');tab(f,'behavior');tab(f,'controls');tab(f,'behavior');ed.locator('[data-author-scope]').select_option('all');ed.locator('[name="author-speed"]').fill('75');save(f);out=export_def(p,f,'inheritance.json');assert out['presentation']['sample']['charactersPerSecond']==75;assert 'presentation' not in out['lessons'][0]['goals'][0]

def test_sample_authoring(p,f):
 main=export_story(p,f,'before-sample-main.json');ed=editor(f);tab(f,'assemblies');ab(f,'edit-sample');expect(f.locator('[data-tutorial="keep-sample"]')).to_be_visible();t=f.locator('[data-inline="node"][data-id="loyalty"][data-field="title"]').first;t.fill('Author-edited sample frame');t.press('Tab')
 f.locator('[data-tutorial="keep-sample"]').click();expect(ed).to_be_visible();save(f);out=export_def(p,f,'visual-sample-definition.json');assert next(n for n in out['sample']['nodes'] if n['id']=='loyalty')['title']=='Author-edited sample frame';ab(f,'close');after=export_story(p,f,'after-sample-main.json');assert main==after


def test_new_tutorial(p,f):
 f.locator('[data-tutorial="browse"]').first.click();p.once('dialog',lambda d:d.accept('A tiny story'));f.locator('[data-tutorial="new-tutorial"]').click();ed=f.locator('#tutorial-editor');expect(ed).to_be_visible();out=export_def(p,f,'custom-empty.json');assert out['title']=='A tiny story';assert out['sample']['nodes']==[];assert out['assemblies']==[];assert out['starter']['saveKey'].startswith('counterplot.tutorial.practice.')
 tab(f,'assemblies');ab(f,'edit-sample');click(f,'quick-piece','C');t=f.locator('[data-inline="node"][data-field="title"]').first;t.fill('A new character changes');t.press('Tab');f.locator('[data-tutorial="keep-sample"]').click();ed.locator('[data-studio="add-reveal"]').first.click();save(f)
 out=export_def(p,f,'custom-built.json');assert len(out['sample']['nodes'])==1;assert out['lessons'][0]['goals'][0]['enterAssemblies']==[out['assemblies'][0]['id']]
 path=download(p,lambda:ab(f,'export-playable'),'custom-playable.html');play=path.read_text();assert 'A new character changes' in play
 f2=mount(p,play);expect(f2.locator('#tutorial-companion')).to_contain_text('A tiny story');expect(f2.locator('[data-inline="node"][data-field="title"]').first).to_have_value('A new character changes');# Ready starter applies assembly on Resume/start, not on author preview.
 # Opening the only required control is enough to finish the custom example.
 click(f2,'projects');expect(f2.locator('.guide-complete')).to_be_visible()


def test_type_cancel(p,f):
 enter(f);click(f,'quick-piece','C');f.locator('[data-guide="edit"]').click();tab(f,'behavior');ed=f.locator('#tutorial-editor');ed.locator('[name="author-sample-mode"]').select_option('type');ed.locator('[name="author-speed"]').fill('5');save(f);ab(f,'close');f.locator('[data-guide="sample"]').click();f.wait_for_function('''() => {const e=document.querySelector('[data-inline="node"][data-id="loyalty"][data-field="title"]');return e&&e.value.length>0&&e.value.length<21}''',timeout=8000)
 t=f.locator('[data-inline="node"][data-id="loyalty"][data-field="title"]');assert 0<len(t.input_value())<len('Snake becomes Big Boss');f.locator('[data-guide="pause"]').click();expect(t).to_have_value('');expect(t).to_be_editable();p.wait_for_timeout(500);expect(t).to_have_value('');f.locator('[data-guide="open"]').click();expect(f.locator('[title="Next tutorial action"]')).to_be_disabled()


def test_quota(p,f):
 enter(f);first_piece(f)
 # Only the test-owned fake store is altered; this never touches a user's browser.
 p.evaluate("() => {fixtureStorage.setItem=function(k,v){throw new DOMException('Test quota','QuotaExceededError')};}")
 t=f.locator('[data-inline="node"][data-id="loyalty"][data-field="title"]');t.fill('Still in this window');t.press('Tab');expect(f.locator('#save-alert')).to_be_visible();f.locator('[data-guide="leave"]').click();expect(t).to_have_value('Still in this window');expect(f.locator('[data-guide="leave"]')).to_be_visible();out=export_story(p,f,'quota-rescue.json');assert out['projects'][0]['nodes'][0]['title']=='Still in this window'


def test_invalid_import(p,f):
 ed=editor(f);before=export_def(p,f,'before-invalid.json');ab(f,'import');f.locator('#tutorial-definition-file').set_input_files({'name':'bad.json','mimeType':'application/json','buffer':b'{"format":"not a tutorial"}'});expect(f.locator('#tutorial-author-error')).to_contain_text('Could not import');after=export_def(p,f,'after-invalid.json');assert before==after

def test_definition_conflict(p,f):
 ed=editor(f);ed.locator('[name="author-instruction"]').fill('Edits in this tab');p.evaluate("fixtureStorage.setItem('counterplot.tutorial.definition.mgs3.v1','other tab data')");ab(f,'save');expect(ed.locator('#tutorial-author-error')).to_contain_text('another window');out=export_def(p,f,'conflict-rescue.json');assert out['lessons'][0]['goals'][0]['text']=='Edits in this tab'

TESTS=[test_drag_and_stability,test_touch,test_wrong_piece,test_reload_pause,test_switch_form,test_editor_roundtrip,test_inheritance,test_sample_authoring,test_new_tutorial,test_type_cancel,test_quota,test_invalid_import,test_definition_conflict]
if __name__=='__main__':
 with sync_playwright() as pw:
  b=launch(pw)
  for test in TESTS:
   if len(sys.argv)>1 and sys.argv[1] not in test.__name__:continue
   p=b.new_page(viewport={'width':390 if test==test_touch else 1440,'height':844 if test==test_touch else 1000},has_touch=test==test_touch,reduced_motion='no-preference' if test==test_type_cancel else 'reduce',accept_downloads=True);p.set_default_timeout(7000);errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
   try:
    f=mount(p,HTML);test(p,f);assert not errors,errors;RESULTS.append({'test':test.__name__,'result':'PASS'});print('PASS',test.__name__,flush=True)
   except Exception as e:
    RESULTS.append({'test':test.__name__,'result':'FAIL','error':str(e),'pageerrors':errors});print('FAIL',test.__name__,str(e),errors,flush=True);traceback.print_exc();p.screenshot(path=str(ROOT/'screenshots'/f'{test.__name__}-failure.png'))
   finally:p.close()
  b.close()
 (ROOT/'regression-results.json').write_text(json.dumps(RESULTS,indent=2));print(json.dumps(RESULTS,indent=2))
 if any(t['result']!='PASS' for t in RESULTS):sys.exit(1)
