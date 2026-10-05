"""Load a broken save made by the actual previously delivered build, then resume."""
from common import APP,ROOT,mount,launch
from repaired_workflows import auto,pr,enter,title
from playwright.sync_api import sync_playwright,expect
from pathlib import Path
import json,hashlib,traceback
fixture=Path(__file__).resolve().parents[1]/'fixtures'/'archive-retry-old-build.json'
result={}
with sync_playwright() as pw:
 b=launch(pw);p=b.new_page(viewport={'width':1440,'height':1000},accept_downloads=True);p.set_default_timeout(10000);errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
 try:
  f=mount(p);old=json.loads(fixture.read_text());p.evaluate('''d=>{fixtureStorage.setItem(d.workspace_after_retry.saveKey,JSON.stringify(d.workspace_after_retry));fixtureStorage.setItem('counterplot.guide.library.v1',JSON.stringify(d.progress_after_retry));}''',old)
  f=mount(p,reload=True);enter(f)
  # Deliberately paused progress is not silently started; Resume retries adoption.
  if f.locator('[data-guide=start]').is_visible():f.locator('[data-guide=start]').click()
  else:
   btn=f.locator('#tutorial-companion button').filter(has_text='Resume action');expect(btn).to_be_visible();btn.click()
  auto(f);c=pr(f);assert c['nodes'][0]['id']=='loyalty';assert c['nodes'][0]['title']=='Snake becomes Big Boss';assert c['archive'][0]['nodes'][0]['title']=='Keep this archived attempt';assert c['archive'][0]['nodes'][0]['id']!='loyalty';assert not errors,errors
  p.screenshot(path=str(ROOT/'screenshots/previous-broken-save-recovered.png'));result={'name':'previous_delivered_build_broken_save_resume','result':'PASS','archive_preserved':True};print('PASS old broken save resumes, archive preserved',flush=True)
 except Exception as e:
  traceback.print_exc();result={'name':'previous_delivered_build_broken_save_resume','result':'FAIL','error':str(e),'pageerrors':errors};p.screenshot(path=str(ROOT/'screenshots/previous-broken-save-failure.png'))
 finally:p.close();b.close()
(ROOT/'failed-save-recovery.json').write_text(json.dumps({'sha256':hashlib.sha256(APP.read_bytes()).hexdigest(),'test':result},indent=2))
if result['result']!='PASS':raise SystemExit(1)
