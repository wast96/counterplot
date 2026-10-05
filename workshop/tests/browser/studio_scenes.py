"""Prepare every authored MGS3 boundary in the real workshop iframe."""
from studio import *
results=[]
with sync_playwright() as pw:
 b=launch(pw);p=b.new_page(viewport={'width':1600,'height':1000},reduced_motion='reduce');p.set_default_timeout(9000);errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
 try:
  f=mount(p);open_editor(f);d=state(f)['draft']
  for li,l in enumerate(d['lessons']):
   ab(f,'stage',f'[data-index="{li}"]');ready(f)
   for gi,g in enumerate(l['goals']):
    ab(f,'step',f'[data-index="{gi}"]');ready(f)
    for phase in ['enter','complete','exit']:
     sb(f,'scene',f'[data-phase="{phase}"]');c=ready(f);note=f.locator('.studio-canvas-message').inner_text();status=c.evaluate('CounterplotTutorial.status()');r=c.locator('#tutorial-companion').bounding_box()
     error=None
     if note:error=note
     elif not r:error='Guide is not visible'
     if errors:error='; '.join(errors)
     results.append({'stage':li+1,'action':gi+1,'phase':phase,'result':'FAIL' if error else 'PASS','error':error,'view':status['page']});print(f'{li+1}.{gi+1} {phase}: '+(error or 'PASS'),flush=True)
     if error:p.screenshot(path=str(ROOT/'screenshots'/f'scene-{li+1}-{gi+1}-{phase}-failure.png'))
 except Exception as e:results.append({'result':'FAIL','error':str(e)});traceback.print_exc()
 finally:p.close();b.close()
(ROOT/'studio-scene-results.json').write_text(json.dumps({'sha256':hashlib.sha256(APP.read_bytes()).hexdigest(),'scenes':results},indent=2))
if any(r['result']=='FAIL'for r in results):raise SystemExit(1)
