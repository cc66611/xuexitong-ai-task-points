import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const api = require('../src/short-answer.js');
const core = require('../src/core.cjs'), dispatch=require('../src/dispatch.cjs'), saved=require('../src/saved-quizzes.cjs');
test('short-answer mode defaults to saving for absent, old or malformed preferences', () => {
    for (const value of [undefined, null, false, '', 'ai', {}, 1]) assert.equal(api.normalize(value), 'save');
});
test('explicit short-answer choices are retained', () => {
    for (const mode of ['submit', 'save', 'skip']) assert.equal(api.normalize(mode), mode);
});
test('long reading is complete, bounded and retained as context across sibling batches',()=>{
    const text='阅'.repeat(13533)+'终';
    const q={id:'reading',type:'essay',text,slots:1,options:[]};
    assert.equal(core.validateQuestions([q])[0].text,text);
    assert.throws(()=>core.validateQuestions([{...q,text:'长'.repeat(64001)}]),/reading.*64001.*64000/);
    assert.throws(()=>core.validateQuestions([{...q,text:4}]),/格式异常/);
    const parts=dispatch.batches({questions:[q,...Array.from({length:17},(_,i)=>({id:'q'+i,type:'boolean',text:'阅读后判断',options:[{key:'A',text:'对'},{key:'B',text:'错'}]}))]});
    assert(parts.length>=2);assert.equal(parts[0].questions[0].text,text);
    for(const part of parts.slice(1))assert.equal(part.contextQuestions[0].text,text);
    assert.equal(parts.flatMap(p=>p.questions).length,18);
    assert.throws(()=>core.validateContext([{id:'r',text:'长'.repeat(64001)}]),/阅读材料/);
});
test('saved migration removes only confirmed saves, retaining unrelated failures and scopes',()=>{
    const savedQuiz={state:'saved',reason:'已确认保存成功',total:18,quizKey:'work:1',at:2};
    const failed={state:'uncertain',reason:'保存结果不明'};
    const base={scope:'mine',index:0,title:'章节',chapter:'章节',reason:'已确认保存成功',quizSkips:[savedQuiz]};
    const pure=saved.migrate([base],[],'mine');assert.equal(pure.skipped.length,0);assert.equal(pure.saved.length,1);
    assert.equal(saved.migrate(pure.skipped,pure.saved,'mine').changed,false);
    const foreign={...base,scope:'other'};
    const mixed=saved.migrate([{...base,reason:'其他失败；已确认保存成功；保存结果不明',quizSkips:[savedQuiz,failed]},foreign],[],'mine');
    assert.equal(mixed.skipped.length,2);assert.deepEqual(mixed.skipped[0].quizSkips,[failed]);assert.equal(mixed.skipped[0].reason,'其他失败；保存结果不明');assert.deepEqual(mixed.skipped[1],foreign);
    assert.equal(saved.upsert(pure.saved,{...pure.saved[0],at:3}).length,1);
    assert.equal(saved.upsert(pure.saved,{...pure.saved[0],quizKey:'work:2'}).length,2);
});
test('answer language follows explicit translation target before English question heuristics',()=>{
 const q=text=>({id:'q1',type:'essay',text,options:[],slots:1});
 for(const text of ['【论述题】Compare the two rules on the obligations of the carrier.','【简答题】What can you infer from this case?','请用英语回答这个问题。','Translate the following passage into English.'])assert.equal(core.answerLanguage(q(text)),'en');
 for(const text of ['Explain the passage. Answer in Chinese.','【请用中文回答】Explain why the contract was disputed.','请把以下英语段落翻译成中文。','请说明你的理由。'])assert.equal(core.answerLanguage(q(text)),'zh');
 assert.deepEqual(core.answerLanguageMismatches([q('What can you infer from this case?')],[{id:'q1',texts:['该案例说明双方应当明确约定合同中的货物标准。'],explanation:'中文解释'}]),['q1']);
 assert.deepEqual(core.answerLanguageMismatches([q('What can you infer from this case?')],[{id:'q1',texts:['The parties should define the goods precisely.'],explanation:'中文解释'}]),[]);
 assert.deepEqual(core.answerLanguageMismatches([q('Translate the following passage into Chinese.')],[{id:'q1',texts:['双方应当明确约定货物标准。']}]),[]);
});
test('English language correction is bounded and cancellation prevents a second call',async()=>{
 const questions=[{id:'en',type:'essay',text:'What can you infer from this case?',slots:1,options:[]}];
 let calls=[];const bad={answers:[{id:'en',texts:['这里应该是英文答案却返回了中文内容'],choices:[]}]},good={answers:[{id:'en',texts:['The parties should agree on clear terms.'],choices:[]}]};
 const fixed=await dispatch.run({questions},{base:{},transport:(_,path,payload)=>{calls.push(payload);return{promise:Promise.resolve(calls.length===1?bad:good),abort(){}};}}).promise;
 assert.equal(calls.length,2);assert.equal(calls[1].languageCorrection,true);assert.equal(fixed.answers[0].texts[0],good.answers[0].texts[0]);
 calls=[];await assert.rejects(dispatch.run({questions},{base:{},transport:(_,path,payload)=>{calls.push(payload);return{promise:Promise.resolve(bad),abort(){}};}}).promise,/纠正一次/);assert.equal(calls.length,2);
 let resolveFirst,aborted=0,n=0;const job=dispatch.run({questions},{base:{},transport:()=>{n++;return{promise:new Promise(r=>resolveFirst=r),abort(){aborted++;}};}});job.abort();resolveFirst(bad);await assert.rejects(job.promise,/已停止/);assert.equal(n,1);assert.equal(aborted,1);
});
