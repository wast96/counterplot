from common import APP, ROOT, launch
from regressions import *
from studio import tab
VIEWPORTS=[(560,800),(561,800),(600,900),(680,900),(681,900),(800,900),(801,900),(899,900),(900,900),(901,900),(1149,900),(1150,900),(1151,900),(1179,820),(1180,820)]
results=[]
with sync_playwright() as pw:
 b=launch(pw)
 for width,height in VIEWPORTS:
  p=b.new_page(viewport={'width':width,'height':height},reduced_motion='reduce');p.set_default_timeout(6000);errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
  try:
   f=mount(p,APP.read_text());enter(f);expect(f.locator('#tutorial-companion')).to_be_visible()
   r=f.locator('#tutorial-companion').bounding_box();assert r['x']>=0 and r['x']+r['width']<=width+1 and r['y']>=0 and r['y']+r['height']<=height+1
   f.locator('[data-guide="edit"]').click()
   for name in ['copy','placement','timing','controls','reveals','rules','advanced']:
    tab(f,name)
    # Check the tab bar itself, including clipping by an overflow-hidden dialog.
    bad=f.locator('.studio-tabs').evaluate('(el)=>{const p=el.getBoundingClientRect();return [...el.children].filter(e=>{const r=e.getBoundingClientRect();return r.right>Math.min(innerWidth,p.right)+1||r.left<p.left-1}).map(e=>e.textContent)}')
    assert not bad,(width,name,'clipped tabs',bad)
   assert not errors,errors;results.append({'viewport':[width,height],'result':'PASS'});print('PASS',width,flush=True)
  except Exception as e:
   results.append({'viewport':[width,height],'result':'FAIL','error':str(e),'pageerrors':errors});p.screenshot(path=str(ROOT/'screenshots'/f'breakpoint-{width}.png'));print('FAIL',width,e,flush=True)
  finally:p.close()
 b.close()
(ROOT/'breakpoint-results.json').write_text(json.dumps(results,indent=2))
if any(x['result']!='PASS'for x in results):sys.exit(1)
