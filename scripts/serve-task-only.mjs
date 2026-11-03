import http from 'node:http';
import {readFile} from 'node:fs/promises';
const bundle = new URL('../dist/xuexitong-task-points-only.user.js', import.meta.url);
const path = '/xuexitong-task-points-only.user.js';
const server = http.createServer(async (req,res) => {
    if(req.headers.host !== '127.0.0.1:18764') {res.writeHead(403);res.end();return;}
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    if(req.url === '/health'){res.writeHead(200,{'Content-Type':'text/plain'});res.end(req.method==='HEAD'?'':'task-points-only installer ready');return;}
    if(req.url !== path){res.writeHead(404);res.end();return;}
    try {
        const data = await readFile(bundle);
        res.writeHead(200,{'Content-Type':'application/javascript; charset=utf-8','Content-Length':data.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
        res.end(req.method === 'HEAD' ? undefined : data);
    } catch {res.writeHead(500);res.end();}
});
server.listen(18764,'127.0.0.1',()=>console.log('Task-only userscript: http://127.0.0.1:18764'+path));
server.on('error',error=>{console.error(error.message);process.exitCode=1;});
