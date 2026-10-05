from common import APP, ROOT, launch
from regressions import *
import tempfile

def test_portable_exports(p):
 # Isolated fixture; no access to Winston's local browser. Native file:// is blocked by the QA environment.
 f=mount(p,APP.read_text())
 enter(f);first_piece(f)
 f.locator('[data-guide="next"]').click();sample(f);f=mount(p,APP.read_text(),reload=True);expect(f.locator('.guide-instruction>.guide-section-heading')).to_have_text('Action 3 of 4');expect(f.locator('.guide-complete')).to_be_visible()
 before=export_story(p,f,'real-file-story.json')
 click(f,'export');playable=download(p,lambda:click(f,'export-html'),'real-file-story.html');click(f,'close-dialog')
 f=mount(p,playable.read_text());expect(f.locator('[data-inline="node"][data-id="loyalty"][data-field="title"]')).to_have_value('Snake becomes Big Boss');after=export_story(p,f,'real-file-portable-story.json');assert before['projects']==after['projects'];assert before['active']==after['active']
 # A normal story HTML export is an independent editable copy, not an auto-running lesson.
 expect(f.locator('#tutorial-companion')).to_be_hidden()
 f.locator('[data-tutorial="browse"]').filter(visible=True).first.click();f.locator('[data-tutorial="edit"]').first.click();definition=export_def(p,f,'real-file-definition.json');assert definition==DEFINITION
 # Test import through the actual story shelf in a fresh exported copy.
 ab(f,'close');click(f,'projects');click(f,'import');f.locator('input[type="file"][accept*="json"]').first.set_input_files(str(ROOT/'real-file-story.json'));click(f,'accept-import');out=export_story(p,f,'real-file-reimport.json');assert len(out['projects'])==2;assert len(set(x['id'] for x in out['projects']))==2

if __name__=='__main__':
 results=[]
 with sync_playwright() as pw:
  b=launch(pw);p=b.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce',accept_downloads=True);p.set_default_timeout(8000);errs=[];p.on('pageerror',lambda e:errs.append(str(e)))
  try:
   test_portable_exports(p);assert not errs,errs;results=[{'test':'test_portable_exports','result':'PASS'}];print('PASS portable story HTML, definitions and import in isolated preview')
  except Exception as e:
   results=[{'test':'test_portable_exports','result':'FAIL','error':str(e),'pageerrors':errs}];traceback.print_exc();p.screenshot(path=str(ROOT/'screenshots/file-protocol-failure.png'))
  finally:p.close();b.close()
 (ROOT/'portability-results.json').write_text(json.dumps(results,indent=2))
 if any(x['result']!='PASS'for x in results):sys.exit(1)
