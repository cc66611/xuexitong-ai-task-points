/* Paste once into the homework page's top-level DevTools Console.
 * Read-only: no clicks, editor method calls, requests, storage or field values.
 */
(() => {
 const visible=n=>!!n?.getClientRects().length&&n.ownerDocument.defaultView.getComputedStyle(n).visibility!=='hidden';
 const attrs=n=>n?{tag:n.tagName.toLowerCase(),id:n.id||'',class:n.getAttribute('class')||'',role:n.getAttribute('role')||'',visible:visible(n)}:null;
 const questions=[...document.querySelectorAll('#submitForm .questionLi.singleQuesId')];
 const editors=questions.filter(q=>q.querySelector('.eidtDiv')).map(q=>({question:q.id,fields:[...q.querySelectorAll('.eidtDiv textarea')].map(n=>({...attrs(n),name:n.name,readOnly:n.readOnly,disabled:n.disabled})),frames:[...q.querySelectorAll('.eidtDiv iframe')].map(n=>{let body=null;try{body=n.contentDocument?.body;}catch{}return{...attrs(n),body:body?{...attrs(body),editable:body.isContentEditable}:null};})}));
 const registered=Object.values(window.UE?.instants||{}).filter(Boolean).map(e=>({key:typeof e.key==='string'?e.key:'',textarea:attrs(e.textarea?.nodeType===1?e.textarea:null),container:attrs(e.container?.nodeType===1?e.container:null),iframe:attrs(e.iframe?.nodeType===1?e.iframe:null),body:attrs(e.body?.nodeType===1?e.body:null),ready:e.isReady===true,methods:Object.fromEntries(['setContent','getContent','sync','fireEvent','getPlainTxt'].map(k=>[k,typeof e[k]==='function']))}));
 const choices=questions.filter(q=>q.querySelector('.qtDetail .answerBg')).slice(0,2).map(q=>({question:q.id,rows:[...q.querySelectorAll('.qtDetail .answerBg')].map(n=>({...attrs(n),ariaChecked:n.getAttribute('aria-checked'),marker:attrs(n.querySelector('.num_option,.num_option_dx'))})),hiddenFieldNames:[...q.querySelectorAll('input[type="hidden"]')].map(n=>({id:n.id,name:n.name})).filter(n=>!/(enc|token|cookie|session|user|cpi|course|clazz|person)/i.test(n.id+' '+n.name))}));
 const dialogs=[...document.querySelectorAll('.AlertCon02,[role="dialog"]')].filter(n=>!n.closest('[data-xxt-codex-panel]')).slice(0,8).map(n=>{
  const clone=n.cloneNode(true);for(const x of clone.querySelectorAll('script,style,input,textarea,iframe,img'))x.remove();
  const text=(clone.textContent||'').replace(/\s+/g,' ').trim().replace(/\b1[3-9]\d{9}\b/g,'[手机号已隐藏]').slice(0,1500);
  return{...attrs(n),text,controls:[...n.querySelectorAll('a,button,[role="button"],input[type="button"],input[type="submit"]')].map(b=>({...attrs(b),text:(b.textContent||b.value||'').trim().slice(0,50),calls:[...(b.getAttribute('onclick')||'').matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)].map(m=>m[1]).slice(0,5)}))};
 });
 const result={schema:1,kind:'homework-runtime-metadata',top:window===window.top,editors,registered,choices,dialogs,functions:{saveWork:typeof window.saveWork==='function',submitValidate:typeof window.submitValidate==='function'}};
 const output=JSON.stringify(result,null,2);if(typeof copy==='function'){copy(output);console.log('已复制编辑器与弹窗结构信息。没有点击、填入、保存或提交；未读取答案内容、Cookie或浏览器存储。');}else console.log(output);
})();
