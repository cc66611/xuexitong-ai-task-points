import {chromium} from './browser-runtime.mjs';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),manifest=JSON.parse(await readFile(new URL('dist/editions.json',root),'utf8'));
const html='<style>body{font:16px sans-serif}.answerBg{height:30px}</style><div class="fanyaMarking TiMu"><form id="submitForm"><div class="questionLi singleQuesId" id="question100"><h3 class="mark_name">1.<span class="colorShallow">(判断题)</span>Is 1 + 1 equal to 2?</h3><div class="stem_answer qtDetail"><div class="answerBg" role="radio" aria-checked="false"><span class="num_option">A</span><div class="answer_p">对</div></div><div class="answerBg" role="radio" aria-checked="false"><span class="num_option">B</span><div class="answer_p">错</div></div></div></div></form></div>';
const browser=await chromium.launch({headless:true});
try{for(const edition of manifest.editions){const page=await browser.newPage();try{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.fulfill({contentType:'text/html;charset=utf-8',body:html}));await page.goto('https://mooc1.chaoxing.com/mooc-ans/mooc2/work/dowork?workId=synthetic');
 await page.evaluate(()=>{window.unsafeWindow=window;window.__gm={'xxt-quiet-enabled':false};window.GM_getValue=(k,d)=>Object.hasOwn(__gm,k)?__gm[k]:d;window.GM_setValue=(k,v)=>__gm[k]=v;window.__requests=0;window.GM_xmlhttpRequest=()=>{__requests++;throw Error('Unexpected network call');};});
 await page.addScriptTag({content:await readFile(new URL('dist/'+edition.file,root),'utf8')});await page.locator('[data-xxt-codex-panel]').waitFor();
 const state=await page.evaluate(()=>({edition:XxtRelease.edition,strict:XxtRelease.taskPointsOnly,version:XxtRelease.localVersion,provider:XxtAi.load().provider,protocol:XxtAi.load().protocol,key:XxtAi.load().key,providerCount:Object.keys(XxtAi.presets).length,requests:__requests,panels:document.querySelectorAll('[data-xxt-codex-panel]').length}));
 assert.equal(state.edition,edition.id);assert.equal(state.strict,true);assert.equal(state.version,manifest.version);assert.equal(state.provider,edition.providerPreset);assert.equal(state.key,'');assert.equal(state.providerCount,13);assert.equal(state.requests,0);assert.equal(state.panels,1);assert.deepEqual(errors,[]);console.log('Passed edition: '+edition.id+' / '+state.protocol);
 }finally{await page.close();}}console.log('All four complete AI editions mounted correctly; no real models, credentials or coursework were used.');}finally{await browser.close();}
