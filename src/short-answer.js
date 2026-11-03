/* Whole-quiz short-answer preference. DOM execution awaits the user's real page contract. */
(function (root) {
    'use strict';
    const key = 'xxt-short-answer-mode';
    const modes = Object.freeze(['submit', 'save', 'skip']);
    const labels = Object.freeze({ submit: '简答题直接提交', save: '简答题暂时保存', skip: '简答题直接跳过' });
    const notes = Object.freeze({
        submit: '含简答题时，填写整份测验后提交。提交后仍需核对平台结果。',
        save: '默认：含简答题时，填写整份测验后点击“暂时保存”，不提交。保存不代表任务点已完成。',
        skip: '含简答题时，整份测验不作答、不保存、不提交；在“跳过记录”中说明原因。'
    });
    const normalize = value => modes.includes(value) ? value : 'save';
    const load = () => normalize(GM_getValue(key, 'save'));
    function quizKey(win) {
        try {
            const p=new URL(win.location.href).searchParams;
            const id=p.get('workId')||p.get('workid')||p.get('oldWorkId')||p.get('jobid')||p.get('workAnswerId');
            if(id)return 'work:'+String(id).slice(0,160);
            const entries=root.XxtCodexDom.extract(win.document);if(!entries.length)return '';
            let hash=2166136261;for(const c of JSON.stringify(entries.map(e=>e.question)))hash=Math.imul(hash^c.charCodeAt(0),16777619);
            return 'form:'+(hash>>>0).toString(16);
        }catch{return '';}
    }
    function describe(entries, mode, state = 'skipped') {
        const essays=entries.flatMap((entry,index)=>entry.essayLike?[{ number:index+1, kind:entry.kind, id:entry.question.id }]:[]);
        return { mode:normalize(mode), state, total:entries.length, essays, quizKey:quizKey(root),
            reason:`${labels[normalize(mode)]}：整份测验共${entries.length}题，含${essays.length}道简答题（${essays.map(e=>`第${e.number}题${e.kind}`).join('、')}）` };
    }
    const saveButton = doc => {
        const D=root.XxtCodexDom;
        return D.unique([...doc.querySelectorAll('.btnSave.workBtnIndex')].filter(node=>D.enabled(node)&&D.text(node)==='暂时保存'));
    };
    function successNodes(doc) {
        const D=root.XxtCodexDom;
        const matched=value=>/^保存成功[!！]?$/.test(String(value).trim());
        const candidates=[...doc.querySelectorAll('div,span,p,[role="status"],[role="alert"]')].filter(node=>
            !node.closest('[data-xxt-codex-panel]')&&(matched(node.textContent)||[...node.childNodes].some(child=>child.nodeType===3&&matched(child.nodeValue)))&&D.visible(node));
        return candidates.filter(node=>!candidates.some(other=>other!==node&&node.contains(other)));
    }
    async function saveDraft(button, guard, beforeSave = () => {}, timeout = 12000) {
        const docs=[];
        for(let win=button.ownerDocument.defaultView,depth=0;win&&depth<8;depth++){
            try{if(!docs.includes(win.document))docs.push(win.document);}catch{}
            if(win===win.parent)break;win=win.parent;
        }
        const baseline=new Set(docs.flatMap(successNodes));
        let confirmed=false;
        const inspect=()=>{if(docs.some(doc=>successNodes(doc).some(node=>!baseline.has(node))))confirmed=true;};
        const observers=docs.map(doc=>{const observer=new doc.defaultView.MutationObserver(inspect);observer.observe(doc.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['style','class','hidden']});return observer;});
        let clicked=false;
        try{
            guard();
            if(saveButton(button.ownerDocument)!==button)throw Error('暂时保存按钮已变化或不唯一，未保存');
            beforeSave();guard();clicked=true;button.click();inspect();
            const since=Date.now();
            while(!confirmed){guard();if(Date.now()-since>timeout)throw Error('已点击暂时保存，但未看到本次“保存成功!”提示，请人工复核；不会重复保存或改为提交');await new Promise(resolve=>setTimeout(resolve,100));inspect();}
            guard();return {state:'saved',text:'保存成功!'};
        }catch(error){if(clicked)error.draftSaveUncertain=true;throw error;}
        finally{for(const observer of observers)observer.disconnect();}
    }
    function controls(onChange = () => {}) {
        const fold=document.createElement('details');fold.dataset.shortAnswerSettings='true';fold.className='xxt-settings-fold';
        fold.style.cssText='width:100%;min-width:0';
        const summary=document.createElement('summary');summary.textContent='简答题设置';
        const box = document.createElement('fieldset');
        box.style.cssText = 'width:100%;min-width:0;margin:0;border:1px solid var(--line,currentColor);border-radius:12px;padding:10px';
        const legend = document.createElement('legend'); legend.textContent = '简答题';
        const group = document.createElement('div');
        group.style.cssText = 'display:grid;grid-template-columns:minmax(0,1fr);gap:8px';
        const style = document.createElement('style');
        style.textContent = `
            [data-short-answer-settings] .xxt-short-choice{position:relative;display:block;min-width:0;cursor:pointer}
            [data-short-answer-settings] input{position:absolute;width:1px!important;height:1px!important;opacity:0;pointer-events:none}
            [data-short-answer-settings] .xxt-short-face{display:flex;align-items:center;gap:8px;min-height:42px;padding:8px 12px;border:1px solid var(--line,#667085);border-radius:10px;background:var(--surface,#f3f4f6);color:inherit;box-shadow:0 3px 0 #0005,inset 0 1px 0 #ffffff28;transform:translateY(-2px);overflow-wrap:anywhere}
            [data-short-answer-settings] input:checked + .xxt-short-face{border-color:var(--accent,#b58428);box-shadow:inset 0 2px 5px #0006,inset 0 -1px 0 #ffffff16;transform:translateY(1px);background:var(--button,#ead9b8)}
            [data-short-answer-settings] input:focus-visible + .xxt-short-face{outline:2px solid var(--accent,#b58428);outline-offset:3px}
            [data-short-answer-settings] .xxt-short-mark{display:inline-block;flex:0 0 1em;text-align:center;font-weight:700}
        `;
        const note = document.createElement('p');
        note.dataset.shortAnswerNote = 'true'; note.setAttribute('aria-live', 'polite');
        note.style.cssText = 'font-size:12px;line-height:1.6;margin:10px 0 0';
        const name = `xxt-short-answer-${root.crypto.randomUUID()}`;
        let selected = load();
        const radios = [];
        const render = () => {
            for (const radio of radios) {
                radio.checked = radio.value === selected;
                radio.nextElementSibling.querySelector('.xxt-short-mark').textContent = radio.checked ? '✓' : '○';
            }
            note.textContent = notes[selected];
        };
        for (const mode of modes) {
            const label = document.createElement('label'); label.className = 'xxt-short-choice';
            const radio = document.createElement('input');
            radio.type = 'radio'; radio.name = name; radio.value = mode;
            radio.dataset.setting = 'short-answer-mode';
            const face = document.createElement('span'); face.className = 'xxt-short-face';
            const mark = document.createElement('span'); mark.className = 'xxt-short-mark'; mark.setAttribute('aria-hidden', 'true');
            const text = document.createElement('span'); text.textContent = labels[mode];
            face.append(mark, text); label.append(radio, face); group.append(label); radios.push(radio);
            radio.addEventListener('change', () => {
                if (!radio.checked || selected === radio.value) return;
                onChange(); // Existing workflow cancellation runs before the preference is committed.
                selected = radio.value; GM_setValue(key, selected); render();
            });
        }
        box.append(style, legend, group, note);fold.append(summary,box); render(); return fold;
    }
    root.XxtShortAnswer = { key, modes, labels, notes, normalize, load, quizKey, describe, saveButton, saveDraft, controls };
    if (typeof module === 'object' && module.exports) module.exports = root.XxtShortAnswer;
})(typeof globalThis !== 'undefined' ? globalThis : this);
