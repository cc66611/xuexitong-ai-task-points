import {chromium} from './browser-runtime.mjs';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'output/playwright/short-answer-nested');
const bundle=await readFile(resolve(root,'dist/xuexitong-ai-assistant.user.js'),'utf8');
const browser=await chromium.launch({headless:true}),observations=[];await mkdir(out,{recursive:true});
try{for(const mode of ['save','skip','cross-save']){
 const context=await browser.newContext({viewport:{width:1400,height:1000}}),events=[];
 await context.exposeBinding('__event',(_,event)=>events.push(event));
 await context.addInitScript(mode=>{
  window.unsafeWindow=window;
  const defaults={'xxt-quiet-enabled':false,'xxt-ai-enabled':true,'xxt-short-answer-mode':mode==='skip'?'skip':'save',
   'xxt-ai-config':{provider:'custom',protocol:'chat',baseUrl:'https://fixture.invalid/v1',model:'text-only',key:'fixture-only'}};
  window.GM_getValue=(key,fallback)=>{const value=localStorage.getItem(key);return value===null?defaults[key]??fallback:JSON.parse(value);};
  window.GM_setValue=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  window.GM_xmlhttpRequest=spec=>{
   const work=new URL(location.href).searchParams.get('workId');__event('model:'+work);
   const text=JSON.parse(spec.data).messages[0].content,questions=JSON.parse(text.split('题目：')[1].split('\n之前的平台反馈')[0]);
   let aborted=false;setTimeout(()=>{if(!aborted)spec.onload({status:200,responseText:JSON.stringify({choices:[{message:{content:JSON.stringify({answers:questions.map(q=>({id:q.id,choices:q.type==='boolean'?['A']:[],...(q.type==='essay'?{texts:['简答内容']}:{}),readable:true,confidence:1,explanation:'fixture'}))})}}]})});},30);
   return {abort(){aborted=true;spec.onabort?.();}};
  };
 },mode);
 await context.route('**/*',route=>{
  const u=new URL(route.request().url());let html='';
  if(u.pathname==='/mycourse/studentstudy')html='<div class="prev_title">测试</div><div id="coursetree"><div class="posCatalog_select posCatalog_active"><span class="posCatalog_name">两个测验</span></div><div class="posCatalog_select"><span class="posCatalog_name">下一章</span></div></div><iframe id="iframe" src="/mooc-ans/knowledge/cards" style="width:1000px;height:1800px"></iframe><button id="next">下一节</button><script>document.querySelector("#next").onclick=()=>{const doc=document.querySelector("#iframe").contentDocument;__event("next:"+doc.querySelectorAll(".ans-job-finished").length);document.querySelector(".posCatalog_active").classList.remove("posCatalog_active");document.querySelectorAll(".posCatalog_select")[1].classList.add("posCatalog_active");document.querySelector("#iframe").remove();};</script>';
  else if(u.pathname==='/mooc-ans/knowledge/cards')html=[1,2].map(n=>`<div class="ans-attach-ct"><span class="ans-job-icon" aria-label="任务点未完成"></span><iframe src="/ananas/modules/work/index.html?n=${n}" style="width:950px;height:700px"></iframe></div>`).join('');
  else if(u.pathname==='/ananas/modules/work/index.html')html=`<iframe src="${mode==='cross-save'&&u.searchParams.get('n')==='1'?'https://mooc1-1.chaoxing.com':''}/mooc-ans/work/doHomeWorkNew?workId=${u.searchParams.get('n')}" style="width:900px;height:650px"></iframe>`;
  else if(u.pathname==='/mooc-ans/work/doHomeWorkNew'){
   const first=u.searchParams.get('workId')==='1';
   html=first?'<div class="TiMu newTiMu"><div class="Zy_TItle"><span class="newZy_TItle">【其它】</span>阅读简答。</div><ul class="Zy_ulTk"><li>填写答案<div class="edui-editor-iframeholder"><iframe id="ueditor_0"></iframe></div><textarea id="answerFixture" style="display:none"></textarea></li></ul></div><a class="btnSave workBtnIndex" role="button">暂时保存</a>':'<div class="TiMu"><div class="Zy_TItle"><span class="newZy_TItle">【判断题】</span>下一份独立测验。</div><ul class="Zy_ulTop"><li><span class="num_option choice1">A</span><a class="after">对</a></li><li><span class="num_option choice1">B</span><a class="after">错</a></li></ul></div>';
   html+='<a class="btnSubmit workBtnIndex" role="button">提交</a><script>const work=new URL(location.href).searchParams.get("workId");document.querySelectorAll(".num_option").forEach(node=>node.onclick=()=>node.classList.add("check_answer"));document.querySelector(".btnSubmit").onclick=()=>{__event("submit:"+work);if(work==="2")window.parent.frameElement.closest(".ans-attach-ct").classList.add("ans-job-finished");document.body.innerHTML="<p>最终成绩 100 分 满分：100</p>";};if(work==="1"){const area=document.querySelector("textarea"),frame=document.querySelector("#ueditor_0");frame.contentDocument.body.contentEditable="true";window.UE={instants:{essay:{key:area.id,textarea:area,iframe:frame,body:frame.contentDocument.body,isReady:true,options:{},setContent(value){this.body.innerHTML=value;},getContent(){return this.body.innerHTML;},sync(){this.textarea.value=this.getContent();}}}};document.querySelector(".btnSave").onclick=()=>{__event("save:1");const toast=document.createElement("div");toast.textContent="保存成功!";document.body.append(toast);};}</script>';
  }else return route.fulfill({body:''});
  return route.fulfill({contentType:'text/html; charset=utf-8',body:'<!doctype html>'+html+`<script>${bundle.replaceAll('</script','<\\/script')}</script>`});
 });
 const page=await context.newPage();await page.goto('https://mooc1.chaoxing.com/mycourse/studentstudy?courseId=fixture&clazzid=class&cpi=user');
 await page.locator('[data-action=start]').click();
 if(mode==='cross-save'){
  await page.waitForTimeout(1800);
  assert.deepEqual(events,[],'Existing opaque cross-origin loading must not authorize model/save/submit/navigation');
  assert((await page.locator('pre').textContent()).includes('正在等待页面任务或成绩加载'));
  observations.push({mode,events,state:'opaque-cross-origin-waiting-safe',limitation:'Existing coordinator cannot scan this fixture; automatic processing is not demonstrated'});
  await context.close();continue;
 }
 await page.waitForFunction(()=>!document.querySelector('#iframe'),null,{timeout:28000}).catch(async error=>{console.log(mode,events,await page.locator('pre').textContent());throw error;});
 assert.equal(events.filter(e=>e==='submit:1').length,0);
 assert.equal(events.filter(e=>e==='save:1').length,mode==='skip'?0:1);
 assert.equal(events.filter(e=>e==='model:1').length,mode==='skip'?0:1);
 assert.equal(events.filter(e=>e==='submit:2').length,1);assert.equal(events.filter(e=>e==='next:1').length,1);
 const ledger=await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('xxt-skipped:')).flatMap(key=>JSON.parse(localStorage.getItem(key))));
 const saved=await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('xxt-saved-quizzes:')).flatMap(key=>JSON.parse(localStorage.getItem(key))));
 if(mode==='skip'){assert.equal(ledger[0].quizSkips[0].state,'skipped');assert.equal(ledger[0].uncertainSubmission,false);assert.equal(saved.length,0);}
 else {assert.equal(ledger.length,0);assert.equal(saved.length,1);assert.equal(saved[0].quizKey,'work:1');}
 observations.push({mode,events,ledger,saved});await context.close();console.log('short-answer nested:',mode,'passed');
}}finally{await browser.close();await writeFile(resolve(out,'observations.json'),JSON.stringify({scope:'Synthetic nested course/UE/API/toasts/grades; one saved or skipped quiz remains platform-incomplete, sibling quiz submitted independently.',observations},null,2));}
