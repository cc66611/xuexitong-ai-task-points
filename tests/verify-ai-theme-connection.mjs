import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from './browser-runtime.mjs';
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'output/playwright/ai-theme-connection');
await mkdir(out,{recursive:true});
const bundle=await readFile(resolve(root,'dist/xuexitong-ai-assistant.user.js'),'utf8');
const preview=(await readFile(resolve(root,'tests/ui-preview.html'),'utf8')).replace('<script src="/dist/xuexitong-ai-assistant.user.js"></script>','');
const work=await readFile(resolve(root,'tests/fixtures/homework/boolean.html'),'utf8');
const browser=await chromium.launch({headless:true}),results=[];
async function open({homework=false,brand='deepseek',initial='ridge',mode='ok',image=false}={}){
 const p=await browser.newPage({viewport:{width:1280,height:1000}});
 const html=homework?preview.replace(/<div id="coursetree">[\s\S]*?<\/div><\/div>/,'<div class="fanyaMarking TiMu"><form id="submitForm">'+work+'</form></div>'):preview;
 await p.route('**/*',r=>r.request().resourceType()==='document'?r.fulfill({contentType:'text/html;charset=utf-8',body:html}):r.abort());
 await p.goto('https://mooc1.chaoxing.com/'+(homework?'mooc-ans/mooc2/work/dowork':'mycourse/studentstudy')+'?data=one&brand='+brand);
 await p.evaluate(({initial,mode,image})=>{
  __gm['xxt-ui-preference']=initial;
  __gm['xxt-ai-vision-enabled']=image;
  __gm['xxt-ai-vision-config']={...__gm['xxt-ai-config'],provider:'openai',protocol:'responses',baseUrl:'https://api.openai.com/v1',model:'gpt-6.1-sol',vision:true};
  window.__themeEvents=0;document.addEventListener('xxt-ai-test-passed',()=>__themeEvents++);
  const original=GM_xmlhttpRequest;
  GM_xmlhttpRequest=spec=>{
   if(spec.url.includes('/dist/'))return original(spec);
   const vision=spec.data?.includes('六位数字');
   if(vision&&mode==='image-hang'){window.__pendingImage=spec;return{abort(){spec.onabort?.();}};}
   if(mode==='text-fail'&&!vision||mode==='image-fail'&&vision){queueMicrotask(()=>spec.onload({status:401,responseText:'{}'}));return{abort(){}};}
   if(mode==='stale'&&!vision)__gm['xxt-ai-config']={...__gm['xxt-ai-config'],model:'claude-sonnet-5-5'};
   return original(spec);
  };
 },{initial,mode,image});
 await p.addScriptTag({content:bundle});
 await p.locator('[data-action=connect]').waitFor();
 await p.emulateMedia({reducedMotion:'reduce'});
 return p;
}
try{
 for(const homework of [false,true])for(const brand of ['openai','deepseek','claude','gemini','zhipu','kimi','qwen','doubao','xiaomi']){
  const p=await open({homework,brand});
  assert.equal(await p.locator('[data-xxt-codex-panel]').getAttribute('data-skin'),'ridge');
  await p.locator('[data-action=connect]').click();await p.getByRole('dialog').waitFor();
  assert.equal(await p.locator('[data-xxt-codex-panel]').getAttribute('data-skin'),'ai-'+brand);
  assert.equal(await p.evaluate(()=>__themeEvents),1);
  await p.keyboard.press('Escape');
  await p.locator('[data-workspace-tab=more]').click();
  await p.locator('[data-skin-choice=tide]').click();
  await p.evaluate(()=>document.dispatchEvent(new Event('xxt-connection-changed')));
  assert.equal(await p.locator('[data-xxt-codex-panel]').getAttribute('data-skin'),'tide','Manual choice after connection remains available');
  results.push({homework,brand,passed:true});await p.close();
 }
 for(const [mode,image,expected] of [['image-fail',true,'ai-deepseek'],['text-fail',true,'ridge'],['stale',false,'ridge'],['image-hang',true,'ai-deepseek']]){
  const p=await open({homework:true,mode,image});
  await p.locator('[data-action=connect]').click();
  if(mode==='image-hang')await p.waitForFunction(()=>window.__pendingImage);else await p.getByRole('dialog').waitFor();
  assert.equal(await p.locator('[data-xxt-codex-panel]').getAttribute('data-skin'),expected);
  assert.equal(await p.evaluate(()=>__themeEvents),expected.startsWith('ai-')?1:0);
  if(mode==='image-hang')await p.locator('[data-action=stop]').click();
  results.push({mode,image,expected,passed:true});await p.close();
 }
 const p=await open({homework:true,image:true});
 await p.evaluate(()=>{__gm['xxt-ai-config']={...__gm['xxt-ai-config'],key:''};document.dispatchEvent(new Event('xxt-profiles-changed'));});
 await p.locator('[data-action=connect]').click();await p.getByRole('dialog').waitFor();
 assert.equal(await p.locator('[data-xxt-codex-panel]').getAttribute('data-skin'),'ridge');assert.equal(await p.evaluate(()=>__themeEvents),0);
 results.push({mode:'image-only',passed:true});await p.close();
}finally{await browser.close();}
await writeFile(resolve(out,'verification.json'),JSON.stringify({scope:'Full userscript, synthetic GM responses; no real model, course writes or grades.',results},null,2)+'\n');
console.log(`AI theme connection: ${results.length} cases passed.`);
