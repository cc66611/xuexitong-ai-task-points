import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {chromium} from './browser-runtime.mjs';
const require=createRequire(import.meta.url),names=require('../src/personas.cjs').names;
const bundle=await readFile(new URL('../dist/xuexitong-ai-assistant.user.js',import.meta.url),'utf8');
const out=new URL('../artifacts/portrait-clearance/',import.meta.url);await mkdir(out,{recursive:true});
const fixture='<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#edf2f5}</style><div id="coursetree"><div class="posCatalog_active"><span class="posCatalog_name">模拟章节</span></div></div>';
const browser=await chromium.launch({headless:true}),observations=[],reference=new Map();
try{
 for(const id of ['default','nailoong','naiwa','ridge','tide',...Object.keys(names)]){
  const page=await browser.newPage({viewport:{width:1100,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.fulfill({body:fixture,contentType:'text/html; charset=utf-8'}));await page.goto('https://mooc2-ans.chaoxing.com/mycourse/studentstudy?courseId=portrait&clazzid=c&cpi=a');
  await page.evaluate(id=>{const ai=!['default','nailoong','naiwa','ridge','tide'].includes(id);window.unsafeWindow=window;window.__calls=0;window.__gm={'xxt-quiet-enabled':false,'xxt-ai-enabled':ai,'xxt-ui-preference':ai?'auto':id,'xxt-update-notes-seen':'1.7.3'};if(ai)__gm['xxt-ai-config']={provider:id,protocol:'chat',baseUrl:'https://preview.invalid/v1',model:id==='openai'?'gpt-preview':id==='zhipu'?'glm-preview':id==='xiaomi'?'mimo-preview':id+'-preview',key:'preview-placeholder',vision:false};GM_getValue=(k,d)=>__gm[k]??d;GM_setValue=(k,v)=>__gm[k]=structuredClone(v);GM_xmlhttpRequest=()=>{__calls++;throw Error('Unexpected model request');};},id);
  await page.addScriptTag({content:bundle});if(id in names)await page.evaluate(()=>{XxtPersonaHealth.success(XxtAi.load());document.dispatchEvent(new Event('xxt-ai-test-passed'));});await page.emulateMedia({reducedMotion:'reduce'});
  for(const [width,height]of [[1100,1100],[390,1000],[360,900],[320,844],[390,540]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(70);
   const check=async stage=>{
    const g=await page.evaluate(()=>{
     const p=document.querySelector('[data-xxt-codex-panel]'),box=s=>p.querySelector(s).getBoundingClientRect(),fixed=box('.xxt-fixed-controls'),grid=box('.xxt-workspace-grid'),nav=box('.xxt-workspace-nav'),pane=p.querySelector('[data-workspace-pane]:not([hidden])'),r=p.getBoundingClientRect();
     return{skin:p.dataset.skin,fixedBottom:fixed.bottom,sceneTop:box('.xxt-scene-art').top,modeTop:box('.xxt-mode-dock').top,actionsTop:box('.xxt-actions').top,navTop:nav.top,navBottom:nav.bottom,paneTop:pane.getBoundingClientRect().top,clearance:parseFloat(getComputedStyle(p.querySelector('.xxt-workspace-grid')).paddingTop),gridTop:grid.top,gridGap:grid.top-fixed.bottom,modeOffset:box('[data-homework-modes]').top-fixed.top,actionsOffset:box('.xxt-actions').top-fixed.top,statusOffset:box('.xxt-status-card').top-fixed.top,paneHeight:pane.clientHeight,panelRight:r.right,panelBottom:r.bottom,width:innerWidth,height:innerHeight};
    });
    assert(g.panelRight<=width+1&&g.panelBottom<=height+1,JSON.stringify(g));assert(g.paneHeight>0,JSON.stringify(g));
    assert.equal(g.clearance,0,'A portrait must never add vertical spacer above navigation or content: '+JSON.stringify(g));
    assert(Math.abs(g.navTop-g.gridTop)<1,'Navigation must start at the workspace top');assert(g.gridGap>=0&&g.gridGap<=12,'Unexpected gap after status card');
    assert(width>600?Math.abs(g.paneTop-g.gridTop)<1:g.paneTop-g.navBottom>=0&&g.paneTop-g.navBottom<=12,'Content must align with desktop navigation or directly follow mobile tabs');
    if(id in names){assert(Math.abs(g.sceneTop-g.modeTop)<=2,'Expanded art must start at the translucent mode rail');assert(g.sceneTop<g.actionsTop&&g.sceneTop<g.fixedBottom,'Art must extend behind the light-glass controls without moving them');}
    const key=[width,height,stage].join(':');if(id==='default')reference.set(key,g);else for(const field of ['modeOffset','actionsOffset','statusOffset','gridGap'])assert(Math.abs(g[field]-reference.get(key)[field])<=1,'Theme must match default control alignment: '+field+' '+JSON.stringify(g));
    assert(await page.locator('[data-action=stop]').isVisible());observations.push({id,width,height,stage,...g});
   };
   await page.locator('.xxt-status-card pre').evaluate(n=>n.textContent='模拟状态：等待开始');await page.waitForTimeout(70);await check('chapter');await page.locator('[data-homework-modes] [data-choice=homework]').click();await page.locator('.xxt-status-card pre').evaluate(n=>n.textContent='模拟状态换行：\n等待用户核对\n不会开始或提交');await page.waitForTimeout(70);await check('homework-long-status');await page.locator('[data-homework-modes] [data-choice=chapter]').click();
   if(id==='deepseek'&&width===320)await page.screenshot({path:fileURLToPath(new URL('deepseek-320.png',out))});
  }
  assert.equal(await page.evaluate(()=>__calls),0);assert.deepEqual(errors,[]);await page.close();
 }
 await writeFile(new URL('verification.json',out),JSON.stringify({scope:'Synthetic page and connection state; no real course, model or grade. All themes align with default controls; no portrait spacer.',runtimeSHA256:createHash('sha256').update(bundle).digest('hex'),themes:14,viewports:5,observations},null,2));console.log('Compact portrait placement: 14 themes x 5 viewports x chapter/homework status = '+observations.length+' checks passed.');
}finally{await browser.close();}
