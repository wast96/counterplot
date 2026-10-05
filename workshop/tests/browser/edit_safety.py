"""Actual late-stage fan authoring and shelf deletion regressions; no replacement UI."""
from common import ROOT,mount,launch,APP
from studio import ready,state,panel,ab,sb,drag
from playwright.sync_api import sync_playwright,expect
import json,traceback,hashlib,os

def start(p):
 f=mount(p);f.evaluate('CounterplotTutorialLibrary.openEditor("mgs3",21,0)');return f,ready(f)
def project(c):return c.evaluate('(()=>{const w=CounterplotTutorial.snapshot();return w.projects.find(p=>p.id===w.active)})()')
def node(c,id):return next(n for n in project(c)['nodes'] if n['id']==id)
def write(c,id,name,text,blur=True):
 q=c.locator(f'[data-inline=node][data-id="{id}"][data-field="{name}"]').filter(visible=True).first;q.fill(text)
 if blur:q.press('Tab')
def history(f,a):f.locator(f'.studio-head [data-studio={a}]').click();return ready(f)
def shot(p,name):p.screenshot(path=str(ROOT/'screenshots'/f'{name}.png'))
def action(f,a,id=None):
 selector=f'[data-action="{a}"]'+(f'[data-id="{id}"]' if id else '')
 inside=f.locator('#dialog[open] '+selector).filter(visible=True)
 (inside if inside.count() else f.locator(selector).filter(visible=True)).first.click()
def shelf(f):action(f,'projects')
def form(f,name):return f.locator(f'#dialog form[data-form="{name}"]')
def newstory(f,title):
 shelf(f);action(f,'new-project');form(f,'project').locator('[name=title]').fill(title);form(f,'project').locator('[type=submit]').click()

def test_step22_undo_redo_does_not_wipe_story(p):
 f,c=start(p);n=project(c)['nodes'][0];id=n['id']
 for k,v in [('title','A fan’s Snake'),('opening','My revised opening'),('closing','My revised ending')]:write(c,id,k,v)
 c.locator('#tutorial-companion h2').fill('My final pass');c.locator('#tutorial-companion h2').press('Tab')
 c=history(f,'undo');assert node(c,id)['title']=='A fan’s Snake';assert node(c,id)['opening']=='My revised opening';assert node(c,id)['closing']=='My revised ending'
 c=history(f,'undo');assert node(c,id)['title']=='A fan’s Snake';assert node(c,id)['opening']=='My revised opening';assert node(c,id)['closing']==n['closing']
 c=history(f,'redo');assert node(c,id)['closing']=='My revised ending'
 before=state(f)['draft'];p.mouse.move(600,450);p.mouse.wheel(-700,50);p.wait_for_timeout(300);assert state(f)['draft']==before
 c.evaluate('document.body.dispatchEvent(new InputEvent("beforeinput",{inputType:"historyUndo",bubbles:true,cancelable:true}))');c=ready(f);assert node(c,id)['title']=='A fan’s Snake';assert node(c,id)['closing']==n['closing']
 c=history(f,'redo');assert node(c,id)['closing']=='My revised ending';shot(p,'step22-undo-safe')

def test_immediate_save_and_export_contains_visible_story(p):
 f,c=start(p);id=project(c)['nodes'][0]['id'];write(c,id,'title','Immediate save, no blur',False);ab(f,'save');assert not state(f)['dirty'];panel(f,'menu')
 with p.expect_download() as out:ab(f,'export')
 dest=ROOT/'fan-tutorial.json';out.value.save_as(str(dest));d=json.loads(dest.read_text());assert d['lessons'][21]['goals'][0]['storyEdits']['enter']
 ab(f,'close');f=mount(p,reload=True);f.locator('[data-tutorial=browse]').first.click();f.locator('[data-tutorial=edit]').first.click();c=ready(f)
 assert state(f)['index']==21;assert node(c,id)['title']=='Immediate save, no blur'

def test_pagehide_recovers_latest_unblurred_edit_and_cursor(p):
 f,c=start(p);id=project(c)['nodes'][0]['id'];write(c,id,'opening','Saved before navigation',False);f.evaluate('window.dispatchEvent(new Event("pagehide"))')
 r=json.loads(p.evaluate('fixtureStorage.getItem("counterplot.tutorial.draft.mgs3.v2")'));assert r['index']==21;assert r['changes']
 f=mount(p,reload=True);f.evaluate('CounterplotTutorialLibrary.openEditor("mgs3")');c=ready(f);assert state(f)['index']==21;assert node(c,id)['opening']=='Saved before navigation'

def test_saved_world_and_archive_are_in_tutorial_history(p):
 f,c=start(p);c.locator('[data-nav=world]').click();action(c,'new-world');form(c,'world').locator('[name=name]').fill('A fan’s Groznyj Grad');form(c,'world').locator('[type=submit]').click()
 assert any(w['name']=='A fan’s Groznyj Grad' for w in project(c)['world']);c=history(f,'undo');assert not any(w['name']=='A fan’s Groznyj Grad' for w in project(c)['world']);c=history(f,'redo');assert any(w['name']=='A fan’s Groznyj Grad' for w in project(c)['world'])
 c.locator('[data-nav=outline]').click();n=next(x for x in project(c)['nodes'] if x['type']=='B');c.locator(f'[data-action=archive-node][data-id="{n["id"]}"]').first.press('Enter');p.wait_for_timeout(200)
 assert not any(x['id']==n['id'] for x in project(c)['nodes']);assert any(any(x['id']==n['id'] for x in a.get('nodes',[])) for a in project(c)['archive'])
 c=history(f,'undo');assert any(x['id']==n['id'] for x in project(c)['nodes']);assert any(w['name']=='A fan’s Groznyj Grad' for w in project(c)['world'])

def test_unfinished_form_blocks_navigation_and_recovers(p):
 f,c=start(p);c.locator('[data-nav=world]').click();action(c,'new-world');form(c,'world').locator('[name=name]').fill('An unfinished world entry')
 sb(f,'panel','[data-panel=stages]');expect(f.locator('#tutorial-author-error')).to_contain_text('Save or cancel');expect(form(c,'world').locator('[name=name]')).to_have_value('An unfinished world entry')
 f.evaluate('window.dispatchEvent(new Event("pagehide"))');f=mount(p,reload=True);f.evaluate('CounterplotTutorialLibrary.openEditor("mgs3")');c=ready(f)
 expect(form(c,'world').locator('[name=name]')).to_have_value('An unfinished world entry');form(c,'world').locator('[type=submit]').click();p.wait_for_timeout(200);ab(f,'save');assert not state(f)['dirty'];assert any(w['name']=='An unfinished world entry' for w in project(c)['world'])

def test_real_nested_drop_and_rewording_survive_refresh(p):
 f,c=start(p);n=next(x for x in project(c)['nodes'] if x['type']=='B' and x['parentId']!='loyalty');id=n['id']
 source=c.locator(f'[data-drag=node][data-drag-id="{id}"]').first;source.scroll_into_view_if_needed();r=source.bounding_box();p.mouse.move(r['x']+r['width']/2,r['y']+r['height']/2);p.mouse.down();p.mouse.move(r['x']+40,r['y']+40,steps=8)
 # Scroll while holding the real piece; source and destination need not fit together.
 c.evaluate('scrollTo(0,0)');p.wait_for_timeout(200);target=c.locator('[data-drop=position][data-anchor=loyalty][data-where=inside]').first;target.scroll_into_view_if_needed();r=target.bounding_box();p.mouse.move(r['x']+r['width']/2,r['y']+r['height']/2,steps=16);p.wait_for_timeout(100);p.mouse.up();p.wait_for_timeout(300);assert node(c,id)['parentId']=='loyalty'
 write(c,id,'title','Moved by hand');c.locator('#tutorial-companion h2').fill('Don’t reset my blocks');c.locator('#tutorial-companion h2').press('Tab');c=history(f,'undo');assert node(c,id)['parentId']=='loyalty';assert node(c,id)['title']=='Moved by hand'
 ab(f,'save');panel(f,'stages');ab(f,'stage','[data-index="20"]');ready(f);panel(f,'stages');ab(f,'stage','[data-index="21"]');c=ready(f);assert node(c,id)['parentId']=='loyalty';assert node(c,id)['title']=='Moved by hand'

def test_authored_edits_play_but_play_does_not_change_definition(p):
 f,c=start(p);id=project(c)['nodes'][0]['id'];write(c,id,'closing','Authored ending');d=state(f)['draft'];sb(f,'play');c=ready(f);assert node(c,id)['closing']=='Authored ending'
 write(c,id,'title','Play-only change');c.locator('[data-studio-frame-return]').click();c=ready(f);assert state(f)['draft']==d;assert node(c,id)['title']!='Play-only change';assert node(c,id)['closing']=='Authored ending'

def test_export_visible_story_and_import_revision(p):
 f,c=start(p);id=project(c)['nodes'][0]['id'];write(c,id,'closing','Portable fan ending');panel(f,'menu')
 with p.expect_download() as out:sb(f,'export-scene')
 dest=ROOT/'visible-story.json';out.value.save_as(str(dest));data=json.loads(dest.read_text());assert data['projects'][0]['nodes'][0]['closing']=='Portable fan ending';data['projects'][0]['nodes'][0]['title']='Imported visible revision';dest.write_text(json.dumps(data))
 f.locator('#tutorial-hub input[type=file]').last.set_input_files(str(dest))
 # File.text() is async: the previous frame may still be ready until import applies.
 f.wait_for_function('JSON.stringify(CounterplotTutorialLibrary.studioState().draft).includes("Imported visible revision")');c=ready(f);assert node(c,id)['title']=='Imported visible revision';assert node(c,id)['closing']=='Portable fan ending';ab(f,'save')

def test_independent_tutorial_copy_preserves_original(p):
 f,c=start(p);id=project(c)['nodes'][0]['id'];write(c,id,'opening','My fan version');panel(f,'menu');sb(f,'copy-tutorial');c=ready(f);d=state(f)['draft'];assert d['id']!='mgs3';assert node(c,id)['opening']=='My fan version'
 original=f.evaluate('CounterplotTutorialLibrary.definition("mgs3")');assert 'storyEdits' not in original['lessons'][21]['goals'][0];assert f.evaluate('CounterplotTutorialLibrary.list().length')==2

def test_shelf_delete_inactive_restore_reload_and_export(p):
 f=mount(p);original=project(f);newstory(f,'Second shelf story');shelf(f);action(f,'trash-project',original['id']);action(f,'confirm-trash-project');data=f.evaluate('CounterplotTutorial.snapshot()');assert data['projects'][0]['title']=='Second shelf story';assert data['trash'][0]['project']==original
 action(f,'undo');assert any(x['id']==original['id'] for x in f.evaluate('CounterplotTutorial.snapshot().projects'));action(f,'redo');assert f.evaluate('CounterplotTutorial.snapshot().trash[0].project')==original
 f=mount(p,reload=True);shelf(f);action(f,'shelf-tab','trash');action(f,'restore-project',original['id']);data=f.evaluate('CounterplotTutorial.snapshot()');assert next(x for x in data['projects'] if x['id']==original['id'])==original
 with p.expect_download() as out:action(f,'export-project',original['id'])
 dest=ROOT/'one-story.json';out.value.save_as(str(dest));assert json.loads(dest.read_text())['projects']==[original];shot(p,'story-shelf')

def test_delete_last_story_then_new_and_restore(p):
 f=mount(p);original=project(f);shelf(f);action(f,'trash-project',original['id']);action(f,'confirm-trash-project');expect(f.locator('#shelf-rows')).to_contain_text('Your shelf is empty')
 action(f,'new-project');form(f,'project').locator('[name=title]').fill('Fresh after delete');form(f,'project').locator('[type=submit]').click();data=f.evaluate('CounterplotTutorial.snapshot()');assert len(data['projects'])==1;assert data['projects'][0]['title']=='Fresh after delete'
 shelf(f);action(f,'shelf-tab','trash');action(f,'restore-project',original['id']);assert len(f.evaluate('CounterplotTutorial.snapshot().projects'))==2

def test_delete_cancel_and_permanent_confirmation_scope(p):
 f=mount(p);w=f.evaluate('CounterplotTutorial.snapshot()');id=w['active'];shelf(f);action(f,'trash-project',id);action(f,'projects');assert f.evaluate('CounterplotTutorial.snapshot()')==w
 action(f,'trash-project',id);action(f,'confirm-trash-project');action(f,'shelf-tab','trash');action(f,'purge-project',id);action(f,'projects');assert f.evaluate('CounterplotTutorial.snapshot().trash.length')==1
 action(f,'purge-project',id);action(f,'confirm-purge-project');assert f.evaluate('CounterplotTutorial.snapshot().trash.length')==0;assert f.evaluate('CounterplotTutorial.status().undo')==0;assert f.evaluate('CounterplotTutorialLibrary.definition("mgs3").lessons.length')==22

def test_rename_and_duplicate_nonactive_story(p):
 f=mount(p);original=project(f);newstory(f,'Active elsewhere');active=f.evaluate('CounterplotTutorial.activeId()');shelf(f);action(f,'rename-project',original['id']);form(f,'project').locator('[name=title]').fill('Renamed inactive story');form(f,'project').locator('[type=submit]').click();assert f.evaluate('CounterplotTutorial.activeId()')==active
 shelf(f);action(f,'duplicate-project',original['id']);pr=project(f);assert pr['title']=='Renamed inactive story · working copy';assert pr['nodes']==original['nodes'];assert pr['id']!=original['id']

def test_practice_story_can_be_brought_into_tutorial(p):
 f=mount(p);f.locator('[data-tutorial=browse]').first.click();f.locator('[data-tutorial=enter]').first.click();f.locator('[data-action=quick-piece][data-id=B]').first.press('Enter');p.wait_for_timeout(200);n=project(f)['nodes'][-1];write(f,n['id'],'title','My saved practice beat')
 saved=project(f);f.evaluate('CounterplotTutorialLibrary.openEditor("mgs3",21,0)');ready(f);panel(f,'menu');sb(f,'use-practice');c=ready(f);assert any(n['title']=='My saved practice beat' for n in project(c)['nodes']);assert project(f)==saved;assert state(f)['dirty']

def test_shelf_and_normal_size_editor_layout(p):
 for width,height in [(1440,1000),(768,1024),(390,844),(320,568)]:
  p.set_viewport_size({'width':width,'height':height});f=mount(p);shelf(f);assert f.evaluate('document.documentElement.scrollWidth<=innerWidth+1');shot(p,f'shelf-{width}');action(f,'close-dialog');f.evaluate('CounterplotTutorialLibrary.openEditor("mgs3",21,0)');ready(f)
  assert f.locator('#studio-frame').evaluate('(e)=>getComputedStyle(e).transform')=='none';assert f.evaluate('document.documentElement.scrollWidth<=innerWidth+1');shot(p,f'editor-{width}');ab(f,'close')

def test_native_toast_undo_uses_the_same_tutorial_history(p):
 f,c=start(p);id=project(c)['nodes'][0]['id'];write(c,id,'title','Keep this before archive');n=next(x for x in project(c)['nodes'] if x['type']=='B');c.locator(f'[data-action=archive-node][data-id="{n["id"]}"]').first.press('Enter')
 expect(c.locator('#toast [data-action=undo]')).to_be_visible();c.locator('#toast [data-action=undo]').click();c=ready(f);assert any(x['id']==n['id'] for x in project(c)['nodes']);assert node(c,id)['title']=='Keep this before archive'
 c=history(f,'redo');assert not any(x['id']==n['id'] for x in project(c)['nodes']);assert node(c,id)['title']=='Keep this before archive';ab(f,'save')

def test_textfield_native_undo_does_not_undo_a_story_action(p):
 f,c=start(p);id=project(c)['nodes'][0]['id'];write(c,id,'title','Do not undo this story title')
 h=c.locator('#tutorial-companion h2');h.click();h.press('End');h.press_sequentially(' added words',delay=25);assert 'added words' in state(f)['draft']['lessons'][21]['title'];h.press('Control+z');p.wait_for_timeout(200)
 assert node(c,id)['title']=='Do not undo this story title';assert 'added words' not in state(f)['draft']['lessons'][21]['title'];assert state(f)['index']==21
 q=c.locator(f'[data-inline=node][data-id="{id}"][data-field=opening]').first;q.click();q.press('End');q.press_sequentially(' local addition',delay=25);q.press('Control+z');q.press('Tab');assert node(c,id)['title']=='Do not undo this story title'
 expect(c.locator('#save-status')).to_contain_text('tutorial draft');assert 'temporary' not in c.locator('#save-status').inner_text()

def test_undo_keeps_reading_position_and_current_story_view(p):
 f,c=start(p);id=project(c)['nodes'][-1]['id'];q=c.locator(f'[data-inline=node][data-id="{id}"][data-field=title]').first;q.scroll_into_view_if_needed();write(c,id,'title','Last thread with my wording');y=c.evaluate('scrollY');assert y>300
 c.locator('#tutorial-companion h2').fill('A popup change');c.locator('#tutorial-companion h2').press('Tab');c=history(f,'undo');p.wait_for_timeout(300);assert abs(c.evaluate('scrollY')-y)<35,(c.evaluate('scrollY'),y);assert node(c,id)['title']=='Last thread with my wording'
 c.locator('[data-nav=world]').click();action(c,'new-world');form(c,'world').locator('[name=name]').fill('View stays on World');form(c,'world').locator('[type=submit]').click();c.locator('#tutorial-companion h2').fill('Another popup edit');c.locator('#tutorial-companion h2').press('Tab');c=history(f,'undo');expect(c.locator('h1')).to_have_text('World');assert any(x['name']=='View stays on World' for x in project(c)['world'])

def test_native_sidebar_import_joins_tutorial_draft(p):
 f,c=start(p);id=project(c)['nodes'][0]['id'];data=c.evaluate('CounterplotTutorial.snapshot()');data['projects'][0]['nodes'][0]['closing']='Imported using the normal sidebar';path=ROOT/'sidebar-import.json';path.write_text(json.dumps(data))
 with p.expect_file_chooser() as chooser:action(c,'import')
 chooser.value.set_files(str(path));f.wait_for_function('JSON.stringify(CounterplotTutorialLibrary.studioState().draft).includes("Imported using the normal sidebar")');c=ready(f);assert node(c,id)['closing']=='Imported using the normal sidebar';assert state(f)['draft']['lessons'][21]['goals'][0]['storyEdits']['enter'];ab(f,'save');ab(f,'close');f=mount(p,reload=True);f.evaluate('CounterplotTutorialLibrary.openEditor("mgs3")');c=ready(f);assert node(c,id)['closing']=='Imported using the normal sidebar'

def test_permanent_archive_removal_persists_without_resurrection(p):
 f,c=start(p);n=next(x for x in project(c)['nodes'] if x['type']=='B');id=n['id'];c.locator(f'[data-action=archive-node][data-id="{id}"]').first.press('Enter');c.locator('[data-nav=archive]').first.click();entry=next(a for a in project(c)['archive'] if any(x['id']==id for x in a.get('nodes',[])));action(c,'purge-item',entry['id']);form(c,'purge').locator('[type=submit]').click()
 assert id in project(c)['tutorialRemoved'];assert state(f)['draft']['lessons'][21]['goals'][0]['storyEdits']['enter'];expect(f.locator('.studio-head [data-studio=undo]')).to_be_disabled()
 ab(f,'save');ab(f,'close');f=mount(p,reload=True);f.evaluate('CounterplotTutorialLibrary.openEditor("mgs3")');c=ready(f);assert id in project(c)['tutorialRemoved'];assert not any(x['id']==id for x in project(c)['nodes']);assert not any(any(x['id']==id for x in a.get('nodes',[])) for a in project(c)['archive'])

TESTS=[v for k,v in list(globals().items()) if k.startswith('test_')]
if __name__=='__main__':
 results=[];only=os.environ.get('QA_CASE','')
 with sync_playwright() as pw:
  b=launch(pw)
  for fn in TESTS:
   if only and only not in fn.__name__:continue
   ctx=b.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce',accept_downloads=True);p=ctx.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)));p.on('dialog',lambda d:d.accept('MGS3 · Fan cut') if d.type=='prompt' else d.accept())
   try:fn(p);assert not errors,errors;results.append({'name':fn.__name__,'pass':True});print('PASS',fn.__name__,flush=True)
   except Exception as e:
    results.append({'name':fn.__name__,'pass':False,'error':str(e),'page_errors':errors});print('FAIL',fn.__name__,traceback.format_exc(),flush=True)
    try:shot(p,fn.__name__+'-failure')
    except:pass
   finally:ctx.close()
  b.close()
 (ROOT/'edit-safety-results.json').write_text(json.dumps({'sha256':hashlib.sha256(APP.read_bytes()).hexdigest(),'results':results},indent=2));raise SystemExit(any(not r['pass'] for r in results))
