/* Read projections are shared for one render only. Edits never see cached state. */
function withStoryReadCache(renderView){
 const originals=new Map(),resultKey=Symbol();
 for(const name of ['events','ordered','plotView','children','descendants','characterState','characterHistory','stateAt','characterArc','arcStateOptions','openThreadContext','pieceChanges','recordedThreadStates']){
  const original=W[name],cache=new Map();if(!original)continue;originals.set(name,original);
  W[name]=(...args)=>{let entry=cache;for(const argument of args){const key=argument&&typeof argument==='object'&&!argument.id&&!argument.nodes?JSON.stringify(argument):argument;if(!entry.has(key))entry.set(key,new Map());entry=entry.get(key);}if(!entry.has(resultKey))entry.set(resultKey,original(...args));return entry.get(resultKey);};
 }
 try{return renderView();}finally{for(const [name,original]of originals)W[name]=original;}
}
const compactFieldSelector='textarea.story-field-text,textarea[data-arc-inline],textarea[data-beat-inline],textarea[data-piece-state]';
const inlineFieldMeasure=document.createElement('canvas').getContext('2d');
function compactFieldWidth(el){
 if(!el.matches(compactFieldSelector))return null;
 const style=getComputedStyle(el),spacing=parseFloat(style.letterSpacing)||0;
 inlineFieldMeasure.font=style.font||`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
 const tabWidth=inlineFieldMeasure.measureText(' ').width*(parseFloat(style.tabSize)||8);
 const widths=(el.value||el.placeholder||'').split(/\r?\n/).map(line=>{
  let width=0;const parts=line.split('\t');
  parts.forEach((part,index)=>{if(index)width=(Math.floor(width/tabWidth)+1)*tabWidth;width+=inlineFieldMeasure.measureText(part).width+Array.from(part).length*spacing;});
  return width;
 });
 const inset=['paddingLeft','paddingRight','borderLeftWidth','borderRightWidth'].reduce((sum,key)=>sum+(parseFloat(style[key])||0),0);
 // Measure the actual font, keeping only a small allowance for the caret.
 return Math.max(24,Math.ceil(Math.max(0,...widths)+inset+2))+'px';
}
function fitTextareas(fields){
 const rows=[...fields].filter(el=>el.tagName==='TEXTAREA'&&!el.classList.contains('prose')&&el.getClientRects().length&&el.clientWidth>0);
 const widths=rows.map(compactFieldWidth);
 rows.forEach((el,i)=>{if(widths[i])el.style.setProperty('--inline-field-width',widths[i]);});
 for(const el of rows)el.style.height='auto';
 const heights=rows.map(el=>Math.ceil(el.scrollHeight+el.offsetHeight-el.clientHeight));
 rows.forEach((el,i)=>{el.style.height=Math.max(24,heights[i])+'px';});
}
document.fonts?.addEventListener('loadingdone',()=>fitTextareas($$(compactFieldSelector)));
