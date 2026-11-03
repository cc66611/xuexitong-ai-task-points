import {chromium} from './browser-runtime.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'output/playwright/issue-7');await mkdir(out,{recursive:true});
const bundle=await readFile(process.env.XXT_LATE_MEDIA_BUNDLE||resolve(root,'dist/xuexitong-ai-assistant.user.js'),'utf8');
const wav=Buffer.alloc(44+16000*20);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
const media='data:audio/wav;base64,'+wav.toString('base64');
const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const context=await browser.newContext({viewport:{width:1400,height:1000}}),events=[];
await context.exposeBinding('__event',(_,name)=>events.push({name,at:Date.now()}));
await context.addInitScript(()=>{window.unsafeWindow=window;window.GM_getValue=(k,d)=>{const v=localStorage.getItem(k);return v===null?d:JSON.parse(v)};window.GM_setValue=(k,v)=>localStorage.setItem(k,JSON.stringify(v));GM_setValue('xxt-ai-enabled',false);GM_setValue('xxt-quiet-enabled',false);window.GM_xmlhttpRequest=()=>{throw Error('No model calls allowed')};});
const player=(first=false)=>`<div class="ans-attach-ct"><div class="ans-job-icon" aria-label="任务点未完成"></div><video muted controls src="${media}" style="width:850px;height:450px"></video></div><script>const v=document.querySelector('video');v.onplay=()=>__event('${first?'first-':''}play');v.onended=()=>{__event('${first?'first-':''}ended');document.querySelector('.ans-attach-ct').classList.add('ans-job-finished')};</script>`;
await context.route('**/*',async route=>{
 const u=new URL(route.request().url());let html='';
 if(u.pathname==='/mycourse/studentstudy')html=`<div id="coursetree"><div class="posCatalog_select posCatalog_active"><span class="posCatalog_name">第一章</span></div></div><ul id="tabs"></ul><iframe id="iframe" src="/mooc-ans/knowledge/cards?first=1" style="width:1000px;height:650px"></iframe><button id="next">下一节</button><script>document.querySelector('#next').onclick=()=>{if(document.querySelector('.posCatalog_name').textContent==='第一章'){__event('new-chapter');document.querySelector('.posCatalog_name').textContent='第二章';document.querySelector('#tabs').innerHTML='<li id="dct1" cardid="media"><div class="prev_white">1 视频</div></li><li id="dct2" cardid="quiz"><div class="prev_white">2 章节测验</div></li>';for(const el of document.querySelectorAll('li'))el.onclick=()=>{const num=el.getAttribute('cardid')==='quiz'?1:0;__event('card:'+num);document.querySelector('#iframe').src='/mooc-ans/knowledge/cards?num='+num};document.querySelector('#iframe').src='/mooc-ans/knowledge/cards?num=0';}else{__event('next');document.querySelector('#iframe').remove()}};</script>`;
 else if(u.pathname==='/mooc-ans/knowledge/cards'){
  if(u.searchParams.has('first'))html=player(true);
  else if(u.searchParams.get('num')==='1')html='<p>满分:100</p><p>最终成绩100分</p>';
  else html=`<div id="late">正在加载…</div><script>setTimeout(()=>{__event('media-inserted');document.querySelector('#late').innerHTML=${JSON.stringify(player().split('<script>')[0])};const v=document.querySelector('video');v.onplay=()=>__event('play');v.onended=()=>{__event('ended');document.querySelector('.ans-attach-ct').classList.add('ans-job-finished')};},6500);</script>`;
 }else return route.fulfill({body:''});
 return route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><style>li{display:inline-block;padding:12px}</style>${html}<script>${bundle.replaceAll('</script','<\\/script')}</script>`});
});
const page=await context.newPage();let error;
try{
 await page.goto('https://mooc1.chaoxing.com/mycourse/studentstudy?courseId=synthetic-issue7-worker');await page.locator('[data-action="start"]').click();
 const frame=page.frames().find(f=>f.url().includes('first=1'));
 await frame.waitForFunction(()=>!document.querySelector('video').paused);await page.waitForTimeout(1000);
 await frame.evaluate(()=>{const v=document.querySelector('video');v.currentTime=v.duration-0.05});
 await page.waitForFunction(()=>document.querySelector('.posCatalog_name').textContent==='第二章',null,{timeout:16000});
 await page.waitForTimeout(8500);
 assert(!events.some(e=>e.name==='card:1'),'An ended worker from the previous chapter must not complete the new empty video card');
 assert(events.some(e=>e.name==='play'),'The new chapter player must start after loading');
 const nextFrame=page.frames().find(f=>f.url().includes('num=0'));
 await nextFrame.evaluate(()=>{const v=document.querySelector('video');v.currentTime=v.duration-0.05});
 await page.waitForFunction(()=>!document.querySelector('#iframe'),null,{timeout:16000});
 const endedIndex=events.findIndex(e=>e.name==='ended'),quizIndex=events.findIndex(e=>e.name==='card:1');
 assert(endedIndex>=0&&quizIndex>endedIndex,'New chapter quiz must follow an observed natural media end');
}catch(e){error=e.message;await page.screenshot({path:resolve(out,'chapter-worker-failure.png')});}
finally{await writeFile(resolve(out,process.env.XXT_LATE_MEDIA_BUNDLE?'chapter-worker-baseline.json':'chapter-worker.json'),JSON.stringify({sha256:createHash('sha256').update(bundle).digest('hex'),passed:!error,error,events,scope:'Isolated same-window iframe reload across chapters; no real course or model'},null,2));await browser.close();}
console.log(JSON.stringify({passed:!error,error,events}));assert(!error,error);
