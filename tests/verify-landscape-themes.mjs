import {chromium} from './browser-runtime.mjs';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),out=new URL('../output/playwright/landscape-themes/',import.meta.url);await mkdir(out,{recursive:true});
const bundle=await readFile(new URL('dist/xuexitong-ai-assistant.user.js',root),'utf8'),version=JSON.parse(await readFile(new URL('package.json',root),'utf8')).version;
const browser=await chromium.launch({headless:true}),observations=[];
const html='<meta charset="utf-8"><style>body{margin:0;background:#e8edf0;font:14px system-ui}main{max-width:680px;margin:50px;padding:25px;background:#fff;border-radius:20px;color:#566575}h1{font-size:26px;color:#223747}</style><main><h1>学习助手 · 隔离界面预览</h1><p>此页用于检查实际脚本面板，没有真实课程、API 请求或成绩操作。</p></main><div id="coursetree"><div class="posCatalog_active"><span class="posCatalog_name">模拟章节</span></div></div>';
try{for(const id of ['ridge','tide'])for(const width of [1440,390,320]){
 const ctx=await browser.newContext({viewport:{width,height:1050},reducedMotion:'reduce'}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>r.fulfill({body:html,contentType:'text/html;charset=utf-8'}));await page.goto('https://mooc1.chaoxing.com/mycourse/studentstudy?courseId=theme&cpi=fixture');
 await page.evaluate(({id,version})=>{window.unsafeWindow=window;window.__writes=[];window.__calls=0;window.__gm={'xxt-ai-enabled':false,'xxt-quiet-enabled':false,'xxt-ui-preference':id,'xxt-update-notes-seen':version};GM_getValue=(k,d)=>__gm[k]??d;GM_setValue=(k,v)=>{__gm[k]=structuredClone(v);__writes.push(k)};GM_xmlhttpRequest=()=>{__calls++;throw Error('Unexpected request')};},{id,version});
 await page.addScriptTag({content:bundle});const panel=page.locator('[data-xxt-codex-panel]');await panel.waitFor();assert.equal(await panel.getAttribute('data-skin'),id);
 const art=await panel.locator('.xxt-scene-art img').evaluate(async i=>{await i.decode();return{width:i.naturalWidth,height:i.naturalHeight,sourceLength:i.src.length}});assert.equal(art.width,1024);assert.equal(art.height,1536);assert(art.sourceLength>100000);assert(!await panel.locator('.xxt-theme-mascot').isVisible());
 const geometry=[];
 for(const tab of ['study','course','ai','records','more']){
  await panel.locator(`[data-workspace-tab=${tab}]`).click();
  const g=await panel.evaluate(p=>{const pane=p.querySelector('[data-workspace-pane]:not([hidden])'),r=p.getBoundingClientRect();return{tab:p.dataset.workspace,bodyOverflow:document.documentElement.scrollWidth-innerWidth,paneOverflow:pane.scrollWidth-pane.clientWidth,right:r.right,bottom:r.bottom,ink:getComputedStyle(p).color,accent:getComputedStyle(p).getPropertyValue('--accent').trim()}});
  assert(g.bodyOverflow<=1&&g.paneOverflow<=1,JSON.stringify(g));assert(g.right<=width&&g.bottom<=1050);assert.notEqual(g.ink,g.accent);geometry.push(g);
 }
 assert.equal(await panel.locator('[data-skin-choice]').count(),5);assert.equal(await panel.locator(`[data-skin-choice=${id}]`).getAttribute('aria-pressed'),'true');
 await page.screenshot({path:fileURLToPath(new URL(`${id}-${width}-appearance.png`,out))});
 await panel.locator('[data-workspace-tab=study]').click();await page.screenshot({path:fileURLToPath(new URL(`${id}-${width}-chapter.png`,out))});
 await panel.locator('[data-setting=playback-rate]').selectOption('16');assert.equal(await page.locator('[data-rate-notice]').getAttribute('data-theme'),id);assert(await page.getByRole('button',{name:'恢复 1×（推荐）',exact:true}).isVisible());
 if(width===1440)await page.screenshot({path:fileURLToPath(new URL(`${id}-rate-dialog.png`,out))});await page.keyboard.press('Escape');assert.equal(await panel.locator('[data-setting=playback-rate]').inputValue(),'1');
 await panel.locator('[data-action=start]').evaluate(button=>XxtAssistantTheme.testResult(button,{success:false,results:[{role:'文字',provider:'custom',model:'synthetic-theme-only',success:false,title:'隔离界面预览',reason:'模拟错误提示，用于验证主题；没有发起模型请求。',certain:true}]}));
 const result=panel.locator('dialog[open]');assert(await result.isVisible());assert.equal(await result.evaluate(e=>getComputedStyle(e).textShadow),'none');assert.notEqual(await result.evaluate(e=>getComputedStyle(e).backgroundImage),'none');if(width===1440)await page.screenshot({path:fileURLToPath(new URL(`${id}-test-dialog.png`,out))});await result.getByRole('button',{name:'关闭测试结果',exact:true}).click();assert.equal(await panel.locator('dialog[open]').count(),0);
 await panel.locator('[data-homework-modes] [data-choice=homework]').click();assert(await panel.locator('[data-homework-beta]').isVisible());await page.screenshot({path:fileURLToPath(new URL(`${id}-${width}-homework.png`,out))});
 await panel.locator('[data-workspace-tab=more]').click();await panel.locator('[data-skin-choice=nailoong]').click();assert.equal(await panel.locator('.xxt-scene-art img').count(),0);await panel.locator(`[data-skin-choice=${id}]`).click();assert.equal(await panel.getAttribute('data-skin'),id);
 await panel.locator('[data-skin-choice=default]').focus();await page.keyboard.press('Enter');assert.equal(await panel.getAttribute('data-skin'),'default');await panel.locator(`[data-skin-choice=${id}]`).focus();await page.keyboard.press('Enter');assert.equal(await panel.getAttribute('data-skin'),id);
 assert.equal(await page.evaluate(()=>__calls),0);assert(!(await page.evaluate(()=>__writes)).some(k=>/auto|submitted/.test(k)),JSON.stringify(await page.evaluate(()=>__writes)));assert.deepEqual(errors,[]);observations.push({id,width,art,geometry,keyboard:true,dialog:true,errors,requests:0});await ctx.close();
}}finally{await browser.close();await writeFile(new URL('observations.json',out),JSON.stringify({version,sha256:createHash('sha256').update(bundle).digest('hex'),scope:'Native browser on synthetic page, mocked GM and no real model/course. Original PNG decoded; 5 workspaces, 3 widths, keyboard and native dialog.',observations},null,2));}
console.log('Landscape themes:',observations.length,'theme/viewport cases passed.');
