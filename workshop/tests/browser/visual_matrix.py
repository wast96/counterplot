from common import APP, ROOT, launch
from pathlib import Path
import re,json,traceback
from playwright.sync_api import sync_playwright,expect
from common import mount
from walkthrough import APP,ROOT,click,loc
HTML=APP.read_text();d=json.loads(re.search(r'id="tutorial-data">([\s\S]*?)</script>',HTML).group(1))['tutorials'][0]
RESULTS=[];out=ROOT/'screenshots'/'matrix';out.mkdir(exist_ok=True)
VIEWPORTS=[(1440,1000),(1280,800),(1024,768),(768,1024),(390,844),(320,740)]
# Inspect rendered layout only. Outer page overflow is always a defect;
# deliberate internal scrollers (timelines, sidebars, editor lists) are allowed.
def metrics(f):return f.evaluate('''() => {
 const vw=innerWidth,vh=innerHeight,guide=document.querySelector('#tutorial-companion'),gr=guide&&!guide.hidden?guide.getBoundingClientRect():null;
 const seen=[...document.querySelectorAll('button,input,select,textarea')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&getComputedStyle(e).visibility!=='hidden';});
 const clipped=seen.filter(e=>{const r=e.getBoundingClientRect();if(r.right<=vw+1&&r.left>=-1)return false;for(let a=e.parentElement;a&&a!==document.body;a=a.parentElement){const css=getComputedStyle(a);if(/auto|scroll|hidden|clip/.test(css.overflowX))return false;}return true;}).map(e=>({text:(e.getAttribute('aria-label')||e.textContent||e.name).slice(0,80),rect:{left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right}}));
 return {viewport:[vw,vh],overflow:document.documentElement.scrollWidth-vw,clipped,guide:gr?{x:gr.x,y:gr.y,right:gr.right,bottom:gr.bottom}:null};
}''')
def capture(p,f,name):
 p.screenshot(path=str(out/(name+'.png')));m=metrics(f);m['name']=name;RESULTS.append(m);print(name,'overflow',m['overflow'],'clipped',len(m['clipped']),flush=True)
with sync_playwright() as pw:
 b=launch(pw)
 for width,height in VIEWPORTS:
  for mode in ['main','tutorial']:
   p=b.new_page(viewport={'width':width,'height':height},reduced_motion='reduce');p.set_default_timeout(5000);errs=[];p.on('pageerror',lambda e:errs.append(str(e)))
   seed=json.loads(json.dumps(d['starter']));seed['projects']=[json.loads(json.dumps(d['sample']))];seed['active']=seed['projects'][0]['id'];seed['projects'][0]['tutorialId']='mgs3';seed['tutorialBuild']=mode=='tutorial';seed['saveKey']='qa.visual.'+mode
   text=re.sub(r'(<script type="application/json" id="embedded-workspace">)[\s\S]*?(</script>)',lambda m:m[1]+json.dumps(seed).replace('<','\\u003c')+m[2],HTML)
   try:
    # Tutorial boot intentionally uses its definition starter, not arbitrary embedded
    # workspace data. Supply the complete test-owned starter to both surfaces.
    fixture_definition=json.loads(json.dumps(d));fixture_definition['starter']=json.loads(json.dumps(seed))
    text=re.sub(r'(<script type="application/json" id="tutorial-data">)[\s\S]*?(</script>)',lambda m:m[1]+json.dumps({'tutorials':[fixture_definition]}).replace('<','\\u003c')+m[2],text,count=1)
    f=mount(p,text);p.wait_for_timeout(300)
    assert f.locator('[data-node]').count()>20,'Populated fixture failed to load'

    for view in ['outline','write','characters','changes','world','connections','archive']:
     if view=='write':click(f,'mode','write')
     elif view=='changes':
      # Timeline tab next to the Blocks tab.
      options=f.locator('[data-action="character-tab"]').filter(visible=True)
      if options.count():
       choices=options.evaluate_all('(es)=>es.map(e=>e.dataset.id)')
       if 'arc' in choices:click(f,'character-tab','arc')
     else:f.locator('[data-nav="'+view+'"]').click()
     p.wait_for_timeout(90);capture(p,f,f'{width}-{height}-{mode}-{view}')
    f.locator('[data-tutorial="browse"]').filter(visible=True).first.click();capture(p,f,f'{width}-{height}-{mode}-selector')
    assert not errs,errs
   except Exception as e:
    RESULTS.append({'name':f'{width}-{height}-{mode}-failure','error':str(e),'pageerrors':errs});traceback.print_exc();p.screenshot(path=str(out/f'{width}-{height}-{mode}-failure.png'))
   finally:p.close()
 b.close()
(ROOT/'writer-matrix-results.json').write_text(json.dumps(RESULTS,indent=2))
print('SCREENS',len(RESULTS),'OVERFLOW',sum(x.get('overflow',0)>1 for x in RESULTS),'ERRORS',sum('error'in x for x in RESULTS))

import sys
if any(x.get("overflow",0)>1 or x.get("clipped") or "error" in x for x in RESULTS):sys.exit(1)
