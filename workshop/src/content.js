const EXTRA_KINDS = {
  alias: ['Names & aliases', 'Presence', 'What do different people call them?', 'A given name, nickname, title, or identity they left behind.', []],
  gender: ['Gender & pronouns', 'Presence', 'How do they describe themself?', 'Use their own terms. Add only what matters to the story.', []],
  sexuality: ['Sexuality & attraction', 'Inner life', 'What does intimacy mean to them?', 'Desire, identity, connection, or the absence of attraction.', []],
  species: ['Species & ancestry', 'History', 'What kind of being are they?', 'What does this mean in the world they inhabit?', []],
  birth: ['Birth & beginnings', 'History', 'What is the story of their arrival?', 'A date, place, circumstance, or story they were told.', []],
  death: ['Mortality & legacy', 'History', 'What remains when they are gone?', 'A death, a disappearance, a feared ending, or what they hope to leave.', []],
  location: ['Whereabouts', 'Their world', 'Where are they right now?', 'A location, journey, vehicle, or place they cannot leave.', []],
  domain: ['Domain & symbols', 'Their world', 'What power, symbol, or realm is theirs?', 'For deities, rulers, spirits, or people carrying a larger idea.', []],
  quote: ['Words they live by', 'Presence', 'What is a phrase only they would say?', 'A catchphrase, private motto, repeated joke, or famous last words.', []],
  hobby: ['Pets & pastimes', 'Everyday life', 'What gets their attention when nobody needs anything?', 'Something with no obligation to advance the plot.', []],
  fear: ['Fear', 'Inner life', 'What do they try not to face?', 'What would they risk to avoid it?', ['Being forgotten', 'Losing control', 'Being truly known']],
  need: ['Unspoken need', 'Inner life', 'What would help, even if they cannot ask for it?', 'Let it disagree with what they want.', ['Permission to rest', 'Someone who stays', 'A choice of their own']],
  flaw: ['Blind spot', 'Inner life', 'What do they fail to see about themself?', 'When does it cause trouble?', ['Mistakes control for care', 'Confuses kindness with weakness', 'Cannot accept a small victory']],
  desire: ['Desire', 'Inner life', 'What are they drawn to?', 'A quiet longing counts.', ['A life by the sea', 'To be wanted without being useful', 'One reckless adventure']],
  appearance: ['Appearance', 'Presence', 'What catches the eye?', 'A few telling details beat an inventory.', ['Immaculate coat, ruined shoes', 'Hands stained with ink', 'Always a little windblown']],
  voice: ['Voice & speech', 'Presence', 'What makes their voice theirs?', 'Rhythm, favorite words, pauses, or what they leave unsaid.', ['Makes a joke before asking for help', 'Speaks in careful, complete sentences', 'Answers questions with stories']],
  mannerism: ['Mannerism', 'Presence', 'What small movement gives them away?', 'When is it most noticeable?', ['Straightens things when anxious', 'Counts exits without looking', 'Smiles just before a lie']],
  style: ['Style', 'Presence', 'How do they choose to be seen?', 'Clothes, adornment, or deliberate indifference.', ['Mends the same favorite jacket', 'Dresses for a life they do not have', 'One bright detail in an austere outfit']],
  health: ['Body & health', 'Presence', 'What is living in their body like?', 'Capacity, access, care, and lived experience.', []],
  age: ['Age & life stage', 'Presence', 'Where are they in their life?', 'Age need not explain personality.', []],
  origin: ['Origins', 'History', 'Where did they begin?', 'A place, a culture, a household, or a chosen account of it.', []],
  education: ['Education', 'History', 'How did they learn what they know?', 'Formal teaching, apprenticeship, practice, or survival.', []],
  memory: ['Memory', 'History', 'What moment stays with them?', 'A memory can be happy, ordinary, or unreliable.', ['A kitchen lit before sunrise', 'The first time someone used their real name', 'A promise made in terrible weather']],
  family: ['Family', 'History', 'Who made up their first world?', 'Biological, chosen, absent, complicated.', []],
  achievement: ['Achievement', 'History', 'What are they proud of?', 'Private victories count.', []],
  regret: ['Regret', 'History', 'What would they do differently?', 'What can still be repaired?', []],
  ritual: ['Ritual & habit', 'Everyday life', 'What do they repeat?', 'A tiny act can hold an entire history.', ['Saves the best bite for last', 'Writes letters they never send', 'Checks the weather for someone far away']],
  taste: ['Taste', 'Everyday life', 'What do they love or hate for no grand reason?', 'Food, music, weather, textures, jokes.', []],
  home: ['Home', 'Everyday life', 'Where can they let their guard down?', 'A place, a person, a room, or nowhere yet.', []],
  possession: ['Possession', 'Everyday life', 'What do they keep close?', 'Why this object?', ['A key to a house that no longer exists', 'A borrowed book full of notes', 'A watch that has never kept time']],
  work: ['Work & craft', 'Their world', 'What do they spend their days doing?', 'What does the work ask of them?', []],
  reputation: ['Reputation', 'Their world', 'Who do other people think they are?', 'Let the public story differ from the private one.', ['Dependable to a fault', 'The one who got away', 'A troublemaker with impeccable manners']],
  status: ['Status & resources', 'Their world', 'What doors open or close for them?', 'Money, position, access, or precarity.', []],
  culture: ['Culture & belonging', 'Their world', 'What traditions feel like theirs?', 'Belonging can be complicated.', []],
  faith: ['Faith & philosophy', 'Their world', 'What gives their life meaning?', 'A practice, a doubt, an ethic, or an unanswered question.', []],
  relationship: ['Relationship', 'Their world', 'Who matters to them?', 'What exists between them that no one else sees?', []],
  language: ['Languages', 'Their world', 'How do they make themselves understood?', 'Which words feel like home?', []]
};
const GROUPS = {want:'Inner life',method:'Inner life',value:'Inner life',boundary:'Inner life',belief:'Inner life',contradiction:'Inner life',joy:'Everyday life',capability:'Presence',obligation:'Their world',allegiance:'Their world',secret:'Inner life',experience:'History',custom:'Your own'};
const KINDS = Object.fromEntries(Object.entries(ORIGINAL_KINDS).map(([id,k])=>[id,{...k,group:GROUPS[id],examples:k.options.map(x=>x[1])}]));
for (const [id,[label,group,question,detail,examples]] of Object.entries(EXTRA_KINDS)) KINDS[id]={label,group,question,description:detail,detail,examples,symbol:'◇'};
const COLORS = ['orange','green','blue','purple','rose','gold'];
const WORLD_TYPES = {place:'Place / setting',culture:'Culture',object:'Object',group:'Group',fact:'Fact / secret',rule:'World rule',idea:'Idea',custom:'Something else'};
function exampleWorkspace() {
  const p=Workshop.project('The last light'); p.subtitle='A lighthouse keeper. An impossible signal. One last night before the sea comes in.'; p.example=true;
  const mara=Workshop.character('Mara Venn');mara.id='mara';mara.identity='Lighthouse keeper · reluctant guardian';mara.color='orange';mara.notes='She notices what people do with their hands. Never what they say about themselves.';
  mara.blocks=[{...Workshop.block('want','Keep the lighthouse burning'),id:'m-want',pinned:true},{...Workshop.block('belief','Depending on people gives them power over you'),id:'m-belief',pinned:true},{...Workshop.block('boundary','Never leave someone out in the storm'),id:'m-boundary'},{...Workshop.block('ritual','Sets two cups on the table, then puts one away'),id:'m-ritual'},{...Workshop.block('capability','Reads the sea by the sound of it'),id:'m-skill',detail:'Cannot read a storm that has already gone quiet.'},{...Workshop.block('possession','Her father’s watch, stopped at 3:17'),id:'m-watch'}];
  const eli=Workshop.character('Eli Ash');eli.id='eli';eli.identity='A stranger with a familiar story';eli.color='blue';eli.blocks=[{...Workshop.block('want','Get a message to the mainland'),id:'e-want'},{...Workshop.block('secret','Knows why the old light went dark'),id:'e-secret'},{...Workshop.block('voice','Says the hard thing as if it were obvious'),id:'e-voice'}];
  const june=Workshop.character('June Venn');june.id='june';june.identity='Mara’s sister · voice on the radio';june.color='green';june.blocks=[{...Workshop.block('want','Bring Mara home'),id:'j-want'},{...Workshop.block('method','Asks a second time, more gently'),id:'j-method'}];p.characters=[mara,eli,june];
  const event={...Workshop.node('E'),id:'storm',title:'The night the sea goes silent',opening:'The lighthouse receives a distress signal from a ship that sank twenty years ago.',closing:'The light answers. For the first time, the island answers with it.',cast:['mara','june'],worldIds:['lighthouse'],status:'planned'};
  const inquiry={...Workshop.node('I','storm'),id:'signal',title:'Who is sending the signal?',opening:'The voice on the radio knows Mara’s childhood nickname.',closing:'It is a warning sent by the people her father left behind.',cast:['mara','eli'],status:'planned'};
  const s1={...Workshop.node('B','signal'),id:'arrival',title:'A stranger at the door',opening:'Eli arrives soaked through, carrying a radio that should not work.',cast:['mara','eli'],prose:'Three knocks. Then a fourth, softer one.\n\nMara left the kettle where it was. Nobody on the island knocked four times. Nobody on the island would have come out in this weather at all.\n\nBehind the door, someone said her name.',status:'draft'};
  const arc={...Workshop.node('C','storm'),id:'trust',title:'Mara learns to let someone stay',opening:'Mara believes keeping everyone at a distance is how she keeps them safe.',closing:'She hands Eli the spare key. This time, she leaves both cups on the table.',cast:['mara'],status:'planned'};
  const s2={...Workshop.node('B','trust'),id:'key',title:'The spare key',opening:'The lamp fails. Mara has to ask Eli to climb the tower with her.',cast:['mara','eli'],worldIds:['lighthouse']};
  p.nodes=[event,inquiry,s1,arc,s2];
  mara.changes=[{id:'change-trust',at:'key:open',blockId:'m-belief',op:'develop',block:{...mara.blocks[1],text:'Letting someone help is a choice, not a surrender'},reason:'Eli stays when leaving would be easier.'},{id:'change-ritual',at:'trust:close',blockId:'m-ritual',op:'develop',block:{...mara.blocks[3],text:'Leaves two cups on the table'},reason:'A small habit makes the change visible.'}];
  p.world=[{id:'lighthouse',name:'The North Light',type:'place',notes:'A working lighthouse on an island that is slowly losing its shore. Three hundred and seventeen steps. One spare key.'},{id:'signal-rule',name:'The sea remembers',type:'rule',notes:'On a windless night, a radio can pick up what the water has kept.'}];p.connections=[{id:'r-me',a:'mara',b:'eli',label:'Suspicion → earned trust',notes:'He needs shelter. She needs a reason to open the door.'},{id:'r-mj',a:'mara',b:'june',label:'Love at a distance',notes:'June calls every evening. Mara always lets it ring twice.'}];
  return {format:'counterplot-workshop',schema:1,active:p.id,projects:[p]};
}
