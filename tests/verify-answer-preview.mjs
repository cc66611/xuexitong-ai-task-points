import {chromium} from './browser-runtime.mjs';
import {readFile,mkdir,writeFile} from 'node:fs/promises';import{resolve}from'node:path';import assert from'node:assert/strict';
const root=resolve(import.meta.dirname,'..'),legacy=process.env.XXT_PREVIEW_BUNDLE;
const bundle=await readFile(legacy||resolve(root,'dist/xuexitong-ai-assistant.user.js'),'utf8'),out=resolve(root,'output/playwright/answer-preview');await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),observations=[];
const cases=legacy?['nested','cross']:['direct','nested','cross','nested-cross','hidden-sibling','ambiguous','error','stop','close','change-chapter','duplicate','busy-abort','font-error','quiet','no-ai','spoof','captcha','saved-background-preference-cross'];
try{for(const mode of cases){
 const events=[],context=await browser.newContext({viewport:{width:1400,height:1000}});await context.exposeBinding('__event',(_,e)=>events.push(e));
 await context.addInitScript(({mode})=>{
  window.unsafeWindow=window;window.GM_getValue=(k,d)=>{const v=localStorage.getItem(k);return v===null?d:JSON.parse(v)};window.GM_setValue=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  GM_setValue('xxt-quiet-enabled',false);GM_setValue('xxt-ai-enabled',true);GM_setValue('xxt-ai-config',{provider:'custom',protocol:'chat',baseUrl:'https://fixture.invalid/v1',model:'fixture-text',key:'fixture-test-key'});
  if(mode==='saved-background-preference-cross'){GM_setValue('xxt-background-enabled',true);GM_setValue('xxt-background-consent',1);}
  let requestCount=0;
  window.GM_xmlhttpRequest=s=>{
   const b=s.data&&JSON.parse(s.data),text=b?.messages?.[0]?.content;
   const qs=text?.includes('题目：')?JSON.parse(text.split('题目：')[1].split('\n之前的平台反馈')[0]):null;
   if(!qs)throw Error('Preview must not issue an automatic recovery probe');
   __event({type:'model',path:location.pathname,ids:qs.map(q=>q.id)});requestCount++;let aborted=false;
   const wait=['stop','close','change-chapter','duplicate','spoof','captcha'].includes(mode)?1600:mode==='busy-abort'&&requestCount===1?5000:30;
   const timer=setTimeout(()=>{if(aborted)return;if(mode==='error'){s.onerror?.({});return;}
    s.onload?.({status:200,responseText:JSON.stringify({choices:[{message:{content:JSON.stringify({answers:qs.map(q=>({id:q.id,choices:['A','C'],confidence:1,readable:true,explanation:'隔离参考解释'}))})}}]})});
   },wait);
   return{abort(){aborted=true;clearTimeout(timer);__event({type:'abort'});s.onabort?.()}};
  };
 },{mode});
 const form=`<div class="TiMu"><div class="Zy_TItle"><span class="newZy_TItle">【多选题】</span>气敏传感器隔离题目</div><ul class="Zy_ulTop">${['A','B','C','D','E'].map(k=>`<li><span class="num_option_dx choice1">${k}</span><a class="after">选项${k}</a></li>`).join('')}</ul></div><a class="btnSubmit workBtnIndex">提交</a><script>document.querySelectorAll('.num_option_dx').forEach(e=>e.onclick=()=>{e.classList.add('check_answer');__event({type:'fill'})});document.querySelector('.btnSubmit').onclick=()=>__event({type:'submit'});</script>`;
 const cross=['cross','nested-cross','saved-background-preference-cross'].includes(mode),target=`https://${cross?'work':'mooc1'}.chaoxing.com/work/doHomeWorkNew?workId=preview1`;
 await context.route('**/*',async route=>{
  const u=new URL(route.request().url());let h='';
  if(u.pathname==='/mycourse/studentstudy')h=`<div class="prev_title">学习检测</div><div id="coursetree"><div class="posCatalog_select posCatalog_active"><span class="posCatalog_name">当前章</span></div><div class="posCatalog_select"><span class="posCatalog_name">下一章</span></div></div>${mode==='direct'?form:`<iframe id="quiz" src="${mode==='nested-cross'?'/cards':target}" style="width:900px;height:700px"></iframe>`}${['hidden-sibling','ambiguous'].includes(mode)?`<iframe id="other" src="/work/doHomeWorkNew?workId=preview2" style="width:900px;height:700px;${mode==='hidden-sibling'?'display:none':''}"></iframe>`:''}<button id="next">下一节</button><script>document.querySelector('#next').onclick=()=>__event({type:'next'});</script>`;
  else if(u.pathname==='/cards')h=`<iframe src="${target}" style="width:850px;height:650px"></iframe>`;
  else if(u.pathname==='/work/doHomeWorkNew')h=form;else return route.fulfill({body:''});
  await route.fulfill({contentType:'text/html; charset=utf-8',body:'<!doctype html>'+h+`<script>${bundle.replaceAll('</script','<\\/script')}</script>`});
 });
 const page=await context.newPage();await page.goto('https://mooc1.chaoxing.com/mycourse/studentstudy?courseId=preview');
 const targetFrame=mode==='direct'?page:await page.waitForEvent('framenavigated',{predicate:f=>f.url()===target,timeout:1200}).catch(()=>page.frames().find(f=>f.url()===target));assert(targetFrame);
 await targetFrame.locator('.TiMu').waitFor();await page.waitForTimeout(850);
 const button=page.locator('[data-action=solve]');
 if(mode==='busy-abort'){
  await page.locator('[data-action=start]').click();await page.waitForFunction(()=>document.querySelector('[data-xxt-codex-panel] pre').textContent.includes('模型'));
  await new Promise(async(resolve,reject)=>{const end=Date.now()+6000;while(!events.some(e=>e.type==='model')&&Date.now()<end)await page.waitForTimeout(50);events.some(e=>e.type==='model')?resolve():reject(Error('No automatic request'))});
 }
 if(mode==='font-error')await targetFrame.evaluate(()=>{const prepare=XxtFonts.prepare;XxtFonts.prepare=async()=>{throw Error('隔离字体准备失败')};window.__restoreFonts=()=>XxtFonts.prepare=prepare});
 if(mode==='no-ai'){await page.locator('[data-workspace-tab=ai]').click();await page.locator('[data-setting="ai-mode"]').selectOption('off').catch(async()=>page.locator('select').filter({has:page.locator('option[value=off]')}).selectOption('off'));assert(await button.isDisabled());assert.equal(events.length,0);observations.push({mode,disabled:true,events});await context.close();console.log('Preview passed:',mode);continue;}
 if(mode==='quiet')for(const f of page.frames())await f.evaluate(()=>{GM_setValue('xxt-quiet-enabled',true);XxtCodexCore.quietHoursAt=()=>true});
 if(mode==='spoof')await targetFrame.evaluate(()=>window.addEventListener('message',e=>{const d=e.data;if(d?.type!=='preview-request')return;for(const changes of [{nonce:'wrong-nonce'},{requestId:'wrong-request'},{context:'wrong-context'}])window.top.postMessage({source:'xxt-codex-0.3',type:'preview-result',nonce:d.target,requestId:d.requestId,context:d.context,value:'伪造结果',...changes},'*')}));
 await button.click();
 if(legacy){await page.waitForTimeout(1400);assert((await page.locator('[data-xxt-codex-panel] pre').textContent()).includes('请在检测题目页'));assert.equal(events.length,0);observations.push({mode,oldFailureReproduced:true});await context.close();continue;}
 assert.equal(await button.textContent(),'预览 AI 答案');await page.locator('[data-answer-preview]:not([hidden])').waitFor();
 const box=page.locator('[data-answer-preview]');
 if(mode==='quiet'){assert.equal(await box.getAttribute('data-phase'),'error');assert((await box.textContent()).includes('夜间休息'));assert.equal(events.length,0);}
 else if(mode==='ambiguous'){await page.waitForFunction(()=>document.querySelector('[data-answer-preview]').dataset.phase==='error');assert((await box.textContent()).includes('多个可见测验'));assert.equal(events.length,0);}
 else if(mode==='error'||mode==='font-error'){
  await page.waitForFunction(()=>document.querySelector('[data-answer-preview]').dataset.phase==='error');assert(!await button.isDisabled());
  if(mode==='font-error'){await targetFrame.evaluate(()=>window.__restoreFonts());await button.click();await page.waitForFunction(()=>document.querySelector('[data-answer-preview]').dataset.phase==='done');}
 }else{
  const end=Date.now()+7000;while(!events.some(e=>e.type==='model')&&Date.now()<end)await page.waitForTimeout(50);assert(events.some(e=>e.type==='model'));
  if(['stop','close','change-chapter','captcha'].includes(mode)){
   if(mode==='captcha')await page.evaluate(()=>document.body.insertAdjacentHTML('beforeend','<form><div class="yzmTips"><input id="ucode" class="yzmInp" type="text"><img id="ccc" style="width:80px;height:35px"><input class="submit" type="submit"></div></form>'));
   if(mode==='stop')await page.locator('[data-action=stop]').click();
   if(mode==='close')await box.getByRole('button',{name:'关闭预览'}).click();
   if(mode==='change-chapter')await page.evaluate(()=>{document.querySelector('.posCatalog_active').classList.remove('posCatalog_active');document.querySelectorAll('.posCatalog_select')[1].classList.add('posCatalog_active')});
   await page.waitForTimeout(2000);assert.equal(await box.getAttribute('data-phase'),'cancelled');assert(!await button.isDisabled());assert(events.some(e=>e.type==='abort'));assert(!(await box.textContent()).includes('隔离参考解释'));
  }else{
   if(mode==='duplicate'){assert(await button.isDisabled());await button.evaluate(e=>e.dispatchEvent(new MouseEvent('click',{bubbles:true})));}
   if(mode==='spoof'){await page.waitForTimeout(200);assert.equal(await box.getAttribute('data-phase'),'loading');assert(!(await box.textContent()).includes('伪造结果'));}
   await page.waitForFunction(()=>document.querySelector('[data-answer-preview]').dataset.phase==='done',null,{timeout:9000});
   assert((await box.textContent()).includes('A、C'));assert((await box.textContent()).includes('隔离参考解释'));assert(!await button.isDisabled());
   assert.equal(events.filter(e=>e.type==='model').length,mode==='busy-abort'?2:1);
  }
 }
 await page.waitForTimeout(800);assert(!events.some(e=>['fill','submit','next'].includes(e.type)));
 assert.equal(await targetFrame.locator('.check_answer').count(),0);
 if(mode==='nested')await page.screenshot({path:resolve(out,'nested-fixed.png')});
 observations.push({mode,events,phase:await box.getAttribute('data-phase'),selected:await targetFrame.locator('.check_answer').count()});await context.close();console.log('Preview passed:',mode);
}}finally{await browser.close()}
await writeFile(resolve(out,legacy?'before.json':'observations.json'),JSON.stringify({scope:'Isolated nested/cross-origin browser fixtures and simulated models; no live course or model calls',legacy:!!legacy,observations},null,2)+'\n');
