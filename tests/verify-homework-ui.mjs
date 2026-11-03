import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from './browser-runtime.mjs';
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'output/playwright/homework');
await mkdir(out,{recursive:true});
// This layout/collector harness supplies its own controller below. Production
// mounting is exercised unmodified in verify-homework-runtime.mjs.
const bundle=(await readFile(resolve(root,'dist/xuexitong-ai-assistant.user.js'),'utf8')).replaceAll('studyControls:true','studyControls:false');
const moduleCode=await readFile(resolve(root,'src/homework.cjs'),'utf8');
const collector=await readFile(resolve(root,'tools/collect-homework-element.js'),'utf8');
let html=(await readFile(resolve(root,'tests/ui-preview.html'),'utf8')).replace('<script src="/dist/xuexitong-ai-assistant.user.js"></script>','');
html=html.replace('学习助手 · 开发预览</h1>','作业模式 · 独立界面预览</h1>').replace('<div id="coursetree">','<p><strong>此页未适配真实作业，不是安装包。题目和AI均为演示数据。</strong></p><div id="coursetree">');
const hooks=`
(() => {
 const panel=document.querySelector('[data-xxt-codex-panel]'),host=panel.querySelector('.xxt-body'),actions=panel.querySelector('.xxt-actions');
 window.__homeworkRequests=[];window.__homeworkWrites=0;window.__homeworkFinishes=[];
 const questions=[{id:'q1',number:'1',type:'single',text:'合成示例单选题',options:[{key:'A',text:'示例A'},{key:'B',text:'示例B'}]},{id:'q15',number:'15',type:'essay',text:'合成主观题示例',options:[],slots:1}];
 let current=[{id:'q1',choices:['A']},{id:'q15',texts:['演示原有文字']}];
 let ui;
 const controller=XxtHomework.createController({adapter:{verified:true,scan:()=>({identity:'synthetic-work',questions}),read:()=>structuredClone(current),policy:()=>ui.state,
  apply:async(_p,a,g)=>{g();__homeworkWrites++;current=structuredClone(a);},finish:async kind=>{__homeworkFinishes.push(kind);return{state:'confirmed'};}},
  ask:async p=>{__homeworkRequests.push({count:p.questions.length,hasHistory:'history' in p});await new Promise(r=>setTimeout(r,window.__reviewDelay||20));return{answers:p.questions.map(q=>q.id==='q1'?{id:q.id,choices:['A'],readable:true}:{id:q.id,texts:['演示新的文字'],readable:true})};},notify:message=>panel.querySelector('pre').textContent=message});
 ui=XxtHomework.mount({panel,host,actions,chapterNodes:[panel.querySelector('.xxt-settings'),panel.querySelector('[data-skipped-log]')],
  read:()=>JSON.parse(sessionStorage.getItem('demo-homework-settings')||'{}'),write:v=>sessionStorage.setItem('demo-homework-settings',JSON.stringify(v)),onChange:()=>controller.cancel(),onReview:s=>controller.review(s)});
 actions.addEventListener('click',event=>{if(ui.state.mode!=='homework')return;const action=event.target.closest('[data-action]')?.dataset.action;if(!['start','stop','solve'].includes(action))return;event.stopImmediatePropagation();event.preventDefault();if(action==='stop'){controller.cancel();ui.cancelReview();return;}if(action==='solve'){panel.querySelector('pre').textContent='界面预览中的题目是演示数据，真实作业适配待采集。';return;}void controller.run(ui.state).catch(e=>panel.querySelector('pre').textContent=e.message);},true);
 window.__homeworkUI=ui;window.__homeworkController=controller;
})();`;
const demo=html.replace('</html>','')+`<script>${bundle.replaceAll('</script','<\\/script')}</script><script>${moduleCode}</script><script>${hooks}</script></html>`;
await writeFile(resolve(out,'homework-ui-preview.html'),demo);
const browser=await chromium.launch({headless:true,channel:'chrome'}),observations=[];
try{
 const p=await browser.newPage({viewport:{width:1440,height:1150}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>r.request().resourceType()==='document'?r.fulfill({contentType:'text/html; charset=utf-8',body:demo}):r.abort());
 await p.goto('https://mooc1.chaoxing.com/mycourse/studentstudy?brand=deepseek');
 const group=p.locator('[data-homework-modes]');await group.waitFor();
 const choice=(groupName,value)=>p.locator('[data-choice-group="'+groupName+'"][data-choice="'+value+'"]');
 assert.equal(await choice('学习板块','chapter').getAttribute('aria-pressed'),'true');
 assert.equal(await p.locator('[data-homework-options]').isVisible(),false);
 await choice('学习板块','homework').click();
 assert.equal(await p.locator('[data-homework-options]').isVisible(),true);
 assert.equal(await choice('主观题','skip').getAttribute('aria-pressed'),'true');
 assert.equal(await choice('作答后','none').getAttribute('aria-pressed'),'true');
 assert.equal(await choice('作答后','submit').isDisabled(),true);
 assert.equal(await p.locator('.xxt-settings').isVisible(),false);
 assert.equal(await p.locator('[data-action=start]').textContent(),'作答当前作业');
 observations.push({name:'default-homework-policy',passed:true});
 await p.screenshot({path:resolve(out,'homework-default-desktop.png'),animations:'disabled'});
 await p.locator('.xxt-mode-dock').screenshot({path:resolve(out,'mode-rail-homework.png'),animations:'disabled'});
 const rail=await group.evaluate(el=>{const boxes=[...el.children].map(b=>{const r=b.getBoundingClientRect(),s=getComputedStyle(b);return{left:r.left,right:r.right,pressed:b.getAttribute('aria-pressed'),transform:s.transform,shadow:s.boxShadow};});return{gap:getComputedStyle(el).gap,boxes};});
 assert.equal(rail.gap,'0px');assert.equal(rail.boxes.length,2);assert(Math.abs(rail.boxes[1].left-rail.boxes[0].right)<1);assert(rail.boxes[1].shadow.includes('inset'));
 assert.equal(await group.evaluate(el=>getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length),2);
 const material=await group.evaluate(el=>[el,...el.querySelectorAll('button')].map(n=>({backgroundImage:getComputedStyle(n).backgroundImage,backgroundColor:getComputedStyle(n).backgroundColor})));
 assert(material.every(s=>s.backgroundImage==='none'),'Mode rail must use the shared translucent surface, not an opaque gradient well');
 observations.push({name:'connected-rail-no-gap-and-inset-selection',passed:true});
 assert.deepEqual(await group.locator('button').allTextContents(),['章节','作业']);
 assert.equal(await p.locator('[data-choice="exam"]').count(),0);
 assert(!/考试/.test(await p.locator('[data-xxt-codex-panel]').innerText()));
 assert.equal(await choice('学习板块','homework').getAttribute('aria-pressed'),'true');
 observations.push({name:'chapter-homework-only-no-exam-placeholder',passed:true});
 await choice('主观题','ai').click();assert.equal(await choice('作答后','submit').isDisabled(),false);
 await choice('作答后','submit').click();await choice('主观题','skip').click();
 assert.equal(await choice('作答后','submit').isDisabled(),true);assert.equal(await choice('作答后','none').getAttribute('aria-pressed'),'true');
 observations.push({name:'submit-interlock-and-reset',passed:true});
 await choice('主观题','ai').click();await choice('作答后','save').click();await p.reload();await group.waitFor();
 assert.equal(await choice('主观题','ai').getAttribute('aria-pressed'),'true');assert.equal(await choice('作答后','save').getAttribute('aria-pressed'),'true');
 observations.push({name:'settings-persist-reload',passed:true});
 const review=p.locator('[data-action=homework-review]');
 await review.click();await p.waitForFunction(()=>document.querySelector('[data-homework-review-result]').textContent.includes('第1轮'));
 assert.match(await p.locator('[data-homework-review-result]').textContent(),/一致1题，不一致1题/);
 assert.match(await p.locator('[data-homework-review-details]').textContent(),/第15题：不一致/);
 assert.match(await p.locator('[data-homework-review-details]').textContent(),/当前答案：演示原有文字；本次AI答案：演示新的文字/);
 assert(!await p.locator('[data-homework-review-details]').textContent().then(s=>/"texts"|"choices"/.test(s)));
 await p.locator('[data-homework-review-details]').scrollIntoViewIfNeeded();
 await p.screenshot({path:resolve(out,'homework-review-result.png'),animations:'disabled'});
 await review.click();await p.waitForFunction(()=>document.querySelector('[data-homework-review-result]').textContent.includes('第2轮'));
 const counts=await p.evaluate(()=>({requests:__homeworkRequests.length,writes:__homeworkWrites,finishes:__homeworkFinishes.length}));assert.deepEqual(counts,{requests:2,writes:0,finishes:0});
 observations.push({name:'two-fresh-reviews-difference-question-and-no-writes',passed:true,...counts});
 await p.evaluate(()=>window.__reviewDelay=400);await review.click();await p.locator('[data-action=stop]').click();await p.waitForTimeout(500);
 assert.match(await p.locator('[data-homework-review-result]').textContent(),/取消/);
 observations.push({name:'stop-prevents-late-review-result',passed:true});
 await choice('学习板块','chapter').click();assert.equal(await p.locator('.xxt-settings').isVisible(),true);assert.equal(await p.locator('[data-action=start]').textContent(),'开始自动');
 await p.locator('.xxt-mode-dock').screenshot({path:resolve(out,'mode-rail-chapter.png'),animations:'disabled'});
 observations.push({name:'chapter-restores-controls',passed:true});
 await choice('学习板块','homework').click();
 await p.screenshot({path:resolve(out,'homework-desktop.png'),animations:'disabled'});
 for(const [width,height,scale]of [[390,844,1],[390,844,2],[1440,1150,1]]){
  await p.setViewportSize({width,height});await p.evaluate(s=>document.documentElement.style.zoom=String(s),scale);
  const geometry=await p.evaluate(()=>{const p=document.querySelector('[data-xxt-codex-panel]'),b=p.querySelector('.xxt-body');return{overflow:b.scrollWidth-b.clientWidth,optionsOverflow:p.querySelector('[data-homework-options]').scrollWidth-p.querySelector('[data-homework-options]').clientWidth};});
  assert(geometry.overflow<=1&&geometry.optionsOverflow<=1,JSON.stringify(geometry));
  observations.push({name:'layout-'+width+'-zoom-'+scale,passed:true,...geometry});
  if(width===390&&scale===1)await p.screenshot({path:resolve(out,'homework-mobile.png'),animations:'disabled'});
 }
 assert.deepEqual(errors,[]);
 await p.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await choice('学习板块','homework').evaluate(b=>getComputedStyle(b).transitionDuration),'0s');
 observations.push({name:'rail-reduced-motion',passed:true});
 await p.locator('[data-workspace-tab=more]').click();await p.locator('[data-skin-choice=nailoong]').click();
 await p.locator('.xxt-mode-dock').screenshot({path:resolve(out,'mode-rail-light.png'),animations:'disabled'});
 observations.push({name:'rail-light-theme-rendered',passed:true});
 // Collector safety checks run against purpose-built, synthetic documents.
 const cp=await browser.newPage();let network=0;cp.on('request',()=>network++);await cp.route('**/*',r=>r.fulfill({body:''}));
 await cp.setContent('<div id="question"><h3>1. 合成题</h3><input type="hidden" name="enc" value="SENSITIVE_SENTINEL"><input type="password" value="SENSITIVE_SENTINEL"><textarea id="answerEditor1">SENSITIVE_SENTINEL</textarea><button id="save" onclick="saveWork(123,\'SENSITIVE_SENTINEL\')">暂时保存</button><img src="https://example.invalid/private?enc=SENSITIVE_SENTINEL"><span>联系13900001111</span></div><script>window.__clicks=0;document.onclick=()=>__clicks++;</script>');
 const before=await cp.locator('body').innerHTML();
 const result=await cp.evaluate(code=>{window.$0=document.querySelector('#question');window.copy=v=>window.__copied=v;return{result:eval(code),text:window.__copied};},collector);
 assert(!result.text.includes('SENSITIVE_SENTINEL'));assert(!result.text.includes('13900001111'));assert(!result.text.includes('https://example.invalid'));assert.match(result.text,/saveWork/);
 assert.equal(await cp.locator('body').innerHTML(),before);assert.equal(await cp.evaluate(()=>__clicks),0);assert.equal(network,1); // Image request from fixture creation only.
 observations.push({name:'collector-read-only-removes-values-urls-event-args-and-phone',passed:true});
 for(const selector of ['body','input[type=password]','input[type=hidden]']){
  assert.equal(await cp.evaluate(({code,selector})=>{window.$0=document.querySelector(selector);try{eval(code);return false;}catch{return true;}},{code:collector,selector}),true);
 }
 observations.push({name:'collector-rejects-whole-page-and-sensitive-root',passed:true});
 await cp.close();
 await writeFile(resolve(out,'observations.json'),JSON.stringify({scope:'Synthetic fixtures only; no actual homework, save, submission, model or grade validation',observations},null,2));
 console.log(JSON.stringify({passed:observations.length,observations}));
}finally{await browser.close();}
