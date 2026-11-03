/* Homework DOM adapter based on user-collected question/editor/button contracts. */
(() => {
 'use strict';
 const plain=node=>(node?.textContent||'').replace(/\s+/g,' ').trim();
 const hash=value=>{let n=2166136261;for(const c of value)n=Math.imul(n^c.charCodeAt(0),16777619);return(n>>>0).toString(16);};
 function combinedEntries(node,index,number){
  const D=globalThis.XxtCodexDom;
  const entries=globalThis.XxtCompositeQuestions?.extract(node,{text:D?.text||plain,imageKey:D?.imageKey||(el=>el?.querySelector('img')?hash([...el.querySelectorAll('img')].map(img=>img.currentSrc||img.src).join('|')):undefined),enabled:D?.enabled||visible},index);
  if(!entries)return null;
  return entries.map((entry,sub)=>{
   entry.title=entry.element.querySelector('.reader_answer_tit,.subTitle,.Zy_TItle');entry.frames=[];
   entry.question.id=node.id+'_sub'+(sub+1);entry.question.number=number+'.'+(sub+1);
   const part=entry.element;
   // Observed qtype=2 child blanks use one bound UEditor per .Answer.
   if(entry.question.type==='unsupported'&&part.getAttribute('qtype')==='2'&&/填空题/.test(plain(part.querySelector('.read_type')))){
    const boxes=[...part.querySelectorAll(':scope > .stem_answer2 > .Answer')];
    const mapped=boxes.map((box,i)=>{
     const fields=[...box.querySelectorAll('.textDIV textarea[id^="answerEditor"]')],frames=[...box.querySelectorAll('.textDIV iframe[id^="ueditor_"]')];
     return fields.length===1&&frames.length===1&&fields[0].id==='answerEditor'+part.getAttribute('data')+(i+1)?{field:fields[0],frame:frames[0]}:null;
    });
    if(mapped.length&&mapped.length<=20&&mapped.every(Boolean)){
     entry.fields=mapped.map(m=>m.field);entry.frames=mapped.map(m=>m.frame);entry.richBlank=true;
     entry.question.type='blank';entry.question.slots=mapped.length;entry.question.options=[];
    }
   }
   return entry;
  });
 }
 function scan(doc){
  const form=doc.querySelector('.fanyaMarking #submitForm');if(!form)return[];
  return [...form.querySelectorAll('.questionLi.singleQuesId[id^="question"]')].filter(node=>!node.parentElement?.closest('.questionLi')).flatMap((node,index)=>{
   const title=node.querySelector(':scope > h3.mark_name'),kind=plain(title?.querySelector('.colorShallow'));
   const id=node.id,number=node.getAttribute('aria-label')?.match(/题目\s*(\d+)/)?.[1]||plain(title).match(/^(\d+)\./)?.[1]||id;
   const combined=combinedEntries(node,index,number);if(combined)return combined;
   const structured=globalThis.XxtStructuredQuestions?.extract(node,{text:plain,imageKey:el=>el?.querySelector('img')?hash([...el.querySelectorAll('img')].map(img=>img.currentSrc||img.src).join('|')):undefined});
   if(structured){structured.question.id=id;structured.question.number=number;return structured;}
   const rows=[...node.querySelectorAll(':scope > .stem_answer.qtDetail > .answerBg[role="radio"],:scope > .stem_answer.qtDetail > .answerBg[role="checkbox"]')];
   const editor=node.querySelector(':scope > .stem_answer > .eidtDiv');
   const fields=editor?[...editor.querySelectorAll('textarea')].filter(f=>f.id==='answer'+id.slice('question'.length)):[...node.querySelectorAll(':scope > .stem_answer input[type="text"],:scope > .stem_answer textarea')].filter(n=>n.getClientRects().length&&!n.disabled&&!n.readOnly);
   const frames=editor?[...editor.querySelectorAll('iframe[id^="ueditor_"]')]:[];
   const options=rows.map(row=>({key:plain(row.querySelector('.num_option,.num_option_dx')),text:plain(row.querySelector('.answer_p'))}));
   let type='unsupported';
   if(/判断题/.test(kind)&&rows.length===2&&options.every(o=>o.key&&o.text)&&new Set(options.map(o=>o.key)).size===2)type='boolean';
   if(/单选题|多选题/.test(kind)&&rows.length>=2&&options.every(o=>/^[A-T]$/.test(o.key)&&o.text)&&new Set(options.map(o=>o.key)).size===rows.length)type=/多选题/.test(kind)?'multiple':'single';
   if(/计算题|简答题|论述题|名词解释|资料题|分录题|翻译题|写作题|问答题|作文题|证明题/.test(kind)&&fields.length===1&&frames.length===1)type='essay';
   if(/填空题/.test(kind)&&fields.length>=1&&fields.length<=20&&!frames.length)type='blank';
   const images=[...(title?.querySelectorAll('img')||[])];
   const visualSources=images.map(img=>img.getAttribute('src')||img.getAttribute('data-original')||img.getAttribute('data-collector-image')||'image');
   return{element:node,title,rows,fields,frames,question:{id,number,type,text:plain(title),options,
    ...(['essay','blank'].includes(type)?{slots:fields.length}:{}),...(images.length?{requiresVision:true,imageKey:hash(JSON.stringify(visualSources))}:{})}};
  });
 }
 function buttons(doc){const host=doc.querySelector('.subNav #submitFocus');if(!host)return{save:null,submit:null};const candidates=[...host.querySelectorAll(':scope > a')];const one=list=>list.length===1?list[0]:null;return{save:one(candidates.filter(n=>!n.classList.contains('completeBtn')&&plain(n)==='暂时保存')),submit:one(candidates.filter(n=>n.classList.contains('completeBtn')&&n.getAttribute('role')==='button'&&plain(n)==='提交'))};}
 const comparable=value=>globalThis.XxtHomework.comparable(value);
 function htmlText(value,doc){const t=doc.createElement('template');t.innerHTML=String(value||'');for(const n of t.content.querySelectorAll('br'))n.replaceWith('\n');return comparable(t.content.textContent);}
 const visible=n=>!!n?.isConnected&&!!n.getClientRects().length&&n.ownerDocument.defaultView.getComputedStyle(n).visibility!=='hidden';
 function editorFor(entry,index=0){
  const field=entry.fields[index],frame=entry.frames[index],doc=entry.element.ownerDocument;
  const win=typeof unsafeWindow!=='undefined'&&unsafeWindow.document===doc?unsafeWindow:doc.defaultView;
  const matches=Object.values(win.UE?.instants||{}).filter(e=>e&&e.key===field?.id&&e.textarea===field&&e.iframe===frame);
  const e=matches.length===1?matches[0]:null;
  if(!e||!['setContent','getContent','sync'].every(k=>typeof e[k]==='function')||!e.body?.isConnected||e.body!==frame.contentDocument?.body||!e.body.isContentEditable||e.options?.readonly||field.disabled||field.readOnly||!visible(frame))throw Error('主观题编辑器尚未可用或对应关系变化，未写入答案。');
  // The observed runtime reports isReady !== true for five live, editable
  // bodies. Readiness is established by the actual bound body and methods.
  return e;
 }
 function richValue(entry,index){
  const e=editorFor(entry,index),doc=entry.element.ownerDocument,body=htmlText(e.body.innerHTML,doc),saved=htmlText(entry.fields[index].value,doc);
  if(body&&saved&&body!==saved)throw Error('编辑器显示与保存字段不一致，保留现有作答。');
  return body||saved;
 }
 function choices(entry){
  const marked=entry.rows.flatMap((row,i)=>{
   const input=row.querySelector('input[type="radio"],input[type="checkbox"]'),marker=row.querySelector('.num_option,.num_option_dx');
   return input?.checked||row.getAttribute('aria-checked')==='true'||row.classList.contains('check_answer')||row.classList.contains('check_answer_dx')||marker?.classList.contains('check_answer')||marker?.classList.contains('check_answer_dx')?[entry.question.options[i].key]:[];
  });
  const field=entry.element.querySelector('input[type="hidden"][id="answer'+entry.element.id.slice('question'.length)+'"]');
  const value=String(field?.value||'').trim();
  if(marked.length)return marked.sort();
  if(!value)return[];
  if(/^[A-T]+$/.test(value)&&[...value].every(k=>entry.question.options.some(o=>o.key===k)))return[...value].sort();
  if(entry.question.type==='boolean'&&/^(true|false)$/i.test(value))return entry.question.options.filter(o=>(value.toLowerCase()==='true'?/^(对|正确|√)$/:/^(错|错误|×)$/).test(o.text)).map(o=>o.key);
  throw Error('选项保存字段已有内容，但选中状态无法确认；保留现有作答。');
 }
 function readEntry(entry){
  if(entry.structured)return globalThis.XxtStructuredQuestions.read(entry);
  if(entry.composite)return globalThis.XxtCompositeQuestions.read(entry);
  if(entry.question.type==='essay'||entry.richBlank)return{id:entry.question.id,texts:entry.fields.map((_,i)=>richValue(entry,i))};
  if(entry.question.type==='blank')return{id:entry.question.id,texts:entry.fields.map(f=>comparable(f.value))};
  if(entry.rows.length)return{id:entry.question.id,choices:choices(entry)};
  return{id:entry.question.id};
 }
 function create({doc=document,identity,assertCurrent=()=>{},policy=()=>({}),readState=()=>null,writeState=()=>{},timeout=8000}={}){
  const owned=new WeakMap();
  const getPage=()=>{const entries=scan(doc);return{identity:identity(),entries,questions:entries.map(e=>e.question)};};
  const read=page=>page.entries.map(readEntry);
  const ensure=(entry,answer)=>{
   const current=readEntry(entry),key=['essay','blank','ordering','matching'].includes(entry.question.type)?'texts':'choices';
   const now=JSON.stringify(current[key]),prior=owned.get(entry.element),expected=JSON.stringify(answer[key]);
   if(prior&&prior!==now)throw Error('检测到人工修改，保留作答并取消后续操作。');
   if((current[key]||[]).some(Boolean)&&!prior&&now!==expected)throw Error('已有作答与AI答案不同，保留内容；请先人工检查。');
  };
  async function apply(page,answers,guard){
   if(readState(page.identity))throw Error('此作业存在提交记录，先人工检查平台状态。');
   const entries=page.entries.filter(e=>answers.some(a=>a.id===e.question.id));
   for(const entry of entries){guard();const answer=answers.find(a=>a.id===entry.question.id);ensure(entry,answer);if(entry.structured)globalThis.XxtStructuredQuestions.preflight(entry,answer);if(entry.composite)globalThis.XxtCompositeQuestions.preflight(entry,answer);if(entry.question.type==='essay'||entry.richBlank)entry.fields.forEach((_,i)=>editorFor(entry,i));}
   for(const entry of entries){
    guard();const answer=answers.find(a=>a.id===entry.question.id);ensure(entry,answer);
    if(entry.structured){await globalThis.XxtStructuredQuestions.apply(entry,answer,guard);
    }else if(entry.composite){await globalThis.XxtCompositeQuestions.apply(entry,answer,guard);
    }else if(entry.question.type==='essay'||entry.richBlank){
     for(let i=0;i<entry.fields.length;i++){
      guard();ensure(entry,answer);const e=editorFor(entry,i),value=answer.texts[i],html='<p>'+value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\r?\n/g,'<br>')+'</p>';
      e.setContent(html);e.fireEvent?.('contentChange');e.sync();guard();
      if([e.getContent(),entry.fields[i].value,e.body.innerHTML].some(v=>htmlText(v,doc)!==comparable(value)))throw Error('编辑器显示或提交字段未同步，未执行收尾操作。');
      owned.set(entry.element,JSON.stringify(entry.fields.map((_,j)=>richValue(entry,j))));
     }
    }else if(entry.question.type==='blank'){
     for(let i=0;i<entry.fields.length;i++){guard();const f=entry.fields[i];if(!visible(f)||f.disabled||f.readOnly)throw Error('填空框不可编辑。');const proto=f.tagName==='TEXTAREA'?doc.defaultView.HTMLTextAreaElement.prototype:doc.defaultView.HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(f,answer.texts[i]);for(const type of ['input','change'])f.dispatchEvent(new doc.defaultView.Event(type,{bubbles:true}));}
    }else{
     for(let i=0;i<entry.rows.length;i++){guard();const row=entry.rows[i],key=entry.question.options[i].key,want=answer.choices.includes(key),has=choices(entry).includes(key);if(want!==has&&(entry.question.type==='multiple'||want)){if(!visible(row))throw Error('选项不可见，已停止。');row.click();await new Promise(r=>setTimeout(r,80));}}
    }
    guard();const actual=readEntry(entry),expected=globalThis.XxtHomework.answerValue(entry.question,answer);if(JSON.stringify(globalThis.XxtHomework.answerValue(entry.question,actual))!==JSON.stringify(expected))throw Error('答案未正确写入，未保存或提交。');owned.set(entry.element,JSON.stringify(actual.texts||actual.choices));
   }
  }
  async function finish(kind,{page,guard,signal}){
   guard();if(readState(page.identity))throw Error('已有提交记录，本轮不重复提交。');
   const button=buttons(doc)[kind];if(!visible(button)||button.classList.contains('disabled')||button.getAttribute('aria-disabled')==='true')throw Error('作业收尾按钮缺失、不唯一或不可用。');
   if(kind==='submit'&&(!globalThis.XxtHomework.normalize(policy()).subjective||policy().subjective!=='ai'))throw Error('未允许AI主观题，不能直接提交。');
   const success=kind==='save'?/^(?:暂时)?保存成功[!！。]?$/u:/^(?:作业)?提交成功[!！。]?$/u;
   const hits=()=>[...doc.querySelectorAll('div,span,p,[role="status"],[role="alert"]')].filter(n=>!n.closest('[data-xxt-codex-panel],.questionLi,script,style')&&visible(n)&&success.test(plain(n)));
   const prior=new Set(hits()),changed=new WeakSet();
   const observer=new MutationObserver(records=>{for(const m of records){const target=m.target.nodeType===1?m.target:m.target.parentElement;if(target?.closest('[data-xxt-codex-panel]'))continue;for(let n=target;n&&n!==doc.body;n=n.parentElement)changed.add(n);for(const n of m.addedNodes)if(n.nodeType===1){changed.add(n);for(const c of n.querySelectorAll('*'))changed.add(c);}}});
   observer.observe(doc.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['style','class','hidden']});
   try{
    if(kind==='submit')writeState(page.identity,'pending');
    guard();button.click();const since=Date.now();let confirmationClicked=false;
    while(Date.now()-since<timeout){
     if(signal.aborted)throw Error('已停止，未继续处理确认窗口。');
     if(hits().some(n=>!prior.has(n)||changed.has(n))){if(kind==='submit')writeState(page.identity,'confirmed');return{state:'confirmed'};}
     guard();
     if(kind==='submit'&&!confirmationClicked){const confirm=globalThis.XxtCodexDom?.confirmation(doc,'submit');if(confirm){guard();confirm.click();confirmationClicked=true;}}
     await new Promise(r=>setTimeout(r,80));
    }
    return{state:'unknown'};
   }finally{observer.disconnect();}
  }
  return{verified:true,scan:getPage,read,apply,finish,assertCurrent,policy};
 }
 globalThis.XxtHomeworkDom={scan,buttons,editorFor,readEntry,create};
})();
