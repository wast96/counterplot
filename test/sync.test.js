import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { testDatabase } from './helpers/d1.js';
import { onRequestPost as register } from '../functions/api/auth/register.js';
import { onRequestPut as save } from '../functions/api/workspace.js';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=html.match(/const CounterplotSyncCore=\(\(\)=>\{[\s\S]*?\}\)\(\);/)[0];
const core=vm.runInNewContext(source+';CounterplotSyncCore',{crypto});
const workspace=(value,id='project')=>({schema:3,active:id,projects:[{id,version:'Draft',notes:value}]});

test('first save with no common ancestor preserves every local project',()=>{
 const local=workspace('Local words'),remote=workspace('Remote words');let id=0;
 const result=core.merge(null,local,remote,()=>`recovered-${++id}`);
 assert.equal(result.workspace.projects.length,2);assert.equal(result.forks.length,1);
 assert.ok(result.workspace.projects.some(x=>x.notes==='Local words'));assert.ok(result.workspace.projects.some(x=>x.notes==='Remote words'));
 const retried=core.merge(remote,result.workspace,remote,()=>`recovered-${++id}`);assert.equal(retried.workspace.projects.length,2);
 assert.equal(local.projects[0].notes,'Local words');
 const independent=core.merge(null,workspace('Separate','another'),remote);assert.equal(independent.workspace.projects.length,2);
});

test('common-base conflicts preserve versions and disjoint edits combine',()=>{
 const base=workspace('Original'),local=workspace('Local'),remote=workspace('Remote');
 assert.equal(core.merge(base,local,remote).forks.length,1);
 const disjoint=structuredClone(base);disjoint.projects[0].title='A title';
 const r=core.merge(base,local,disjoint);assert.equal(r.forks.length,0);assert.equal(r.workspace.projects[0].notes,'Local');assert.equal(r.workspace.projects[0].title,'A title');
});

test('old clients cannot overwrite an upgraded workspace',async()=>{
 const env=testDatabase(),base='https://counterplot.test';const reg=await register({env,request:new Request(base+'/api/auth/register',{method:'POST',headers:{Origin:base},body:JSON.stringify({email:'writer@example.test',password:'A strong long password'})})});
 const cookie=reg.headers.get('Set-Cookie').split(';')[0],owner=(await reg.json()).user;
 const fixture=JSON.parse(readFileSync(new URL('../browser-tests/fixtures/rich-v2-workspace.json',import.meta.url),'utf8'));fixture.schema=3;
 const put=(schema,writer,revision,writeId)=>save({env,request:new Request(base+'/api/workspace',{method:'PUT',headers:{Origin:base,Cookie:cookie,'X-Counterplot-Owner':owner,...(writer?{'X-Counterplot-Writer':String(writer)}:{})},body:JSON.stringify({workspace:fixture,revision,writeId}).replace('"schema":3',`"schema":${schema}`)})});
 assert.equal((await put(3,4,0,'first')).status,200);
 assert.equal((await put(2,null,1,'old')).status,426);
 assert.equal((await put(2,4,1,'downgrade')).status,426);
 assert.equal((await put(3,4,1,'new')).status,200);
 assert.equal(env.raw.prepare('SELECT revision FROM workspaces').get().revision,2);env.raw.close();
});
