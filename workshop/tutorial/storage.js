/* Workspaces, practice, tutorial definitions and recovery journals use IndexedDB,
 * not the small localStorage bucket. Migration only removes committed duplicates.
 * All durable writes resolve at transaction COMPLETE, never request success.
 * The factory is exported so the real storage code can be failure-tested. */
'use strict';
var TutorialStorage = (() => {
 const INDEX='counterplot.tutorial.custom.index.v1';
 const owns=k=>typeof k==='string'&&(k==='counterplot.workshop.v1'||k==='counterplot.tutorial.build.v2'||k==='counterplot.guide.library.v1'||k==='counterplot.guide.mgs3.build.v3'||k==='counterplot.hint.character-first.v1'||k===INDEX||['counterplot.account.','counterplot.migration.original.','counterplot.workshop.mode.v1.','counterplot.tutorial.definition.','counterplot.tutorial.draft.','counterplot.tutorial.practice.','counterplot.tutorial.cursor.','counterplot.guide.mgs3.build.v2.'].some(prefix=>k.startsWith(prefix)));
 // SHA-256 of the baseline replaces a second complete tutorial in every journal.
 // This is a content identity check, not encryption or authentication.
 function fingerprint(text){
  const bytes=new TextEncoder().encode(String(text)),length=bytes.length;
  const padded=new Uint8Array(Math.ceil((length+9)/64)*64);padded.set(bytes);padded[length]=128;
  const v=new DataView(padded.buffer);v.setUint32(padded.length-8,Math.floor(length/0x20000000));v.setUint32(padded.length-4,(length*8)>>>0);
  const h=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const k=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const w=new Uint32Array(64),r=(x,n)=>(x>>>n)|(x<<(32-n));
  for(let off=0;off<padded.length;off+=64){
   for(let i=0;i<16;i++)w[i]=v.getUint32(off+i*4);
   for(let i=16;i<64;i++){const x=w[i-15],y=w[i-2];w[i]=(w[i-16]+(r(x,7)^r(x,18)^(x>>>3))+w[i-7]+(r(y,17)^r(y,19)^(y>>>10)))>>>0;}
   let [a,b,c,d,e,f,g,z]=h;
   for(let i=0;i<64;i++){const t1=(z+(r(e,6)^r(e,11)^r(e,25))+((e&f)^(~e&g))+k[i]+w[i])>>>0,t2=((r(a,2)^r(a,13)^r(a,22))+((a&b)^(a&c)^(b&c)))>>>0;z=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;}
   [a,b,c,d,e,f,g,z].forEach((x,i)=>h[i]=(h[i]+x)>>>0);
  }
  return h.map(n=>n.toString(16).padStart(8,'0')).join('');
 }
 function create({storage,indexedDB,dbName='counterplot.tutorials.v1',isolated=false,timeout=2500,extraKeys=[]}={}){
  let db=null,mode=isolated?'temporary':'local',notice='',blocked='',pending=0;
  const cache=new Map(),conflicts=new Map(),additional=new Set(extraKeys.filter(k=>typeof k==='string'&&k));
  const owned=k=>owns(k)||additional.has(k);
  function local(k){return storage?.getItem(k)||'';}
  function knownLegacy(){const out=new Map();try{for(let i=0;i<storage.length;i++){const key=storage.key(i);if(owned(key))out.set(key,local(key));}}catch{}return out;}
  function removeMigrated(k,value){try{const current=local(k);if(current===value)storage.removeItem(k);else if(current&&current!==cache.get(k))conflicts.set(k,current);}catch{/* The committed database copy is safe. Do not claim the old key was cleared. */}}
  function assertKey(k){if(!owned(k))throw Error('Not a Counterplot storage key.');}
  function legacyConflict(k,current){let old='';try{old=local(k);}catch{return;}if(old&&old!==current){conflicts.set(k,old);throw Error('Another window or older app has a different saved Counterplot copy. Both copies are kept. Export your edits before reopening.');}}
  function writeTransaction(keys,change,{migration=false}={}){
   keys=[...new Set(keys)];keys.forEach(assertKey);
   if(blocked)throw Error(blocked);
   if(!db){
    if(!storage)throw Error('Browser storage is unavailable. Export a backup to keep the latest edits.');
    const before=Object.fromEntries(keys.map(k=>[k,local(k)])),updates=change({...before});
    if(!updates)return Promise.resolve(before);
    const applied=[];
    try{for(const [k,raw]of Object.entries(updates)){assertKey(k);if(!keys.includes(k))throw Error('Undeclared transaction key.');if(raw===null)storage.removeItem(k);else storage.setItem(k,String(raw));applied.push(k);}}
    catch(e){for(const k of applied.reverse()){try{before[k]?storage.setItem(k,before[k]):storage.removeItem(k);}catch{}}throw e;}
    return Promise.resolve({...before,...Object.fromEntries(Object.entries(updates).map(([k,v])=>[k,v||'']))});
   }
   pending++;
   return new Promise((resolve,reject)=>{
    let tx,updates={},before={},failure;
    try{try{tx=db.transaction('records','readwrite',{durability:'strict'});}catch(e){if(e.name!=='TypeError')throw e;tx=db.transaction('records','readwrite');}}
    catch(e){pending--;reject(e);return;}
    const store=tx.objectStore('records');let count=keys.length;
    tx.onabort=()=>{pending--;reject(failure||tx.error||Error('The save was interrupted. The previous copy was kept.'));};
    tx.onerror=()=>{}; // Abort owns the rejection; success of a put is not a commit.
    tx.oncomplete=()=>{
     pending--;
     for(const [k,v]of Object.entries({...before,...updates})){if(v===null)cache.delete(k);else cache.set(k,v||'');}
     if(!migration)for(const k of keys)if(before[k])removeMigrated(k,before[k]);
     resolve(Object.fromEntries(keys.map(k=>[k,cache.get(k)||''])));
    };
    const apply=()=>{try{
     if(!migration)for(const k of keys)legacyConflict(k,before[k]);
     updates=change({...before})||{};
     for(const [k,raw]of Object.entries(updates)){assertKey(k);if(!keys.includes(k))throw Error('Undeclared transaction key.');if(raw===null)store.delete(k);else store.put({key:k,raw:String(raw)});}
    }catch(e){failure=e;tx.abort();}};
    for(const k of keys){const req=store.get(k);req.onsuccess=()=>{before[k]=req.result?.raw||'';if(!--count)apply();};}
    if(!count)apply();
   });
  }
  function getItem(k){assertKey(k);return db?(cache.get(k)||null):(local(k)||null);}
  function setItem(k,raw,expected){return writeTransaction([k],before=>{if(expected!==undefined&&before[k]!==expected)throw Error('Another window has a newer saved copy. Export your edits before closing.');return {[k]:String(raw)};});}
  async function init(){
   if(isolated||!indexedDB){notice=isolated?'':'Larger browser storage is unavailable in this browser context. Saves use the limited browser store; export backups.';return;}
   try{
    db=await new Promise((resolve,reject)=>{
     let settled=false;const req=indexedDB.open(dbName,1),timer=setTimeout(()=>{settled=true;reject(Error('Opening browser storage timed out. Close other Counterplot tabs, then retry.'));},timeout);
     req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('records'))req.result.createObjectStore('records',{keyPath:'key'});};
     req.onsuccess=()=>{clearTimeout(timer);if(settled){req.result.close();return;}settled=true;resolve(req.result);};
     req.onerror=()=>{clearTimeout(timer);if(!settled){settled=true;reject(req.error||Error('Counterplot storage could not be opened.'));}};
     req.onblocked=()=>{notice='Close older Counterplot tabs to finish opening browser storage.';};
    });
    db.onversionchange=()=>{db.close();blocked='Counterplot storage changed in another window. Export your open edits, then reopen this app.';};
    await new Promise((resolve,reject)=>{const tx=db.transaction('records','readonly'),r=tx.objectStore('records').getAll();let rows=[];r.onsuccess=()=>{rows=r.result;};tx.oncomplete=()=>{for(const row of rows){if(owned(row.key)&&typeof row.raw==='string')cache.set(row.key,row.raw);}resolve();};tx.onabort=()=>reject(tx.error||Error('Saved Counterplot data could not be read.'));});
    mode='indexeddb';
   }catch(e){
    if(db){db.close();db=null;blocked='Saved browser storage could not be read. Export any open edits and reopen the app; existing database records have not been changed.';}
    // Security/unsupported contexts may still have usable localStorage. Never
    // pretend that a readable database's later write failure is a local success.
    else if(!['SecurityError','NotSupportedError'].includes(e?.name))blocked='Larger browser storage could not be opened: '+e.message;
    notice=blocked||'Larger browser storage is unavailable here. Saves use the limited browser store; export backups.';return;
   }
   const legacy=knownLegacy();
   if(legacy.size)try{
    await writeTransaction([...legacy.keys()],before=>{
     const updates={};for(const [k,raw]of legacy){if(!before[k])updates[k]=raw;else if(before[k]!==raw)conflicts.set(k,raw);}return updates;
    },{migration:true});
    // Only now are records committed. Delete only byte-identical old duplicates.
    for(const [k,raw]of legacy)if(cache.get(k)===raw)removeMigrated(k,raw);
   }catch(e){notice='The previous Counterplot saves were kept, but moving them to larger storage failed: '+e.message;blocked=notice;for(const [k,raw]of legacy)if(!cache.has(k))cache.set(k,raw);}
  }
  async function refresh(k){assertKey(k);if(!db)return getItem(k);return new Promise((resolve,reject)=>{const tx=db.transaction('records','readonly');let row;const r=tx.objectStore('records').get(k);r.onsuccess=()=>row=r.result;tx.oncomplete=()=>{if(row)cache.set(k,row.raw);else cache.delete(k);resolve(row?.raw||null);};tx.onabort=()=>reject(tx.error||Error('The saved copy could not be read.'));});}
  const ready=init();
  return {ready,getItem,setItem,refresh,registerKey:k=>additional.add(k),transaction:writeTransaction,fingerprint,keys:()=>db?[...cache.keys()]:[...knownLegacy().keys()],status:()=>({mode,notice,blocked,pending,conflicts:[...conflicts.keys()]}),legacyCopy:k=>conflicts.get(k)||'',close:()=>db?.close(),INDEX};
 }
 // A coalescing single-key write queue. In-memory edits remain available on
 // failure; acknowledged data changes only after a committed transaction.
 function writer(store,key,initial='',onChange=()=>{}){
  let acknowledged=initial||'',desired=acknowledged,error=null,task=null;
  const status=()=>({acknowledged,desired,error,pending:!!task,dirty:desired!==acknowledged});
  function notify(){try{onChange(status());}catch(e){console.error(e);}}
  function run(){
   if(task||error||desired===acknowledged)return;
   task=Promise.resolve().then(async()=>{
    while(!error&&desired!==acknowledged){const next=desired;try{await store.setItem(key,next,acknowledged);acknowledged=next;}catch(e){error=e;}notify();}
   }).finally(()=>{task=null;notify();if(!error&&desired!==acknowledged)run();});
   notify();
  }
  function queue(value){desired=String(value);run();return !error;}
  async function flush(){run();while(task){await task;}return !error&&desired===acknowledged;}
  function retry(){error=null;run();return flush();}
  return {queue,flush,retry,status};
 }
 return {create,fingerprint,owns,INDEX,writer};

})();
if(typeof module!=='undefined')module.exports=TutorialStorage;
