import{chromium}from'./browser-runtime.mjs';import{readFile,mkdir,writeFile}from'node:fs/promises';import{resolve}from'node:path';import assert from'node:assert/strict';
const root=resolve(import.meta.dirname,'..'),bundle=await readFile(resolve(root,'dist/xuexitong-ai-assistant.user.js'),'utf8'),out=resolve(root,'output/playwright/tab-mute');await mkdir(out,{recursive:true});
const wav=Buffer.alloc(44+8000*2*30);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);const media='data:audio/wav;base64,'+wav.toString('base64');
const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']}),results=[];
async function fixture({cross=false,missing=false,fail=false,manual=false,delay=0,small=false}={}){
 const context=await browser.newContext({viewport:small?{width:360,height:900}:{width:1300,height:1000}}),calls=[],events=[];let tab={isMuted:manual,muteReason:manual?'user':''};
 const initial={'xxt-ai-enabled':false,'xxt-quiet-enabled':false,'xxt-video-muted':true,'xxt-muted-test':true};
 await context.exposeBinding('__getAudio',()=>({...tab}));
 const broadcast=async()=>{for(const p of context.pages())for(const f of p.frames())try{await f.evaluate(s=>{window.__fakeTabMuted=s.isMuted;window.__audioListeners?.forEach(fn=>fn({muted:s.isMuted?s.muteReason:false}));},tab);}catch{}};
 await context.exposeBinding('__setAudio',async(_,arg)=>{calls.push(arg.isMuted);await new Promise(r=>setTimeout(r,delay));if(fail)return'failure';tab={isMuted:arg.isMuted,muteReason:'extension'};await broadcast();return null;});
 await context.exposeBinding('__saveAudioSetting',async({frame},k,v)=>{for(const p of context.pages())for(const f of p.frames())if(f!==frame)try{await f.evaluate(({k,v})=>window.__prefs[k]=v,{k,v});}catch{}});
 await context.exposeBinding('__mediaEvent',(_,e)=>events.push(e));
 await context.addInitScript(({initial,missing,tab})=>{
  window.unsafeWindow=window;window.__prefs={...initial};window.__fakeTabMuted=tab.isMuted;window.__audioListeners=new Set();
  window.GM_getValue=(k,d)=>{const s=localStorage.getItem(k);return s===null?window.__prefs[k]??d:JSON.parse(s);};window.GM_setValue=(k,v)=>{window.__prefs[k]=v;localStorage.setItem(k,JSON.stringify(v));void __saveAudioSetting(k,v);};
  window.GM_xmlhttpRequest=()=>{throw Error('No model calls allowed');};
  if(!missing)window.GM_audio={getState:cb=>{__getAudio().then(cb);},setMute:(d,cb)=>{__setAudio(d).then(cb);},addStateChangeListener:(fn,cb)=>{__audioListeners.add(fn);cb?.();},removeStateChangeListener:(fn,cb)=>{__audioListeners.delete(fn);cb?.();}};
  document.addEventListener('play',e=>{if(e.target.matches('video'))__mediaEvent({muted:e.target.muted,tabMuted:window.__fakeTabMuted});},true);
 },{initial,missing,tab});
 const video=`<video id="video_html5_api" muted controls src="${media}" style="width:600px;height:180px"></video>`;
 await context.route('**/*',route=>route.fulfill({contentType:'text/html;charset=utf-8',body:route.request().url().includes('/ananas/')?`<!doctype html>${video}`:`<!doctype html><div class="prev_title" title="教学视频">教学视频</div><div id="coursetree"><div class="posCatalog_active"><span class="posCatalog_name">Synthetic</span></div></div><div class="ans-attach-ct videoContainer"><div class="ans-job-icon" aria-label="任务点未完成"></div>${cross?'<iframe class="ans-attach-online ans-insertvideo-online" src="https://video.chaoxing.com/ananas/modules/video/index.html" style="width:700px;height:250px"></iframe>':video}</div><div id="challenge-slot"></div>`}));
 const page=await context.newPage();await page.goto('https://mooc1.chaoxing.com/mycourse/studentstudy?courseId=synthetic');await page.addScriptTag({content:bundle});const target=cross?page.frames().find(f=>f!==page.mainFrame()):page;if(cross)await target.addScriptTag({content:bundle});
 await target.waitForFunction(()=>document.querySelector('video').readyState>0);
 return{context,page,target,calls,events,tab:()=>tab,async manualMute(value){tab={isMuted:value,muteReason:'user'};await broadcast();}};
}
async function silentReady(s){await s.page.waitForFunction(()=>XxtAudio.status().state==='tab');await s.target.waitForFunction(()=>!document.querySelector('video').muted);assert(s.tab().isMuted);assert(await s.page.locator('[data-setting=muted]').isChecked());}
try{
 for(const kind of ['success','missing','failure','manual','cross','user-unmute','reload','captcha','native-manual-mute','narrow']){
  const s=await fixture({cross:kind==='cross',missing:kind==='missing',fail:kind==='failure',manual:kind==='manual',delay:kind==='success'?350:0,small:kind==='narrow'});
  try{
   if(kind==='success'){assert(await s.target.locator('video').evaluate(v=>v.muted),'Pending tab request must not unlock media');assert.match(await s.page.locator('[data-audio-status]').innerText(),/正在确认|已确认/);}
   if(['missing','failure'].includes(kind)){await s.page.waitForFunction(()=>XxtAudio.status().state==='fallback');assert(await s.target.locator('video').evaluate(v=>v.muted));assert.match(await s.page.locator('[data-audio-status]').innerText(),/播放器静音/);}
   else await silentReady(s);
   if(kind==='manual'){await s.page.locator('[data-setting=muted]').uncheck();await s.page.waitForTimeout(250);assert(s.tab().isMuted);assert.deepEqual(s.calls,[]);}
   else if(kind==='user-unmute'){
    await s.manualMute(false);await s.target.waitForFunction(()=>document.querySelector('video').muted);assert.equal(s.calls.length,1);assert.match(await s.page.locator('[data-audio-status]').innerText(),/已保留播放器静音/);
    await s.page.locator('[data-setting=muted]').uncheck();await s.page.locator('[data-setting=muted]').check();await silentReady(s);assert.equal(s.calls.length,2);assert(await s.target.locator('video').evaluate(v=>v.paused));
   }else if(kind==='reload'){
    await s.page.reload();await s.page.addScriptTag({content:bundle});await silentReady(s);assert.equal(await s.page.locator('[data-setting=muted]').isChecked(),true);
   }else if(kind==='captcha'){
    await s.page.locator('[data-action=start]').click();await s.target.waitForFunction(()=>!document.querySelector('video').paused);
    await s.page.evaluate(()=>document.querySelector('#challenge-slot').innerHTML='<form><div class="yzmTips"><p>[9010] 操作异常，请输入图片中的验证码</p><input id="ucode" class="yzmInp" type="text"><img id="ccc" style="width:80px;height:35px"><input class="submit" type="submit"></div></form>');
    await s.target.waitForFunction(()=>document.querySelector('video').paused);assert(s.tab().isMuted);assert.equal(await s.page.locator('#ucode').inputValue(),'');
   }else if(kind==='native-manual-mute'){
    await s.page.locator('[data-setting=muted]').uncheck();await s.page.waitForFunction(()=>!XxtAudio.status().tabMuted);
    await s.target.evaluate(()=>{document.querySelector('video').muted=true;__audioListeners.forEach(fn=>fn({audible:false}));});
    await s.page.waitForTimeout(250);assert(await s.target.locator('video').evaluate(v=>v.muted&&v.paused));
   }else if(kind==='narrow'){
    await s.page.locator('[data-audio-status]').scrollIntoViewIfNeeded();await s.page.screenshot({path:resolve(out,'narrow.png'),fullPage:true});
    const overflow=await s.page.locator('[data-xxt-codex-panel]').evaluate(e=>e.scrollWidth-e.clientWidth);assert(overflow<=1,`Panel overflow ${overflow}`);
   }else{
    await s.page.locator('[data-action=start]').click();await s.target.waitForFunction(()=>!document.querySelector('video').paused);
    // paused changes before the queued play event crosses the exposed binding.
    // Wait for that independent observation, then retain all safety assertions.
    await new Promise((resolve,reject)=>{const until=Date.now()+5000;const check=()=>s.events.length?resolve():Date.now()>until?reject(Error('No native play event observed')):setTimeout(check,10);check();});assert(s.events.length);
    assert(s.events.every(e=>e.muted||e.tabMuted),'No unmuted play before tab verification');
    await s.page.locator('[data-action=stop]').click();await s.target.waitForFunction(()=>document.querySelector('video').paused);assert.equal(s.tab().isMuted,!['missing','failure'].includes(kind));
    if(kind==='success'){const before=await s.page.evaluate(()=>XxtAudio.status());await s.page.locator('[data-setting=muted]').uncheck();await s.page.waitForFunction(()=>XxtAudio.status().state==='off'&&XxtAudio.status().tabMuted===false);assert.equal(s.tab().isMuted,false,JSON.stringify({before,after:await s.page.evaluate(()=>XxtAudio.status()),calls:s.calls}));assert(await s.target.locator('video').evaluate(v=>v.paused));}
    if(kind==='cross'){assert.equal(s.calls.filter(Boolean).length,1,'Only parent may mute the tab');assert(await s.target.locator('video').evaluate(v=>v.paused));}
   }
   results.push({name:kind,passed:true,calls:s.calls,events:s.events});
  }finally{await s.context.close();}
 }
}finally{await browser.close();}
await writeFile(resolve(out,'observations.json'),JSON.stringify({scope:'Isolated native media with simulated GM_audio; not actual Tampermonkey permission/Edge hidden playback proof',results},null,2)+'\n');console.log(`Tab mute: ${results.length} groups passed; simulated GM_audio, actual native media, no model/course requests.`);
