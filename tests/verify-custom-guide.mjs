import {chromium} from './browser-runtime.mjs';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'output/playwright/custom-guide');await mkdir(out,{recursive:true});
const bundle=await readFile(resolve(root,'dist/xuexitong-ai-assistant.user.js'),'utf8'),browser=await chromium.launch({headless:true}),observations=[];
try{for(const width of [1100,360]){
 const context=await browser.newContext({viewport:{width,height:950}});await context.addInitScript(()=>{window.unsafeWindow=window;window.__requests=0;GM_getValue=(k,d)=>JSON.parse(localStorage.getItem(k)||'null')??({'xxt-quiet-enabled':false,'xxt-ai-enabled':true}[k]??d);GM_setValue=(k,v)=>localStorage.setItem(k,JSON.stringify(v));GM_xmlhttpRequest=()=>{__requests++;throw Error('No inference or update permitted');};});
 await context.route('**/*',r=>r.fulfill({contentType:'text/html;charset=utf-8',body:'<div id="coursetree"><div class="posCatalog_select posCatalog_active"><span class="posCatalog_name">Fixture</span></div></div>'}));
 const page=await context.newPage();await page.goto('https://mooc1.chaoxing.com/mycourse/studentstudy?courseId=fixture&clazzid=class&cpi=account');await page.addScriptTag({content:bundle});
 await page.locator('[data-workspace-tab=ai]').click();const settings=page.locator('[data-ai-settings]');await settings.locator('summary').click();const provider=settings.locator('[data-ai-field=provider]'),help=settings.locator('[data-ai-custom-help]');
 assert(await help.isHidden());await provider.selectOption('custom');assert(await help.isVisible());
 const link=help.locator('a');assert.equal(await link.getAttribute('href'),'https://github.com/Flyer2333/xuexitong-ai-assistant/blob/main/docs/CUSTOM_API.md');assert.equal(await link.getAttribute('target'),'_blank');assert.match(await link.getAttribute('rel'),/noopener/);
 await settings.locator('[data-ai-field=baseUrl]').fill('http://127.0.0.1:11434/v1');await settings.locator('[data-ai-field=model]').fill('qwen-fixture:4b');await settings.locator('[data-ai-field=key]').fill('ollama');await settings.locator('[data-ai-save]').click();
 await page.waitForFunction(()=>document.querySelector('[data-ai-settings] [role=status]')?.textContent.trim(),null,{timeout:5000});
 const saveStatus=await settings.locator('[role=status]').textContent();assert.match(saveStatus,/^已保存/,`Save failed: ${saveStatus}`);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('xxt-ai-config')||'{}'));assert.equal(saved.provider,'custom');assert.equal(saved.model,'qwen-fixture:4b');assert.equal(saved.baseUrl,'http://127.0.0.1:11434/v1');assert(await help.isVisible());
 await page.reload();await page.addScriptTag({content:bundle});await page.locator('[data-workspace-tab=ai]').click();await settings.locator('summary').click();assert.equal(await provider.inputValue(),'custom');assert(await help.isVisible());assert.equal(await settings.locator('[data-ai-field=model]').inputValue(),'qwen-fixture:4b');
 assert(await settings.evaluate(el=>el.scrollWidth<=el.clientWidth+1));await page.screenshot({path:resolve(out,`custom-${width}.png`)});
 // A clicked guide opens the intended document in a separate tab; all traffic stays intercepted.
 const popupPromise=page.waitForEvent('popup');await link.click();const popup=await popupPromise;await popup.waitForLoadState();assert.equal(new URL(popup.url()).pathname,'/Flyer2333/xuexitong-ai-assistant/blob/main/docs/CUSTOM_API.md');await popup.close();
 for(const p of ['codex','openai','deepseek']){await provider.selectOption(p);assert(await help.isHidden());}await provider.selectOption('custom');assert(await help.isVisible());assert.equal(await page.evaluate(()=>__requests),0);
 observations.push({width,passed:true,checks:['custom-only guide','external target and opener isolation','Ollama configuration save/reload','guide navigation','no horizontal overflow','zero model calls']});await context.close();
}await writeFile(resolve(out,'observations.json'),JSON.stringify({scope:'Isolated pages and intercepted navigation; no live API',observations},null,2));console.log('Custom guide browser checks passed:',observations.length);
}finally{await browser.close();}
