import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
test('optional installer uses a separate loopback port and serves only the intended build',async()=>{
 const child=spawn(process.execPath,['scripts/serve-task-only.mjs'],{cwd:new URL('../',import.meta.url),env:{...process.env,XXT_INSTALL_PORT:'0'},windowsHide:true,stdio:['ignore','pipe','pipe']}),closed=once(child,'close');
 try{const url=await new Promise((accept,reject)=>{const timer=setTimeout(()=>reject(Error('Installer timeout')),5000);let output='';child.stdout.on('data',bytes=>{output+=bytes;const match=output.match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timer);accept(match[0]);}});child.once('error',reject);});assert.equal((await fetch(url+'/health')).status,200);assert.equal((await fetch(url+'/xuexitong-task-points-only.user.js',{method:'HEAD'})).status,200);assert.equal((await fetch(url+'/src/local/bridge-token.txt')).status,404);assert.equal((await fetch(url+'/health',{method:'POST'})).status,405);}finally{child.kill();await closed;}
});
