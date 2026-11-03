import {chromium} from './browser-runtime.mjs';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),bundle=await readFile(new URL('dist/xuexitong-task-points-only.user.js',root),'utf8');
const browser=await chromium.launch({headless:true}),observations=[];
const marker=done=>`<div class="ans-job-icon" aria-label="任务点${done?'已完成':'未完成'}"></div>`;
const quiz=n=>`<div class="ans-attach-ct" data-quiz>${marker(false)}<div class="TiMu"><div class="Zy_TItle"><span class="newZy_TItle">【单选题】</span>Chapter ${n}: 1+1?</div><ul class="Zy_ulTop"><li><span class="num_option choice${n+10}">A</span><a class="after">2</a></li><li><span class="num_option choice${n+10}">B</span><a class="after">3</a></li></ul></div><a class="btnSubmit workBtnIndex">提交</a></div><script>document.querySelectorAll('.num_option').forEach(x=>x.onclick=()=>x.classList.add('check_answer'));document.querySelector('.btnSubmit').onclick=()=>{__event('submit:${n}');document.querySelector('[data-quiz]').classList.add('ans-job-finished');document.querySelector('[data-quiz]').innerHTML=${JSON.stringify(marker(true)+'<p>满分:100</p><p>最终成绩100分</p>')};};</script>`;
const media=(done,{held=false,nested=false,cross=false,pending=false}={})=>`<div class="ans-attach-ct ${done?'ans-job-finished':''}" data-media>${marker(done)}<iframe src="${cross?'https://mooc1-1.chaoxing.com':''}/ananas/modules/video/index.html${nested?'?nested=1':''}" style="width:700px;height:180px"></iframe>${held?'<iframe src="/ananas/modules/work/wait" style="width:400px;height:50px"></iframe>':''}</div>${pending?`<div class="ans-attach-ct" data-pending>${marker(false)}<iframe src="/ananas/modules/video/index.html?pending=1" style="width:700px;height:100px"></iframe></div>`:''}`;
async function scenario(name){const context=await browser.newContext({viewport:{width:1500,height:1200}}),events=[];await context.exposeBinding('__event',(_,e)=>events.push(e));
 await context.addInitScript(()=>{window.unsafeWindow=window;window.GM_getValue=(k,d)=>{const raw=localStorage.getItem(k);return raw===null?d:JSON.parse(raw)};window.GM_setValue=(k,v)=>localStorage.setItem(k,JSON.stringify(v));GM_setValue('xxt-quiet-enabled',false);GM_setValue('xxt-ai-enabled',true);GM_setValue('xxt-ai-config',{provider:'codex',protocol:'codex',baseUrl:'http://127.0.0.1:18763',key:'b'.repeat(64)});window.GM_xmlhttpRequest=c=>{const p=c.data&&JSON.parse(c.data);if(p)__event('model:'+p.questions.map(q=>q.text).join('|'));setTimeout(()=>c.onload({status:200,responseText:JSON.stringify(p?{answers:p.questions.map(q=>({id:q.id,choices:['A'],texts:[],readable:true,confidence:1,explanation:'Synthetic'}))}:{ok:true})}),20);return{abort(){}};};});
 const noTasks=name==='no-task-chain'||name==='pending-catalog-missing-markers';
 const titles=noTasks?['1 欢迎词*','2 阅读资料','3 必修*示例']:name==='starred-with-task'?['必做测验*','下一章']:['5.5 改革开放','下一章'];
 await context.route('**/*',async route=>{const u=new URL(route.request().url());let html='';
  if(u.pathname==='/ananas/modules/work/wait')return; // A finished task's child intentionally never becomes ready.
  if(u.pathname==='/mycourse/studentstudy')html=`<div class="prev_title">${titles[0]}</div><div id="coursetree">${titles.map((title,i)=>`<div class="posCatalog_select ${i===0?'posCatalog_active':''}"><span class="posCatalog_name">${title}</span></div>`).join('')}</div><ul><li cardid="video" id="dct1" onclick="card(0)">1 视频</li><li cardid="check" id="dct2" onclick="card(1)">2 章节测验</li></ul><iframe id="iframe" src="/mooc-ans/knowledge/cards?chapter=0&num=0" style="width:1100px;height:800px"></iframe><button id="next">下一节</button><script>let chapter=0;window.card=num=>{__event('card:'+chapter+':'+num);document.querySelector('#iframe').src='/mooc-ans/knowledge/cards?chapter='+chapter+'&num='+num};function advance(){if(chapter+1>=${titles.length}){document.querySelector('#next').disabled=true;return;}document.querySelector('.posCatalog_active').classList.remove('posCatalog_active');chapter++;document.querySelectorAll('.posCatalog_select')[chapter].classList.add('posCatalog_active');document.querySelector('.prev_title').textContent=document.querySelector('.posCatalog_active').textContent;__event('chapter:'+chapter);document.querySelector('#iframe').src='/mooc-ans/knowledge/cards?chapter='+chapter+'&num=0';}document.querySelector('#next').onclick=()=>{if(${name==='self-study-prompt'}&&chapter<2){__event('warning:'+chapter);const d=document.createElement('div');d.setAttribute('role','dialog');d.innerHTML='<p>当前章节还有任务点未完成，是否去完成？</p><button>去学习</button><button class="confirm-next">下一节</button>';document.body.append(d);d.querySelector('.confirm-next').onclick=()=>{__event('confirm-skip:'+chapter);d.remove();advance()};return;}advance()};</script>`;
  else if(u.pathname==='/mooc-ans/knowledge/cards'){
   const chapter=Number(u.searchParams.get('chapter')),num=Number(u.searchParams.get('num'));
   if(noTasks)html=chapter<2?(num===0?media(false).replace(marker(false),'')+quiz(chapter).replace(marker(false),''):'<p>这里没有任务点</p>'):num===0?quiz(chapter):'<p>没有任务点</p>';
   else if(name==='starred-with-task'||name==='stale-catalog-green')html=chapter===0&&num===0?quiz(chapter):'<p>没有任务点</p>';
   else if(name==='late-task-point')html=chapter===0&&num===0?quiz(chapter).replace(marker(false),'')+`<script>setTimeout(()=>{__event('late-marker');document.querySelector('[data-quiz]').insertAdjacentHTML('afterbegin',${JSON.stringify(marker(false))});},4000);</script>`:'<p>没有任务点</p>';
   else if(chapter>0)html='<p>下一章</p>';
   else if(name==='completed-with-unknown-loader')html=media(true,{held:true})+'<iframe id="late-quiz" src="/ananas/modules/work/wait" style="width:800px;height:300px"></iframe><script>setTimeout(()=>{__event("late-loader-ready");document.querySelector("#late-quiz").src="/ananas/modules/work/late";},4000);</script>';
   else if(name==='same-page-completed-and-pending-quiz')html=media(true,{held:true})+quiz(chapter);
   else html=num===0?media(true,{held:true,nested:name==='nested-completed-player',cross:name==='cross-origin-completed-player',pending:name==='keep-unfinished-sibling'}):quiz(chapter);
  }else if(u.pathname==='/ananas/modules/work/late')html=quiz(0);
  else if(u.pathname==='/ananas/modules/video/index.html'){
   html=u.searchParams.has('nested')?'<iframe src="/ananas/modules/video/index.html?leaf=1" style="width:600px;height:100px"></iframe>':'<button class="vjs-big-play-button">播放</button><p>播放器尚未建立 video 元素</p><script>document.querySelector("button").onclick=()=>__event("play");</script>';
  }else return route.fulfill({body:''});
  return route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><style>body{margin:8px}li[cardid]{display:inline-block;margin:8px}</style>${html}<script>${bundle.replaceAll('</script','<\/script')}</script>`});
 });
 const page=await context.newPage();try{
  await page.goto('https://mooc1.chaoxing.com/mycourse/studentstudy?courseId=priority&clazzid=1&cpi=2',{waitUntil:'domcontentloaded'});await page.locator('[data-task-point-scope]').waitFor();
  if(['completed-catalog','stale-catalog-green'].includes(name))await page.locator('.posCatalog_active').evaluate(node=>node.insertAdjacentHTML('beforeend','<span class="icon_Completed"></span>'));
  if(name==='pending-catalog-missing-markers')await page.locator('.posCatalog_active').evaluate(node=>node.insertAdjacentHTML('beforeend','<span class="orangeNew">1</span>'));
  await page.locator('[data-action=start]').click();
  if(name==='keep-unfinished-sibling'){
   await page.waitForTimeout(3000);assert(!events.some(e=>e.startsWith('model:')));assert(!events.includes('card:0:1'));
   await page.frameLocator('#iframe').locator('[data-pending]').evaluate(node=>{node.classList.add('ans-job-finished');node.querySelector('.ans-job-icon').setAttribute('aria-label','任务点已完成');});
  }
  if(name==='pending-catalog-missing-markers'){
   await page.getByRole('region',{name:'运行状态'}).getByText('目录仍显示未完成任务点，但本章页面未能识别，保留本章等待核对',{exact:true}).waitFor({timeout:25000});
   assert(!events.some(e=>e.startsWith('model:')||e.startsWith('chapter:')));observations.push({name,events});console.log('Passed: '+name);return;
  }
  const final=name==='completed-catalog'?'chapter:1':noTasks?'submit:2':'submit:0';
  for(let i=0;i<600&&!events.includes(final);i++)await page.waitForTimeout(100);
  assert(events.includes(final),'Pending tasks must run; completed or confirmed task-free content must advance.');
  assert(!events.includes('play'),'A completed or task-free player must not be started.');
  if(name==='completed-catalog'){assert(!events.some(e=>e.startsWith('model:')));assert(!events.includes('card:0:1'));}
  else if(noTasks){assert(!events.some(e=>/^submit:[01]$/.test(e)));assert.equal(events.filter(e=>e.startsWith('model:')).length,1);}
  else assert.equal(events.filter(e=>e.startsWith('model:')).length,1);
  if(name==='late-task-point')assert(events.indexOf('late-marker')<events.findIndex(e=>e.startsWith('model:')),'An initially blank marker state must not be mistaken for task-free content.');
  if(name==='completed-with-unknown-loader')assert(events.indexOf('late-loader-ready')<events.findIndex(e=>e.startsWith('model:')),'Completed media must not hide an unrelated pending quiz loader.');
  observations.push({name,events});console.log('Passed: '+name);
 }catch(error){console.error({name,events,status:await page.getByRole('region',{name:'运行状态'}).innerText().catch(()=>''),frames:page.frames().map(f=>f.url())});throw error;}finally{await context.close();}}
try{
 const names=process.argv.slice(2).length?process.argv.slice(2):['completed-player-never-ready','nested-completed-player','cross-origin-completed-player','same-page-completed-and-pending-quiz','keep-unfinished-sibling','no-task-chain','starred-with-task','late-task-point','completed-catalog','stale-catalog-green','pending-catalog-missing-markers','completed-with-unknown-loader'];
 for(const name of names)await scenario(name);
 await mkdir(new URL('artifacts/completion-priority/',root),{recursive:true});await writeFile(new URL('artifacts/completion-priority/observations.json',root),JSON.stringify(observations,null,2));console.log(`${names.length} completion-priority/task-presence browser scenarios passed; no real platform/model requests.`);
}finally{await browser.close();}
