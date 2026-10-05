from regressions import *
from authoring_and_links import test_raw_id_guard,test_milieu_culture,test_nested_drag
import hashlib
TESTS=[test_drag_and_stability,test_touch,test_wrong_piece,test_reload_pause,test_switch_form,test_type_cancel,test_quota,test_invalid_import,test_definition_conflict,test_raw_id_guard,test_milieu_culture,test_nested_drag]
# Remaining presentation fields are in the flat Timing inspector.
import regressions
def newtab(f,name):
 if f.locator('#tutorial-editor').get_attribute('data-panel')!='settings':f.locator('.studio-head [data-studio=panel][data-panel=settings]').click()
 ab(f,'tab','[data-tab="'+({'behavior':'timing','assemblies':'reveals'}.get(name,name))+'"]')
regressions.tab=newtab
if __name__=='__main__':
 results=[]
 with sync_playwright() as pw:
  browser=launch(pw)
  for t in TESTS:
   if len(sys.argv)>1 and sys.argv[1] not in t.__name__:continue
   p=browser.new_page(viewport={'width':390 if t==test_touch else 1440,'height':844 if t==test_touch else 1000},reduced_motion='no-preference' if t==test_type_cancel else 'reduce',accept_downloads=True,has_touch=True);p.set_default_timeout(7000);errs=[];p.on('pageerror',lambda e:errs.append(str(e)))
   try:
    f=mount(p);t(p,f);assert not errs,errs;results.append({'name':t.__name__,'result':'PASS'});print('PASS',t.__name__,flush=True)
   except Exception as e:results.append({'name':t.__name__,'result':'FAIL','error':str(e),'pageerrors':errs});traceback.print_exc();p.screenshot(path=str(ROOT/'screenshots'/f'{t.__name__}-failure.png'))
   finally:p.close()
  browser.close()
 (ROOT/('shared'+('-'+sys.argv[1] if len(sys.argv)>1 else '')+'-results.json')).write_text(json.dumps({'sha256':hashlib.sha256(APP.read_bytes()).hexdigest(),'tests':results},indent=2))
 if any(t['result']!='PASS' for t in results):raise SystemExit(1)
