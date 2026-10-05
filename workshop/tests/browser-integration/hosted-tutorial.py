from playwright.sync_api import sync_playwright
BASE='https://127.0.0.1:8788'
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 c=b.new_context(ignore_https_errors=True,viewport={'width':1440,'height':1000});p=c.new_page();errors=[];violations=[]
 p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:violations.append(m.text) if 'Content Security Policy' in m.text else None)
 p.goto(BASE);p.locator('[data-tutorial="browse"]').first.click();p.locator('[data-tutorial="edit"]').first.click()
 p.wait_for_function('() => window.CounterplotTutorialLibrary?.studioState()?.ready===true',timeout=20000)
 f=p.frame(name='studio-frame');assert f
 assert f.evaluate('() => !!window.__COUNTERPLOT_STUDIO__')
 assert f.evaluate('() => CounterplotTutorialLibrary.storageStatus().mode')=='temporary'
 p.locator('[data-studio="play"]').first.click();p.wait_for_function('() => CounterplotTutorialLibrary.studioState()?.playing && CounterplotTutorialLibrary.studioState()?.ready')
 assert not errors,errors;assert not violations,violations
 print('PASS hosted CSP: tutorial author frame starts, isolated temporary storage, Play opens without unsafe inline scripts')
 b.close()
