import {chromium} from './browser-runtime.mjs';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),out=new URL('../output/playwright/media-policy/',import.meta.url);await mkdir(out,{recursive:true});
const bundle=await readFile(new URL('dist/xuexitong-ai-assistant.user.js',root),'utf8');
const wav=Buffer.alloc(44+8000*2*100);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
const media='data:audio/wav;base64,'+wav.toString('base64');
const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']}),observations=[];
async function scenario({name,mode=90,cross=false,nested=false,green=true,audio=false,hold='',settings=false,speed=1}){
 const ctx=await browser.newContext({viewport:{width:1400,height:1050}}),events=[],errors=[];
 await ctx.exposeBinding('__event',(_,event)=>events.push(event));
 await ctx.addInitScript(({mode})=>{window.unsafeWindow=window;GM_getValue=(k,d)=>{const v=localStorage.getItem(k);return v===null?d:JSON.parse(v)};GM_setValue=(k,v)=>localStorage.setItem(k,JSON.stringify(v));GM_setValue('xxt-ai-enabled',false);GM_setValue('xxt-quiet-enabled',false);if(mode!==null)GM_setValue('xxt-video-advance',mode);GM_xmlhttpRequest=()=>{throw Error('No real model or update calls allowed')};},{mode});
 const frame=(id)=>`<div class="ans-attach-ct ${audio?'audio':'video'}Container" data-media="${id}"><div class="ans-job-icon" aria-label="任务点未完成"></div><iframe class="ans-insertvideo-online" src="${cross?'https://mooc1-1.chaoxing.com':''}/ananas/modules/${audio?'audio':'video'}/index.html?id=${id}" style="width:800px;height:260px"></iframe></div>`;
 await ctx.route('**/*',route=>{
  const u=new URL(route.request().url());let html='';
  if(u.pathname==='/mycourse/studentstudy')html=`<div class="prev_title">视频</div><div id="coursetree"><div class="posCatalog_select posCatalog_active"><span class="posCatalog_name">Synthetic first</span></div><div class="posCatalog_select"><span class="posCatalog_name">Synthetic next</span></div></div><iframe id="iframe" src="/mooc-ans/knowledge/cards" style="width:1000px;height:650px"></iframe><button id="next">下一节</button><script>document.querySelector('#next').onclick=()=>{__event('next');document.querySelector('#iframe').remove();document.querySelector('.posCatalog_active').classList.remove('posCatalog_active');document.querySelectorAll('.posCatalog_select')[1].classList.add('posCatalog_active')}</script>`;
  else if(u.pathname==='/mooc-ans/knowledge/cards')html=frame(1)+frame(2);
  else if(u.pathname.includes('/modules/')){
   if(nested&&!u.searchParams.has('leaf'))html=`<iframe src="${u.pathname+u.search}&leaf=1" style="width:750px;height:220px"></iframe>`;
   else html=`<div class="video-js ${audio?'vjs-audio':''}" style="width:700px;height:200px"><${audio?'audio':'video'} id="${audio?'audio':'video'}_html5_api" src="${media}" muted controls style="width:680px;height:180px"></${audio?'audio':'video'}></div><script>const v=document.querySelector('video,audio');v.onplay=()=>__event('play:${u.searchParams.get('id')}');v.onpause=()=>__event('pause:${u.searchParams.get('id')}');v.onended=()=>__event('ended:${u.searchParams.get('id')}');</script>`;
  }else return route.fulfill({body:''});
  return route.fulfill({contentType:'text/html;charset=utf-8',body:`<!doctype html><meta charset="utf-8">${html}<script>${bundle.replaceAll('</script','<\\/script')}</script>`});
 });
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('https://mooc1.chaoxing.com/mycourse/studentstudy?courseId=media-policy&cpi=synthetic');
  const player=()=>page.frames().find(f=>f.url().includes('/modules/')&&f.url().includes('id=1')&&(!nested||f.url().includes('leaf=1')));
  await page.waitForFunction(()=>!!document.querySelector('[data-setting="video-advance"]'));
  const choice=page.locator('[data-setting="video-advance"]');assert.equal(await choice.inputValue(),String(mode??100));
  assert.equal(await page.evaluate(()=>!!(document.querySelector('[data-setting="playback-rate"]').closest('label').compareDocumentPosition(document.querySelector('[data-setting="video-advance"]').closest('label'))&Node.DOCUMENT_POSITION_FOLLOWING)),true);
  if(settings){
   for(const speed of ['1.1','1.2']){await page.locator('[data-setting="playback-rate"]').selectOption(speed);assert(await page.locator('[data-rate-notice]').isVisible());await page.getByRole('button',{name:'仍使用所选倍速',exact:true}).click();assert.equal(await page.locator('[data-setting="playback-rate"]').inputValue(),speed);}
   await choice.selectOption('90');assert.equal(await page.evaluate(()=>GM_getValue('xxt-video-advance')),90);
   await page.locator('[data-choice-group="学习板块"][data-choice="homework"]').click();
   const beta=page.locator('[data-homework-beta]');assert(await beta.isVisible());assert.match(await beta.textContent(),/开发完善.*意见.*Issue/s);assert((await beta.locator('a').getAttribute('href')).endsWith('/issues/new/choose'));
   await page.screenshot({path:new URL('homework-beta.png',out).pathname.replace(/^\/(\w:)/,'$1')});
   await page.locator('[data-choice-group="学习板块"][data-choice="chapter"]').click();
   await page.reload();assert.equal(await page.locator('[data-setting="video-advance"]').inputValue(),'90');assert.equal(await page.locator('[data-setting="playback-rate"]').inputValue(),'1.2');
   assert.equal(await page.locator('[data-choice="exam"]').count(),0);
   await page.screenshot({path:new URL('chapter-policy.png',out).pathname.replace(/^\/(\w:)/,'$1')});
   observations.push({name,settingsPersist:true,speeds:[1.1,1.2],homeworkBeta:true,errors});await ctx.close();return;
  }
  if(speed!==1){await page.locator('[data-setting="playback-rate"]').selectOption(String(speed));await page.getByRole('button',{name:'仍使用所选倍速',exact:true}).click();assert.equal(await page.evaluate(()=>GM_getValue('xxt-playback-rate')),speed);}
  await page.locator('[data-action="start"]').click();
  let first;for(let i=0;i<50&&!first;i++){first=player();if(!first)await page.waitForTimeout(100)}assert(first,'First player must exist');
  await first.waitForFunction(()=>document.querySelector('video,audio')?.duration>0&&!document.querySelector('video,audio').paused);
  if(speed!==1){await first.waitForFunction(rate=>document.querySelector('video,audio').playbackRate===rate,speed);await page.locator('[data-action="stop"]').click();await first.waitForFunction(()=>document.querySelector('video,audio').paused);await page.waitForTimeout(700);assert(!events.includes('play:2'));assert.equal(errors.length,0);observations.push({name,speed,nativePlaybackRate:speed,stopped:true,cross,events});return;}
  if(hold==='stop')await page.locator('[data-action="stop"]').click();
  if(hold==='quiet'){for(const f of page.frames())await f.evaluate(()=>{GM_setValue('xxt-quiet-enabled',true);XxtCodexCore.quietHoursAt=()=>true});await first.waitForFunction(()=>document.querySelector('video,audio').paused);}
  if(hold==='change'){await choice.selectOption('100');await first.waitForFunction(()=>document.querySelector('video,audio').paused);}
  if(green)await page.frameLocator('#iframe').locator('[data-media="1"]').evaluate(e=>e.classList.add('ans-job-finished'));
  await first.evaluate(()=>document.querySelector('video,audio').currentTime=90);
  await page.waitForTimeout(450);assert(!events.includes('play:2'),'At 90 percent the margin must still block switching');
  await first.evaluate(()=>document.querySelector('video,audio').currentTime=91);
  if(hold||mode!==90||audio||!green){
   await page.waitForTimeout(1700);assert(!events.includes('play:2'),'Policy/guard/pending marker must block early next');
   if(!green&&!hold&&mode===90&&!audio)await page.frameLocator('#iframe').locator('[data-media="1"]').evaluate(e=>e.classList.add('ans-job-finished'));
  }
  if(!hold&&mode===90&&!audio){
   for(let i=0;i<50&&!events.includes('play:2');i++)await page.waitForTimeout(100);
   assert(events.includes('play:2'),'Confirmed 91 percent video must hand off to the second media');assert(!events.includes('ended:1'),'No synthetic/native ended should be needed');
   await first.waitForFunction(()=>document.querySelector('video,audio').paused,null,{timeout:2500});
  }
  assert(!events.includes('next'),'The unfinished second task must prevent chapter navigation');assert.equal(errors.length,0);
  observations.push({name,mode,green,audio,cross,nested,hold,events,errors});
 }catch(error){console.error(name,events,await page.locator('[data-xxt-codex-panel] pre').textContent().catch(()=>''));throw error}
 finally{await ctx.close()}
}
try{
 for(const item of [
  {name:'ui-rates-policy-homework-notice',settings:true,mode:null},
  {name:'native-rate-4',speed:4},
  {name:'native-rate-8-cross-origin',speed:8,cross:true},
  {name:'native-rate-16',speed:16},
  {name:'default-full-playback',mode:null},
  {name:'same-origin-91-confirmed'},
  {name:'same-origin-91-pending-then-confirmed',green:false},
  {name:'cross-origin-91-confirmed',cross:true},
  {name:'nested-91-confirmed',nested:true},
  {name:'audio-still-full',audio:true},
  {name:'manual-stop-blocks-threshold',hold:'stop'},
  {name:'night-rest-blocks-threshold',hold:'quiet'},
  {name:'changing-policy-stops-run',hold:'change'}
 ])if(!process.env.XXT_MEDIA_CASE||item.name.includes(process.env.XXT_MEDIA_CASE))await scenario(item);
}finally{await browser.close();await writeFile(new URL('observations.json',out),JSON.stringify({sha256:createHash('sha256').update(bundle).digest('hex'),scope:'Synthetic pages, platform flags and GM; native media time is set only by this fixture to probe boundaries. No real courses, model calls or platform completion claims.',observations},null,2));}
console.log('Media policy:',observations.length,'browser scenarios passed.');

