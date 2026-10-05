const W=require('../src/core.js'),fs=require('node:fs'),path=require('node:path');
const primary='https://eu-support.konami.com/hc/en-gb/articles/9731056113303-Backstory-What-is-the-story-of-Metal-Gear-Solid-3-Snake-Eater';
const sources={story:primary,boss:'https://metalgear.fandom.com/wiki/The_Boss',snake:'https://metalgear.fandom.com/wiki/Big_Boss',ocelot:'https://en.wikipedia.org/wiki/Revolver_Ocelot',eva:'https://metalgear.fandom.com/wiki/EVA',sorrow:'https://metalgear.fandom.com/wiki/The_Sorrow',end:'https://metalgear.fandom.com/wiki/The_End',mission:'https://metalgear.fandom.com/wiki/Operation_Snake_Eater',sokolov:'https://metalgear.fandom.com/wiki/Nikolai_Stepanovich_Sokolov',deltaPortraits:'https://www.spriters-resource.com/pc_computer/metalgearsoliddsnakeeater/asset/481808/',raikov:'https://www.pcgamesn.com/metal-gear-solid-delta/raikov',walkthrough:'https://www.gamespot.com/articles/metal-gear-solid-3-snake-eater-walkthrough/1100-6114610/'};
const img=file=>'data:image/png;base64,'+fs.readFileSync(path.join(__dirname,'assets',file)).toString('base64');
const ref=(id,title,url,note='',image='')=>({id,title,url,note,image});
const p=W.project('MGS3 · The cost of loyalty');p.id='mgs3-tutorial';p.subtitle='1964. A rescue mission fails. A student is sent to kill his mentor. Full-story spoilers.';
p.references=[
 ref('source-main','Start here · story & scope',primary,'Metal Gear Solid 3: Snake Eater (2004). Full spoilers, including the ending and post-credits call.\n\nThis is a selective story outline, not a room-by-room walkthrough. MICE structure, motives, and block wording are teaching interpretations. Later games’ revelations are outside this project.'),
 ref('source-craft','How to read these cards','','Scene plans: beats and turns.\nCharacter blocks: short, playable traits.\nDetail fields: context and limits.\nChanges: what becomes different, and why.\nNotes: interpretation or a writing prompt.\n\nA secret in a character profile is author knowledge. It is not automatically known to Snake.'),
 ref('source-canon','Canon checks & sources',sources.mission,'Checked against Konami’s story recap, the cited character/mission pages, and a contemporary MGS3 walkthrough.\n\nSokolov: treated as apparently killed, as presented here in MGS3.\nThe Sorrow: the procession depends partly on player choices.\nThe End: this outline follows the standard duel; the game allows alternatives.\nOcelot: the final call is an audience-only reveal.\n\nNo game dialogue is reproduced. Scene prose is an original writing exercise.'),
 ref('source-still','Visual reference · the first insertion',primary,'Official MGS3 screenshot from Konami’s story recap.\nNotice the vertical trees, equipment weight, and low viewpoint.\nUse references to collect choices a scene can express. Image © Konami.'),
 ref('source-last','Visual reference · the salute',primary,'Official MGS3 screenshot from Konami’s story recap.\nA public uniform; a private act of mourning.\nThe frame gives the character ending a visible action. Image © Konami.')
];
const makeChar=(id,name,identity,color,rows,notes='')=>{const c={...W.character(name),id,identity,color,notes};c.blocks=rows.map(([bid,kind,text,detail='',pinned=false,label=''])=>({...W.block(kind,text),id:bid,detail,pinned,label}));p.characters.push(c);return c};
const snake=makeChar('snake','Naked Snake','FOX operative · The Boss’s student','jungle',[
 ['snake-want','want','Bring Sokolov out alive.','The Virtuous Mission gives him a concrete task.',true],
 ['snake-belief','belief','The Boss is someone I can trust.','Interpretive shorthand for the bond tested throughout the story.',true],
 ['snake-duty','obligation','Extract Sokolov.','Keep the rescue objective visible even as the mission expands.'],
 ['snake-value','value','Honor the mission.','A starting value to put under pressure.',true],
 ['snake-skill','capability','CQC. Stealth. Improvisation.','Training shared with The Boss does not make him her equal yet.'],
 ['snake-body','health','Both eyes intact.','Physical state belongs on the timeline too.'],
 ['snake-joy','joy','Food questions. Film talk. Gear.','Radio conversations let him be curious, funny, and unguarded.'],
 ['snake-role','allegiance','FOX · United States','An affiliation. It does not explain every private feeling.'],
 ['snake-name','alias','Jack · Naked Snake','This is the future Big Boss, not Solid Snake.']
],'Read the belief/value changes as one interpretation of his arc.\nThe final salute supports grief and disillusionment; it does not make every later Big Boss decision inevitable.');
snake.references=[ref('snake-reading','Character context',sources.snake,'Keep the tutorial’s scope in 1964. Later entries on this page go beyond MGS3.'),ref('snake-image','A physical starting point',primary,'The original insertion. Equipment, posture, and setting can supply scene details. Image © Konami.',img('virtuous-mission.png'))];
const boss=makeChar('boss','The Boss','Mentor · soldier · apparent defector','bone',[
 ['boss-want','want','Complete the hidden mission.','Recover the Philosophers’ Legacy from Volgin.',true],
 ['boss-secret','secret','The defection is a cover.','Author knowledge from the start. Snake learns the truth much later.',true],
 ['boss-value','value','Loyalty beyond personal credit.','Interpretation: her conviction stays steadier than her public reputation.'],
 ['boss-duty','obligation','Gain Volgin’s trust. Recover the Legacy.','Her original assignment. The nuclear launch changes what is demanded of her.'],
 ['boss-skill','capability','CQC mastery. Command presence.','She can stop Snake quickly. Repeated defeats establish the gap.'],
 ['boss-reputation','reputation','Decorated American soldier.','Public identity, tracked separately from her private allegiance.'],
 ['boss-history','experience','War, loss, and a divided world.','Her final account puts the current mission inside a lifetime of sacrifice.']
],'Do not model the twist as “she becomes loyal at the end.”\nHer allegiance is concealed; Snake’s understanding changes.');
boss.references=[ref('boss-reading','The Boss · mission context',sources.boss,'Focus on the Virtuous Mission and Operation Snake Eater sections. Later-series explanations are outside this exercise.')];
const eva=makeChar('eva','EVA','Contact · rider · operative under several covers','ember',[
 ['eva-want','want','Get the Legacy for China.','Her hidden objective precedes her meeting with Snake.',true],
 ['eva-cover','alias','EVA to Snake. Tatyana inside the base.','The claimed KGB connection is a cover.'],
 ['eva-secret','secret','Chinese operative.','Author knowledge; not a late change of allegiance.',true],
 ['eva-method','method','Blend access, charm, and misdirection.','Use the role each person expects her to play.'],
 ['eva-skill','capability','Infiltration. Motorcycles. Escape routes.','Practical help makes the alliance work.'],
 ['eva-body','health','Able to keep moving.','Later injury changes who must support whom.'],
 ['eva-tension','contradiction','A false identity. Help that matters.','Interpretation: deception and care can occupy the same relationship.']
],'Her departure reveals the assignment. It does not erase the aid she gave Snake.');
eva.references=[ref('eva-reading','EVA · cover and allegiance',sources.eva,'Use this to check identity details; avoid importing later-game history into her 1964 blocks.')];
const ocelot=makeChar('ocelot','Ocelot','Young rival · hidden operative','steel',[
 ['ocelot-want','want','Beat Snake. Make it count.','Interpretive motive for the repeated challenges.',true],
 ['ocelot-method','method','Showy handling. Unproven technique.','His first confrontation exposes a gap between style and experience.',true],
 ['ocelot-weapon','possession','Makarov pistol.','Snake’s criticism becomes a visible equipment change.'],
 ['ocelot-secret','secret','ADAM. A CIA allegiance behind other roles.','Kept separate from what Snake knows. The final call supplies the audience reveal.'],
 ['ocelot-pride','belief','Skill must be seen.','Interpretation: admiration begins to complicate the rivalry.']
],'Avoid turning every later Ocelot plot into a 1964 motive. This project stops at MGS3’s final call.');
ocelot.references=[ref('ocelot-reading','Ocelot · identities',sources.ocelot,'The MGS3 section supports the post-credits identity reveal.')];
makeChar('volgin','Volgin','GRU colonel · coercive power','rust',[
 ['volgin-want','want','Turn weapons and wealth into power.','The Shagohod and Legacy serve his ambition.',true],
 ['volgin-method','method','Terror. Torture. Escalation.','His force creates the crisis others must contain.',true],
 ['volgin-power','capability','A body that channels electricity.','A fantastical ability inside the espionage setting.'],
 ['volgin-resource','status','Controls the Legacy’s hidden wealth.','Resources belong on a character when they shape what that person can do.']
]);
makeChar('sokolov','Sokolov','Weapons scientist · extraction target','blue',[
 ['sokolov-want','want','Escape. Reach his family.','The person at the center of the rescue has his own stake.',true],
 ['sokolov-work','work','Designer of the Shagohod.','Expertise makes him valuable and keeps him trapped.'],
 ['sokolov-pressure','obligation','Work under Volgin’s coercion.','Pressure from someone else, not enthusiasm for the weapon.']
]);
makeChar('zero','Major Zero','Mission command · FOX','green',[
 ['zero-want','want','Complete the operation. Protect FOX.','Mission failure also threatens the unit.',true],
 ['zero-method','method','Briefings, objectives, radio guidance.','A remote character can still create pressure.']
]);
makeChar('paramedic','Para-Medic','Medical support · conversational warmth','rose',[
 ['pm-work','work','Keep Snake alive.','Healing advice gives practical support a human voice.',true],
 ['pm-joy','joy','Movies. Long conversations about them.','An optional detail that changes the texture of radio calls.']
]);
makeChar('sigint','Sigint','Equipment specialist · radio support','gold',[
 ['sigint-work','work','Explain the tools. Spot the limits.','His expertise joins the support team for Operation Snake Eater.',true],
 ['sigint-voice','voice','Practical, knowledgeable, dry.','A writing interpretation of his radio presence.']
]);
makeChar('granin','Granin','Weapons designer · displaced rival','purple',[
 ['granin-want','want','See his design taken seriously.','Resentment opens a route to useful information.',true],
 ['granin-work','work','A walking tank concept: Metal Gear.','Do not call Sokolov’s Shagohod a Metal Gear.'],
 ['granin-regret','regret','His project lost to Sokolov’s.','Professional envy can move the plot.']
]);
const world=(id,name,type,notes,color='')=>{p.world.push({id,name,type,notes,color})};
world('tsel','Tselinoyarsk','place','1964 · Soviet territory\nForest, swamp, mountains, guarded facilities.\n\nUse: a route that demands adaptation, not just a backdrop.','jungle');
world('rassvet','Rassvet','place','Ruined factory.\nFirst: Sokolov and Ocelot.\nReturn: EVA and another challenge.\n\nUse: revisit a place with changed expectations.','jungle');
world('grad','Groznyj Grad','place','Volgin’s fortress.\nThe Shagohod, interrogation room, prison, and sabotage target.\n\nUse: the same location can support several kinds of scene.','steel');
world('flowers','Rokovoj Bereg','place','White flowers beside the lake.\nThe final confrontation with The Boss.\n\nUse: a restrained setting that leaves room for the human cost.','bone');
world('shagohod','The Shagohod','object','Sokolov’s nuclear launch vehicle.\nVolgin’s threat. Snake’s sabotage target.\n\nA different design from Granin’s walking Metal Gear concept.','rust');
world('legacy','The Philosophers’ Legacy','fact','Hidden international funds.\nA microfilm holds records needed to find them.\n\nSeveral operations converge on the same prize. The final call reveals the recovery is incomplete.','gold');
world('patriot','The Patriot','object','The Boss’s weapon.\nUsed by Snake for the final shot.\n\nUse: an object can pass from practical tool to emotional burden.','bone');
world('cobras','The Cobra Unit','group','The Boss’s former comrades.\nThe Pain · The Fear · The End · The Fury.\nThe Sorrow returns as a spectral encounter.\n\nUse: each encounter can test a different kind of attention.','green');
world('survival','Survival has a cost','rule','Food supports stamina.\nInjuries need care.\nCamouflage and patience matter.\n\nUse: let the body and environment shape choices.','jungle');
world('coldwar','The Cold War crisis','fact','An American-made nuclear weapon detonates on Soviet soil.\nPublic evidence matters as much as private intent.\n\nUse: political pressure turns a rescue into a sacrifice.','rust');
world('radio','The radio team','group','Zero: objectives.\nPara-Medic: health and conversation.\nSigint: equipment.\n\nUse: support characters provide expertise, personality, and pressure.','blue');
p.world.find(w=>w.id==='flowers').references=[ref('flowers-ref','Compare the final images',primary,'The flower field and the grave give the ending two visual settings. The linked recap shows the grave, not Rokovoj Bereg. Image © Konami.')];
p.world.find(w=>w.id==='survival').references=[ref('survival-source','MGS3 mechanics walkthrough',sources.walkthrough,'A contemporary guide to stamina, camouflage, injury treatment, and the major encounters.')];
const link=(id,a,b,label,notes,color='')=>p.connections.push({id,a,b,label,notes,color});
link('snake-boss','snake','boss','Student → target → mourner','Snake wants her guidance.\nThe Boss must complete an assignment she cannot explain.\n\nPressure: obedience to his country requires killing his mentor.\nPayoff: the final truth changes the meaning of the killing.','bone');
link('snake-eva','snake','eva','Help under a false name','He needs local access and a way out.\nShe needs the Legacy.\n\nTrust grows through action while her identity stays concealed.','ember');
link('snake-ocelot','snake','ocelot','A rivalry that teaches','Ocelot wants another contest.\nSnake keeps exposing the cost of showing off.\n\nVisible echo: changed weapons and growing respect.','steel');
link('boss-volgin','boss','volgin','Access bought with apparent betrayal','Volgin thinks he has gained an ally.\nThe Boss needs proximity to his hidden funds.\n\nHis nuclear launch makes her assignment fatal.','rust');
link('sokolov-volgin','sokolov','volgin','Expertise under coercion','Sokolov wants freedom.\nVolgin wants the weapon finished.\n\nThe scientist’s usefulness is also his trap.');
link('granin-sokolov','granin','sokolov','An uneven professional rivalry','Granin resents the choice of Sokolov’s design.\nSokolov is largely unaware of the hostility.\n\nThat imbalance helps Snake obtain information.');
const n=(id,type,parent,title,opening,closing='',cast=[],worldIds=[],notes='')=>{const x={...W.node(type,parent),id,title,opening,closing,cast,worldIds,notes,status:type==='B'?'open':'planned'};p.nodes.push(x);return x};
n('loyalty','C','','Snake becomes Big Boss','A student who trusts The Boss.\nA soldier who accepts his mission.','A decorated soldier. A grieving student.\nThe title is public; the cost is private.',['snake','boss'],[],'STRUCTURE CHOICE\nThe character promise opens first and closes after the final personal image.\n\nREADING\nThe ending shakes Snake’s trust in command. This is an interpretation of MGS3, not a complete explanation of his later life.');
n('inquiry','I','loyalty','What does The Boss’s loyalty mean?','Her lesson: loyalty follows the mission.\nWhat happens when mentor and country pull apart?','The apparent betrayal was an assignment.\nSnake was made to carry out its final cost.',['snake','boss','eva'],['legacy'],'The opening lesson plants the question. The bridge makes it urgent. EVA’s tape answers it after the escape.\n\nThis is one useful MICE reading, not an official classification of the game.');
n('jungle','M','inquiry','Into Tselinoyarsk—and out','Enemy territory. Limited equipment.\nSurvive by reading the environment.','Snake and EVA escape by aircraft.\nLeaving the territory cannot undo the mission.',['snake','eva'],['tsel','survival'],'This outer milieu covers the operation’s hostile world, including the failed first insertion and the return.\nThe emergency extraction is a temporary exit; the larger story returns here.');
n('drop','B','jungle','01 · The first drop','HALO insertion. Retrieve the pack.\nRadio support establishes the mission.','',['snake','zero','boss','paramedic'],['tsel','radio','survival'],'SCENE JOB\nShow a capable soldier who still listens to his mentor.\n\nTEXTURE\nWeight of equipment. Dense canopy. An unseen voice in the ear.');
n('sokolov-meeting','B','jungle','02 · Sokolov and Ocelot','Find the scientist. Face Ocelot.\nTechnique fails; Snake points out why.','',['snake','sokolov','ocelot'],['rassvet','shagohod'],'TURN\nThe rescue seems achievable. The young rival has something to learn.');
n('bridge','B','jungle','03 · The bridge','The Boss announces her defection.\nShe defeats Snake. Sokolov is taken.','',['snake','boss','sokolov','volgin','ocelot'],['tsel'],'TURN\nThe trusted mentor becomes the apparent enemy.\n\nCHARACTER CONSEQUENCE\nChange Snake’s belief, not The Boss’s true allegiance.');
n('crisis','E','jungle','Contain the nuclear crisis','Volgin fires a US-made nuclear weapon.\nThe failure could become a war.','The Shagohod is destroyed. Volgin is defeated.\nThe Boss is killed to clear America’s name.',['snake','boss','volgin','zero'],['coldwar','shagohod'],'PROMISE\nRestore political stability.\n\nCOST\nThe official solution is devastating for the person carrying it out.');
n('nuke','B','crisis','04 · A stolen warhead','A nuclear blast erases the research facility.\nSnake is extracted; the crisis spreads.','',['snake','volgin','boss'],['coldwar'],'CAUSE → CONSEQUENCE\nVolgin’s unexpected launch changes what The Boss’s mission requires.');
n('orders','B','crisis','05 · New orders','Return to Soviet territory.\nRescue Sokolov. Destroy the Shagohod.\nEliminate Volgin and The Boss.','',['snake','zero','paramedic','sigint'],['radio','coldwar'],'TURN\nThe second assignment puts his mentor on the target list.');
n('return','B','crisis','06 · The mentor blocks the path','The Boss overpowers Snake again.\nShe tells him to leave. He continues.','',['snake','boss'],['tsel'],'CRAFT NOTE\nRepeat the physical imbalance. Save the reversal for the final meeting.');
n('eva-meeting','B','crisis','07 · A contact at Rassvet','EVA arrives in place of the expected contact.\nShe supplies help and an apparent way forward.','',['snake','eva','ocelot'],['rassvet'],'QUESTION\nWhat earns practical trust before identity is proven?\n\nAUTHOR KNOWLEDGE\nHer Chinese assignment is already in her profile.');
n('revolvers','B','crisis','08 · Ocelot changes his tools','Another duel. This time: revolvers.\nThe rivalry starts to show an influence.','',['snake','ocelot'],['tsel'],'PAYOFF\nA changed possession makes an earlier conversation visible.');
n('pain','B','crisis','09 · The Pain','A cave battle against The Pain.\nThe route forward must be earned.','',['snake'],['cobras','tsel'],'SCENE JOB\nChange the encounter’s texture: confined space, water, swarming pressure.');
n('granin-meeting','B','crisis','10 · Granin’s resentment','The wrong scientist; useful information.\nGranin points Snake toward Groznyj Grad.','',['snake','granin'],['shagohod','grad'],'TURN\nProfessional frustration produces a lead.\nThe walking Metal Gear design and Shagohod remain distinct.');
n('fear-end','B','crisis','11 · The Fear, then The End','Ambush gives way to a patient hunt.\nSnake survives the forest’s next tests.','',['snake'],['cobras','survival'],'SELECTED ROUTE\nThis outline uses the standard encounter with The End. The game permits other outcomes.\n\nOPTION\nSplit this compressed card into two scenes if you need more detail.');
n('mountains','B','crisis','12 · The approach to Groznyj Grad','EVA provides the route and disguise plan.\nThe Fury stands between Snake and the fortress.','',['snake','eva'],['grad','cobras'],'PACE\nA breath for information, then another obstacle.');
n('capture','B','crisis','13 · A disguise fails','Find Sokolov inside the base.\nVolgin sees through the disguise. Snake is captured.','',['snake','sokolov','volgin','boss'],['grad','shagohod'],'TURN\nAccess becomes exposure.');
n('torture','B','crisis','14 · The interrogation','Sokolov is apparently killed.\nSnake is tortured; he intervenes to protect EVA.\nOcelot’s gunshot costs Snake his right eye.','',['snake','volgin','boss','eva','ocelot'],['grad','legacy'],'CONTINUITY\nUse a physical-state change here.\nRetire the rescue objective as Snake’s apparent situation changes.\n\nSCOPE\nThis follows MGS3’s presentation of Sokolov’s apparent death, without importing later games.');
n('sorrow','B','crisis','15 · The river of the dead','Escape prison. Leap from the waterfall.\nThe Sorrow confronts Snake with the dead.','',['snake'],['cobras','survival'],'PLAYER VARIATION\nThe procession reflects player actions. Do not invent a fixed list of ordinary soldiers Snake killed.\n\nCRAFT NOTE\nThe past can return as an encounter.');
n('resupply','B','crisis','16 · Help behind the waterfall','EVA returns Snake’s equipment.\nC3 makes a return to the fortress possible.','',['snake','eva'],['grad'],'SCENE JOB\nSupport restores agency. The mission shifts toward sabotage.');
n('sabotage','B','crisis','17 · Sabotage','Plant the charges. Face Volgin.\nThe hangar blast does not finish the threat.','',['snake','volgin','boss','eva','ocelot'],['grad','shagohod','legacy'],'TURN\nA seeming solution launches the chase.');
n('chase','B','crisis','18 · The Shagohod pursuit','EVA drives. Snake fights.\nThe Shagohod is destroyed; Volgin is defeated.','',['snake','eva','volgin'],['shagohod'],'PAIRING\nDifferent abilities let the partners share one action sequence.');
n('escort','B','crisis','19 · Carry the alliance','After the crash, EVA is injured.\nSnake helps her through the forest.','',['snake','eva'],['tsel','survival'],'REVERSAL\nThe guide now needs help. Trust becomes something Snake does.');
n('flowers-scene','B','crisis','20 · The flower field','The Boss gives her final account.\nSnake defeats her. She passes on the microfilm.\nHe fires the final shot.','',['snake','boss'],['flowers','patriot','legacy'],'MOTIVE / KNOWLEDGE\nHe completes the mission before he knows its full meaning.\n\nIMAGE\nWhite petals. A weapon passed from one hand to another.');
n('escape','B','jungle','21 · One last challenge','Ocelot boards the escape aircraft.\nA final contest; then Snake and EVA get away.','',['snake','eva','ocelot'],['tsel'],'MILIEU PAYOFF\nThis closes the long movement into and out of hostile territory.');
n('tape','B','inquiry','22 · EVA’s tape','EVA is gone. Her recording remains.\nHer cover—and The Boss’s real mission—are revealed.','',['snake','eva','boss'],['legacy'],'INQUIRY PAYOFF\nThe answer arrives too late to save The Boss.\n\nDO NOT CHANGE\nEVA’s true allegiance did not begin here. Snake gains knowledge here.');
n('award','B','loyalty','23 · The title','Snake receives the title Big Boss.\nPublic recognition cannot settle the private loss.','',['snake'],[],'GAIN\nAdd a new name/status piece here. Keep Naked Snake in his earlier identity history.');
n('grave','B','loyalty','24 · The salute','At The Boss’s grave, Snake salutes.\nThe personal ending outlasts the official celebration.','',['snake','boss'],[],'CHARACTER PAYOFF\nA visible action carries grief that an award cannot resolve.\n\nREADING\nThe value change attached here is an interpretation, not quoted internal monologue.');
n('call','B','','Coda · Ocelot’s call','The audience learns who ADAM was.\nThe Legacy operation is only partly settled.','',['ocelot'],['legacy'],'AUDIENCE ONLY\nSnake does not hear this call. Do not add its information to his blocks.\n\nSTRUCTURE\nA brief coda follows the completed personal arc.');
p.nodes.find(x=>x.id==='flowers-scene').color='bone';p.nodes.find(x=>x.id==='bridge').color='ember';p.nodes.find(x=>x.id==='tape').color='steel';
p.nodes.find(x=>x.id==='drop').references=[ref('drop-ref','Image · first insertion',primary,'Low angle. Dense canopy. A solitary figure. The image is also saved with Snake’s character references. Image © Konami.')];
p.nodes.find(x=>x.id==='grave').references=[ref('grave-ref','Image · the final salute',primary,'A useful reference for a scene built around one gesture. Image © Konami.',img('salute.png'))];
p.nodes.find(x=>x.id==='tape').references=[ref('tape-ref','Check the reveal',primary,'Review the ending paragraphs for EVA’s assignment and The Boss’s cover mission.')];
p.nodes.find(x=>x.id==='sorrow').references=[ref('sorrow-ref','The encounter and player choices',sources.sorrow,'Use the MGS3 encounter section. The number of ordinary soldiers represented varies.')];
p.nodes.find(x=>x.id==='fear-end').references=[ref('end-ref','Alternate outcomes for The End',sources.end,'The standard duel is a choice for this teaching outline, not the game’s only possible route.')];
const draft=p.nodes.find(x=>x.id==='drop');draft.status='draft';draft.prose='The canopy closed above him.\n\nSnake checked the weight at his belt, then looked up at the pack caught in the branches. For a moment the forest gave him only leaves and distance.\n\nThe radio brought another world into his ear. He listened before he moved.';draft.notes+='\n\nDRAFT EXERCISE\nOriginal sample prose for this tutorial, not game dialogue or a transcript. Keep, rewrite, or clear it.';
function change(c,id,at,bid,text,reason,op='develop',newKind=''){const b=c.blocks.find(b=>b.id===bid)||{...W.block(newKind||'custom'),id:bid};c.changes.push({id,at:at.includes(':')?at:at+':open',blockId:bid,op,block:op==='retire'?null:{...W.copy(b),text},reason});}
change(snake,'s-belief-bridge','bridge','snake-belief','The Boss stands against my mission.','She defeats him and takes Sokolov. Her allegiance appears to have changed.');
change(snake,'s-want-orders','orders','snake-want','Finish Operation Snake Eater.','The failed extraction becomes a larger assignment with his mentor as a target.');
change(snake,'s-health','torture','snake-body','Right eye lost. Injured, still moving.','He intervenes while Ocelot threatens EVA; the gunshot damages his eye.');
change(snake,'s-duty-retire','torture','snake-duty','','Sokolov appears to have been killed. The rescue objective no longer seems possible.','retire');
change(snake,'s-belief-tape','tape','snake-belief','The Boss served the country that condemned her.','EVA’s recording reveals the cover mission and the sacrifice.');
change(snake,'s-name-gained','award','snake-bigboss','Big Boss','The title is awarded after the mission.','add','alias');
change(snake,'s-value-grave','loyalty:close','snake-value','Carry her memory beyond the official story.','Interpretation: the private salute places grief beside the public honor.');
change(boss,'b-reputation','bridge','boss-reputation','Branded a defector.','Her public break with the US is part of the cover.');
change(boss,'b-duty','orders','boss-duty','Complete the mission. Die as its traitor.','After Volgin’s nuclear launch, her death is required to clear the US.');
change(boss,'b-fate','flowers-scene','boss-fate','Killed by her student.','Snake carries out the last act of the assignment.','add','death');
change(eva,'e-body','escort','eva-body','Injured; needs Snake’s help.','The crash reverses who supports whom on the way out.');
change(eva,'e-cover-retired','tape','eva-cover','','She leaves and reveals the deception in the recording.','retire');
change(ocelot,'o-tools','revolvers','ocelot-weapon','Revolvers. A lesson made visible.','He adopts a different weapon after Snake’s criticism.');
change(ocelot,'o-method','revolvers','ocelot-method','Revolver technique—with pride still attached.','His skill changes without erasing the urge to perform.');
const practice={...W.node('B'),id:'practice-discard',title:'Practice · delete this spare card',opening:'A disposable teaching card.',notes:'Not a scene from MGS3. Use this to try permanent deletion safely.'};
p.archive.push({id:'archive-practice',kind:'branch',title:practice.title,created:'2026-10-03T18:00:00.000Z',parentId:'',previousId:'',nodes:[practice],changes:[]});
const alternate={...W.node('B','crisis'),id:'practice-quiet',title:'Practice · a quieter radio pause',opening:'An optional writing experiment.\nWhat ordinary question would let the soldier feel like a person?',cast:['snake','paramedic'],notes:'NON-CANON EXERCISE\nThis is a proposed scene, not an event claimed to occur in MGS3. Restore it, try a draft, then archive it again.'};
p.archive.push({id:'archive-alternate',kind:'branch',title:alternate.title,created:'2026-10-03T18:00:00.000Z',parentId:'crisis',previousId:'orders',nodes:[alternate],changes:[]});
require('./revision.cjs')(p,W,img,ref);
require('./expanded.cjs')(p,W,img,ref);
const data={format:'counterplot-workshop',schema:1,active:p.id,saveKey:'counterplot.tutorial.mgs3.v1',swatches:[{id:'jungle',name:'Jungle',hex:'#53654b'},{id:'bone',name:'White petals',hex:'#d6cbb1'},{id:'ember',name:'Divided loyalties',hex:'#a9603e'},{id:'steel',name:'Hidden truth',hex:'#647e8d'},{id:'rust',name:'Escalation',hex:'#8e4940'}],projects:[p]};
W.validate(data);module.exports={data,sources};
if(require.main===module){fs.writeFileSync(path.join(__dirname,'MGS3 — Story project.json'),JSON.stringify(data,null,2));console.log(p.nodes.length+' outline pieces; '+p.characters.length+' characters; '+p.characters.reduce((n,c)=>n+c.blocks.length,0)+' blocks; '+p.characters.reduce((n,c)=>n+c.changes.length,0)+' changes.');}
