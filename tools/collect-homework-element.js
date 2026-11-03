/* DevTools only. Select a page element, then run this expression in Console.
 * Reads a detached clone and element metadata; no page writes or requests.
 * Does not read cookies, browser storage, editor APIs or hidden field values.
 */
(() => {
    const selected = typeof $0 !== 'undefined' ? $0 : null;
    if (!selected || selected.nodeType !== 1) throw Error('还没有选中网页元素。请先按 Ctrl+Shift+C，再点题目或按钮，然后重试。');
    const sensitive = /(?:password|passwd|token|secret|authorization|cookie|session|csrf|xsrf|api.?key|credential)/i;
    const identity = /^(?:cpi|puid|uid|userid|userId|personid|courseid|courseId|clazzid|clazzId|classid|classId|workid|workId|enc|utenc)$/;
    if (selected.closest('[data-xxt-codex-panel]') || selected.matches('script,style,noscript,link,meta,object,embed,input[type="hidden"],input[type="password"],input[type="file"],html,form') || (selected.tagName === 'BODY' && !selected.isContentEditable && selected.ownerDocument.designMode !== 'on') || sensitive.test(selected.id || '') || sensitive.test(selected.getAttribute('name') || '') || identity.test(selected.getAttribute('name') || '')) throw Error('这一处不适合采集。请选择一道题、单个按钮，或编辑器内部的可编辑区域，不要选整页、表单、脚本面板或敏感字段。');
    const cleanText = value => String(value || '').replace(/\b1[3-9]\d{9}\b/g, '[手机号已隐藏]').replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[邮箱已隐藏]');
    const attrs = node => Object.fromEntries([...node.attributes].filter(a => ['id','class','name','type','role','contenteditable','for','tabindex','disabled','readonly','checked','draggable','title'].includes(a.name) || a.name.startsWith('aria-')).map(a => [a.name, sensitive.test(a.value) || identity.test(a.value) ? '[REDACTED]' : cleanText(a.value).slice(0,500)]));
    const describe = node => ({tag: node.tagName.toLowerCase(), attrs: attrs(node), directChildren: [...node.children].slice(0,60).map(c => ({tag:c.tagName.toLowerCase(),class:c.getAttribute('class') || ''}))});
    function html(node) {
        const clone = node.cloneNode(true);
        for (const n of [clone, ...clone.querySelectorAll('*')]) {
            if (['SCRIPT','STYLE','NOSCRIPT','LINK','META','OBJECT','EMBED'].includes(n.tagName) || n.matches('[data-xxt-codex-panel]')) { n.remove(); continue; }
            if (n.matches('input[type="hidden"],input[type="password"],input[type="file"]')) { n.remove(); continue; }
            if (sensitive.test(n.getAttribute('id') || '') || sensitive.test(n.getAttribute('name') || '') || identity.test(n.getAttribute('name') || '')) { n.remove(); continue; }
            const permitted = attrs(n);
            const events = [...n.attributes].filter(a=>/^on/.test(a.name)).map(a=>[a.name, [...a.value.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)].map(m=>m[1]).filter(s=>!sensitive.test(s)).slice(0,8)]);
            for (const a of [...n.attributes]) n.removeAttribute(a.name);
            for (const [key,value] of Object.entries(permitted)) n.setAttribute(key,value);
            for (const [key,names] of events) if (names.length) n.setAttribute('data-collector-'+key, names.join(',')+' (参数已隐藏)');
            if (n.tagName === 'INPUT') n.setAttribute('value','[输入内容已隐藏]');
            if (n.tagName === 'TEXTAREA') n.textContent='[输入内容已隐藏]';
            if (n.tagName === 'IMG') n.setAttribute('data-collector-image','图片地址已隐藏');
            if (n.tagName === 'IFRAME') n.setAttribute('data-collector-frame','请另采编辑框内部');
        }
        const walker=clone.ownerDocument.createTreeWalker(clone,4);let textNode;
        while ((textNode=walker.nextNode())) textNode.nodeValue=cleanText(textNode.nodeValue);
        const value=clone.outerHTML;
        return {value:value.slice(0,600000),truncated:value.length>600000};
    }
    const parents=[];let parent=selected.parentElement;
    for(let i=0;parent&&i<7;i++,parent=parent.parentElement){parents.push(describe(parent));if(parent.tagName==='BODY')break;}
    const doc=selected.ownerDocument;
    const result={schema:1,kind:'homework-selected-element',selected:describe(selected),parents,html:html(selected),
        controls:[selected,...selected.querySelectorAll('input,textarea,[contenteditable],iframe,select')].filter(n=>n.matches('input,textarea,[contenteditable],iframe,select')).filter(n=>!n.matches('input[type="hidden"],input[type="password"],input[type="file"]')).filter(n=>!sensitive.test(n.id||'')&&!sensitive.test(n.getAttribute('name')||'')&&!identity.test(n.getAttribute('name')||'')).slice(0,100).map(n=>({...describe(n),connected:n.isConnected,visible:!!n.getClientRects().length,disabled:!!n.disabled,readOnly:!!n.readOnly,contentEditable:n.getAttribute('contenteditable')})),
        document:{isTop:doc.defaultView===doc.defaultView.top,isEditorDocument:doc.body?.isContentEditable || doc.designMode==='on',titleOmitted:true,urlOmitted:true}};
    const output=JSON.stringify(result,null,2);
    if(typeof copy==='function'){copy(output);console.log('采集完成，结构已复制。请粘贴到记事本检查后发送；页面没有被点击、填入、保存或提交。');}
    else console.log(output);
    return '只读采集完成';
})();
