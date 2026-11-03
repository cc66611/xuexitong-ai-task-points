/* Dropdown extraction/event contracts adapted from iPycc/Fk-Chaoxing-Extension
 * commit 3b367c2e8a4b986d303f45d2c274284404d2a348 (MIT, Copyright 2026 鹏宇晨).
 * Full upstream notice is bundled from vendor/fk-dropdown-LICENSE.txt.
 * Chapter native sorting additionally follows the user's observed sortQues DOM.
 */
(() => {
    'use strict';
    const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
    const label = value => clean(value).replace(/[.、．。]$/, '').trim();
    const owned = new WeakMap();
    function items(nodes, ctx, chapterSort = false) {
        return [...nodes].map(node => {
            const marker = node.querySelector(chapterSort ? ':scope > div > i' : ':scope > span, :scope > i');
            const copy = node.cloneNode(true);
            copy.querySelector(chapterSort ? ':scope > div > i' : ':scope > span, :scope > i')?.remove();
            const image = ctx.imageKey(node);
            return {key:label(marker?.textContent), text:ctx.text(copy) || (image ? '（图片内容，请看截图）' : ''), ...(image ? {imageKey:image} : {})};
        });
    }
    function extract(element, ctx, index = 0) {
        const kind = ctx.text(element.querySelector('.newZy_TItle,.newZy_Title,.colorShallow')) || element.getAttribute('typename') || '';
        const type = /排序/.test(kind) || element.querySelector('[id^="sortQues_"],.selectBox li[qtype="13"]') ? 'ordering' :
            /连线|匹配题/.test(kind) || element.querySelector('.selectBox li[qtype="11"],.matching .firstUlList') ? 'matching' : null;
        if (!type) return null;
        const nativeSort = !!element.querySelector('.sortQuesOption');
        const left = type === 'matching' ? items(element.querySelectorAll('.line_wid_400.fl .lineCt,.firstUlList > li:not(.groupTitile)'), ctx) : [];
        const choices = type === 'ordering' ? items(element.querySelectorAll(nativeSort ? '.sortQuesOption > li' : '.stem_answer > .clearfix'), ctx, nativeSort) :
            items(element.querySelectorAll('.line_wid_400.fr .lineCt,.secondUlList > li:not(.groupTitile)'), ctx);
        const hidden = [...element.querySelectorAll('input[type="hidden"]')].filter(input => /^answer\d+$/.test(input.name || input.id));
        const field = hidden.length === 1 ? hidden[0] : null, qid = (field?.name || field?.id || '').replace(/^answer/, '');
        const typeField = [...element.querySelectorAll('input[type="hidden"]')].find(input => (input.id || input.name) === `answertype${qid}`);
        let targets;
        if (type === 'ordering' && nativeSort) targets = [...element.querySelectorAll('.sortQuesSelect select')].map(select => ({select, box:select.parentElement}));
        else if (type === 'matching' && element.querySelector('.thirdUlList select')) targets = [...element.querySelectorAll('.thirdUlList .lineOption')].map(box => ({box, select:box.querySelector('select'), left:label(box.querySelector('.matchNum')?.textContent), name:box.getAttribute('index')}));
        else targets = [...element.querySelectorAll(type === 'ordering' ? '.selectBox.order_box' : '.line_answer_ct .selectBox')].map(box => ({box, span:box.querySelector(':scope > p > span'), left:label(box.closest('.line_answer_ct')?.querySelector('.line_option')?.textContent)}));
        const title = element.querySelector('.Zy_TItle,h3.mark_name');
        const slots = type === 'ordering' ? choices.length : left.length;
        const description = type === 'ordering' ? '按最终顺序返回各位置的选项编号，texts必须是全部编号的排列。' : '按左侧项目显示顺序，texts逐项返回右侧对应编号；允许多个左侧对应同一右侧。';
        const stem = ctx.text(title);
        const question = {id:qid ? `q${qid}` : `structured${index + 1}`, type, slots, options:[], items:choices,
            ...(left.length ? {prompts:left} : {}), text:`${stem}\n${description}\n${left.length ? '左侧：'+left.map(x=>`${x.key}. ${x.text}`).join('\n')+'\n右侧：' : '选项：'}${choices.map(x=>`${x.key}. ${x.text}`).join('\n')}`,
            obfuscated:!!globalThis.XxtFonts?.obfuscated(element),
            requiresVision:!!ctx.imageKey(element)};
        return {element, title, rows:[], fields:[], frames:[], question,
            structured:{type, targets, field, typeField, qid, nativeSort}};
    }
    const empty = value => !clean(value) || /^[-—请选择\s]+$/.test(clean(value));
    function read(entry) {
        const values = entry.structured.targets.map(target => {
            const value = target.select ? label(target.select.selectedOptions[0]?.textContent) : label(target.span?.textContent);
            return empty(value) ? '' : value;
        });
        return {id:entry.question.id, texts:entry.question.type === 'matching' ? entry.question.prompts.map(item=>{
            const position=entry.structured.targets.findIndex(target=>target.left===item.key);return position<0?'':values[position];
        }) : values, choices:[]};
    }
    function state(entry) { return JSON.stringify({texts:read(entry).texts, value:entry.structured.field?.value || ''}); }
    function preflight(entry, answer) {
        const {targets, field, typeField, qid, type} = entry.structured, q = entry.question;
        globalThis.XxtCodexCore.validateAnswers([q], {answers:[{readable:true, confidence:1, explanation:'', ...answer}]});
        if (!field?.isConnected || !qid || targets.length !== q.slots || !entry.element.isConnected) throw Error('排序/连线控件与题目数量不一致，未写入');
        if (typeField?.value && typeField.value !== (type === 'ordering' ? '13' : '11')) throw Error('题型提交字段冲突，未写入');
        const current = state(entry), previous = owned.get(entry.element);
        if (previous && previous !== current) throw Error('检测到人工修改排序/连线答案，保留现有作答');
        if (!previous && (read(entry).texts.some(Boolean) || field.value) && JSON.stringify(read(entry).texts) !== JSON.stringify(answer.texts)) throw Error('排序/连线题已有作答，保留内容，请先人工核对');
        const seen = new Set();
        const plan = targets.map((target, index) => {
            const position = type === 'ordering' ? index : q.prompts.findIndex(item => item.key === target.left);
            if (position < 0 || seen.has(position)) throw Error('连线题左侧项目与控件无法唯一对应');
            seen.add(position);
            const wanted = answer.texts[position];
            if (target.select) {
                const matches = [...target.select.options].filter(option => label(option.textContent) === wanted);
                if (matches.length !== 1 || target.select.disabled || matches[0].disabled) throw Error('排序/连线下拉选项无效或不可操作');
                const chosen = target.box.querySelector('.chosen-container');
                if (chosen && !chosen.querySelector('.chosen-single')) throw Error('下拉控件尚未就绪');
                if (type === 'matching' && !/^\d+$/.test(target.name || '')) throw Error('连线内部编号无效');
                return {...target, option:matches[0], chosen, wanted, position};
            }
            const prefix = type === 'ordering' ? 'sortSelect' : 'connlineSelect';
            if (!target.span?.classList.contains(`${prefix}${qid}`)) throw Error('无法确认排序/连线控件归属');
            const matches = [...target.box.querySelectorAll('ul.options > li')].filter(li => label(li.querySelector('a')?.textContent) === wanted && li.getAttribute('qid') === qid && li.getAttribute('qtype') === (type === 'ordering' ? '13' : '11'));
            if (matches.length !== 1 || !matches[0].getAttribute('data')) throw Error('找不到唯一的排序/连线选项');
            const name = target.span.getAttribute('data');
            if (type === 'matching' && !/^\d+$/.test(name || '')) throw Error('连线内部编号无效');
            return {...target, item:matches[0], wanted, value:matches[0].getAttribute('data'), name, position};
        });
        if (type === 'matching' && new Set(plan.map(choice=>choice.name)).size !== plan.length) throw Error('连线内部编号重复');
        return plan;
    }
    async function apply(entry, answer, guard) {
        const plan = preflight(entry, answer), {field, typeField, type} = entry.structured;
        const win = entry.element.ownerDocument.defaultView;
        for (const choice of plan) {
            guard();
            if (!choice.box.isConnected || !field.isConnected) throw Error('排序/连线控件已变化，取消填写');
            if (choice.select) {
                if (choice.chosen) {
                    choice.chosen.querySelector('.chosen-single').dispatchEvent(new win.MouseEvent('mousedown', {bubbles:true,cancelable:true}));
                    const result = choice.chosen.querySelector(`.chosen-results li[data-option-array-index="${choice.option.index}"]`);
                    if (!result) throw Error('下拉结果未加载，取消填写');
                    result.dispatchEvent(new win.MouseEvent('mouseover', {bubbles:true}));
                    result.dispatchEvent(new win.MouseEvent('mouseup', {bubbles:true,cancelable:true}));
                } else choice.select.value = choice.option.value;
                if (choice.select.value !== choice.option.value || (choice.chosen && label(choice.chosen.querySelector('.chosen-single span')?.textContent) !== choice.wanted)) throw Error('下拉框显示或选中值未同步，取消提交');
                choice.select.setAttribute('value', choice.option.value);
                for (const event of ['input','change']) choice.select.dispatchEvent(new win.Event(event,{bubbles:true}));
                choice.value = choice.option.value;
            } else {
                choice.item.click();
                if (choice.span.getAttribute('value') !== choice.value || label(choice.span.textContent) !== choice.wanted) throw Error('排序/连线页面事件未同步，取消提交');
            }
            owned.set(entry.element, state(entry));
        }
        guard();
        const expected = type === 'ordering' ? plan.map(choice=>choice.value).join('') : JSON.stringify(plan.map(choice=>({name:choice.name,content:choice.value})).sort((a,b)=>Number(a.name)-Number(b.name)));
        if (plan.every(choice=>choice.select)) {
            field.value = expected;
            for (const event of ['input','change']) field.dispatchEvent(new win.Event(event,{bubbles:true}));
        }
        if (typeField) typeField.value = type === 'ordering' ? '13' : '11';
        if (type === 'ordering' ? field.value !== expected : canonical(field.value) !== canonical(expected)) throw Error('排序/连线提交字段未正确同步，取消提交');
        const actual = read(entry).texts;
        if (actual.length !== answer.texts.length || actual.some((value,i)=>value !== answer.texts[i])) throw Error('排序/连线显示顺序与答案不一致，取消提交');
        owned.set(entry.element,state(entry));
    }
    function canonical(value) {
        try { const entries=JSON.parse(value);if(!Array.isArray(entries)||entries.some(e=>!e||typeof e.name!=='string'||typeof e.content!=='string'))return null;
            return JSON.stringify(entries.map(({name,content})=>({name,content})).sort((a,b)=>Number(a.name)-Number(b.name))); } catch { return null; }
    }
    globalThis.XxtStructuredQuestions = {extract, read, preflight, apply};
})();
