import {chromium} from './browser-runtime.mjs';import {readFile,mkdir,writeFile} from 'node:fs/promises';import {resolve} from 'node:path';import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'output/playwright/retry-navigation');await mkdir(out,{recursive:true});
const legacy=process.argv.includes('--legacy'),bundle=await readFile(process.env.XXT_RETRY_BUNDLE||resolve(root,'dist/xuexitong-ai-assistant.user.js'),'utf8'),browser=await chromium.launch({headless:true}),observations=[];
try{for(const mode of legacy?['title']:['title','delegated','wrapper','already-active','delayed','stop','disabled','no-open']){
 const context=await browser.newContext({viewport:{width:1100,height:1000}});await context.addInitScript(mode=>{
  window.unsafeWindow=window;window.__gm={'xxt-ai-enabled':false,'xxt-quiet-enabled':false};window.__events=[];window.__requests=0;
  GM_getValue=(k,d)=>__gm[k]??d;GM_setValue=(k,v)=>__gm[k]=structuredClone(v);GM_xmlhttpRequest=()=>{__requests++;throw Error('Model/network not permitted');};
  const scope=`xxt-auto:${location.origin}/fixture/class/account`;__gm[`xxt-skipped:xxt-auto:${location.origin}/fixture/class`]=[{scope,index:1,title:'Target',chapter:'Target',reason:'待复核',status:'pending'}];
  window.fixtureOpen=()=>{__events.push('click');if(mode==='no-open')return;const apply=()=>{__events.push('open');document.querySelector('.posCatalog_active')?.classList.remove('posCatalog_active');document.querySelectorAll('.posCatalog_select')[1].classList.add('posCatalog_active');document.querySelector('#content').innerHTML='<div class="ans-attach-ct" data-id="new-content"><span class="ans-job-icon"></span>New chapter</div>';};if(['delayed','stop'].includes(mode))setTimeout(apply,mode==='stop'?800:350);else apply();};
 },mode);
 await context.route('**/*',r=>r.fulfill({contentType:'text/html;charset=utf-8',body:`<div id="coursetree"><div class="posCatalog_select ${mode==='already-active'?'':'posCatalog_active'}"><span class="posCatalog_name" title="Current">Current</span></div><div class="posCatalog_select ${mode==='already-active'?'posCatalog_active':''}" ${mode==='wrapper'?'onclick="fixtureOpen()"':''}><span class="posCatalog_name" title="Target" ${['title','already-active','delayed','stop','no-open'].includes(mode)?'onclick="fixtureOpen()"':''} ${mode==='disabled'?'aria-disabled="true"':''}>Target</span><span class="orangeNew">1</span></div></div><div id="content">Current chapter</div>`}));
 const page=await context.newPage();await page.goto('https://mooc1.chaoxing.com/mycourse/studentstudy?courseId=fixture&clazzid=class&cpi=account');
 if(mode==='delegated')await page.evaluate(()=>document.querySelector('#coursetree').addEventListener('click',event=>{if(event.target.closest('.posCatalog_name')?.getAttribute('title')==='Target')fixtureOpen();}));
 await page.addScriptTag({content:bundle});await page.locator('[data-workspace-tab=records]').click();await page.locator('[data-skipped-log] summary').click();const since=Date.now();await page.locator('[data-retry-pending]').click();
 if(legacy||mode==='no-open'){
  await page.waitForFunction(()=>document.querySelector('[data-xxt-codex-panel] pre').textContent.includes('补做章节未能打开'),null,{timeout:16000});assert.deepEqual(await page.evaluate(()=>__events),legacy?[]:['click']);
  if(!legacy){const diag=await page.evaluate(()=>JSON.parse(XxtDiagnostics.create({read:()=>__gm['xxt-diagnostics']}).export('1.5.6')));const last=diag.diagnostics.at(-1);assert.equal(last.code,'NAVIGATE');assert.equal(last.phase,'navigate');assert(last.elapsedMs>=12000);assert(!JSON.stringify(diag).includes('Target'));}
 }else if(mode==='disabled'){
  await page.waitForFunction(()=>document.querySelector('pre').textContent.includes('标题不可点击'));assert.deepEqual(await page.evaluate(()=>__events),[]);
 }else if(mode==='stop'){
  await page.waitForFunction(()=>__events.includes('click'));await page.locator('[data-action=stop]').click();await page.waitForTimeout(1200);assert.equal(await page.evaluate(()=>sessionStorage.getItem(`xxt-auto:${location.origin}/fixture/class`)),null);assert.match(await page.locator('pre').textContent(),/停止/);
 }else{
  await page.waitForFunction(()=>document.querySelectorAll('.posCatalog_select')[1].classList.contains('posCatalog_active'));await page.waitForFunction(()=>sessionStorage.getItem(`xxt-auto:${location.origin}/fixture/class`)==='1');assert.deepEqual(await page.evaluate(()=>__events),mode==='already-active'?[]:['click','open']);await page.locator('[data-action=stop]').click();
 }
 assert.equal(await page.evaluate(()=>__requests),0);if(mode==='title')await page.screenshot({path:resolve(out,legacy?'legacy-timeout.png':'title-opened.png')});observations.push({mode,passed:true,elapsedMs:Date.now()-since,events:await page.evaluate(()=>__events),modelCalls:0});await context.close();
}await writeFile(resolve(out,legacy?'legacy-observations.json':'observations.json'),JSON.stringify({scope:'Real title onclick/delegation contract on isolated pages; no live course or model',legacy,observations},null,2));console.log('Retry navigation',legacy?'old failure reproduced':'passed',observations.length);
}finally{await browser.close();}
