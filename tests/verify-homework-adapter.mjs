import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from './browser-runtime.mjs';
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'output/playwright/homework');await mkdir(out,{recursive:true});
const source=await Promise.all(['homework.cjs','dom.js','homework-dom.js'].map(n=>readFile(resolve(root,'src',n),'utf8')));
const samples=await Promise.all(['boolean.html','calculation.html','save.html','submit.html'].map(async n=>({html:{value:await readFile(resolve(root,'tests/fixtures/homework',n),'utf8'),truncated:false}})));
const html=`<div class="subNav"><div id="submitFocus">${samples[2].html.value}${samples[3].html.value}</div></div><div class="fanyaMarking TiMu"><form id="submitForm">${samples[0].html.value}${samples[1].html.value}</form></div>`;
const browser=await chromium.launch({channel:'chrome',headless:true}),observations=[];
async function scenario(name,options={},test){
 const page=await browser.newPage();await page.setContent(html);for(const code of source)await page.addScriptTag({content:code});
 await page.evaluate(async options=>{
  window.unsafeWindow=window;window.UE={instants:{}};window.__counts={choice:0,save:0,submit:0,confirm:0,write:0,sync:0};window.__store={};window.__policy={mode:'homework',subjective:'ai',after:'none'};
  const e=XxtHomeworkDom.scan(document)[1],frame=e.frames[0],field=e.fields[0];frame.contentDocument.body.contentEditable='true';frame.contentDocument.body.innerHTML='<p><br></p>';field.value=frame.contentDocument.body.innerHTML;
  UE.instants.editor={key:field.id,textarea:field,iframe:frame,body:frame.contentDocument.body,isReady:false,setContent(value){__counts.write++;this.body.innerHTML=value;},getContent(){return this.body.innerHTML;},sync(){__counts.sync++;if(!options.noSync)this.textarea.value=this.getContent();},fireEvent(){}};
  const q=XxtHomeworkDom.scan(document)[0],hidden=document.createElement('input');hidden.type='hidden';hidden.id='answer'+q.element.id.slice(8);q.element.append(hidden);
  for(const row of q.rows)row.onclick=()=>{__counts.choice++;if(options.noChoiceState)return;for(const other of q.rows)other.querySelector('.num_option').classList.remove('check_answer');row.querySelector('.num_option').classList.add('check_answer');hidden.value=row.querySelector('.answer_p').textContent==='对'?'true':'false';};
  const buttons=XxtHomeworkDom.buttons(document);
  buttons.save.onclick=()=>{__counts.save++;if(!options.noSaveToast)setTimeout(()=>{const toast=document.createElement('p');toast.textContent='保存成功!';document.body.append(toast);},20);};
  buttons.submit.onclick=()=>{__counts.submit++;if(options.confirm){const dialog=document.createElement('div');dialog.innerHTML='<p>确认提交？</p><button id="yes">提交</button><button>取消</button>';document.body.append(dialog);dialog.querySelector('#yes').onclick=()=>{__counts.confirm++;dialog.remove();const toast=document.createElement('p');toast.textContent='提交成功!';document.body.append(toast);};}else if(!options.noSubmitToast){const toast=document.createElement('p');toast.textContent='提交成功!';document.body.append(toast);}};
  window.__adapter=XxtHomeworkDom.create({identity:()=>window.__identity||'synthetic-work',policy:()=>__policy,assertCurrent:()=>{if(window.__blocked)throw Error('已停止');},readState:id=>__store[id],writeState:(id,state)=>__store[id]=state,timeout:300});
  window.__answers=[{id:q.question.id,choices:['A'],readable:true,confidence:1},{id:e.question.id,texts:['第一行\n第二行'],readable:true,confidence:1}];
 },options);
 try{await test(page);observations.push({name,passed:true});}finally{await page.close();}
}
try{
 await scenario('UEditor-ready-false-bound-body-write-and-sync',{},async p=>{const r=await p.evaluate(async()=>{const page=__adapter.scan();await __adapter.apply(page,__answers,()=>{});return{counts:__counts,read:__adapter.read(page)};});assert.equal(r.counts.write,1);assert.equal(r.counts.sync,1);assert.deepEqual(r.read[1].texts,['第一行 第二行']);assert.deepEqual(r.read[0].choices,['A']);});
 await scenario('default-objective-only-preserves-subjective',{},async p=>{const c=await p.evaluate(async()=>{const page=__adapter.scan();await __adapter.apply(page,[__answers[0]],()=>{});return __counts;});assert.equal(c.choice,1);assert.equal(c.write+c.save+c.submit,0);});
 await scenario('manual-draft-protected-before-any-choice-write',{},async p=>{const r=await p.evaluate(async()=>{UE.instants.editor.body.textContent='人工草稿';try{await __adapter.apply(__adapter.scan(),__answers,()=>{});}catch(e){return{message:e.message,counts:__counts};}});assert.match(r.message,/已有作答/);assert.equal(r.counts.choice+r.counts.write,0);});
 await scenario('missing-sync-blocks-finish',{noSync:true},async p=>{const r=await p.evaluate(async()=>{try{await __adapter.apply(__adapter.scan(),__answers,()=>{});}catch(e){return{message:e.message,counts:__counts};}});assert.match(r.message,/未同步/);assert.equal(r.counts.save+r.counts.submit,0);});
 await scenario('unobservable-choice-state-stops',{noChoiceState:true},async p=>{const r=await p.evaluate(async()=>{try{await __adapter.apply(__adapter.scan(),[__answers[0]],()=>{});}catch(e){return{message:e.message,counts:__counts};}});assert.match(r.message,/未正确写入/);assert.equal(r.counts.choice,1);assert.equal(r.counts.save+r.counts.submit,0);});
 await scenario('new-save-toast-confirmed',{},async p=>{const state=await p.evaluate(async()=>__adapter.finish('save',{page:__adapter.scan(),guard:()=>{},signal:new AbortController().signal}));assert.equal(state.state,'confirmed');});
 await scenario('old-visible-save-toast-not-confirmation',{noSaveToast:true},async p=>{const state=await p.evaluate(async()=>{const old=document.createElement('p');old.textContent='保存成功!';document.body.append(old);return __adapter.finish('save',{page:__adapter.scan(),guard:()=>{},signal:new AbortController().signal});});assert.equal(state.state,'unknown');});
 await scenario('scoped-submit-confirmation',{confirm:true},async p=>{const r=await p.evaluate(async()=>({result:await __adapter.finish('submit',{page:__adapter.scan(),guard:()=>{},signal:new AbortController().signal}),counts:__counts,store:__store}));assert.equal(r.result.state,'confirmed');assert.equal(r.counts.confirm,1);assert.equal(r.counts.submit,1);});
 await scenario('unknown-submit-persistently-refuses-repeat',{noSubmitToast:true},async p=>{const r=await p.evaluate(async()=>{const page=__adapter.scan();const first=await __adapter.finish('submit',{page,guard:()=>{},signal:new AbortController().signal});let error;try{await __adapter.finish('submit',{page,guard:()=>{},signal:new AbortController().signal});}catch(e){error=e.message;}return{first,error,counts:__counts};});assert.equal(r.first.state,'unknown');assert.match(r.error,/已有提交记录/);assert.equal(r.counts.submit,1);});
 await scenario('stopped-guard-prevents-any-write',{},async p=>{const r=await p.evaluate(async()=>{try{await __adapter.apply(__adapter.scan(),__answers,()=>{throw Error('已停止');});}catch(e){return __counts;}});assert.equal(r.choice+r.write+r.save+r.submit,0);});
 await writeFile(resolve(out,'adapter-observations.json'),JSON.stringify({scope:'User DOM replay; UEditor, choice handlers, toast and confirmation behavior synthetic. No actual homework write/save/submit, paid model or grades.',observations},null,2));console.log(JSON.stringify({passed:observations.length,observations}));
}finally{await browser.close();}
