import http from 'node:http';
import {readFile} from 'node:fs/promises';
const bundle = new URL('../dist/xuexitong-task-points-only.user.js', import.meta.url);
const path = '/xuexitong-task-points-only.user.js';
let port=Number(process.env.XXT_INSTALL_PORT??18765);
if(!Number.isInteger(port)||port<0||port>65535)throw Error('Invalid installer port');
const server = http.createServer(async (req,res) => {
    if(req.headers.host !== '127.0.0.1:'+port) {res.writeHead(403);res.end();return;}
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    if(req.url === '/health'){res.writeHead(200,{'Content-Type':'text/plain'});res.end(req.method==='HEAD'?'':'task-points-only installer ready');return;}
    if(req.url !== path){res.writeHead(404);res.end();return;}
    try {
        const data = await readFile(bundle);
        res.writeHead(200,{'Content-Type':'application/javascript; charset=utf-8','Content-Length':data.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
        res.end(req.method === 'HEAD' ? undefined : data);
    } catch {res.writeHead(500);res.end();}
});
server.listen(port,'127.0.0.1',()=>{port=server.address().port;console.log('Task-only userscript: http://127.0.0.1:'+port+path);});
server.on('error',error=>{console.error(error.message);process.exitCode=1;});
