import {test} from 'node:test';
import assert from 'node:assert/strict';
import H from '../src/homework.cjs';
const qs=[{id:'q1',number:'1',type:'single',text:'fixture',options:[{key:'A'},{key:'B'}]},{id:'q2',number:'2',type:'essay',slots:1,text:'fixture essay',options:[]}];
const answers=[{id:'q1',choices:['A'],readable:true,confidence:1},{id:'q2',texts:['示例文字'],readable:true,confidence:1}];
const fixture=(options={})=>{
 let current=structuredClone(options.current||[]),identity='fixture-1',questions=structuredClone(qs),policy=H.normalize({mode:'homework',...options.policy});
 const calls=[],events=[],writes=[],finishes=[];
 const adapter={verified:true,scan:()=>({identity,questions}),read:()=>structuredClone(current),policy:()=>policy,
  assertCurrent:()=>{if(options.blocked?.())throw Error('人工验证或夜间休息，操作保持暂停');},
  apply:async(page,next,guard)=>{guard();writes.push(next);current=structuredClone(next);},
  finish:async(kind,{guard})=>{guard();finishes.push(kind);return {state:options.finishState||'confirmed'};}};
 const c=H.createController({adapter,ask:async payload=>{calls.push(payload);return options.ask?options.ask(payload):{answers:structuredClone(answers).filter(a=>payload.questions.some(q=>q.id===a.id))};},notify:m=>events.push(m)});
 return {c,adapter,calls,events,writes,finishes,policy:()=>policy,setPolicy:p=>{policy=H.normalize({...policy,...p});},edit:v=>{current=v;},move:()=>{identity='fixture-2';},changeQuestions:()=>{questions[0].text='changed';}};
};
test('default chapter/skip/no action and invalid state normalization',()=>{assert.deepEqual(H.normalize(),{mode:'chapter',subjective:'skip',after:'none'});assert.equal(H.normalize({mode:'exam'}).mode,'chapter');assert.equal(H.normalize({subjective:'skip',after:'submit'}).after,'none');});
test('AI essay is required for submit; switching back normalizes to none',()=>{assert.equal(H.normalize({subjective:'ai',after:'submit'}).after,'submit');assert.equal(H.normalize({subjective:'skip',after:'save'}).after,'save');});
test('choice comparison ignores order, preserves duplicate/missing as unavailable',()=>{const q={id:'m',type:'multiple',options:[{key:'A'},{key:'B'}]};assert.deepEqual(H.compare([q],[{id:'m',choices:['A','B']}],[{id:'m',choices:['B','A']}]).same,['m']);assert.deepEqual(H.compare([q],[],[]).unavailable,['m']);assert.deepEqual(H.compare([q],[{id:'m',choices:['A']}],[{id:'m',choices:['A','A']}]).unavailable,['m']);});
test('text normalizes whitespace without treating different prose as correct',()=>{const q=qs[1];assert.deepEqual(H.compare([q],[{id:'q2',texts:[' A\n B ']}],[{id:'q2',texts:['A B']}]).same,['q2']);assert.deepEqual(H.compare([q],[{id:'q2',texts:['甲']}],[{id:'q2',texts:['乙']}]).different,['q2']);});
test('default fills only objective questions and never finishes',async()=>{const f=fixture();const r=await f.c.run(f.policy());assert.deepEqual(r.filled,['q1']);assert.deepEqual(r.skipped,['q2']);assert.equal(f.finishes.length,0);assert.equal(f.calls[0].questions.length,1);});
test('configured save uses save only after write verification',async()=>{const f=fixture({policy:{after:'save'}});await f.c.run(f.policy());assert.deepEqual(f.finishes,['save']);});
test('configured AI plus submit fills both and submits once',async()=>{const f=fixture({policy:{subjective:'ai',after:'submit'}});await f.c.run(f.policy());assert.deepEqual(f.finishes,['submit']);assert.equal(f.writes[0].length,2);});
test('repeated review makes fresh requests without old-answer hints and never writes',async()=>{const f=fixture({current:answers,policy:{subjective:'ai'},ask:async p=>({answers:p.questions.map(q=>q.id==='q1'?{...answers[0],choices:['B']}:answers[1])})});const r1=await f.c.review(f.policy()),r2=await f.c.review(f.policy());assert.equal(r2.round,2);assert.deepEqual(r1.different,['q1']);assert.deepEqual(r1.same,['q2']);assert.equal(f.calls.length,2);assert.equal('history' in f.calls[0],false);assert.equal('current' in f.calls[0],false);assert.equal(f.writes.length+f.finishes.length,0);});
test('review with no existing answer is unavailable rather than consistent',async()=>{const f=fixture();assert.deepEqual((await f.c.review(f.policy())).unavailable,['q1']);});
test('manual edit while request runs is retained',async()=>{let f;f=fixture({ask:async()=>{f.edit([{id:'q1',choices:['B']}]);return {answers};}});await assert.rejects(f.c.run(f.policy()),/内容.*变化/);assert.equal(f.writes.length,0);});
test('stop discards delayed answer',async()=>{let f;f=fixture({ask:async()=>{f.c.cancel();return{answers};}});await assert.rejects(f.c.run(f.policy()),/已停止/);assert.equal(f.writes.length+f.finishes.length,0);});
test('navigation discards answer',async()=>{let f;f=fixture({ask:async()=>{f.move();return{answers};}});await assert.rejects(f.c.run(f.policy()),/作业或题目已变化/);assert.equal(f.writes.length,0);});
test('question changes discard answer',async()=>{let f;f=fixture({ask:async()=>{f.changeQuestions();return{answers};}});await assert.rejects(f.c.run(f.policy()),/作业或题目已变化/);});
test('policy changes discard answer',async()=>{let f;f=fixture({ask:async()=>{f.setPolicy({subjective:'ai'});return{answers};}});await assert.rejects(f.c.run(f.policy()),/设置已变化/);});
test('manual verification or rest prevents calls and writes',async()=>{const f=fixture({blocked:()=>true});await assert.rejects(f.c.run(f.policy()),/人工验证/);assert.equal(f.calls.length+f.writes.length,0);});
test('unverified adapter refuses live operations',async()=>{const f=fixture();f.adapter.verified=false;await assert.rejects(f.c.run(f.policy()),/尚未适配/);assert.equal(f.calls.length,0);});
test('unconfirmed finish is not retried within a run',async()=>{const f=fixture({policy:{subjective:'ai',after:'submit'},finishState:'unknown'});await assert.rejects(f.c.run(f.policy()),/结果未确认/);assert.deepEqual(f.finishes,['submit']);});
test('unknown submission blocks another run, including changing policy to save',async()=>{const f=fixture({policy:{subjective:'ai',after:'submit'},finishState:'unknown'});await assert.rejects(f.c.run(f.policy()),/结果未确认/);f.setPolicy({after:'save'});await assert.rejects(f.c.run(f.policy()),/已发起过提交/);assert.deepEqual(f.finishes,['submit']);assert.equal(f.writes.length,1);});
test('chapter mode cannot invoke homework controller',async()=>{const f=fixture({policy:{mode:'chapter'}});await assert.rejects(f.c.run(f.policy()),/先切换到作业/);assert.equal(f.calls.length,0);});
test('invalid or unreadable AI answers cannot be filled or submitted',async()=>{const f=fixture({policy:{subjective:'ai',after:'submit'},ask:async()=>({answers:[{...answers[0],readable:false},answers[1]]})});await assert.rejects(f.c.run(f.policy()),/没有可用答案/);assert.equal(f.writes.length+f.finishes.length,0);});
test('missing text reports its question and prevents all writes or submission',async()=>{const f=fixture({policy:{subjective:'ai',after:'submit'},ask:async()=>({answers:[answers[0],{...answers[1],texts:[],readable:false,confidence:0}]})});await assert.rejects(f.c.run(f.policy()),/第2题模型未能给出可填写/);assert.equal(f.writes.length+f.finishes.length,0);});
