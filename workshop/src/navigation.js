/* View location belongs to this tab and owner, independently of saved writing. */
const viewKey='counterplot.view.v1.'+(CounterplotAccount.user||'device')+'.'+MAIN_KEY;
let restoringView=false,viewLocation='';
function currentView(){return {owner:CounterplotAccount.user,project:workspace.active,page:ui.page,mode:ui.mode,sceneId:ui.sceneId||'',selected:ui.selected,character:ui.character,at:ui.at,plot:ui.plot,folded:[...ui.folded]};}
function applyView(value){
 if(!value||value.owner!==CounterplotAccount.user||!workspace.projects.some(p=>p.id===value.project))return false;
 workspace.active=value.project;
 for(const key of ['sceneId','selected','character','at','plot'])if(typeof value[key]==='string')ui[key]=value[key];
 if(['outline','characters','world','connections','archive'].includes(value.page))ui.page=value.page;
 if(['outline','chronology','sequence','refine','board'].includes(value.mode))ui.mode=value.mode;
 ui.folded=new Set(Array.isArray(value.folded)?value.folded.filter(id=>p().nodes.some(n=>n.id===id)):[]);return true;
}
function rememberView(){
 if(sessionMode||window.__COUNTERPLOT_STUDIO__||restoringView)return;
 const value=currentView(),location=[value.project,value.page,value.mode,value.sceneId].join(':');
 try{sessionStorage.setItem(viewKey,JSON.stringify(value));if(viewLocation&&viewLocation!==location)window.history.pushState({counterplot:value},'');else window.history.replaceState({counterplot:value},'');}catch{}
 viewLocation=location;
}
if(!sessionMode&&!window.__COUNTERPLOT_STUDIO__)try{applyView(window.history.state?.counterplot||JSON.parse(sessionStorage.getItem(viewKey)||'null'));}catch{}
window.addEventListener('popstate',event=>{
 if(sessionMode||!event.state?.counterplot)return;
 finishEdit();if($('#dialog').open)closeDialog();restoringView=true;
 try{if(applyView(event.state.counterplot)){viewLocation='';render();$('#main')?.focus({preventScroll:true});}}finally{restoringView=false;rememberView();}
});
actions['toggle-sidebar']=()=>{ui.sidebarCollapsed=!ui.sidebarCollapsed;try{localStorage.setItem('counterplot.sidebar.collapsed',String(ui.sidebarCollapsed));}catch{}render();$('[data-action=toggle-sidebar]')?.focus({preventScroll:true});};
try{ui.sidebarCollapsed=localStorage.getItem('counterplot.sidebar.collapsed')==='true';}catch{}
