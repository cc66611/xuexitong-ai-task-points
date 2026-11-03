/* DevTools console helper: select an element with the picker first; paste this whole file.
 * Read-only: never clicks, fills, calls editor methods, reads storage or sends a request.
 * Output contains structural HTML, not question text, field values, URLs or handler arguments.
 */
(() => {
    let picked = typeof $0 === 'undefined' ? null : $0;
    if (!picked || picked.nodeType !== 1) throw Error('请先按 Ctrl+Shift+C，再点选页面上的目标元素。');
    if (picked.closest('[data-xxt-codex-panel]')) throw Error('选到了脚本面板，请改选左侧测验内容。');
    let question = picked.closest('.TiMu');
    if (!question) {
        try { const frame = picked.ownerDocument.defaultView.frameElement; question = frame?.closest('.TiMu'); } catch {}
    }
    const target = question || picked.closest('button,a,[role="button"],input[type="button"],input[type="submit"]') || picked.parentElement || picked;
    if (target.matches('body,html') || target.querySelector('[data-xxt-codex-panel]')) throw Error('范围过大，请选中按钮文字、提示文字或简答题输入框。');
    const aliases = new Map();
    const alias = value => String(value).replace(/\d{5,}/g, id => { if (!aliases.has(id)) aliases.set(id, `N${aliases.size + 1}`); return aliases.get(id); });
    const safeLabel = value => String(value || '').trim().replace(/\s+/g, ' ');
    const keepText = /^(?:[【\[]?(?:简答题|论述题|其它|其他|填空题|判断题|单选题|多选题)[】\]]?|填写答案|暂时保存|保存|提交|确定|取消|任务点已完成|待完成|已完成|保存成功|暂存成功|暂时保存成功|已保存|保存失败)$/;
    const clone = target.cloneNode(true);
    clone.querySelectorAll('script,style,noscript,svg,canvas').forEach(node => node.remove());
    for (const node of [clone, ...clone.querySelectorAll('*')]) {
        const handler = node.getAttribute('onclick')?.match(/^\s*(?:return\s+)?([A-Za-z_$][\w.$]*)\s*\(/)?.[1];
        for (const attr of [...node.attributes]) {
            if (['id','class','name','type','role','contenteditable','disabled','readonly','aria-disabled'].includes(attr.name)) {
                node.setAttribute(attr.name, alias(attr.value));
            } else node.removeAttribute(attr.name);
        }
        if (handler) node.setAttribute('data-handler-name', handler);
        if (node.matches('textarea')) node.textContent = '';
        for (const child of [...node.childNodes]) if (child.nodeType === 3) {
            const value = safeLabel(child.nodeValue);
            child.nodeValue = !value ? '' : keepText.test(value) ? value : `[文本 ${Array.from(value).length} 字]`;
        }
    }
    const doc = target.ownerDocument;
    let editors = [];
    try {
        editors = Object.values(doc.defaultView.UE?.instants || {}).filter(editor => editor &&
            [editor.iframe, editor.textarea, editor.container].some(node => node?.nodeType === 1 && target.contains(node)))
            .map(editor => ({ key: alias(editor.key || ''), iframeId: alias(editor.iframe?.id || ''),
                textareaId: alias(editor.textarea?.id || ''), ready: !!editor.isReady,
                methods: ['setContent','getContent','sync'].filter(name => typeof editor[name] === 'function'),
                editable: editor.body?.getAttribute('contenteditable') ?? null }));
    } catch {}
    const html = clone.outerHTML;
    const fields = [...target.querySelectorAll('textarea,input,iframe,[contenteditable]')].map(node => ({
        tag: node.tagName, id: alias(node.id), name: alias(node.getAttribute('name') || ''),
        type: node.getAttribute('type'), editable: node.getAttribute('contenteditable'),
        visible: !!(node.getClientRects().length && doc.defaultView.getComputedStyle(node).visibility !== 'hidden'),
        disabled: !!node.disabled, readonly: !!node.readOnly
    }));
    const result = { schema: 1, selectedTag: picked.tagName, questionBlock: !!question,
        html: html.slice(0, 50000), truncated: html.length > 50000, fields, editors };
    const output = JSON.stringify(result, null, 2);
    if (typeof copy === 'function') copy(output);
    console.log(output);
    return '已复制脱敏结构；将剪贴板文字发回即可。';
})();
