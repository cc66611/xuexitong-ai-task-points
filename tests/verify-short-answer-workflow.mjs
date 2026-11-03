import { chromium } from './browser-runtime.mjs';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'output/playwright/short-answer-workflow');
const bundle=await readFile(resolve(root,'dist/xuexitong-ai-assistant.user.js'),'utf8');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),observations=[];
const selected=process.env.XXT_SHORT_CASE;
async function run(mode){
 if(selected&&selected!==mode)return;
 const page=await browser.newPage({viewport:{width:1400,height:1000}});
 await page.route('**/*',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:'<main></main>'}));
 await page.goto('https://mooc1.chaoxing.com/mooc-ans/work/doHomeWorkNew?workId=short-fixture');
 await page.evaluate(mode=>{
  window.unsafeWindow=window;window.__counts={models:0,saves:0,submits:0,next:0,aborts:0,syncs:0};window.__payload=[];window.__batches=[];window.__submitted=null;
  window.__gm={'xxt-quiet-enabled':false,'xxt-ai-enabled':!mode.startsWith('no-ai'),'xxt-ai-config':{provider:'custom',protocol:'chat',baseUrl:'https://fixture.invalid/v1',model:'text-only',key:'fixture-only'},
   ...(['submit','skip','no-ai-skip','result-skip'].includes(mode)?{'xxt-short-answer-mode':mode==='submit'?'submit':'skip'}:{})};
  window.GM_getValue=(key,fallback)=>__gm[key]??fallback;window.GM_setValue=(key,value)=>__gm[key]=structuredClone(value);
  window.GM_xmlhttpRequest=spec=>{
   __counts.models++;const body=JSON.parse(spec.data);if(typeof body.messages[0].content!=='string')throw Error('Editor toolbar/frame routed to vision');
   const questions=JSON.parse(body.messages[0].content.split('题目：')[1].split('\n之前的平台反馈')[0]);__payload=questions;
   __batches.push({questions,containsFullReading:body.messages[0].content.includes('阅'.repeat(13520))});
   const delay=['stop-model','change-mode','manual-during','change-question','change-location','quiet-model','captcha-model'].includes(mode)?700:30;
   if(mode==='manual-during')setTimeout(()=>{document.querySelector('iframe').contentDocument.body.textContent='人工新内容';},100);
   let cancelled=false;setTimeout(()=>{if(!cancelled)spec.onload({status:200,responseText:JSON.stringify({choices:[{message:{content:JSON.stringify({answers:questions.map(q=>({id:q.id,choices:q.type==='boolean'?['A']:[],...(q.type==='boolean'?{}:{texts:['保留 <比较> & 完整内容\n第二行']}),readable:true,confidence:1,explanation:'synthetic'}))})}}]})});},delay);
   return {abort(){cancelled=true;__counts.aborts++;spec.onabort?.();}};
  };
  const essay=(index,kind)=>`<div class="TiMu newTiMu"><div class="Zy_TItle clearfix"><i>${index+1}</i><div><span class="newZy_TItle">【${kind}】</span><p>阅读材料与第${index+1}题。</p></div></div><div class="clearfix"><ul class="Zy_ulTk"><li><span>填写答案</span><div class="edui-editor"><div class="edui-editor-iframeholder"><iframe id="ueditor_${index}"></iframe></div></div><textarea id="answerFixture${index}" name="answerFixture${index}" style="display:none"></textarea></li></ul><input type="hidden" id="answertypeFixture${index}"></div></div>`;
  const boolean=index=>`<div class="TiMu"><div class="Zy_TItle"><span class="newZy_TItle">【判断题】</span>判断${index+1}</div><ul class="Zy_ulTop">${['对','错'].map((text,i)=>`<li><span class="num_option choice${index+1}">${'AB'[i]}</span><a class="after">${text}</a></li>`).join('')}</ul></div>`;
  const without=mode==='no-essay';
  const essayCount=mode==='long-reading'?8:2;
  document.querySelector('main').innerHTML=(without?'':Array.from({length:essayCount},(_,i)=>essay(i,i===0?'其它':i<3?'论述题':'简答题')).join(''))+Array.from({length:without?1:10},(_,i)=>boolean(i+(without?0:essayCount))).join('')+
   (mode==='missing-save'?'':'<a class="btnSave workBtnIndex" role="button"><span id="tempsave">暂时保存</span></a>')+
   (mode==='duplicate-save'?'<a class="btnSave workBtnIndex" role="button">暂时保存</a>':'')+'<a class="btnSubmit workBtnIndex" role="button">提交</a><button type="button" id="next">下一节</button>';
  if(mode==='long-reading'){
   const title=document.querySelector('.Zy_TItle'),p=title.querySelector('p');p.textContent='';
   p.textContent='阅'.repeat(13534-title.textContent.replace(/\s+/g,' ').trim().length);
  }
  window.UE={instants:{}};
  for(const [index,field]of [...document.querySelectorAll('textarea')].entries()){
   const frame=document.getElementById('ueditor_'+index);frame.contentDocument.body.contentEditable='true';
   const editor={key:field.id,textarea:field,iframe:frame,body:frame.contentDocument.body,isReady:true,options:{},
    setContent(html){this.body.innerHTML=html;},getContent(){return this.body.innerHTML;},sync(){__counts.syncs++;this.textarea.value=this.getContent();}};
   if(mode==='wrong-editor'&&index===0)editor.iframe=document.createElement('iframe');
   if(mode==='readonly'&&index===0)editor.options.readonly=true;
   if(mode==='manual-text'&&index===0){editor.setContent('<p>人工已有内容</p>');editor.sync();}
   UE.instants['editor'+index]=editor;
  }
  document.querySelectorAll('.num_option').forEach(node=>node.onclick=()=>{node.closest('ul').querySelectorAll('.num_option').forEach(n=>n.classList.remove('check_answer'));node.classList.add('check_answer');});
  if(mode==='manual-choice')document.querySelector('.num_option').classList.add('check_answer');
  if(mode==='missing-image')document.querySelector('.Zy_TItle p').insertAdjacentHTML('beforeend','<img src="data:image/png;base64,AA==">');
  document.querySelector('#next').onclick=()=>__counts.next++;
  document.querySelector('.btnSubmit').onclick=()=>{__counts.submits++;__submitted=[...document.querySelectorAll('textarea')].map(field=>field.value);document.querySelector('main').innerHTML='<p>最终成绩 100 分 满分：100</p><button type="button" id="next">下一节</button>';document.querySelector('#next').onclick=()=>__counts.next++;};
  if(['stale-feedback','stale-wrapper'].includes(mode)){const old=document.createElement('div');old.id='old-save-toast';old.textContent='保存成功!';document.body.append(old);}
  document.querySelectorAll('.btnSave').forEach(node=>node.onclick=()=>{
   __counts.saves++;
   if(mode==='no-feedback'||mode==='stale-feedback')return;
   if(mode==='stale-wrapper'){const wrapper=document.createElement('div');wrapper.append(document.getElementById('old-save-toast'));document.body.append(wrapper);return;}
   setTimeout(()=>{const toast=document.createElement('div');if(mode==='icon-feedback')toast.innerHTML='<i>✓</i>保存成功!';else toast.textContent='保存成功!';document.body.append(toast);},mode==='stop-save'?800:30);
  });
  if(mode==='disabled-save')document.querySelector('.btnSave').setAttribute('aria-disabled','true');
  if(mode.startsWith('result-')){
   document.querySelectorAll('.btnSubmit,.btnSave').forEach(node=>node.remove());
   const grade=document.createElement('p');grade.textContent='最终成绩 50 分 满分：100';document.querySelector('main').prepend(grade);
   const redo=document.createElement('button');redo.textContent='重做（剩余 3 次）';redo.onclick=()=>__counts.submits++;document.querySelector('main').append(redo);
  }
 },mode);
 await page.addScriptTag({content:bundle});
 if(mode==='saved-history')await page.evaluate(()=>{
  const questions=XxtCodexDom.extract(document).map(entry=>entry.question);
  const task=`local/${sessionStorage.getItem('xxt-codex-tab')}/${location.origin}/short-fixture/${questions.map(q=>q.id).join(',')}`;
  GM_setValue(`xxt-check:${task}/work:short-fixture`,{attempts:[{questions,answers:questions.map(q=>({id:q.id,choices:q.type==='boolean'?['A']:[],...(q.type==='essay'?{texts:['保留 <比较> & 完整内容\n第二行']}:{}),readable:true,confidence:1,explanation:'synthetic'})),finalScore:50,maxScore:100,review:[]}]});
 });
 assert.deepEqual(await page.evaluate(()=>XxtCodexDom.extract(document).map(entry=>entry.question.type)),mode==='no-essay'?['boolean']:[...Array(mode==='long-reading'?8:2).fill('essay'),...Array(10).fill('boolean')]);
 if(mode==='preview'){
  await page.locator('[data-action=solve]').click();await page.waitForFunction(()=>document.querySelector('[data-answer-preview]')?.textContent.includes('第 1 题')||document.body.textContent.includes('AI 答案预览（未填写、未提交）'));
 }else{
  await page.locator('[data-action=start]').click();
  if(['stop-model','change-mode','change-question','change-location','quiet-model','captcha-model'].includes(mode)){
   await page.waitForFunction(()=>__counts.models===1);
   if(mode==='stop-model')await page.locator('[data-action=stop]').click();
   else if(mode==='change-mode'){await page.locator('[data-short-answer-settings] > summary').click();await page.locator('[data-setting="short-answer-mode"][value="submit"]').locator('..').click();}
   else if(mode==='change-question')await page.evaluate(()=>document.querySelector('.Zy_TItle p').textContent='已切换到另一道题');
   else if(mode==='change-location')await page.evaluate(()=>history.replaceState(null,'','?workId=another'));
   else if(mode==='quiet-model')await page.evaluate(()=>{XxtCodexCore.quietHoursAt=()=>true;__gm['xxt-quiet-enabled']=true;});
   else await page.evaluate(()=>{const challenge=document.createElement('form');challenge.innerHTML='<div class="yzmTips"><p>操作异常，请输入图片中的验证码</p><input id="ucode" class="yzmInp" type="text"><img id="ccc" style="width:80px;height:35px"><input class="submit" type="submit"></div>';document.body.append(challenge);});
   await page.waitForTimeout(1200);
  }else if(mode==='stop-save'){
   await page.waitForFunction(()=>__counts.saves===1);await page.locator('[data-action=stop]').click();await page.waitForTimeout(1200);
  }else if(['manual-text','manual-during','manual-choice','readonly','wrong-editor'].includes(mode)){
   await page.waitForFunction(()=>/手动|不可编辑|未能就绪/.test(document.querySelector('pre').textContent),null,{timeout:7000});
  }else await page.waitForFunction(()=>__counts.next===1,null,{timeout:20000}).catch(async error=>{console.log(mode,await page.locator('pre').textContent());throw error;});
 }
 const result=await page.evaluate(()=>({counts:__counts,payload:__payload.map(q=>({id:q.id,type:q.type,slots:q.slots})),
  values:[...document.querySelectorAll('textarea')].map(field=>field.value),choices:document.querySelectorAll('.check_answer').length,
  ledger:Object.entries(__gm).filter(([key])=>key.startsWith('xxt-skipped:')).flatMap(([,value])=>value),
  saved:Object.entries(__gm).filter(([key])=>key.startsWith('xxt-saved-quizzes:')).flatMap(([,value])=>value),
  batches:__batches.map(b=>({ids:b.questions.map(q=>q.id),textLengths:b.questions.map(q=>q.text.length),containsFullReading:b.containsFullReading})),
  records:Object.entries(__gm).filter(([key])=>key.startsWith('xxt-check:')).map(([,value])=>value)}));
 const submitted=mode==='submit'||mode==='no-essay';
 assert.equal(result.counts.submits,submitted?1:0,mode+' submit count');
 if(['skip','no-ai-skip','no-ai-save','missing-save','duplicate-save','disabled-save','missing-image'].includes(mode)){
  assert.equal(result.counts.models,0);assert.equal(result.counts.saves,0);assert(result.values.every(value=>!value));assert.equal(result.choices,0);
  assert.equal(result.ledger[0].quizSkips[0].total,12);assert.equal(result.ledger[0].quizSkips[0].essays.length,2);
 }
 if(['default-save','saved-history','icon-feedback'].includes(mode)){
  assert.equal(result.counts.saves,1);assert.equal(result.counts.syncs,2);assert.equal(result.choices,10);
  assert(result.values.every(value=>value.includes('&lt;比较&gt;')&&value.includes('&amp;')&&value.includes('第二行')));
  assert.equal(result.ledger.length,0);assert.equal(result.saved.length,1);assert.equal(result.saved[0].state,'saved');assert.equal(result.saved[0].total,12);
  assert.equal(await page.locator('.xxt-status-badge').textContent(),'已暂存 · 未提交');
  await page.locator('[data-action=start]').click();await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>__counts.saves),1);assert.equal(await page.evaluate(()=>__counts.models),1);
 }
 if(mode==='long-reading'){
  assert.equal(result.counts.saves,1);assert.equal(result.counts.submits,0);assert.equal(result.counts.syncs,8);assert.equal(result.choices,10);
  assert.equal(result.ledger.length,0);assert.equal(result.saved[0].total,18);assert.equal(result.saved[0].essays.length,8);
  assert(result.batches.length>1);assert(result.batches.every(b=>b.containsFullReading));assert.equal(result.batches.flatMap(b=>b.ids).length,18);assert.equal(result.batches[0].textLengths[0],13534);
 }
 if(['no-feedback','stale-feedback','stale-wrapper'].includes(mode)){assert.equal(result.counts.saves,1);assert.equal(result.ledger[0].quizSkips[0].state,'uncertain');assert(result.ledger[0].uncertainSubmission);}
 if(['manual-text','manual-during','manual-choice','readonly','wrong-editor'].includes(mode)){assert.equal(result.counts.saves,0);assert.equal(result.counts.next,0);}
 if(['stop-model','change-mode','change-question','change-location','quiet-model','captcha-model','preview'].includes(mode)){assert.equal(result.counts.saves,0);assert.equal(result.counts.next,0);assert(result.values.every(value=>!value));}
 if(mode==='captcha-model')assert.equal(await page.locator('#ucode').inputValue(),'');
 if(mode.startsWith('result-')){assert.equal(result.counts.models,0);assert.equal(result.counts.saves,0);assert.equal(result.counts.submits,0);assert(result.ledger[0].reason.includes('50/100'));}
 if(mode==='stop-save'){
  assert.equal(result.counts.saves,1);assert.equal(result.counts.next,0);assert(result.records.some(record=>record.phase==='draft-save-clicked'));
  await page.locator('[data-action=start]').click();await page.waitForFunction(()=>__counts.next===1);assert.equal(await page.evaluate(()=>__counts.saves),1);
  assert(await page.evaluate(()=>Object.entries(__gm).filter(([key])=>key.startsWith('xxt-skipped:')).some(([,value])=>value[0].uncertainSubmission)));
 }
 if(mode==='default-save')await page.screenshot({path:resolve(out,'saved.png')});
 observations.push({mode,...result});await page.close();console.log('short-answer:',mode,'passed');
}
try{
 for(const mode of ['long-reading','default-save','saved-history','icon-feedback','submit','skip','missing-save','duplicate-save','disabled-save','missing-image','no-feedback','stale-feedback','stale-wrapper','stop-save','stop-model','change-mode','change-question','change-location','quiet-model','captcha-model','manual-text','manual-during','manual-choice','readonly','wrong-editor','no-ai-save','no-ai-skip','no-essay','result-save','result-skip','preview'])await run(mode);
}finally{
 await browser.close();await writeFile(resolve(out,'observations.json'),JSON.stringify({scope:'User DOM contract reproduced in isolation; simulated UE/API/toast/grades/navigation. Not actual course save, submit or grades.',observations},null,2));
}
console.log(`${observations.length} short-answer workflow scenarios passed.`);
