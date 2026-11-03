import {chromium} from './browser-runtime.mjs';
import {resolve} from 'node:path';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'..'),out=root+'/output/playwright/workbuddy';await fs.mkdir(out,{recursive:true});
const html=(await fs.readFile(root+'/tests/ui-preview.html','utf8')).replace('<script src="/dist/xuexitong-ai-assistant.user.js"></script>',''),bundle=await fs.readFile(root+'/dist/xuexitong-ai-assistant.user.js','utf8');
const browser=await chromium.launch({headless:true}),results=[];
try{
 for(const width of [1100,390]){
  const page=await browser.newPage({viewport:{width,height:920}});await page.route('**/*',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:html}));
  await page.goto('https://mooc1.chaoxing.com/mycourse/studentstudy?data=empty');
  await page.evaluate(()=>{
   __gm['xxt-ui-preference']='ridge';window.__mode='ok';window.__abortCount=0;
   GM_xmlhttpRequest=spec=>{
    __requests.push({url:spec.url,method:spec.method,body:spec.data});let cancelled=false;
    const timer=setTimeout(()=>{
     if(cancelled)return;
     if(spec.url.endsWith('/health')){spec.onload({status:200,responseText:JSON.stringify({ok:true,backend:__mode==='wrong-backend'?'codex':'codebuddy',model:'fixture-local-model'})});return;}
     if(spec.url.endsWith('/solve')){
      const body=JSON.parse(spec.data),q=body.questions[0],image=q.id==='image-probe';
      if(__mode==='hang-text'&&!image||__mode==='hang-image'&&image)return;
      const numbers=q.text.match(/计算 (\d+) \+ (\d+)/);let text=image?__testCode:String(Number(numbers[1])+Number(numbers[2]));
      if(__mode==='wrong-image'&&image||__mode==='wrong-text'&&!image)text='incorrect';
      spec.onload({status:200,responseText:JSON.stringify({backend:'codebuddy',answers:[{id:q.id,choices:[],texts:[text],readable:true,confidence:1,explanation:'隔离模拟'}]})});return;
     }
     spec.onload({status:200,responseText:'{}'});
    },25);return{abort(){cancelled=true;clearTimeout(timer);__abortCount++;spec.onabort?.();}};
   };
  });
  await page.addScriptTag({content:bundle});await page.emulateMedia({reducedMotion:'reduce'});
  const panel=page.locator('[data-xxt-codex-panel]');await panel.locator('[data-workspace-tab=ai]').click();
  const form=panel.locator('[data-ai-settings]');await form.locator('summary').click();
  await form.locator('[data-ai-field=provider]').selectOption('codebuddy');
  assert.equal(await form.locator('[data-ai-field=baseUrl]').inputValue(),'http://127.0.0.1:18764');
  assert.equal(await form.locator('[data-ai-field=protocol]').inputValue(),'codebuddy');
  assert.match(await form.locator('[data-ai-key-help]').innerText(),/WorkBuddy 相同站点、相同账号/);
  const guide=form.locator('[data-workbuddy-guide]');assert(await guide.isVisible());assert.equal(await guide.getAttribute('href'),'https://github.com/Flyer2333/xuexitong-ai-assistant/blob/main/docs/WORKBUDDY.md');assert.equal(await guide.getAttribute('target'),'_blank');assert.match(await guide.getAttribute('rel'),/noopener/);
  await page.context().route('https://github.com/Flyer2333/xuexitong-ai-assistant/blob/main/docs/WORKBUDDY.md',route=>route.fulfill({contentType:'text/html',body:'WorkBuddy guide fixture'}));
  const popupPromise=page.waitForEvent('popup');await guide.click();const popup=await popupPromise;await popup.waitForLoadState();assert.equal(new URL(popup.url()).pathname,'/Flyer2333/xuexitong-ai-assistant/blob/main/docs/WORKBUDDY.md');await popup.close();
  await form.locator('[data-ai-field=provider]').selectOption('custom');assert.equal(await form.locator('[data-workbuddy-guide]').count(),0);await form.locator('[data-ai-field=provider]').selectOption('codebuddy');
  assert.equal(await form.locator('[data-ai-field=model]').isVisible(),false);
  await form.locator('[data-ai-field=key]').fill('b'.repeat(64));await form.locator('[data-ai-field=purpose]').selectOption('both');await form.locator('[data-ai-save]').click();
  assert.equal(await page.evaluate(()=>__gm['xxt-ai-config'].provider),'codebuddy');
  assert.equal(await page.evaluate(()=>__gm['xxt-ai-vision-config'].provider),'codebuddy');
  assert.equal(await page.evaluate(()=>__requests.filter(r=>r.url.endsWith('/solve')).length),0);
  const connect=panel.locator('[data-action=connect]'),stop=panel.locator('[data-action=stop]');
  await connect.click();let dialog=page.getByRole('dialog');await dialog.waitFor();assert.equal(await dialog.locator('[data-result=success]').count(),2);assert.match(await dialog.innerText(),/CodeBuddy \/ WorkBuddy/);assert.equal(await panel.getAttribute('data-skin'),'ridge');assert.equal(await dialog.locator('svg').count(),0);
  assert.equal(await page.evaluate(()=>__requests.filter(r=>r.url.endsWith('/health')).length),1);await page.screenshot({path:out+`/connected-${width}.png`});await dialog.getByRole('button',{name:'知道了',exact:true}).click();
  for(const mode of ['wrong-image','wrong-text']){
   await page.evaluate(m=>{__mode=m;},mode);await connect.click();dialog=page.getByRole('dialog');await dialog.waitFor();assert.equal(await dialog.locator('[data-result=success]').count(),1);assert.equal(await dialog.locator('[data-result=failure]').count(),1);assert.equal(await panel.getAttribute('data-skin'),'ridge');await dialog.getByRole('button',{name:'知道了',exact:true}).click();
  }
  for(const mode of ['hang-text','hang-image']){
   await page.evaluate(m=>{__mode=m;__requests.length=0;},mode);await connect.click();await page.waitForFunction(m=>__requests.filter(r=>r.url.endsWith('/solve')).length===(m==='hang-text'?1:2),mode);
   const notice=panel.locator('[data-connection-test-wait]');assert.match(await notice.innerText(),/本地 CodeBuddy \/ WorkBuddy 测试/);await stop.click();await page.waitForFunction(()=>!document.querySelector('[data-action=connect]').disabled);assert.equal(await notice.count(),0);assert.equal(await page.getByRole('dialog').count(),0);
  }
  await page.evaluate(()=>{__mode='wrong-backend';__requests.length=0;});await connect.click();dialog=page.getByRole('dialog');await dialog.waitFor();assert.equal(await dialog.locator('[data-result=success]').count(),0);assert.equal(await page.evaluate(()=>__requests.filter(r=>r.url.endsWith('/solve')).length),0);await dialog.getByRole('button',{name:'知道了',exact:true}).click();
  await page.clock.install({time:new Date('2026-10-28T23:00:00+08:00')});await page.evaluate(()=>{__gm['xxt-quiet-enabled']=true;__requests.length=0;});await connect.click();assert.equal(await page.evaluate(()=>__requests.length),0);
  const overflow=await panel.locator('.xxt-body').evaluate(el=>el.scrollWidth-el.clientWidth);assert(overflow<=1);
  results.push({width,realFormSave:true,guideOpened:true,textAndImage:true,partialFailures:true,stopTextAndImage:true,wrongBackendRejected:true,nightBlocksRequests:true,noGPTMislabel:true,noAutoInference:true,overflow});await page.close();
 }
 await fs.writeFile(out+'/verification.json',JSON.stringify({scope:'隔离模拟课程/GM/模型，未验证真实账号、积分或课程成绩',results},null,2));console.log(JSON.stringify(results));
}finally{await browser.close();}
