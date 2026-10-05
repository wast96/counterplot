"""Actual-sized editor, optional popovers, populated story views, and action boundaries."""
from studio import *
VIEWPORTS=[(1600,1000),(1280,800),(1024,768),(834,1112),(768,1024),(390,844),(320,568),(844,390)]
TABS=['copy','placement','timing','controls','reveals','rules','advanced']
VIEWS=['outline','write','characters','arc','world','connections','archive']
RESULTS=[];OUT=ROOT/'screenshots'/'studio-matrix';OUT.mkdir(exist_ok=True)
def capture(p,f,name):
 p.wait_for_timeout(100)
 metrics=f.evaluate('''() => {
 const d=document.querySelector('#tutorial-editor'),r=d.getBoundingClientRect(),frame=d.querySelector('#studio-frame'),head=d.querySelector('.studio-head').getBoundingClientRect();
 const bounds=e=>{const x=e.getBoundingClientRect();return {left:x.left,top:x.top,right:x.right,bottom:x.bottom,width:x.width,height:x.height}};
 const visible=e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&getComputedStyle(e).visibility!=='hidden';};
 const clipped=[...d.querySelectorAll('.studio-head button,.studio-tabs button,.studio-rail-head button')].filter(visible).filter(e=>{const b=e.getBoundingClientRect();return b.left<r.left-1||b.right>r.right+1||b.top<r.top-1||b.bottom>r.bottom+1}).map(e=>({text:e.textContent,bounds:bounds(e)}));
 const drawers=[...d.querySelectorAll('.studio-drawer')].filter(visible).map(bounds);
 const normalSize=frame.contentWindow.innerWidth===innerWidth&&frame.contentWindow.innerHeight===innerHeight&&getComputedStyle(frame).transform==='none';
 return {viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth-innerWidth,dialog:bounds(d),head:bounds(d.querySelector('.studio-head')),clipped,normalSize,drawers,drawersFit:drawers.every(x=>x.left>=-1&&x.right<=innerWidth+1&&x.top>=head.bottom-1&&x.bottom<=innerHeight+1)};
 }''')
 metrics['name']=name;metrics['note']=f.locator('.studio-canvas-message').inner_text();RESULTS.append(metrics);p.screenshot(path=str(OUT/(name+'.png')))
 print(name,metrics['overflow'],metrics['clipped'],metrics['normalSize'],metrics['drawersFit'],flush=True)
 assert metrics['overflow']<=1 and not metrics['clipped'] and metrics['normalSize'] and metrics['drawersFit'],metrics

def view(c,v):
 if v in ['outline','write']:
  c.locator('[data-nav=outline]').click();click(c,'mode',v)
 elif v in ['characters','arc']:
  c.locator('[data-nav=characters]').click();click(c,'character-tab','arc' if v=='arc' else 'blocks')
 else:c.locator(f'[data-nav={v}]').click()

def run():
 with sync_playwright() as pw:
  browser=launch(pw)
  for w,h in VIEWPORTS:
   p=browser.new_page(viewport={'width':w,'height':h},reduced_motion='reduce',has_touch=w<1000);p.set_default_timeout(7000);errs=[];p.on('pageerror',lambda e:errs.append(str(e)))
   try:
    f=mount(p);open_editor(f);capture(p,f,f'{w}-{h}-canvas');panel(f,'stages');capture(p,f,f'{w}-{h}-stages')
    for t in TABS:tab(f,t);capture(p,f,f'{w}-{h}-{t}')
    panel(f,'stages');ab(f,'stage','[data-index="20"]');c=ready(f);panel(f,'canvas')
    if w<=400 and h<650:c.locator('[data-studio-control=pause]').click()
    for v in VIEWS:view(c,v);p.wait_for_timeout(150);capture(p,f,f'{w}-{h}-sample-{v}')
    if f.locator('[data-studio=show-popup]').is_visible():f.locator('[data-studio=show-popup]').click()
    for phase in ['complete','exit']:sb(f,'scene',f'[data-phase="{phase}"]');c=ready(f);capture(p,f,f'{w}-{h}-{phase}')
    if w>=1000:view(c,'outline');capture(p,f,f'{w}-{h}-native-size')
    assert not errs,errs
   except Exception as e:RESULTS.append({'name':f'{w}-{h}-FAILED','error':str(e),'pageerrors':errs});traceback.print_exc();p.screenshot(path=str(OUT/f'{w}-{h}-failure.png'))
   finally:p.close()
  browser.close()
 (ROOT/'studio-matrix-results.json').write_text(json.dumps({'sha256':hashlib.sha256(APP.read_bytes()).hexdigest(),'screens':RESULTS},indent=2))
 if any('error'in r or r.get('clipped') or r.get('overflow',0)>1 or not r.get('drawersFit',True) or not r.get('normalSize',True) for r in RESULTS):raise SystemExit(1)
if __name__=='__main__':run()
