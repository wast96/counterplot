"""Exercise real Chromium Storage and reload without the memory test fixture."""
from studio import *
import tempfile
RESULTS=[]
def workflow(p):
 p.wait_for_selector('[data-tutorial=browse]')
 click(p,'quick-piece','M');writer=p.evaluate('CounterplotTutorial.snapshot()');open_editor(p);ab(p,'add-stage');tab(p,'copy');edit(p,'author-stage-title','Native persistence');saved(p)
 p.evaluate('CounterplotSession.commit()');original=p.evaluate('Object.fromEntries(CounterplotTutorialStore.keys().map(k=>[k,CounterplotTutorialStore.getItem(k)]))')
 sb(p,'play');ready(p);sb(p,'play');ready(p)
 after=p.evaluate('Object.fromEntries(CounterplotTutorialStore.keys().map(k=>[k,CounterplotTutorialStore.getItem(k)]))')
 assert after==original, 'Play must never write through to native parent storage'
 ab(p,'close');p.reload();open_editor(p);assert len(state(p)['draft']['lessons'])==23;assert state(p)['draft']['lessons'][-1]['title']=='Native persistence';ab(p,'close');assert p.evaluate('CounterplotTutorial.snapshot()')==writer
 # A full/denied localStorage bucket must no longer prevent tutorial saves.
 assert p.evaluate('CounterplotTutorialLibrary.storageStatus().mode')=='indexeddb'
 open_editor(p);tab(p,'copy');edit(p,'author-stage-title','Keep on quota');p.evaluate('Storage.prototype.setItem=function(){throw new DOMException("quota test","QuotaExceededError")}');ab(p,'save');p.wait_for_function('!CounterplotTutorialLibrary.studioState().dirty');expect(p.locator('#tutorial-author-error')).to_be_hidden();assert export(p,p,name='native-quota-backup.json')['lessons'][-1]['title']=='Keep on quota';p.reload();open_editor(p);assert state(p)['draft']['lessons'][-1]['title']=='Keep on quota'
with sync_playwright() as pw:
 b=launch(pw)
 for kind in ['file','intercepted-https']:
  ctx=b.new_context(accept_downloads=True,viewport={'width':1440,'height':1000},reduced_motion='reduce');p=ctx.new_page();p.set_default_timeout(8000);errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
  try:
   if kind=='file':p.goto(APP.as_uri(),timeout=10000)
   else:
    p.route('https://counterplot.test/**',lambda r:r.fulfill(status=200,content_type='text/html',body=APP.read_text()))
    p.goto('https://counterplot.test/workshop',timeout=10000)
   workflow(p);assert not errors,errors;RESULTS.append({'surface':kind,'result':'PASS'});print('PASS',kind,flush=True)
  except Exception as e:
   msg=str(e);blocked='Page.goto:' in msg and 'ERR_BLOCKED_BY_ADMINISTRATOR' in msg;RESULTS.append({'surface':kind,'result':'HOST_BLOCKED' if blocked else 'FAIL','error':msg,'pageerrors':errors});print(kind,msg[:700],flush=True)
  finally:ctx.close()
 b.close()
(ROOT/'native-storage-results.json').write_text(json.dumps({'sha256':hashlib.sha256(APP.read_bytes()).hexdigest(),'tests':RESULTS},indent=2))
if any(r['result']=='FAIL' for r in RESULTS):raise SystemExit(1)
