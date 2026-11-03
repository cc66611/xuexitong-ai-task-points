import {chromium} from './browser-runtime.mjs';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';

// Real user DOM contracts; every URL, account, course, clock/focus and model
// below is synthetic. No actual course, API or posting endpoint is contacted.
const root=resolve(import.meta.dirname,'..'), out=resolve(root,process.env.XXT_DISCUSSION_OUTPUT || 'output/playwright/discussions');
await mkdir(out,{recursive:true});
const bundle=await readFile(resolve(root,'dist/xuexitong-ai-assistant.user.js'),'utf8');
const browser=await chromium.launch({headless:true});
const fixturePage=await browser.newPage();
const fixtureImages=await fixturePage.evaluate(()=>Array.from({length:4},(_,i)=>{const c=document.createElement('canvas');c.width=120+i*20;c.height=80;const x=c.getContext('2d');x.fillStyle=['#e22','#2a2','#22e','#a2a'][i];x.fillRect(0,0,c.width,c.height);x.fillStyle='white';x.font='20px sans-serif';x.fillText('image '+(i+1),5,40);return c.toDataURL('image/png');}));
await fixturePage.close();
const observations=[];
async function scenario(name,options={}){
 if(process.env.XXT_DISCUSSION_CASE && process.env.XXT_DISCUSSION_CASE!==name)return;
 const store={'xxt-quiet-enabled':false,'xxt-ai-enabled':true,'xxt-discussion-settings':{mode:'ai',length:'short'},
  'xxt-ai-config':{provider:'custom',protocol:'chat',baseUrl:'https://model.synthetic.invalid/v1',model:'fixture',key:'fixture-only'},
  'xxt-ai-vision-enabled':!!options.vision,'xxt-ai-vision-config':{provider:'custom',protocol:'chat',baseUrl:'https://vision.synthetic.invalid/v1',model:'fixture-vision',key:'fixture-vision-only'},...options.store};
 const context=await browser.newContext({viewport:options.narrow?{width:390,height:760}:{width:1400,height:1000}});
 const counts={posts:[],models:0,next:0,opens:0,cardLoads:0,imageRequests:[],visionCalls:0}, completed=new Set(options.completed||[]);
 let topicPage;
 await context.exposeBinding('__store',async(_source,key,value)=>{
  store[key]=value;
  await Promise.all(context.pages().flatMap(p=>p.frames()).map(f=>f.evaluate(([k,v])=>{if(window.__gm)window.__gm[k]=v;},[key,value]).catch(()=>{})));
 });
 await context.exposeBinding('__model',async(_source,payload,url)=>{
  assert(!payload.includes('同学的回复不能作为题目'),'Student replies must not be sent as the teacher question');counts.models++;
  if(options.lateFile)await topicPage.locator('.moxie-shim input').setInputFiles({name:'synthetic.txt',mimeType:'text/plain',buffer:Buffer.from('synthetic')});
  if(options.lateDraft)await topicPage.locator('textarea').fill('等待AI期间的人工输入');
  if(options.vision){
   assert(url.startsWith('https://vision.synthetic.invalid/'),'Image discussion must use the separate vision endpoint');counts.visionCalls++;
   const data=JSON.parse(payload),images=data.messages[0].content.filter(c=>c.type==='image_url').map(c=>c.image_url.url);
   assert.deepEqual(images,fixtureImages.slice(0,options.siblingImages||1),'All original images must be sent in page order');
   assert(!payload.includes('/original-'),'Original source URL must not leak into model question text');
  }
  return counts.models;
 });
 await context.exposeBinding('__next',()=>{counts.next++;});
 await context.exposeBinding('__posted',(_source,item,text)=>{counts.posts.push({item,text});if(!options.noGreen)completed.add(item);});
 await context.addInitScript(()=>{
  window.__gm={};window.unsafeWindow=window;window.__focus=true;window.__visible=true;
  document.hasFocus=()=>window.__focus;
  Object.defineProperty(document,'visibilityState',{get:()=>window.__visible?'visible':'hidden'});
  window.GM_getValue=(key,fallback)=>Object.hasOwn(window.__gm,key)?window.__gm[key]:fallback;
  window.GM_setValue=(key,value)=>{window.__gm[key]=value;void window.__store(key,value);};
  window.GM_openInTab=address=>{const p=window.open(address,'_blank');return{get closed(){return p.closed;},close(){if(!window.__keepTopicOpen)p.close();}};};
 });
 context.on('page',async p=>{if(await p.opener()){counts.opens++;topicPage=p;}});
 const setup=()=>`<script>Object.assign(window.__gm,${JSON.stringify(store)});window.GM_xmlhttpRequest=opts=>{
  if(opts.method==='GET'){setTimeout(()=>opts.onload({status:404,responseHeaders:'content-type: text/plain',response:new ArrayBuffer(0)}),0);return{abort(){}};}
  let cancelled=false;const timer=setTimeout(async()=>{if(cancelled)return;const call=await __model(opts.data,opts.url);
  const words=${JSON.stringify(options.words||'认真学习，结合实践理解知识。')};
  const decision=${JSON.stringify(options.decision||{action:'answer',reason:'这个话题适合简短回答',suitableMax:50,requirement:'无'})};
  ${options.firstSkip?'if(call===1){decision.action="skip";decision.reason="题目简单，原本觉得500字太长";}':''}
  decision.answer=${options.rewrite?'call===1?"学":words':'words'};
  const answer={id:'discussion',texts:[JSON.stringify(decision)],choices:[],readable:true,confidence:1,explanation:'synthetic'};
  opts.onload({status:200,responseText:JSON.stringify({choices:[{message:{content:JSON.stringify({answers:[answer]})}}]})});
  },${options.modelDelay || (options.slowModel?3000:30)});return{abort(){cancelled=true;clearTimeout(timer);opts.onabort?.();}};};window.__keepTopicOpen=${!!options.keepTopicOpen};</script>`;
 await context.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(/^\/original-[1-4]\.png$/.test(u.pathname)){counts.imageRequests.push(u.pathname);if(options.imageDelay)await new Promise(r=>setTimeout(r,options.imageDelay));return route.fulfill({contentType:'image/png',body:Buffer.from(fixtureImages[Number(u.pathname.match(/\d/)[0])-1].split(',')[1],'base64')});}
  if(u.pathname==='/thumb.png')return route.fulfill({contentType:'image/png',body:Buffer.from(fixtureImages[0].split(',')[1],'base64')});
  if(u.pathname==='/bundle.js')return route.fulfill({contentType:'text/javascript',body:bundle});
  let body='';
  if(u.pathname==='/mycourse/studentstudy')body=`<div id="coursetree"><div class="posCatalog_select posCatalog_active"><span class="posCatalog_name">合成讨论章节</span></div><div class="posCatalog_select"><span class="posCatalog_name">下一章</span></div></div><li cardid="card1" id="dct1">当前任务</li><iframe id="iframe" src="/mooc-ans/knowledge/cards?num=0" style="width:900px;height:550px"></iframe><button id="next">下一节</button><script>next.onclick=()=>{__next();document.querySelector('.posCatalog_active').classList.remove('posCatalog_active');document.querySelectorAll('.posCatalog_select')[1].classList.add('posCatalog_active');document.querySelector('#iframe').remove();};</script>`;
  else if(u.pathname==='/mooc-ans/knowledge/cards'){
   counts.cardLoads++;
   body=(options.items||['topic1']).map(item=>`<div class="ans-attach-ct ${completed.has(item)?'ans-job-finished':''}"><div class="ans-job-icon" role="option" aria-label="任务点未完成"></div><iframe module="insertbbs" src="/ananas/modules/insertbbs/index.html?item=${item}" style="width:850px;height:120px"></iframe></div>`).join('');
   if(options.mixed)body+=`<div class="ans-attach-ct ans-job-finished"><div class="ans-job-icon" aria-label="任务点未完成"></div><iframe module="insertvideo" src="/ananas/modules/video/index.html" style="width:850px;height:120px"></iframe></div>`;
   if(options.extraUnknown)body+='<div class="ans-attach-ct"><div class="ans-job-icon" aria-label="任务点未完成"></div><iframe src="/unsupported-task" style="width:850px;height:80px"></iframe></div>';
  } else if(u.pathname==='/ananas/modules/insertbbs/index.html')body=`<iframe id="frame_content" src="/mooc-ans/bbscircle/chapter?jobid=${u.searchParams.get('item')}" style="width:800px;height:100px"></iframe>`;
  else if(u.pathname==='/ananas/modules/video/index.html')body='<video controls src="/fixture.mp4"></video>';
  else if(u.pathname==='/fixture.mp4')return route.fulfill({status:204,body:''});
  else if(u.pathname==='/mooc-ans/bbscircle/chapter'){
   const item=u.searchParams.get('jobid');
   const target=options.badUrl?'https://evil.synthetic.invalid/post':`https://groupweb.chaoxing.com/course/topic/v3/bbs/synthetic/${item}/replysList?courseId=course1&classId=class1`;
   body=`<div id="topicMainDiv" class="PublicCardBox" data="${target}"><div class="cardConright"><p class="cardRightTit">合成话题${item}</p><span class="Booksspan">如何结合实践学习知识？</span></div></div>`;
  } else if(u.hostname==='groupweb.chaoxing.com'){
   const item=u.pathname.split('/').at(-2);
   body=`<div id="bbsTopicDetail"><div class="topicDetail_detail"><div class="topicDetail_head"><div class="topicDetail_title"><span>合成话题</span><span class="tag blue">置顶</span></div><div class="topicDetail_title_right">回复</div></div><div class="topicDetail_main"><div class="topicDetail_info">老师</div><div><div class="replyContent">${options.topicBody||'如何结合实践学习知识？'}${options.image?'<img src="/thumb.png" data-original="/original-1.png">':''}</div>${options.siblingImages?`<div class="replyImgList">${Array.from({length:options.siblingImages},(_,i)=>`<img src="/thumb.png" data-original="${options.brokenImages?'/missing-image.png':'/original-'+(i+1)+'.png'}">`).join('')}</div>`:''}</div></div></div></div><div class="student-replies"><div class="replyContent">同学的回复不能作为题目</div><div class="addReply">回复</div></div><div class="editContainer topicDetail_editContainer"><div class="edit_headTitle">回复话题</div><div class="edit_main"><div class="replyEdit"><div class="textareawrap"><textarea placeholder="回复话题">${options.draft?'已有人工草稿':''}</textarea><div class="wordcount">0</div></div><div class="replyImgList replyUploadImgList">${options.uploadControls!==false?'<div class="addImg" style="display:none"><input type="file"></div><div class="moxie-shim moxie-shim-html5"><input type="file"></div>':''}${options.uploadImage?'<div class="replyImg"><img src="/synthetic.png"></div>':''}${options.uploadUnknown?'<div class="unrecognized-upload"></div>':''}</div><div class="replyAttachList replyUploadFileList">${options.uploadFile?'<div class="replyAttach"><span>synthetic.txt</span></div>':''}</div><div class="replyEditBtnGroup"><div class="jb_btn addReply">回复</div><div class="cancleReplyBtn">取消</div></div></div></div></div>${options.oldToast?'<div id="old-toast">回复发表成功</div>':''}<script>
   document.querySelector('.topicDetail_editContainer .addReply').onclick=async()=>{const t=document.querySelector('textarea');await __posted(${JSON.stringify(item)},t.value);t.value='';${options.noToast?'':'const toast=document.createElement("div");toast.textContent="回复发表成功";document.body.append(toast);'}};
   ${options.renderDelay?'const delayed=[document.querySelector("#bbsTopicDetail"),document.querySelector(".topicDetail_editContainer")];delayed.forEach(el=>el.remove());setTimeout(()=>delayed.forEach(el=>document.body.append(el)),1500);':''}
   ${options.selectedFile?'const transfer=new DataTransfer();transfer.items.add(new File(["synthetic"],"synthetic.txt"));document.querySelector(".moxie-shim input").files=transfer.files;':''}
   </script>`;
  } else return route.fulfill({status:404,body:'isolated fixture: blocked'});
  return route.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><style>body{margin:10px}textarea{width:650px;height:100px}.addReply{width:100px;height:35px}.PublicCardBox{height:70px}video{width:200px;height:80px}</style>${setup()}${body}<script src="/bundle.js"></script>`});
 });
 let page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('https://mooc1.chaoxing.com/mycourse/studentstudy?courseId=course1&clazzid=class1&cpi=person1');
  if(options.manualTopic){
   await page.goto('https://groupweb.chaoxing.com/course/topic/v3/bbs/synthetic/topic1/replysList?courseId=course1&classId=class1');
   await page.waitForTimeout(800);assert.equal(await page.locator('[data-xxt-discussion-status]').count(),0);assert.equal(counts.models,0);assert.equal(counts.posts.length,0);
   observations.push({name,...counts,passed:true,scope:'Isolated manual topic; no active session'});console.log('Discussion PASS',name);return;
  }
  if(['ai-default','explicit-saved-skip','ui-settings'].includes(name)){
   assert.equal(await page.locator('[data-discussion-settings]').evaluate(el=>el.tagName),'DETAILS');
   assert.equal(await page.locator('[data-discussion-settings]').evaluate(el=>el.open),false);
   assert.equal(await page.locator('[data-setting="discussion-mode"]').isVisible(),false);
   await page.locator('[data-discussion-settings] > summary').click();
   assert.equal(await page.locator('[data-setting="discussion-mode"]').isVisible(),true);
   const expected=name==='explicit-saved-skip'?'skip':'ai';
   assert.equal(await page.locator('[data-setting="discussion-mode"]').inputValue(),expected);
   assert.equal(await page.locator('[data-setting="discussion-length"]').inputValue(),'short');
   assert.equal(await page.locator('[data-setting="discussion-length"]').evaluate(el=>el.closest('label').parentElement.hidden),expected==='skip');
   await page.reload();
   assert.equal(await page.locator('[data-discussion-settings]').evaluate(el=>el.open),false);
   await page.locator('[data-discussion-settings] > summary').click();
   assert.equal(await page.locator('[data-setting="discussion-mode"]').inputValue(),expected);
   if(name==='ai-default'){
    await page.locator('[data-setting="discussion-mode"]').scrollIntoViewIfNeeded();
    await page.screenshot({path:resolve(out,'ai-default.png'),fullPage:true});
   }
  }
  await page.locator('[data-action="start"]').click();
  if(options.status==='images'){
   await page.waitForFunction(()=>Object.keys(__gm).some(k=>k.endsWith(':progress')&&__gm[k]?.phase==='preparing'),{},{timeout:15000});
   await topicPage.waitForFunction(()=>document.querySelector('[data-xxt-discussion-status]')?.dataset.phase==='preparing');
   assert((await topicPage.locator('[data-xxt-discussion-status] .reason').innerText()).includes('4 张图片'));
   await topicPage.screenshot({path:resolve(out,'status-images.png')});
  }
  if(options.status && options.status!=='images'){
   await page.waitForFunction(()=>Object.keys(__gm).some(k=>k.endsWith(':activity')&&__gm[k]?.phase==='generating'),{},{timeout:15000});
   assert(topicPage);await topicPage.waitForLoadState();
   const banner=topicPage.locator('[data-xxt-discussion-status]');
   await banner.waitFor({state:'visible'});
   if(options.status==='images')throw Error('Use image preparing hook before model generation');
   await topicPage.waitForFunction(()=>['generating','rewriting'].includes(document.querySelector('[data-xxt-discussion-status]')?.dataset.phase));
   const previous=await banner.locator('[data-elapsed]').innerText();
   await topicPage.waitForTimeout(1100);
   assert.notEqual(await banner.locator('[data-elapsed]').innerText(),previous,'Elapsed time must continue updating while model is pending');
   assert.equal(await banner.evaluate(el=>getComputedStyle(el).position),'fixed');
   assert.equal(await banner.evaluate(el=>getComputedStyle(el).pointerEvents),'none');
   assert.equal(await banner.locator('[role="status"]').count(),1);
   assert.equal(await banner.locator('[role="status"]').getAttribute('aria-live'),'polite');
   if(options.status==='rewrite')await topicPage.waitForFunction(()=>document.querySelector('[data-xxt-discussion-status]')?.dataset.phase==='rewriting');
   if(options.status==='slow'){
    await topicPage.addStyleTag({content:'*{color:#fff!important;background:#f8f8f8!important;font-size:32px!important}'});
    await topicPage.waitForFunction(()=>document.querySelector('[data-xxt-discussion-status]')?.shadowRoot.textContent.includes('模型接口仍在等待返回'),{},{timeout:20000});
    const rect=await banner.boundingBox();assert(rect.x>=0&&rect.width<=390-32&&rect.y>=0);
    assert.equal(await banner.locator('.stage').evaluate(el=>getComputedStyle(el).color),'rgb(255, 255, 255)');
    assert.equal(await banner.locator('.box').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(23, 39, 63)');
    await topicPage.screenshot({path:resolve(out,'status-slow-narrow.png')});
   }
   await topicPage.screenshot({path:resolve(out,name+'.png')});
  }
  if(options.stop || options.guard){
   await page.waitForFunction(()=>Object.keys(__gm).some(k=>k.startsWith('xxt-discussion:')&&k.endsWith(':progress')&&__gm[k]?.phase==='ready'));
   if(options.stop)await page.locator('[data-action="stop"]').click();
   else {
    assert(topicPage);await topicPage.waitForLoadState();
    if(options.guard==='hidden')await topicPage.evaluate(()=>{__visible=false;});
    if(options.guard==='captcha')await topicPage.evaluate(()=>{document.body.insertAdjacentHTML('beforeend','<form><div class="yzmTips"><input id="ucode" class="yzmInp" type="text"><img id="ccc" style="width:80px;height:35px"><input class="submit" type="submit"></div></form>');});
    if(options.guard==='quiet')await topicPage.evaluate(()=>{GM_setValue('xxt-quiet-enabled',true);XxtCodexCore.quietHoursAt=()=>true;});
    if(options.guard==='account')await page.evaluate(()=>{const u=new URL(location.href);u.searchParams.set('cpi','other-person');history.replaceState(null,'',u);});
   }
   await page.waitForTimeout(3500);assert.equal(counts.posts.length,0);assert.equal(counts.next,0);
   if(options.guard==='captcha')assert.equal(await topicPage.locator('#ucode').inputValue(),'');
  } else {
   await page.waitForFunction(()=>!document.querySelector('#iframe'),{},{timeout:options.noToast||options.noGreen||options.extraUnknown?45000:25000});
   if(options.expectedPosts!==undefined)assert.equal(counts.posts.length,options.expectedPosts);
   if(options.expectedModels!==undefined)assert.equal(counts.models,options.expectedModels);
   if(options.expectedOpens!==undefined)assert.equal(counts.opens,options.expectedOpens);
   if(options.expectAdjustment){
    const notes=store['xxt-discussion-length-notes']||[];assert(notes.some(n=>n.text.includes('优先老师要求')));
    const outer=page.locator('[data-discussion-settings]');if(!await outer.evaluate(el=>el.open))await outer.locator(':scope > summary').click();
    await outer.locator('details > summary').click();
    assert((await outer.innerText()).includes('原设置严格500字'));
    assert((await outer.innerText()).includes('至少600字'));
    await page.screenshot({path:resolve(out,'teacher-adjustment.png'),fullPage:true});
   }
   if(options.expectedPosts&&!options.noToast)assert(counts.cardLoads>1,'Published topic must refresh actual cards');
   if(options.expectLog){const records=Object.entries(store).filter(([k])=>k.startsWith('xxt-skipped:')).flatMap(([,v])=>v);assert(records.some(r=>r.reason.includes(options.expectLog)),JSON.stringify(records));}
   if(name==='multiple-skips-retained'||options.extraUnknown){
    const rows=Object.entries(store).filter(([k])=>k.startsWith('xxt-skipped:')).flatMap(([,v])=>v);
    assert.equal(rows[0].discussionSkips.length,2);assert(rows[0].reason.includes('topic1')&&rows[0].reason.includes('topic2'));
   }
   if(options.repeat){
    const priorPosts=counts.posts.length,priorModels=counts.models;
    await page.close();page=await context.newPage();
    await page.goto('https://mooc1.chaoxing.com/mycourse/studentstudy?courseId=course1&clazzid=class1&cpi=person1');
    await page.locator('[data-action="start"]').click();
    await page.waitForFunction(()=>!document.querySelector('#iframe'),{},{timeout:35000});
    assert.equal(counts.posts.length,priorPosts,'A fresh parent tab must not repost an uncertain/published topic');
    assert.equal(counts.models,priorModels,'An uncertain/published topic must not re-request AI');
   }
  }
  if(name==='strict-rewrite')assert.equal(counts.posts[0].text.length,50);
  if(name==='ui-settings'){
   if(!await page.locator('[data-discussion-settings]').evaluate(el=>el.open))await page.locator('[data-discussion-settings] > summary').click();
   const mode=page.locator('[data-setting="discussion-mode"]');await mode.selectOption('skip');
   await page.waitForFunction(()=>GM_getValue('xxt-discussion-settings')?.mode==='skip');
   await page.reload();
   await page.locator('[data-discussion-settings] > summary').click();
   assert.equal(await mode.inputValue(),'skip');
   assert.equal(await page.locator('[data-setting="discussion-length"]').evaluate(el=>el.closest('label').parentElement.hidden),true);
   await mode.selectOption('ai');
   await page.locator('[data-setting="discussion-length"]').selectOption('custom');
   await page.locator('[data-setting="discussion-precision"]').selectOption('strict');
   await page.locator('[data-setting="discussion-words"]').fill('500');await page.locator('[data-setting="discussion-words"]').dispatchEvent('change');
   assert.equal((await page.evaluate(()=>GM_getValue('xxt-discussion-settings'))).words,'500');
   await page.reload();
   assert.equal(await page.locator('[data-discussion-settings]').evaluate(el=>el.open),false);
   const heading=page.locator('[data-discussion-settings] > summary');
   await heading.focus();await heading.press('Enter');
   assert.equal(await page.locator('[data-discussion-settings]').evaluate(el=>el.open),true);
   assert.equal(await mode.inputValue(),'ai');
   assert.equal(await page.locator('[data-setting="discussion-length"]').inputValue(),'custom');
   assert.equal(await page.locator('[data-setting="discussion-precision"]').inputValue(),'strict');
   assert.equal(await page.locator('[data-setting="discussion-words"]').inputValue(),'500');
   await page.locator('[data-discussion-settings] p').scrollIntoViewIfNeeded();
   await page.screenshot({path:resolve(out,'settings.png'),fullPage:true});
   await heading.click();
   await page.locator('[data-setting="discussion-mode"]').waitFor({state:'hidden'});
   assert.equal(await page.locator('[data-setting="discussion-mode"]').isVisible(),false);
   assert.equal((await page.evaluate(()=>GM_getValue('xxt-discussion-settings'))).words,'500');
   await page.screenshot({path:resolve(out,'settings-collapsed.png'),fullPage:true});
  }
  assert.deepEqual(errors,[]);
  if(options.keepTopicOpen && !options.stop){
   const phase=options.guard?'blocked':options.noToast?'uncertain':'published';
   const banner=topicPage.locator('[data-xxt-discussion-status]');
   await topicPage.waitForFunction(expected=>document.querySelector('[data-xxt-discussion-status]')?.dataset.phase===expected,phase);
   const text=await banner.locator('.box').innerText();assert(!text.includes('同学的回复不能作为题目'));
   if(options.noToast){assert(text.includes('未观察到本次发表成功'));assert.equal(counts.posts.length,1);}
   if(phase==='published')assert(text.includes('任务点仍需回到课程确认'));
   const elapsed=await banner.locator('[data-elapsed]').innerText();await topicPage.waitForTimeout(1100);assert.equal(await banner.locator('[data-elapsed]').innerText(),elapsed,'Terminal elapsed time must stop');
   await topicPage.screenshot({path:resolve(out,name+'-terminal.png')});
  }
  observations.push({name,...counts,passed:true,scope:'Synthetic pages/models/storage/focus; real browser navigation and DOM events'});
  console.log('Discussion PASS',name,JSON.stringify({...counts,posts:counts.posts.map(p=>({item:p.item,characters:Array.from(p.text).length}))}));
 }catch(error){await page.screenshot({path:resolve(out,name+'-failure.png'),fullPage:true}).catch(()=>{});console.error(name,counts,errors,await page.locator('[data-xxt-codex-panel]').innerText().catch(()=>''));throw error;}
 finally{await context.close();}
}
try{
 await scenario('status-slow-model',{status:'slow',narrow:true,modelDelay:20000,keepTopicOpen:true,expectedPosts:1,expectedModels:1});
 await scenario('status-rewrite',{status:'rewrite',modelDelay:2500,rewrite:true,store:{'xxt-discussion-settings':{mode:'ai',length:'custom',precision:'strict',words:'50'}},words:'学'.repeat(50),keepTopicOpen:true,expectedPosts:1,expectedModels:2});
 await scenario('status-uncertain',{status:'normal',modelDelay:2500,keepTopicOpen:true,noToast:true,noGreen:true,expectedPosts:1,expectedModels:1});
 await scenario('status-paused',{slowModel:true,guard:'hidden',keepTopicOpen:true});
 await scenario('status-images',{status:'images',siblingImages:4,vision:true,imageDelay:1200,keepTopicOpen:true,expectedPosts:1,expectedModels:1});
 await scenario('status-manual-topic',{manualTopic:true});
 await scenario('post-refresh-green',{expectedPosts:1,expectedModels:1,expectedOpens:1});
 await scenario('delayed-topic-render',{renderDelay:true,expectedPosts:1,expectedModels:1});
 await scenario('empty-upload-controls',{uploadControls:true,expectedPosts:1,expectedModels:1,expectedOpens:1});
 await scenario('preserve-uploaded-image',{uploadControls:true,uploadImage:true,expectedPosts:0,expectedModels:0,expectLog:'人工草稿或附件'});
 await scenario('preserve-uploaded-file',{uploadControls:true,uploadFile:true,expectedPosts:0,expectedModels:0,expectLog:'人工草稿或附件'});
 await scenario('preserve-selected-file',{uploadControls:true,selectedFile:true,expectedPosts:0,expectedModels:0,expectLog:'人工草稿或附件'});
 await scenario('preserve-unknown-upload',{uploadControls:true,uploadUnknown:true,expectedPosts:0,expectedModels:0,expectLog:'人工草稿或附件'});
 await scenario('preserve-file-arriving-during-ai',{uploadControls:true,lateFile:true,expectedPosts:0,expectedModels:1,expectLog:'人工草稿或附件'});
 await scenario('preserve-draft-arriving-during-ai',{uploadControls:true,lateDraft:true,expectedPosts:0,expectedModels:1,expectLog:'人工草稿或附件'});
 await scenario('multi-topic-mixed',{items:['topic1','topic2'],mixed:true,expectedPosts:2,expectedModels:2});
 await scenario('completed-stale-aria',{completed:['topic1'],expectedPosts:0,expectedModels:0,expectedOpens:0});
 await scenario('ai-default',{store:{'xxt-discussion-settings':{}},expectedPosts:1,expectedModels:1,expectedOpens:1});
 await scenario('explicit-saved-skip',{store:{'xxt-discussion-settings':{mode:'skip'}},expectedPosts:0,expectedModels:0,expectedOpens:0,expectLog:'用户选择跳过'});
 await scenario('no-ai',{store:{'xxt-ai-enabled':false},expectedPosts:0,expectedModels:0,expectLog:'不接入AI'});
 await scenario('ui-settings',{store:{'xxt-discussion-settings':{}},expectedPosts:1});
 await scenario('invalid-custom',{store:{'xxt-discussion-settings':{mode:'ai',length:'custom',words:''}},expectedPosts:0,expectedModels:0,expectLog:'整数'});
 await scenario('strict-rewrite',{store:{'xxt-discussion-settings':{mode:'ai',length:'custom',precision:'strict',words:'50'}},words:'学'.repeat(50),rewrite:true,expectedPosts:1,expectedModels:2});
 await scenario('detailed-200',{store:{'xxt-discussion-settings':{mode:'ai',length:'detail'}},words:'学'.repeat(200),decision:{action:'answer',reason:'需要完整讨论',suitableMax:300,requirement:'无'},expectedPosts:1,expectedModels:1});
 await scenario('approximate-custom',{store:{'xxt-discussion-settings':{mode:'ai',length:'custom',precision:'approx',words:'500'}},words:'学'.repeat(460),decision:{action:'answer',reason:'需要完整讨论',suitableMax:600,requirement:'无'},expectedPosts:1,expectedModels:1});
 await scenario('multiple-skips-retained',{items:['topic1','topic2'],store:{'xxt-discussion-settings':{mode:'skip'}},expectedPosts:0,expectedModels:0,expectLog:'topic1'});
 await scenario('length-exhausted',{words:'学'.repeat(801),expectedPosts:0,expectedModels:3,expectLog:'三次生成'});
 await scenario('simple-topic-rewrite',{firstSkip:true,words:'学'.repeat(500),store:{'xxt-discussion-settings':{mode:'ai',length:'custom',precision:'strict',words:'500'}},expectedPosts:1,expectedModels:2});
 await scenario('short-adaptive-300',{words:'学'.repeat(300),expectedPosts:1,expectedModels:1});
 await scenario('detailed-adaptive-350',{words:'学'.repeat(350),store:{'xxt-discussion-settings':{mode:'ai',length:'detail'}},expectedPosts:1,expectedModels:1});
 await scenario('short-teacher-min-900',{topicBody:'请至少900字解释原理。',words:'学'.repeat(950),expectedPosts:1,expectedModels:1});
 await scenario('detailed-teacher-max-50',{topicBody:'回复不超过50字。',words:'学'.repeat(40),store:{'xxt-discussion-settings':{mode:'ai',length:'detail'}},expectedPosts:1,expectedModels:1});
 await scenario('strict-teacher-override',{topicBody:'请至少600字解释原理。',words:'学'.repeat(650),store:{'xxt-discussion-settings':{mode:'ai',length:'custom',precision:'strict',words:'500'}},expectAdjustment:true,expectedPosts:1,expectedModels:1});
 await scenario('exceptional-length-skip',{store:{'xxt-discussion-settings':{mode:'ai',length:'custom',precision:'strict',words:'3000'}},decision:{action:'skip',reason:'仅需一个字且无可展开信息，与3000字超过十倍，极端不合理',suitableMax:1,requirement:'无',skipKind:'extreme-length',exceptional:true},expectedPosts:0,expectedModels:1,expectLog:'极端不合理'});
 await scenario('teacher-four-sibling-images',{siblingImages:4,vision:true,expectedPosts:1,expectedModels:1});
 await scenario('teacher-inline-image',{image:true,vision:true,expectedPosts:1,expectedModels:1});
 await scenario('teacher-images-without-vision',{siblingImages:4,expectedPosts:0,expectedModels:0,expectLog:'未配置图片接口'});
 await scenario('teacher-original-image-failed',{siblingImages:4,vision:true,brokenImages:true,expectedPosts:0,expectedModels:0,expectLog:'图片'});
 await scenario('preserve-manual-draft',{draft:true,expectedPosts:0,expectedModels:0,expectLog:'人工草稿'});
 await scenario('unsupported-url',{badUrl:true,expectedPosts:0,expectedModels:0,expectedOpens:0,expectLog:'地址不受支持'});
 await scenario('image-body',{image:true,expectedPosts:0,expectedModels:0,expectLog:'图片'});
 await scenario('stop-late-model',{slowModel:true,stop:true});
 await scenario('hidden-before-late-model',{slowModel:true,guard:'hidden'});
 await scenario('captcha-before-late-model',{slowModel:true,guard:'captcha'});
 await scenario('quiet-before-late-model',{slowModel:true,guard:'quiet'});
 await scenario('account-changed-before-late-model',{slowModel:true,guard:'account'});
 await scenario('old-toast-not-success',{oldToast:true,noToast:true,noGreen:true,repeat:true,expectedPosts:1,expectedModels:1,expectLog:'未观察到本次'});
 await scenario('published-but-not-green',{noGreen:true,repeat:true,expectedPosts:1,expectedModels:1,expectLog:'未确认对应任务点'});
 await scenario('skip-details-survive-other-task-failure',{items:['topic1','topic2'],store:{'xxt-ai-enabled':false,'xxt-discussion-settings':{mode:'skip'}},extraUnknown:true,expectedPosts:0,expectedModels:0,expectedOpens:0,expectLog:'topic2'});
 await writeFile(resolve(out,'observations.json'),JSON.stringify(observations,null,2)+'\n');
}finally{await browser.close();}
