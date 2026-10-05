/* Declarative popup content, shared by rendering, validation and direct editing.
 * Built-in sources keep their original text fields; removing a view never erases
 * that authored text. Custom sections carry their own copy and stable identity. */
const TutorialSections=(()=>{
 const copy=x=>JSON.parse(JSON.stringify(x));
 const kinds=['writeup','explanation','action','sample','text'];
 const defaults=[
  {id:'writeup',kind:'writeup',title:'Writeup',heading:false,collapsible:false,expanded:true,children:[]},
  {id:'how',kind:'explanation',title:'How this works',heading:true,collapsible:true,expanded:true,children:[{id:'sample',kind:'sample',title:'Sample wording',heading:true,collapsible:false,expanded:true,children:[]}]},
  {id:'action',kind:'action',title:'Action',heading:true,collapsible:false,expanded:true,children:[]}
 ];
 function flatten(list,depth=0,parent=''){return list.flatMap(s=>[{section:s,depth,parent},...flatten(s.children||[],depth+1,s.id)]);}
 function find(list,id){for(const s of list){if(s.id===id)return s;const child=find(s.children||[],id);if(child)return child;}return null;}
 function location(list,id,parent=''){for(let i=0;i<list.length;i++){if(list[i].id===id)return {list,index:i,parent};const child=location(list[i].children||[],id,list[i].id);if(child)return child;}return null;}
 function validate(list){
  if(!Array.isArray(list))throw Error('Popup sections must be a list.');const seen=new Set();let count=0;
  function walk(items,depth){if(items.length&&depth>3)throw Error('Use no more than four levels of popup sections.');for(const s of items){
   if(!s||typeof s!=='object'||Array.isArray(s)||!kinds.includes(s.kind))throw Error('Choose a supported popup section type.');
   if(!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}$/.test(s.id)||seen.has(s.id))throw Error('Popup section IDs must be unique.');seen.add(s.id);if(++count>40)throw Error('Use at most 40 popup sections.');
   if(typeof s.title!=='string'||s.title.length>160)throw Error('A section heading must be text, up to 160 characters.');
   if(s.text!==undefined&&(typeof s.text!=='string'||s.text.length>20000))throw Error('Section text must be at most 20,000 characters.');
   for(const k of ['heading','collapsible','expanded'])if(typeof s[k]!=='boolean')throw Error('Section '+k+' must be true or false.');
   if(s.collapsible&&!s.heading)throw Error('A collapsible section needs a visible heading.');
   if(!Array.isArray(s.children))throw Error('Subsections must be a list.');walk(s.children,depth+1);
  }}walk(list,0);return list;
 }
 function create(list,kind='text'){const used=new Set(flatten(list).map(x=>x.section.id));let id='section',i=1;while(used.has(id))id='section-'+i++;
  return {id,kind,title:({text:'New section',writeup:'Writeup',explanation:'How this works',sample:'Sample wording',action:'Action'})[kind],text:kind==='text'?'Write here…':'',heading:kind!=='writeup',collapsible:kind==='explanation',expanded:true,children:[]};}
 function move(list,id,target,inside=false){
  if(id===target)return false;const src=location(list,id),dest=target?location(list,target):null;if(!src||target&&!dest)return false;
  if(target&&find([src.list[src.index]],target))throw Error('A section cannot go inside itself.');
  const before=copy(list),item=src.list.splice(src.index,1)[0];
  const at=target?location(list,target):null;
  if(!at)list.push(item);else if(inside)at.list[at.index].children.push(item);else at.list.splice(at.index,0,item);
  try{validate(list);}catch(e){list.splice(0,list.length,...before);throw e;}return true;
 }
 function remove(list,id){const at=location(list,id);return at?at.list.splice(at.index,1)[0]:null;}
 return {defaults,kinds,copy,flatten,find,location,validate,create,move,remove};
})();
if(typeof module!=='undefined')module.exports=TutorialSections;
