import{chromium}from'./browser-runtime.mjs';import{readFile,mkdir,writeFile}from'node:fs/promises';import{resolve}from'node:path';import assert from'node:assert/strict';
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'output/playwright/saved-quizzes'),bundle=await readFile(resolve(root,'dist/xuexitong-ai-assistant.user.js'),'utf8');await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),observations=[];
try{for(const mode of ['open-exact','migration','changed-title','changed-account','missing-quiz','stop-jump']){
 const context=await browser.newContext({viewport:{width:1280,height:1000}}),events=[];
 await context.exposeBinding('__event',(_,e)=>events.push(e));
 await context.addInitScript(mode=>{
  window.unsafeWindow=window;
  const key='xxt-auto:https://mooc1.chaoxing.com/course/class',scope=key+'/user';
  const base={scope,index:0,title:'2.4 Unit test',chapter:'2.4 Unit test',card:{id:'test-card',label:'Unit test'},state:'saved',total:18,at:1,reason:'本次保存成功，未提交',quizKey:'work:target-b'};
  const defaults={'xxt-quiet-enabled':false,'xxt-ai-enabled':true,[`xxt-saved-quizzes:${key}`]:mode==='migration'?[]:[base,{...base,quizKey:'work:target-a'},{...base,scope:key+'/foreign',quizKey:'work:foreign'}],
   [`xxt-skipped:${key}`]:mode==='migration'?[{...base,reason:'本次保存成功，未提交',quizSkips:[{state:'saved',reason:'本次保存成功，未提交',total:18,at:1}]},{...base,index:1,title:'当前章节',chapter:'当前章节',reason:'保存结果不明',uncertainSubmission:true,quizSkips:[{state:'uncertain',reason:'保存结果不明'}]}]:[]};
  window.GM_getValue=(k,f)=>{const v=localStorage.getItem(k);return v===null?defaults[k]??f:JSON.parse(v);};
  window.GM_setValue=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  window.GM_xmlhttpRequest=()=>{__event('MODEL');return{abort(){}};};
  Element.prototype.scrollIntoView=function(){if(location.pathname.includes('doHomeWorkNew'))__event('scroll:'+new URL(location.href).searchParams.get('workId'));};
 },mode);
 await context.route('**/*',route=>{
  const u=new URL(route.request().url());let html='';
  if(u.pathname==='/mycourse/studentstudy')html=`<div class="prev_title">Unit test</div><div id="coursetree"><div class="posCatalog_select"><span class="posCatalog_name" title="2.4 Unit test">2.4 Unit test</span></div><div class="posCatalog_select posCatalog_active"><span class="posCatalog_name" title="当前章节">当前章节</span></div></div><ul class="prev_ul"><li cardid="intro" id="dct0" title="介绍">介绍</li><li cardid="test-card" id="dct1" title="Unit test">Unit test</li></ul><script>
   document.querySelector('.posCatalog_name').onclick=()=>{__event('chapter');const open=()=>{document.querySelectorAll('.posCatalog_select').forEach(n=>n.classList.remove('posCatalog_active'));document.querySelector('.posCatalog_select').classList.add('posCatalog_active');document.querySelector('#iframe')?.remove();const frame=document.createElement('iframe');frame.id='iframe';frame.style='width:900px;height:650px';frame.src='/mooc-ans/knowledge/cards?num=0';document.body.append(frame);};setTimeout(open,${mode==='stop-jump'?700:20});};
   document.querySelector('#dct1').onclick=()=>{__event('card');document.querySelector('#iframe').src='/mooc-ans/knowledge/cards?num=1';};
  </script>`;
  else if(u.pathname==='/mooc-ans/knowledge/cards'&&u.searchParams.get('num')==='1')html=['target-a',mode==='missing-quiz'?'wrong-b':'target-b'].map(id=>`<iframe src="/mooc-ans/work/doHomeWorkNew?workId=${id}" style="width:850px;height:420px"></iframe>`).join('');
  else if(u.pathname==='/mooc-ans/work/doHomeWorkNew')html='<div class="TiMu"><div class="Zy_TItle"><span class="newZy_TItle">【简答题】</span>待人工核对的暂存内容</div><textarea>已保存的内容</textarea></div><button class="btnSubmit workBtnIndex">提交</button><script>document.querySelector("button").onclick=()=>__event("SUBMIT");</script>';
  else html='<p>介绍页</p>';
  const script=u.pathname==='/mycourse/studentstudy'?'':`<script>${bundle.replaceAll('</script','<\\/script')}</script>`;
  return route.fulfill({contentType:'text/html; charset=utf-8',body:'<!doctype html>'+html+script});
 });
 const page=await context.newPage();await page.goto('https://mooc1.chaoxing.com/mycourse/studentstudy?courseId=course&clazzid=class&cpi=user');
 await page.addScriptTag({content:bundle});
 await page.locator('[data-workspace-tab=records]').click();await page.locator('[data-saved-quizzes] > summary').click();
 assert.equal(await page.locator('[data-saved-quizzes]').evaluate(n=>n.previousElementSibling?.hasAttribute('data-skipped-log')),true);
 assert.equal(await page.locator('[data-open-saved-quiz]').count(),mode==='migration'?1:2);
 if(mode==='migration'){
  const state=await page.evaluate(()=>({skipped:GM_getValue('xxt-skipped:xxt-auto:https://mooc1.chaoxing.com/course/class',[]),saved:GM_getValue('xxt-saved-quizzes:xxt-auto:https://mooc1.chaoxing.com/course/class',[])}));
  assert.equal(state.skipped.length,1);assert.equal(state.skipped[0].reason,'保存结果不明');assert.equal(state.saved.length,1);
  await page.locator('[data-action=stop]').click();assert.equal(await page.locator('[data-open-saved-quiz]').count(),1);
  observations.push({mode,...state,events});await context.close();continue;
 }
 if(mode==='changed-title')await page.evaluate(()=>document.querySelector('.posCatalog_name').setAttribute('title','改名章节'));
 if(mode==='changed-account')await page.evaluate(()=>history.replaceState(null,'','?courseId=course&clazzid=class&cpi=other'));
 await page.locator('[data-open-saved-quiz]').first().click();
 if(mode==='stop-jump'){await page.locator('[data-action=stop]').click();await page.waitForTimeout(1000);assert(!events.includes('card'));assert(!events.some(e=>e.startsWith('scroll:')));}
 else if(mode==='changed-title'||mode==='changed-account'){await page.waitForFunction(()=>/目录已变化|账号或课程标识已变化/.test(document.querySelector('pre').textContent));assert.deepEqual(events,[]);}
 else if(mode==='missing-quiz'){await page.waitForFunction(()=>document.querySelector('pre')?.textContent.includes('未能唯一定位原测验'),null,{timeout:16000});assert(!events.some(e=>e.startsWith('scroll:')));}
 else{await page.waitForFunction(()=>document.querySelector('pre')?.textContent.includes('已打开暂存测验'),null,{timeout:18000});assert(events.includes('chapter'));assert(events.includes('card'));assert(events.includes('scroll:target-b'));assert(!events.includes('scroll:target-a'));}
 assert(!events.includes('MODEL'));assert(!events.includes('SUBMIT'));
 assert.equal(await page.evaluate(()=>sessionStorage.getItem('xxt-auto:https://mooc1.chaoxing.com/course/class')),null);
 observations.push({mode,events,status:await page.locator('pre').textContent()});if(mode==='open-exact')await page.screenshot({path:resolve(out,'opened.png')});await context.close();console.log('saved quiz:',mode,'passed');
}}finally{await browser.close();await writeFile(resolve(out,'observations.json'),JSON.stringify({scope:'Seeded draft records, synthetic chapter/card/quiz DOM, actual title/card click and browser navigation; no live platform writes',observations},null,2));}
console.log(observations.length+' saved-quiz scenarios passed');
