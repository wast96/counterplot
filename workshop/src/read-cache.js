/* Read projections are shared for one render only. Edits never see cached state. */
function withStoryReadCache(renderView){
 const originals=new Map(),resultKey=Symbol();
 for(const name of ['events','ordered','plotView','children','descendants','characterState','stateAt','characterArc','arcStateOptions','openThreadContext','pieceChanges','recordedThreadStates']){
  const original=W[name],cache=new Map();if(!original)continue;originals.set(name,original);
  W[name]=(...args)=>{let entry=cache;for(const argument of args){const key=argument&&typeof argument==='object'&&!argument.id&&!argument.nodes?JSON.stringify(argument):argument;if(!entry.has(key))entry.set(key,new Map());entry=entry.get(key);}if(!entry.has(resultKey))entry.set(resultKey,original(...args));return entry.get(resultKey);};
 }
 try{return renderView();}finally{for(const [name,original]of originals)W[name]=original;}
}
function fitTextareas(fields){
 const rows=[...fields].filter(el=>el.tagName==='TEXTAREA'&&!el.classList.contains('prose')&&el.getClientRects().length&&el.clientWidth>0);
 for(const el of rows)el.style.height='auto';
 const heights=rows.map(el=>Math.ceil(el.scrollHeight+el.offsetHeight-el.clientHeight));
 rows.forEach((el,i)=>{el.style.height=Math.max(24,heights[i])+'px';});
}
