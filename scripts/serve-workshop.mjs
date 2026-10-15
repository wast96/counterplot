import http from 'node:http';
import {readFileSync} from 'node:fs';
const readCsp=()=>readFileSync('dist/_headers','utf8').split('\n').find(line=>line.trim().startsWith('Content-Security-Policy:')).trim().slice('Content-Security-Policy:'.length).trim();
http.createServer((request,response)=>{
  if(request.url==='/api/auth/session'){response.writeHead(401,{'Content-Type':'application/json','Cache-Control':'no-store'});response.end('{"error":"Not signed in"}');return;}
  if(request.url==='/'||request.url==='/index.html'){response.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':readCsp()});response.end(readFileSync('dist/index.html'));return;}
  if(/^\/tutorial-media\.[a-f0-9]{16}\.json$/.test(request.url)){try{const data=readFileSync('dist'+request.url);response.writeHead(200,{'Content-Type':'application/json','Cache-Control':'public, max-age=31536000, immutable'});response.end(data);return;}catch{}}
  response.writeHead(404);response.end('Not found');
}).listen(8791,'127.0.0.1',()=>console.log('Workshop test server on http://127.0.0.1:8791'));
