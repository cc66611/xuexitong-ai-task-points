import{chromium}from'./browser-runtime.mjs';import{readFile,mkdir,writeFile}from'node:fs/promises';import{resolve}from'node:path';import assert from'node:assert/strict';
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'output/playwright/pending-review'),bundle=await readFile(resolve(root,'dist/xuexitong-ai-assistant.user.js'),'utf8');await mkdir(out,{recursive:true});
const pendingHTML='<div class="RightCon newTestCon"><div class="newTestTitle"><div class="fl TestTitle_name">章节测验</div><div class="fr testTit_status"><i></i>待批阅</div></div><div class="radiusBG"><div class="CeYan"><div class="ceyan_name">Part 2 题量:18 满分:100</div><div class="ansbtnBox"><a class="jb_btn_bg">修改答案</a></div><form>'+Array.from({length:18},(_,i)=>'<div class="TiMu"><div class="Zy_TItle"><span class="newZy_TItle">【简答题】</span>Read the passage and explain the main point.</div><p>我的答案：The parties should agree on clear terms.</p></div>').join('')+'</form></div><div class="ZY_sub clearfix"></div></div></div>';
const browser=await chromium.launch({headless:true}),observations=[];
try{
 for(const mode of ['existing','after-submit','no-next','partial-score','zero-question-result']){
  const page=await browser.newPage({viewport:{width:1400,height:1000}});page.setDefaultTimeout(12000);let documentLoads=0;
  await page.route('**/*',route=>{documentLoads++;return route.fulfill({contentType:'text/html; charset=utf-8',body:'<main></main>'});});await page.goto('https://mooc1.chaoxing.com/mooc-ans/work/doHomeWorkNew?workId=pending-fixture');
  await page.evaluate(({mode,pendingHTML})=>{
   window.unsafeWindow=window;window.__counts={models:0,submit:0,modify:0,redo:0,next:0};window.__gm={'xxt-quiet-enabled':false,'xxt-ai-enabled':true,'xxt-short-answer-mode':'submit','xxt-ai-config':{provider:'custom',protocol:'chat',baseUrl:'https://fixture.invalid/v1',model:'text-only',key:'fixture-only'}};
   window.GM_getValue=(k,f)=>__gm[k]??f;window.GM_setValue=(k,v)=>__gm[k]=structuredClone(v);
   window.GM_xmlhttpRequest=s=>{__counts.models++;const text=JSON.parse(s.data).messages[0].content,questions=JSON.parse(text.split('题目：')[1].split('\n之前的平台反馈')[0]);setTimeout(()=>s.onload({status:200,responseText:JSON.stringify({choices:[{message:{content:JSON.stringify({answers:questions.map(q=>({id:q.id,choices:[],texts:['The parties should agree on clear terms.'],readable:true,confidence:1,explanation:'中文解释仅用于面板'}))})}}]})}),20);return{abort(){}};};
   const render=()=>{document.querySelector('main').innerHTML=pendingHTML+(mode==='partial-score'?'<p>最终成绩60分 满分100</p>':'')+(mode==='no-next'?'':'<button id="next">下一节</button>');document.querySelector('.jb_btn_bg').onclick=()=>__counts.modify++;document.querySelector('#next')?.addEventListener('click',()=>__counts.next++);};
   if(mode==='after-submit'){document.querySelector('main').innerHTML='<div class="TiMu"><div class="Zy_TItle"><span class="newZy_TItle">【简答题】</span>Read the passage and explain the main point.</div><textarea></textarea></div><a class="btnSubmit workBtnIndex">提交</a>';document.querySelector('.btnSubmit').onclick=()=>{__counts.submit++;render();};}
   else {render();if(mode==='zero-question-result')document.querySelectorAll('.TiMu').forEach(n=>n.remove());}
  },{mode,pendingHTML});
  await page.addScriptTag({content:bundle});await page.locator('[data-action=start]').click();
  if(mode==='no-next')await page.waitForFunction(()=>document.querySelector('pre')?.textContent.includes('当前没有下一节入口'));
  else await page.waitForFunction(()=>__counts.next===1);
  await page.evaluate(()=>{const now=Date.now;Date.now=()=>now()+180000;});await page.waitForTimeout(350);
  const result=await page.evaluate(()=>({counts:__counts,result:XxtCodexDom.readResult(document),records:Object.entries(__gm).filter(([k])=>k.startsWith('xxt-check:')).map(([,v])=>v),skips:Object.entries(__gm).filter(([k])=>k.startsWith('xxt-skipped:')).flatMap(([,v])=>v),status:document.querySelector('pre').textContent}));
  assert.equal(result.counts.models,mode==='after-submit'?1:0);assert.equal(result.counts.submit,mode==='after-submit'?1:0);assert.equal(result.counts.modify,0);assert.equal(result.counts.redo,0);assert.equal(documentLoads,1);
  assert(result.result.pendingReview);assert.equal(result.result.finalScore,null);assert.equal(result.result.allCorrect,null);assert.equal(result.skips.length,0);
  assert(result.records.some(r=>r.phase==='awaiting-review'&&r.gradingState==='pending-review'&&!r.gradeReloaded));assert(result.records.every(r=>!r.history?.length&&!r.attempts?.length));
  assert.equal(await page.locator('.xxt-status-badge').textContent(),'已提交 · 待批阅');
  observations.push({mode,...result,documentLoads});if(mode==='existing')await page.screenshot({path:resolve(out,'pending.png')});await page.close();console.log('pending-review:',mode,'passed');
 }
 for(const mode of ['pending-in-question','hidden-status','editable','wrong-label','two-result-roots','graded-later']){
  const page=await browser.newPage();await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<main></main>'}));await page.goto('https://mooc1.chaoxing.com/mooc-ans/work/doHomeWorkNew?workId=parse');
  await page.evaluate(({mode,pendingHTML})=>{window.unsafeWindow=window;window.GM_getValue=(k,f)=>k==='xxt-quiet-enabled'?false:f;window.GM_setValue=()=>{};window.GM_xmlhttpRequest=()=>{throw Error('No requests allowed')};let html=pendingHTML;if(mode==='pending-in-question')html='<div class="TiMu">'+html+'</div>';if(mode==='hidden-status')html=html.replace('fr testTit_status','fr testTit_status hidden-badge')+'<style>.hidden-badge{display:none}</style>';if(mode==='editable')html+='<button class="btnSubmit workBtnIndex">提交</button>';if(mode==='wrong-label'||mode==='graded-later')html=html.replace('待批阅',mode==='wrong-label'?'待完成':'已完成');if(mode==='two-result-roots')html+=pendingHTML;if(mode==='graded-later')html+='<p>最终成绩90分 满分100</p>';document.querySelector('main').innerHTML=html;},{mode,pendingHTML});
  await page.addScriptTag({content:bundle});const result=await page.evaluate(()=>XxtCodexDom.readResult(document));
  if(mode==='two-result-roots')assert(result.ambiguous);else if(mode==='graded-later'){assert.equal(result.finalScore,90);assert(!result.pendingReview);}else assert.equal(result,null,mode);
  observations.push({mode,result});await page.close();
 }
}finally{await browser.close();await writeFile(resolve(out,'observations.json'),JSON.stringify({scope:'User live status DOM contract replayed on isolated pages; models, submission and grades simulated; no real course writes',observations},null,2));}
console.log(observations.length+' pending-review scenarios passed');
