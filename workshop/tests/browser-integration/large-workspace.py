from pathlib import Path
import subprocess
subprocess.run(["node",str(Path(__file__).resolve().parents[1]/"create-large-fixture.cjs")],check=True)
from playwright.sync_api import sync_playwright
from pathlib import Path
import json,time
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 p=b.new_page(viewport={'width':1440,'height':1000});p.set_default_timeout(60000);errors=[];p.on('pageerror',lambda e:errors.append(str(e)));p.goto('http://127.0.0.1:8765/workshop/Counterplot%20Workshop.html');p.wait_for_selector('[data-action="story-view"]')
 start=time.monotonic();p.locator('#import-file').set_input_files('/tmp/counterplot-near-capacity-old.json');p.wait_for_selector('[data-action="accept-import"]');review=time.monotonic()-start;p.locator('[data-action="accept-import"]').click();p.wait_for_selector('#dialog[open]',state='hidden');imported=time.monotonic()-start
 sizes=p.evaluate('() => {const data=CounterplotTutorial.snapshot(),pr=data.projects.find(p=>p.id===data.active);return {bytes:new TextEncoder().encode(JSON.stringify(data)).length,scenes:pr.nodes.length,prose:pr.nodes.reduce((n,x)=>n+x.prose.length,0)};}')
 p.locator('[data-action="story-view"][data-id="write"]').click();p.locator('textarea[data-field="prose"]').fill('Near capacity edit retained.');p.locator('textarea[data-field="prose"]').blur();p.wait_for_function('() => document.querySelector("#save-status")?.textContent.includes("Saved on this device")');start=time.monotonic();p.reload();p.wait_for_selector('[data-action="story-view"]');reloaded=time.monotonic()-start
 assert p.evaluate('() => CounterplotTutorial.snapshot().projects.flatMap(p=>p.nodes).some(n=>n.prose==="Near capacity edit retained.")');assert not errors,errors
 print(json.dumps({'passed':True,'sourceBytes':Path('/tmp/counterplot-near-capacity-old.json').stat().st_size,'importReviewSeconds':round(review,2),'totalImportSeconds':round(imported,2),'reloadSeconds':round(reloaded,2),**sizes}))
 b.close()
