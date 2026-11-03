import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url), G=require('../src/discussion.js'), C=require('../src/core.cjs');
const response=(answer,extra={})=>({readable:true,confidence:1,texts:[JSON.stringify({action:'answer',answer,reason:'按话题完整回答',requirement:'无',suitableMax:500,...extra})]});
test('discussion defaults to AI and adaptive short while preserving explicit saved skip',()=>{
 assert.equal(G.settings().mode,'ai');assert.equal(G.settings({mode:'skip'}).mode,'skip');
 assert.equal(G.limits({}).min,1);assert.equal(G.limits({}).max,800);assert.equal(G.limits({}).label,'简短作答');
});
test('strict 500 and approximate 500 have explicit, different acceptance bounds',()=>{
 const base={length:'custom',words:'500'};assert.equal(G.limits({...base,precision:'strict'}).min,500);assert.equal(G.limits({...base,precision:'strict'}).max,500);
 assert.equal(G.limits(base).min,450);assert.equal(G.limits(base).max,550);assert.equal(G.limits({length:'detail'}).min,1);
});
test('reject empty, fractional, negative, unbounded and nonnumeric custom count',()=>{
 for(const words of ['','0','-5','1.5','500字','3001','Infinity'])assert.throws(()=>G.limits({length:'custom',words}));
});
test('count Unicode codepoints including punctuation, exclude whitespace and normalize accents',()=>{
 assert.equal(G.count('中 A，\n😀 e\u0301'),5);
});
test('short and detailed answers have no fixed fifty/two hundred target and default cap is 800',()=>{
 for(const length of ['short','detail']){
  assert.equal(G.decision(response('可以。'),{length}).state,'answer');
  assert.equal(G.decision(response('学'.repeat(350)),{length}).state,'answer');
  assert.equal(G.decision(response('学'.repeat(801)),{length}).state,'rewrite');
 }
});
test('strict exact count locally verified without truncation',()=>{
 const c={length:'custom',words:'500',precision:'strict'};
 assert.equal(G.decision(response('学'.repeat(500)),c).state,'answer');assert.equal(G.decision(response('学'.repeat(499)),c).state,'rewrite');
});
test('ordinary topic simplicity or length mismatch cannot directly become a skip',()=>{
 const c={length:'custom',words:'500',precision:'strict'};
 const result=G.decision(response('',{action:'skip',reason:'只需回答是否，长文不合适',suitableMax:10,requirement:'50字以内'}),c);
 assert.equal(result.state,'rewrite');for(const text of ['500','是否'])assert(result.reason.includes(text));
 assert.equal(G.decision(response('学'.repeat(500),{suitableMax:20}),c).state,'answer');
});

test('teacher lower upper range approximate Chinese and fullwidth requirements are parsed independently of AI',()=>{
 for(const [body,min,max] of [['至少300字',300,Infinity],['不超过300字',1,300],['不低于300字',300,Infinity],['少于300字',1,299],['300字以上',300,Infinity],['300字以下',1,300],['请写300—500字',300,500],['请用五百字左右说明',450,550],['请写５００字',500,500]]){
  const r=G.requirements({body});assert.equal(r.found,true,body);assert.equal(r.min,min,body);assert.equal(r.max,max,body);
 }
 assert.equal(G.requirements({body:'简述这个问题，比较50年前和200年前的变化。'}).found,false);
});

test('short and detailed obey explicit teacher constraints including more than 800',()=>{
 for(const length of ['short','detail']){
  assert.equal(G.decision(response('学'.repeat(500)),{length},{body:'请写500字。'}).state,'answer');
  assert.equal(G.decision(response('学'.repeat(900)),{length},{body:'至少900字'}).state,'answer');
  assert.equal(G.decision(response('学'.repeat(100)),{length},{body:'50字以内'}).state,'rewrite');
 }
});

test('teacher wins custom conflicts and only real overrides get adjustment records',()=>{
 const strict={length:'custom',precision:'strict',words:'500'};
 const rule=G.limits(strict,{body:'至少600字'});assert.equal(rule.min,600);assert(rule.adjustment.includes('优先老师'));
 assert.equal(G.decision(response('学'.repeat(600)),strict,{body:'至少600字'}).state,'answer');
 assert.equal(G.limits(strict,{body:'至少400字'}).min,500);assert.equal(G.limits(strict,{body:'至少400字'}).adjustment,'');
 assert.equal(G.limits(strict,{body:'50字以内'}).max,50);
});

test('exceptional length skips require explicit category exceptional flag and more than tenfold disparity',()=>{
 const c={length:'custom',precision:'strict',words:'3000'};
 assert.equal(G.decision(response('',{action:'skip',skipKind:'extreme-length',exceptional:true,suitableMax:10}),c).state,'skipped');
 assert.equal(G.decision(response('',{action:'skip',skipKind:'extreme-length',exceptional:true,suitableMax:500}),c).state,'rewrite');
 assert.equal(G.decision(response('',{action:'skip',skipKind:'extreme-length',exceptional:false,suitableMax:10}),c).state,'rewrite');
});

test('question image routing and teacher source URLs stay separate from model prompt',()=>{
 const q=G.question({title:'图形题',body:'辨别四图',imageSources:['https://images.synthetic.invalid/private?token=redacted']},{length:'short'});
 assert.equal(q.requiresVision,true);assert(q.text.includes('原帖图片1张'));assert(!q.text.includes('private?token'));
 assert(!q.text.includes('有效范围1—50'));assert(!q.text.includes('大约200字'));
});
test('invalid/unreliable decision cannot become a post',()=>{
 for(const answer of [{readable:false,confidence:1},response('text',{reason:''}),response('text',{suitableMax:'50'}),response('text',{answer:'```代码```'})])assert.throws(()=>G.decision(answer,{}));
 assert.throws(()=>G.decision({...response('是'),texts:['普通散文']},{}));
});
test('discussion URL validates exact platform host, route and course/class; removes lease query',()=>{
 const valid='https://groupweb.chaoxing.com/course/topic/v3/bbs/synthetic/topic1/replysList?courseId=course1&classId=class1';
 assert.equal(G.topicUrl(valid+'&xxtDiscussion=lease').href,G.topicUrl(valid).href);
 for(const bad of [valid.replace('https:','http:'),valid.replace('groupweb.chaoxing.com','groupweb.chaoxing.com.evil.invalid'),valid.replace('/replysList','/delete'),valid.replace('&classId=class1',''),valid+'#fragment',valid.replace('https://','https://user:pass@')])assert.equal(G.topicUrl(bad),null);
});
test('discussion task remains compatible with existing ordinary essay API and local bridge schema',()=>{
 const q=G.question({title:'合成话题',body:'请解释一种学习方法。'},{length:'detail'});
 C.validateQuestions([q]);assert.equal(C.validateAnswers([q],{answers:[{id:q.id,...response('学'.repeat(200)),choices:[],explanation:'fixture'}]})[0].id,'discussion');
 assert(q.text.includes('数据'));assert(q.text.includes('不捏造'));
});
