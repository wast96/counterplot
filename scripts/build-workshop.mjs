import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const check=process.argv.includes('--check');
const sources=['core.js','legacy.js','integration.js'];
let shared=sources.map(file=>readFileSync('workshop/src/'+file,'utf8')
  .replace(/if \(typeof module !== 'undefined'\) module.exports = Workshop;/g,'')
  .replace(/if \(typeof module !== "undefined"\) module.exports = CounterplotLegacy;/g,'')
  .replace("typeof module !== 'undefined' ? require('./core.js') : Workshop",'Workshop')
  .replace("typeof module !== 'undefined' ? require('./legacy.js') : CounterplotLegacy",'CounterplotLegacy')
  .replace("if(typeof module!=='undefined')module.exports=W;",'')).join('\n');
shared='// Generated from the shared Workshop model. Run npm run build:workshop.\n'+shared+'\nexport const validateWorkshop = value => Workshop.validate(value);\n';
shared=shared.split('\n').map(line=>line.trim()?line:'').join('\n');
const path='functions/_lib/workshop-validation.js';
if(check){if(readFileSync(path,'utf8')!==shared)throw Error('Workshop server validator is stale.');const expected=readFileSync('workshop/Counterplot Workshop.html','utf8').replace('<html lang="en">','<html lang="en" data-hosted="true">');if(readFileSync('index.html','utf8')!==expected||readFileSync('dist/index.html','utf8')!==expected)throw Error('Hosted Workshop output is stale. Run npm run build:workshop.');console.log('Shared validator and hosted output match the Workshop build.');process.exit(0);}
else writeFileSync(path,shared);
for(const file of ['workshop/build.cjs','workshop/tutorial/build-tutorial.cjs']){const run=spawnSync(process.execPath,[file],{stdio:'inherit'});if(run.status)process.exit(run.status);}
// Only the explicit publication directory is served. Sources, fixtures, and backups stay out.
mkdirSync('dist',{recursive:true});
const html=readFileSync('workshop/Counterplot Workshop.html','utf8').replace('<html lang="en">','<html lang="en" data-hosted="true">');
writeFileSync('dist/index.html',html);
writeFileSync('index.html',html);
const hashes=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>!/application\/json/.test(m[1])).map(m=>"'sha256-"+createHash('sha256').update(m[2]).digest('base64')+"'");
// Tutorial authoring uses same-origin srcdoc frames containing this shared script.
writeFileSync('dist/_headers',`/*\n  X-Frame-Options: SAMEORIGIN\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Content-Type-Options: nosniff\n  Content-Security-Policy: default-src 'self'; script-src ${hashes.join(' ')}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'self'; form-action 'self'\n`);
writeFileSync('dist/_routes.json',JSON.stringify({version:1,include:['/api/*'],exclude:[]})+'\n');
writeFileSync('dist/release.json',JSON.stringify({source:process.env.CF_PAGES_COMMIT_SHA||'local',sha256:createHash('sha256').update(html).digest('hex')},null,2)+'\n');
console.log('Built explicit Pages publication directory: dist/');

const generate=spawnSync(process.execPath,['scripts/generate-runtime.mjs'],{stdio:'inherit'});if(generate.status)process.exit(generate.status);
