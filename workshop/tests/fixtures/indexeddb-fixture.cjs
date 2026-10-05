/* A deliberately narrow, asynchronous IndexedDB interface fixture for the app's
 * records store. NOT a native browser database, polyfill, or proof of disk durability.
 * Read/write transactions are serialized, commits are atomic, and failures can
 * occur after request success. The same fixture is injected into browser tests. */
class TutorialIDBFixture {
 constructor(){this.databases=new Map();this.delay=0;this.quotaChars=Infinity;this.failOpen=null;this.failCommit=false;this.failRead=false;this.connections=[];}
 open(name,version=1){const req={};setTimeout(()=>{
  if(this.failOpen){req.error=this.failOpen;req.onerror?.({target:req});return;}
  const fresh=!this.databases.has(name);
  if(fresh)this.databases.set(name,{stores:new Map(),queue:[],running:false,version});
  const data=this.databases.get(name),factory=this;
  const db={name,version,closed:false,objectStoreNames:{contains:n=>data.stores.has(n)},createObjectStore(n){data.stores.set(n,new Map());},close(){this.closed=true;},transaction(store,mode){if(this.closed)throw new DOMException('closed','InvalidStateError');if(!data.stores.has(store))throw Error('Missing store');return new FixtureTransaction(factory,data,store,mode);}};
  this.connections.push(db);req.result=db;if(fresh)req.onupgradeneeded?.({target:req});req.onsuccess?.({target:req});
 },this.delay);return req;}
}
class FixtureTransaction {
 constructor(factory,data,name,mode){this.factory=factory;this.data=data;this.name=name;this.mode=mode;this.queue=[];this.running=false;this.finished=false;this.error=null;data.queue.push(this);this.kick();}
 kick(){if(this.data.running)return;const first=this.data.queue[0];if(!first)return;first.data.running=true;setTimeout(()=>{first.working=new Map([...first.data.stores.get(first.name)].map(([k,v])=>[k,structuredClone(v)]));first.running=true;first.process();},this.factory.delay);}
 objectStore(name){if(name!==this.name)throw Error('Wrong store');return {get:key=>this.request('get',key),getAll:()=>this.request('all'),put:row=>this.request('put',row),delete:key=>this.request('delete',key)};}
 request(op,arg){if(this.finished)throw new DOMException('inactive','TransactionInactiveError');const r={};this.queue.push({op,arg:structuredClone(arg),r});return r;}
 abort(){if(this.finished)return;this.error||=new DOMException('aborted','AbortError');this.finished=true;setTimeout(()=>{this.onabort?.({target:this});this.finish();},0);}
 finish(){if(this.data.queue[0]===this)this.data.queue.shift();this.data.running=false;this.kick();}
 process(){if(this.finished)return;
  const next=this.queue.shift();if(next){setTimeout(()=>{
   if(this.finished)return;
   const {op,arg,r}=next;
   try{
    if(this.factory.failRead&&(op==='get'||op==='all'))throw new DOMException('read denied','UnknownError');
    if(op==='get')r.result=structuredClone(this.working.get(arg));
    if(op==='all')r.result=structuredClone([...this.working.values()]);
    if(op==='put'){if(this.mode!=='readwrite')throw Error('Readonly');this.working.set(arg.key,structuredClone(arg));r.result=arg.key;}
    if(op==='delete')this.working.delete(arg);
    r.onsuccess?.({target:r});this.process();
   }catch(e){r.error=e;this.error=e;r.onerror?.({target:r});this.onerror?.({target:this});this.abort();}
  },this.factory.delay);return;}
  setTimeout(()=>{
   if(this.finished)return;if(this.queue.length){this.process();return;}
   if(this.mode==='readwrite'){
    const size=[...this.working.values()].reduce((n,row)=>n+row.key.length+row.raw.length,0);
    if(this.factory.failCommit||size>this.factory.quotaChars){this.factory.failCommit=false;this.error=new DOMException('database quota exceeded','QuotaExceededError');this.abort();return;}
    this.data.stores.set(this.name,this.working);
   }
   this.finished=true;this.oncomplete?.({target:this});this.finish();
  },this.factory.delay);
 }
}
if(typeof module!=='undefined')module.exports={TutorialIDBFixture};
