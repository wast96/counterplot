const CounterplotSyncCore=(()=>{
 const id=()=>{if(crypto.randomUUID)return crypto.randomUUID();const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=[...b].map(x=>x.toString(16).padStart(2,'0'));return h.slice(0,4).join('')+'-'+h.slice(4,6).join('')+'-'+h.slice(6,8).join('')+'-'+h.slice(8,10).join('')+'-'+h.slice(10).join('');};
 const copy=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
 const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
 const equal=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
 const identified=x=>Array.isArray(x)&&x.every(v=>v&&typeof v==='object'&&typeof v.id==='string')&&new Set(x.map(v=>v.id)).size===x.length;
 const plain=x=>x&&typeof x==='object'&&!Array.isArray(x);
 function mergeValue(base,local,remote,path,conflicts){
  if(equal(local,remote))return copy(local);
  if(equal(base,local))return copy(remote);
  if(equal(base,remote))return copy(local);
  if(path.endsWith('.updatedAt')&&typeof local==='string'&&typeof remote==='string')return local>remote?local:remote;
  if(identified(base)&&identified(local)&&identified(remote)){
   const bm=new Map(base.map(x=>[x.id,x])),lm=new Map(local.map(x=>[x.id,x])),rm=new Map(remote.map(x=>[x.id,x]));
   const baseOrder=base.map(x=>x.id).filter(id=>lm.has(id)&&rm.has(id));
   const lo=local.map(x=>x.id).filter(id=>baseOrder.includes(id)),ro=remote.map(x=>x.id).filter(id=>baseOrder.includes(id));
   if(!equal(lo,ro)&&!equal(lo,baseOrder)&&!equal(ro,baseOrder))conflicts.push(path+'.order');
   const lead=!equal(lo,baseOrder)&&equal(ro,baseOrder)?local:remote;
   const order=[...new Set([...lead,...local,...remote,...base].map(x=>x.id))];
   return order.map(id=>mergeValue(bm.get(id),lm.get(id),rm.get(id),path+'.'+id,conflicts)).filter(x=>x!==undefined);
  }
  if(plain(base)&&plain(local)&&plain(remote)){
   const result=[];for(const key of new Set([...Object.keys(base),...Object.keys(local),...Object.keys(remote)])){
    const value=mergeValue(base[key],local[key],remote[key],path+'.'+key,conflicts);if(value!==undefined)result.push([key,value]);
   }return Object.fromEntries(result);
  }
  conflicts.push(path);return copy(remote);
 }
 function merge(base,local,remote,idFactory=id){
  if(!remote)return {workspace:copy(local),conflicts:[],forks:[]};
  if(!base){
   const result=copy(remote),forks=[],conflicts=[];
   result.projects||=[];
   for(const project of local.projects){
    const same=result.projects.find(p=>p.id===project.id);
    if(same&&equal(same,project))continue;
    if(!same){result.projects.push(copy(project));forks.push(project.id);continue;}
    const fork=copy(project);fork.id=idFactory();fork.version=(fork.version||'Draft')+' · preserved device version';result.projects.push(fork);forks.push(fork.id);conflicts.push('projects.'+project.id);
   }
   result.active=forks.includes(local.active)?local.active:result.projects.some(p=>p.id===local.active)?local.active:result.projects[0]?.id;
   result.schema=Math.max(local.schema||1,remote.schema||1);
   return {workspace:result,conflicts,forks};
  }
  const result=copy(remote);result.schema=Math.max(local.schema||1,remote.schema||1);const bm=new Map(base.projects.map(x=>[x.id,x])),lm=new Map(local.projects.map(x=>[x.id,x])),rm=new Map(remote.projects.map(x=>[x.id,x]));
  const all=[...new Set([...remote.projects,...local.projects].map(x=>x.id))],conflicts=[],forks=[];
  result.projects=[];
  for(const id of all){
   const issues=[], l=lm.get(id),r=rm.get(id), b=bm.get(id);const merged=mergeValue(b,l,r,'projects.'+id,issues);
   if(merged)result.projects.push(merged);
   if(issues.length&&l){const fork=copy(l);fork.id=idFactory();fork.version=(fork.version||'Draft')+' · preserved device version';fork.updatedAt=new Date().toISOString();result.projects.push(fork);forks.push(fork.id);}
   conflicts.push(...issues);
  }
  // Project switching is interface state, not a conflict in the story.
  result.active=result.projects.some(p=>p.id===local.active)?local.active:result.projects[0]?.id;
  if(!result.projects.length){result.projects=copy(local.projects);result.active=local.active;}
  return {workspace:result,conflicts,forks};
 }
 return Object.freeze({merge,mergeValue,equal,copy,id});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=CounterplotSyncCore;
