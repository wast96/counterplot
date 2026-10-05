from playwright.sync_api import sync_playwright
from pathlib import Path
import json,uuid
BASE='https://127.0.0.1:8788'
FIXTURE=json.loads((Path(__file__).resolve().parents[3]/'browser-tests/fixtures/rich-v2-workspace.json').read_text())
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 c=b.new_context(ignore_https_errors=True,viewport={'width':1440,'height':1000});email='integration-'+str(uuid.uuid4())+'@example.test';password='synthetic test password only'
 r=c.request.post(BASE+'/api/auth/register',data={'email':email,'password':password},headers={'Origin':BASE});assert r.ok,r.text();owner=r.json()['user']
 r=c.request.put(BASE+'/api/workspace',data={'workspace':FIXTURE,'revision':0,'writeId':'oldfixture'},headers={'Origin':BASE,'X-Counterplot-Owner':owner,'X-Counterplot-Writer':'4'});assert r.ok,r.text()
 p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)));p.goto(BASE);p.wait_for_function('() => window.counterplotSync?.status().ready');p.wait_for_function('() => counterplotSync.status().revision>=2',timeout=20000)
 p.locator('[data-action="story-view"][data-id="read"]').click();assert 'First paragraph.' in p.locator('main').inner_text()
 r=c.request.put(BASE+'/api/workspace',data={'workspace':FIXTURE,'revision':2,'writeId':'stale'},headers={'Origin':BASE,'X-Counterplot-Owner':owner,'X-Counterplot-Writer':'4'});assert r.status==426
 c2=b.new_context(ignore_https_errors=True);r=c2.request.post(BASE+'/api/auth/login',data={'email':email,'password':password},headers={'Origin':BASE});assert r.ok,r.text();p2=c2.new_page();p2.on('pageerror',lambda e:errors.append(str(e)));p2.goto(BASE);p2.wait_for_function('() => window.counterplotSync?.status().ready')
 # Original prose is visible on both devices, with native IndexedDB recovery.
 for page in [p,p2]:
  page.locator('[data-action="story-view"][data-id="read"]').click();page.locator('.continuous-manuscript [data-action="write-node"]').first.click();page.wait_for_selector('textarea[data-field="prose"]')
 c.route('**/api/workspace*',lambda route:route.abort('internetdisconnected'))
 p.locator('textarea[data-field="prose"]').fill('Offline local ending.');p.locator('textarea[data-field="prose"]').blur();p.wait_for_timeout(600)
 p2.locator('textarea[data-field="prose"]').fill('Other device ending.');p2.locator('textarea[data-field="prose"]').blur();p2.evaluate('counterplotSync.flush()');p2.wait_for_function('() => !counterplotSync.status().busy && !counterplotSync.status().error')
 c.unroute('**/api/workspace*');p.evaluate('counterplotSync.flush()');p.wait_for_timeout(1800);p.evaluate('counterplotSync.flush()')
 result=p.evaluate('CounterplotTutorial.snapshot().projects.map(p=>p.nodes.map(n=>n.prose))');flat=[text for project in result for text in project];assert 'Offline local ending.' in flat and 'Other device ending.' in flat,flat
 p.reload();p.wait_for_function('() => window.counterplotSync?.status().ready');result=p.evaluate('CounterplotTutorial.snapshot().projects.map(p=>p.nodes.map(n=>n.prose))');flat=[text for project in result for text in project];assert 'Offline local ending.' in flat and 'Other device ending.' in flat,flat
 # Tutorial progress follows the owner; removing it on one device stays removed.
 key='counterplot.tutorial.cursor.mgs3.v1'
 p.evaluate("async key=>{await CounterplotTutorialStore.setItem(key,JSON.stringify({stage:'build-c',goal:'mgs3-welcome'}));await counterplotSync.flush();}",key)
 p2.evaluate('counterplotSync.flush()');p2.wait_for_function("key=>!!CounterplotTutorialStore.getItem(key)",arg=key)
 p.evaluate("async key=>{await CounterplotTutorialStore.transaction([key],()=>({[key]:null}));await counterplotSync.flush();}",key)
 p2.evaluate('counterplotSync.flush()');p2.wait_for_function("key=>!CounterplotTutorialStore.getItem(key)",arg=key)
 # Simulate a cookie changing in another tab. A stale owner cannot save to account B.
 r=c.request.post(BASE+'/api/auth/logout',headers={'Origin':BASE});assert r.ok,r.text()
 r=c.request.post(BASE+'/api/auth/register',data={'email':'other-'+str(uuid.uuid4())+'@example.test','password':password},headers={'Origin':BASE});assert r.ok,r.text();other_owner=r.json()['user'];assert other_owner!=owner
 p.evaluate('counterplotSync.flush()');p.wait_for_function('() => counterplotSync.status().locked || !!counterplotSync.status().error')
 other=c.new_page();other.goto(BASE);other.wait_for_function('() => window.counterplotSync?.status().ready');assert other.evaluate('counterplotSync.status().owner')==other_owner
 titles=other.evaluate('CounterplotTutorial.snapshot().projects.map(p=>p.title)');assert 'The Harbor Archive' not in titles,titles
 assert not other.evaluate("key=>!!CounterplotTutorialStore.getItem(key)",key)
 # Existing account recovery credentials reset sessions without touching writing.
 r=c2.request.post(BASE+'/api/auth/recovery',data={'password':password},headers={'Origin':BASE});assert r.ok,r.text();code=r.json()['codes'][0]
 r=c2.request.post(BASE+'/api/auth/reset',data={'email':email,'code':code,'password':'replacement synthetic password'},headers={'Origin':BASE});assert r.ok,r.text()
 assert c2.request.get(BASE+'/api/auth/session').status==401
 r=c2.request.post(BASE+'/api/auth/reset',data={'email':email,'code':code,'password':'another synthetic password'},headers={'Origin':BASE});assert not r.ok
 r=c2.request.post(BASE+'/api/auth/login',data={'email':email,'password':'replacement synthetic password'},headers={'Origin':BASE});assert r.ok,r.text()
 r=c2.request.get(BASE+'/api/workspace',headers={'X-Counterplot-Writer':'5','X-Counterplot-Owner':owner});assert r.ok,r.text();flat=[n['prose'] for project in r.json()['workspace']['projects'] for n in project['nodes']];assert 'Offline local ending.' in flat and 'Other device ending.' in flat
 assert not errors,errors
 print('PASS real Pages/D1: existing account conversion, old writer rejection, cross-device sync, offline conflict preserving both prose versions, native reload, tutorial record deletion, account isolation, one-use password recovery without writing loss')
 b.close()
