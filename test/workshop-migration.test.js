import {createRequire} from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {testDatabase} from './helpers/d1.js';
import {onRequestPost as register} from '../functions/api/auth/register.js';
import {onRequestPut as put,onRequestGet as get} from '../functions/api/workspace.js';
const require=createRequire(import.meta.url),W=require('../workshop/src/integration.js');
test('migrated Workshop accounts reject old writes and retain both histories',async()=>{
const env=testDatabase(),base='https://counterplot.test';let response=await register({env,request:new Request(base+'/api/auth/register',{method:'POST',headers:{Origin:base},body:JSON.stringify({email:'upgrade@example.test',password:'safe synthetic test password'})})});const cookie=response.headers.get('Set-Cookie').split(';')[0],owner=(await response.json()).user;
const fixture=JSON.parse(readFileSync(new URL('../browser-tests/fixtures/rich-v2-workspace.json',import.meta.url)));
const request=(method,writer,body)=>({env,request:new Request(base+'/api/workspace',{method,headers:{Origin:base,Cookie:cookie,'X-Counterplot-Owner':owner,'X-Counterplot-Writer':String(writer)},...(body?{body:JSON.stringify(body)}:{})})});
response=await put(request('PUT',4,{workspace:fixture,revision:0,writeId:'old-save'}));assert.equal(response.status,200,await response.text());
const migrated=W.legacy(fixture);response=await put(request('PUT',5,{workspace:migrated,revision:1,writeId:'new-save'}));assert.equal(response.status,200,await response.text());
response=await put(request('PUT',4,{workspace:fixture,revision:2,writeId:'stale-tab'}));assert.equal(response.status,426);
response=await get(request('GET',4));assert.equal(response.status,426);
response=await get(request('GET',5));assert.equal(response.status,200);assert.equal((await response.json()).workspace.format,'counterplot-workshop');
assert.equal(env.raw.prepare('SELECT count(*) AS n FROM workspace_revisions').get().n,2);
console.log('PASS old account save → Workshop migration → old writer refused, both revisions retained');env.raw.close();

});
