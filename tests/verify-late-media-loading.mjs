import {chromium} from './browser-runtime.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const root=resolve(import.meta.dirname,'..'), baseline=process.env.XXT_LATE_MEDIA_BUNDLE;
const bundle=await readFile(baseline||resolve(root,'dist/xuexitong-ai-assistant.user.js'),'utf8');
const out=resolve(root,'output/playwright/issue-7');await mkdir(out,{recursive:true});
const wav=Buffer.alloc(44+8000*2*20);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
const media='data:audio/wav;base64,'+wav.toString('base64');
const cases=[{name:'late-video',delay:6500},{name:'late-audio',kind:'audio',delay:6500},{name:'platform-lock',delay:6500,locked:true},{name:'inline-result-before-player',delay:6500,inlineResult:true},{name:'stop-during-load',delay:5000,stop:true},{name:'preview-during-load',delay:5000,preview:true},{name:'completed-video',completed:true,delay:0},{name:'quiz-only',quizOnly:true,delay:0}];
const selected=process.env.XXT_LATE_MEDIA_CASE?cases.filter(c=>c.name===process.env.XXT_LATE_MEDIA_CASE):cases;
const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const rows=[];
try{for(const c of selected){
 const context=await browser.newContext({viewport:{width:1400,height:1000}}),events=[];
 await context.exposeBinding('__event',(_,name)=>events.push({name,at:Date.now()}));
 await context.addInitScript(({preview})=>{window.unsafeWindow=window;window.GM_getValue=(k,d)=>{const v=localStorage.getItem(k);return v===null?d:JSON.parse(v)};window.GM_setValue=(k,v)=>localStorage.setItem(k,JSON.stringify(v));GM_setValue('xxt-ai-enabled',!!preview);GM_setValue('xxt-ai-config',{provider:'codex',protocol:'codex',baseUrl:'http://127.0.0.1:18763',key:'b'.repeat(64)});GM_setValue('xxt-quiet-enabled',false);window.GM_xmlhttpRequest=()=>{throw Error('No real model calls allowed')};},{preview:c.preview});
 await context.route('**/*',async route=>{
  const u=new URL(route.request().url());let html='';
  const kind=c.kind||'video';
  if(u.pathname==='/mycourse/studentstudy')html=`<div id="coursetree"><div class="posCatalog_select posCatalog_active"><span class="posCatalog_name">延迟加载章节</span></div><div class="posCatalog_select"><span class="posCatalog_name">下一章</span></div></div><ul>${c.quizOnly?'':`<li id="dct1" cardid="media"><div class="prev_white">1 ${kind==='audio'?'音频':'视频'}</div></li>`}<li id="dct2" cardid="quiz"><div class="prev_white">2 章节测验</div></li></ul><iframe id="iframe" src="/mooc-ans/knowledge/cards?num=${c.quizOnly?1:0}" style="width:1000px;height:650px"></iframe><button id="next">下一节</button><script>let mediaDone=${!!c.completed};window.addEventListener('message',e=>{if(e.data==='course-media-ended')mediaDone=true});for(const el of document.querySelectorAll('li[cardid]'))el.onclick=()=>{const num=el.getAttribute('cardid')==='quiz'?1:0;__event('card:'+num);document.getElementById('iframe').src='/mooc-ans/knowledge/cards?num='+num};document.getElementById('next').onclick=()=>{__event('next');if(${!!c.locked}&&!mediaDone){__event('platform-blocked');document.getElementById('iframe').src='/mooc-ans/knowledge/cards?num=0';return;}document.querySelector('#iframe').remove();document.querySelector('.posCatalog_active').classList.remove('posCatalog_active');document.querySelectorAll('.posCatalog_select')[1].classList.add('posCatalog_active')};</script>`;
  else if(u.pathname==='/mooc-ans/knowledge/cards'){
   if(u.searchParams.get('num')==='1')html='<p>满分:100</p><p>最终成绩100分</p>';
   else{const content=`<div class="ans-attach-ct ${c.completed?'ans-job-finished':''}"><div class="ans-job-icon" aria-label="${c.completed?'任务点已完成':'任务点未完成'}"></div><iframe src="/ananas/modules/${kind}/index.html" style="width:900px;height:500px"></iframe></div>`;
    html=`${c.inlineResult?'<p>满分:100</p><p>最终成绩100分</p>':''}<div id="content">正在加载学习内容…</div><script>setTimeout(()=>{__event('media-inserted');document.querySelector('#content').innerHTML=${JSON.stringify(content)}},${c.delay});window.addEventListener('message',e=>{if(e.data==='native-ended'){document.querySelector('.ans-attach-ct').classList.add('ans-job-finished');top.postMessage('course-media-ended','*')}});</script>`;}
  }else if(u.pathname.includes('/ananas/modules/'))html=`<${kind} id="${kind}_html5_api" muted controls src="${media}" style="width:850px;height:400px"></${kind}><script>const v=document.querySelector('${kind}');v.addEventListener('play',()=>__event('play'));v.addEventListener('ended',()=>{__event('ended');parent.postMessage('native-ended','*')});</script>`;
  else return route.fulfill({body:''});
  return route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><style>li[cardid]{display:inline-block;padding:12px}iframe{border:0}</style>${html}<script>${bundle.replaceAll('</script','<\\/script')}</script>`});
 });
 const page=await context.newPage();let error;
 try{
  await page.goto('https://mooc1.chaoxing.com/mycourse/studentstudy?courseId=synthetic-issue-7');
  await page.locator('[data-action="start"]').click();
  if(c.stop){await page.waitForTimeout(1000);await page.locator('[data-action="stop"]').click();}
  if(c.preview){await page.waitForTimeout(1000);await page.locator('[data-action="solve"]').click();}
  if(c.quizOnly||c.completed){await page.waitForFunction(()=>!document.querySelector('#iframe'),null,{timeout:15000});assert(events.some(e=>e.name==='next'));assert(!events.some(e=>e.name==='play'),'Already completed media must stay completed');}
  else{
   await page.waitForTimeout(c.delay+1600);
   assert(!events.some(e=>e.name==='card:1'),'Must not leave the media card while its player is loading');
   assert(!events.some(e=>e.name==='next'),'Must not navigate before the media finishes');
   if(c.stop||c.preview)assert(!events.some(e=>e.name==='play'),'Stop or preview must prevent playback after delayed insertion');
   else{assert(events.some(e=>e.name==='play'),'Delayed player must eventually start');
    if(c.name==='late-video')await page.screenshot({path:resolve(out,'candidate-late-video-playing.png')});
    const player=page.frames().find(f=>f.url().includes('/ananas/modules/'));
    await player.evaluate(()=>{const v=document.querySelector('video,audio');v.currentTime=v.duration-0.05});
    await page.waitForFunction(()=>!document.querySelector('#iframe'),null,{timeout:15000});
    const endedIndex=events.findIndex(e=>e.name==='ended'),quizIndex=events.findIndex(e=>e.name==='card:1');
    assert(endedIndex>=0&&quizIndex>endedIndex,'Quiz must follow an observed natural media end');}
   assert(!events.some(e=>e.name==='platform-blocked'),'No premature next-chapter request may reach the platform lock');
  }
 }catch(e){error=e.message;await page.screenshot({path:resolve(out,`${baseline?'baseline':'candidate'}-${c.name}.png`)});}
 rows.push({name:c.name,events,passed:!error,error,status:await page.locator('[data-xxt-codex-panel] pre').textContent().catch(()=>null)});
 await context.close();console.log(JSON.stringify(rows.at(-1)));
}}
finally{await browser.close();await writeFile(resolve(out,`${baseline?'baseline':'candidate'}${process.env.XXT_LATE_MEDIA_CASE?'-'+process.env.XXT_LATE_MEDIA_CASE:''}-regression.json`),JSON.stringify({sha256:createHash('sha256').update(bundle).digest('hex'),scope:'Isolated pages, synthetic loading delays and platform receipts, no real course/model/grade',rows},null,2));}
assert(rows.every(r=>r.passed),'Late-media regressions failed; see output/playwright/issue-7');
