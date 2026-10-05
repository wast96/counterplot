"""Run the current release suite on the exact assembled app, with an SHA-256 manifest.
Tests use independent, disposable browser contexts. Legacy exploratory logs are not results.
"""
from pathlib import Path
import subprocess,sys,json,hashlib,time,os
from concurrent.futures import ThreadPoolExecutor,as_completed
from common import ROOT,APP
HERE=Path(__file__).resolve().parent
jobs=[('walkthrough.py','22','1440'),('walkthrough.py','22','768'),('walkthrough.py','22','390'),('shared_regressions.py',),('studio.py',),('studio_extended.py',),('portability.py',),('rebuild_tutorial.py',),('studio_scenes.py',),('visual_matrix.py',),('sample_matrix.py',),('studio_matrix.py',),('breakpoints.py',),('native_storage.py',),('repaired_workflows.py',),('contextual.py',),('failed_save_recovery.py',),('walkthrough.py','22','1440','full-motion'),('edit_safety.py',),('upgrade_safety.py',),('storage_quota.py',),('storage_sections.py',)]
start_hash=hashlib.sha256(APP.read_bytes()).hexdigest()
def run_job(pair):
 i,job=pair;name=str(i)+'-'+job[0];t=time.monotonic();print('START '+name+' '+ ' '.join(job[1:]),flush=True)
 env=dict(os.environ,COUNTERPLOT_QA_OUTPUT=str(ROOT/name));
 if job[-1]=='full-motion':env['COUNTERPLOT_QA_MOTION']='full'
 with (ROOT/(name+'.log')).open('w') as out:result=subprocess.run([sys.executable,str(HERE/job[0]),*job[1:]],stdout=out,stderr=subprocess.STDOUT,env=env)
 row={'job':list(job),'returncode':result.returncode,'seconds':round(time.monotonic()-t,2),'log':name+'.log','evidence_directory':name,'full_motion':job[-1]=='full-motion'};print(('PASS ' if not result.returncode else 'FAIL ')+name,flush=True);return row
with ThreadPoolExecutor(max_workers=int(os.environ.get('COUNTERPLOT_QA_WORKERS','2'))) as executor:results=list(executor.map(run_job,enumerate(jobs,1)))
end_hash=hashlib.sha256(APP.read_bytes()).hexdigest();manifest={'sha256':start_hash,'unchanged_during_run':start_hash==end_hash,'jobs':results,'browser_note':'Chromium on Linux; inline complete-app fixture; native-origin probes recorded separately.'}
(ROOT/'RUN-MANIFEST.json').write_text(json.dumps(manifest,indent=2));print('Evidence:',ROOT,flush=True)
failed=[r for r in results if r['returncode']];print('FAILED: '+str(failed) if failed else 'All runnable browser jobs passed; inspect native-origin probe limitations.',flush=True)
sys.exit(bool(failed) or start_hash!=end_hash)
