// Synthetic fixture close to the account limit; never use a real manuscript here.
const fs=require('node:fs'),path=require('node:path');
const file=process.argv[2]||'/tmp/counterplot-near-capacity-old.json';
const data=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../browser-tests/fixtures/rich-v2-workspace.json'))),p=data.projects[0],template=p.scenes[0];
for(let i=0;i<39;i++){const scene=JSON.parse(JSON.stringify(template));scene.id='large-scene-'+i;scene.title='Large synthetic scene '+i;scene.parent='';scene.extraParents=[];scene.notes=('Synthetic writing retained for capacity checks. ').repeat(17000).slice(0,750000);p.scenes.push(scene);}
require('../src/legacy.js').validateWorkspace(data);
const text=JSON.stringify(data);fs.writeFileSync(file,text);console.log(JSON.stringify({path:file,bytes:Buffer.byteLength(text)}));
