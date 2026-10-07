import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { testDatabase } from './helpers/d1.js';
import { onRequestPost as register } from '../functions/api/auth/register.js';
import { onRequestPost as upload } from '../functions/api/workspace-chunk.js';
import { onRequestGet as get, onRequestPut as put } from '../functions/api/workspace.js';
import { digest, ensureStorage } from '../functions/_lib/workspace-storage.js';
import { maintainChunks, CLEANUP_INTERVAL_MS, MAX_PENDING_BYTES } from '../functions/_lib/chunk-maintenance.js';

const origin = 'https://counterplot.test';
const fixture = JSON.parse(readFileSync(new URL('../browser-tests/fixtures/rich-v2-workspace.json', import.meta.url), 'utf8'));
fixture.schema = 3;
async function account(env, name) {
  const response = await register({ env, request: new Request(origin + '/api/auth/register', {
    method: 'POST', headers: { Origin: origin },
    body: JSON.stringify({ email: name + '@example.test', password: 'Synthetic strong testing password' })
  }) });
  return { cookie: response.headers.get('set-cookie').split(';')[0], owner: (await response.json()).user };
}
function request(env, a, method, body, path = '/api/workspace') {
  return { env, request: new Request(origin + path, { method,
    headers: { Origin: origin, Cookie: a.cookie, 'X-Counterplot-Owner': a.owner, 'X-Counterplot-Writer': '4' },
    body: body === undefined ? undefined : JSON.stringify(body)
  }) };
}
async function part(env, a, content) {
  const hash = await digest(content);
  const response = await upload(request(env, a, 'POST', { hash, content }, '/api/workspace-chunk'));
  return { hash, response };
}
function pending(env, a) {
  return env.raw.prepare('SELECT pending_bytes FROM workspace_chunk_usage WHERE user_id = ?').get(a.owner).pending_bytes;
}

test('existing databases bootstrap accounting; maintenance preserves current and historical parts and other owners', async () => {
  const env = testDatabase();
  try {
    const a = await account(env, 'bootstrap'), b = await account(env, 'separate');
    await ensureStorage(env);
    const now = Date.now(), old = new Date(now - 2 * 86400000).toISOString();
    const seed = (owner, hash, content, time = old) => env.raw.prepare('INSERT INTO workspace_chunks VALUES (?,?,?,?)').run(owner, hash, content, time);
    const current = '1'.repeat(64), historical = '2'.repeat(64), expired = '3'.repeat(64), fresh = '4'.repeat(64), legacy = '5'.repeat(64);
    for (const hash of [current, historical, expired, legacy]) seed(a.owner, hash, 'old');
    seed(a.owner, fresh, 'é', new Date(now).toISOString());
    seed(b.owner, expired, 'other owner');
    env.raw.prepare('INSERT INTO workspaces VALUES (?,?,?,?,?)').run(a.owner, JSON.stringify({ storage: 'chunks-v1', manifest: { chunks: [current] } }), 2, 'current', old);
    env.raw.prepare('INSERT INTO workspace_revisions VALUES (?,?,?,?,?)').run(a.owner, 1, JSON.stringify({ storage: 'chunks-v1', manifest: { chunks: [historical] } }), 'history', old);
    // Authored extensions do not protect a chunk as if they were server manifests.
    env.raw.prepare('INSERT INTO workspace_revisions VALUES (?,?,?,?,?)').run(a.owner, 2, JSON.stringify({ storage: 'chunks-v1', projects: [], manifest: { chunks: [legacy] } }), 'legacy-extension', old);
    await maintainChunks(env, a.owner, now);
    const hashes = env.raw.prepare('SELECT hash FROM workspace_chunks WHERE user_id = ? ORDER BY hash').all(a.owner).map(row => row.hash);
    assert.deepEqual(hashes, [current, historical, fresh]);
    assert.equal(pending(env, a), 2, 'byte count is UTF-8, not string length');
    assert.equal(env.raw.prepare('SELECT content FROM workspace_chunks WHERE user_id = ? AND hash = ?').get(b.owner, expired).content, 'other owner');
    env.raw.prepare('UPDATE workspace_chunks SET created_at = ? WHERE user_id = ? AND hash = ?').run(old, a.owner, fresh);
    await Promise.all([maintainChunks(env, a.owner, now + 1), maintainChunks(env, a.owner, now + 2)]);
    assert.equal(pending(env, a), 2, 'repeat maintenance does not scan or expire parts early');
    await maintainChunks(env, a.owner, now + CLEANUP_INTERVAL_MS + 1);
    assert.equal(pending(env, a), 0);
    assert.equal(env.raw.prepare('SELECT count(*) AS n FROM workspace_chunks WHERE user_id = ?').get(a.owner).n, 2);
  } finally { env.raw.close(); }
});

test('publishing releases only acknowledged parts atomically; failed/conflicting writes preserve staged uploads and history', async () => {
  const env = testDatabase();
  try {
    const a = await account(env, 'publish');
    const first = JSON.stringify(fixture), firstPart = await part(env, a, first);
    const unrelated = await part(env, a, 'another unfinished upload');
    const manifest = { chunks: [firstPart.hash], bytes: new TextEncoder().encode(first).byteLength };
    assert.equal((await put(request(env, a, 'PUT', { manifest, revision: 0, writeId: 'first' }))).status, 200);
    assert.equal(pending(env, a), 25);
    const next = structuredClone(fixture); next.projects[0].title = 'A newer title';
    const text = JSON.stringify(next), staged = await part(env, a, text);
    const nextManifest = { chunks: [staged.hash], bytes: new TextEncoder().encode(text).byteLength };
    const before = pending(env, a);
    assert.equal((await put(request(env, a, 'PUT', { manifest: nextManifest, revision: 0, writeId: 'conflict' }))).status, 409);
    assert.equal(pending(env, a), before);
    assert.equal((await put(request(env, a, 'PUT', { manifest: { ...nextManifest, bytes: 1 }, revision: 1, writeId: 'invalid' }))).status, 400);
    assert.equal(pending(env, a), before);
    // An acknowledgement failure rolls back the story, its history, and accounting together.
    env.raw.exec(`CREATE TRIGGER fail_ack BEFORE DELETE ON workspace_pending_chunks
      BEGIN SELECT RAISE(ABORT, 'synthetic acknowledgement failure'); END`);
    const originalError = console.error; console.error = () => {};
    try { assert.equal((await put(request(env, a, 'PUT', { manifest: nextManifest, revision: 1, writeId: 'retry' }))).status, 500); }
    finally { console.error = originalError; }
    assert.equal(pending(env, a), before);
    assert.equal(env.raw.prepare('SELECT revision FROM workspaces WHERE user_id = ?').get(a.owner).revision, 1);
    env.raw.exec('DROP TRIGGER fail_ack');
    assert.equal((await put(request(env, a, 'PUT', { manifest: nextManifest, revision: 1, writeId: 'retry' }))).status, 200);
    assert.equal((await put(request(env, a, 'PUT', { manifest: nextManifest, revision: 1, writeId: 'retry' }))).status, 200);
    assert.equal(pending(env, a), 25);
    assert.deepEqual((await (await get(request(env, a, 'GET'))).json()).workspace, next);
    assert.deepEqual((await (await get(request(env, a, 'GET', undefined, '/api/workspace?revision=1'))).json()).workspace, fixture);
    assert.ok(env.raw.prepare('SELECT hash FROM workspace_pending_chunks WHERE user_id = ? AND hash = ?').get(a.owner, unrelated.hash));
    const allBytes = env.raw.prepare('SELECT COALESCE(SUM(bytes),0) AS n FROM workspace_pending_chunks WHERE user_id = ?').get(a.owner).n;
    assert.equal(pending(env, a), allBytes);
  } finally { env.raw.close(); }
});

test('concurrent uploads cannot exceed staging capacity; duplicate retries and expiry keep accounting consistent', async () => {
  const env = testDatabase();
  try {
    const a = await account(env, 'quota');
    await ensureStorage(env); await maintainChunks(env, a.owner);
    const now = new Date().toISOString();
    // 255 full parts plus one almost-full part leave exactly two bytes available.
    const insert = env.raw.prepare('INSERT INTO workspace_chunks VALUES (?,?,?,?)');
    for (let i = 0; i < 256; i++) {
      const content = 'x'.repeat(i === 255 ? 249995 : 249997) + String(i).padStart(3, '0');
      insert.run(a.owner, await digest(content), content, now);
    }
    assert.equal(pending(env, a), MAX_PENDING_BYTES - 2);
    const responses = await Promise.all([part(env, a, 'é'), part(env, a, 'zz')]);
    assert.deepEqual(responses.map(p => p.response.status).sort(), [200, 413]);
    assert.equal(pending(env, a), MAX_PENDING_BYTES);
    const successful = responses.find(p => p.response.status === 200);
    const content = successful.hash === await digest('é') ? 'é' : 'zz';
    assert.equal((await part(env, a, content)).response.status, 200);
    assert.equal(pending(env, a), MAX_PENDING_BYTES);
    // Retained history is not temporary-upload usage, even above the staging cap.
    const hashes = env.raw.prepare('SELECT hash FROM workspace_chunks WHERE user_id = ?').all(a.owner).map(row => row.hash);
    env.raw.prepare('INSERT INTO workspace_revisions VALUES (?,?,?,?,?)').run(a.owner, 1,
      JSON.stringify({ storage: 'chunks-v1', manifest: { chunks: hashes } }), 'retained', now);
    const future = Date.now() + 2 * 86400000;
    await maintainChunks(env, a.owner, future);
    assert.equal(pending(env, a), 0);
    assert.equal(env.raw.prepare('SELECT count(*) AS n FROM workspace_chunks WHERE user_id = ?').get(a.owner).n, 257);
    assert.equal((await part(env, a, 'a smaller new save')).response.status, 200);
    env.raw.prepare('DELETE FROM workspace_revisions WHERE user_id = ?').run(a.owner);
    // Pruning a retained version makes its now-unreferenced parts collectible.
    await maintainChunks(env, a.owner, future + CLEANUP_INTERVAL_MS + 1);
    assert.equal(pending(env, a), 0);
    assert.equal(env.raw.prepare('SELECT count(*) AS n FROM workspace_chunks WHERE user_id = ?').get(a.owner).n, 0);
  } finally { env.raw.close(); }
});

test('many new parts perform history reconciliation once, not on every upload', async () => {
  const env = testDatabase();
  try {
    const a = await account(env, 'reads'), queries = [];
    const prepare = env.DB.prepare.bind(env.DB);
    env.DB.prepare = sql => { queries.push(sql); return prepare(sql); };
    for (let i = 0; i < 100; i++) assert.equal((await part(env, a, 'unique-part-' + i)).response.status, 200);
    const historyScans = queries.filter(sql => sql.includes('json_each(r.workspace_json'));
    assert.equal(historyScans.length, 2, 'one bootstrap/reconciliation pass across 100 uploads');
    assert.equal(env.raw.prepare('SELECT count(*) AS n FROM workspace_pending_chunks WHERE user_id = ?').get(a.owner).n, 100);
    assert.equal(pending(env, a), Array.from({ length: 100 }, (_, i) => Buffer.byteLength('unique-part-' + i)).reduce((a, b) => a + b));
    console.log('100 distinct uploads: 2 history scans (previously 200), constant-size quota checks.');
  } finally { env.raw.close(); }
});
