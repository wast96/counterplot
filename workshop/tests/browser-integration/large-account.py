from pathlib import Path
import subprocess
subprocess.run(["node",str(Path(__file__).resolve().parents[1]/"create-large-fixture.cjs")],check=True)
from playwright.sync_api import sync_playwright
import time,uuid,json
BASE='https://127.0.0.1:8788'
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);c=b.new_context(ignore_https_errors=True);r=c.request.post(BASE+'/api/auth/register',data={'email':'large-'+str(uuid.uuid4())+'@example.test','password':'synthetic test password'},headers={'Origin':BASE});assert r.ok
 p=c.new_page();p.set_default_timeout(90000);errors=[];p.on('pageerror',lambda e:errors.append(str(e)));p.goto(BASE);p.wait_for_function('() => window.counterplotSync?.status().ready');p.wait_for_function('() => !counterplotSync.status().busy');p.locator('#import-file').set_input_files('/tmp/counterplot-near-capacity-old.json');p.locator('[data-action="accept-import"]').click();p.wait_for_selector('#dialog[open]',state='hidden');started=time.monotonic();p.evaluate('counterplotSync.flush()');p.wait_for_function('() => !counterplotSync.status().busy && !counterplotSync.status().dirty',timeout=120000);elapsed=time.monotonic()-started;assert not p.evaluate('counterplotSync.status().error');p.reload();p.wait_for_function('() => window.counterplotSync?.status().ready');size=p.evaluate('() => CounterplotTutorial.snapshot().projects.flatMap(p=>p.nodes).reduce((n,x)=>n+x.prose.length,0)');assert size>29_000_000,size;assert not errors,errors;print(json.dumps({'passed':True,'chunkedSaveSeconds':round(elapsed,2),'reloadedProseCharacters':size}));b.close()
