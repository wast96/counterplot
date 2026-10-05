// A MICE-led teaching edition. The original browser save keeps its own key.
module.exports=(p,W,img,ref)=>{
 const by=id=>p.nodes.find(n=>n.id===id);
 const specs={
 drop:['M','jungle','The first incursion','A lone operative enters hostile territory to extract Sokolov.','The rescue collapses. Snake leaves injured; the crisis follows him home.'],
 bridge:['C','drop','Trust breaks at the bridge','Snake relies on his mentor and expects to complete the rescue.','The Boss defeats him and takes Sokolov. Trust becomes apparent betrayal.'],
 revolvers:['C','crisis','Ocelot learns from his rival','Pride meets a practical criticism of his weapon technique.','Revolvers make Snake’s influence visible. His competitive pride remains.'],
 capture:['I','crisis','How can Snake reach Sokolov?','A guarded fortress keeps the scientist beyond reach.','Raikov’s uniform and the mask give access. Volgin exposes the impersonation.'],
 torture:['M','crisis','Inside captivity—and out','Captured and disarmed in Groznyj Grad. Escape looks remote.','Snake escapes the prison and survives the river encounter. His eye and the rescue hope are lost.'],
 resupply:['I','crisis','Can EVA get him back into the fight?','Escape has left Snake without his equipment. Where is his help?','Behind the waterfall, EVA returns the equipment and supplies C3.'],
 'flowers-scene':['C','crisis','The student must defeat his mentor','Training has never made Snake able to overcome The Boss. Now the mission demands it.','He wins the final fight and fires the shot. Achievement becomes loss.']
 };
 const keep=new Set(['loyalty','inquiry','jungle','crisis',...Object.keys(specs),'escort','award','call']);
 const groups={drop:['sokolov-meeting'],crisis:['nuke','orders','return','eva-meeting','pain','granin-meeting','fear-end','mountains','sabotage','chase'],torture:['sorrow'],jungle:['escape'],inquiry:['tape'],loyalty:['grave']};
 for(const [target,ids] of Object.entries(groups))for(const id of ids){const source=by(id);by(target).notes+='\n\n'+source.title.replace(/^\d+ · /,'').toUpperCase()+'\n'+source.opening+'\n'+source.notes;by(target).cast=[...new Set([...by(target).cast,...source.cast])];by(target).worldIds=[...new Set([...by(target).worldIds,...source.worldIds])];if(source.references)by(target).references=[...(by(target).references||[]),...source.references];}
 for(const [id,[type,parentId,title,opening,closing]] of Object.entries(specs)){Object.assign(by(id),{type,parentId,title,opening,closing,status:'planned'});}
 by('drop').writingStatus='draft';
 by('escort').title='Optional beat · Carry the alliance';by('award').title='Optional beat · The title';
 by('inquiry').closing='EVA’s tape reveals her cover and The Boss’s true assignment.\nSnake learns the truth after carrying out its cost.';
 by('loyalty').closing='The title Big Boss is public. The salute at her grave is private.\nA decorated soldier; a grieving student.';
 by('jungle').closing='Ocelot challenges Snake aboard the aircraft.\nSnake and EVA escape. Leaving cannot undo the mission.';
 by('crisis').notes+='\n\nSTRUCTURE\nUse the notes above as material for the Event thread’s prose. A separate card for every encounter is optional.';
 const timings={'orders:open':'crisis:open','bridge:open':'bridge:close','revolvers:open':'revolvers:close','torture:open':'torture:close','tape:open':'inquiry:close','flowers-scene:open':'flowers-scene:close'};
 for(const c of p.characters)for(const x of c.changes)x.at=timings[x.at]||x.at;
 p.nodes=p.nodes.filter(n=>keep.has(n.id));
 const raikov={...W.character('Raikov'),id:'raikov',identity:'GRU major · Volgin’s favored officer',color:'purple',notes:'Ivan Raidenovitch Raikov.\nHis rank, appearance, and access make him useful to Snake’s disguise.\nHe is a separate character from Raiden.'};
 raikov.blocks=[['raikov-role','allegiance','GRU · Groznyj Grad','His uniform carries authority inside the fortress.'],['raikov-access','relationship','Protected by Volgin’s favor.','A personal relationship gives him unusual freedom.'],['raikov-mask','appearance','The face Snake can impersonate.','The mask and stolen uniform get Snake to Sokolov; they do not fool Volgin.']].map(([id,kind,text,detail])=>({...W.block(kind,text),id,detail}));
 p.characters.push(raikov);by('capture').cast.push('raikov');p.connections.push({id:'volgin-raikov',a:'volgin',b:'raikov',label:'Favor becomes access',notes:'Volgin’s favored lover enjoys unusual authority. Snake exploits Raikov’s uniform and appearance, but Volgin recognizes the imposture.',color:'purple'});
 const gallery='https://www.spriters-resource.com/pc_computer/metalgearsoliddsnakeeater/asset/481808/';
 const files={snake:'SnakeVM',boss:'BossSE',eva:'EvaRider',ocelot:'Ocelot',volgin:'Volgin',sokolov:'Sokolov',zero:'Zero',paramedic:'Paramedic',sigint:'Sigint',granin:'Granin',raikov:'Raikov'};
 for(const c of p.characters){c.portrait=img('delta/CharacterIcon_'+files[c.id]+'.png');c.references||=[];c.references.push(ref('delta-'+c.id,'Delta character portrait',gallery,'Character Viewer image from Metal Gear Solid Δ: Snake Eater (2025). Game art © Konami; asset listing contributed by vi7ual.'));}
 p.references.push(ref('delta-portraits','Delta portraits & Raikov',gallery,'Faces from the remake’s Character Viewer. Art © Konami.\nRaikov background: https://metalgear.fandom.com/wiki/Ivan_Raidenovitch_Raikov'));
 p.id='mgs3-tutorial-v2';p.title='MGS3 · MICE edition';
 p.subtitle='MICE-led edition · 1964 · Full-story spoilers. Threads carry the story; beats are optional.';
};
