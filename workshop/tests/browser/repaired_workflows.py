"""Regressions for native-size editing, automatic writing and archived retries."""
from common import APP, ROOT, mount, launch
from playwright.sync_api import sync_playwright,expect
from regressions import enter,click,drag_mouse
from studio import ready,state,sb
import json,hashlib,traceback,sys

def chosen(f):
 return f.evaluate('''() => {const s=CounterplotGuide.progress(),w=CounterplotTutorial.snapshot(),d=CounterplotTutorialLibrary.definition('mgs3'),r=s.projects['mgs3:'+w.active];return {record:r,key:d.lessons[r.index].id+':'+d.lessons[r.index].goals[r.goal].id}}''')
def auto(f,timeout=22000):
 # A prior attempt can still have its sample flag until the next animation frame
 # adopts the replacement. Wait for its real saved fields, not that stale flag.
 f.wait_for_function('''() => {const s=CounterplotGuide.progress(),w=CounterplotTutorial.snapshot(),d=CounterplotTutorialLibrary.definition('mgs3'),r=s.projects['mgs3:'+w.active];if(!r)return false;const g=d.lessons[r.index].goals[r.goal];if(!r.samples[d.lessons[r.index].id+':'+g.id])return false;if(g.sampleNode){const pr=w.projects.find(p=>p.id===w.active),n=pr.nodes.find(n=>n.id===g.sampleNode);return !!n&&(g.nodeFields||['title','opening',...(n.type==='B'?[]:['closing'])]).every(k=>String(n[k]||'').trim()!=='');}return true}''',timeout=timeout)
 expect(f.locator('#tutorial-companion')).not_to_have_class('guide-typing')
def title(f,id='loyalty'):return f.locator(f'[data-inline=node][data-id="{id}"][data-field=title]')
def pr(f):
 w=f.evaluate('CounterplotTutorial.snapshot()');return next(x for x in w['projects'] if x['id']==w['active'])
def drop(p,f):
 drag_mouse(p,f.locator('[data-drag=palette][data-drag-id=C]'),f.locator('.outline-tail'));p.mouse.up()
def ed(f):
 f.locator('[data-tutorial=browse]').first.click();f.locator('[data-tutorial=edit]').first.click();return ready(f)
def pane(f,name):
 if f.locator('#tutorial-editor').get_attribute('data-panel')!=name:f.locator(f'.studio-head [data-studio=panel][data-panel={name}]').click()
def tab(f,name):
 pane(f,'settings');f.locator(f'[data-author=tab][data-tab={name}]').click()
def save(f):
 f.locator('[data-author=save]').click();expect(f.locator('#tutorial-author-error')).to_be_hidden();assert not state(f)['dirty']
def export_def(p,f,name='repair-definition.json'):
 pane(f,'menu')
 with p.expect_download() as dl:f.locator('[data-author=export]').click()
 dest=ROOT/name;dl.value.save_as(str(dest));return json.loads(dest.read_text())
def typing(f):
 f.wait_for_function('''() => {const x=document.querySelector('[data-inline=node][data-id=loyalty][data-field=title]');return x&&x.value.length>0&&x.value.length<21}''')
def test_automatic_without_insert_sample(p,f):
 enter(f);drop(p,f);typing(f);assert pr(f)['nodes'][0]['title']=='';assert chosen(f)['record']['goal']==1
 p.screenshot(path=str(ROOT/'screenshots/automatic-writing.png'));auto(f);expect(title(f)).to_have_value('Snake becomes Big Boss')
 expect(f.locator('.guide-complete')).to_be_visible();p.wait_for_timeout(1000);assert chosen(f)['record']['goal']==1
 f.locator('[data-guide=next]').click();auto(f);assert chosen(f)['record']['goal']==2;assert pr(f)['nodes'][0]['opening']
 f.locator('[data-guide=next]').click();auto(f);assert pr(f)['nodes'][0]['closing']
 f.locator('[data-guide=next]').click();click(f,'add-inside','loyalty');click(f,'create-piece','E');auto(f);assert pr(f)['nodes'][1]['title']=='Defection of Sokolov'
 f.locator('[data-guide=next]').click();auto(f);assert pr(f)['nodes'][1]['opening'];assert not pr(f)['nodes'][1]['closing']
def test_archived_retry_no_deletion(p,f):
 enter(f);drop(p,f);auto(f);title(f).fill('My earlier wording');title(f).press('Tab');click(f,'archive-node','loyalty');p.wait_for_timeout(150);assert len(pr(f)['archive'])==1
 drop(p,f);auto(f);c=pr(f);assert c['nodes'][0]['id']=='loyalty';assert c['nodes'][0]['title']=='Snake becomes Big Boss'
 old=c['archive'][0];assert old['nodes'][0]['title']=='My earlier wording';assert old['nodes'][0]['id']!='loyalty';assert chosen(f)['record']['running']
 p.screenshot(path=str(ROOT/'screenshots/archive-retry-success.png'))
 f.locator('[data-guide=pause]').click();f.locator('[data-nav=archive]').first.click();click(f,'restore',old['id']);c=pr(f)
 assert len(c['nodes'])==2;assert {n['title'] for n in c['nodes']}=={'Snake becomes Big Boss','My earlier wording'};assert len(c['archive'])==0
def test_archived_retry_saved_reload(p,f):
 enter(f);drop(p,f);auto(f);title(f).fill('Archived across reload');title(f).press('Tab');click(f,'archive-node','loyalty')
 f=mount(p,reload=True);drop(p,f);auto(f);c=pr(f);assert len(c['archive'])==1;assert c['archive'][0]['nodes'][0]['title']=='Archived across reload';assert c['nodes'][0]['title']=='Snake becomes Big Boss'
 f=mount(p,reload=True);assert len(pr(f)['archive'])==1;expect(title(f)).to_have_value('Snake becomes Big Boss');expect(f.locator('#tutorial-companion')).not_to_contain_text('Restore any earlier copy')
def test_archived_retry_undo_redo(p,f):
 enter(f);drop(p,f);auto(f);title(f).fill('First attempt');title(f).press('Tab');click(f,'archive-node','loyalty');drop(p,f);auto(f);f.locator('[data-guide=pause]').click()
 for _ in range(3):click(f,'undo');f.evaluate('Workshop.validate(CounterplotTutorial.snapshot())')
 for _ in range(3):click(f,'redo');f.evaluate('Workshop.validate(CounterplotTutorial.snapshot())')
 assert len(pr(f)['archive'])==1;assert pr(f)['archive'][0]['nodes'][0]['title']=='First attempt';assert pr(f)['nodes'][0]['id']=='loyalty'
def test_typing_does_not_overwrite(p,f):
 enter(f);drop(p,f);title(f).click();title(f).fill('My own character change');title(f).press('Tab');p.wait_for_timeout(1500)
 expect(title(f)).to_have_value('My own character change');expect(f.locator('.guide-complete')).to_be_visible();assert pr(f)['nodes'][0]['title']=='My own character change'
def test_midtyping_cancel_reload(p,f):
 enter(f);drop(p,f);typing(f);f.locator('[data-guide=pause]').click();expect(title(f)).to_have_value('');expect(title(f)).to_be_editable();p.wait_for_timeout(800);assert not pr(f)['nodes'][0]['title']
 f=mount(p,reload=True);expect(title(f)).to_have_value('');f.locator('[data-guide=open]').click();auto(f);expect(title(f)).to_have_value('Snake becomes Big Boss')
def test_native_size_editing(p,f):
 before=f.locator('h1').evaluate('(e)=>getComputedStyle(e).fontSize');c=ed(f);assert c.evaluate('innerWidth')==p.viewport_size['width'];assert c.evaluate('innerHeight')==p.viewport_size['height'];assert c.locator('h1').evaluate('(e)=>getComputedStyle(e).fontSize')==before
 assert f.locator('#studio-frame').evaluate('(e)=>getComputedStyle(e).transform')=='none';expect(f.locator('.studio-inspector')).to_be_hidden();expect(f.locator('.studio-stages')).to_be_hidden();assert f.locator('[data-studio-zoom],[data-studio-device]').count()==0
 h=f.locator('.studio-head').bounding_box();g=c.locator('#tutorial-companion').bounding_box();assert g['y']>=h['y']+h['height']
 focus=state(f)['draft']['lessons'][0]['goals'][0]['focus'];c.locator('#tutorial-companion h2').fill('A readable full-size editor');c.locator('#tutorial-companion h2').press('Tab');assert state(f)['draft']['lessons'][0]['title']=='A readable full-size editor'
 c.locator('[data-nav=world]').click();expect(c.locator('h1')).to_have_text('World');assert state(f)['draft']['lessons'][0]['goals'][0]['focus']==focus;save(f)
def test_direct_popup_manipulation(p,f):
 c=ed(f);b=c.locator('[data-studio-handle=panel]').bounding_box();p.mouse.move(b['x']+10,b['y']+10);p.mouse.down();p.mouse.move(b['x']-160,b['y']+110,steps=15);p.mouse.up();p.wait_for_timeout(250)
 g=state(f)['draft']['lessons'][0]['goals'][0];assert g['presentation']['placement']['mode']=='custom';c=ready(f);old=c.locator('#tutorial-companion').bounding_box();b=c.locator('[data-studio-handle=resize]').bounding_box()
 p.mouse.move(b['x']+b['width']/2,b['y']+15);p.mouse.down();p.mouse.move(b['x']+60,b['y']+15,steps=15);p.mouse.up();p.wait_for_timeout(250);assert state(f)['draft']['lessons'][0]['goals'][0]['presentation']['placement']['width']>340;assert c.locator('#tutorial-companion').bounding_box()['width']>old['width'];save(f)
def test_stages_actions_and_history(p,f):
 c=ed(f);c.locator('[data-guide=next]').click();c=ready(f);assert state(f)['step']==1;c.locator('[data-studio-local=add]').click();ready(f);assert len(state(f)['draft']['lessons'][0]['goals'])==5
 f.locator('[data-studio=undo]').click();ready(f);assert len(state(f)['draft']['lessons'][0]['goals'])==4;pane(f,'stages');f.locator('[data-author=add-stage]').click();ready(f);assert len(state(f)['draft']['lessons'])==23
 tab(f,'copy');f.locator('[name=author-stage-title]').fill('Another stage');f.locator('[name=author-stage-title]').press('Tab');save(f);d=export_def(p,f);assert d['lessons'][-1]['title']=='Another stage'
 f.locator('[data-author=close]').click();f=mount(p,reload=True);ed(f);assert len(state(f)['draft']['lessons'])==23
def test_edit_play_isolation(p,f):
 ed(f);before=p.evaluate('Object.fromEntries(fixtureStorage.items)');sb(f,'play');c=ready(f);c.locator('[data-guide=next]').click();drop(p,c);auto(c);expect(title(c)).to_have_value('Snake becomes Big Boss');assert p.evaluate('Object.fromEntries(fixtureStorage.items)')==before
 sb(f,'play');c=ready(f);assert not state(f)['playing'];expect(c.locator('[data-studio-handle=panel]')).to_be_visible();assert p.evaluate('Object.fromEntries(fixtureStorage.items)')==before
def test_saved_timing_and_export(p,f):
 ed(f);tab(f,'timing');f.locator('[name=author-speed]').fill('18');f.locator('[name=author-speed]').press('Tab');f.locator('[name=author-delay]').fill('950');f.locator('[name=author-delay]').press('Tab');save(f)
 d=export_def(p,f,'timing-definition.json');assert d['lessons'][0]['goals'][0]['presentation']['sample']['charactersPerSecond']==18;assert d['lessons'][0]['goals'][0]['presentation']['sample']['delay']==950;assert d['presentation']['sample']['trigger']=='ready'
 f.locator('[data-author=close]').click();f=mount(p,reload=True);ed(f);tab(f,'timing');expect(f.locator('[name=author-speed]')).to_have_value('18')
def test_fullsize_responsive(p,f):
 c=ed(f);base=state(f)['draft']
 for w,h in [(1440,1000),(1280,800),(1024,768),(768,1024),(390,844),(320,568),(844,390)]:
  p.set_viewport_size({'width':w,'height':h});p.wait_for_timeout(300);assert c.evaluate('innerWidth')==w and c.evaluate('innerHeight')==h;assert f.evaluate('document.documentElement.scrollWidth')<=w+1;assert c.evaluate('document.documentElement.scrollWidth')<=w+1
  head=f.locator('.studio-head').bounding_box();g=c.locator('#tutorial-companion').bounding_box();assert g['y']>=head['y']+head['height']-1,(w,h,head,g);assert g['x']>=0 and g['x']+g['width']<=w+1 and g['y']+g['height']<=h+1
  for sel in ['[data-author=save]','[data-author=close]','[data-studio=play]']:
   a=f.locator(sel).bounding_box();assert a and a['x']>=0 and a['x']+a['width']<=w+1
  p.screenshot(path=str(ROOT/f'screenshots/native-{w}-{h}.png'))
  for panel in ['settings','stages','menu']:
   pane(f,panel);b=f.locator('.studio-drawer:visible').bounding_box();assert b and b['x']>=0 and b['x']+b['width']<=w+1 and b['y']+b['height']<=h+1;p.screenshot(path=str(ROOT/f'screenshots/native-{w}-{h}-{panel}.png'))
  f.locator('.studio-head [data-panel=menu]').click()
 assert state(f)['draft']==base
TESTS=[test_automatic_without_insert_sample,test_archived_retry_no_deletion,test_archived_retry_saved_reload,test_archived_retry_undo_redo,test_typing_does_not_overwrite,test_midtyping_cancel_reload,test_native_size_editing,test_direct_popup_manipulation,test_stages_actions_and_history,test_edit_play_isolation,test_saved_timing_and_export,test_fullsize_responsive]
if __name__=='__main__':
 results=[]
 with sync_playwright() as pw:
  b=launch(pw)
  for t in TESTS:
   if len(sys.argv)>1 and sys.argv[1] not in t.__name__:continue
   p=b.new_page(viewport={'width':1440,'height':1000},reduced_motion='no-preference',accept_downloads=True);p.set_default_timeout(7000);errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
   try:f=mount(p);t(p,f);assert not errors,errors;results.append({'name':t.__name__,'result':'PASS'});print('PASS',t.__name__,flush=True)
   except Exception as e:traceback.print_exc();p.screenshot(path=str(ROOT/f'screenshots/{t.__name__}-failure.png'));results.append({'name':t.__name__,'result':'FAIL','error':str(e),'pageerrors':errors});print('FAIL',t.__name__,flush=True)
   finally:p.close()
  b.close()
 (ROOT/('repaired'+('-'+sys.argv[1] if len(sys.argv)>1 else '')+'-results.json')).write_text(json.dumps({'sha256':hashlib.sha256(APP.read_bytes()).hexdigest(),'tests':results},indent=2));sys.exit(any(x['result']!='PASS' for x in results))
