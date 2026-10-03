import test from 'node:test';
import assert from 'node:assert/strict';
import { testDatabase } from './helpers/d1.js';
import { onRequestPost as register } from '../functions/api/auth/register.js';
import { onRequestPost as login } from '../functions/api/auth/login.js';
import { onRequestGet as session } from '../functions/api/auth/session.js';
import { onRequestGet as status, onRequestPost as enroll } from '../functions/api/auth/recovery.js';
import { onRequestPost as reset } from '../functions/api/auth/reset.js';
import { RECOVERY_SCHEMA } from '../functions/_lib/recovery.js';
import { readFileSync } from 'node:fs';

function request(env, route, data, cookie='') {
  return { env, request: new Request('https://counterplot.test/api/auth/'+route, {
    method: data === undefined ? 'GET' : 'POST',
    headers: { Origin:'https://counterplot.test', 'Content-Type':'application/json',Cookie:cookie,'CF-Connecting-IP':'192.0.2.10' },
    body:data===undefined?undefined:JSON.stringify(data)
  }) };
}
async function account(env,email='writer@example.test') {
  const password='A strong original password';const r=await register(request(env,'register',{email,password}));assert.equal(r.status,201);
  const user=await r.json();return { ...user,password,cookie:r.headers.get('Set-Cookie').split(';')[0] };
}

test('recovery enrollment requires the current password; rotation invalidates the old set',async()=>{
 const env={...testDatabase(),AUTH_PEPPER:'test-only'};const a=await account(env);
 assert.equal((await enroll(request(env,'recovery',{password:a.password}))).status,401);
 assert.equal((await enroll(request(env,'recovery',{password:'wrong'},a.cookie))).status,401);
 const first=await (await enroll(request(env,'recovery',{password:a.password},a.cookie))).json();assert.equal(first.codes.length,8);
 const rows=env.raw.prepare('SELECT * FROM recovery_codes').all();assert.equal(rows.length,8);assert.ok(rows.every(r=>!first.codes.includes(r.code_hash)));
 assert.equal((await (await status(request(env,'recovery',undefined,a.cookie))).json()).remaining,8);
 await enroll(request(env,'recovery',{password:a.password},a.cookie));
 assert.equal((await reset(request(env,'reset',{email:a.email,code:first.codes[0],password:'A replacement long password'}))).status,400);
 env.raw.close();
});

test('recovery is single-use and revokes every session without touching story data',async()=>{
 const env=testDatabase(),a=await account(env),other=await account(env,'other@example.test');
 env.raw.prepare('INSERT INTO workspaces (user_id,workspace_json,revision,updated_at) VALUES (?,?,?,?)').run(a.user,'{"untouched":"prose"}',7,'now');
 const {codes}=await (await enroll(request(env,'recovery',{password:a.password},a.cookie))).json();
 const data={email:a.email,code:codes[0].toUpperCase(),password:'The new password is long enough'};
 assert.equal((await reset(request(env,'reset',{...data,email:other.email}))).status,400);
 const results=await Promise.all([reset(request(env,'reset',data)),reset(request(env,'reset',data))]);assert.deepEqual(results.map(x=>x.status).sort(),[200,400]);
 assert.equal((await session(request(env,'session',undefined,a.cookie))).status,401);
 assert.equal((await session(request(env,'session',undefined,other.cookie))).status,200);
 assert.equal((await login(request(env,'login',{email:a.email,password:a.password}))).status,401);
 assert.equal((await login(request(env,'login',{email:a.email,password:data.password}))).status,200);
 assert.equal(env.raw.prepare('SELECT workspace_json FROM workspaces WHERE user_id=?').get(a.user).workspace_json,'{"untouched":"prose"}');
 env.raw.close();
});

test('wrong codes are rate limited and migration matches the runtime schema',async()=>{
 const env=testDatabase();for(let i=0;i<8;i++)assert.equal((await reset(request(env,'reset',{email:'missing@example.test',code:'wrong',password:'Long enough password'}))).status,400);
 assert.equal((await reset(request(env,'reset',{email:'missing@example.test',code:'wrong',password:'Long enough password'}))).status,429);
 const normalized=s=>s.replace(/\s+/g,' ').trim();assert.equal(normalized(RECOVERY_SCHEMA),normalized(readFileSync(new URL('../migrations/0002_recovery_codes.sql',import.meta.url),'utf8')));
 env.raw.close();
});
