from pathlib import Path
from playwright.sync_api import expect
import os, tempfile, shutil
import json, time, uuid
APP=Path(__file__).resolve().parents[2]/'Counterplot Workshop.html'
ROOT=Path(os.environ.get('COUNTERPLOT_QA_OUTPUT',str(Path(tempfile.gettempdir())/'counterplot-browser-qa')))
ROOT.mkdir(parents=True,exist_ok=True)
(ROOT/'screenshots').mkdir(exist_ok=True)

def launch(pw):
    executable=os.environ.get('COUNTERPLOT_CHROMIUM') or shutil.which('chromium')
    options={'headless':True,'args':['--no-sandbox']}
    if executable:options['executable_path']=executable
    return pw.chromium.launch(**options)

STORAGE='''<script data-test-bootstrap>Object.defineProperty(window,'localStorage',{value:parent.fixtureStorage});</script>'''

def mount(page, html=None, reload=False):
    if not reload:
        page.set_content('''<!doctype html><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}iframe{width:100%;height:100%;border:0}</style><iframe id="fixture" title="Counterplot test fixture"></iframe><script>window.fixtureStorage=new class {constructor(){this.items=new Map()}getItem(k){return this.items.get(String(k))??null}setItem(k,v){this.items.set(String(k),String(v))}removeItem(k){this.items.delete(String(k))}clear(){this.items.clear()}get length(){return this.items.size}key(i){return [...this.items.keys()][i]??null}};</script>''')
    html=html or APP.read_text()
    nonce=uuid.uuid4().hex
    html=html.replace('<head>','<head>'+STORAGE+'<script data-test-bootstrap>window.__qa_mount='+json.dumps(nonce)+';</script>',1)
    page.locator('#fixture').evaluate('(e,html)=>{e.srcdoc=html}',html)
    for _ in range(100):
        frames=[f for f in page.frames if f.parent_frame]
        try:
            if frames and frames[0].evaluate('(nonce)=>window.__qa_mount===nonce && !!document.querySelector("#tutorial-companion")',nonce):
                return frames[0]
        except Exception:
            pass  # Old iframe execution context may be disappearing during srcdoc reload.
        page.wait_for_timeout(50)
    raise RuntimeError('Fixture did not mount')
