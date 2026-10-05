"""Normal-size, selection-first authoring, independent of native browser storage."""
from common import APP,ROOT,mount,launch
from playwright.sync_api import sync_playwright,expect
from repaired_workflows import ed,pane,tab,save
from studio import ready,state,sb,ab,panel
import json,hashlib,traceback,sys

def bounds(p,f,sel):
 b=f.locator(sel).bounding_box();v=p.viewport_size
 assert b and b['x']>=-1 and b['y']>=-1 and b['x']+b['width']<=v['width']+1 and b['y']+b['height']<=v['height']+1,(sel,b,v)
 return b

def text_tools(f,c):
 c.locator('#tutorial-companion h2').click()
 expect(f.locator('.studio-context-tools')).to_be_visible();expect(f.locator('.studio-inspector')).to_be_hidden()
 f.locator('[data-studio=context][data-section=style]').click()
 expect(f.locator('.studio-inspector')).to_be_visible();expect(f.locator('.studio-tabs')).to_be_hidden()
 expect(f.locator('.studio-inspector .studio-rail-head strong')).to_have_text('Text appearance')

def test_selected_text_real_size(p,f):
 before=f.evaluate('CounterplotTutorial.snapshot()');c=ed(f)
 expect(f.locator('.studio-context-tools')).to_be_hidden();text_tools(f,c);bounds(p,f,'.studio-inspector')
 f.locator('[name=author-font]').fill('17');f.locator('[name=author-font]').press('Tab');p.wait_for_timeout(300)
 expect(c.locator('.guide-instruction p')).to_have_css('font-size','17px');assert c.evaluate('innerWidth')==1440
 save(f);f.locator('[data-author=close]').click();assert f.evaluate('CounterplotTutorial.snapshot()')==before

def test_inline_edit_and_context_dismiss(p,f):
 c=ed(f);h=c.locator('#tutorial-companion h2');h.fill('Readable without a magnifying glass')
 expect(f.locator('.studio-context-tools')).to_be_visible();assert state(f)['draft']['lessons'][0]['title']=='Readable without a magnifying glass'
 h.press('Escape');expect(f.locator('.studio-context-tools')).to_be_hidden();expect(f.locator('#tutorial-editor')).to_be_visible();save(f)

def test_settings_after_context(p,f):
 c=ed(f);text_tools(f,c);f.locator('.studio-head [data-panel=settings]').click()
 expect(f.locator('.studio-tabs')).to_be_visible();expect(f.locator('[name=author-position]')).to_be_visible()
 tab(f,'timing');expect(f.locator('[name=author-speed]')).to_be_visible();assert not state(f)['dirty']

def test_popup_selection_highlight_and_buttons(p,f):
 c=ed(f);c.locator('[data-studio-handle=panel]').click();expect(f.locator('.studio-context-tools')).to_be_visible();bounds(p,f,'.studio-context-tools')
 f.locator('[data-section=highlight]').click();expect(f.locator('.studio-tabs')).to_be_hidden()
 f.locator('[data-studio=pick-target]').click();c.locator('[data-drag=palette][data-drag-id=C]').click()
 expect(f.locator('.studio-inspector .studio-rail-head strong')).to_have_text('Highlight')
 assert 'studio-' not in state(f)['draft']['lessons'][0]['goals'][0]['focus']
 c.locator('h1').click();expect(f.locator('.studio-inspector')).to_be_hidden()
 c.locator('[data-guide=next]').click(modifiers=['Alt'])
 expect(f.locator('.studio-inspector .studio-rail-head strong')).to_have_text('Button properties');expect(f.locator('.studio-tabs')).to_be_hidden()
 f.locator('[name=control-next-label]').fill('Keep building');f.locator('[name=control-next-label]').press('Tab');p.wait_for_timeout(300)
 assert state(f)['draft']['lessons'][0]['goals'][0]['presentation']['controls']['next']['label']=='Keep building';save(f)

def test_context_fit_desktop_tablet_phone(p,f):
 c=ed(f);baseline=state(f)['draft']
 for w,h in [(1440,1000),(1024,768),(768,1024),(390,844),(320,568),(844,390)]:
  p.set_viewport_size({'width':w,'height':h});p.wait_for_timeout(250);c.locator('[data-studio-handle=panel]').click();bounds(p,f,'.studio-context-tools')
  p.screenshot(path=str(ROOT/f'screenshots/context-{w}-{h}.png'));f.locator('[data-section=placement]').click();bounds(p,f,'.studio-inspector');bounds(p,f,'[data-author=save]')
  assert c.evaluate('innerWidth')==w;assert f.locator('#studio-frame').evaluate('(e)=>getComputedStyle(e).transform')=='none';assert f.evaluate('document.documentElement.scrollWidth')<=w+1
  p.screenshot(path=str(ROOT/f'screenshots/properties-{w}-{h}.png'));f.locator('.studio-inspector [data-panel=canvas]').click()
 assert state(f)['draft']==baseline

def test_context_does_not_export_editor_ui(p,f):
 c=ed(f);text_tools(f,c);save(f);pane(f,'menu')
 with p.expect_download() as dl:f.locator('[data-author=export-playable]').click()
 out=ROOT/'context-portable.html';dl.value.save_as(str(out));doc=out.read_text()
 from bs4 import BeautifulSoup
 soup=BeautifulSoup(doc,'html.parser');assert soup.select_one('.studio-context-tools') is None and soup.select_one('#studio-frame') is None
 p2=p.context.browser.new_page();pf=mount(p2,html=doc);expect(pf.locator('[data-tutorial=browse]').first).to_be_visible();p2.close()

def test_pick_native_toolbar_and_cancel(p,f):
 c=ed(f);tab(f,'placement');f.locator('[data-studio=pick-target]').click();expect(f.locator('.studio-head')).to_be_hidden()
 expect(c.locator('[data-studio-frame-return]')).to_be_visible();c.locator('[data-studio-frame-return]').click()
 expect(f.locator('.studio-head')).to_be_visible();assert not state(f)['dirty']
 f.locator('[data-studio=pick-target]').click()
 c.locator('[data-action=export]').first.click();p.wait_for_timeout(250)
 assert state(f)['draft']['lessons'][0]['goals'][0]['focus']=='[data-action="export"]';expect(f.locator('.studio-head')).to_be_visible();save(f)

def test_play_native_toolbar_all_sizes(p,f):
 ed(f);sb(f,'play');c=ready(f)
 for w,h in [(1440,1000),(1024,768),(768,1024),(390,844),(320,568),(844,390)]:
  p.set_viewport_size({'width':w,'height':h});p.wait_for_timeout(250);expect(f.locator('.studio-head')).to_be_hidden()
  back=c.locator('[data-studio-frame-return]');expect(back).to_be_visible();bounds(p,c,'[data-studio-frame-return]');bounds(p,c,'[data-action=undo]');bounds(p,c,'[data-action=redo]')
  assert c.evaluate('innerWidth')==w;assert c.evaluate('document.documentElement.scrollWidth')<=w+1
  assert back.evaluate('(e)=>e.scrollWidth<=e.clientWidth+1'), 'Return label is clipped'
  p.screenshot(path=str(ROOT/f'screenshots/play-native-{w}-{h}.png'))
 sb(f,'play');ready(f);expect(f.locator('.studio-head')).to_be_visible();assert not state(f)['playing']

def test_play_keeps_native_undo_shortcut(p,f):
 ed(f);ab(f,'stage','[data-index="16"]');ready(f);ab(f,'step','[data-index="1"]');ready(f);sb(f,'play');c=ready(f)
 c.locator('h1').click();c.locator('body').press('Control+z');expect(c.locator('.guide-complete')).to_be_visible()
 sb(f,'play');ready(f);assert not state(f)['playing']

def test_hide_popup_without_shrinking_workspace(p,f):
 p.set_viewport_size({'width':320,'height':568});c=ed(f);before=state(f)['draft']
 c.locator('[data-studio-control=pause]').click();expect(c.locator('#tutorial-companion')).to_be_hidden();expect(f.locator('[data-studio=show-popup]')).to_be_visible();bounds(p,f,'[data-studio=show-popup]')
 c.locator('[data-nav=outline]').click();c.locator('[data-action=mode][data-id=write]').click();expect(c.locator('[data-action=mode][data-id=write]')).to_have_attribute('aria-pressed','true')
 assert c.evaluate('innerWidth')==320;assert state(f)['draft']==before;assert not state(f)['dirty']
 f.locator('[data-studio=show-popup]').click();expect(c.locator('#tutorial-companion')).to_be_visible();expect(f.locator('[data-studio=show-popup]')).to_be_hidden();assert state(f)['draft']==before
 c.locator('[data-studio-control=pause]').click();f.locator('.studio-head [data-panel=settings]').click();expect(c.locator('#tutorial-companion')).to_be_visible();expect(f.locator('.studio-tabs')).to_be_visible()

TESTS=[test_selected_text_real_size,test_inline_edit_and_context_dismiss,test_settings_after_context,test_popup_selection_highlight_and_buttons,test_context_fit_desktop_tablet_phone,test_context_does_not_export_editor_ui,test_pick_native_toolbar_and_cancel,test_play_native_toolbar_all_sizes,test_play_keeps_native_undo_shortcut,test_hide_popup_without_shrinking_workspace]
if __name__=='__main__':
 results=[]
 with sync_playwright() as pw:
  b=launch(pw)
  for t in TESTS:
   if len(sys.argv)>1 and sys.argv[1] not in t.__name__:continue
   p=b.new_page(viewport={'width':1440,'height':1000},reduced_motion='no-preference',accept_downloads=True);p.set_default_timeout(6000);errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
   try:f=mount(p);t(p,f);assert not errors,errors;results.append({'name':t.__name__,'result':'PASS'});print('PASS',t.__name__,flush=True)
   except Exception as e:traceback.print_exc();p.screenshot(path=str(ROOT/f'screenshots/{t.__name__}-failure.png'));results.append({'name':t.__name__,'result':'FAIL','error':str(e),'pageerrors':errors});print('FAIL',t.__name__,flush=True)
   finally:p.close()
  b.close()
 (ROOT/('context'+('-'+sys.argv[1] if len(sys.argv)>1 else '')+'-results.json')).write_text(json.dumps({'sha256':hashlib.sha256(APP.read_bytes()).hexdigest(),'tests':results},indent=2));sys.exit(any(x['result']!='PASS' for x in results))
