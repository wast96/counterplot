/* One-time cleanup requested for the tutorial shelf only. */
(()=>{try{
 const el=document.getElementById('embedded-workspace'),fresh=JSON.parse(el.textContent),key=fresh.saveKey;
 const raw=localStorage.getItem(key),previous=raw?Workshop.validate(JSON.parse(raw)):fresh;
 if(previous.tutorialShelfVersion===1)return;
 const revised=previous.projects.find(p=>p.id===fresh.projects[0].id);
 const data=revised?previous:fresh;
 data.projects=[revised||fresh.projects[0]];data.active=data.projects[0].id;data.tutorialShelfVersion=1;
 Workshop.validate(data);localStorage.setItem(key,JSON.stringify(data));el.textContent=JSON.stringify(data);
}catch{/* An unreadable save is handled by the app's recovery UI. */}})();
