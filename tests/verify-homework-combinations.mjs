import {chromium} from './browser-runtime.mjs';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),bundle=await readFile(new URL('dist/xuexitong-task-points-only.user.js',root),'utf8');
const blank=(parent,sub)=>`<div class="reading_answer" itemid="child${sub}" data="${parent}child${sub}" qtype="2"><div class="reader_answer_tit"><span class="read_type">(填空题)</span>Child ${sub}: give the requested value</div><div class="stem_answer2"><div class="Answer"><div class="textDIV"><iframe id="ueditor_${parent}_${sub}"></iframe><textarea style="display:none" id="answerEditor${parent}child${sub}1"></textarea></div></div></div></div>`;
const parent=id=>`<div class="questionLi singleQuesId" id="question${id}"><h3 aria-hidden="true" class="mark_name">${id}.<span class="colorShallow">(组合题)</span>Shared maze ${id}<img alt="shared diagram"></h3><div class="readComprehensionQues"><div class="reading_answer" itemid="child1" data="${id}child1" qtype="0"><div class="reader_answer_tit"><span class="read_type">(单选题)</span>Is there a path?</div><input type="hidden" id="answer${id}child1"><div class="stem_answer">${['A','B'].map(k=>`<div class="hoverDiv" onclick="addChoice(this);"><span class="num_option" data="${k}">${k}</span><div class="answer_p">${k==='A'?'Yes':'No'}</div></div>`).join('')}</div></div>${blank(id,2)}${blank(id,3)}</div></div>`;
const html=`<style>body{font:16px sans-serif}.questionLi{width:720px;padding:12px}img{width:50px;height:30px}.hoverDiv{height:30px}iframe{width:650px;height:60px}</style><div class="fanyaMarking TiMu"><form id="submitForm">${parent(101)}${parent(102)}</form></div><div class="subNav"><div id="submitFocus"><a>暂时保存</a><a class="completeBtn" role="button">提交</a></div></div>`;
const browser=await chromium.launch({headless:true}),observations=[];
async function scenario(name,options,check){
 const context=await browser.newContext({viewport:{width:1400,height:1000}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await context.route('**/*',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:html}));
  await page.goto(`https://mooc1.chaoxing.com/mooc-ans/${options.old?'work/doHomeWorkNew':'mooc2/work/dowork'}?courseId=fixture&workId=combined&answerId=attempt`);
  await page.evaluate(async options=>{
   window.unsafeWindow=window;document.hasFocus=()=>true;Object.defineProperty(document,'visibilityState',{get:()=> 'visible'});
   const config={provider:'codex',protocol:'codex',baseUrl:'http://127.0.0.1:18763',key:'f'.repeat(64)};
   window.__gm={'xxt-quiet-enabled':false,'xxt-ai-enabled':true,'xxt-ai-config':config,'xxt-ai-vision-enabled':true,'xxt-ai-vision-config':config,'xxt-homework-settings':{mode:options.chapter?'chapter':'homework',after:'none',subjective:'skip'}};
   window.GM_getValue=(k,d)=>Object.hasOwn(__gm,k)?__gm[k]:d;window.GM_setValue=(k,v)=>__gm[k]=v;
   window.__counts={model:0,choice:0,write:0,save:0,submit:0};window.__payloads=[];window.__captures=[];
   window.GM_xmlhttpRequest=spec=>{const payload=JSON.parse(spec.data||'{}');__counts.model++;__payloads.push(payload);const timer=setTimeout(()=>spec.onload({status:200,responseText:JSON.stringify({answers:(payload.questions||[]).map(q=>({id:q.id,choices:q.type==='single'?['A']:[],...(q.type==='blank'?{texts:[q.id.endsWith('sub2')?'(1,1)→(1,2)':'8']}:{}),readable:true,confidence:1,explanation:'Synthetic model only'}))})}),options.slow?450:10);return{abort(){clearTimeout(timer);spec.onabort?.();}};};
   const canvas=document.createElement('canvas');canvas.width=50;canvas.height=30;const ctx=canvas.getContext('2d');ctx.fillStyle='#c00';ctx.fillRect(0,0,50,30);window.__image=canvas.toDataURL();
   for(const img of document.querySelectorAll('img')){img.src=__image;await img.decode();}
   window.UE={instants:{}};
   for(const field of document.querySelectorAll('textarea')){const frame=field.parentElement.querySelector('iframe'),body=frame.contentDocument.body;body.contentEditable='true';body.innerHTML='<p><br></p>';UE.instants[field.id]={key:field.id,textarea:field,iframe:frame,body,isReady:false,setContent(v){__counts.write++;this.body.innerHTML=v;},getContent(){return this.body.innerHTML;},fireEvent(){},sync(){if(!options.noSync)field.value=this.body.innerHTML;}};}
   window.addChoice=row=>{__counts.choice++;if(options.noMarker)return;for(const other of row.parentElement.children)other.querySelector('.num_option').classList.remove('check_answer');const marker=row.querySelector('.num_option');marker.classList.add('check_answer');if(!options.noHidden)row.closest('.reading_answer').querySelector('input[type=hidden]').value=marker.getAttribute('data');};
   for(const b of document.querySelectorAll('#submitFocus a'))b.onclick=()=>__counts[b.classList.contains('completeBtn')?'submit':'save']++;
   if(options.draft)Object.values(UE.instants)[2].body.textContent='Manual draft must survive';
   if(options.savedDraft)document.querySelector('textarea').value='<p>Saved draft must survive</p>';
   if(options.mismatch){document.querySelector('textarea').value='<p>Saved draft</p>';Object.values(UE.instants)[0].body.textContent='Different visible draft';}
   if(options.missingField)document.querySelector('input[type=hidden]').remove();
  },options);
  await page.addScriptTag({content:bundle});
  await page.locator('[aria-label="学习助手作业面板"]').waitFor();
  await page.evaluate(options=>{
   const record=element=>__captures.push({id:element.id,shared:element.querySelector('h3')?.textContent,images:element.querySelectorAll('h3 img').length,editors:element.querySelectorAll('.stem_answer2,input,textarea,.check_answer').length});
   if(!options.realCapture)XxtQuestionCapture.capture=async(element,{sanitizeClone})=>{const clone=element.cloneNode(true);sanitizeClone?.(clone);record(clone);return __image;};
   else{const render=window.html2canvas;window.html2canvas=(element,options)=>render(element,{...options,onclone:async(doc,clone)=>{await options.onclone?.(doc,clone);record(clone);}});}
  },options);
  await check(page);assert.deepEqual(errors,[]);observations.push({name,passed:true});
 }finally{await context.close();}
}
const status=page=>page.locator('.xxt-status-card pre');
const completed=page=>page.waitForFunction(()=>document.querySelector('.xxt-status-card pre').textContent.startsWith('已填写'));
try{
 for(const old of [false,true])await scenario(old?'old-address-combinations':'new-address-combinations',{old},async page=>{
  const qs=await page.evaluate(()=>XxtHomeworkDom.scan(document).map(e=>e.question));assert.deepEqual(qs.map(q=>q.type),['single','blank','blank','single','blank','blank']);assert.equal(new Set(qs.map(q=>q.id)).size,6);assert(qs.every(q=>q.requiresVision&&q.imageKey));assert(qs.slice(0,3).every(q=>q.text.includes('Shared maze 101')&&!q.text.includes('Shared maze 102')));
  await page.locator('[data-action=start]').click();await completed(page);
  const result=await page.evaluate(()=>({counts:__counts,answers:XxtHomeworkDom.scan(document).map(XxtHomeworkDom.readEntry),captures:__captures,payloads:__payloads}));
  assert.deepEqual(result.counts,{model:1,choice:2,write:4,save:0,submit:0});assert.equal(result.captures.length,6);assert(result.captures.every(c=>c.images===1&&c.editors===0&&c.id.startsWith('question')));assert.equal(result.payloads[0].imageManifest.flatMap(m=>m.questionIds).length,6);assert.deepEqual(result.answers[1].texts,['(1,1)→(1,2)']);assert.deepEqual(result.answers[0].choices,['A']);
 });
 await scenario('preview-retains-shared-images-no-write',{},async page=>{await page.locator('[data-action=solve]').click();await page.waitForFunction(()=>document.querySelector('.xxt-status-card pre').textContent.startsWith('第101.1题：'));assert.deepEqual(await page.evaluate(()=>[__counts.choice,__counts.write,__counts.save,__counts.submit]),[0,0,0,0]);assert.equal(await page.evaluate(()=>__captures.length),6);});
 await scenario('chapter-mode-has-visible-guidance',{chapter:true},async page=>{await page.locator('[data-action=start]').click();assert.match(await status(page).textContent(),/这是独立作业页/);assert.equal(await page.evaluate(()=>__counts.model),0);});
 await scenario('existing-rich-draft-prevents-all-writes',{draft:true},async page=>{await page.locator('[data-action=start]').click();await page.waitForFunction(()=>document.querySelector('.xxt-status-card pre').textContent.includes('已有作答'));assert.deepEqual(await page.evaluate(()=>[__counts.choice,__counts.write,__counts.save,__counts.submit]),[0,0,0,0]);assert(!JSON.stringify(await page.evaluate(()=>__payloads)).includes('Manual draft'));});
 await scenario('saved-rich-draft-prevents-all-writes',{savedDraft:true},async page=>{await page.locator('[data-action=start]').click();await page.waitForFunction(()=>document.querySelector('.xxt-status-card pre').textContent.includes('已有作答'));assert.equal(await page.evaluate(()=>__counts.choice+__counts.write),0);});
 await scenario('conflicting-editor-state-stops-before-model',{mismatch:true},async page=>{await page.locator('[data-action=start]').click();await page.waitForFunction(()=>document.querySelector('.xxt-status-card pre').textContent.includes('编辑器显示与保存字段不一致'));assert.equal(await page.evaluate(()=>__counts.model+__counts.choice+__counts.write),0);});
 await scenario('real-capture-excludes-editors-retains-diagrams',{realCapture:true,draft:true},async page=>{await page.locator('[data-action=solve]').click();await page.waitForFunction(()=>document.querySelector('.xxt-status-card pre').textContent.startsWith('第101.1题：'));const captures=await page.evaluate(()=>__captures);assert.equal(captures.length,6);assert(captures.every(c=>c.images===1&&c.editors===0));assert.equal(await page.evaluate(()=>__counts.choice+__counts.write+__counts.save+__counts.submit),0);});
 for(const [option,message]of [['noHidden','显示与保存字段不一致'],['noMarker','未正确选中'],['noSync','未同步']])await scenario('mismatched-'+option,{[option]:true},async page=>{await page.locator('[data-action=start]').click();await page.waitForFunction(text=>document.querySelector('.xxt-status-card pre').textContent.includes(text),message);assert.deepEqual(await page.evaluate(()=>[__counts.save,__counts.submit]),[0,0]);});
 await scenario('unmapped-combination-stops-before-model',{missingField:true},async page=>{await page.locator('[data-action=start]').click();await page.waitForFunction(()=>document.querySelector('.xxt-status-card pre').textContent.includes('未适配题型'));assert.equal(await page.evaluate(()=>__counts.model+__counts.choice+__counts.write),0);});
 await scenario('late-manual-edit-preserved',{slow:true},async page=>{await page.locator('[data-action=start]').click();await page.waitForFunction(()=>__counts.model>0);await page.evaluate(()=>Object.values(UE.instants)[0].body.textContent='Changed while waiting');await page.waitForFunction(()=>document.querySelector('.xxt-status-card pre').textContent.includes('作答内容在请求期间变化'));assert.equal(await page.evaluate(()=>__counts.choice+__counts.write),0);});
 await mkdir(new URL('artifacts/homework-combinations/',root),{recursive:true});await writeFile(new URL('artifacts/homework-combinations/observations.json',root),JSON.stringify({scope:'Synthetic combined-question DOM, model and UEditor only. No real course writes or submissions.',observations},null,2));console.log(`${observations.length} combined-homework scenarios passed.`);
}finally{await browser.close();}
