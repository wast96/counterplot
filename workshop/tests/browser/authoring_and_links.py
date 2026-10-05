from common import APP, ROOT, launch
from regressions import *

def structure(f):
 s=f.locator('.author-structure');s.locator('summary').click() if s.get_attribute('open') is None else None

def test_add_reorder_actions(p,f):
 editor(f);structure(f);ab(f,'add-step');tab(f,'assemblies');expect(f.locator('.assembly-phase')).to_have_count(3);save(f)
 out=export_def(p,f,'added-action.json');assert len(out['lessons'][0]['goals'])==4
 new=out['lessons'][0]['goals'][1]['id'];structure(f);ab(f,'step-up');save(f);out=export_def(p,f,'reordered-action.json');assert out['lessons'][0]['goals'][0]['id']==new
 structure(f);ab(f,'duplicate-step');save(f);out=export_def(p,f,'duplicated-action.json');assert len(out['lessons'][0]['goals'])==5;assert out['lessons'][0]['goals'][3]['id']!=new
 structure(f);p.once('dialog',lambda d:d.accept());ab(f,'remove-stage');structure(f);ab(f,'add-stage');tab(f,'assemblies');save(f);out=export_def(p,f,'new-stage.json');assert len(out['lessons'])==22;assert out['lessons'][-1]['title']=='New stage'

def test_raw_id_guard(p,f):
 editor(f);tab(f,'advanced');f.locator('[data-author-raw-mode]').select_option('full');raw=json.loads(f.locator('#author-json').input_value());raw['id']='other-definition';f.locator('#author-json').fill(json.dumps(raw));ab(f,'apply-json');expect(f.locator('#tutorial-author-error')).to_contain_text('stable ID');ab(f,'reset-json');out=export_def(p,f,'stable-definition-id.json');assert out['id']=='mgs3'

def test_milieu_culture(p,f):
 click(f,'quick-piece','M');node=f.locator('.node.thread').last;node_id=node.get_attribute('data-node');assert node_id
 node.locator('[data-field="title"]').first.fill('Market square');node.locator('[data-field="title"]').first.press('Tab');click(f,'milieu-link',node_id);click(f,'milieu-new',node_id,'[data-type="culture"]')
 form(f,'world').locator('[name="name"]').fill('Harbor customs');form(f,'world').locator('[name="notes"]').fill('A shared culture');form(f,'world').locator('[type="submit"]').click();expect(f.locator('.milieu-chip').filter(has_text='Harbor customs')).to_be_visible()
 worldid=f.locator('.milieu-chip [data-action="edit-world"]').get_attribute('data-id');click(f,'milieu-unlink',node_id);expect(f.locator('.milieu-chip')).to_have_count(0);click(f,'undo');expect(f.locator('.milieu-chip')).to_have_count(1)
 click(f,'quick-piece','M');second=f.locator('.node.thread').last.get_attribute('data-node');click(f,'milieu-link',second);click(f,'milieu-choose',second,'[data-world="'+worldid+'"]');out=export_story(p,f,'culture-shared.json');proj=out['projects'][0];assert len([x for x in proj['world'] if x['name']=='Harbor customs'])==1;assert len([n for n in proj['nodes'] if worldid in n['worldIds']])==2
 enter(f);click(f,'quick-piece','M');tid=f.locator('.node.thread').last.get_attribute('data-node');click(f,'milieu-link',tid);click(f,'milieu-new',tid,'[data-type="culture"]');form(f,'world').locator('[name="name"]').fill('Tutorial customs');form(f,'world').locator('[type="submit"]').click();expect(f.locator('.milieu-chip').filter(has_text='Tutorial customs')).to_be_visible()

def test_nested_drag(p,f):
 enter(f);first_piece(f);f.locator('[data-guide="next"]').click();sample(f);f.locator('[data-guide="next"]').click();sample(f);f.locator('[data-guide="next"]').click()
 src=f.locator('[data-drag="palette"][data-drag-id="E"]');dest=f.locator('.inside-drop[data-anchor="loyalty"]').first
 print('nested drop destinations',f.locator('[data-drop]').evaluate_all('(es)=>es.map(e=>({drop:e.dataset.drop,id:e.dataset.id,node:e.dataset.node}))'),flush=True)
 if not dest.count():dest=f.locator('[data-drop="node"][data-parent="loyalty"]').first
 drag_mouse(p,src,dest);p.mouse.up();sample(f);out=export_story(p,f,'nested-drag.json');n=next(n for n in out['projects'][0]['nodes'] if n['id']=='defection');assert n['parentId']=='loyalty'

if __name__=='__main__':
 results=[]
 with sync_playwright() as pw:
  b=launch(pw)
  for test in [test_add_reorder_actions,test_raw_id_guard,test_milieu_culture,test_nested_drag]:
   if len(sys.argv)>1 and sys.argv[1] not in test.__name__:continue
   p=b.new_page(viewport={'width':int(sys.argv[2]) if len(sys.argv)>2 else 1440,'height':844 if len(sys.argv)>2 else 1000},reduced_motion='reduce',accept_downloads=True);p.set_default_timeout(6000);errs=[];p.on('pageerror',lambda e:errs.append(str(e)))
   try:
    f=mount(p,APP.read_text());test(p,f);assert not errs,errs;results.append({'test':test.__name__,'result':'PASS'});print('PASS',test.__name__,flush=True)
   except Exception as e:
    results.append({'test':test.__name__,'result':'FAIL','error':str(e),'pageerrors':errs});traceback.print_exc();p.screenshot(path=str(ROOT/'screenshots'/(test.__name__+'-failure.png')))
   finally:p.close()
  b.close()
 (ROOT/('extra-results-mobile.json' if len(sys.argv)>2 else 'extra-results.json')).write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
 if any(t['result']!='PASS' for t in results):sys.exit(1)
