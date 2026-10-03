import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { Script } from 'node:vm';
const files=[];
function walk(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())walk(path);else if(path.endsWith('.js'))files.push(path);}}
walk('functions');
for(const file of files){const result=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);}
let count=0;for(const match of readFileSync('index.html','utf8').matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){if(/type=["']application\/json/i.test(match[1]))continue;new Script(match[2],{filename:`index.html script ${++count}`});}
console.log(`Syntax valid: ${files.length} server modules and ${count} inline scripts.`);
