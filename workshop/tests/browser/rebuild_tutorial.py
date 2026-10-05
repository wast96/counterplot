from common import APP, ROOT, launch
from regressions import *
from walkthrough import do_goal

if __name__=='__main__':
 results=[]
 with sync_playwright() as pw:
  b=launch(pw);p=b.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce',accept_downloads=True);p.set_default_timeout(7000);errs=[];p.on('pageerror',lambda e:errs.append(str(e)))
  try:
   f=mount(p,APP.read_text());editor(f);d=export_def(p,f,'rebuild-source.json');assert d==DEFINITION
   d['id']='mgs3-authored-rebuild';d['title']='MGS3 rebuilt';source=ROOT/'rebuild-import.json';source.write_text(json.dumps(d));ab(f,'close')
   f.locator('[data-tutorial="browse"]').filter(visible=True).first.click();f.locator('[data-tutorial="import-tutorial"]').click();f.locator('#tutorial-definition-file').set_input_files(str(source));expect(f.locator('#tutorial-editor')).to_be_visible();save(f)
   rebuilt=export_def(p,f,'rebuild-saved.json');assert rebuilt['sample']==d['sample'];assert rebuilt['lessons']==d['lessons'];assert rebuilt['assemblies']==d['assemblies'];assert rebuilt['presentation']==d['presentation']
   playable=download(p,lambda:ab(f,'export-playable'),'MGS3 rebuilt — Tutorial.html');f=mount(p,playable.read_text())
   for li,l in enumerate(rebuilt['lessons']):
    for gi,g in enumerate(l['goals']):
     if li or gi:f.locator('[data-guide="next"]').click()
     expect(f.locator('#guide-select')).to_have_value(str(li));expect(f.locator('.guide-instruction>.guide-section-heading')).to_have_text(f'Action {gi+1} of {len(l["goals"])}')
     do_goal(f,li,gi,g);print(f'REBUILT {li+1}.{gi+1} PASS',flush=True)
   assert not errs,errs;results=[{'test':'export_import_rebuild_mgs3_complete_walkthrough','result':'PASS','stages':22,'actions':sum(len(l['goals']) for l in d['lessons'])}];print('PASS full MGS3 built from exported/imported authoring data')
  except Exception as e:
   results=[{'test':'export_import_rebuild_mgs3_complete_walkthrough','result':'FAIL','error':str(e),'pageerrors':errs}];traceback.print_exc();p.screenshot(path=str(ROOT/'screenshots/rebuild-failure.png'))
  finally:p.close();b.close()
 (ROOT/'rebuild-results.json').write_text(json.dumps(results,indent=2))
 if any(x['result']!='PASS'for x in results):sys.exit(1)
