"""Real app/editor UI with a quota-limited Storage fixture and a separate,
transactional IDB interface fixture. Not native file-origin or physical-device QA.
The old delivered app is optionally reproduced from COUNTERPLOT_PRE_STORAGE_APP.
"""
from common import APP,ROOT,launch
from studio import ready,ab,sb,panel,tab,edit,state,export
from edit_safety import project,node,write,history
from playwright.sync_api import sync_playwright,expect
from pathlib import Path
import json,os,time,traceback,hashlib,uuid,re,gzip
FIXTURE=(Path(__file__).resolve().parents[1]/'fixtures/indexeddb-fixture.cjs').read_text()
OLD=os.environ.get('COUNTERPLOT_PRE_STORAGE_APP')
if not OLD:
 old=ROOT/'pre-storage-repair.html';old.write_bytes(gzip.decompress((Path(__file__).resolve().parents[1]/'fixtures/pre-storage-repair.html.gz').read_bytes()));OLD=str(old)
DEF='counterplot.tutorial.definition.mgs3.v1';DRAFT='counterplot.tutorial.draft.mgs3.v2'
def mount(p,html=None,reload=False,target='fixture',seed=None,fail_migration=False):
 if not reload:
  p.set_content('<!doctype html><style>html,body{margin:0;height:100%;overflow:hidden}iframe{border:0;width:100%;height:100%}</style><iframe id="fixture"></iframe>')
  p.add_script_tag(content='(()=>{'+FIXTURE+'''\nwindow.fixtureIDB=new TutorialIDBFixture();window.fixtureStorage=new class{constructor(){this.items=new Map();this.quota=5*1024*1024}getItem(k){return this.items.get(String(k))??null}setItem(k,v){v=String(v);let size=2*(String(k).length+v.length);for(const [key,value]of this.items)if(key!==String(k))size+=2*(key.length+value.length);if(size>this.quota)throw new DOMException("Failed to execute 'setItem' on 'Storage': Setting the value of '"+k+"' exceeded the quota.","QuotaExceededError");this.items.set(String(k),v)}removeItem(k){this.items.delete(String(k))}clear(){this.items.clear()}key(i){return [...this.items.keys()][i]??null}get length(){return this.items.size}};})()''')
  if seed:p.evaluate('(items)=>{for(const [k,v]of Object.entries(items))fixtureStorage.setItem(k,v)}',seed)
  if fail_migration:p.evaluate('fixtureIDB.failCommit=true')
 if target!='fixture':p.evaluate('(id)=>{let e=document.createElement("iframe");e.id=id;document.body.append(e)}',target)
 html=html or APP.read_text();nonce=uuid.uuid4().hex
 boot='<script data-test-bootstrap>Object.defineProperty(window,"localStorage",{value:parent.fixtureStorage});Object.defineProperty(window,"indexedDB",{value:parent.fixtureIDB});window.__quota_mount='+json.dumps(nonce)+';</script>'
 html=html.replace('<head>','<head>'+boot,1)
 p.locator('#'+target).evaluate('(e,html)=>e.srcdoc=html',html)
 for _ in range(150):
  try:
   f=p.locator('#'+target).element_handle().content_frame()
   if f and f.evaluate('(n)=>window.__quota_mount===n&&!!window.CounterplotTutorialLibrary',nonce):return f
  except:pass
  p.wait_for_timeout(50)
 raise RuntimeError('App not ready')
def start(p,seed=None):
 f=mount(p,seed=seed);f.evaluate('CounterplotTutorialLibrary.openEditor("mgs3",21,0)');return f,ready(f)
def flush(f):return f.evaluate('CounterplotTutorialLibrary.flushDraft()')
def stored(f,key):return f.evaluate('(key)=>CounterplotTutorialStore.getItem(key)',key)
def saved(f):
 ab(f,'save');f.wait_for_function('!CounterplotTutorialLibrary.studioState().dirty',timeout=15000);expect(f.locator('#tutorial-author-error')).to_be_hidden()
def reopen(p):
 f=mount(p,reload=True);f.evaluate('CounterplotTutorialLibrary.openEditor("mgs3")');return f,ready(f)
def dbdump(p):return p.evaluate('JSON.stringify([...fixtureIDB.databases.values()].map(d=>[...d.stores.get("records")]))')
def builtin():
 import re
 return json.loads(re.search(r'<script type="application/json" id="tutorial-data">(.*?)</script>',APP.read_text(),re.S).group(1))['tutorials'][0]
def test_old_error_reproduction_and_export_upgrade(p):
 if not OLD:raise RuntimeError('Supply exact previous app for old-build reproduction')
 d=builtin();w=json.loads(json.dumps(d['starter']));w['projects']=[d['sample']];w['active']=d['sample']['id']
 seed={DEF:json.dumps(d,separators=(',',':')), 'counterplot.tutorial.build.v2':json.dumps(w,separators=(',',':'))}
 f=mount(p,Path(OLD).read_text(),seed=seed);f.evaluate('CounterplotTutorialLibrary.openEditor("mgs3",21,0)');c=ready(f);id=project(c)['nodes'][0]['id'];write(c,id,'closing','MY FAN ENDING — keep this through the upgrade');p.wait_for_timeout(1100)
 expect(f.locator('#tutorial-author-error')).to_contain_text('exceeded the quota');assert p.evaluate('(k)=>fixtureStorage.getItem(k)',DRAFT) is None
 assert node(c,id)['closing']=='MY FAN ENDING — keep this through the upgrade'
 p.screenshot(path=str(ROOT/'old-quota.png'))
 backup=export(p,f,name='old-quota-fan-backup.json');assert backup['lessons'][21]['goals'][0]['storyEdits']
 previous_practice=p.evaluate('fixtureStorage.getItem("counterplot.tutorial.build.v2")')
 f=mount(p,reload=True);assert f.evaluate('CounterplotTutorialLibrary.storageStatus().mode')=='indexeddb';assert p.evaluate('(k)=>fixtureStorage.getItem(k)',DEF) is None
 assert f.evaluate("CounterplotTutorialStore.getItem('counterplot.tutorial.build.v2')")==previous_practice
 assert p.evaluate('fixtureStorage.getItem("counterplot.tutorial.build.v2")') is None
 f.evaluate('CounterplotTutorialLibrary.openEditor("mgs3",21,0)');c=ready(f);ab(f,'import');f.locator('#tutorial-definition-file').set_input_files(str(ROOT/'old-quota-fan-backup.json'));ready(f);saved(f)
 f.evaluate('CounterplotTutorialLibrary.openEditor("mgs3",21,0)') # existing editor keeps its imported cursor
 panel(f,'stages');ab(f,'stage','[data-index="21"]');c=ready(f);assert node(c,id)['closing']=='MY FAN ENDING — keep this through the upgrade'
 p.evaluate('fixtureStorage.quota=0');write(c,id,'opening','A further edit while localStorage is full');assert flush(f);assert len(json.loads(stored(f,DRAFT))['baselineHash'])==64
 saved(f);assert stored(f,DRAFT) is None;f,c=reopen(p);assert node(c,id)['opening']=='A further edit while localStorage is full';assert node(c,id)['closing']=='MY FAN ENDING — keep this through the upgrade'
 p.screenshot(path=str(ROOT/'quota-repaired.png'))
def test_compact_draft_with_large_published_baseline(p):
 d=builtin();f,c=start(p,{DEF:json.dumps(d)});id=project(c)['nodes'][0]['id'];p.evaluate('fixtureStorage.quota=0');write(c,id,'title','A small edit needs a small journal');assert flush(f)
 raw=stored(f,DRAFT);record=json.loads(raw);assert 'baseline' not in record;assert len(raw)<18000,(len(raw));assert record['baselineHash'];f,c=reopen(p);assert node(c,id)['title']=='A small edit needs a small journal'
 (ROOT/'draft-size.json').write_text(json.dumps({'old_baseline_characters':len(json.dumps(d)),'new_draft_characters':len(raw)}))
def test_large_independent_tutorial_save_copy_reload_export(p):
 f,c=start(p);id=project(c)['nodes'][0]['id'];write(c,id,'closing','Full-size fan tutorial');flush(f);p.evaluate('fixtureStorage.quota=0');panel(f,'menu');sb(f,'copy-tutorial');p.wait_for_timeout(350);c=ready(f);assert state(f)['draft']['id']!='mgs3';new_id=state(f)['draft']['id'];assert node(c,id)['closing']=='Full-size fan tutorial';saved(f)
 doc=export(p,f,name='fan-database-copy.json');assert doc['id']==new_id;assert len(json.dumps(doc))>1000000
 ab(f,'close');f=mount(p,reload=True);assert len(f.evaluate('CounterplotTutorialLibrary.list()'))==2;f.evaluate('(id)=>CounterplotTutorialLibrary.openEditor(id,21,0)',new_id);c=ready(f);assert node(c,id)['closing']=='Full-size fan tutorial'
def test_autosave_failure_preserves_last_good_draft_and_retries(p):
 f,c=start(p);id=project(c)['nodes'][0]['id'];write(c,id,'opening','good');assert flush(f);old=stored(f,DRAFT);p.evaluate('fixtureIDB.quotaChars=0');write(c,id,'opening','still in this tab');assert not flush(f);assert stored(f,DRAFT)==old;expect(f.locator('#tutorial-author-error')).to_contain_text('last saved copy was kept');assert node(c,id)['opening']=='still in this tab'
 ab(f,'close');p.wait_for_timeout(300);assert state(f) is not None;expect(f.locator('#tutorial-author-error')).to_contain_text(re.compile('export',re.I))
 doc=export(p,f,name='quota-failed-safe-export.json');assert 'still in this tab' in json.dumps(doc);p.evaluate('fixtureIDB.quotaChars=Infinity');assert flush(f);expect(f.locator('#tutorial-author-error')).to_be_hidden();f,c=reopen(p);assert node(c,id)['opening']=='still in this tab'
def test_failed_publish_is_atomic_and_retryable(p):
 f,c=start(p);id=project(c)['nodes'][0]['id'];write(c,id,'title','a protected title');assert flush(f);old_draft=stored(f,DRAFT);old_def=stored(f,DEF);p.evaluate('fixtureIDB.quotaChars=0');ab(f,'save');expect(f.locator('#tutorial-author-error')).to_contain_text('Could not save');assert state(f)['dirty'];assert stored(f,DRAFT)==old_draft;assert stored(f,DEF)==old_def
 p.evaluate('fixtureIDB.quotaChars=Infinity');saved(f);assert stored(f,DRAFT) is None;f,c=reopen(p);assert node(c,id)['title']=='a protected title'
def test_new_edit_during_slow_save_is_not_discarded(p):
 f,c=start(p);id=project(c)['nodes'][0]['id'];write(c,id,'title','snapshot being saved');assert flush(f);p.evaluate('fixtureIDB.delay=90');ab(f,'save');write(c,id,'closing','typed while saving');p.wait_for_timeout(1200);assert state(f)['dirty'];assert flush(f);p.evaluate('fixtureIDB.delay=0');f,c=reopen(p);assert node(c,id)['title']=='snapshot being saved';assert node(c,id)['closing']=='typed while saving'
def test_unfinished_form_and_cursor_recovery_with_full_local_store(p):
 f,c=start(p);p.evaluate('fixtureStorage.quota=0');c.locator('[data-nav=world]').click();c.locator('[data-action=new-world]').first.click();field=c.locator('#dialog form[data-form=world] [name=name]');field.fill('An unfinished fan location');assert flush(f)
 f,c=reopen(p);assert state(f)['index']==21;expect(c.locator('#dialog form[data-form=world] [name=name]')).to_have_value('An unfinished fan location')
def test_play_does_not_write_to_parent_database(p):
 f,c=start(p);id=project(c)['nodes'][0]['id'];write(c,id,'title','Authored title');saved(f);before=dbdump(p);sb(f,'play');c=ready(f);write(c,id,'title','Play-only title');c.locator('[data-studio-frame-return]').click();c=ready(f);assert dbdump(p)==before;assert node(c,id)['title']=='Authored title'
def test_migration_failure_keeps_legacy_saves(p):
 seed={DEF:json.dumps(builtin()),DRAFT:json.dumps({'baseline':'','changes':[]})};f=mount(p,seed=seed,fail_migration=True);assert f.evaluate('CounterplotTutorialLibrary.storageStatus().blocked');assert p.evaluate('(k)=>fixtureStorage.getItem(k)',DEF)==seed[DEF];assert p.evaluate('(k)=>fixtureStorage.getItem(k)',DRAFT)==seed[DRAFT]
 f.locator('[data-tutorial=browse]').first.click();expect(f.locator('.tutorial-warning')).to_contain_text('moving them to larger storage failed')
def test_large_payload_uses_database_without_local_pointer(p):
 f,c=start(p);p.evaluate('fixtureStorage.quota=0');assert f.evaluate('''async()=>{await CounterplotTutorialStore.setItem('counterplot.tutorial.draft.large-test.v2','X'.repeat(7*1024*1024),'');return true}''');assert len(stored(f,'counterplot.tutorial.draft.large-test.v2'))==7*1024*1024
 f=mount(p,reload=True);assert len(stored(f,'counterplot.tutorial.draft.large-test.v2'))==7*1024*1024;assert p.evaluate('fixtureStorage.getItem("counterplot.tutorial.draft.large-test.v2")') is None

def test_valid_image_heavy_tutorial_import_save_reload(p):
 d=builtin();d['id']='image-heavy-fan';d['title']='Image-heavy fan tutorial';d['revision']='custom-1'
 source=next(r for r in d['sample']['characters'][0]['references'] if r.get('image'))
 for i in range(13):
  r=json.loads(json.dumps(source));r['id']='extra-reference-'+str(i);r['title']='Fan reference '+str(i);d['sample']['characters'][0]['references'].append(r)
 file=ROOT/'image-heavy-tutorial.json';file.write_text(json.dumps(d));assert file.stat().st_size>6*1024*1024
 f=mount(p);p.evaluate('fixtureStorage.quota=0');f.locator('[data-tutorial=browse]').first.click();f.locator('[data-tutorial=import-tutorial]').click();f.locator('#tutorial-definition-file').set_input_files(str(file));p.wait_for_timeout(200);c=ready(f);assert state(f)['draft']['id']=='image-heavy-fan'
 panel(f,'stages');ab(f,'stage','[data-index="21"]');c=ready(f);id=project(c)['nodes'][0]['id'];write(c,id,'closing','Edited after importing more than six megabytes');assert flush(f);saved(f)
 f=mount(p,reload=True);f.evaluate('CounterplotTutorialLibrary.openEditor("image-heavy-fan",21,0)');c=ready(f);assert node(c,id)['closing']=='Edited after importing more than six megabytes';assert len(state(f)['draft']['sample']['characters'][0]['references'])==16

def test_import_different_id_keeps_original_draft_recoverable(p):
 f,c=start(p);id=project(c)['nodes'][0]['id'];write(c,id,'title','Original MGS3 changes');assert flush(f);original=stored(f,DRAFT)
 other=builtin();other['id']='different-fan';other['title']='A different fan tutorial';other['revision']='custom-1';file=ROOT/'different-fan.json';file.write_text(json.dumps(other));ab(f,'import');f.locator('#tutorial-definition-file').set_input_files(str(file));p.wait_for_timeout(200);c=ready(f)
 assert state(f)['draft']['id']=='different-fan';assert stored(f,DRAFT)==original;ab(f,'close');f.evaluate('CounterplotTutorialLibrary.openEditor("mgs3",21,0)');c=ready(f);assert node(c,id)['title']=='Original MGS3 changes'

def run():
 results=[]
 with sync_playwright() as pw:
  b=launch(pw)
  for name,fn in list(globals().items()):
   if not name.startswith('test_'):continue
   ctx=b.new_context(viewport={'width':1440,'height':1000},accept_downloads=True,reduced_motion='reduce');p=ctx.new_page();p.set_default_timeout(10000);errors=[];p.on('pageerror',lambda e:errors.append(str(e)));p.on('dialog',lambda d:d.accept(d.default_value or 'My fan version') if d.type=='prompt' else d.accept())
   try:fn(p);assert not errors,errors;results.append({'test':name,'result':'PASS'});print('PASS',name,flush=True)
   except Exception as e:
    results.append({'test':name,'result':'FAIL','error':str(e),'pageerrors':errors});print('FAIL',name,traceback.format_exc(),flush=True)
    try:p.screenshot(path=str(ROOT/(name+'-failure.png')))
    except:pass
   finally:ctx.close()
  b.close()
 (ROOT/'storage-quota-results.json').write_text(json.dumps({'sha256':hashlib.sha256(APP.read_bytes()).hexdigest(),'fixture':'Quota-limited Web Storage plus separately transactional IndexedDB interface fixture; not native disk storage','results':results},indent=2))
 if any(x['result']=='FAIL' for x in results):raise SystemExit(1)
if __name__=='__main__':run()
