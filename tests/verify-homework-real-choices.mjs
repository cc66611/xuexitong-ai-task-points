import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from './browser-runtime.mjs';

// The two anonymized HTML fixtures retain the question and option markup
// supplied by the reporter. The enclosing form, model responses and platform
// click handlers below are simulated and must not be represented as live proof.
const root=resolve(import.meta.dirname,'..');
const fixtures=resolve(root,'tests/fixtures/homework');
const out=resolve(root,'output/playwright/homework-real-choices');
await mkdir(out,{recursive:true});
const [single,multiple,bundle]=await Promise.all([
  readFile(resolve(fixtures,'single-observed.html'),'utf8'),
  readFile(resolve(fixtures,'multiple-observed.html'),'utf8'),
  readFile(resolve(root,'dist/xuexitong-ai-assistant.user.js'),'utf8')
]);
const singles=Array.from({length:19},(_,i)=>single.replaceAll('91000001',String(91000001+i)).replace('题目 1.','题目 '+(i+1)+'.'));
const html=`<!doctype html><meta charset="utf-8"><style>body{margin:20px;font:16px sans-serif}.questionLi{padding:12px}.answerBg{display:block;height:40px;cursor:pointer}.num_option,.num_option_dx{display:inline-block;margin-right:12px}.check_answer,.check_answer_dx{background:#cdf}</style><div class="fanyaMarking"><form id="submitForm">${singles.join('')}${multiple}</form></div>`;
const baseline=process.env.XXT_EXPECT_BASELINE==='1';
const browser=await chromium.launch({channel:'chrome',headless:true});
const observations=[];
async function scenario(name,body){
 const ctx=await browser.newContext({viewport:{width:1280,height:900}});
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await ctx.route('**/*',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:html}));
 await page.goto('https://mooc1.chaoxing.com/mooc-ans/mooc2/work/dowork?courseId=fixture-course&classId=fixture-class&cpi=fixture-user&workId=fixture-work');
 await page.evaluate(()=>{
  window.unsafeWindow=window;document.hasFocus=()=>true;
  Object.defineProperty(document,'visibilityState',{get:()=> 'visible'});
  const config={provider:'custom',protocol:'chat',baseUrl:'https://model.synthetic.invalid/v1',model:'fixture-only',key:'fixture-only',maxTokens:8192,jsonMode:false,reasoning:''};
  window.__gm={'xxt-quiet-enabled':false,'xxt-ai-enabled':true,'xxt-ai-config':config,'xxt-purpose-schema':true};
  window.GM_getValue=(k,d)=>Object.hasOwn(__gm,k)?__gm[k]:d;
  window.GM_setValue=(k,v)=>__gm[k]=v;
  window.__counts={models:0,choice:0,save:0,submit:0};
  window.GM_xmlhttpRequest=spec=>{let canceled=false;__counts.models++;const timer=setTimeout(()=>{
    if(canceled)return;
    const payload=JSON.parse(spec.data),content=payload.messages[0].content,text=Array.isArray(content)?content[0].text:content;
    const questions=JSON.parse(text.split('\n题目：')[1].split('\n之前的平台反馈')[0]);
    const answers=questions.map(q=>({id:q.id,choices:q.type==='multiple'?['A','C']:['B'],readable:true,confidence:1,explanation:'模拟结果'}));
    spec.onload({status:200,responseText:JSON.stringify({choices:[{message:{content:JSON.stringify({answers})}}]})});
  },20);return{abort(){canceled=true;clearTimeout(timer);spec.onabort?.();}};};
  const key=row=>row.querySelector('.num_option,.num_option_dx').textContent.trim();
  const save=q=>{const rows=[...q.querySelectorAll('.answerBg')],v=rows.filter(x=>x.getAttribute('aria-checked')==='true').map(key).join('');q.querySelector('input[id^="answer"]:not([id^="answertype"])').value=v;};
  // These are test doubles; the reporter did not provide live click handlers.
  window.addChoice=row=>{__counts.choice++;const q=row.closest('.questionLi');for(const x of q.querySelectorAll('.answerBg')){x.setAttribute('aria-checked','false');x.querySelector('.num_option')?.classList.remove('check_answer');}row.setAttribute('aria-checked','true');row.querySelector('.num_option')?.classList.add('check_answer');save(q);};
  window.addMultipleChoice=row=>{__counts.choice++;const q=row.closest('.questionLi'),selected=row.getAttribute('aria-checked')==='true';row.setAttribute('aria-checked',String(!selected));row.querySelector('.num_option_dx').classList.toggle('check_answer_dx',!selected);save(q);};
 });
 await page.addScriptTag({content:bundle});
 await page.locator('[data-homework-modes]').waitFor();
 await page.locator('[data-choice-group="学习板块"][data-choice="homework"]').click();
 try{await body(page);assert.deepEqual(errors,[]);observations.push({name,passed:true});}finally{await ctx.close();}
}
const status=p=>p.locator('[data-xxt-codex-panel] pre').first();
try{
 await scenario(baseline?'old-build-reproduces-unsupported':'observed-single-and-multiple-parse',async p=>{
   const questions=await p.evaluate(()=>XxtHomeworkDom.scan(document).map(x=>x.question));
   assert.equal(questions.length,20);
   assert(questions.slice(0,19).every(q=>q.type==='single'&&q.options.map(o=>o.key).join('')==='ABCD'));
   if(baseline){
     assert.equal(questions[19].type,'unsupported');assert.deepEqual(questions[19].options.map(o=>o.key),['','','','']);
     await p.locator('[data-action=solve]').click();
     await p.waitForFunction(()=>document.querySelector('[data-xxt-codex-panel] pre').textContent.includes('有未适配题型'));
     assert.deepEqual(await p.evaluate(()=>__counts),{models:0,choice:0,save:0,submit:0});
   }else{
     assert.equal(questions[19].type,'multiple');assert.deepEqual(questions[19].options.map(o=>o.key),['A','B','C','D']);
     assert(questions[19].options.every(o=>o.text));
   }
 });
 if(!baseline){
  await scenario('preview-no-page-writes',async p=>{
   await p.locator('[data-action=solve]').click();
   await p.waitForFunction(()=>document.querySelector('[data-xxt-codex-panel] pre').textContent.includes('第20题'));
   const counts=await p.evaluate(()=>__counts);assert.equal(counts.models,2);assert.equal(counts.choice+counts.save+counts.submit,0);
   assert(await p.locator('input[id^="answer"]:not([id^="answertype"])').evaluateAll(xs=>xs.every(x=>x.value==='')));
  });
  await scenario('simulated-fill-does-not-save-or-submit',async p=>{
   await p.locator('[data-action=start]').click();
   await p.waitForFunction(()=>document.querySelector('[data-xxt-codex-panel] pre').textContent.startsWith('已填写'));
   assert.deepEqual(await p.evaluate(()=>__counts),{models:2,choice:21,save:0,submit:0});
   assert.equal(await p.locator('#answer91000020').inputValue(),'AC');
   assert.equal(await p.locator('#answer91000001').inputValue(),'B');
  });
  await scenario('existing-multiple-answer-preserved',async p=>{
   await p.locator('#question91000020 .answerBg').nth(1).click();
   await p.evaluate(()=>{__counts.choice=0;});
   await p.locator('[data-action=start]').click();
   await p.waitForFunction(()=>document.querySelector('[data-xxt-codex-panel] pre').textContent.includes('已有作答'));
   assert.equal(await p.locator('#answer91000020').inputValue(),'B');
   assert.deepEqual(await p.evaluate(()=>__counts),{models:2,choice:0,save:0,submit:0});
  });
  await scenario('unknown-choice-marker-stays-blocked',async p=>{
   await p.locator('#question91000020 .num_option_dx').first().evaluate(el=>el.classList.remove('num_option_dx'));
   await p.locator('[data-action=solve]').click();
   await p.waitForFunction(()=>document.querySelector('[data-xxt-codex-panel] pre').textContent.includes('有未适配题型'));
   assert.deepEqual(await p.evaluate(()=>__counts),{models:0,choice:0,save:0,submit:0});
  });
 }
 const report={baseline,observations,scope:'Real collected question-node structure with anonymized contents; enclosing page, option handlers, model responses, save and submit are simulated. No live course, platform click confirmation or grades.'};
 await writeFile(resolve(out,baseline?'baseline.json':'regression.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));
}finally{await browser.close();}
