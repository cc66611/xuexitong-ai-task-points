/* Shared validation for the browser assistant and the local Codex bridge. */
(function (root) {
    const supported = new Set(['single', 'multiple', 'boolean','blank','essay','ordering','matching']);
    const pageQuestionLimit = 256;
    const questionTextLimit = 64000;
    const structuredQuestion = q => ['ordering','matching'].includes(q.type);
    const textQuestion = q => ['blank','essay','ordering','matching'].includes(q.type);
    const playbackRates = [1, 1.1, 1.2, 1.25, 1.5, 1.75, 2, 4, 8, 16];
    const normalizePlaybackRate = value => playbackRates.includes(Number(value)) ? Number(value) : 1;
    const normalizeVideoAdvance = value => Number(value) === 90 ? 90 : 100;
    function videoAdvanceReached(media, value) {
        if (media?.ended) return true;
        if (normalizeVideoAdvance(value) !== 90 || !media || media.seeking ||
            !(media.tagName === 'VIDEO' || media.mediaKind === 'video')) return false;
        const {currentTime, duration} = media;
        return Number.isFinite(currentTime) && currentTime >= 0 && Number.isFinite(duration) && duration > 0 && currentTime / duration >= 0.91;
    }
    function validateQuestions(questions, max = 20) {
        if (!Array.isArray(questions) || !questions.length || questions.length > max) throw new Error(`题目数量必须为 1–${max}`);
        const ids = new Set();
        for (const q of questions) {
            if (!q || typeof q.id !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(q.id) || ids.has(q.id)) throw new Error('题目标识无效或重复');
            ids.add(q.id);
            if (!supported.has(q.type)) throw new Error('不支持的题型');
            if (typeof q.text !== 'string') throw new Error(`题目 ${q.id} 的题干格式异常，未发送 AI`);
            if (q.text.length > questionTextLimit) throw new Error(`题目 ${q.id} 的题干共 ${q.text.length} 字符，超过单题 ${questionTextLimit} 字符限制；未截断、未发送 AI`);
            if (textQuestion(q)) {
                if (!Array.isArray(q.options) || q.options.length || !Number.isInteger(q.slots) || q.slots < 1 || q.slots > 20 || (q.type === 'essay' && q.slots !== 1)) throw new Error('文本题输入框映射无效');
                if (structuredQuestion(q)) {
                    const valid = items => Array.isArray(items) && items.length >= 2 && items.length <= 20 && new Set(items.map(item=>item?.key)).size === items.length &&
                        items.every(item=>item && typeof item.key==='string' && /^[A-Za-z0-9_-]{1,20}$/.test(item.key) && typeof item.text==='string' && item.text.trim() && item.text.length<=4000);
                    if (!valid(q.items) || (q.type==='ordering' ? q.slots!==q.items.length : !valid(q.prompts)||q.slots!==q.prompts.length)) throw Error('排序/连线项目映射无效');
                }
                continue;
            }
            if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 20) throw new Error('选项数量无效');
            const keys = new Set();
            for (const option of q.options) {
                if (!option || typeof option.key !== 'string' || !/^[A-T]$/.test(option.key) || keys.has(option.key) || typeof option.text !== 'string' || !option.text.trim() || option.text.length > 4000) throw new Error('选项无效或重复');
                keys.add(option.key);
            }
            if (q.type === 'boolean' && q.options.length !== 2) throw new Error('判断题应有两个选项');
        }
        return questions;
    }
    function validateAnswers(questions, result, { allowUncertain = false } = {}) {
        validateQuestions(questions, pageQuestionLimit);
        if (!result || !Array.isArray(result.answers) || result.answers.length !== questions.length) throw new Error('模型未返回全部题目的答案');
        const ids = new Set();
        return result.answers.map(answer => {
            const q = questions.find(item => item.id === answer.id);
            if (!q || ids.has(answer.id)) throw new Error('模型返回了重复或未知题目');
            ids.add(answer.id);
            if (typeof answer.readable !== 'boolean' || !Number.isFinite(answer.confidence) || answer.confidence < 0 || answer.confidence > 1) throw new Error('模型置信度或可读性无效');
            const uncertain = !answer.readable || answer.confidence < 0.8;
            if (!allowUncertain && !answer.readable) throw new Error(`题目 ${q.id} 截图无法可靠识别，停止作答`);
            if (!allowUncertain && uncertain) throw new Error(`题目 ${q.id} 的答案不确定，停止作答`);
            if (textQuestion(q)) {
                const unavailable=allowUncertain&&answer.readable===false&&answer.confidence<0.8&&Array.isArray(answer.texts)&&answer.texts.length===0;
                if (!unavailable&&(!Array.isArray(answer.texts) || answer.texts.length !== q.slots || answer.texts.some(s=>typeof s!=='string'||!s.trim()||s.length>8000))) {
                    const error=new Error('文本答案数量或内容无效');error.code='MODEL_TEXT_ANSWER_INVALID';throw error;
                }
                if(unavailable){
                    if(typeof answer.explanation!=='string'||answer.explanation.length>4000)throw Error('模型解释无效');
                    return{id:q.id,texts:[],choices:[],readable:false,confidence:answer.confidence,explanation:answer.explanation};
                }
                if (structuredQuestion(q) && (answer.texts.some(key=>!q.items.some(item=>item.key===key)) || (q.type==='ordering' && new Set(answer.texts).size!==q.slots))) throw Error('排序/连线答案缺失、重复或包含无效编号');
                if (typeof answer.explanation !== 'string' || answer.explanation.length > 4000) throw new Error('模型解释无效');
                return {id:q.id,texts:[...answer.texts],choices:[],readable:answer.readable,confidence:answer.confidence,explanation:answer.explanation};
            }
            if (!Array.isArray(answer.choices) || (!answer.choices.length && !(allowUncertain && uncertain)) || new Set(answer.choices).size !== answer.choices.length || answer.choices.some(key => !q.options.some(opt => opt.key === key))) throw new Error('模型选项无效');
            if (q.type !== 'multiple' && answer.choices.length !== 1 && !(allowUncertain && uncertain && !answer.choices.length)) throw new Error('单选题或判断题只能选择一项');
            if (typeof answer.explanation !== 'string' || answer.explanation.length > 4000) throw new Error('模型解释无效');
            return { id: q.id, choices: [...answer.choices].sort(), readable: answer.readable, explanation: answer.explanation, confidence: answer.confidence };
        });
    }
    function resolveAnswers(questions, result, { randomizeUncertain = false, random = Math.random } = {}) {
        return validateAnswers(questions, result, { allowUncertain: true }).map(answer => {
            const q = questions.find(item => item.id === answer.id);
            if(textQuestion(q)&&answer.texts.length!==q.slots)throw Error(`题目 ${q.id} 未返回可填写的文本答案，保留原输入；请检查题目截图或人工处理`);
            if (!randomizeUncertain || (answer.readable && answer.confidence >= 0.8)) return answer;
            if (structuredQuestion(q)) throw Error('排序/连线答案无法可靠确认，保留原输入');
            if (textQuestion(q)) {
                if (!answer.readable) throw new Error(`填空/简答题 ${q.id} 被模型标记为无法读清，保留原输入`);
                // A complete model candidate is a first attempt, not a random string.
                // Let platform scoring and the existing reference-answer retry judge it.
                return {...answer,lowConfidence:true};
            }
            const keys = q.options.map(option => option.key);
            const pick = () => keys[Math.min(keys.length - 1, Math.max(0, Math.floor(random() * keys.length)))];
            const choices = q.type === 'multiple' ? keys.filter(() => random() < 0.5) : [pick()];
            if (!choices.length) choices.push(pick());
            return { ...answer, choices: choices.sort(), randomized: true, explanation: '答案不确定，按设置随机填写；提交后读取平台正确答案。' };
        });
    }
    const normalizeQuestionText = value => String(value || '').replace(/^\s*\d+\s*[.、．]?\s*/, '')
        .replace(/【(?:单选题|多选题|判断题|填空题|简答题|论述题)】/g, '').replace(/\s+/g, '').trim();
    function recallAnswers(questions, learned = []) {
        const answers = [];
        for (const q of questions) {
            const candidates = learned.filter(item => item.question?.id === q.id && item.question.type === q.type &&
                normalizeQuestionText(item.question.text) === normalizeQuestionText(q.text) && item.question.imageKey === q.imageKey);
            if (candidates.length !== 1) continue;
            const item = candidates[0];
            if (textQuestion(q)) {
                if (q.slots === item.question.slots && Array.isArray(item.texts) && item.texts.length === q.slots && item.texts.every(s=>typeof s==='string'&&s.trim()&&s.length<=8000))
                    answers.push({id:q.id,texts:[...item.texts],choices:[],readable:true,confidence:1,explanation:'采用平台已显示的正确答案。',source:'platform'});
                continue;
            }
            const choices = [];
            for (const oldKey of item.choices || []) {
                const oldOption = item.question.options.find(option => option.key === oldKey);
                if (!oldOption) break;
                const matches = q.options.filter(option => option.text.replace(/\s+/g, '') === oldOption.text.replace(/\s+/g, '') && option.imageKey === oldOption.imageKey);
                if (matches.length !== 1) break;
                choices.push(matches[0].key);
            }
            if (!choices.length || choices.length !== item.choices?.length || new Set(choices).size !== choices.length || (q.type !== 'multiple' && choices.length !== 1)) continue;
            answers.push({ id: q.id, choices: choices.sort(), readable: true, confidence: 1, explanation: '采用平台已显示的正确答案。', source: 'platform' });
        }
        return answers;
    }
    function nextAction({ allCorrect, remaining, redoAvailable, resultKnown }) {
        if (!resultKnown || typeof allCorrect !== 'boolean') return 'wait';
        if (allCorrect === true) return 'advance';
        if (redoAvailable !== true || remaining === 0) return 'skip';
        if (remaining == null) return 'redo';
        if (!Number.isSafeInteger(remaining) || remaining < 0) return 'pause';
        return 'redo';
    }
    function validateHistory(history = []) {
        if (!Array.isArray(history) || history.length > 5) throw new Error('最多携带最近五轮成绩');
        return history.map(item => {
            if (!item || !Number.isFinite(item.finalScore) || !Number.isFinite(item.maxScore) || item.maxScore <= 0 || item.finalScore < 0 || item.finalScore > item.maxScore) throw new Error('历史成绩无效');
            const answers = item.answers || [], review = item.review || [];
            if (!Array.isArray(answers) || answers.length > 20 || !Array.isArray(review) || review.length > 20 || review.some(value => typeof value !== 'string' || value.length > 3000)) throw new Error('历史反馈无效');
            for (const answer of answers) {
                if (typeof answer.id !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(answer.id) || !Array.isArray(answer.choices) || answer.choices.length > 20 || answer.choices.some(value => !/^[A-T]$/.test(value))) throw new Error('历史选项无效');
                if (answer.texts && (!Array.isArray(answer.texts) || answer.texts.length>20 || answer.texts.some(s=>typeof s!=='string'||s.length>8000))) throw new Error('历史文本答案无效');
            }
            return { finalScore: item.finalScore, maxScore: item.maxScore, answers, review };
        });
    }
    function quietHoursAt(timestamp = Date.now()) {
        const hour = new Date(timestamp + 8 * 60 * 60 * 1000).getUTCHours();
        return hour >= 23 || hour < 7;
    }
    function validateContext(context = []) {
        if (!Array.isArray(context) || context.length > 20 || context.some(q => !q || typeof q.id !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(q.id) || typeof q.text !== 'string' || q.text.length > questionTextLimit) || context.reduce((n,q)=>n+q.text.length,0)>128000) throw Error('同份测验的阅读材料超出范围，未发送不完整材料');
        return context;
    }
    function answerLanguage(q){
        if(!textQuestion(q))return 'auto';
        const text=String(q.text||'').replace(/【(?:单选题|多选题|判断题|简答题|论述题|填空题|其它|其他)】|\[(?:essay|blank|简答题|论述题|填空题|其它|其他)\]/gi,'');
        const english=/(?:用|使用|以)(?:英语|英文)(?:来)?(?:作答|回答|说明|表达|写)|(?:answer|respond|write|explain)[^.!?\n]{0,35}\bin english\b|translat[^.!?\n]{0,60}\binto english\b|(?:译成|译为|翻译成|翻译为)(?:英语|英文)/i.test(text);
        const chinese=/(?:用|使用|以)(?:中文|汉语)(?:来)?(?:作答|回答|说明|表达|写)|(?:answer|respond|write|explain)[^.!?\n]{0,35}\bin chinese\b|translat[^.!?\n]{0,60}\binto chinese\b|(?:译成|译为|翻译成|翻译为)(?:中文|汉语)/i.test(text);
        if(english!==chinese)return english?'en':'zh';
        if(english&&chinese)return 'auto';
        const han=(text.match(/\p{Script=Han}/gu)||[]).length,latin=(text.match(/[a-z]/gi)||[]).length,words=(text.match(/[a-z]+(?:'[a-z]+)?/gi)||[]).length;
        return words>=3&&latin>=8&&han<=Math.max(4,latin*.08)?'en':han>=6?'zh':'auto';
    }
    function answerLanguageMismatches(questions,answers){
        return questions.filter(q=>answerLanguage(q)==='en').filter(q=>{
            const value=(answers.find(a=>a.id===q.id)?.texts||[]).join(' '),han=(value.match(/\p{Script=Han}/gu)||[]).length,latin=(value.match(/[a-z]/gi)||[]).length;
            return han>=6&&han>latin*.08;
        }).map(q=>q.id);
    }
    const api = { pageQuestionLimit, questionTextLimit, validateContext, answerLanguage, answerLanguageMismatches, validateQuestions, validateAnswers, resolveAnswers, recallAnswers, normalizeQuestionText, validateHistory, nextAction, quietHoursAt, playbackRates, normalizePlaybackRate, normalizeVideoAdvance, videoAdvanceReached };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.XxtCodexCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

