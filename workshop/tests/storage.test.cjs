const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const S=require('../tutorial/storage.js'),{TutorialIDBFixture}=require('./fixtures/indexeddb-fixture.cjs');
const DEF='counterplot.tutorial.definition.mgs3.v1',DRAFT='counterplot.tutorial.draft.mgs3.v2';
function local(seed={}){return {map:new Map(Object.entries(seed)),quota:Infinity,get length(){return this.map.size;},key(i){return [...this.map.keys()][i]??null;},getItem(k){return this.map.get(k)??null;},setItem(k,v){v=String(v);let size=k.length+v.length;for(const [key,val]of this.map)if(key!==k)size+=key.length+val.length;if(size>this.quota)throw new DOMException('local quota','QuotaExceededError');this.map.set(k,v);},removeItem(k){this.map.delete(k);}};}
async function setup(seed={},idb=new TutorialIDBFixture()){const storage=local(seed),s=S.create({storage,indexedDB:idb});await s.ready;return {storage,idb,s};}
test('baseline SHA256 matches Node for empty, Unicode, large input',()=>{for(const text of ['', 'abc','Snake 🐍 — 手動','x'.repeat(1500000)])assert.equal(S.fingerprint(text),crypto.createHash('sha256').update(text).digest('hex'));});
test('workshop, practice, progress, definitions and journals are owned, unrelated apps are not',()=>{assert(S.owns(DEF));assert(S.owns(DRAFT));assert(S.owns(S.INDEX));for(const k of ['counterplot.workshop.v1','counterplot.tutorial.build.v2','counterplot.guide.library.v1'])assert(S.owns(k));for(const k of ['password','counterplot.original.v1','counterplot.portable.other-app'])assert(!S.owns(k));});
test('legacy migration frees duplicate keys only after commit and preserves every story value in the database',async()=>{
 const seed={[DEF]:'published',[DRAFT]:'old draft',[S.INDEX]:'[]','counterplot.workshop.v1':'MY REAL STORY','other-app':'keep'};const {storage,s}=await setup(seed);assert.equal(s.status().mode,'indexeddb');assert.equal(s.getItem(DEF),'published');assert.equal(s.getItem(DRAFT),'old draft');assert.equal(s.getItem('counterplot.workshop.v1'),'MY REAL STORY');assert.deepEqual(Object.fromEntries(storage.map),{'other-app':'keep'});
});
test('draft larger than Web Storage limit saves while local store cannot take one extra character',async()=>{
 const {s,storage}=await setup({'other-app':'occupied'});storage.quota=0;const large='a'.repeat(7*1024*1024);await s.setItem(DRAFT,large,'');assert.equal(s.getItem(DRAFT),large);assert.equal(storage.getItem('other-app'),'occupied');assert.equal(storage.getItem(DRAFT),null);
});
test('saved draft reloads from database without any local pointer key',async()=>{
 const {s,storage,idb}=await setup();await s.setItem(DRAFT,'new journal','');s.close();storage.quota=0;const second=S.create({storage,indexedDB:idb});await second.ready;assert.equal(second.getItem(DRAFT),'new journal');assert.equal(storage.length,0);
});
test('database quota rejection retains both old record and old cache',async()=>{
 const {s,idb}=await setup();await s.setItem(DRAFT,'old','');idb.failCommit=true;await assert.rejects(s.setItem(DRAFT,'new','old'),{name:'QuotaExceededError'});assert.equal(s.getItem(DRAFT),'old');assert.equal([...idb.databases.values()][0].stores.get('records').get(DRAFT).raw,'old');await s.setItem(DRAFT,'retry','old');assert.equal(s.getItem(DRAFT),'retry');
});
test('published definition and journal clearing are atomic on failure and success',async()=>{
 const {s,idb}=await setup({[DEF]:'old publish',[DRAFT]:'keep draft'});idb.failCommit=true;await assert.rejects(s.transaction([DEF,DRAFT],()=>({[DEF]:'new publish',[DRAFT]:null})));assert.equal(s.getItem(DEF),'old publish');assert.equal(s.getItem(DRAFT),'keep draft');await s.transaction([DEF,DRAFT],()=>({[DEF]:'new publish',[DRAFT]:null}));assert.equal(s.getItem(DEF),'new publish');assert.equal(s.getItem(DRAFT),null);
});
test('migration failure never removes local originals or permits stale overwrite',async()=>{
 const idb=new TutorialIDBFixture();idb.failCommit=true;const {s,storage}=await setup({[DEF]:'original',[DRAFT]:'unsaved'},idb);assert.equal(storage.getItem(DEF),'original');assert.equal(storage.getItem(DRAFT),'unsaved');assert.equal(s.getItem(DRAFT),'unsaved');assert(s.status().blocked);assert.throws(()=>s.setItem(DRAFT,'replacement','unsaved'));
});
test('stale window cannot overwrite newer recovery record',async()=>{
 const {s,storage,idb}=await setup({[DRAFT]:'old'}),second=S.create({storage,indexedDB:idb});await second.ready;await s.setItem(DRAFT,'first editor','old');await assert.rejects(second.setItem(DRAFT,'second editor','old'),/newer saved/);assert.equal(s.getItem(DRAFT),'first editor');
});
test('simultaneous writers use serialized compare-and-swap',async()=>{
 const {s,storage,idb}=await setup(),second=S.create({storage,indexedDB:idb});await second.ready;const results=await Promise.allSettled([s.setItem(DRAFT,'one',''),second.setItem(DRAFT,'two','')]);assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal(results.filter(x=>x.status==='rejected').length,1);
});
test('old application writing a legacy key after migration cannot be silently overwritten',async()=>{
 const {s,storage}=await setup({[DEF]:'baseline'});storage.setItem(DEF,'edited in old app');await assert.rejects(s.setItem(DEF,'new app edits','baseline'),/older app/);assert.equal(storage.getItem(DEF),'edited in old app');assert.equal(s.getItem(DEF),'baseline');assert.equal(s.legacyCopy(DEF),'edited in old app');
});
test('conflicting old and new stores are both retained on reload',async()=>{
 const {s,storage,idb}=await setup({[DEF]:'first'});await s.setItem(DEF,'newer','first');storage.setItem(DEF,'old app also edited');const other=S.create({storage,indexedDB:idb});await other.ready;assert.equal(other.getItem(DEF),'newer');assert.equal(storage.getItem(DEF),'old app also edited');assert(other.status().conflicts.includes(DEF));
});
test('custom index and definition commit together under quota',async()=>{
 const {s,idb}=await setup();idb.failCommit=true;const key='counterplot.tutorial.definition.fan.v1';await assert.rejects(s.transaction([key,S.INDEX],()=>({[key]:'full fan tutorial',[S.INDEX]:'["fan"]'})));assert.equal(s.getItem(key),null);assert.equal(s.getItem(S.INDEX),null);await s.transaction([key,S.INDEX],()=>({[key]:'full fan tutorial',[S.INDEX]:'["fan"]'}));assert.equal(s.getItem(S.INDEX),'["fan"]');
});
test('temporary Play and authoring never open a persistent database',async()=>{
 const idb=new TutorialIDBFixture(),storage=local();const s=S.create({storage,indexedDB:idb,isolated:true});await s.ready;await s.setItem(DRAFT,'play');assert.equal(idb.databases.size,0);assert.equal(s.status().mode,'temporary');
});
test('fallback reports limits and still protects previous draft on quota',async()=>{
 const storage=local({[DRAFT]:'previous'});const s=S.create({storage});await s.ready;assert.equal(s.status().mode,'local');assert(s.status().notice.includes('limited'));storage.quota=0;assert.throws(()=>s.setItem(DRAFT,'new','previous'),{name:'QuotaExceededError'});assert.equal(s.getItem(DRAFT),'previous');
});
test('fallback multi-key rollback does not erase an earlier valid definition',async()=>{
 const storage=local({[DEF]:'old'});storage.quota=DEF.length+4;const s=S.create({storage});await s.ready;assert.throws(()=>s.transaction([DEF,S.INDEX],()=>({[DEF]:'new',[S.INDEX]:'large index'})));assert.equal(s.getItem(DEF),'old');assert.equal(s.getItem(S.INDEX),null);
});
test('cache does not expose uncommitted request data',async()=>{
 const {s,idb}=await setup();idb.delay=8;const job=s.setItem(DRAFT,'pending','');assert.equal(s.getItem(DRAFT),null);assert.equal(s.status().pending,1);await job;assert.equal(s.getItem(DRAFT),'pending');assert.equal(s.status().pending,0);
});
test('failed read blocks editing instead of replacing inaccessible saved data',async()=>{
 const {s,storage,idb}=await setup({[DEF]:'original'});s.close();idb.failRead=true;const other=S.create({storage,indexedDB:idb});await other.ready;assert(other.status().blocked.includes('could not be read'));assert.throws(()=>other.setItem(DEF,'new'));assert.equal([...idb.databases.values()][0].stores.get('records').get(DEF).raw,'original');
});
test('open timeout cannot later switch silently to a different store',async()=>{
 const idb=new TutorialIDBFixture();idb.delay=60;const s=S.create({storage:local(),indexedDB:idb,timeout:5});await s.ready;assert(s.status().blocked);await new Promise(r=>setTimeout(r,80));assert.equal(s.status().mode,'local');assert(idb.connections.every(c=>c.closed));
});
