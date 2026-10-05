"""Workspace quota recovery, independent editing and editable popup sections.
Actual Counterplot HTML/controls; disposable local/IndexedDB interface fixtures.
Native persistence limits are explicitly not established by these tests.
"""
from storage_quota import mount,stored,flush,saved,builtin,start,DEF,DRAFT
from studio import ready,state,ab,sb,panel,tab,edit,drag,export
from edit_safety import project,node,write,history
from common import APP,ROOT,launch
from walkthrough import click,form
from playwright.sync_api import sync_playwright,expect
import json,os,traceback,hashlib,re
MAIN='counterplot.workshop.v1';PRACTICE='counterplot.tutorial.build.v2'
def scene():
 d=builtin();w=json.loads(json.dumps(d['starter']));pr=json.loads(json.dumps(d['sample']));pr['tutorialId']='mgs3';w['projects']=[pr];w['active']=pr['id'];return w

def await_save(f):
 assert f.evaluate('CounterplotSession.commit()');expect(f.locator('#save-alert')).to_be_hidden()
def enter(f):
 f.locator('[data-tutorial=browse]').first.click();f.locator('[data-tutorial=enter]').first.click();expect(f.locator('#guide-select')).to_have_value('0')
def import_story(f,w):
 click(f,'import');f.locator('#import-file').set_input_files({'name':'My fan outline.json','mimeType':'application/json','buffer':json.dumps(w).encode()});click(f,'accept-import')
def snapshot(f):return f.evaluate('CounterplotTutorial.snapshot()')
def shot(p,name):p.screenshot(path=str(ROOT/'screenshots'/f'{name}.png'))
def sections(f):return f.evaluate('''()=>{const s=CounterplotTutorialLibrary.studioState(),d=s.draft;return TutorialDefinition.presentation(d,d.lessons[s.index],d.lessons[s.index].goals[s.step]).sections}''')
def selected(f):return f.locator('.studio-section-row.selected').get_attribute('data-id')
def sf(f,field,value):
 q=f.locator(f'[data-section-field="{field}"]')
 if isinstance(value,bool):q.set_checked(value)
 else:q.fill(value);q.press('Tab')
 f.page.wait_for_timeout(120)

def test_workspace_import_saves_and_reopens_with_full_local_store(p):
 f=mount(p);await_save(f);previous=snapshot(f);p.evaluate('fixtureStorage.quota=0');w=scene();w['projects'][0]['nodes'][0]['title']='MY independent MGS3 outline';import_story(f,w);await_save(f)
 pr=project(f);assert pr['title']==w['projects'][0]['title'];assert all(not k.startswith('tutorial') for k in pr);assert not f.evaluate('CounterplotSession.isPractice()');expect(f.locator('#tutorial-companion')).to_be_hidden();assert len(snapshot(f)['projects'])==len(previous['projects'])+1
 id=pr['nodes'][0]['id'];write(f,id,'closing','Ordinary writing, without any tutorial');await_save(f);old_ids=[x['id'] for x in previous['projects']]
 f=mount(p,reload=True);assert node(f,id)['closing']=='Ordinary writing, without any tutorial';assert all(x in [a['id'] for a in snapshot(f)['projects']] for x in old_ids);expect(f.locator('#save-alert')).to_be_hidden();shot(p,'normal-work-under-full-local-storage')

def test_workspace_failure_backup_previous_retry_and_navigation_guard(p):
 f=mount(p);import_story(f,scene());await_save(f);id=project(f)['nodes'][0]['id'];before=stored(f,MAIN);p.evaluate('fixtureIDB.quotaChars=0');write(f,id,'title','Latest unsaved fan wording');f.wait_for_function('CounterplotSession.saveStatus().error!==null');expect(f.locator('#save-alert')).to_be_visible();assert stored(f,MAIN)==before
 with p.expect_download() as dl:f.locator('#save-alert [data-action=export-json]').click()
 dest=ROOT/'latest-workspace-backup.json';dl.value.save_as(str(dest));assert 'Latest unsaved fan wording' in dest.read_text()
 with p.expect_download() as dl:f.locator('#save-alert [data-action=export-raw]').click()
 dest=ROOT/'previous-workspace-backup.json';dl.value.save_as(str(dest));assert json.loads(dest.read_text())==json.loads(before)
 assert not f.evaluate('CounterplotSession.switchTo("mgs3")');assert node(f,id)['title']=='Latest unsaved fan wording';shot(p,'workspace-retry-warning')
 p.evaluate('fixtureIDB.quotaChars=Infinity');f.locator('#save-alert [data-action=retry-save]').click();f.wait_for_function('!CounterplotSession.saveStatus().dirty');expect(f.locator('#save-alert')).to_be_hidden();f=mount(p,reload=True);assert node(f,id)['title']=='Latest unsaved fan wording'

def test_async_save_shows_pending_and_mode_switch_waits(p):
 f=mount(p);import_story(f,scene());await_save(f);id=project(f)['nodes'][0]['id'];p.evaluate('fixtureIDB.delay=50');write(f,id,'title','Commit before leaving');expect(f.locator('#save-status')).to_contain_text('Saving');assert f.evaluate('CounterplotSession.switchTo("mgs3")');assert json.loads(stored(f,MAIN))['projects'][-1]['nodes'][0]['title']=='Commit before leaving';p.evaluate('fixtureIDB.delay=0');assert f.evaluate('CounterplotSession.switchTo("")');assert node(f,id)['title']=='Commit before leaving'

def test_copy_practice_to_my_work_without_tutorial_or_losing_shelf(p):
 w=scene();f=mount(p,seed={PRACTICE:json.dumps(w)});await_save(f);main_before=snapshot(f);enter(f);p.evaluate('fixtureStorage.quota=0');id=project(f)['nodes'][0]['id'];write(f,id,'closing','My practice revision copied independently');await_save(f);practice=snapshot(f)
 f.locator('[data-action=copy-to-my-work]').click();f.wait_for_function('CounterplotSession.mode()===""');await_save(f);pr=project(f);assert pr['id']!=practice['active'];assert node(f,id)['closing']=='My practice revision copied independently';assert all(not k.startswith('tutorial') for k in pr);expect(f.locator('#tutorial-companion')).to_be_hidden();assert len(snapshot(f)['projects'])==len(main_before['projects'])+1
 assert json.loads(stored(f,PRACTICE))==practice;write(f,id,'closing','An independent new ending');await_save(f);assert json.loads(stored(f,PRACTICE))==practice;f=mount(p,reload=True);assert node(f,id)['closing']=='An independent new ending';shot(p,'copied-ordinary-story')

def test_copy_from_editor_keeps_published_and_recoverable_fan_draft(p):
 f,c=start(p);p.evaluate('fixtureStorage.quota=0');id=project(c)['nodes'][0]['id'];write(c,id,'closing','Fan authored version to work on normally');assert flush(f);draft=state(f)['draft'];stored_def=stored(f,DEF)
 panel(f,'menu');sb(f,'copy-to-work');f.wait_for_function('CounterplotTutorialLibrary.studioState()===null');assert f.evaluate('CounterplotSession.mode()')=='';await_save(f);assert node(f,id)['closing']=='Fan authored version to work on normally';assert stored(f,DEF)==stored_def;assert stored(f,DRAFT)
 f.evaluate('CounterplotTutorialLibrary.openEditor("mgs3",21,0)');c=ready(f);assert node(c,id)['closing']=='Fan authored version to work on normally';assert state(f)['draft']==draft

def test_copy_into_active_my_work_keeps_pending_changes_and_other_stories(p):
 f=mount(p);import_story(f,scene());await_save(f);id=project(f)['nodes'][0]['id'];old_id=project(f)['id'];p.evaluate('fixtureIDB.delay=20');write(f,id,'title','Recent edit on My work');w=scene();w['projects'][0]['title']='Incoming independent story';assert f.evaluate('(w)=>CounterplotSession.copyToMyWork(w)',w);await_save(f);allp=snapshot(f)['projects'];assert next(x for x in allp if x['id']==old_id)['nodes'][0]['title']=='Recent edit on My work';assert project(f)['title']=='Incoming independent story · My copy'

def test_two_windows_do_not_overwrite_workspace_conflict(p):
 f=mount(p);import_story(f,scene());await_save(f);id=project(f)['nodes'][0]['id'];g=mount(p,reload=True,target='second');assert g.evaluate('CounterplotSession.mode()')==''
 write(f,id,'title','First window owns this save');await_save(f);write(g,id,'title','Second window kept for export');g.wait_for_function('CounterplotSession.saveStatus().error!==null');assert 'First window owns this save' in stored(f,MAIN);assert node(g,id)['title']=='Second window kept for export';assert not g.evaluate('CounterplotSession.retrySave()');assert 'First window owns this save' in stored(f,MAIN)

def test_default_popup_grouping_and_next_only_intro(p):
 f=mount(p);enter(f);root=f.locator('#tutorial-companion');expect(root.locator('.guide-instruction>.guide-section-heading')).to_have_text('Action 1 of 4');expect(root.locator('[data-guide=next]')).to_be_enabled();assert project(f)['nodes']==[]
 assert root.locator('.guide-intro').evaluate('(e)=>e.tagName')=='SECTION';assert root.locator('.guide-intro summary,.guide-intro h3').count()==0;expect(root.locator('.guide-why')).to_have_attribute('open','');assert root.locator('.guide-body').evaluate('(e)=>[...e.querySelectorAll(":scope > [data-section-kind]")].map(x=>x.dataset.sectionKind)')==['writeup','explanation','action'];expect(root).not_to_contain_text('Story context')
 root.locator('.guide-why summary').click();assert not root.locator('.guide-why').evaluate('(e)=>e.open');root.locator('[data-guide=next]').click();expect(root.locator('.guide-instruction>.guide-section-heading')).to_have_text('Action 2 of 4');expect(root.locator('.guide-why')).to_have_attribute('open','');assert project(f)['nodes']==[];assert root.locator('.guide-why .guide-sample').count()==1
 # All original building behavior and automatic writing remain on the next action.
 click(f,'quick-piece','C');f.wait_for_function('CounterplotTutorial.snapshot().projects[0].nodes.some(n=>n.id==="loyalty"&&n.title==="Snake becomes Big Boss")');expect(root.locator('.guide-complete')).to_be_visible();shot(p,'grouping-and-original-construction')

def test_sections_create_nest_reorder_delete_undo_save_export_reload(p):
 f=mount(p);f.evaluate('CounterplotTutorialLibrary.openEditor("mgs3",0,0)');c=ready(f);tab(f,'sections');sb(f,'section-add');id=selected(f);sf(f,'title','Before we begin');sf(f,'text','My fan introduction, in my voice.');sf(f,'collapsible',True);sf(f,'expanded',True);c=ready(f);expect(c.locator(f'[data-section-id="{id}"]')).to_contain_text('My fan introduction, in my voice.')
 f.locator('[data-section-parent]').select_option('how');c=ready(f);assert f.evaluate('(id)=>TutorialSections.location(TutorialDefinition.presentation(CounterplotTutorialLibrary.studioState().draft,CounterplotTutorialLibrary.studioState().draft.lessons[0],CounterplotTutorialLibrary.studioState().draft.lessons[0].goals[0]).sections,id).parent',id)=='how'
 sb(f,'section-up');c=ready(f);assert sections(f)[1]['children'][0]['id']==id
 # Drag a real row from the nested position to the top-level writeup.
 drag(p,f.locator(f'[data-studio-drag=section][data-id="{id}"]'),f.locator('[data-studio-drop=section][data-id=writeup]'));c=ready(f);assert sections(f)[0]['id']==id
 sb(f,'section-remove');c=ready(f);assert not c.locator(f'[data-section-id="{id}"]').count();history(f,'undo');c=ready(f);assert sections(f)[0]['id']==id;assert state(f)['draft']['lessons'][0]['intro']==builtin()['lessons'][0]['intro']
 saved(f);doc=export(p,f,name='custom-popup-sections.json');assert doc['lessons'][0]['goals'][0]['presentation']['sections'][0]['id']==id;ab(f,'close');f=mount(p,reload=True);f.evaluate('CounterplotTutorialLibrary.openEditor("mgs3",0,0)');c=ready(f);expect(c.locator(f'[data-section-id="{id}"]')).to_contain_text('My fan introduction, in my voice.');shot(p,'custom-sections-editor')
 # An independent playable export uses the authored sections as well.
 html=export(p,f,kind='export-playable',name='custom-popup-playable.html');f=mount(p,html);expect(f.locator(f'#tutorial-companion [data-section-id="{id}"]')).to_contain_text('My fan introduction, in my voice.');expect(f.locator('[data-guide=next]')).to_be_enabled()

def test_direct_section_drag_and_direct_text_keep_native_scale(p):
 f=mount(p);f.evaluate('CounterplotTutorialLibrary.openEditor("mgs3",0,0)');c=ready(f);assert f.locator('#studio-frame').evaluate('(e)=>getComputedStyle(e).transform')=='none';c.locator('.guide-why').hover();handle=c.locator('[data-studio-section-handle=how]');dst=c.locator('[data-section-id=writeup]');drag(p,handle,dst);c=ready(f);assert sections(f)[0]['id']=='how'
 title=c.locator('[data-section-title=how]');title.fill('The idea behind it');title.press('Tab');text=c.locator('[data-section-body=how]');text.fill('A human explanation of the construction.');text.press('Tab');saved(f);assert sections(f)[0]['title']=='The idea behind it';assert state(f)['draft']['lessons'][0]['why']=='A human explanation of the construction.'

def test_sections_empty_popup_still_allows_navigation_and_undo(p):
 f=mount(p);f.evaluate('CounterplotTutorialLibrary.openEditor("mgs3",0,0)');ready(f);tab(f,'sections');
 for _ in range(3):sb(f,'section-remove');ready(f)
 assert sections(f)==[];c=ready(f);assert c.locator('.guide-section').count()==0;expect(c.locator('[data-guide=next]')).to_be_visible();history(f,'undo');assert len(sections(f))==1;saved(f)

def test_sections_scope_and_keyboard_reorder(p):
 f=mount(p);f.evaluate('CounterplotTutorialLibrary.openEditor("mgs3",0,0)');ready(f);tab(f,'sections');f.locator('[data-author-scope]').select_option('all');sb(f,'section-add');id=selected(f);sf(f,'title','Reusable notes');sf(f,'text','Shown on every action');saved(f);panel(f,'stages');ab(f,'step','[data-index="1"]');c=ready(f);expect(c.locator(f'[data-section-id="{id}"]')).to_contain_text('Shown on every action');tab(f,'sections');f.locator('[data-author-scope]').select_option('goal');sb(f,'select-section',f'[data-id="{id}"]');f.locator('[data-studio=section-up]').press('Enter');ready(f);assert sections(f)[0]['id']==id
 # The all-actions definition kept its original order after a scoped edit.
 assert state(f)['draft']['presentation']['sections'][1]['id']==id

def test_sections_and_grouping_at_desktop_tablet_phone_sizes(p):
 for width,height in [(1440,1000),(1024,768),(768,1024),(390,844),(320,568)]:
  p.set_viewport_size({'width':width,'height':height});f=mount(p);f.evaluate('CounterplotTutorialLibrary.openEditor("mgs3",0,0)');c=ready(f);tab(f,'sections');sb(f,'section-add');sf(f,'title','Readable custom text');sf(f,'text','A subsection at the normal page scale.');assert f.evaluate('document.documentElement.scrollWidth<=innerWidth+1');assert f.locator('#studio-frame').evaluate('(e)=>getComputedStyle(e).transform')=='none';shot(p,f'sections-{width}')
  panel(f,'canvas');c=ready(f);expect(c.locator('#tutorial-companion')).to_be_visible();r=c.locator('#tutorial-companion').bounding_box();assert r['width']>200;assert r['x']>=-1 and r['x']+r['width']<=width+1;shot(p,f'popup-{width}')

def test_legacy_first_action_draft_migrates_without_misplacing_fan_words(p):
 d=builtin();r={'baseline':'','baseRevision':d['revision'],'changes':[{'op':'set','path':['lessons',0,'goals',0,'text'],'value':'My original C-block instruction'},{'op':'set','path':['lessons',0,'intro'],'value':'My own writeup'}],'index':0,'step':0,'phase':'enter'}
 f=mount(p,seed={DRAFT:json.dumps(r)});f.evaluate('CounterplotTutorialLibrary.openEditor("mgs3")');c=ready(f);assert state(f)['step']==1;assert state(f)['draft']['lessons'][0]['goals'][0]['check']['kind']=='read';assert state(f)['draft']['lessons'][0]['goals'][1]['text']=='My original C-block instruction';expect(c.locator('.guide-intro')).to_contain_text('My own writeup');assert flush(f);saved(f);f=mount(p,reload=True);f.evaluate('CounterplotTutorialLibrary.openEditor("mgs3")');c=ready(f);assert state(f)['step']==1;expect(c.locator('.guide-instruction')).to_contain_text('My original C-block instruction')

def test_read_only_play_and_expansion_setting_are_immediate(p):
 f=mount(p);f.evaluate('CounterplotTutorialLibrary.openEditor("mgs3",0,0)');c=ready(f);tab(f,'sections');sb(f,'select-section','[data-id="how"]');sf(f,'expanded',False);c=ready(f);assert not c.locator('.guide-why').evaluate('(e)=>e.open');sf(f,'expanded',True);c=ready(f);assert c.locator('.guide-why').evaluate('(e)=>e.open');panel(f,'canvas');sb(f,'play');c=ready(f);expect(c.locator('.guide-instruction>.guide-section-heading')).to_have_text('Action 1 of 4');expect(c.locator('[data-guide=next]')).to_be_enabled();assert project(c)['nodes']==[];c.locator('[data-guide=next]').click();expect(c.locator('.guide-instruction>.guide-section-heading')).to_have_text('Action 2 of 4');c.locator('[data-studio-frame-return]').click();ready(f);assert state(f)['step']==0

def test_progress_failure_has_retry_and_preserves_current_position(p):
 f=mount(p);enter(f);await_save(f);f.wait_for_function('!CounterplotTutorialStore.status().pending');p.evaluate('fixtureIDB.quotaChars=0');f.locator('[data-guide=pause]').click();f.wait_for_function('document.querySelector("#tutorial-companion [data-guide=open]")');f.locator('[data-guide=open]').click();expect(f.locator('[data-guide=retry-progress]')).to_be_visible();p.evaluate('fixtureIDB.quotaChars=Infinity');f.locator('[data-guide=retry-progress]').click();f.wait_for_function('!document.querySelector("[data-guide=retry-progress]")');expect(f.locator('.guide-instruction>.guide-section-heading')).to_have_text('Action 1 of 4');f=mount(p,reload=True);expect(f.locator('.guide-instruction>.guide-section-heading')).to_have_text('Action 1 of 4')

def test_copy_refuses_to_discard_an_open_my_work_form(p):
 f=mount(p);await_save(f);f.locator('[data-nav=world]').click();click(f,'new-world');form(f,'world').locator('[name=name]').fill('An unfinished setting in My work');assert not f.evaluate('(w)=>CounterplotSession.copyToMyWork(w)',scene());expect(form(f,'world').locator('[name=name]')).to_have_value('An unfinished setting in My work');assert len(snapshot(f)['projects'])==1

def test_legacy_numeric_progress_keeps_completed_original_actions(p):
 f=mount(p);path=f.evaluate('location.pathname');w=scene();prid=w['active'];old={'version':2,'index':0,'open':True,'projects':{prid:{'done':['build-c:0','build-c:1'],'baselines':{'build-c:0':False,'build-c:1':'earlier opening'}}}}
 f=mount(p,seed={PRACTICE:json.dumps(w),'counterplot.guide.mgs3.build.v2.'+path:json.dumps(old)});enter(f);r=f.evaluate('CounterplotGuide.progress()')['projects']['mgs3:'+prid]
 assert 'build-c:mgs3-welcome' in r['done'];assert 'build-c:build-c-action-1' in r['done'];assert 'build-c:build-c-action-2' in r['done'];assert r['goal']==3;assert r['cursorVersion']==1
 expect(f.locator('.guide-instruction>.guide-section-heading')).to_have_text('Action 4 of 4');f=mount(p,reload=True);expect(f.locator('.guide-instruction>.guide-section-heading')).to_have_text('Action 4 of 4')

TESTS=[v for k,v in list(globals().items()) if k.startswith('test_')]
if __name__=='__main__':
 results=[];only=os.environ.get('QA_CASE','')
 with sync_playwright() as pw:
  b=launch(pw)
  for fn in TESTS:
   if only and only not in fn.__name__:continue
   ctx=b.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce',accept_downloads=True);p=ctx.new_page();p.set_default_timeout(9000);errors=[];p.on('pageerror',lambda e:errors.append(str(e)));p.on('dialog',lambda d:d.accept())
   try:fn(p);assert not errors,errors;results.append({'test':fn.__name__,'pass':True});print('PASS',fn.__name__,flush=True)
   except Exception as e:
    results.append({'test':fn.__name__,'pass':False,'error':str(e),'page_errors':errors});print('FAIL',fn.__name__,traceback.format_exc(),flush=True)
    try:shot(p,fn.__name__+'-failure')
    except:pass
   finally:ctx.close()
  b.close()
 (ROOT/'storage-sections-results.json').write_text(json.dumps({'sha256':hashlib.sha256(APP.read_bytes()).hexdigest(),'tests':results},indent=2));raise SystemExit(any(not r['pass'] for r in results))
