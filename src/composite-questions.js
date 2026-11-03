/* Reading/cloze child-question traversal and saveSingleSelect click contracts
 * adapted from ocsjs/ocsjs cx.ts, a389cacc3cd3cd86ebd7cef6552188fb6ec27e98.
 * MIT, Copyright (c) 2022 enncy; full notice: vendor/ocs-LICENSE.txt (bundled).
 * Unlike upstream's click-only path, require observable native/ARIA selection.
 */
(() => {
    const owned = new WeakMap();
    function selected(control, row) {
        const input = control.matches('input') ? control : row.querySelector('input[type="radio"],input[type="checkbox"]');
        if (input) return input.checked;
        const node = [control,row].find(n=>['true','false'].includes(n.getAttribute('aria-checked')));
        if (node) return node.getAttribute('aria-checked') === 'true';
        // Observed standalone combined questions use addChoice(this), a
        // num_option class marker and a matching hidden answer field.
        if (control.matches('.num_option[data],.num_option_dx[data]') && row.matches('.hoverDiv') && /^addChoice\(this\);?$/.test(row.getAttribute('onclick')||''))
            return control.classList.contains('check_answer') || control.classList.contains('check_answer_dx') || row.classList.contains('check_answer') || row.classList.contains('check_answer_dx');
        throw Error('阅读/完形子题缺少可核验的选中状态，保留当前题目');
    }
    function extract(element, ctx, index) {
        const kind = ctx.text(element.querySelector('.newZy_TItle,.colorShallow'));
        if (!/阅读理解|完形填空|完型填空|组合题/.test(kind)) return null;
        const parts = [...element.querySelectorAll('.reading_answer,.filling_answer')].filter(node=>!node.parentElement?.closest('.reading_answer,.filling_answer'));
        if (!parts.length) return null;
        const common = ctx.text(element.querySelector('.Zy_TItle,h3.mark_name'));
        const material = element.querySelector('.readComprehensionQues,.reading_stem,.readingContent,.filling_stem')?.cloneNode(true);
        // The new homework readComprehensionQues contains the child answer
        // controls, not the passage. Never send their drafts as shared text.
        for (const node of material?.querySelectorAll('.reading_answer,.filling_answer,input,textarea,script,style') || []) node.remove();
        const passage = ctx.text(material);
        return parts.map((part,sub) => {
            const explicit = ctx.text(part.querySelector('.newZy_TItle,.colorShallow,.read_type'));
            const type = /多选/.test(explicit) || part.querySelector('input[type="checkbox"],[role="checkbox"]') ? 'multiple' : /判断/.test(explicit) ? 'boolean' : 'single';
            const controls = [...part.querySelectorAll('span.saveSingleSelect[data]')];
            if (!controls.length) controls.push(...part.querySelectorAll('input[type="radio"],input[type="checkbox"],[role="radio"],[role="checkbox"]'));
            const combined = !controls.length && part.matches('.reading_answer[data][qtype]');
            if (combined) controls.push(...part.querySelectorAll(':scope > .stem_answer > .hoverDiv > .num_option[data],:scope > .stem_answer > .hoverDiv > .num_option_dx[data]'));
            const fields = [...part.querySelectorAll('input[type="text"],textarea')].filter(node=>ctx.enabled(node)&&!node.readOnly&&!node.closest('.chosen-search,.edui-editor'));
            const rows = controls.map(control=>control.closest('li,.answerBg,.answerItem,.hoverDiv') || control.parentElement);
            const options = controls.map((control,i)=>{
                const row = rows[i], image = ctx.imageKey(row);
                const key = control.getAttribute('data') || ctx.text(row.querySelector('.num_option,.num_option_dx')) || control.value;
                const content = row.querySelector('.after,.answer_p');
                return {key, text:ctx.text(content || row) || (image ? '（图片选项，请看截图）' : ''), ...(image ? {imageKey:image} : {})};
            });
            let mapped = controls.length >= 2 && options.every(option=>/^[A-T]$/.test(option.key)) && new Set(options.map(o=>o.key)).size===options.length;
            const answerField = combined ? [...part.querySelectorAll(':scope > input[type="hidden"]')].find(n=>n.id==='answer'+part.getAttribute('data')) : null;
            if (combined && !answerField) mapped=false;
            if (mapped) try { controls.forEach((control,i)=>selected(control,rows[i])); } catch { mapped=false; }
            const blank = !controls.length && fields.length>0 && fields.length<=20 && !part.querySelector('iframe,[contenteditable="true"]');
            return {element:part, captureElement:element, rows:[], fields:blank?fields:[], essayLike:false,
                ...(mapped ? {composite:{controls,rows,answerField}} : {}),
                question:{id:`q${index+1}_sub${sub+1}`,type:blank?'blank':mapped?type:'unsupported',
                    text:`${common}\n公共材料：${passage}\n子题 ${sub+1}：${ctx.text(part.querySelector('.Zy_TItle,.mark_name,.subTitle,.reader_answer_tit') || part)}`,
                    options:blank?[]:options,...(blank?{slots:fields.length}:{}),
                    obfuscated:!!globalThis.XxtFonts?.obfuscated(element),requiresVision:!!ctx.imageKey(element),...(ctx.imageKey(element)?{imageKey:ctx.imageKey(element)}:{})}};
        });
    }
    function current(entry) {
        const keys=entry.composite.controls.flatMap((control,i)=>selected(control,entry.composite.rows[i])?[entry.question.options[i].key]:[]).sort();
        const field=entry.composite.answerField;
        if(field){
            const value=String(field.value||'').trim();
            if(!field.isConnected || (value && (!/^[A-T]+$/.test(value)||[...value].sort().join(',')!==keys.join(','))) || (!value&&keys.length))
                throw Error('组合子题的显示与保存字段不一致，保留作答并停止');
        }
        return keys.join(',');
    }
    function read(entry){const state=current(entry);return{id:entry.question.id,choices:state?state.split(','):[]};}
    function preflight(entry, answer) {
        globalThis.XxtCodexCore.validateAnswers([entry.question],{answers:[{readable:true,confidence:1,explanation:'',...answer}]});
        const state=current(entry), previous=owned.get(entry.element);
        if ((previous!==undefined && previous!==state) || (previous===undefined && state)) throw Error('阅读/完形子题已有或手动选择，保留现有作答');
        if (entry.composite.controls.some(control=>!control.isConnected||control.disabled)) throw Error('阅读/完形子题控件已变化');
    }
    async function apply(entry, answer, guard) {
        preflight(entry,answer);
        for (const [i,control] of entry.composite.controls.entries()) {
            guard();const row=entry.composite.rows[i], desired=answer.choices.includes(entry.question.options[i].key);
            if (selected(control,row)!==desired && (entry.question.type==='multiple'||desired)) control.click();
        }
        guard();const state=current(entry);
        if (state !== [...answer.choices].sort().join(',')) throw Error('阅读/完形子题未正确选中，取消提交');
        owned.set(entry.element,state);
    }
    globalThis.XxtCompositeQuestions={extract,read,preflight,apply};
})();
