import http from 'node:http';
import {readFileSync} from 'node:fs';
const html=readFileSync('dist/index.html');
const csp=readFileSync('dist/_headers','utf8').split('\n').find(line=>line.trim().startsWith('Content-Security-Policy:')).trim().slice('Content-Security-Policy:'.length).trim();
http.createServer((request,response)=>{
  if(request.url==='/api/auth/session'){response.writeHead(401,{'Content-Type':'application/json','Cache-Control':'no-store'});response.end('{"error":"Not signed in"}');return;}
  if(request.url==='/'||request.url==='/index.html'){response.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':csp});response.end(html);return;}
  response.writeHead(404);response.end('Not found');
}).listen(8791,'127.0.0.1',()=>console.log('Workshop test server on http://127.0.0.1:8791'));
