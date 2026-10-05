"""Upgrade the exact old delivered HTML with visible edits; no personal save used."""
from edit_safety import *
from regressions import export_def, download
from walkthrough import do_goal
import gzip
from pathlib import Path
HERE=Path(__file__).resolve().parents[2]
OLD=HERE/'tests/fixtures/inplace-before-edit-safety.html.gz'
HELPER=(HERE/'recovery/Back up current Counterplot tab.js').read_text()

def import_tutorial(p,f,path):
 f.locator('[data-tutorial=browse]').filter(visible=True).first.click();f.locator('[data-tutorial=import-tutorial]').click();f.locator('#tutorial-definition-file').set_input_files(str(path));return ready(f)

def test_exact_old_editor_recovery_to_new_portable_tutorial(p):
 old=gzip.decompress(OLD.read_bytes()).decode();assert hashlib.sha256(old.encode()).hexdigest()=='53e965166aea7a054061acd30c067068397a6c4aa11c5d4d17cef2e179b587f3'
 f=mount(p,old);f.evaluate('CounterplotTutorialLibrary.openEditor("mgs3",21,0)');c=ready(f);id=project(c)['nodes'][0]['id'];original=f.evaluate('CounterplotTutorialLibrary.definition("mgs3")')
 write(c,id,'title','A human’s final Snake');write(c,id,'closing','A human’s final words');c.locator('#tutorial-companion h2').fill('My own final reflection');c.locator('#tutorial-companion h2').press('Tab')
 assert state(f)['draft']['sample']['nodes'][0]['title']!='A human’s final Snake' # exact old omission
 with p.expect_download() as out:f.evaluate(HELPER)
 path=ROOT/'old-visible-recovery.json';out.value.save_as(str(path));bundle=json.loads(path.read_text());assert bundle['scene']['projects'][0]['nodes'][0]['title']=='A human’s final Snake';assert bundle['definition']['lessons'][21]['title']=='My own final reflection'
 # Independently demonstrate the old Undo loss after the safe capture.
 c=history(f,'undo');assert node(c,id)['title']!='A human’s final Snake'
 f=mount(p);new_original=f.evaluate('CounterplotTutorialLibrary.definition("mgs3")');c=import_tutorial(p,f,path);assert node(c,id)['title']=='A human’s final Snake';assert node(c,id)['closing']=='A human’s final words';assert state(f)['draft']['lessons'][21]['title']=='My own final reflection';assert state(f)['index']==21
 assert f.evaluate('CounterplotTutorialLibrary.definition("mgs3")')==new_original
 ab(f,'save');d=export_def(p,f,'recovered-standard-definition.json');ab(f,'close')
 f=mount(p);c=import_tutorial(p,f,ROOT/'recovered-standard-definition.json');panel(f,'stages');ab(f,'stage','[data-index="21"]');c=ready(f);assert node(c,id)['closing']=='A human’s final words'
 panel(f,'menu');portable=download(p,lambda:ab(f,'export-playable'),'Recovered-fan-tutorial.html')
 f=mount(p,portable.read_text());assert f.evaluate('CounterplotSession.definition().id')==d['id']
 # Play the imported/exported fan cut through its real forty actions from empty.
 for li,l in enumerate(d['lessons']):
  for gi,g in enumerate(l['goals']):
   if li or gi:f.locator('[data-guide=next]').click()
   do_goal(f,li,gi,g);print(f'FAN WALK {li+1}.{gi+1} PASS',flush=True)
 assert node(f,id)['title']=='A human’s final Snake';assert node(f,id)['closing']=='A human’s final words'
 # Ordinary practice Undo after the complete lesson must affect ONE authored field.
 action(f,'close-dialog');write(f,id,'title','Practice-only title');write(f,id,'opening','Practice-only opening');write(f,id,'closing','Practice-only closing')
 action(f,'undo');assert node(f,id)['title']=='Practice-only title';assert node(f,id)['opening']=='Practice-only opening';assert node(f,id)['closing']=='A human’s final words'
 action(f,'redo');assert node(f,id)['closing']=='Practice-only closing';shot(p,'recovered-fan-full-walk')

def test_deleted_stories_roundtrip_and_active_practice_delete(p):
 f=mount(p);first=project(f);newstory(f,'Second');shelf(f);action(f,'trash-project',first['id']);action(f,'confirm-trash-project');action(f,'close-dialog');action(f,'export')
 with p.expect_download() as out:action(f,'export-json')
 path=ROOT/'shelf-with-trash.json';out.value.save_as(str(path));backup=json.loads(path.read_text());assert backup['trash'][0]['project']==first
 f=mount(p);shelf(f);action(f,'import');f.locator('#import-file').set_input_files(str(path));action(f,'accept-import');data=f.evaluate('CounterplotTutorial.snapshot()');assert len(data['trash'])==1;restored=next(x for x in data['trash'] if x['project']['title']==first['title']);assert restored['project']['nodes']==first['nodes'];shelf(f);action(f,'shelf-tab','trash');action(f,'restore-project',restored['project']['id']);assert len(f.evaluate('CounterplotTutorial.snapshot().projects'))==3
 action(f,'close-dialog');f.locator('[data-tutorial=browse]').first.click();f.locator('[data-tutorial=enter]').first.click();pr=project(f);shelf(f);action(f,'trash-project',pr['id']);action(f,'confirm-trash-project');assert f.locator('#shelf-rows').inner_text().find('empty')>=0
 action(f,'shelf-tab','trash');action(f,'restore-project',pr['id']);assert f.evaluate('CounterplotSession.isPractice()');assert project(f)==pr

def test_recovery_conflict_keeps_both_copies_exportable(p):
 f,c=start(p);id=project(c)['nodes'][0]['id'];write(c,id,'title','First local draft');key='counterplot.tutorial.draft.mgs3.v2';foreign=json.loads(p.evaluate('(k)=>fixtureStorage.getItem(k)',key));foreign['otherWindow']='newer';encoded=json.dumps(foreign)
 p.evaluate('([k,v])=>fixtureStorage.setItem(k,v)',[key,encoded]);write(c,id,'closing','Still visible in this window');f.evaluate('window.dispatchEvent(new Event("pagehide"))');assert p.evaluate('(k)=>fixtureStorage.getItem(k)',key)==encoded
 expect(f.locator('#tutorial-author-error')).to_contain_text('Another window');panel(f,'menu');d=export_def(p,f,'conflicted-local-export.json');assert d['lessons'][21]['goals'][0]['storyEdits']['enter'];assert node(c,id)['closing']=='Still visible in this window'

def test_play_story_html_export_leaves_its_temporary_sandbox(p):
 f,c=start(p);sb(f,'play');c=ready(f);id=project(c)['nodes'][0]['id'];write(c,id,'title','My playable story copy');expected=project(c);action(c,'export')
 with p.expect_download() as out:action(c,'export-html')
 path=ROOT/'story-exported-from-play.html';out.value.save_as(str(path));f=mount(p,path.read_text());assert not f.evaluate('!!window.__COUNTERPLOT_STUDIO__');assert not f.locator('[data-studio-bootstrap],[data-studio-frame-style],#studio-frame-style').count();assert project(f)==expected
 assert not f.locator('#tutorial-companion').is_visible();write(f,id,'opening','Saved in the independent copy');f=mount(p,path.read_text(),reload=True);assert node(f,id)['opening']=='Saved in the independent copy'

def test_old_play_can_be_backed_up_before_returning_to_edit(p):
 old=gzip.decompress(OLD.read_bytes()).decode();f=mount(p,old);f.evaluate('CounterplotTutorialLibrary.openEditor("mgs3",21,0)');ready(f);sb(f,'play');c=ready(f);id=project(c)['nodes'][0]['id'];write(c,id,'closing','Work still visible in old Play')
 with p.expect_download() as out:f.evaluate(HELPER)
 path=ROOT/'old-play-visible-story.json';out.value.save_as(str(path));data=json.loads(path.read_text());assert data['format']=='counterplot-workshop';assert data['projects'][0]['nodes'][0]['closing']=='Work still visible in old Play';assert state(f)['playing'];assert node(c,id)['closing']=='Work still visible in old Play'
 f,c=start(p);panel(f,'menu');f.locator('#tutorial-hub input[type=file]').last.set_input_files(str(path));c=ready(f);assert node(c,id)['closing']=='Work still visible in old Play';ab(f,'save');assert not state(f)['dirty']

TESTS=[test_old_play_can_be_backed_up_before_returning_to_edit,test_exact_old_editor_recovery_to_new_portable_tutorial,test_deleted_stories_roundtrip_and_active_practice_delete,test_recovery_conflict_keeps_both_copies_exportable,test_play_story_html_export_leaves_its_temporary_sandbox]
if __name__=='__main__':
 results=[]
 with sync_playwright() as pw:
  b=launch(pw)
  for fn in TESTS:
   ctx=b.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce',accept_downloads=True);p=ctx.new_page();p.set_default_timeout(8000);errors=[];p.on('pageerror',lambda e:errors.append(str(e)));p.on('dialog',lambda d:d.accept())
   try:fn(p);assert not errors,errors;results.append({'name':fn.__name__,'pass':True});print('PASS',fn.__name__,flush=True)
   except Exception as e:
    results.append({'name':fn.__name__,'pass':False,'error':str(e),'pageerrors':errors});print('FAIL',fn.__name__,traceback.format_exc(),flush=True)
    try:shot(p,fn.__name__+'-failure')
    except:pass
   finally:ctx.close()
  b.close()
 (ROOT/'upgrade-safety-results.json').write_text(json.dumps({'old_sha256':hashlib.sha256(gzip.decompress(OLD.read_bytes())).hexdigest(),'new_sha256':hashlib.sha256(APP.read_bytes()).hexdigest(),'results':results},indent=2));raise SystemExit(any(not r['pass'] for r in results))
