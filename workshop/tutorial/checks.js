/* State checks are separate from presentation so saved actions can be verified. */
const TutorialChecks=(()=>{
 const normalized=v=>typeof v==='string'?v.replace(/\s+/g,' ').trim():v;
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 function project(w){return w?.projects?.find(p=>p.id===w.active)}
 function order(p){const out=[];function walk(id){for(const n of p?.nodes||[])if(n.parentId===id){out.push([n.id,n.parentId]);walk(n.id)}}walk('');return out}
 function value(w,c){const p=project(w);if(!p)return null;
  if(c.kind==='read')return true;
  if(c.kind==='copy')return p.id;
  if(c.kind==='create'){const list=c.entity==='node'?p.nodes:c.entity==='character'?p.characters:c.entity==='block'?p.characters.find(x=>x.id===c.character)?.blocks||[]:c.entity==='world'?p.world:p.connections;return list.map(x=>x.id);}
  if(c.kind==='timed-change')return p.characters.find(x=>x.id===c.character)?.changes.filter(x=>x.at===c.at&&x.blockId===c.block).map(x=>x.id)||[];
  if(c.kind==='before'){const a=p.nodes.find(n=>n.id===c.id),b=p.nodes.find(n=>n.id===c.anchor);return !!a&&!!b&&a.parentId===c.parent&&b.parentId===c.parent&&p.nodes.indexOf(a)<p.nodes.indexOf(b);}
  if(c.kind==='archived')return !p.nodes.some(n=>n.id===c.id)&&p.archive.some(a=>a.nodes?.some(n=>n.id===c.id));
  if(c.kind==='plot-created')return (p.plots||[]).some(x=>x.label===(c.label||'A'));
  if(c.kind==='plot-assigned')return p.nodes.find(n=>n.id===c.id)?.plotIds?.some(id=>p.plots?.some(x=>x.id===id&&x.label===(c.label||'A')))||false;
  if(c.kind==='order'||c.kind==='restore-order')return order(p);
  if(c.kind==='count')return (c.entity==='swatches'?w.swatches:p[c.entity])?.length||0;
  if(c.kind==='reference')return (p.nodes.find(n=>n.id===c.id)?.references||[]).map(r=>r.id);
  if(c.kind==='restored')return p.nodes.some(n=>n.id===c.id);
  const char=p.characters?.find(x=>x.id===c.character);
  const list=c.entity==='node'?p.nodes:c.entity==='block'?char?.blocks:c.entity==='change'?char?.changes:c.entity==='world'?p.world:c.entity==='connection'?p.connections:c.entity==='character'?p.characters:[];
  return list?.find(x=>x.id===c.id)?.[c.field]??null;
 }
 function completed(c,before,now,event,original){
  if(c.kind==='read')return true;
  if(c.kind==='create')return now?.includes(c.id);
  if(c.kind==='timed-change')return now?.length>0;
  if(['before','archived','plot-created','plot-assigned'].includes(c.kind))return now===true;
  if(c.kind==='action')return event?.action===c.action&&(c.id===undefined||event.id===c.id);
  if(c.kind==='edit')return now!==null&&normalized(now)!==''&&!same(normalized(before),normalized(now));
  if(c.kind==='count')return now>before;
  if(c.kind==='contains')return Array.isArray(now)&&now.includes(c.value);
  if(c.kind==='reference')return now?.some(id=>!before?.includes(id));
  if(c.kind==='restored')return now===true;
  if(c.kind==='order')return !same(before,now);
  if(c.kind==='restore-order')return original!=null&&same(now,original)&&event?.action==='undo';
  if(c.kind==='copy')return now!==before;
  return false;
 }
 return {value,completed,project};
})();
if(typeof module!=='undefined')module.exports=TutorialChecks;
