import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { testDatabase } from './helpers/d1.js';
import { onRequestPost as register } from '../functions/api/auth/register.js';
import { onRequestPost as upload } from '../functions/api/workspace-chunk.js';
import { onRequestGet as get, onRequestPut as put } from '../functions/api/workspace.js';
import { digest } from '../functions/_lib/workspace-storage.js';
const fixture=JSON.parse(readFileSync(new URL('../browser-tests/fixtures/rich-v2-workspace.json',import.meta.url),'utf8'));fixture.schema=3;
const origin='https://counterplot.test';
async function account(env,name){const r=await register({env,request:new Request(origin+'/api/auth/register',{method:'POST',headers:{Origin:origin},body:JSON.stringify({email:name+'@example.test',password:'A synthetic testing password 123'})})});return {cookie:r.headers.get('set-cookie').split(';')[0],owner:(await r.json()).user};}
function request(env,a,path,method='GET',body,patch={}){return {env,request:new Request(origin+path,{method,headers:{Origin:origin,Cookie:a.cookie,'X-Counterplot-Owner':a.owner,'X-Counterplot-Writer':'4',...patch},body:body===undefined?undefined:JSON.stringify(body)})};}
async function stage(env,a,w){const text=JSON.stringify(w),chunks=[];for(let offset=0;offset<text.length;offset+=50000){const content=text.slice(offset,offset+50000),hash=await digest(content);assert.equal((await upload(request(env,a,'/api/workspace-chunk','POST',{hash,content}))).status,200);chunks.push(hash);}return {chunks,bytes:new TextEncoder().encode(text).byteLength};}

test('the cookie and expected account must agree for reads, saves, chunks and revisions',async()=>{
 const env=testDatabase();try{const a=await account(env,'a'),b=await account(env,'b');const stale={cookie:b.cookie,owner:a.owner};
  assert.equal((await put(request(env,stale,'/api/workspace','PUT',{workspace:fixture,revision:0,writeId:'cross-account'}))).status,403);
  assert.equal((await get(request(env,stale,'/api/workspace'))).status,403);
  assert.equal((await get(request(env,stale,'/api/workspace?revision=1'))).status,403);
  assert.equal((await upload(request(env,stale,'/api/workspace-chunk','POST',{content:'private',hash:await digest('private')}))).status,403);
  assert.equal(env.raw.prepare('SELECT count(*) AS n FROM workspaces').get().n,0);
  assert.equal((await put(request(env,a,'/api/workspace','PUT',{workspace:fixture,revision:0,writeId:'old'},{'X-Counterplot-Writer':'3'}))).status,426);
 }finally{env.raw.close();}
});

test('a large revision publishes only after every validated part is present; historical bytes remain intact',async()=>{
 const env=testDatabase();try{const a=await account(env,'large'),other=await account(env,'other');const first=structuredClone(fixture);
  assert.equal((await put(request(env,a,'/api/workspace','PUT',{workspace:first,revision:0,writeId:'original'}))).status,200);
  const large=structuredClone(first);for(let i=0;i<7;i++){const p=structuredClone(first.projects[0]);p.id+='-'+i;p.scenes[0].notes='x'.repeat(900000);large.projects.push(p);}
  const manifest=await stage(env,a,large);assert.ok(manifest.bytes>5000000);
  const bad={...manifest,chunks:[...manifest.chunks.slice(0,-1),'0'.repeat(64)]};
  assert.equal((await put(request(env,a,'/api/workspace','PUT',{manifest:bad,revision:1,writeId:'partial'}))).status,409);
  assert.deepEqual((await(await get(request(env,a,'/api/workspace'))).json()).workspace,first);
  assert.equal((await put(request(env,other,'/api/workspace','PUT',{manifest,revision:0,writeId:'stolen-parts'}))).status,409);
  assert.equal((await put(request(env,a,'/api/workspace','PUT',{manifest,revision:1,writeId:'complete'}))).status,200);
  assert.deepEqual((await(await get(request(env,a,'/api/workspace'))).json()).workspace,large);
  assert.deepEqual((await(await get(request(env,a,'/api/workspace?revision=1'))).json()).workspace,first);
  assert.equal((await put(request(env,a,'/api/workspace','PUT',{manifest,revision:1,writeId:'complete'}))).status,200);
  assert.equal((await put(request(env,a,'/api/workspace','PUT',{manifest,revision:1,writeId:'conflict'}))).status,409);
  assert.equal(env.raw.prepare('SELECT count(*) AS n FROM workspace_revisions').get().n,2);
 }finally{env.raw.close();}
});

test('validation rejects broken references but accepts recoverable legacy unfinished work beyond 100 drafts',async()=>{
 const env=testDatabase();try{const a=await account(env,'drafts');const w=structuredClone(fixture);w.projects[0].drafts=Array.from({length:105},(_,i)=>({...structuredClone(fixture.projects[0].drafts[0]),id:'draft-'+i}));
  assert.equal((await put(request(env,a,'/api/workspace','PUT',{workspace:w,revision:0,writeId:'legacy-drafts'}))).status,200);
  w.projects[0].scenes[0].focus='missing-person';
  assert.equal((await put(request(env,a,'/api/workspace','PUT',{workspace:w,revision:1,writeId:'broken-reference'}))).status,400);
  assert.equal((await(await get(request(env,a,'/api/workspace'))).json()).workspace.projects[0].drafts.length,105);
 }finally{env.raw.close();}
});

// An imported root extension must not be mistaken for the server's storage envelope.
test('legacy workspace extensions cannot collide with the chunk envelope',async()=>{
 const env=testDatabase();try{const a=await account(env,'extension');const w={...structuredClone(fixture),storage:'chunks-v1',manifest:{note:'Author extension, preserved exactly'}};
 assert.equal((await put(request(env,a,'/api/workspace','PUT',{workspace:w,revision:0,writeId:'extension'}))).status,200);
 assert.deepEqual((await(await get(request(env,a,'/api/workspace'))).json()).workspace,w);
 }finally{env.raw.close();}
});
