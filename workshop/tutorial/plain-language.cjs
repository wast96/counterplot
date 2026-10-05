module.exports=p=>{
 const rows={
 snake:['Rescue Sokolov.','Trusts The Boss.','Extract Sokolov.','Follows his mission orders.','Close-quarters combat, stealth, and field survival.','No eye injury at the start.','Interested in food, films, and equipment.','FOX, United States.','Jack; codename Naked Snake.'],
 boss:['Recover the Philosophers’ Legacy.','The defection is a cover.','Accepts orders that require personal sacrifice.','Infiltrate Volgin’s operation and recover the Legacy.','Expert in close-quarters combat; trained Snake.','Respected American soldier.','Led the Cobra Unit during World War II.'],
 eva:['Obtain the Philosophers’ Legacy for China.','Uses EVA with Snake and Tatyana at Groznyj Grad.','Chinese operative.','Uses false identities to gain access.','Infiltration, motorcycle riding, and escape planning.','Uninjured at the start.','Helps Snake while concealing her assignment.'],
 ocelot:['Defeat Snake in a duel.','Shows off his pistol skills.','Makarov pistol.','ADAM; secretly reports to the CIA.','Wants Snake to recognize his skill.'],
 volgin:['Use the Shagohod and the Legacy to increase his power.','Uses intimidation and torture.','Generates and channels electricity.','Controls the Philosophers’ Legacy.'],
 sokolov:['Escape and reunite with his family.','Designed the Shagohod.','Forced to develop weapons for Volgin.'],
 zero:['Complete the mission and protect FOX.','Directs Snake by radio.'],paramedic:['Provides medical advice by radio.','Discusses films with Snake.'],sigint:['Advises Snake about weapons and equipment.','Practical and technically knowledgeable.'],granin:['Wants his weapons design adopted.','Designed a walking tank called Metal Gear.','Resents the selection of Sokolov’s Shagohod.'],raikov:['GRU officer at Groznyj Grad.','Volgin’s lover and favored officer.','Snake uses his uniform and a matching mask.']};
 for(const c of p.characters){if(rows[c.id])c.blocks.forEach((b,i)=>{b.text=rows[c.id][i];b.detail='';});}
 const notes={snake:'His belief and value blocks are interpretations of his behavior, not dialogue from the game. The outline ends in 1964.',boss:'Her defection is a cover from the beginning. The nuclear launch changes her orders: she must also die so the United States can deny responsibility.',eva:'Her Chinese assignment precedes her meeting with Snake. The recording reveals it; she does not change employers at that moment.',ocelot:'The final call identifies him as ADAM and a CIA operative. Snake does not hear the call.',volgin:'Commands the fortress and controls Sokolov’s weapons work.',sokolov:'MGS3 presents him as apparently killed during the interrogation. Later games are outside this tutorial’s scope.',zero:'Sets objectives and explains the political consequences of failure.',paramedic:'Supports treatment, food identification, and saving; optional calls include film discussions.',sigint:'Joins the support team for Operation Snake Eater.',granin:'Gives Snake information about Sokolov’s location after discussing his rejected design.',raikov:'Ivan Raidenovitch Raikov is a separate character from Raiden. His uniform and appearance allow Snake to enter restricted areas; Volgin detects the impersonation.'};
 for(const c of p.characters){if(notes[c.id])c.notes=notes[c.id];for(const r of c.references||[])if(r.id==='snake-image'){r.title='Snake during Virtuous Mission';r.note='Official screenshot of Snake’s first insertion. Image © Konami.';}}
 const changes={
 's-belief-bridge':['The Boss is working against my mission.','She attacks Snake and takes Sokolov.'],
 's-want-orders':['Complete Operation Snake Eater.','Zero gives Snake new orders after the failed rescue.'],
 's-health':['Right eye lost during interrogation.','Ocelot’s gun fires near Snake’s eye when Snake intervenes to protect EVA.'],
 's-duty-retire':['','Sokolov appears to have been killed; Snake can no longer carry out the rescue.'],
 's-belief-tape':['The Boss was following American orders.','EVA’s recording explains the cover operation.'],
 's-name-gained':['Big Boss','The president awards him the title after the mission.'],
 's-value-grave':['Honors The Boss despite her official condemnation.','Interpretation based on Snake’s visit and salute at her grave.'],
 'b-reputation':['Publicly identified as a defector.','She announces her defection as part of the operation.'],
 'b-duty':['Recover the Legacy and allow Snake to kill her.','Her death is required to clear the United States after Volgin’s nuclear attack.'],
 'b-fate':['Killed by Snake at Rokovoj Bereg.','Snake shoots her after their final fight.'],
 'e-body':['Injured in the motorcycle crash.','Snake treats her and helps her through the forest.'],
 'e-cover-retired':['','She leaves Snake a recording explaining her real assignment.'],
 'o-tools':['Revolvers.','He switches weapons after Snake criticizes his automatic-pistol technique.'],
 'o-method':['Uses revolvers in his next duel with Snake.','His equipment and technique change, but he continues challenging Snake.']};
 for(const c of p.characters)for(const x of c.changes){if(changes[x.id]){if(x.block){x.block.text=changes[x.id][0];x.block.detail='';}x.reason=changes[x.id][1];}}
 const world={tsel:'Soviet territory where both missions take place. The route includes forests, caves, mountains, and military facilities.',rassvet:'Ruined factory. Snake finds Sokolov here during Virtuous Mission and meets EVA here during Operation Snake Eater.',grad:'Volgin’s fortress. Contains the weapons laboratory, interrogation room, and prison.',flowers:'Lakeside flower field where Snake fights The Boss.',shagohod:'Sokolov’s mobile nuclear-launch weapon. Snake is ordered to destroy it. It is distinct from Granin’s walking-tank design.',legacy:'Secret funds controlled by Volgin. Microfilm contains records needed to recover them. The Boss, EVA, and Ocelot have assignments involving the funds.',patriot:'The Boss’s firearm. Snake uses it to kill her after their final fight.',cobras:'The Boss led this special forces unit during World War II. Members: The Pain, The Fear, The End, The Fury, and The Sorrow. The Sorrow is already dead in 1964 and appears as a spirit.',survival:'Stamina requires food. Injuries require treatment. Camouflage and terrain affect detection.',coldwar:'Volgin uses an American nuclear weapon on Soviet soil. The United States must demonstrate that it did not authorize the attack.',radio:'Major Zero directs the mission. Para-Medic provides medical and save support. Sigint advises on equipment during Operation Snake Eater.'};
 for(const w of p.world)if(world[w.id])w.notes=world[w.id];
 const relationships={
 'snake-boss':['Instructor and student','The Boss trained Snake. His second mission requires him to kill her. EVA later explains that The Boss was following American orders.'],
 'snake-eva':['Allies with different assignments','EVA helps Snake complete his mission while secretly seeking the Legacy for China.'],
 'snake-ocelot':['Repeated opponents','Ocelot repeatedly challenges Snake and adopts revolvers after his criticism.'],
 'boss-volgin':['Undercover alliance','The Boss pretends to defect to gain access to Volgin and the Legacy. His nuclear launch changes her assignment.'],
 'sokolov-volgin':['Scientist and captor','Volgin forces Sokolov to develop the Shagohod. Sokolov wants to escape.'],
 'granin-sokolov':['Competing weapons designers','Granin resents the rejection of his design in favor of Sokolov’s Shagohod.'],
 'volgin-raikov':['Lovers','Volgin favors Raikov. Snake exploits Raikov’s access by using his uniform and a mask.']};
 for(const c of p.connections)if(relationships[c.id]){[c.label,c.notes]=relationships[c.id];}
 for(const r of p.references){if(r.id==='source-craft')r.note='Openings describe the starting situation. Closings describe the result. Notes explain context, player-dependent alternatives, or the MICE classification. Character blocks contain traits and facts; timed changes record when those facts change.';if(r.id==='source-last')r.note='Official screenshot of Snake visiting The Boss’s grave. Image © Konami.';}
 for(const n of p.nodes)for(const r of n.references||[])if(r.image)r.note='Official MGS3 screenshot from Konami’s story recap. Image © Konami.';
};
