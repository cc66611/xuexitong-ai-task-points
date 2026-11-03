import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url), C=require('../src/core.cjs'), R=require('../src/retry.cjs');
const items=['A','B','C'].map(key=>({key,text:'Content '+key}));
const ordering={id:'q1',type:'ordering',slots:3,options:[],items,text:'Sort these items'};
const result=(q,texts,confidence=1)=>({answers:[{id:q.id,texts,choices:[],readable:true,confidence,explanation:''}]});
test('ordered answers preserve their full permutation and never sort into alphabetical order',()=>{
 assert.deepEqual(C.validateAnswers([ordering],result(ordering,['C','A','B']))[0].texts,['C','A','B']);
 for(const value of [['A','B'],['A','A','B'],['A','B','Z']])assert.throws(()=>C.validateAnswers([ordering],result(ordering,value)));
});
test('matching keeps left-side position, allows repeated right items, rejects invalid keys',()=>{
 const q={...ordering,type:'matching',slots:2,prompts:[{key:'1',text:'left one'},{key:'2',text:'left two'}]};
 assert.deepEqual(C.validateAnswers([q],result(q,['B','B']))[0].texts,['B','B']);
 assert.throws(()=>C.validateAnswers([q],result(q,['B','Z'])));
});
test('uncertain structured answers cannot be randomized',()=>{
 assert.throws(()=>C.resolveAnswers([ordering],result(ordering,['C','A','B'],.3),{randomizeUncertain:true}),/无法可靠确认/);
});
test('duplicate project ids or incomplete structured mappings are rejected',()=>{
 assert.throws(()=>C.validateQuestions([{...ordering,items:[items[0],items[0],items[2]]}]));
 assert.throws(()=>C.validateQuestions([{...ordering,slots:2}]));
});
test('retry comparisons retain order and do not invent a permutation',()=>{
 const a=result(ordering,['C','A','B']).answers,b=result(ordering,['A','C','B']).answers;
 assert.notEqual(R.batchKey([ordering],a),R.batchKey([ordering],b));
 assert.equal(R.novel([ordering],a,[a]).exhausted,true);
 assert.deepEqual(R.novel([ordering],b,[a]).answers,b);
});
test('missing uncertain text is explicit and never becomes writable or randomized',()=>{
 const q={id:'blank',type:'blank',slots:2,options:[],text:'Two blanks'},answer={id:q.id,texts:[],choices:[],readable:false,confidence:0,explanation:'Cannot read image'};
 assert.deepEqual(C.validateAnswers([q],{answers:[answer]},{allowUncertain:true})[0].texts,[]);
 assert.throws(()=>C.validateAnswers([q],{answers:[answer]}),/无法可靠识别/);
 assert.throws(()=>C.resolveAnswers([q],{answers:[answer]},{randomizeUncertain:true}),/未返回可填写/);
 for(const bad of [{...answer,readable:true,confidence:1},{...answer,texts:['']},{...answer,texts:['partial']}])assert.throws(()=>C.validateAnswers([q],{answers:[bad]},{allowUncertain:true}),error=>error.code==='MODEL_TEXT_ANSWER_INVALID');
});
