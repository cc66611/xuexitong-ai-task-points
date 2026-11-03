/* Homework policy/UI/controller. The real DOM adapter must be supplied after
 * user-selected page samples are checked. No speculative platform selectors.
 */
(function (root) {
    'use strict';
    const MODES = ['chapter','homework'];
    const normalize = (value = {}) => ({ mode: MODES.includes(value.mode) ? value.mode : 'chapter', subjective: value.subjective === 'ai' ? 'ai' : 'skip', after: ['none','save','submit'].includes(value.after) && (value.after !== 'submit' || value.subjective === 'ai') ? value.after : 'none' });
    const comparable = value => String(value ?? '').normalize('NFC').replace(/\r\n?/g,'\n').replace(/\u200b/g,'').replace(/\s+/g,' ').trim();
    function answerValue(question, answer) {
        if (!answer || answer.id !== question.id) return null;
        if (['single','multiple','boolean'].includes(question.type)) {
            const keys=answer.choices;
            if(!Array.isArray(keys)||!keys.length||keys.some(k=>typeof k!=='string'||!question.options?.some(o=>o.key===k))||new Set(keys).size!==keys.length||(question.type!=='multiple'&&keys.length!==1))return null;
            return {choices:[...keys].sort()};
        }
        if (['blank','essay','ordering','matching'].includes(question.type)) {
            if (!Array.isArray(answer.texts) || answer.texts.length !== question.slots || answer.texts.some(t=>typeof t!=='string'||!comparable(t))) return null;
            return {texts:answer.texts.map(comparable)};
        }
        return null;
    }
    function compare(questions, current, fresh) {
        const result={same:[],different:[],unavailable:[],details:[]};
        for(const q of questions){
            const left=current.filter(a=>a.id===q.id),right=fresh.filter(a=>a.id===q.id);
            const a=left.length===1?answerValue(q,left[0]):null;
            const b=right.length===1&&right[0].readable!==false&&(right[0].confidence===undefined||right[0].confidence>=0.8)?answerValue(q,right[0]):null;
            const state=!a||!b?'unavailable':JSON.stringify(a)===JSON.stringify(b)?'same':'different';
            result[state].push(q.id);result.details.push({id:q.id,number:q.number||q.id,state,current:a,fresh:b});
        }
        return result;
    }
    const fingerprint = value => JSON.stringify(value);
    function createController({adapter,ask,notify=()=>{},changed=()=>{}}) {
        let active=null,serial=0,round=0;
        const submissionStates=new Map();
        function cancel(){serial++;active?.abort();active=null;changed(false);}
        function scan(){if(!adapter||adapter.verified!==true)throw Error('作业页面结构尚未适配，请先提供题目、编辑框和按钮的F12采集结果。');const page=adapter.scan();if(!page?.identity||!page.questions?.length)throw Error('没有识别到可编辑的当前作业；请打开未提交作业。');if(new Set(page.questions.map(q=>q.id)).size!==page.questions.length)throw Error('题目标识重复，已停止以免填错位置。');return page;}
        async function execute(operation,value){
            if(active)throw Error('当前操作尚未结束，请等待或先按停止。');
            const policy=normalize(value);
            if(policy.mode!=='homework')throw Error('请先切换到作业模式。');
            const page=scan(),settings=fingerprint(policy),identity=page.identity,signature=fingerprint(page.questions),answers=fingerprint(adapter.read(page));
            if(operation==='answer'&&submissionStates.has(identity))throw Error('此作业已发起过提交，请先人工确认平台状态；本轮不重复填写或提交。');
            const token=++serial,controller=new AbortController();active=controller;changed(true);
            const guard=()=>{if(controller.signal.aborted||serial!==token)throw Error('操作已停止，旧答案不会写入。');adapter.assertCurrent?.();const now=scan();if(now.identity!==identity||fingerprint(now.questions)!==signature)throw Error('作业或题目已变化，已取消本次操作。');if(adapter.policy&&fingerprint(normalize(adapter.policy()))!==settings)throw Error('作业设置已变化，已取消本次操作。');};
            try{
                guard();
                const skipped=page.questions.filter(q=>q.type==='essay'&&policy.subjective==='skip');
                const questions=page.questions.filter(q=>!skipped.includes(q));
                if(!questions.length)throw Error('当前只有主观题，设置为不回答；原有内容保持不变。');
                const unknown=questions.filter(q=>!['single','multiple','boolean','blank','essay','ordering','matching'].includes(q.type));
                if(unknown.length)throw Error('有未适配题型，请先采集其结构；本次不填入、不保存、不提交。');
                notify(operation==='review'?'正在独立复查AI作答…':'正在分析当前作业…');
                // Each review is a fresh request. Prior answers are intentionally
                // absent from the question payload so they cannot anchor the model.
                const response=await ask({questions,signal:controller.signal,independent:true,operation});
                guard();
                if(fingerprint(adapter.read(page))!==answers)throw Error('作答内容在请求期间变化，已保留现有内容，请重新操作。');
                const fresh=response.answers;
                if(!Array.isArray(fresh))throw Error('AI没有返回有效答案。');
                const report=compare(questions,adapter.read(page),fresh);
                if(operation==='preview')return{questions,answers:fresh,skipped:skipped.map(q=>q.id)};
                if(operation==='review'){
                    const result={round:++round,...report,skipped:skipped.map(q=>q.id)};
                    notify(`第${round}轮复查：一致${report.same.length}题，不一致${report.different.length}题，无法比较${report.unavailable.length}题。`);
                    return result;
                }
                const missingText=questions.filter(q=>['blank','essay','ordering','matching'].includes(q.type)&&fresh.some(a=>a.id===q.id&&Array.isArray(a.texts)&&a.texts.length===0));
                if(missingText.length)throw Error(`第${missingText.map(q=>q.number||q.id).join('、')}题模型未能给出可填写的文本答案；本轮未填写，请检查截图或人工处理。`);
                if(questions.some(q=>fresh.filter(a=>a.id===q.id).length!==1||fresh.find(a=>a.id===q.id)?.readable===false||(fresh.find(a=>a.id===q.id)?.confidence!==undefined&&fresh.find(a=>a.id===q.id).confidence<0.8)||!answerValue(q,fresh.find(a=>a.id===q.id))))throw Error('部分题目没有可用答案或置信度不足，本次不写入、不保存、不提交。');
                guard();await adapter.apply(page,fresh,guard);guard();
                const written=compare(questions,adapter.read(page),fresh);
                if(written.different.length||written.unavailable.length)throw Error('填写结果未通过读取核对，未执行保存或提交。');
                if(policy.after!=='none'){
                    if(policy.after==='submit'&&(policy.subjective!=='ai'||skipped.length||page.questions.length!==questions.length))throw Error('仍有跳过题目，不能直接提交。');
                    if(!adapter.finish)throw Error('按钮行为尚未适配，已填写；请自行检查后处理。');
                    // A real adapter must distinguish clicked/unknown from an
                    // observed new success signal. Never retry an uncertain submit.
                    if(policy.after==='submit')submissionStates.set(identity,'pending');
                    const outcome=await adapter.finish(policy.after,{page,guard,signal:controller.signal});
                    if(outcome?.state!=='confirmed')throw Error('收尾操作结果未确认，请人工检查；脚本不会自动重复提交。');
                    if(policy.after==='submit')submissionStates.set(identity,'confirmed');
                }
                notify(policy.after==='none'?'已填写可处理题目；未执行额外保存或提交。':policy.after==='save'?'已观察到暂时保存成功。':'已观察到作业提交成功；成绩需以平台显示为准。');
                return {filled:questions.map(q=>q.id),skipped:skipped.map(q=>q.id),after:policy.after};
            } finally {if(serial===token){active=null;changed(false);}}
        }
        return {cancel,run:value=>execute('answer',value),review:value=>execute('review',value),preview:value=>execute('preview',value),get busy(){return !!active;}};
    }
    function mount({panel,host,actions,chapterNodes=[],onChange=()=>{},onReview=()=>{},onRun,onPreview,onError=()=>{},read=()=>({}),write=()=>{}}) {
        const doc=panel.ownerDocument;
        const style=doc.createElement('style');style.textContent=`
        [data-xxt-codex-panel] .xxt-mode-group{display:grid;gap:7px;grid-template-columns:repeat(3,minmax(0,1fr));margin:8px 0}
        [data-xxt-codex-panel] .xxt-mode-group[data-pair]{grid-template-columns:repeat(2,minmax(0,1fr))}
        [data-xxt-codex-panel] .xxt-mode-group button{min-width:0;min-height:44px;white-space:normal;text-wrap:balance;line-height:1.5;border-radius:12px;padding:10px 8px;color:var(--ink,#243450);background:var(--surface,rgba(255,255,255,.09));border:1px solid rgba(135,155,185,.4);box-shadow:0 3px 0 rgba(0,0,0,.2),inset 0 1px 0 rgba(255,255,255,.22);transform:translateY(-1px);font-size:13px}
        [data-xxt-codex-panel] .xxt-mode-group button[aria-pressed=true]{box-shadow:inset 0 3px 7px rgba(0,0,0,.26);transform:translateY(2px);border-color:var(--accent,#4084ff);font-weight:750;background:rgba(100,145,230,.15)}
        [data-xxt-codex-panel] .xxt-mode-group button:focus-visible{outline:2px solid var(--accent,#4084ff);outline-offset:3px}
        [data-xxt-codex-panel] .xxt-mode-group button[aria-disabled=true],[data-xxt-codex-panel] .xxt-mode-group button:disabled{opacity:.42;cursor:not-allowed;box-shadow:none;transform:none}
        [data-xxt-codex-panel] .xxt-homework-options{padding:12px;border:1px solid rgba(135,155,185,.3);border-radius:16px;margin:12px 0}
        [data-xxt-codex-panel] .xxt-homework-options p{line-height:1.65;font-size:12px;overflow-wrap:anywhere}
        [data-xxt-codex-panel] .xxt-homework-options h3{font-size:14px;margin:4px 0}
        [data-xxt-codex-panel] .xxt-review-details{padding:0 0 0 20px;font-size:12px;line-height:1.7}
        [data-xxt-codex-panel] [data-action=homework-review]{width:100%;min-height:44px}
        [data-xxt-codex-panel] .xxt-mode-dock{margin:3px 0 16px}
        [data-xxt-codex-panel] .xxt-mode-heading{display:flex;align-items:center;gap:7px;margin:0 2px 7px;font-size:11px;letter-spacing:.12em;color:var(--muted,#b7c9e1)}
        [data-xxt-codex-panel] .xxt-mode-heading::before{content:'';width:4px;height:11px;border-radius:2px;background:var(--accent,#f0cb83);box-shadow:0 0 8px #f0cb8326}
        [data-xxt-codex-panel] .xxt-mode-group.xxt-mode-rail{gap:0;margin:0;padding:3px;border:1px solid var(--line,#ffffff26);border-radius:19px;background:var(--surface,#ffffff0f);box-shadow:0 4px 14px #03071230,inset 0 1px 0 #ffffff29,inset 0 -1px 0 #02061045;isolation:isolate}
        [data-xxt-codex-panel] .xxt-mode-rail button{position:relative;display:flex;align-items:center;justify-content:center;gap:7px;min-height:64px;border:0!important;border-radius:0!important;padding:10px 4px 13px;background:var(--surface,#ffffff0f);box-shadow:inset 0 1px 0 #ffffff29,inset 0 -1px 0 #02061030;text-shadow:none;color:var(--ink,#f4f6fb);font-size:17px;font-weight:650;transform:none;transition:transform 130ms cubic-bezier(.23,1,.32,1),background-color 130ms cubic-bezier(.23,1,.32,1),box-shadow 130ms cubic-bezier(.23,1,.32,1),color 130ms ease}
        [data-xxt-codex-panel] .xxt-mode-rail button:first-child{border-radius:15px 0 0 15px!important}
        [data-xxt-codex-panel] .xxt-mode-rail button:last-child{border-radius:0 15px 15px 0!important}
        [data-xxt-codex-panel] .xxt-mode-rail button+button{border-left:1px solid var(--line,#ffffff26)!important}
        [data-xxt-codex-panel] .xxt-mode-rail button[aria-pressed=true]{z-index:1;color:var(--button-ink,#ffe6b8);background:var(--button,#e4b86326);box-shadow:inset 0 3px 7px #02061040,inset 0 1px 0 #ffffff29;transform:translateY(2px);font-weight:800}
        [data-xxt-codex-panel] .xxt-mode-rail button[aria-pressed=true]::after{content:'';position:absolute;bottom:7px;left:calc(50% - 11px);width:22px;height:2px;border-radius:2px;background:var(--accent,#f0cb83);box-shadow:0 0 8px #f0cb8359}
        [data-xxt-codex-panel] .xxt-mode-rail svg{width:22px;height:22px;flex:none;filter:drop-shadow(0 1px 1px #0004)}
        [data-xxt-codex-panel] .xxt-mode-rail button:focus-visible{outline:2px solid var(--accent,#f0cb83);outline-offset:-4px;z-index:2}
        [data-xxt-codex-panel] .xxt-mode-rail button:active:not([aria-disabled=true]){transform:translateY(3px);box-shadow:inset 0 3px 7px #02061040,inset 0 1px 0 #ffffff29}
        [data-xxt-codex-panel] .xxt-mode-rail[data-keyboard=true] button{transition:none}
        @media(prefers-reduced-motion:reduce){[data-xxt-codex-panel] .xxt-mode-rail button{transition:none}}
        @media(forced-colors:active){[data-xxt-codex-panel] .xxt-mode-rail button[aria-pressed=true]{outline:2px solid Highlight;outline-offset:-4px}}
        [data-xxt-codex-panel] [data-homework-hidden=true]{display:none!important}`;
        doc.head.append(style);
        const make=(tag,text)=>{const n=doc.createElement(tag);if(text)n.textContent=text;return n;};
        let state=normalize(read()),disposed=false,viewSerial=0;
        function group(name,items,pair=false){const box=make('div');box.className='xxt-mode-group';box.setAttribute('role','group');box.setAttribute('aria-label',name);if(pair)box.dataset.pair='true';for(const [value,label]of items){const b=make('button',label);b.type='button';b.dataset.choice=value;b.dataset.choiceGroup=name;b.setAttribute('aria-pressed','false');box.append(b);}return box;}
        const mode=group('学习板块',[['chapter','章节'],['homework','作业']],true);mode.dataset.homeworkModes='true';
        mode.classList.add('xxt-mode-rail');
        const iconPaths={chapter:['M3 4.5c3-1 6-.7 9 1v15c-3-1.7-6-2-9-1z','M21 4.5c-3-1-6-.7-9 1v15c3-1.7 6-2 9-1z','M6 8h3M6 11h3M15 8h3M15 11h3'],homework:['M9 4H6a2 2 0 0 0-2 2v14h16V6a2 2 0 0 0-2-2h-3','M9 2h6v4H9z','m8 13 3 3 5-6']};
        for(const button of mode.children){const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.7');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');for(const d of iconPaths[button.dataset.choice]){const path=doc.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',d);svg.append(path);}const label=make('span',button.textContent);button.replaceChildren(svg,label);}
        const modeDock=make('div');modeDock.className='xxt-mode-dock';modeDock.append(Object.assign(make('p','学习板块'),{className:'xxt-mode-heading'}),mode);
        mode.addEventListener('keydown',()=>{mode.dataset.keyboard='true';});mode.addEventListener('pointerdown',()=>{delete mode.dataset.keyboard;});
        const section=make('section');section.className='xxt-homework-options';section.dataset.homeworkOptions='true';section.setAttribute('aria-label','作业设置');
        const beta=make('p');beta.dataset.homeworkBeta='true';
        const betaTitle=make('strong','作业功能 · 测试版');
        const betaLink=make('a','提交 Issue');betaLink.href='https://github.com/cc66611/xuexitong-ai-task-points/issues/new/choose';betaLink.target='_blank';betaLink.rel='noopener noreferrer';
        beta.append(betaTitle,make('br'),doc.createTextNode('作业功能仍在开发完善中，欢迎试用并反馈问题、意见和建议。可通过 '),betaLink,doc.createTextNode(' 一起完善功能。'));section.append(beta);
        const subjective=group('主观题',[['skip','简答题不回答'],['ai','简答题由AI回答并填入']],true);
        const after=group('作答后',[['none','作业作答后不提交'],['save','作业作答后暂时保存'],['submit','作业作答后直接提交']]);
        const notice=make('p');notice.dataset.homeworkNotice='true';notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
        const review=make('button','复查AI作答');review.type='button';review.dataset.action='homework-review';
        const result=make('p','尚未复查。复查会重新调用AI，可能产生API费用。');result.dataset.homeworkReviewResult='true';result.setAttribute('role','status');result.setAttribute('aria-live','polite');
        const list=make('ol');list.className='xxt-review-details';list.dataset.homeworkReviewDetails='true';
        section.append(make('h3','主观题处理'),subjective,make('p','“简答题”也包括计算题、论述题等需要输入文字的主观题。默认只答客观题，保留主观题已有内容。'),make('h3','作答结束后'),after,make('p','不提交：脚本不额外点击保存或提交；平台自身可能自动保存。选择主观题由AI回答后，才能选择直接提交。'),notice,review,result,list,make('p','复查只对比当前填写，不覆盖答案、不保存、不提交。填空和主观题按文字比较；意思相同但写法不同也可能标为不一致。多次一致不代表答案正确。'));
        const priorHidden=new Map(chapterNodes.filter(Boolean).map(n=>[n,n.hidden]));
        const routeAction=event=>{if(state.mode!=='homework')return;const action=event.target.closest('[data-action]')?.dataset.action;if(!['start','solve'].includes(action))return;event.preventDefault();event.stopImmediatePropagation();const fail=message=>{notice.textContent=message;onError(message);};const fn=action==='start'?onRun:onPreview;if(!fn){fail('请先手动打开当前作业，再点击作答或预览。');return;}void Promise.resolve().then(()=>fn({...state})).catch(e=>fail(e.message));};
        actions?.addEventListener('click',routeAction,true);
        const originalStart=actions?.querySelector('[data-action="start"]')?.textContent;
        const originalPreview=actions?.querySelector('[data-action="solve"]')?.textContent;
        function render(){
            const work=state.mode==='homework';section.hidden=!work;panel.dataset.studyMode=state.mode;
            for(const box of [mode,subjective,after])for(const b of box.children){const prop=box===mode?'mode':box===subjective?'subjective':'after';b.setAttribute('aria-pressed',String(state[prop]===b.dataset.choice));}
            const submit=after.querySelector('[data-choice="submit"]');submit.disabled=state.subjective!=='ai';submit.title=submit.disabled?'先选择“简答题由AI回答并填入”才能直接提交':'';
            notice.textContent=state.subjective==='skip'?'当前默认：主观题不回答，直接提交不可选。':state.after==='submit'?'已选择直接提交；仅在所有题目填写且核对通过后执行。':'可选择暂时保存，或保持不提交。';
            for(const [node,hidden]of priorHidden){node.hidden=work||hidden;if(work)node.dataset.homeworkHidden='true';else delete node.dataset.homeworkHidden;}
            const start=actions?.querySelector('[data-action="start"]'),preview=actions?.querySelector('[data-action="solve"]');if(start)start.textContent=work?'作答当前作业':originalStart;if(preview)preview.textContent=work?'预览作业AI答案':originalPreview;
        }
        function select(prop,value){if(disposed)return;viewSerial++;onChange();state=normalize({...state,[prop]:value});write({...state});result.textContent='设置已变化，下一次复查将重新读取当前作答。';list.replaceChildren();render();}
        for(const b of mode.children)b.onclick=()=>select('mode',b.dataset.choice);
        for(const b of subjective.children)b.onclick=()=>select('subjective',b.dataset.choice);
        for(const b of after.children)b.onclick=()=>select('after',b.dataset.choice);
        const showReport=report=>{
            result.textContent=`第${report.round}轮：一致${report.same.length}题，不一致${report.different.length}题，无法比较${report.unavailable.length}题。`;
            const display=value=>(value?.texts||value?.choices||[]).join('；');
            list.replaceChildren();for(const item of report.details.filter(d=>d.state!=='same')){const line=make('li',`第${item.number}题：${item.state==='different'?'不一致':'无法比较'}。当前答案：${display(item.current)||'未填写'}；本次AI答案：${display(item.fresh)||'未返回可用答案'}`);line.dataset.questionId=item.id;list.append(line);}
            if(report.skipped?.length)list.append(make('li',`按当前设置略过${report.skipped.length}道主观题。`));
        };
        review.onclick=async()=>{if(review.disabled)return;const token=++viewSerial;review.disabled=true;result.textContent='正在重新请求AI，复查当前填写…';try{const report=await onReview({...state});if(!disposed&&token===viewSerial&&report)showReport(report);}catch(error){if(!disposed&&token===viewSerial)result.textContent=error.message;}finally{review.disabled=false;}};
        host.prepend(modeDock);const common=host.querySelector('.xxt-status-card');if(common)common.after(section);else modeDock.after(section);render();
        return {get state(){return {...state};},showReport,cancelReview(change=true){viewSerial++;if(change)onChange();result.textContent='复查已取消，当前填写保持不变。';},destroy(){disposed=true;viewSerial++;onChange();actions?.removeEventListener('click',routeAction,true);for(const [n,h]of priorHidden){n.hidden=h;delete n.dataset.homeworkHidden;}modeDock.remove();section.remove();style.remove();if(actions?.querySelector('[data-action="start"]'))actions.querySelector('[data-action="start"]').textContent=originalStart;if(actions?.querySelector('[data-action="solve"]'))actions.querySelector('[data-action="solve"]').textContent=originalPreview;delete panel.dataset.studyMode;}};
    }
    const api={normalize,comparable,answerValue,compare,createController,mount};
    if(typeof module==='object'&&module.exports)module.exports=api;
    root.XxtHomework=api;
})(typeof globalThis!=='undefined'?globalThis:this);
