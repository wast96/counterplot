from common import APP, ROOT, launch
from regressions import *
from studio import tab
results=[]
with sync_playwright() as pw:
 b=launch(pw)
 for width,height in [(1440,1000),(1280,800),(1024,768),(768,1024),(390,844),(320,740)]:
  p=b.new_page(viewport={'width':width,'height':height},reduced_motion='reduce');p.set_default_timeout(6000);errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
  try:
   f=mount(p,APP.read_text());editor(f);tab(f,'reveals');ab(f,'edit-sample');expect(f.locator('[data-tutorial="keep-sample"]')).to_be_visible()
   for view in ['outline','write','characters','changes','world','connections','archive']:
    if view=='write':click(f,'mode','write')
    elif view=='changes':click(f,'character-tab','arc')
    else:f.locator('[data-nav="'+view+'"]').click()
    p.wait_for_timeout(100);n=f.evaluate('document.documentElement.scrollWidth-innerWidth');assert n<=1,(view,n)
    for action in ['keep-sample','discard-sample']:
     box=f.locator('[data-tutorial="'+action+'"]').bounding_box();assert box and box['x']>=0 and box['x']+box['width']<=width+1
    p.screenshot(path=str(ROOT/'screenshots'/f'{width}-{height}-sample-{view}.png'));results.append({'viewport':[width,height],'mode':'sample','view':view,'result':'PASS','overflow':n});print('PASS',width,view,flush=True)
   f.locator('[data-tutorial="keep-sample"]').click();expect(f.locator('#tutorial-editor')).to_be_visible();assert not errors,errors
  except Exception as e:
   results.append({'viewport':[width,height],'result':'FAIL','error':str(e),'pageerrors':errors});traceback.print_exc()
  finally:p.close()
 b.close()
(ROOT/'sample-matrix-results.json').write_text(json.dumps(results,indent=2))
if any(x['result']!='PASS'for x in results):sys.exit(1)
