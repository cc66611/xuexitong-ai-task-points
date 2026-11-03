import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from './browser-runtime.mjs';
const root=resolve(import.meta.dirname,'..'),samples=resolve(root,'tests/fixtures/homework'),out=resolve(root,'output/playwright/homework');
await mkdir(out,{recursive:true});
const names=['boolean.html','calculation.html','editor-body.html','save.html','submit.html'];
const data=await Promise.all(names.map(async n=>({html:{value:await readFile(resolve(samples,n),'utf8'),truncated:false}})));
assert(data.every(d=>!d.html.truncated));
const code=await readFile(resolve(root,'src/homework-dom.js'),'utf8');
const metadata=await readFile(resolve(root,'tools/inspect-homework-runtime.js'),'utf8');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();
 await page.setContent(`<div class="subNav"><div id="submitFocus">${data[3].html.value}${data[4].html.value}</div></div><div class="fanyaMarking TiMu"><form id="submitForm">${data[0].html.value}${data[1].html.value}</form></div>`);
 await page.addScriptTag({content:code});
 const got=await page.evaluate(()=>({questions:XxtHomeworkDom.scan(document).map(e=>({question:e.question,rows:e.rows.length,fields:e.fields.map(f=>f.id),frames:e.frames.map(f=>f.id)})),buttons:Object.fromEntries(Object.entries(XxtHomeworkDom.buttons(document)).map(([k,v])=>[k,v?.textContent]))}));
 assert.equal(got.questions.length,2);assert.equal(got.questions[0].question.type,'boolean');assert.deepEqual(got.questions[0].question.options,[{key:'A',text:'对'},{key:'B',text:'错'}]);assert.equal(got.questions[0].question.requiresVision,true);
 assert.equal(got.questions[1].question.type,'essay');assert.equal(got.questions[1].question.number,'16');assert.equal(got.questions[1].fields.length,1);assert.equal(got.questions[1].frames.length,1);assert.equal(got.questions[1].question.slots,1);
 assert.deepEqual(got.buttons,{save:'暂时保存',submit:'提交'});
 const before=await page.locator('body').innerHTML();
 const details=await page.evaluate(code=>{window.copy=v=>window.__result=v;eval(code);return JSON.parse(window.__result);},metadata);
 assert.equal(await page.locator('body').innerHTML(),before);assert.equal(details.editors.length,1);assert.equal(details.choices.length,1);assert.equal(details.registered.length,0);
 await page.locator('#submitFocus').evaluate(e=>e.append(e.firstElementChild.cloneNode(true)));
 assert.equal(await page.evaluate(()=>XxtHomeworkDom.buttons(document).save===null),true);
 await writeFile(resolve(out,'observed-dom.json'),JSON.stringify({scope:'Read-only parsing replay of user-collected DOM; no actual clicks, editor API, save, submit, model or grade verification',passed:true,questions:got.questions.map(q=>({type:q.question.type,number:q.question.number,requiresVision:q.question.requiresVision,fields:q.fields.length,frames:q.frames.length})),checks:['two observed questions parsed separately despite page-wide .TiMu','image-only and mixed text/image stems retain vision requirement','UEditor iframe and hidden answer textarea mapped structurally','save/submit distinguished','ambiguous save refused','runtime collector read-only']},null,2));
 console.log('Observed homework DOM: 6 structural checks passed; live write/finish not tested.');
}finally{await browser.close();}
