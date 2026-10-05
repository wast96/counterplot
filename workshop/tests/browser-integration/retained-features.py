from playwright.sync_api import sync_playwright
from pathlib import Path
BASE='http://127.0.0.1:8765/workshop/Counterplot%20Workshop.html'
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 p=b.new_page(viewport={'width':1440,'height':1000});p.set_default_timeout(8000);errors=[];p.on('pageerror',lambda e:errors.append(str(e)));p.goto(BASE);p.wait_for_selector('[data-action="story-view"]')
 p.locator('#import-file').set_input_files(str(Path(__file__).resolve().parents[3]/'browser-tests/fixtures/rich-v2-workspace.json'));p.locator('[data-action="accept-import"]').click();p.wait_for_selector('#dialog[open]',state='hidden')
 def do(action,extra=''):
  p.locator('[data-action="'+action+'"]'+extra).filter(visible=True).first.click()
 def save():
  p.locator('#dialog button[type=submit]').click();p.wait_for_selector('#dialog[open]',state='hidden')
 def snapshot():return p.evaluate('() => CounterplotTutorial.snapshot().projects.find(p=>p.id===CounterplotTutorial.snapshot().active)')
 # Advanced scene fields remain editable; parent and thread structure remain separate.
 do('scene-details');p.locator('summary').filter(has_text='Scene craft').click();p.locator('[name="goal"]').fill('Keep the editable goal');save();assert snapshot()['nodes'][0]['goal']=='Keep the editable goal'
 # New earlier opening preserves prior chronological character state.
 p.locator('[data-nav="characters"]').click();do('edit-character');p.locator('summary').filter(has_text='Story presence').click();do('earlier-self');p.locator('[name="preservedLabel"]').fill('Arrival preserved');p.locator('[name="seed"]').select_option('blank');save();s=snapshot();assert s['characters'][0]['blocks']==[];assert s['characters'][0]['stateCheckpoints']
 # Faction split has temporal membership changes, not opening-state mutation.
 p.locator('[data-nav="world"]').click();groups=[w for w in snapshot()['world'] if w['type']=='group'];do('edit-world','[data-id="'+groups[0]['id']+'"]');p.locator('summary').filter(has_text='Knowledge & history').click();do('faction');do('transfer-members');p.locator('[name="names"]').fill('The new choir');save();assert any(w['name']=='The new choir' for w in snapshot()['world'])
 # Outline text parser shows a preview and adds typed nested pieces.
 p.locator('[data-nav="outline"]').click();do('outline-text');p.locator('[name="outline"]').fill('<I> Where is the song?\nA clue\n</I> In the harbor');p.locator('#dialog button[type=submit]').click();do('accept-outline');assert any(n['opening']=='Where is the song?' and n['type']=='I' for n in snapshot()['nodes'])
 # Full backup is validated on reimport, including changes and archive.
 do('export');
 with p.expect_download() as download:do('export-json')
 target=Path('/tmp/counterplot-feature-roundtrip.json');download.value.save_as(str(target));do('close-dialog');p.locator('#import-file').set_input_files(str(target));do('accept-import');p.wait_for_selector('#dialog[open]',state='hidden');assert any(w['name']=='The new choir' for w in snapshot()['world'])
 assert not errors,errors
 print('PASS retained UI: scene craft, earlier self, faction split, old tagged outline, full backup round trip')
 b.close()
