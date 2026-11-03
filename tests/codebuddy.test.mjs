import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,mkdir,readFile,writeFile,copyFile,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {codebuddyCommand,parseCodebuddyOutput,validateCodebuddySchema} from '../src/codebuddy-runner.mjs';
const require=createRequire(import.meta.url),A=require('../src/ai.js');globalThis.XxtCodexCore=require('../src/core.cjs');
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'output/codebuddy');await mkdir(out,{recursive:true});
const key='b'.repeat(64),config={...A.defaults,...A.presets.codebuddy,provider:'codebuddy',model:'',key};
const payload={questions:[{id:'q1',type:'blank',text:'计算 17 + 28，只将计算结果填写在一个输入框中。',options:[],slots:1}],images:[],imageManifest:[]};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function bridge(env={}){
 const dir=await mkdtemp(resolve(out,'bridge-'));await mkdir(resolve(dir,'local'));await writeFile(resolve(dir,'local/codebuddy-token.txt'),key);
 for(const name of ['bridge.mjs','core.cjs','answer-schema.json','codebuddy-runner.mjs'])await copyFile(resolve(root,'src',name),resolve(dir,name));
 const record=resolve(dir,'execution.json'),completed=resolve(dir,'completed.txt');
 const child=spawn(process.execPath,[resolve(dir,'bridge.mjs')],{cwd:dir,env:{...process.env,XXT_LOCAL_PROVIDER:'codebuddy',XXT_CODEBUDDY_PORT:'0',XXT_CODEBUDDY_BIN:resolve(root,'tests/fixtures/codebuddy-print.cjs'),XXT_TEST_CB_RECORD:record,XXT_TEST_CB_COMPLETED:completed,...env},stdio:['ignore','pipe','pipe'],windowsHide:true});
 let logs='';child.stderr.on('data',b=>logs+=b);const closed=once(child,'close');
 const url=await new Promise((accept,reject)=>{let text='';const timer=setTimeout(()=>{child.kill();reject(Error('bridge timeout'));},7000);child.stdout.on('data',b=>{text+=b;const m=text.match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);accept(m[0]);}});child.once('error',reject);});
 return {dir,record,completed,url,logs:()=>logs,stop:async()=>{child.kill();await closed;},request:(route,body,options={})=>fetch(url+route,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),...options})};
}
test('WorkBuddy preset uses an isolated local protocol and rejects remote endpoints/invalid connection codes',()=>{
 assert.equal(A.build(config,payload).url,'http://127.0.0.1:18764/solve');
 assert.equal(A.build(config,undefined,true).method,'GET');
 assert.throws(()=>A.normalize({...config,baseUrl:'https://example.com'}),/仅支持本机/);
 assert.throws(()=>A.normalize({...config,key:'api-key'}),/64 位/);
 assert.throws(()=>A.parse('codebuddy',{ok:true},undefined,true),/不是 CodeBuddy/);
 assert.equal(A.parse('codebuddy',{ok:true,backend:'codebuddy'},undefined,true).kind,'health');
 assert.equal(require('../src/personas.cjs').character(config),null);
});
test('CLI parser reads structured JSON and final stream events; rejects ambiguous/error/plain outputs',()=>{
 const answer={answers:[]};assert.deepEqual(parseCodebuddyOutput(JSON.stringify({structured_output:answer})),answer);
 assert.deepEqual(parseCodebuddyOutput('{}\n'+JSON.stringify({type:'result',subtype:'success',result:JSON.stringify(answer)})),answer);
 for(const value of ['{}','{"is_error":true,"structured_output":{}}','{"type":"result"}\n{"type":"result"}'])assert.throws(()=>parseCodebuddyOutput(value));
});
test('missing CLI gives actionable setup instructions without launching inference',async()=>{
 await assert.rejects(codebuddyCommand({XXT_CODEBUDDY_BIN:resolve(out,'missing.exe')}),/未找到 CodeBuddy/);
});
test('official JSON history array is parsed only through its unique terminal result, never stale history',()=>{
 const answer={answers:[]},result={type:'result',subtype:'success',result:JSON.stringify(answer)};
 assert.deepEqual(parseCodebuddyOutput(JSON.stringify([{type:'message',role:'user',content:'untrusted history'},result])),answer);
 for(const value of [[result,{type:'message',role:'assistant',content:'late'}],[result,result],[{type:'message',role:'assistant',content:JSON.stringify(answer)}]])assert.throws(()=>parseCodebuddyOutput(JSON.stringify(value)),/唯一/);
});
test('local schema validation rejects missing fields, extra fields and invalid values without native schema tool retries',async()=>{
 const schema=JSON.parse(await readFile(resolve(root,'src/answer-schema.json'),'utf8'));
 const answer={id:'q',choices:[],texts:['85'],confidence:1,readable:true,explanation:'fixture'};
 assert.deepEqual(validateCodebuddySchema({answers:[answer]},schema),{answers:[answer]});
 for(const value of [{answers:[{...answer,texts:undefined}]},{answers:[{...answer,confidence:NaN}]},{answers:[{...answer,extra:'x'}]},{answers:[{id:'q'}]}])assert.throws(()=>validateCodebuddySchema(value,schema),/结构/);
});
test('text roundtrip validates answers, disables CLI tools/hooks/MCP, preserves English answer hints and full context',async()=>{
 const server=await bridge();try{
  assert.equal((await(await server.request('/health')).json()).backend,'codebuddy');await assert.rejects(access(server.record));
  assert.equal((await server.request('/solve',payload,{headers:{'Content-Type':'application/json'}})).status,401);
  assert.equal((await server.request('/solve',payload,{headers:{Authorization:'Bearer '+key,'Content-Type':'application/json',Origin:'https://evil.example'}})).status,403);
  const response=await server.request('/solve',payload);assert.equal(response.status,200);const result=await response.json();assert.equal(result.answers[0].texts[0],'45');assert.equal(result.backend,'codebuddy');
  const record=JSON.parse(await readFile(server.record,'utf8'));assert(record.args.includes('--no-session-persistence'));assert(!record.args.includes('--json-schema'));assert.equal(record.args[record.args.indexOf('--max-turns')+1],'1');assert.equal(record.args[record.args.indexOf('--tools')+1],'');assert.equal(record.args[record.args.indexOf('--setting-sources')+1],'');assert(!record.args.some(x=>/skip-permissions|bypassPermissions/.test(x)));assert.match(record.prompt,/explanation单独用简体中文/);
 }finally{await server.stop();}
});
const png=Buffer.alloc(33);Buffer.from('89504e470d0a1a0a','hex').copy(png);png.write('IHDR',12);png.writeUInt32BE(420,16);png.writeUInt32BE(120,20);const images=['data:image/png;base64,'+png.toString('base64')];
test('image roundtrip sends base64 image content through official stream protocol and preserves leading zeros',async()=>{
 const server=await bridge();try{
  const response=await server.request('/image-test',{images});assert.equal(response.status,200);assert.equal((await response.json()).code,'012345');
  const record=JSON.parse(await readFile(server.record,'utf8'));assert.equal(record.images.length,1);assert.equal(record.images[0].source.data,png.toString('base64'));assert(record.args.includes('stream-json'));
 }finally{await server.stop();}
});
test('invalid/missing image payload never launches CLI; low confidence does not pass image verification',async()=>{
 const server=await bridge({XXT_TEST_CB_MODE:'uncertain'});try{
  assert.equal((await server.request('/image-test',{images:[]})).status,422);await assert.rejects(access(server.record));
  assert.equal((await(await server.request('/image-test',{images})).json()).code,'');
 }finally{await server.stop();}
});
test('invalid model answer IDs cannot reach the browser as accepted answers',async()=>{
 const server=await bridge({XXT_TEST_CB_MODE:'invalid'});try{assert.equal((await server.request('/solve',payload)).status,422);}finally{await server.stop();}
});
test('login errors do not expose CLI raw tokens in response or service logs',async()=>{
 const server=await bridge({XXT_TEST_CB_MODE:'auth'});try{const response=await server.request('/solve',payload);assert.equal(response.status,422);assert.match(await response.text(),/登录/);assert(!server.logs().includes('sk-not-a-real-secret'));}finally{await server.stop();}
});
test('official zero-exit unauthenticated CLI output is reported as login failure, not success or malformed answer',async()=>{
 const server=await bridge({XXT_TEST_CB_MODE:'auth-zero'});try{const response=await server.request('/solve',payload);assert.equal(response.status,422);const data=await response.json();assert.equal(data.code,'LOCAL_CLI_AUTH_REQUIRED');assert.match(data.error,/尚未登录/);const explanation=require('../src/personas.cjs').explain({code:data.code,status:422});assert.equal(explanation.title,'CodeBuddy 尚未登录');}finally{await server.stop();}
});
test('stop cancels CLI, releases busy lock only after process exits, and prevents late completion',async()=>{
 const server=await bridge({XXT_TEST_CB_DELAY:'30000'}),controller=new AbortController();
 const pending=server.request('/solve',payload,{signal:controller.signal});const rejected=assert.rejects(pending,/abort/i);
 try{
  for(let n=0;n<150;n++){try{await access(server.record);break;}catch{await wait(20);}}
  const {pid}=JSON.parse(await readFile(server.record,'utf8'));assert.equal((await server.request('/solve',payload)).status,409);controller.abort();await rejected;
  for(let n=0;n<150;n++){if(!(await(await server.request('/health')).json()).busy)break;await wait(20);}
  assert.equal((await(await server.request('/health')).json()).busy,false);assert.throws(()=>process.kill(pid,0));await assert.rejects(access(server.completed));
 }finally{controller.abort();await rejected;await server.stop();}
});
