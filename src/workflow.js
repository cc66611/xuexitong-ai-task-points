/* Bounded submit -> grade -> redo -> next workflow, coordinated with the video player. */
(() => {
    'use strict';
    if (typeof GM_getValue !== 'function') return;
    if (globalThis.XxtHomeworkRuntime?.ownsPage()) return;
    const R = globalThis.XxtTopicReading;
    const DG = globalThis.XxtDiscussion;
    const SA = globalThis.XxtShortAnswer;
    // Topic readers have their own foreground timer; never mount quiz/model controls there.
    if (R?.isReaderPage()) return;
    if (DG?.isTopicPage()) return;
    const D = XxtCodexDom;
    const F = XxtCodexDocuments;
    const documentDwellMs = 30000, documentScrollMs = 20000;
    const I = XxtCodexInterruptions;
    const Q = XxtVideoQuiz;
    const P = globalThis.XxtPageTasks;
    const taskPointsOnly = () => globalThis.XxtRelease?.taskPointsOnly === true || GM_getValue('xxt-task-points-only', true) !== false;
    let grantedTaskPoint = false;
    function scopedEntries(entries) {
        return taskPointsOnly() ? entries.filter(entry => P.required(P.containerFor(entry, pageWindow))) : entries;
    }
    function pendingTaskEntry(entry) {
        if (!taskPointsOnly()) return true;
        const container = P.containerFor(entry, pageWindow);
        return P.required(container) && !P.complete(container);
    }
    function enforceTaskScope() {
        if (!taskPointsOnly() || !automatic || stopped) return;
        if (coursePage()) {
            for (const [source, entry] of controlledFrames()) {
                const container = P.frameContainer(pageWindow, source);
                if (P.required(container) && !P.complete(container)) continue;
                if (entry.running || quizFrames.has(source)) post(source, 'stop', { target: entry.nonce });
                entry.running = false; quizFrames.delete(source);
            }
            // Also stop an already-playing optional player before doing anything else.
            for (const asset of P.scan(pageWindow).videos)
                if (!P.required(asset.container) || P.complete(asset.container)) asset.video?.pause();
        } else if (parentManaged && P.context(pageWindow).known) {
            const container = P.context(pageWindow).container;
            // Card documents may host their own required quiz/document directly;
            // their outer #iframe has no task wrapper. The inner task icons own
            // that work, while an explicit completed/optional outer wrapper wins.
            if (!container && P.scan(pageWindow).markers.some(marker=>!marker.done)) return;
            if (!P.required(container) || P.complete(container)) {
                automatic = false; stopped = true; epoch++; inFlight?.abort(); remoteVideo?.pause(); closeDocument();
            }
        }
    }
    function quizScope() {
        if (!taskPointsOnly()) return 'pending';
        const context = P.context(pageWindow);
        const entries = D.extract(document);
        const containers = [...new Set(entries.map(entry => entry.element.closest('.ans-attach-ct') || context.container))];
        if (!entries.length && context.container) containers.push(context.container);
        if (containers.length === 1 && P.required(containers[0])) return P.complete(containers[0]) ? 'completed' : 'pending';
        // An inaccessible worker needs an explicit lease from its task-point owner.
        if (!context.known && grantedTaskPoint && !containers.some(Boolean)) return 'pending';
        return 'unknown';
    }
    function assertQuizScope() {
        const state = quizScope();
        if (state !== 'pending') throw Object.assign(Error(state === 'completed' ? '任务点已完成，已取消后续作答。' :
            '无法确认本测验属于单个未完成任务点（可能混有非任务题），已暂停，未继续作答。'), { taskPointCompleted: state === 'completed' });
    }
    const videoLines = globalThis.XxtVideoLines?.create();
    const nonce = crypto.randomUUID();
    const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    const isTop = pageWindow === pageWindow.top;
    const tabId = sessionStorage.getItem('xxt-codex-tab') || nonce;
    sessionStorage.setItem('xxt-codex-tab', tabId);
    const courseParams = new URLSearchParams(location.search);
    const autoKey = `xxt-auto:${location.origin}/${courseParams.get('courseId') || courseParams.get('courseid') || ''}/${courseParams.get('clazzid') || courseParams.get('clazzId') || ''}`;
    let panel, themeStatus, automatic = false, busy = false, stopped = false, task = '', record = {}, inFlight;
    let apiFailureUntil=0,apiFailureShown=false,apiFailureAutomatic=false;
    const aiEnabled = () => GM_getValue('xxt-ai-enabled', !!GM_getValue('xxt-ai-config', {})?.key);
    const ledgerScope = `${autoKey}/${courseParams.get('cpi') || courseParams.get('personid') || tabId}`;
    const ledgerValid=()=>{const p=new URLSearchParams(location.search);return location.origin===new URL(autoKey.slice('xxt-auto:'.length)).origin &&
        (p.get('courseId')||p.get('courseid')||'')===(courseParams.get('courseId')||courseParams.get('courseid')||'') &&
        (p.get('clazzid')||p.get('clazzId')||'')===(courseParams.get('clazzid')||courseParams.get('clazzId')||'') &&
        !!(p.get('cpi')||p.get('personid')) && (p.get('cpi')||p.get('personid'))===(courseParams.get('cpi')||courseParams.get('personid'));};
    let retryQueue=null;
    let savedJumpSerial=0;
    const locator=XxtLocator.create({onCatalogChange:()=>{if(panel)notify(messageValue);}});
    let prefetchSerial=0;
    const catalogSnapshot=()=>locator.catalog(document.querySelector('#coursetree'));
    const knownTaskChapters=new Set(), noTaskChapters=new Set();
    const catalogKey=entry=>entry?`${entry.index}/${entry.title}`:'';
    const currentCatalogKey=()=>catalogKey(catalogSnapshot().find(entry=>entry.node.classList.contains('posCatalog_active')));
    function platformChapterComplete(view) {
        const entry=catalogSnapshot().find(item=>item.node.classList.contains('posCatalog_active'));
        return !!entry && !entry.node.classList.contains('firstLayer') && entry.completion==='completed' && !view.loading.length && !view.markers.some(marker=>!marker.done);
    }
    let noTaskDocument=null,noTaskSignature='',noTaskObservedAt=0;
    function noTaskPageReady(view) {
        if (view.markers.length) return true;
        if (view.loading.length) return false;
        const frame=document.querySelector('#iframe');
        let doc=document;
        if (frame) {try {doc=frame.contentDocument;}catch{return false;}}
        if (!doc?.body || doc.readyState==='loading' || doc.URL==='about:blank') return false;
        if ([...doc.querySelectorAll('[aria-busy="true"],.loading,.loadbox')].some(node=>D.visible(node))) return false;
        const signature=`${task}/${currentCard}/${view.signature}`;
        if (noTaskDocument!==doc || noTaskSignature!==signature) {noTaskDocument=doc;noTaskSignature=signature;noTaskObservedAt=Date.now();}
        // Absence is only meaningful after a loaded page's task inventory settles.
        return Date.now()-noTaskObservedAt>=5000;
    }
    const diagnostics = XxtDiagnostics.create({read:()=>GM_getValue('xxt-diagnostics',[]),write:value=>GM_setValue('xxt-diagnostics',value)});
    globalThis.XxtRequestProgress = info => { if (!stopped && !quietNow()) notify(info.correctingLanguage?`第 ${info.batch}/${info.total} 批的英文题返回了明显中文，正在纠正一次…`:`正在调用${info.kind === 'vision' ? '视觉' : info.kind === 'text' ? '文字' : '当前'}模型：第 ${info.batch}/${info.total} 批，共 ${info.count} 题…`); };
    let messageValue = '选择“不接入 AI”可直接开始；需要自动答题时再接入 AI。';
    let epoch = 0, frameClaimAt = 0, frameClaimTask = '', grantAt = 0, unloaded = false, parentManaged = false, navigationContent = null;
    let coordinator = null, coordinatorDistance = Infinity, expectedCheckTask = '', expectedVideoTask = '', navigationRequested = false;
    let expectedDocumentTask = '', documentReportedTask = '', openedDocument = null, documentOwner = null, grantedDocumentIds = null;
    let topicOwner = null, topicReportedTask = '';
    let discussionOwner = null;
    const skippedDiscussions = new Set();
    let pageReviewNeeded = false, pageSignature = '', pageChangedAt = 0, pageBlockedAt = 0;
    let pageVideo = null, pagePlaying = false, stepTransition = null, currentCard = '', stepDone = new Set();
    let startedVideos = new WeakSet();
    const recoveryAttempts = new Set();
    const skippedChapters = new Set();
    const skippedAssets = new Set();
    const skippedMarkers = new Set();
    const awaitingReviewAssets = new Set(), awaitingReviewMarkers = new Set(), awaitingReviewChapters = new Set();
    let recoverySerial = 0, recovering = false;
    const videoSettlements = new Map();
    const remoteSettlementRequests = new Set();
    let remoteSettlementMedia = '';
    let parentReadingFiles = false;
    const topicDone = new WeakSet();
    const verificationKey=autoKey+'/manual-verification';
    let backgroundManual=sessionStorage.getItem(verificationKey)==='1',verificationStopped=false,verificationReported=null;
    const verificationSources=new Map();
    const verificationPresent=()=>{let required=XxtManualVerification.requiresManual();for(const[source,entry]of verificationSources){if(!descendant(pageWindow,source)||!visibleDescendant(pageWindow,source))verificationSources.delete(source);else if(entry.required)required=true;}return required;};
    const verificationBlocked=()=>backgroundManual||verificationPresent();

    let quietPaused = false, resumeAfterQuiet = false, unknownSince = 0, unknownTask = '';
    const quietNow = () => GM_getValue('xxt-quiet-enabled', true) && XxtCodexCore.quietHoursAt();
    let selectedPlaybackRate = XxtCodexCore.normalizePlaybackRate(GM_getValue('xxt-playback-rate', 1));
    const getPlaybackRate = () => selectedPlaybackRate;
    let selectedVideoAdvance = XxtCodexCore.normalizeVideoAdvance(GM_getValue('xxt-video-advance',100));
    const advancedMedia = new Set();
    function changeVideoAdvance(value) {
        stop();selectedVideoAdvance=XxtCodexCore.normalizeVideoAdvance(value);advancedMedia.clear();
        GM_setValue('xxt-video-advance',selectedVideoAdvance);
        notify(`视频播放进度已设为 ${selectedVideoAdvance}%，请点击“开始自动”继续。`);
    }
    let selectedForceRate = GM_getValue('xxt-force-rate', false) === true;
    function forceRateInfo(info) {
        const label = info.kind === 'normal' ? '普通倍速：目标' + info.target + '× / 本媒体当前' + info.actual + '×（未安装强制锁）' : info.kind === 'failed' ? '强制倍速冲突：' + info.reason + '；可关闭再勾选重试。' :
            '强制倍速（高风险）：目标' + info.target + '× / 本媒体当前' + info.actual + '×' + (info.kind === 'fallback' ? '（有界重试模式）' : '');
        const output = panel?.querySelector('[data-setting="force-rate-status"]');
        if (output) output.textContent = label;
        if (!isTop) report('force-rate-info', { task: remoteVideoTask || task, value: label });
    }
    const forceRate = XxtForceRate.create({
        enabled: () => selectedForceRate && automatic && !stopped && !quietNow() && !(typeof verificationBlocked === 'function' && verificationBlocked()),
        onStatus: forceRateInfo,
        setNormalRate: applyOrdinaryRate
    });
    let selectedMuted = GM_getValue('xxt-video-muted', true) !== false;
    const tabAudio = globalThis.XxtAudio;
    const getMuted = () => tabAudio?.mediaMuted() ?? selectedMuted;
    let videoFinishProbe = null;
    // Count observable foreground time for UI response failures only. Reading timers,
    // API timeouts, frame ownership and quiet hours retain their own real clocks.
    const hiddenPeriods = [];
    let hiddenAt = document.hidden ? Date.now() : null, foregroundAt = 0;
    function uiTimedOut(since, timeout) {
        if (document.hidden || hiddenAt !== null || Date.now() - foregroundAt < 3000) return false;
        const now = Date.now();
        const hidden = hiddenPeriods.reduce((sum, [start, end]) => sum + Math.max(0, Math.min(now, end) - Math.max(since, start)), 0);
        return now - since - hidden > timeout;
    }
    function recheckForeground() {
        const now = Date.now();
        if (document.hidden) { if (hiddenAt === null) hiddenAt = now; return; }
        if (hiddenAt !== null) { hiddenPeriods.push([hiddenAt, now]); hiddenAt = null; foregroundAt = now; }
        if (!unloaded) void tick().catch(error => pause(error.message));
    }
    let remoteVideoTask = '', remoteVideoRate = selectedPlaybackRate, remoteVideo = null, remoteVideoEnded = false, remotePlayBusy = false, remotePlayAttempts = 0, remotePlayAt = 0;
    let remoteMediaId = '', remoteMediaIdentity = '';
    let renderedInPage = null;
    const visibilityObserver = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
        renderedInPage = entries.some(entry => entry.isIntersecting);
    }) : null;
    visibilityObserver?.observe(document.documentElement);
    const frames = new Map();
    const quizFrames = new Map();
    const skippedQuizWindows = new Set();
    const retiredQuizForms = new Set();
    const quizDocumentViews = new WeakMap();
    let quizAuthorized = false, videoQuizRun = null;
    const controlledFrames = () => new Map([...frames, ...quizFrames]);
    const hasVideoQuiz = () => Q.across(pageWindow).some(hit => !skippedQuizWindows.has(hit.win) && (!coursePage() || pendingTaskEntry(hit))) ||
        (coursePage() && [...quizFrames].some(([source, entry]) => pendingTaskEntry({win:source}) && entry.task === courseTask() && Date.now() - entry.at < 4000));
    const pendingConfirmations = new Map();
    let submitRequest = null;
    const completedSenders = new Set();
    const completedTasks = new Set();
    const completedMedia = new Set();
    const completedDocumentSenders = new Set();
    const completedFileAssets = new Set();
    const coursePage = () => !!document.getElementById('coursetree');
    function courseTask() {
        const active = document.querySelector('#coursetree .posCatalog_active');
        const name = active?.querySelector('.posCatalog_name');
        const params = new URLSearchParams(location.search);
        const course = params.get('courseId') || params.get('courseid') || '';
        const clazz = params.get('clazzid') || params.get('clazzId') || '';
        const index = [...document.querySelectorAll('#coursetree .posCatalog_select')].indexOf(active);
        return `${tabId}/${location.origin}/${course}/${clazz}/${index}/${name?.getAttribute('title') || D.text(name)}`;
    }
    function checkStep() {
        const steps = P?.steps(document), current = steps?.items[steps.index];
        if (current && /学习检测|学习测验|章节测验/.test(current.label)) return true;
        const el = document.querySelector('.prev_title');
        return /学习检测|学习测验|章节测验/.test(el?.title || D.text(el));
    }
    function localTask() {
        const params = new URLSearchParams(location.search);
        const work = params.get('workId') || params.get('workid') || params.get('jobid') || '';
        return `local/${tabId || nonce}/${location.origin}/${work || location.pathname}/${D.extract(document).map(entry => entry.question.id).join(',')}`;
    }
    function liveSkippedRecords(){
        const key=`xxt-skipped:${autoKey}`,records=GM_getValue(key,[])||[];
        const savedKey=`xxt-saved-quizzes:${autoKey}`;
        const migration=XxtSavedQuizzes.migrate(records,GM_getValue(savedKey,[])||[],ledgerScope);
        if(migration.changed)GM_setValue(savedKey,migration.saved);
        const current=ledgerValid()?XxtRunLedger.reconcile(migration.skipped,catalogSnapshot(),ledgerScope):migration.skipped;
        if(current!==records)GM_setValue(key,current);
        return current;
    }
    function cancelPrefetch(){
        locator.clear();prefetchSerial++;
        const output=panel?.querySelector('[data-prefetch-status]');
        if(output?.textContent.startsWith('正在预读'))output.textContent='预读已取消。';
    }
    async function preparePrefetch(){
        const output=panel?.querySelector('[data-prefetch-status]'),serial=++prefetchSerial;
        if(!output)return;
        if(!GM_getValue('xxt-prefetch',false)){output.textContent='预读已关闭；不影响正常学习。';return;}
        if(verificationBlocked()||quietNow()){output.textContent='预读已暂停：请先完成人工验证或等待休息结束。';return;}
        const entries=catalogSnapshot(),index=entries.findIndex(x=>x.node.classList.contains('posCatalog_active'));
        const next=entries.slice(index+1).filter(x=>x.title&&x.completion!=='completed').slice(0,4),urls=locator.urls(next,location.href);
        if(!urls.length){output.textContent='当前目录没有可用的同源章节链接，本页不支持预读；不影响正常学习。';return;}
        output.textContent=`正在预读 ${urls.length} 个章节入口…`;
        const values=await locator.prefetch(next,location.href);
        if(serial!==prefetchSerial||!GM_getValue('xxt-prefetch',false))return;
        const count=values.filter(Boolean).length;
        output.textContent=count?`已预读 ${count}/${urls.length} 个入口的页面结构；任务完成状态仍以实际页面为准。`:'预读未成功（连接、超时或页面类型不支持）；继续使用实际页面。';
    }
    let renderedSkipList, renderedSkipSignature;
    function notify(value) {
        if (previewWorker) previewMessage(previewWorker, 'preview-progress', value);
        messageValue = value;
        const output = panel?.querySelector('pre');
        if (output && output.textContent !== value) output.textContent = value;
        // Configuration and sleep state can change while the output stays the same.
        if (themeStatus) {
            const sleep = /夜间休息|已预约/.test(value);
            const status = sleep ? '夜间休息 · 北京时间' : (aiEnabled() ? '学习流程 · 多模型接入' : '学习流程 · 不接入 AI');
            if (themeStatus.textContent !== status) themeStatus.textContent = status;
            if (panel.dataset.sleeping !== String(sleep)) panel.dataset.sleeping = String(sleep);
        }
        const log = panel?.querySelector('[data-skipped-log]');
        if (log) {
            // Read current storage on every notification, including other frames' edits.
            const entries = liveSkippedRecords();
            const summary = log.querySelector('summary'), title = `跳过记录 · ${entries.filter(x=>!['reviewed','completed'].includes(x.status)).length} 项待复核`;
            if (summary.textContent !== title) summary.textContent = title;
            const list = log.querySelector('ul');
            const rows = entries.slice(-20).map(entry => `${entry.status==='completed'?'[目录已完成] ':entry.status==='reviewed'?'[已复核] ':''}${entry.chapter}：${entry.reason}`);
            const signature = JSON.stringify(rows);
            if (list !== renderedSkipList || signature !== renderedSkipSignature) {
                list.replaceChildren(...rows.map(text => { const item = document.createElement('li'); item.textContent = text; return item; }));
                renderedSkipList = list; renderedSkipSignature = signature;
            }
        }
        const savedLog=panel?.querySelector('[data-saved-quizzes]');
        if(savedLog){
            const entries=(GM_getValue(`xxt-saved-quizzes:${autoKey}`,[])||[]).filter(x=>x.scope===ledgerScope);
            const summary=savedLog.querySelector('summary'),title=`暂时保存的测验 · ${entries.length} 份`;
            if(summary.textContent!==title)summary.textContent=title;
            const list=savedLog.querySelector('ul'),signature=JSON.stringify(entries);
            if(list.dataset.signature!==signature){
                list.replaceChildren(...entries.slice(-20).map((entry,index)=>{
                    const item=document.createElement('li'),button=document.createElement('button'),note=document.createElement('p');
                    button.type='button';button.dataset.openSavedQuiz='true';button.textContent=`${entry.chapter}${entry.card?.label?' · '+entry.card.label:''} · 测验${entry.quizNumber||index+1} · ${entry.total||'?'}题${entry.legacy?'（旧暂存记录）':''}`;
                    button.onclick=()=>openSavedQuiz(entry).catch(error=>notify(error.message));
                    note.textContent=entry.reason||'曾确认保存成功，尚待手动核对提交状态。';note.style.cssText='margin:4px 0 10px;overflow-wrap:anywhere';item.append(button,note);return item;
                }));list.dataset.signature=signature;
            }
        }
        // Status synchronization is independent of local rendering; keep every message.
        if (coordinator && !coursePage()) post(coordinator, 'status', { task, value });
    }
    function showApiFailure(wasAutomatic) {
        if(apiFailureShown)return;
        apiFailureShown=true;apiFailureAutomatic=wasAutomatic;
        // Repeated failures in one automatic run do not extend the countdown.
        if(apiFailureUntil<=Date.now())apiFailureUntil=Date.now()+60000;
        themeStatus?.showApiFailure(apiFailureUntil,apiFailureAutomatic);
    }
    function checkRecordKey(value) {
        if (coursePage()) return `xxt-check:${value}`;
        const params=new URLSearchParams(location.search);
        const identity=params.get('workId')||params.get('workid')||params.get('oldWorkId')||params.get('jobid')||params.get('workAnswerId')||
            location.pathname+'?'+[...params].filter(([key])=>!['enc','cpi','ut','v','t','_'].includes(key)).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('&');
        // The coordinator's chapter task is shared by sibling homework frames.
        // Their grades, submission phase and answers must never share a record.
        return `xxt-check:${value}/work:${encodeURIComponent(identity)}`;
    }
    function save() { if (task) GM_setValue(checkRecordKey(task), record); }
    function setTask(value) {
        if (task === value) return;
        if(retryQueue?.current){const active=catalogSnapshot().find(x=>x.node.classList.contains('posCatalog_active'));if(active&&(active.index!==retryQueue.current.index||active.title!==retryQueue.current.title)){retryQueue=null;automatic=false;stopped=true;notify('检测到手动切章，已取消集中补做。');}}
        topicOwner?.cancel(); topicOwner = null; topicReportedTask = '';
        discussionOwner?.cancel(); skippedDiscussions.clear();
        pageReviewNeeded = false; pageSignature = ''; pageChangedAt = Date.now(); pageBlockedAt = 0;
        stepTransition = null; currentCard = ''; stepDone = new Set(); pageVideo = null;
        completedFileAssets.clear(); skippedAssets.clear(); skippedMarkers.clear(); skippedQuizWindows.clear();awaitingReviewAssets.clear();awaitingReviewMarkers.clear();
        videoSettlements.clear();advancedMedia.clear();
        if (coursePage() && task) {
            // iframe WindowProxy objects survive navigation. Retire the old
            // chapter's workers before their ended/finished state can be added
            // back to an otherwise empty inventory in the new chapter.
            for (const [source, entry] of frames) post(source, 'stop', { target: entry.nonce });
            frames.clear(); frameClaimAt = 0; frameClaimTask = '';
            for (const [source, entry] of quizFrames) {
                retiredQuizForms.add(`${entry.nonce}/${entry.signature}`);
                post(source, 'stop', { target: entry.nonce });
            }
            while (retiredQuizForms.size > 128) retiredQuizForms.delete(retiredQuizForms.values().next().value);
            quizFrames.clear();
        }
        closeDocument(); documentReportedTask = ''; documentOwner = null;
        task = value; record = GM_getValue(checkRecordKey(task), {}) || {}; epoch++;
    }
    function post(target, type, data = {}) { target.postMessage({ source: 'xxt-codex-0.3', type, nonce, ...data }, '*'); }
    function ancestorDistance(target) {
        let parent = pageWindow;
        for (let distance = 1; distance <= 8; distance++) {
            if (parent === parent.parent) break;
            parent = parent.parent;
            if (parent === target) return distance;
        }
        return Infinity;
    }
    function broadcast(type, data = {}) {
        let parent = pageWindow;
        for (let depth = 0; depth < 8 && parent !== parent.parent; depth++) {
            parent = parent.parent; post(parent, type, data);
        }
    }
    function report(type, data = {}) { if (coordinator) post(coordinator, type, data); else broadcast(type, data); }
    function chooseCoordinator(source) {
        const distance = ancestorDistance(source);
        if (!Number.isFinite(distance) || distance > coordinatorDistance) return false;
        coordinator = source; coordinatorDistance = distance;
        if (!coursePage() && panel) panel.hidden = true;
        return true;
    }
    function pauseVerificationMedia(win=pageWindow,depth=0){if(depth>7)return;try{for(const media of win.document.querySelectorAll('video,audio'))if(!media.paused)media.pause();for(const frame of win.document.querySelectorAll('iframe'))if(D.visible(frame))pauseVerificationMedia(frame.contentWindow,depth+1);}catch{}}
    function holdVerification(){
        if(isTop)globalThis.XxtCourseHub?.hold('人工验证需要手动处理，完成后请手动继续');
        discussionOwner?.cancel();
        if(!verificationStopped){cancelPrefetch();verificationStopped=true;cancelPreview('检测到人工验证，预览已取消。');forceRate.releaseAll();backgroundManual=true;sessionStorage.setItem(verificationKey,'1');resumeAfterQuiet=false;automatic=false;stopped=true;recoverySerial++;recovering=false;retryQueue=null;epoch++;inFlight?.abort();XxtAi.cancelImageTest();topicOwner?.cancel();cancelConfirmation();pendingConfirmations.clear();if(isTop&&coursePage())sessionStorage.removeItem(autoKey);record.paused=true;save();
            for(const[source,entry]of controlledFrames()){post(source,'stop',{target:entry.nonce});entry.running=false;}
        }
        stopPlayer();remoteVideo?.pause();pauseVerificationMedia();
        const holdChildren=(win,depth=0)=>{if(depth>7)return;for(let i=0;i<win.frames.length;i++){const child=win.frames[i];try{child.postMessage({source:'xxt-codex-0.3',type:'verification-hold'},'*');holdChildren(child,depth+1);}catch{}}};holdChildren(pageWindow);
        mount();notify(verificationPresent()?'检测到人工验证，自动操作已暂停。请手动输入验证码并提交；验证完成后点击“开始自动”继续。':'人工验证等待：确认验证已完成后，请点击“开始自动”继续。');
    }
    function inspectVerification(){
        const required=XxtManualVerification.requiresManual();
        if(!isTop&&verificationReported!==required){verificationReported=required;broadcast('manual-verification',{required});}
        if(required||backgroundManual||verificationPresent()){holdVerification();return true;}return false;
    }
    function releaseVerification(){backgroundManual=false;verificationStopped=false;sessionStorage.removeItem(verificationKey);}
    function pause(reason, allowRecovery = true) {
        if (taskPointsOnly()) allowRecovery = false;
        if(verificationPresent()){holdVerification();return;}
        forceRate.releaseAll();
        cancelPrefetch();
        if (allowRecovery) diagnostics.record(reason,{phase:'recovery'});
        const recover = allowRecovery && coursePage() && automatic && !stopped && !recovering && !unloaded;
        if(isTop&&!recover)globalThis.XxtCourseHub?.hold(String(reason));
        const recoveryReason = String(reason).replace(/[，,]?已暂停.*$/, '').replace(/[，,]?已停止[。.]?$/, '');
        if (quietPaused && quietNow()) { notify('夜间休息中（23:00—07:00，北京时间）'); return; }
        if (isTop && coursePage()) sessionStorage.removeItem(autoKey);
        closeDocument(); topicOwner?.cancel(); topicOwner = null;
        discussionOwner?.cancel();
        cancelConfirmation(); pendingConfirmations.clear();
        automatic = false; stopped = true; epoch++; inFlight?.abort(); XxtAi.cancelImageTest();
        record.paused = true; save(); notify(recover ? `${recoveryReason}，准备自动恢复…` : reason);
        if (coursePage()) { stopPlayer(); for (const [source, entry] of controlledFrames()) post(source, 'stop', { target: entry.nonce }); }
        if (!isTop && !coursePage()) report('pause', { reason, task });
        if (recover) void recoverAutomatic(recoveryReason);
    }
    function rememberSkipped(reason, discussion = null, quiz = null) {
        skippedChapters.add(courseTask());
        const chapter = D.text(document.querySelector('#coursetree .posCatalog_active .posCatalog_name')) || '当前章节';
        const key = `xxt-skipped:${autoKey}`;
        const list = GM_getValue(key, []) || [];
        const current=catalogSnapshot().find(x=>x.node.classList.contains('posCatalog_active'));
        const entry={chapter,title:current?.title || chapter,index:current?.index ?? -1,scope:ledgerScope,reason:String(reason).slice(0,300),at:Date.now(),
            uncertainSubmission:quiz?quiz.state==='uncertain':['submitted','redo-clicked'].includes(record.phase) || /提交|判题|成绩.*(?:未|没有|尚)|重做.*确认/.test(reason)};
        const old = list.find(x => x.scope === ledgerScope && x.index === entry.index && x.title === entry.title);
        if (discussion || old?.discussionSkips?.length) {
            entry.discussionSkips = [...(old?.discussionSkips || []), ...(discussion ? [{ title: String(discussion.title).slice(0,200), reason: String(reason).slice(0,1500), at: Date.now() }] : [])].slice(-20);
            entry.reason = (discussion ? '' : entry.reason + '；') + entry.discussionSkips.map(x => `讨论“${x.title}”：${x.reason}`).join('；');
            entry.uncertainSubmission ||= !!discussion?.uncertain;
        }
        if(quiz||old?.quizSkips?.length){
            const item=quiz?{...quiz,reason:String(reason).slice(0,1800),at:Date.now()}:null;
            entry.quizSkips=[...(old?.quizSkips||[]),...(item&&!old?.quizSkips?.some(prior=>prior.reason===item.reason)?[item]:[])].slice(-20);
            const prior=quiz?(entry.discussionSkips||[]).map(item=>`讨论“${item.title}”：${item.reason}`).join('；'):entry.reason;
            entry.reason=[prior,...entry.quizSkips.map(item=>item.reason)].filter(Boolean).join('；');
        }
        GM_setValue(key, XxtRunLedger.record(list,entry));
        notify(`已记录待复核：${chapter}，${reason}。继续处理其余内容…`);
    }
    function rememberSaved(reason,detail){
        const current=catalogSnapshot().find(x=>x.node.classList.contains('posCatalog_active'));
        const steps=P?.steps(document),step=steps?.items[steps.index];
        const chapter=current?.title||'当前测验';
        const entry={chapter,title:chapter,index:current?.index??-1,scope:ledgerScope,at:Date.now(),reason:String(reason).slice(0,1800),
            total:detail.total,essays:detail.essays,quizKey:detail.quizKey,quizNumber:detail.quizNumber||1,legacy:!detail.quizKey,card:step?{id:step.id,label:step.label}:null};
        const key=`xxt-saved-quizzes:${autoKey}`;GM_setValue(key,XxtSavedQuizzes.upsert(GM_getValue(key,[])||[],entry));
        notify(`已暂存 · 未提交：${chapter}。可从“暂时保存的测验”返回检查。`);
    }
    async function openSavedQuiz(entry){
        if(verificationBlocked()){holdVerification();return;}
        stop();const serial=++savedJumpSerial;let chapterOpened=false;
        const guard=()=>{if(serial!==savedJumpSerial||unloaded||verificationBlocked())throw Error('暂存测验跳转已取消');if(entry.scope!==ledgerScope)throw Error('暂存测验不属于当前账号或课程，未跳转');if(chapterOpened){const active=catalogSnapshot().find(x=>x.node.classList.contains('posCatalog_active'));if(active?.index!==entry.index||active.title!==entry.title)throw Error('检测到手动切章，已取消暂存测验定位');}};
        guard();
        if(!coursePage()){
            if(entry.quizKey&&SA.quizKey(pageWindow)===entry.quizKey){D.extract(document)[0]?.element.scrollIntoView({block:'center'});notify('当前已是该暂存测验；请手动核对，未开始自动作答。');return;}
            throw Error('请先返回原课程章节页，再从暂存列表打开；未跳转其他课程。');
        }
        if(!ledgerValid())throw Error('当前账号或课程标识已变化，请返回原课程后再打开暂存测验');
        const chapter=catalogSnapshot()[entry.index];
        if(!chapter||chapter.title!==entry.title)throw Error('课程目录已变化，无法安全定位原暂存章节，请手动打开');
        const title=chapter.node.querySelector('.posCatalog_name')||chapter.node;
        if(!D.enabled(title))throw Error('原暂存章节标题当前不可点击，请手动打开');
        if(!chapter.node.classList.contains('posCatalog_active')){navigationContent={task:courseTask(),signature:checkContent(),at:Date.now()};title.click();}
        const wait=async predicate=>{const since=Date.now();while(!predicate()){guard();if(!ledgerValid())throw Error('跳转期间账号或课程已变化，已取消');if(Date.now()-since>12000)return false;await D.delay(150);}guard();return true;};
        if(!await wait(()=>{const active=catalogSnapshot().find(x=>x.node.classList.contains('posCatalog_active'));return active?.index===entry.index&&active.title===entry.title;}))throw Error('暂存章节未能打开，请手动检查；未自动作答');
        chapterOpened=true;
        if(entry.card){
            if(!await wait(()=>P.steps(document).items.some(x=>x.id===entry.card.id&&x.label===entry.card.label)))throw Error('已打开暂存章节，原学习步骤尚未找到，请手动选择测验；未自动作答');
            const steps=P.steps(document),step=steps.items.find(x=>x.id===entry.card.id&&x.label===entry.card.label);
            if(step.index!==steps.index){if(!D.enabled(step.element))throw Error('已打开暂存章节，测验步骤不可点击，请手动选择');step.element.click();}
        }
        if(entry.legacy){notify('已打开旧暂存记录所属章节；旧记录未保存具体测验标识，请手动选择测验，未开始自动作答。');return;}
        let found;
        const ready=await wait(()=>{const matches=P.scan(pageWindow).questions.filter(asset=>SA.quizKey(asset.win)===entry.quizKey);found=matches.length===1?matches[0]:null;return !!found;});
        if(!ready)throw Error('已打开暂存章节，但未能唯一定位原测验，请手动核对；未自动作答');
        (found.frame||found.forms[0])?.scrollIntoView({block:'center'});found.forms[0]?.scrollIntoView({block:'center'});
        notify('已打开暂存测验，请手动检查或提交；未开始自动作答。');
    }
    function deferOwnedCheck(source, reason, detail) {
        beforeClick();
        if(!ledgerValid())throw Error('测验所属账号或课程标识已变化，请人工核对后再开始');
        const inventory=pageInventory(),assets=inventory?.questions.filter(asset=>asset.win===source)||[];
        if(assets.length!==1)throw Error('无法唯一确认待暂存或跳过的测验归属，请人工核对；未标记平台完成');
        const asset=assets[0];
        // Derive identity from the owned live frame rather than trusting child message fields.
        detail={...detail,quizKey:SA.quizKey(asset.win),quizNumber:inventory.questions.indexOf(asset)+1};
        skippedAssets.add(asset.id);
        if(asset.container)skippedMarkers.add(asset.container);
        for(const owner of asset.containers||[])skippedMarkers.add(owner);
        pageReviewNeeded=true;completedTasks.delete(courseTask());
        if(detail.state==='saved')rememberSaved(reason,detail);else rememberSkipped(reason,null,detail);
    }
    async function deferWholeQuiz(reason, detail, signature) {
        beforeClick();
        record.phase='short-answer-deferred';record.shortAnswer={...detail,signature,reason,at:Date.now()};save();
        if(coursePage()){deferOwnedCheck(pageWindow,reason,detail);return;}
        if(parentManaged){report('short-answer-deferred',{task,reason,detail});automatic=false;stopped=true;notify(reason);return;}
        if(detail.state==='saved')rememberSaved(reason,detail);else rememberSkipped(reason,null,detail);notify(reason);
        const next=D.findNext(document);
        if(next&&D.enabled(next)){beforeClick();next.click();automatic=false;}
        else {automatic=false;stopped=true;notify(`${reason}。未找到下一节入口，请手动返回课程继续。`);}
    }
    async function recoverAutomatic(reason, retryConnection = true) {
        const serial = ++recoverySerial, context = courseTask();
        const valid = () => !verificationBlocked() && serial === recoverySerial && context === courseTask() && !quietNow() && !unloaded;
        recovering = true;
        try {
            // Let the failed solver unwind before issuing the one bounded probe.
            await D.delay(200);
            if (!valid()) return;
            // The coordinator reads the first unresolved file, one at a time.
            // A later optional sibling must not absorb a required file's error.
            const optionalFile = pageInventory()?.documents.find(asset => !fileDone(asset));
            if (optionalFile?.entry?.taskPoint === 'optional' && /^文献任务(?:尚)?未完成/.test(reason)) {
                // No platform obligation exists for this supplementary file.
                // Treat it as handled, without inventing credit or a failed job.
                completedFileAssets.add(optionalFile.id);
                pageBlockedAt = 0; unknownSince = 0; unknownTask = '';
                notify('拓展资料未设任务点，继续本章其他内容；不记为任务未完成。');
                recovering = false;
                await start({ recovery: true });
                return;
            }
            if (retryConnection && aiEnabled() && !recoveryAttempts.has(context)) {
                recoveryAttempts.add(context);
                notify(`遇到问题：${reason}。自动测试 AI 并重新开始一次…`);
                try { await request('/health'); }
                catch (error) { if (!valid()) return; notify(`AI 测试未通过：${error.message}。记录本项后继续其余任务…`); }
                if (!valid()) return;
                pageBlockedAt = 0; unknownSince = 0; unknownTask = ''; videoFinishProbe = null;
                // Give the same ended media another wait, without clicking replay twice.
                for (const state of videoSettlements.values()) state.since = Date.now();
                recovering = false;
                await start({ recovery: true });
                return;
            }
            automatic = true; stopped = false;
            beforeClick();
            rememberSkipped(reason);
            const view = pageInventory();
            const video = view?.videos.find(asset => !skippedAssets.has(asset.id) &&
                (!videoDone(asset) || (asset.container && !P.complete(asset.container) && videoSettlements.has(asset.id))));
            const file = view?.documents.find(asset => !fileDone(asset));
            const marker = view?.markers.find(item => !item.done && !skippedMarkers.has(item.element) && item.kind !== 'check');
            const question = view?.questions.find(asset => !questionDone(asset));
            const asset = video || file || (!marker && question);
            if ((!aiEnabled() || !XxtAi.imageConfig()) && /视频弹题/.test(reason)) {
                for (const hit of Q.across(pageWindow)) skippedQuizWindows.add(hit.win);
                for (const [source, entry] of quizFrames) {
                    skippedQuizWindows.add(source);
                    post(source, 'stop', { target: entry.nonce });
                }
                quizFrames.clear();
            }
            if (asset) {
                skippedAssets.add(asset.id);
                let container = asset.container || asset.entry?.element.closest('.ans-attach-ct');
                try { container ||= asset.root?.frameElement?.closest('.ans-attach-ct'); } catch {}
                if (container) skippedMarkers.add(container);
                for (const owner of asset.containers || []) skippedMarkers.add(owner);
                if (asset.video) asset.video.pause();
            } else if (marker) skippedMarkers.add(marker.element);
            pageBlockedAt = 0; unknownSince = 0; unknownTask = ''; videoFinishProbe = null;
            completedTasks.delete(context);
            recovering = false;
            if (asset || marker) { await start({ recovery: true }); return; }
            await advanceCourse('当前内容重试后仍无法处理，已跳过并记录待复核', true);
        } catch (error) {
            if (valid()) pause(`无法继续导航：${error.message}，请手动进入下一节`, false);
        } finally { if (serial === recoverySerial) recovering = false; }
    }
    function pageInventory() {
        let view = P?.scan(pageWindow);
        if (view) for (const [source, entry] of frames) {
            if (!visibleDescendant(pageWindow, source)) continue;
            const list = entry.kind === 'video' ? view.videos : entry.kind === 'document' ? view.documents : entry.kind === 'check' ? view.questions : null;
            // A wrapper worker may own assets in its descendants. Do not invent an
            // extra "file" for that worker after the real file has already finished.
            if (!list || list.some(asset => covers(asset, source, entry.kind))) continue;
            list.push({ id: `agent:${entry.nonce}`, win: source, root: source, mediaKind: entry.mediaKind, video: null, entry: null });
        }
        if (view && taskPointsOnly()) {
            const fresh=coursePage()&&task===courseTask()&&!(navigationContent&&courseTask()!==navigationContent.task&&checkContent()===navigationContent.signature);
            const key=fresh?currentCatalogKey():'';
            if (view.markers.length && key) {knownTaskChapters.add(key);noTaskChapters.delete(key);}
            view=P.pendingView(view,pageWindow);
            if (coursePage() && platformChapterComplete(view)) view={...view,videos:[],documents:[],questions:[],loading:[],signature:'platform-complete:'+courseTask()};
        }
        if (view && view.signature !== pageSignature) { pageSignature = view.signature; pageChangedAt = Date.now(); }
        return view;
    }
    function covers(asset, source, kind) {
        if (kind === 'document') return asset.root === source || asset.win === source ||
            descendant(asset.root, source) || descendant(source, asset.root);
        if (kind === 'video' && !asset.video) return asset.root === source || descendant(asset.root, source);
        // A native video or quiz belongs to its own document, not to every
        // descendant worker underneath the course/card window.
        return asset.win === source;
    }
    function sourceFinished(asset, kind) {
        for (const [source, entry] of frames) {
            if (!covers(asset, source, kind)) continue;
            if (kind === 'video' && (entry.ended || completedMedia.has(`${entry.nonce}/${entry.mediaId}`))) return true;
            if (kind === 'document' && completedDocumentSenders.has(entry.nonce)) return true;
            if (kind === 'check' && completedSenders.has(entry.nonce)) return true;
        }
        return false;
    }
    function videoDone(asset) {
        if (taskPointsOnly() && P.complete(asset.container)) return true;
        if (skippedAssets.has(asset.id)) return true;
        try { if (Q.find(asset.win.document)) return false; } catch {}
        if (quizFrames.has(asset.win)) return false;
        const video = asset.video;
        const settlement = videoSettlements.get(asset.id);
        if (settlement?.settled && settlement.container === asset.container && settlement.video === video &&
            settlement.identity === (video ? video.currentSrc || video.src || '' : '') && P.complete(asset.container)) return true;
        if (!video) {
            const worker = [...frames].find(([source, entry]) => entry.kind === 'video' && covers(asset, source, 'video'))?.[1];
            if (worker?.running && !worker.ended && !completedMedia.has(`${worker.nonce}/${worker.mediaId}`))
                return P.complete(asset.container) && XxtCodexCore.videoAdvanceReached(worker, selectedVideoAdvance);
        }
        // Credit can turn green at 90%, before a final popup. Wait for ended
        // only for media started in this run. A previously completed player may
        // restore its old currentTime or autoplay before the user presses Start.
        if (video && startedVideos.has(video))
            return video.ended || (P.complete(asset.container) && XxtCodexCore.videoAdvanceReached(video, selectedVideoAdvance));
        return video?.ended || P.complete(asset.container) || sourceFinished(asset, 'video');
    }
    function fileDone(asset) { return skippedAssets.has(asset.id) || P.complete(asset.container) || (GM_getValue(`xxt-documents:${task}`, []) || []).includes(asset.entry?.id) ||
        completedFileAssets.has(asset.id) || (!asset.entry && sourceFinished(asset, 'document')); }
    function questionDone(asset) { return (taskPointsOnly() && P.complete(asset.container)) || awaitingReviewAssets.has(asset.id) || skippedAssets.has(asset.id) ||
        (!taskPointsOnly() && (sourceFinished(asset, 'check') || (asset.win === pageWindow && ['done','awaiting-review'].includes(record.phase)))); }
    function pendingMediaStep(view) {
        if (!view || view.videos.length) return '';
        const steps = P?.steps(document), card = steps?.items[steps.index];
        const title = document.querySelector('.prev_title');
        const label = card?.label || title?.title || D.text(title);
        // A cards document can finish loading before Chaoxing inserts its task
        // wrapper/player. An empty inventory is not completion of a media tab.
        if (/测验|检测|作业|考试/.test(label)) return '';
        const kind = /音频/.test(label) ? 'audio' : /视频/.test(label) ? 'video' : '';
        if (taskPointsOnly() && !view.markers.some(marker => marker.kind === kind && !marker.done)) return '';
        if (!kind || view.markers.some(marker => marker.kind === kind && marker.done)) return '';
        return kind;
    }
    function pendingKnowledge(view = pageInventory()) {
        if (!view) return false;
        return pendingMediaStep(view) || view.loading.length || view.videos.some(asset => !videoDone(asset)) || view.documents.some(asset => !fileDone(asset)) ||
            discussionOwner?.active || scopedEntries(DG?.find(pageWindow) || []).some(entry => !P.complete(entry.container) && !skippedDiscussions.has(entry.target || entry.element)) ||
            scopedEntries(R?.find(pageWindow) || []).some(entry => !P.complete(entry.container) && !topicDone.has(entry.element)) ||
            view.markers.some(marker => marker.kind !== 'check' && !marker.done && !skippedMarkers.has(marker.element));
    }
    function videoCandidate() {
        if (!coursePage() || !P || stepTransition) return null;
        return pageInventory().videos.find(asset => !videoDone(asset))?.video || null;
    }
    function blockPage(reason, timeout = 20000) {
        pageReviewNeeded = true; pageBlockedAt ||= Date.now();
        notify(reason);
        if (uiTimedOut(pageBlockedAt, timeout)) throw new Error(`${reason}，已暂停，保留当前章节`);
        return true;
    }
    function resetCard(id) {
        if (currentCard === id) return;
        if (currentCard) {
            for (const [source, entry] of controlledFrames()) post(source, 'stop', { target: entry.nonce });
            epoch++; inFlight?.abort(); XxtAi.cancelImageTest(); closeDocument(); topicOwner?.cancel(); topicOwner = null;
            discussionOwner?.cancel(); skippedDiscussions.clear();
            frames.clear(); quizFrames.clear(); stopPlayer();
            record = {}; save();
        }
        currentCard = id; expectedCheckTask = ''; expectedVideoTask = ''; expectedDocumentTask = '';
        videoSettlements.clear();advancedMedia.clear();
        skippedAssets.clear(); skippedMarkers.clear(); skippedQuizWindows.clear();awaitingReviewAssets.clear();awaitingReviewMarkers.clear();
        completedFileAssets.clear();
        documentReportedTask = ''; topicReportedTask = ''; navigationRequested = false; videoFinishProbe = null;
        pageReviewNeeded = false; pageSignature = ''; pageChangedAt = Date.now(); pageBlockedAt = 0; pageVideo = null;
    }
    function syncCard() {
        if (!P || !coursePage()) return false;
        const steps = P.steps(document), card = steps.items[steps.index];
        if (stepTransition) {
            let fresh = false;
            try { fresh = document.querySelector('#iframe')?.contentDocument !== stepTransition.previousDocument; } catch { fresh = true; }
            if (!card || card.id !== stepTransition.id || !fresh) return blockPage('正在等待当前学习步骤的新内容加载', 90000);
            stepTransition = null;
        }
        if (card) resetCard(card.id);
        return false;
    }
    function nextStudyStep() {
        if (!P) return false;
        const steps = P.steps(document), card = steps.items[steps.index];
        if (!card) return false;
        stepDone.add(card.id);
        const next = steps.items.find(item => !stepDone.has(item.id));
        if (!next) return false;
        beforeClick();
        let previousDocument;
        try { previousDocument = document.querySelector('#iframe')?.contentDocument; } catch {}
        stepTransition = { id: next.id, previousDocument };
        stopPlayer();
        next.element.click(); notify(`当前页任务已完成，进入本章步骤：${next.label}`);
        return true;
    }
    function settleEndedVideos(view) {
        for (const asset of view.videos) {
            if (skippedAssets.has(asset.id)) continue;
            // Never borrow a sibling's task icon, nor infer completion from the clock text.
            if (!asset.container || !view.markers.some(marker => marker.element === asset.container && ['video','audio'].includes(marker.kind))) continue;
            const audio = asset.mediaKind === 'audio', label = audio ? '音频' : '视频';
            const agent = [...frames].find(([source, entry]) => entry.kind === 'video' && covers(asset, source, 'video'));
            let state = videoSettlements.get(asset.id);
            if (state && (state.container !== asset.container || state.video !== asset.video || state.task !== task ||
                state.identity !== (asset.video ? asset.video.currentSrc || asset.video.src || '' : '') ||
                (!asset.video && (!agent || state.nonce !== agent[1].nonce || state.mediaId !== agent[1].mediaId)))) {
                videoSettlements.delete(asset.id); state = null;
            }
            if (P.complete(asset.container)) {
                if (state && !state.settled) {
                    state.settled = true;
                    if (state.clicked) {
                        asset.video?.pause();
                        if (state.source) post(state.source, 'stop', { target: state.nonce });
                    }
                    pageBlockedAt = 0;
                }
                continue;
            }
            const actuallyEnded = asset.video ? asset.video.ended : agent &&
                (agent[1].ended || completedMedia.has(`${agent[1].nonce}/${agent[1].mediaId}`));
            if (!state && !actuallyEnded) continue;
            if (!state) {
                state = { task, container: asset.container, video: asset.video, identity: asset.video ? asset.video.currentSrc || asset.video.src || '' : '', since: Date.now(), clicked: false,
                    source: agent?.[0], nonce: agent?.[1].nonce, mediaId: agent?.[1].mediaId };
                videoSettlements.set(asset.id, state);
            }
            if (state.settled) return blockPage(`${label}任务点重新变为未完成，请核对平台状态`);
            pageReviewNeeded = true;
            // Audio settles through the platform's normal ended/report handler.
            // Replaying a short audio is not the video replay recovery contract.
            if (audio) {
                if (uiTimedOut(state.since, 23000)) throw new Error('音频已播完，但对应任务点尚未结算，请核对平台状态');
                notify('音频已播完，等待对应任务点变绿后继续…');
                return true;
            }
            if (uiTimedOut(state.since, 23000)) throw new Error('视频已播完，重播恢复后任务点仍未结算或按钮不可用，已暂停，请手动核对');
            if (!state.clicked && Date.now() - state.since >= 3000) {
                if (asset.video) {
                    const replay = P.replayControl(asset.video);
                    if (replay) { beforeClick(); state.clicked = true; replay.click(); }
                } else if (agent && state.source) {
                    beforeClick(); state.clicked = true;
                    // Loading the real media source can rotate its ID after the
                    // original play grant. Authorize this exact ended media first.
                    post(state.source, 'grant-video', { target: state.nonce, task, mediaId: state.mediaId,
                        resume: true, rate: getPlaybackRate(), forceRate: selectedForceRate, muted: getMuted() });
                    post(state.source, 'settle-video', { target: state.nonce, task, mediaId: state.mediaId });
                }
            }
            notify(state.clicked ? '视频已播完，已尝试一次重播恢复，等待对应任务点变绿后继续…' : '视频已播完，等待对应任务点结算；仍未完成时尝试一次重播恢复…');
            return true;
        }
        return false;
    }
    async function coordinatePage() {
        if(verificationBlocked()){holdVerification();return true;}
        const view = pageInventory();
        if (!view) return false;
        const loadingMedia = pendingMediaStep(view);
        if (loadingMedia) return blockPage(`正在等待本页${loadingMedia === 'audio' ? '音频' : '视频'}组件加载，确认就绪后再处理测验…`, 90000);
        if(selectedVideoAdvance===90 || taskPointsOnly())for(const asset of view.videos){
            const agent=[...frames].find(([source,entry])=>entry.kind==='video'&&covers(asset,source,'video'));
            const media=asset.video||agent?.[1],key=asset.video||(agent&&`${agent[1].nonce}/${agent[1].mediaId}`);
            if(!key||advancedMedia.has(key)||media?.ended||!P.complete(asset.container)||!videoDone(asset)||(!taskPointsOnly()&&!XxtCodexCore.videoAdvanceReached(media,90)))continue;
            // This is a playback policy, never a synthetic ended or task-complete event.
            advancedMedia.add(key);asset.video?.pause();if(agent)post(agent[0],'stop',{target:agent[1].nonce});
            if(isTop)globalThis.XxtCourseHub?.mediaEnded();
            pageReviewNeeded=true;
        }
        if (discussionOwner?.active) return readDiscussions();
        for (const asset of view.videos) if (asset.video && !startedVideos.has(asset.video) && P.complete(asset.container)) asset.video.pause();
        if (settleEndedVideos(view)) return true;
        const pending = view.videos.find(asset => !videoDone(asset));
        if (pending) {
            if(isTop&&globalThis.XxtCourseHub?.mediaGate(pending.video||pending.id))return true;
            pageReviewNeeded = true;
            expectedVideoTask = task; expectedDocumentTask = ''; expectedCheckTask = '';
            if (pending.video) {
                pageBlockedAt = 0;
                const video = pending.video;
                const label = P.mediaLabel(video);
                // Apply preferences before a native play-button click: that click
                // can start playback immediately and bypass the paused branch.
                applyMediaRate(video);
                if (P.mediaKind(video) !== 'audio' && await recoverVideoLine(video, `${task}/${currentCard}`)) return true;
                startedVideos.add(video);
                if (pageVideo !== video) {
                    pageVideo?.pause(); window.app?._detachVideoEvents?.();
                    (video.closest('.video-js') || video).scrollIntoView({ block: 'center', behavior: 'auto' });
                    const play = (video.closest('.video-js') || video.parentElement)?.querySelector('.vjs-big-play-button,button.vjs-play-control');
                    if (video.readyState === 0 && D.enabled(play)) { beforeClick(); play.click(); }
                }
                pageVideo = video;
                if (!pagePlaying && video.paused) {
                    pagePlaying = true;
                    try {
                        if (window.app) { window.app.configs.autoplay = true; await window.app.play(); }
                        else { applyMediaRate(video); await video.play(); }
                        if (stopped || quietNow()) video.pause();
                    } catch (error) { if (!selectedMuted) audioBlocked(); else notify(`等待${label}可播放：${error.message}`); }
                    finally { pagePlaying = false; }
                }
                notify(`正在播放本页${label} ${view.videos.indexOf(pending) + 1}/${view.videos.length}，全部完成后再处理其他任务…`);
            } else {
                pending.container?.scrollIntoView({ block: 'center', behavior: 'auto' });
                const agent = [...frames].find(([source, entry]) => entry.kind === 'video' && covers(pending, source, 'video'));
                if (agent) grant(agent[0], agent[1]);
                else blockPage(`正在等待本页剩余${pending.mediaKind === 'audio' ? '音频' : '视频'}组件加载`);
            }
            return true;
        }
        if (view.videos.length) pageReviewNeeded = true;
        if (pageVideo) { pageVideo = null; pageReviewNeeded = true; stopPlayer(); }
        const file = view.documents.find(asset => !fileDone(asset));
        if (file) {
            pageReviewNeeded = true; expectedVideoTask = ''; expectedDocumentTask = task;
            file.entry?.element.scrollIntoView({ block: 'center', behavior: 'auto' });
            const agent = [...frames].find(([source, entry]) => entry.kind === 'document' && !completedDocumentSenders.has(entry.nonce) && covers(file, source, 'document'));
            if (agent) { documentOwner = agent[0]; grant(agent[0], agent[1]); }
            else if (file.entry) {
                parentReadingFiles = true;
                try { await readDocuments([file.entry]); }
                finally { parentReadingFiles = false; }
            }
            else blockPage('等待本页文献组件接入');
            return true;
        }
        if (view.documents.length) pageReviewNeeded = true;
        if (view.loading.length) return blockPage('正在等待页面任务或成绩加载，请稍候…', 90000);
        if (scopedEntries(R?.find(pageWindow) || []).some(entry => !P.complete(entry.container) && !topicDone.has(entry.element))) { await readTopics(); return true; }
        if (await readDiscussions()) return true;
        const pendingMarker = view.markers.find(marker => marker.kind !== 'check' && !marker.done && !skippedMarkers.has(marker.element));
        if (pendingMarker) return blockPage(pendingMarker.kind === 'unknown' ? '存在无法识别且尚未完成的任务点' : '正在等待平台确认本页知识任务点完成');
        pageBlockedAt = 0;
        const question = view.questions.find(asset => !questionDone(asset));
        if (question) { expectedCheckTask = task; expectedVideoTask = ''; }
        if (question && question.win !== pageWindow) {
            question.frame?.scrollIntoView({ block: 'center', behavior: 'auto' });
            const agent = [...frames].find(([source, entry]) => entry.kind === 'check' && source === question.win);
            if (agent) { expectedCheckTask = task; grant(agent[0], agent[1]); }
            else notify('等待本页检测组件接入…');
            return true;
        }
        if (!view.questions.length && (view.markers.some(marker => marker.kind === 'check' && !marker.done) || (!taskPointsOnly() && checkStep())))
            return blockPage('学习检测已打开，正在等待题目组件加载或识别', 90000);
        if ((skippedAssets.size || skippedMarkers.size) && !pendingKnowledge(view) && view.questions.every(questionDone)) {
            await advanceCourse('已处理可识别任务，其余已记录待复核'); return true;
        }
        return false;
    }
    async function readDiscussions() {
        if (!DG || !coursePage()) return false;
        const entries = scopedEntries(DG.find(pageWindow)).filter(entry => !skippedDiscussions.has(entry.target || entry.element));
        if (!discussionOwner?.active && !entries.some(entry => !P.complete(entry.container))) return false;
        if (!ledgerValid()) { discussionOwner?.cancel(); pause('讨论所属账号或课程标识已变化，请人工核对后再开始。', false); return true; }
        discussionOwner ||= DG.createOwner({ notify, ask: payload => request('/solve', payload), assertCurrent: () => {
            beforeClick();
            if (!ledgerValid()) throw Error('讨论的账号或课程标识无法确认，已取消');
        } });
        pageReviewNeeded = true; expectedVideoTask = ''; expectedDocumentTask = ''; pageBlockedAt = 0;
        const outcome = await discussionOwner.step(entries, ledgerScope);
        if (outcome?.state === 'blocked') { pause(outcome.reason, false); return true; }
        if (outcome && ['skipped','uncertain'].includes(outcome.state)) {
            const entry = outcome.entry;
            skippedDiscussions.add(entry.target || entry.element);
            if (entry.container) skippedMarkers.add(entry.container);
            rememberSkipped(outcome.reason, { title: entry.label, uncertain: outcome.state === 'uncertain' });
        }
        return !!outcome;
    }
    async function recoverVideoLine(video, context) {
        const result = videoLines?.step(video, context, () => {
            if (!automatic || stopped || quietNow() || Q.find(video.ownerDocument)) throw new Error('自动操作已暂停，取消视频切线');
        });
        if (!result) return false;
        if (result.failed) throw new Error(result.message);
        if (coursePage()) notify(result.message);
        else report('status', { task: remoteVideoTask, value: result.message });
        if (result.resume) {
            applyMediaRate(video);
            try { await video.play(); } catch {}
        }
        return !result.recovered;
    }
    function transitionBlocked(includeChecks = false) {
        const view = pageInventory();
        if (!view) return false;
        pageReviewNeeded = true;
        if (taskPointsOnly() && !platformChapterComplete(view) && !view.markers.length && !noTaskPageReady(view)) return blockPage('正在确认页面已加载并且确实没有任务点，请稍候…');
        if (pendingKnowledge(view) || (includeChecks && view.questions.some(asset => !questionDone(asset)))) return true;
        if (includeChecks && view.markers.some(marker => !marker.done && !skippedMarkers.has(marker.element) && !awaitingReviewMarkers.has(marker.element))) return blockPage('平台仍有任务点未完成');
        if (Date.now() - pageChangedAt < 2000) { notify('正在复核本页任务清单，等待内容稳定…'); return true; }
        return false;
    }
    function request(path, payload) {
        if(verificationBlocked()){holdVerification();throw Error('请先完成人工验证，再点击开始自动');}
        if (!aiEnabled()) throw new Error('不接入 AI 模式不会发送模型请求');
        const requestEpoch=epoch,wasAutomatic=automatic||recovering;
        const job = XxtAi.request(path, payload); inFlight = job;
        return job.promise.catch(error=>{
            const category=diagnostics.record(error,{phase:'request'});
            if(category.code!=='CANCELLED' && requestEpoch===epoch && !unloaded && !quietNow() && aiEnabled()){
                showApiFailure(wasAutomatic);
                if(!isTop&&!coursePage())report('ai-call-failed',{task,wasAutomatic});
            }
            throw error;
        }).finally(() => {
            // A finished connection test must not keep the grade/redo scheduler
            // locked. An older request must never clear a newer request's handle.
            if (inFlight === job) inFlight = null;
        });
    }
    function beforeClick() {
        if(isTop&&!globalThis.XxtCourseHub?.validContext?.()&&globalThis.XxtCourseHub){globalThis.XxtCourseHub.hold('课程或账号已变化');throw Error('课程队列上下文已变化，请手动核对后继续');}
        if(verificationBlocked()){holdVerification();throw Error('请先手动完成人工验证');}
        if(retryQueue&&!ledgerValid()){retryQueue=null;stopped=true;automatic=false;throw new Error('课程或账号标识已变化，补做已取消');}
        if (quietNow()) { suspendForQuiet(); throw new Error('夜间休息中，暂停自动操作'); }
        if (stopped || !automatic) throw new Error('自动操作已停止');
        if (!task) throw new Error('检测上下文缺失');
        if (coursePage() && task !== courseTask()) throw new Error('章节已切换，取消旧任务');
        dismissInterruptions();
    }
    function applyOrdinaryRate(video, rate) {
        // Use an existing player only; never create/reinitialize one or call play.
        const realm = video.ownerDocument.defaultView, shell = video.closest('.video-js');
        const candidates = [video.player, video.player_, shell?.player];
        try {
            const id = shell?.id || video.id;
            if (id && typeof realm.videojs?.getPlayer === 'function') candidates.push(realm.videojs.getPlayer(id));
            if (realm.videojs?.players) candidates.push(...Object.values(realm.videojs.players));
        } catch {}
        for (const player of new Set(candidates)) {
            try {
                if (!player || typeof player.playbackRate !== 'function' || player.isDisposed?.()) continue;
                const container = player.el_ || player.el?.();
                if (!container?.contains(video)) continue;
                if (player.playbackRate() !== rate) player.playbackRate(rate);
                break;
            } catch { /* Fall back to the original DOM setter. */ }
        }
        try { if (video.playbackRate !== rate) video.playbackRate = rate; } catch {}
    }
    function applyMediaRate(video, rate = selectedPlaybackRate) {
        if (video && !(selectedForceRate && forceRate.apply(video, rate))) applyOrdinaryRate(video, rate);
        if (video && video.muted !== getMuted()) video.muted = getMuted();
    }
    function syncPlaybackRate() {
        if (window.app?.configs) window.app.configs.playbackRate = selectedPlaybackRate;
        remoteVideoRate = selectedPlaybackRate;
        if (!automatic || stopped || quietNow()) return;
        const visit = (win, depth = 0) => {
            if (depth > 6) return;
            try {
                for (const video of P.playable(win.document)) applyMediaRate(video);
                for (const frame of win.document.querySelectorAll('iframe')) if (D.visible(frame)) visit(frame.contentWindow, depth + 1);
            } catch {}
        };
        visit(pageWindow);
        if (coursePage()) for (const [source, entry] of controlledFrames()) post(source, 'set-playback-rate', { target: entry.nonce, task: courseTask(), rate: selectedPlaybackRate, forceRate: selectedForceRate });
    }
    function changePlaybackRate(value) {
        selectedPlaybackRate = XxtCodexCore.normalizePlaybackRate(value);
        GM_setValue('xxt-playback-rate', selectedPlaybackRate); forceRate.releaseAll(true); syncPlaybackRate();
    }
    function changeForceRate(value) {
        selectedForceRate = !!value;
        GM_setValue('xxt-force-rate', selectedForceRate);
        forceRate.releaseAll(true);
        const status = panel?.querySelector('[data-setting="force-rate-status"]');
        if (status) status.textContent = selectedForceRate ? '已启用按需强制：先普通倍速，速度被拒绝或复位时再强制；请开始自动。' : '强制倍速已关闭，恢复普通倍速设置。';
        syncPlaybackRate();
        if (coursePage() && (!automatic || stopped)) for (const [source, entry] of controlledFrames())
            post(source, 'set-playback-rate', { target: entry.nonce, task: courseTask(), rate: selectedPlaybackRate, forceRate: selectedForceRate });
    }
    let explicitMuteChange = false;
    function syncMuted() {
        const visit = (win, depth = 0) => {
            if (depth > 6) return;
            try {
                for (const video of P.playable(win.document)) if(selectedMuted || explicitMuteChange) video.muted = getMuted();
                for (const frame of win.document.querySelectorAll('iframe')) if (D.visible(frame)) visit(frame.contentWindow, depth + 1);
            } catch {}
        };
        visit(pageWindow);
        if (coursePage()) for (const [source, entry] of controlledFrames()) post(source, 'set-muted', { target: entry.nonce, task: courseTask(), muted: selectedMuted });
    }
    function changeMuted(value) {
        selectedMuted = !!value; GM_setValue('xxt-video-muted', selectedMuted);
        explicitMuteChange = true; syncMuted(); explicitMuteChange = false;
        void tabAudio?.setPreference(selectedMuted).then(()=>{explicitMuteChange=true;syncMuted();explicitMuteChange=false;});
    }
    function audioStatus() {
        const state=tabAudio?.status(); const output=panel?.querySelector('[data-audio-status]');
        if(output && state) output.textContent = state.state==='off' ? '脚本静音已关闭；原有手动标签页静音仍保留。' : state.state==='tab' ? '已确认浏览器标签页静音。' : state.state==='pending' ? '正在确认标签页静音，确认前保留播放器静音…' : '标签页静音不可用，已保留播放器静音；可重新勾选重试。';
    }
    function keepMediaMuted(event) {
        if(event.type==='play'&&verificationBlocked()){holdVerification();return;}
        const media = event.target;
        if (!media?.matches?.('video,audio') || !P?.playable(document).includes(media)) return;
        // Every frame reads the shared preference even before it is granted a
        // task. Player load/replay/volume reset must not undo a checked mute.
        selectedMuted = GM_getValue('xxt-video-muted', true) !== false;
        if(selectedMuted && media.muted!==getMuted()) media.muted=getMuted();
        if(!tabAudioStarted){tabAudioStarted=true;void tabAudio?.start();}
    }
    const audioBlocked = () => pause('浏览器阻止有声自动播放，请手动播放或勾选静音后重新开始');
    function dismissInterruptions() {
        if (!automatic || stopped || quietNow()) return;
        I.dismiss(pageWindow);
    }
    async function waitFor(test, timeout = 12000) {
        const since = Date.now(), currentEpoch = epoch;
        while (true) {
            beforeClick();
            if (currentEpoch !== epoch || unloaded) throw new Error('页面上下文已变化，取消旧等待');
            const value = test();
            if (value) return value;
            if (uiTimedOut(since, timeout)) throw new Error('页面响应超时，已停止，避免重复操作');
            await D.delay(200);
        }
    }
    function cancelConfirmation() {
        if (submitRequest && coordinator) post(coordinator, 'confirm-cancel', { task: submitRequest.task, requestId: submitRequest.id });
        submitRequest = null;
    }
    async function finishSubmission(assertCurrent = beforeClick) {
        const pending = { id: crypto.randomUUID(), task, kind: 'submit', confirmed: false };
        submitRequest = pending;
        if (coordinator) post(coordinator, 'confirm-request', { task, requestId: pending.id, kind: pending.kind });
        notify('已点击页面提交，正在等待并确认提交弹窗…');
        try {
            const outcome = await waitFor(() => {
                assertCurrent();
                const result = D.readResult(document);
                if (result) return { result };
                if (pending.confirmed) return { confirmed: true };
                const button = coordinator ? D.confirmation(document) : D.ancestorConfirmation(pageWindow);
                return button ? { button } : null;
            }, 20000);
            assertCurrent();
            if (outcome.button) { beforeClick(); outcome.button.click(); }
            record.confirmed = true; record.at = Date.now(); save();
            notify(outcome.result?.pendingReview?'已提交，待批阅；不重复提交，最终成绩以老师批阅为准。':`已提交第 ${record.submissions || 1} 轮，等待平台成绩…`);
        } finally { if (submitRequest === pending) cancelConfirmation(); }
    }
    function waitForSubmittedGrade() {
        if(D.readResult(document)?.pendingReview)return;
        // A confirmed submission may leave the old form visible while the platform
        // loads its graded view. Re-read once with GET; never click Submit again.
        if (!uiTimedOut(record.at, record.gradeReloaded ? 60000 : 30000)) return;
        if (!record.gradeReloaded) {
            record.gradeReloaded = true; record.at = Date.now(); save();
            notify('答案已提交，成绩加载较慢，正在刷新测验页读取成绩，请稍候…');
            pageWindow.location.reload();
            return;
        }
        throw new Error('已提交并刷新测验页，平台成绩仍未加载，请稍后复核');
    }
    async function finishRedo() {
        const pending = { id: crypto.randomUUID(), task, kind: 'redo', confirmed: false };
        submitRequest = pending;
        if (coordinator) post(coordinator, 'confirm-request', { task, requestId: pending.id, kind: pending.kind });
        notify('已点击重做，正在等待并确认重做弹窗…');
        try {
            const outcome = await waitFor(() => {
                if (pending.confirmed) return { confirmed: true };
                const button = coordinator ? D.confirmation(document, 'redo') : D.ancestorConfirmation(pageWindow, 'redo');
                if (button) return { button };
                if (D.enabled(document.querySelector('.btnSubmit.workBtnIndex')) && D.extract(document).length) return { form: true };
                const result = D.readResult(document);
                return result && result.fingerprint !== record.priorResult ? { result } : null;
            }, 20000);
            beforeClick();
            if (outcome.button) outcome.button.click();
            record.redoConfirmed = true; record.at = Date.now(); save();
            notify('已确认重做，正在等待新一轮题目…');
        } finally { if (submitRequest === pending) cancelConfirmation(); }
    }
    function tickConfirmations() {
        for (const [id, pending] of pendingConfirmations) {
            const owner = frames.get(pending.source);
            if (!automatic || stopped || pending.task !== courseTask() || owner?.nonce !== pending.nonce ||
                owner.kind !== 'check' || !canClaim(pending.source, owner) || Date.now() - pending.at > 20000) {
                pendingConfirmations.delete(id); continue;
            }
            const button = D.ancestorConfirmation(pageWindow, pending.kind);
            if (!button) continue;
            // Remove before clicking: repeated monitor ticks cannot confirm twice.
            pendingConfirmations.delete(id);
            button.click();
            post(pending.source, 'confirm-done', { target: pending.nonce, task: pending.task, requestId: id, kind: pending.kind });
            notify(pending.kind === 'redo' ? '已点击重做确认窗口的确定，等待新题目…' : '已点击确认窗口的提交，等待平台成绩…');
        }
    }
    function showPreviews(images) {
        if (!panel) return;
        const details = panel.querySelector('[data-question-previews]');if(!details)return;details.querySelectorAll('img').forEach(img => img.remove());
        details.querySelector('summary').textContent=images.length?'查看发送给 AI 的题目截图':'本次为文字题，未发送截图';
        for (const data of images) { const img = document.createElement('img'); img.src = data; img.style.width = '100%'; details.append(img); }
    }
    function retryAttempts() {
        if (record.attempts?.length) return record.attempts;
        const prior = record.history?.at(-1);
        // Old installations only retain one question snapshot; never attach unknown old letters to a different form.
        return prior && record.lastQuestions?.length && JSON.stringify(prior.answers) === JSON.stringify(record.lastAnswers) ? [{ ...prior, questions: record.lastQuestions }] : [];
    }
    async function solve(submit) {
        if (busy) return;
        busy = true;
        const currentEpoch = epoch;
        const quizLocation=location.href,quizTask=task;
        try {
        if (submit && taskPointsOnly()) assertQuizScope();
        const initialEntries=D.extract(document),shortMode=SA?.load(),hasShort=initialEntries.some(entry=>entry.essayLike);
        const submitting=submit&&(!hasShort||shortMode==='submit');
        const detail=hasShort?SA.describe(initialEntries,shortMode):null;
        if(submit&&hasShort&&record.phase==='draft-save-clicked'){
            await deferWholeQuiz(`${detail.reason}；此前已点击暂时保存但结果未确认，请人工复核，不重复保存或提交`,{...detail,state:'uncertain'},record.shortAnswer?.signature);return;
        }
        if(submit&&hasShort&&shortMode==='skip'){
            await deferWholeQuiz(`${detail.reason}；按用户设置整份跳过，未调用AI、未填写、未保存、未提交；任务点留待人工处理`,detail,JSON.stringify(initialEntries.map(entry=>entry.question)));return;
        }
        if(!aiEnabled()){
            if(submit&&hasShort){await deferWholeQuiz(`${detail.reason}；当前不接入AI，整份未作答、未保存、未提交，留待补做`,detail,JSON.stringify(initialEntries.map(entry=>entry.question)));return;}
            pause('不接入 AI：章节题目留待手动作答，记录后继续');return;
        }
        if(submit&&hasShort&&shortMode==='save'&&!SA.saveButton(document)){
            await deferWholeQuiz(`${detail.reason}；暂时保存按钮缺失、不可用或不唯一，整份未填写、未保存、未提交`,detail,JSON.stringify(initialEntries.map(entry=>entry.question)));return;
        }
        await globalThis.XxtFonts?.prepare(document,()=>{if(stopped||epoch!==currentEpoch)throw Error('已停止');});
        const allEntries = D.extract(document), allQuestions = allEntries.map(entry => entry.question);
        const signature = JSON.stringify(allQuestions);
        const known = XxtCodexCore.recallAnswers(allQuestions, record.knownAnswers || []);
        const omitted=allEntries.filter(entry=>!XxtAi.imageConfig()&&XxtDispatch.needsVision(entry.question)&&!known.some(a=>a.id===entry.question.id));
        const entries=allEntries.filter(entry=>!omitted.includes(entry)),questions=entries.map(entry=>entry.question);
        const skipImages=async()=>{
            const reason=`未配置图片接口，已跳过 ${omitted.length} 道图片题${questions.length?'；文字题已处理，但本页未提交':''}，留待补做`;
            if(hasShort){await deferWholeQuiz(`${detail.reason}；${reason}；整份未保存、未提交`,detail,signature);return;}
            record.phase='pending';save();
            if(coursePage())await recoverAutomatic(reason,false);
            else if(parentManaged){report('skip-check',{task,reason});automatic=false;stopped=true;notify(reason);}
            else {notify(reason);const next=D.findNext(document);if(next&&D.enabled(next)){next.click();automatic=false;}}
        };
        const assertCurrent = () => {
            if (stopped || epoch !== currentEpoch || location.href!==quizLocation || task!==quizTask || signature !== JSON.stringify(D.extract(document).map(entry => entry.question))) throw new Error('题目已切换或已停止，取消旧答案');
            if(hasShort&&SA.load()!==shortMode)throw Error('简答题设置已变化，取消旧操作');
            if (submit) beforeClick();
            if (submit && taskPointsOnly()) assertQuizScope();
        };
            if(submit&&hasShort&&shortMode==='save'&&omitted.length){
                await deferWholeQuiz(`${detail.reason}；未配置图片接口，${omitted.length}道图片题无法完整填写；整份未作答、未保存、未提交，留待补做`,detail,signature);return;
            }
            if(!questions.length&&omitted.length){if(submit)await skipImages();else notify(`未配置图片接口，${omitted.length} 道图片题已跳过。`);return;}
            XxtCodexCore.validateQuestions(questions, XxtCodexCore.pageQuestionLimit);
            const learned = XxtCodexCore.recallAnswers(questions, record.knownAnswers || []);
            const retryPlan = XxtRetry.plan(questions, retryAttempts());
            const pendingEntries = entries.filter(entry => !learned.some(answer => answer.id === entry.question.id));
            const pendingQuestions = pendingEntries.map(entry => entry.question);
            if (submitting && retryPlan.forbidden.length && questions.every(q=>!['blank','essay'].includes(q.type))) {
                const seed = questions.map(q => learned.find(a => a.id === q.id) || { id: q.id, choices: [q.options[0].key] });
                if (XxtRetry.novel(questions, seed, retryPlan.forbidden, learned).exhausted) { await navigate('保留平台已确认答案后，其余可区分的答案组合均已尝试'); return; }
            }
            const visualEntries = pendingEntries.filter(entry => XxtDispatch.needsVision(entry.question));
            notify(pendingEntries.length ? `已读取 ${pendingEntries.length} 道题，其中 ${visualEntries.length} 道需要截图（${learned.length} 道已有平台正确答案）…` : '已读取全部平台正确答案，直接填写…');
            if (visualEntries.length) await XxtQuestionCapture.readyFonts(document, assertCurrent);
            const images = [], imageQuestionIds = [];
            for (const entry of visualEntries) {
                assertCurrent();
                if (!D.visible(entry.element)) throw new Error('题目区域不可见');
                const image = await XxtQuestionCapture.capture(entry.captureElement || entry.element, { guard: assertCurrent,
                    ignoreElements: el => !!el.hasAttribute?.('data-xxt-codex-panel') });
                images.push(image); imageQuestionIds.push(entry.question.id);
            }
            assertCurrent(); showPreviews(images);
            let modelAnswers = [];
            let answers;
            if (pendingQuestions.length) {
                let history = retryPlan.history;
                for (let revision = 0; revision < 3; revision++) {
                    notify(revision ? `AI返回了已失败组合，正在对比得分重新推理（复核 ${revision}/2）…` : 'AI 正在按题目内容分流作答，对比历史选择和得分…');
                    const response = await request('/solve', { questions: pendingQuestions, images, imageQuestionIds, history });
                    assertCurrent();
                    modelAnswers = XxtCodexCore.resolveAnswers(pendingQuestions, response, { randomizeUncertain: submit });
                    answers = questions.map(question => [...learned, ...modelAnswers].find(answer => answer.id === question.id));
                    if (!submitting || !retryPlan.repeated(answers)) break;
                    history = XxtRetry.comparisonHistory(retryPlan.history, answers, learned, revision + 1);
                }
            }
            assertCurrent();
            answers ||= questions.map(question => learned.find(answer => answer.id === question.id));
            if (submitting && !omitted.length) {
                const fresh = XxtRetry.novel(questions, answers, retryPlan.forbidden, learned);
                if (fresh.exhausted) { await navigate('保留平台已确认答案后，其余可区分的答案组合均已尝试'); return; }
                answers = fresh.answers;
                if (retryPlan.repeated(answers)) throw new Error('已拦截重复的失败答案组合，停止提交');
            }
            const previewText = answers.map(answer => `第 ${questions.findIndex(q => q.id === answer.id) + 1} 题：${(answer.texts || answer.choices).join('、') || '不确定'}${answer.randomized ? '（随机）' : ''}\n${answer.explanation}`).join('\n\n');
            notify(previewText);
            if (!submit) return previewText;
            await D.applyAnswers(entries, answers, assertCurrent);
            if(omitted.length){await skipImages();return;}
            if(hasShort&&shortMode==='save'){
                const button=SA.saveButton(document);
                if(!button)throw Error('暂时保存按钮缺失或不唯一，已保留答案且未提交');
                notify(`${detail.reason}；正在暂时保存整份测验…`);
                try{
                    await SA.saveDraft(button,assertCurrent,()=>{record.phase='draft-save-clicked';record.shortAnswer={...detail,state:'uncertain',signature,at:Date.now()};save();});
                }catch(error){
                    if(error.draftSaveUncertain&&currentEpoch===epoch&&location.href===quizLocation&&task===quizTask&&signature===JSON.stringify(D.extract(document).map(entry=>entry.question))&&!stopped&&!quietNow()){
                        await deferWholeQuiz(`${detail.reason}；${error.message}`,{...detail,state:'uncertain'},signature);return;
                    }throw error;
                }
                await deferWholeQuiz(`${detail.reason}；已观察到本次“保存成功!”提示，整份已暂存、未提交；任务点及成绩仍待平台确认`,{...detail,state:'saved'},signature);return;
            }
            const button = D.unique([...document.querySelectorAll('.btnSubmit.workBtnIndex')].filter(D.enabled));
            if (!button) throw new Error('提交按钮缺失或不唯一，已停止');
            assertCurrent();
            record.lastAnswers = answers.map(({ id, choices, texts }) => ({ id, choices, ...(texts?{texts}:{}) }));
            record.lastQuestions = questions;
            record.randomized = answers.filter(answer => answer.randomized).map(answer => answer.id);
            record.submissions = (record.submissions || 0) + 1;
            delete record.gradeReloaded;
            record.phase = 'submitted'; record.confirmed = false; record.at = Date.now(); save();
            button.click();
            await finishSubmission(() => {
                beforeClick();
                if (epoch !== currentEpoch) throw new Error('章节已切换，取消旧提交确认');
            });
        } catch (error) { if (!submit) throw error; if (!unloaded && !error.taskPointCompleted) pause(error.message, !taskPointsOnly()); }
        finally { busy = false; inFlight = null; }
    }
    async function nextRetryChapter(skipping) {
        const queue=retryQueue;if(!queue)return;
        if(!ledgerValid()){retryQueue=null;pause('课程或账号标识无法确认，补做已取消。',false);return;}
        if(queue.current){
            const key=`xxt-skipped:${autoKey}`,old=GM_getValue(key,[]);
            GM_setValue(key,old.map(x=>x.scope===ledgerScope&&XxtRunLedger.identity(x)===XxtRunLedger.identity(queue.current)?{...x,status:skipping?'pending':'reviewed'}:x));
        }
        let next;
        while((next=queue.remaining.shift())){
            const live=catalogSnapshot()[next.index];
            if(!live||live.title!==next.title||live.completion!=='completed')break;
            liveSkippedRecords();
        }
        if(!next){retryQueue=null;pause('本轮集中补做已结束；未确认完成的记录仍保留待复核。',false);return;}
        if(quietNow()){retryQueue=null;suspendForQuiet();return;}
        const current=catalogSnapshot()[next.index];
        if(!current||current.title!==next.title||!D.enabled(current.node)){retryQueue=null;pause('目录已变化，补做队列已取消，请检查后重新选择。',false);return;}
        // The real catalog binds getTeacherAjax to the title, not its wrapper.
        // Clicking the title also bubbles to older wrapper/delegated handlers.
        const target=current.node.querySelector('.posCatalog_name')||current.node;
        if(!D.enabled(target)){retryQueue=null;pause('补做章节标题不可点击，请检查目录后重试。',false);return;}
        queue.current=next;
        automatic=false;stopped=true;epoch++;inFlight?.abort();XxtAi.cancelImageTest();
        if(!current.node.classList.contains('posCatalog_active')){
            const prior=courseTask();navigationContent={task:prior,signature:checkContent(),at:Date.now()};
            notify('正在打开补做章节，请稍候…');target.click();
        }
        const since=Date.now();
        while(retryQueue===queue){
            if(quietNow()){retryQueue=null;suspendForQuiet();return;}
            const active=catalogSnapshot().find(x=>x.node.classList.contains('posCatalog_active'));
            if(active?.index===next.index&&active.title===next.title){
                skippedChapters.delete(courseTask());completedTasks.delete(courseTask());recoveryAttempts.delete(courseTask());
                await start({recovery:true});return;
            }
            if(Date.now()-since>12000){diagnostics.record('补做章节未能打开',{phase:'navigate',elapsedMs:Date.now()-since});retryQueue=null;pause('补做章节未能打开，请手动进入后重试。',false);return;}
            await D.delay(200);
        }
    }
    async function advanceCourse(reason, forceSkip = false, skipAllSteps = false) {
        const skipping = forceSkip || skippedChapters.has(courseTask()) || skippedAssets.size > 0 || skippedMarkers.size > 0;
        const pendingReview = awaitingReviewChapters.has(courseTask());
        if (!forceSkip && hasVideoQuiz()) { notify('视频弹题尚未结束，等待作答后再切节。'); return; }
        if (completedTasks.has(courseTask())) return;
        if (!forceSkip && transitionBlocked(true)) return;
        const chapterComplete=taskPointsOnly()&&platformChapterComplete(pageInventory());
        if (!skipAllSteps && !chapterComplete && nextStudyStep()) return;
        if (taskPointsOnly() && !forceSkip && !skipAllSteps && !chapterComplete && !knownTaskChapters.has(currentCatalogKey())) {
            const entry=catalogSnapshot().find(item=>item.node.classList.contains('posCatalog_active'));
            if (entry?.completion==='pending') return blockPage('目录仍显示未完成任务点，但本章页面未能识别，保留本章等待核对');
            noTaskChapters.add(currentCatalogKey());
        }
        pageReviewNeeded = false;
        const oldTask = courseTask();
        if (completedTasks.has(oldTask)) return;
        completedTasks.add(oldTask);
        if (retryQueue) { await nextRetryChapter(skipping); return; }
        if(isTop&&!skipping&&globalThis.XxtCourseHub?.courseComplete(catalogSnapshot()))return;
        const currentEpoch = epoch;
        const pendingPrompt = D.ancestorNavigationPrompt(pageWindow);
        let next = pendingPrompt ? null : D.findNext(document);
        if (!pendingPrompt && !next && !window.app?.nextUnit) {
            await waitFor(() => D.findNext(document) || window.app?.nextUnit, 5000);
            next = D.findNext(document);
        }
        if (next && !D.enabled(next)) { pause('平台下一节按钮不可用，需手动导航', false); return; }
        notify(`${reason}，正在进入下一节…`);
        beforeClick();
        if (P || D.readResult(document) || D.extract(document).length || F.find(document).length) navigationContent = { task: oldTask, signature: checkContent(), at: Date.now() };
        let confirmed = false;
        if (pendingPrompt && (skipping||pendingReview)) { pendingPrompt.next.click(); confirmed = true; }
        else if (pendingPrompt) { completedTasks.delete(oldTask); pause('平台仍提示当前章节有未完成任务，正在尝试恢复'); return; }
        else if (next) next.click();
        else if (window.app?.nextUnit) window.app.nextUnit();
        else { pause('未找到课程导航，请手动进入下一节', false); return; }
        const navigationAt = Date.now();
        while (true) {
            if (courseTask() !== oldTask) { frameClaimAt = 0; frameClaimTask = ''; notify('已进入下一节，继续学习。'); return; }
            beforeClick();
            if (currentEpoch !== epoch) throw new Error('切换上下文已变化，取消旧导航确认');
            const prompt = !confirmed && D.ancestorNavigationPrompt(pageWindow);
            if (prompt) {
                if (skipping||pendingReview) { prompt.next.click(); confirmed = true; }
                else { completedTasks.delete(oldTask); pause('平台仍提示有未完成任务，正在尝试恢复'); return; }
            }
            if (uiTimedOut(navigationAt, 12000)) break;
            await D.delay(200);
        }
        pause('平台未切换到下一节，请手动导航。', false);
    }
    async function navigate(reason) {
        beforeClick();
        if (navigationRequested) {
            if (coursePage()) await advanceCourse(record.doneReason || reason);
            return;
        }
        navigationRequested = true;
        record.phase = 'done'; record.doneReason = reason; record.at = Date.now(); save();
        if (!isTop && parentManaged) {
            report('finished', { task, reason }); automatic = false; notify(`${reason}，正在进入下一节…`); return;
        }
        if (coursePage()) { await advanceCourse(reason); return; }
        const next = D.findNext(document);
        if (next) {
            if (!D.enabled(next)) throw new Error('平台下一节按钮不可用，已停止');
            next.click(); notify(`${reason}，已点击下一节。`); automatic = false;
        } else if (!isTop) {
            report('finished', { task, reason }); automatic = false; notify(`${reason}，正在进入下一节…`);
        } else if (coursePage()) await advanceCourse(reason);
        else throw new Error('未找到下一节按钮，请手动返回课程');
    }
    function rememberAwaitingReview(source){
        const view=pageInventory(),assets=view?.questions.filter(asset=>asset.win===source)||[];
        if(assets.length!==1)throw Error('已提交待批阅，但无法唯一确认测验归属；保留当前页面，请人工核对');
        const asset=assets[0];awaitingReviewAssets.add(asset.id);
        if(!D.readResult(asset.win.document)?.pendingReview){awaitingReviewAssets.delete(asset.id);throw Error('测验已不处于待批阅状态，取消旧状态接续');}
        if(asset.container)awaitingReviewMarkers.add(asset.container);
        for(const container of asset.containers||[])awaitingReviewMarkers.add(container);
        awaitingReviewChapters.add(courseTask());pageReviewNeeded=true;
    }
    async function processPendingReview(result){
        beforeClick();
        record.phase='awaiting-review';record.confirmed=true;record.gradingState='pending-review';record.pendingReviewFingerprint=result.fingerprint;
        record.doneReason='已提交，待批阅；最终成绩以老师批阅为准';delete record.gradeReloaded;save();
        const reason='已提交，待批阅；不重做或重复提交，继续其余可处理任务';
        if(coursePage()){rememberAwaitingReview(pageWindow);notify(reason);await advanceCourse(reason);return;}
        if(parentManaged){report('check-awaiting-review',{task,fingerprint:result.fingerprint});automatic=false;stopped=true;notify('已提交，待批阅；最终成绩以老师批阅为准。');return;}
        const next=D.findNext(document);
        if(next&&D.enabled(next)){beforeClick();next.click();automatic=false;notify(reason+'，已点击下一节。');}
        else {automatic=false;stopped=true;notify('已提交，待批阅；最终成绩以老师批阅为准。当前没有下一节入口，请返回课程继续。');}
    }
    async function processResult(result) {
        if(result.ambiguous)throw Error('结果页包含多个可能的测验结果，已停止，请人工核对');
        if (taskPointsOnly()) {
            if (quizScope() === 'completed') { await navigate('平台任务点已完成，保留现有成绩，不重做'); return; }
            if (result.pendingReview) { await processPendingReview(result); return; }
            record.taskPointWaitAt ||= Date.now(); save();
            notify('已有测验结果，正在等待平台确认任务点；任务点模式不会为满分自动重做。');
            if (uiTimedOut(record.taskPointWaitAt, 30000)) pause('平台尚未确认任务点完成，已保留当前成绩并暂停，请人工核对；未点击重做。', false);
            return;
        }
        if(result.pendingReview){await processPendingReview(result);return;}
        if(result.resultKnown){record.gradingState='graded';delete record.pendingReviewFingerprint;save();}
        const resultEntries=D.extract(document),shortMode=SA?.load();
        if(!result.allCorrect&&shortMode!=='submit'&&resultEntries.some(entry=>entry.essayLike)){
            const detail=SA.describe(resultEntries,shortMode);
            await deferWholeQuiz(`${detail.reason}；当前已是成绩页（${result.finalScore}/${result.maxScore}），保留现有成绩，不自动重做或再次提交；暂存仅适用于可编辑测验`,detail,JSON.stringify(resultEntries.map(entry=>entry.question)));return;
        }
        if (!aiEnabled()) {
            if (result.allCorrect) await navigate(`最终成绩 ${result.finalScore}/${result.maxScore}，已全对`);
            else pause('不接入 AI：保留现有成绩，不重做，记录后继续');
            return;
        }
        if (result.ambiguous) throw new Error('结果页有多个重做按钮，已停止');
        if (!result.allCorrect && record.phase === 'redo-clicked' && !record.redoConfirmed && result.fingerprint === record.priorResult) { await finishRedo(); return; }
        // A persisted completion is not proof that the prior navigation message was delivered.
        if (record.phase === 'done' && navigationRequested) {
            if (coursePage() && pageReviewNeeded) await advanceCourse(record.doneReason || '检测已完成，复核本章其他任务');
            return;
        }
        if (record.priorResult === result.fingerprint && ['submitted', 'redo-clicked'].includes(record.phase)) {
            if (uiTimedOut(record.at, 30000)) throw new Error('成绩页没有更新，已停止，避免重复重做');
            return;
        }
        const questions = record.lastQuestions || [];
        if (!result.allCorrect && questions.some(q=>['blank','essay'].includes(q.type))) {
            const resultEpoch=epoch;
            await globalThis.XxtFonts?.prepare(document,()=>{beforeClick();if(epoch!==resultEpoch)throw Error('页面已变化，取消旧参考答案');});
            beforeClick();if(epoch!==resultEpoch||D.readResult(document)?.fingerprint!==result.fingerprint)return;
        }
        let learned = D.readCorrectAnswers(document, questions);
        if (result.allCorrect && record.lastAnswers?.length === questions.length) learned = questions.map(question => ({
            question, choices: record.lastAnswers.find(answer => answer.id === question.id)?.choices || [],
            ...(record.lastAnswers.find(answer => answer.id === question.id)?.texts ? {texts:record.lastAnswers.find(answer => answer.id === question.id).texts} : {})
        }));
        if (learned.length) {
            record.knownAnswers = [...(record.knownAnswers || []).filter(item => !learned.some(next => next.question.id === item.question.id)), ...learned];
            save();
        }
        if (!result.allCorrect && questions.length && record.lastAnswers?.length === questions.length) {
            record.attempts ||= retryAttempts();
            if (record.lastAttemptResult !== result.fingerprint) {
                record.attempts.push({ questions, answers: record.lastAnswers, finalScore: result.finalScore, maxScore: result.maxScore, review: result.review });
                record.lastAttemptResult = result.fingerprint; save();
            }
        }
        const action = XxtCodexCore.nextAction(result);
        if (action === 'advance') { await navigate(`最终成绩 ${result.finalScore}/${result.maxScore}，已全对`); return; }
        if (action === 'skip') { await navigate(result.remaining === 0 ? '平台重做次数已用尽' : '平台未提供可用的重做按钮'); return; }
        if (action === 'pause') throw new Error('平台剩余次数无法识别，已停止');
        if (action !== 'redo') return;
        record.redos = record.redos || 0;
        if (Number.isSafeInteger(result.remaining)) {
            record.budget = Math.min(record.budget ?? result.remaining, record.redos + result.remaining);
            if (record.redos >= record.budget) { await navigate('已达到平台提供的重做次数上限'); return; }
        }
        record.history = [...(record.history || []), { finalScore: result.finalScore, maxScore: result.maxScore,
            answers: record.lastAnswers || [], review: result.review }].slice(-5);
        beforeClick();
        record.redos++; record.phase = 'redo-clicked'; record.redoConfirmed = false; record.at = Date.now(); record.priorResult = result.fingerprint; save();
        notify(`成绩 ${result.finalScore}/${result.maxScore}，已读取 ${learned.length} 道正确答案，重做${result.remaining == null ? '（平台提供可用入口）' : `（平台剩余 ${result.remaining} 次）`}…`);
        result.redo.click();
        await finishRedo();
    }
    function closeDocument() {
        if(backgroundManual||verificationPresent())return;
        const preview = openedDocument;
        openedDocument = null;
        try { preview?.close(); } catch {}
    }
    function findCheckTab() {
        const matches = [...document.querySelectorAll('.prev_white,.prev_title,[role="tab"],button,a,[onclick]')]
            .filter(el => D.enabled(el) && /^(?:\d+\s*)?(学习检测|学习测验|章节测验)$/.test(D.text(el)));
        return D.unique(matches.filter(el => !matches.some(other => other !== el && other.contains(el))));
    }
    function finishVideo() {
        if(isTop)globalThis.XxtCourseHub?.mediaEnded();
        if (!coursePage()) return false;
        if (stopped || quietNow() || hasVideoQuiz()) return true;
        pageReviewNeeded = true;
        if (transitionBlocked(false)) return true;
        if (pageInventory()?.questions.some(asset => !questionDone(asset))) return true;
        if (pageInventory()?.videos.length && pageInventory().videos.every(asset => asset.mediaKind === 'audio')) {
            void continueKnowledge('音频已播完，任务点已确认').catch(error => { if (!stopped && !quietNow()) pause(error.message); });
            return true;
        }
        const nativeVideo = window.app?._getVideoEl?.();
        if (nativeVideo && !nativeVideo.ended && !pageInventory()?.videos.some(asset=>asset.video===nativeVideo&&videoDone(asset))) return true;
        const currentTask = courseTask();
        if (videoFinishProbe?.task === currentTask) return true;
        const probe = videoFinishProbe = { task: currentTask, epoch, pending: true };
        expectedVideoTask = '';
        (async () => {
            notify(selectedVideoAdvance===90?'视频已达到所选进度且任务点已确认，正在核对本章学习检测…':'视频已结束，正在核对本章学习检测…');
            const deadline = Date.now() + 5000;
            do {
                if (videoFinishProbe !== probe || courseTask() !== currentTask || epoch !== probe.epoch || stopped || quietNow()) return;
                if (hasVideoQuiz()) { videoFinishProbe = null; return; }
                if (findCheckTab()) {
                    completedTasks.delete(currentTask);
                    globalThis.XxtCodexControl.enterCheckStep('视频结束，先处理本章学习检测…'); return;
                }
                if (checkStep() || expectedCheckTask === currentTask || D.extract(document).length || D.readResult(document)) return;
                await D.delay(200);
            } while (Date.now() < deadline);
            beforeClick();
            if (videoFinishProbe !== probe || courseTask() !== currentTask || epoch !== probe.epoch) return;
            await advanceCourse('视频结束，未发现本章学习检测');
        })().catch(error => { if (!stopped && !quietNow()) pause(error.message); }).finally(() => {
            probe.pending = false;
            if ((stopped || quietNow()) && videoFinishProbe === probe) videoFinishProbe = null;
        });
        return true;
    }
    async function continueKnowledge(reason) {
        beforeClick();
        if (coursePage()) {
            // Entering the check step cannot require that same check's icon to
            // be completed already. Inline checks still run before a card change.
            if (transitionBlocked(false)) return;
            if (pageInventory()?.questions.some(asset => !questionDone(asset))) return;
            if (nextStudyStep()) return;
            pageReviewNeeded = false;
            expectedDocumentTask = ''; expectedVideoTask = '';
            if (expectedCheckTask === courseTask()) return;
            if (findCheckTab()) {
                const prompt = D.ancestorNavigationPrompt(pageWindow);
                if (prompt) {
                    if (!prompt.close) throw new Error('请先关闭未完成任务提示，再开始本节学习检测');
                    prompt.close.click();
                    await waitFor(() => !D.ancestorNavigationPrompt(pageWindow), 3000);
                }
                beforeClick();
                if (globalThis.XxtCodexControl.enterCheckStep(`${reason}，优先进入本节学习检测…`)) return;
            }
            await advanceCourse(`${reason}，未发现学习检测`);
        } else throw new Error('未找到课程导航，请返回课程继续');
    }
    async function afterDocuments(documentIds = []) {
        beforeClick();
        if (coursePage()) {
            await continueKnowledge('文献预览已停留 30 秒');
        } else if (coordinator) {
            report('document-finished', { task, documentIds }); automatic = false;
        } else throw new Error('文献预览已完成，未找到课程导航，请返回课程继续');
    }
    async function readTopics() {
        if (!R || !coursePage()) return false;
        const allEntries = scopedEntries(R.find(pageWindow));
        const entries = allEntries.filter(entry => !P.complete(entry.container) && !topicDone.has(entry.element));
        if (!entries.length) return false;
        expectedDocumentTask = courseTask(); expectedVideoTask = ''; unknownSince = 0;
        stopPlayer();
        topicOwner ||= R.createOwner({ notify, assertCurrent: beforeClick });
        const readingTask = `${task}${currentCard ? `/card:${currentCard}` : ''}${allEntries.length > 1 ? `/topic:${allEntries.indexOf(entries[0])}` : ''}`;
        if (await topicOwner.step(entries[0], readingTask)) {
            topicDone.add(entries[0].element); topicOwner.cancel(); topicOwner = null;
            topicReportedTask = task; pageReviewNeeded = true;
            await continueKnowledge('专题目录每项已前台停留90秒');
        }
        return true;
    }
    async function readDocuments(override) {
        if (!override && (D.extract(document).length || D.readResult(document) || (coursePage() && expectedCheckTask === courseTask()))) return false;
        const entries = (override || F.find(document).filter(entry => !grantedDocumentIds || grantedDocumentIds.includes(entry.id)))
            .filter(entry => {
                const container = entry.element.closest('.ans-attach-ct') || P.context(pageWindow).container;
                return !P?.complete(container) && (!taskPointsOnly() || P.required(container) || (!P.context(pageWindow).known && grantedTaskPoint));
            });
        const already = new Set(GM_getValue(`xxt-documents:${task}`, []) || []);
        if (!entries.length || entries.every(entry => already.has(entry.id))) return false;
        if (coursePage()) expectedDocumentTask = courseTask();
        busy = true;
        const currentEpoch = epoch;
        const assertCurrent = () => {
            beforeClick();
            if (currentEpoch !== epoch || (!coursePage() && renderedInPage === false)) throw new Error('文献阅读页面已切换，取消旧操作');
            if (taskPointsOnly() && entries.every(entry => P.complete(entry.element.closest('.ans-attach-ct') || P.context(pageWindow).container)))
                throw Object.assign(Error('平台已确认文献任务点完成'), { taskPointCompleted: true });
        };
        const completed = new Set(GM_getValue(`xxt-documents:${task}`, []) || []);
        try {
            for (const entry of entries) {
                if (completed.has(entry.id)) continue;
                assertCurrent();
                if (!entry.element.isConnected) throw new Error('文件入口已变化，取消旧操作');
                notify(`正在打开文献：${entry.label}`);
                const ownerDocument = entry.element.ownerDocument;
                openedDocument = await F.open(entry, ownerDocument.defaultView, assertCurrent);
                const preview = openedDocument, openedAt = Date.now(), deadline = openedAt + documentDwellMs;
                while (Date.now() < deadline) {
                    assertCurrent();
                    if (preview.closed?.()) throw new Error('文件预览提前关闭，已暂停，请重新开始');
                    notify(`文献已打开：${entry.label}，滚动阅读中，等待 ${Math.max(0, Math.ceil((deadline - Date.now()) / 1000))} 秒后关闭…`);
                    if (preview.root) await F.scroll(ownerDocument, (Date.now() - openedAt) / documentScrollMs, preview.root, assertCurrent);
                    await D.delay(200);
                }
                if (preview.root) {
                    notify('文献已停留 30 秒，正在确认内部滚动条已到底…');
                    const bottomDeadline = Date.now() + 8000;
                    let stable = 0, previousExtent = -1;
                    while (stable < 2 && Date.now() < bottomDeadline) {
                        assertCurrent();
                        const state = await F.scroll(ownerDocument, 1, preview.root, assertCurrent);
                        if (state.unavailable || !state.count) throw new Error('此预览无法控制内部滚动，不能确认完成');
                        stable = state.count > 0 && !state.unavailable && state.bottom ? (state.extent === previousExtent ? stable + 1 : 1) : 0;
                        previousExtent = state.extent;
                        if (stable < 2) await D.delay(400);
                    }
                    if (stable < 2) throw new Error('无法确认文档内部滚动到底');
                    notify('文档内部已滚到底（平台任务点以页面显示为准）');
                }
                assertCurrent(); preview.close();
                if (preview.closed) {
                    const closeDeadline = Date.now() + 3000;
                    while (!preview.closed() && Date.now() < closeDeadline) { assertCurrent(); await D.delay(100); }
                    if (!preview.closed()) throw new Error('文件预览未能关闭，已暂停');
                }
                openedDocument = null;
                completed.add(entry.id); GM_setValue(`xxt-documents:${task}`, [...completed]);
                notify(entry.taskPoint === 'optional' || P?.taskPoint(entry.element) === 'optional'
                    ? `拓展资料已阅读（未设任务点）：${entry.label}` : `已关闭文献预览：${entry.label}`);
            }
            documentReportedTask = task;
        } catch (error) {
            if (error.taskPointCompleted) {
                closeDocument(); documentReportedTask = task;
            } else
            if (!stopped && automatic && !quietNow() && currentEpoch === epoch) {
                closeDocument(); documentReportedTask = task;
                if (coursePage()) throw new Error(`文献任务尚未完成：${error.message}`);
                else { report('document-unrecognized', { task, reason: error.message }); automatic = false; }
            } else throw error;
        } finally { closeDocument(); busy = false; }
        // Navigation/check readiness is separate from reading success. Never
        // relabel a successfully read optional document as an unfinished task.
        await afterDocuments(entries.map(entry => entry.id));
        return true;
    }
    function suspendForQuiet() {
        forceRate.releaseAll();
        cancelPreview('夜间休息，预览已取消。');
        if (quietPaused) return;
        cancelPrefetch();
        retryQueue=null;
        quietPaused = true; resumeAfterQuiet = automatic;
        if (discussionOwner?.active) resumeAfterQuiet = false;
        discussionOwner?.cancel();
        automatic = false; stopped = true; unknownSince = 0; unknownTask = ''; epoch++; inFlight?.abort(); XxtAi.cancelImageTest();
        closeDocument(); topicOwner?.rest(); cancelConfirmation(); pendingConfirmations.clear();
        stopPlayer(); remoteVideo?.pause();
        if (coursePage()) for (const [source, entry] of controlledFrames()) post(source, 'quiet-rest', { target: entry.nonce, resume: resumeAfterQuiet });
        notify(resumeAfterQuiet ? '夜间休息中，07:00 后自动继续（北京时间）' : '夜间休息中，点击开始可预约 07:00 后运行');
    }
    async function syncQuietHours() {
        if (quietNow()) { suspendForQuiet(); return false; }
        if (quietPaused) {
            quietPaused = false;
            const resume = resumeAfterQuiet; resumeAfterQuiet = false;
            if (resume) {
                stopped = false;
                if (coordinator && parentManaged) automatic = true;
                else await start();
            }
        }
        return true;
    }
    async function skipUnknownStep() {
        const video = window.app?._getVideoEl?.();
        const visibleVideo = video && D.visible(video) && (video.ownerDocument.defaultView === pageWindow || visibleDescendant(pageWindow, video.ownerDocument.defaultView));
        if (!coursePage() || openedDocument || D.extract(document).length || D.readResult(document) || visibleVideo ||
            [...frames].some(([source, entry]) => Date.now() - (entry.seenAt || 0) < 4000 && canClaim(source, entry))) {
            unknownSince = 0; unknownTask = ''; return;
        }
        if (unknownTask !== courseTask()) { unknownTask = courseTask(); unknownSince = Date.now(); }
        // Allow newly loaded iframes to announce themselves; this is not the cancelled 30s wait.
        if (!uiTimedOut(unknownSince, 3000) || completedTasks.has(courseTask())) return;
        busy = true;
        try {
            throw new Error('未识别到可确认完成的任务，已暂停，保留本节');
        } finally { busy = false; }
    }
    function checkContent() {
        const result = D.readResult(document);
        return JSON.stringify({ questions: D.extract(document).map(entry => entry.question),
            documents: F.find(document).map(entry => entry.id),
            pageAssets: P?.scan(pageWindow).signature,
            result: result ? { fingerprint: result.fingerprint, review: result.review } : null });
    }
    async function solveVideoQuiz(hit) {
        busy = true;
        let responseWatch;
        const currentEpoch = epoch;
        const quizDocument = hit.win.document;
        const quizVideo = quizDocument.querySelector('video');
        if (quizVideo) startedVideos.add(quizVideo);
        if (!quizDocumentViews.has(quizDocument)) quizDocumentViews.set(quizDocument, crypto.randomUUID());
        const viewId = quizDocumentViews.get(quizDocument);
        videoQuizRun = currentEpoch;
        const guard = () => {
            beforeClick();
            // Intersection with the viewport changes during scrolling/capture. It is not
            // a document or question identity, so do not retire a valid answer on that signal.
            if (epoch !== currentEpoch || hit.win.closed || hit.win.document !== quizDocument ||
                (coursePage() && hit.win !== pageWindow && !visibleDescendant(pageWindow, hit.win))) throw new Error('视频弹题页面已切换，取消旧答案');
        };
        const continueQuiz = async (entry, button) => {
            guard(); notify('视频弹题已答对，点击“继续学习”…'); button.click();
            await waitFor(() => {
                guard();
                const active = Q.find(hit.win.document), next = active && Q.extract(active);
                return !active || (next && next.signature !== entry?.signature);
            }, 10000);
        };
        try {
            for (;;) {
                guard();
                let panel = Q.find(hit.win.document);
                if (!panel) break;
                if(aiEnabled())await globalThis.XxtFonts?.prepare(hit.win.document,guard);guard();
                const entry = Q.extract(panel);
                // The page may already show a successful answer after refresh, manual submission or a stopped run.
                const existingFeedback = Q.feedback(panel, entry?.question);
                if (existingFeedback.proceed) {
                    await continueQuiz(entry, existingFeedback.proceed);
                    if (entry) {
                        const key = `xxt-video-quiz:${task}/${entry.question.id}`;
                        GM_setValue(key, { ...(GM_getValue(key, {}) || {}), phase: 'done' });
                    }
                    continue;
                }
                if (!aiEnabled()) throw new Error('不接入 AI：视频弹题阻止播放，跳过受阻内容并留待手动处理');
                if (!entry) {
                    throw new Error('检测到视频弹题，但题目或选项无法识别，已暂停');
                }
                const key = `xxt-video-quiz:${task}/${entry.question.id}`;
                const state = GM_getValue(key, {}) || {};
                state.attempts ||= (state.history || []).filter(h => h.answers?.some(a => a.id === entry.question.id && a.choices?.length))
                    .map(h => ({ ...h, questions: [entry.question] }));
                const saveState = () => GM_setValue(key, state);
                const assertQuestion = () => { guard(); if (Q.extract(panel)?.signature !== entry.signature) throw new Error('视频弹题已变化，取消旧答案'); };
                // A persisted "submitted" flag cannot prove this freshly rendered form
                // was sent. Old versions saved it before clicking and kept it across reloads.
                if (state.phase === 'submitted' && state.viewId !== viewId && !existingFeedback.wrong && !existingFeedback.correct &&
                    !Q.submitting(panel) && existingFeedback.editable && Q.control(panel, /^(提交|确定)$/)) {
                    state.phase = ''; state.recoveredOldSubmission = true; saveState();
                    notify('检测到旧的已提交记录，但当前原题尚未提交，正在恢复作答…');
                }
                let requireFreshFeedback = state.phase === 'submitted' && !!state.requireFreshFeedback;
                if (state.phase !== 'submitted') {
                    notify(`检测到视频内${entry.question.type === 'multiple' ? '多选' : entry.question.type === 'boolean' ? '判断' : '单选'}题，正在作答…`);
                    let answer;
                    if (state.known?.length) {
                        answer = { id: entry.question.id, choices: state.known };
                        if (XxtRetry.plan([entry.question], state.attempts).repeated([answer]))
                            throw new Error('平台提示的参考答案已被判错，已暂停，避免重复提交同一答案');
                    }
                    else {
                        const retryPlan = XxtRetry.plan([entry.question], state.attempts);
                        const seed = [{ id: entry.question.id, choices: [entry.question.options[0].key] }];
                        if (XxtRetry.novel([entry.question], seed, retryPlan.forbidden).exhausted)
                            throw new Error('视频弹题的可区分答案组合均已尝试，已暂停，请核对题目或平台反馈');
                        const images = [], imageQuestionIds = [];
                        if (XxtDispatch.needsVision(entry.question)) {
                            if(!XxtAi.imageConfig())throw Error('未配置图片接口：跳过图片视频弹题，留待补做');
                            await XxtQuestionCapture.readyFonts(panel.ownerDocument, assertQuestion); assertQuestion();
                            images.push(await XxtQuestionCapture.capture(panel, { guard: assertQuestion, backgroundColor: '#171717',
                                ignoreElements: el => el.tagName === 'VIDEO' || !!el.closest?.('[data-xxt-codex-panel]') }));
                            imageQuestionIds.push(entry.question.id);
                        }
                        assertQuestion(); showPreviews(images);
                        let history = retryPlan.history;
                        for (let revision = 0; revision <= 2; revision++) {
                            const response = await request('/solve', { questions: [entry.question], images, imageQuestionIds, history });
                            assertQuestion(); answer = XxtCodexCore.resolveAnswers([entry.question], response, { randomizeUncertain: true })[0];
                            if (!retryPlan.repeated([answer])) break;
                            history = XxtRetry.comparisonHistory(retryPlan.history, [answer], [], revision + 1);
                            if (revision < 2) notify('视频弹题候选与失败答案相同，正在让 AI 对比反馈重新推理…');
                        }
                        const fresh = XxtRetry.novel([entry.question], [answer], retryPlan.forbidden);
                        if (fresh.exhausted) throw new Error('视频弹题的可区分答案组合均已尝试，已暂停');
                        answer = fresh.answers[0];
                        if (fresh.changed) notify('AI 复核后仍重复，改用尚未提交的视频弹题候选（尚未确认正确）');
                    }
                    await Q.apply(entry, answer, assertQuestion);
                    const submit = Q.control(panel, /^(提交|确定)$/);
                    if (!submit) throw new Error('视频弹题提交按钮缺失或不唯一');
                    assertQuestion(); requireFreshFeedback = Q.feedback(panel, entry.question).wrong;
                    responseWatch?.close(); responseWatch = Q.watchResponse(panel);
                    state.phase = 'submitted'; state.at = Date.now(); state.choices = answer.choices;
                    state.viewId = viewId; state.requireFreshFeedback = requireFreshFeedback;
                    state.submissions = (state.submissions || 0) + 1; saveState(); submit.click();
                    notify('已提交视频弹题，等待平台反馈…');
                }
                if (!responseWatch) notify('正在核对视频弹题现有提交状态，等待平台判题反馈…');
                responseWatch ||= Q.watchResponse(panel);
                let activationRepairs = 0, activationAt = Date.now();
                const outcome = await waitFor(() => {
                    guard(); const active = Q.find(hit.win.document);
                    if (!active || Q.extract(active)?.signature && Q.extract(active).signature !== entry.signature) return { advanced: true };
                    const feedback = Q.feedback(active, entry.question);
                    const submitting = Q.submitting(active);
                    if ((!submitting && feedback.wrong && (!requireFreshFeedback || responseWatch?.changed())) || feedback.proceed) return { feedback };
                    const submit = Q.control(active, /^(提交|确定)$/);
                    if (!activationRepairs && !submitting && !responseWatch.started() && !feedback.wrong && !feedback.correct && feedback.editable &&
                        submit && Date.now() - activationAt >= 2000) {
                        assertQuestion();
                        if (Q.selection(entry).sort().join('') !== [...(state.choices || [])].sort().join('')) throw new Error('等待提交期间选项已变化，已暂停旧答案');
                        activationRepairs++; activationAt = Date.now(); state.activationRepairs = (state.activationRepairs || 0) + 1; saveState();
                        notify('原题仍可提交且未开始判题，正在补点一次提交…'); submit.click();
                    }
                    return null;
                }, 20000).catch(error => {
                    if (/^页面响应超时/.test(error.message) && epoch === currentEpoch && automatic && !stopped && !Q.submitting(panel) && Q.control(panel, /^(提交|确定)$/)) {
                        state.phase = 'unconfirmed'; saveState();
                        throw new Error('视频弹题未收到判题反馈，已停止自动补交；点击开始可恢复原题');
                    }
                    throw error;
                });
                responseWatch?.close(); responseWatch = null;
                guard();
                if (outcome.advanced) { state.phase = 'done'; saveState(); continue; }
                const feedback = outcome.feedback;
                if (feedback.proceed) {
                    await continueQuiz(entry, feedback.proceed);
                    state.phase = 'done'; saveState(); continue;
                }
                if (feedback.choices?.length) state.known = feedback.choices;
                if (!state.attempts.some(attempt => XxtRetry.batchKey([entry.question], attempt.answers) ===
                    XxtRetry.batchKey([entry.question], [{ id: entry.question.id, choices: state.choices }]))) {
                    state.attempts.push({ questions: [entry.question], finalScore: 0, maxScore: 1,
                        answers: [{ id: entry.question.id, choices: state.choices }], review: [feedback.text.slice(0, 3000)] });
                }
                state.history = [...(state.history || []), { finalScore: 0, maxScore: 1,
                    answers: [{ id: entry.question.id, choices: state.choices }], review: [feedback.text.slice(0, 3000)] }].slice(-5);
                saveState();
                if (feedback.remaining === 0) throw new Error('视频弹题可答次数已用尽，已暂停');
                if (!feedback.retry && !feedback.resubmit) throw new Error(feedback.reviewRequired ? '视频弹题要求回看，请先完成页面提示的回看' :
                    '视频弹题未答对，原题暂不可重交且没有可用重试按钮，已暂停');
                if (!feedback.retry && feedback.resubmit) { state.phase = ''; saveState(); notify('视频弹题答错，直接在原题改选后重新提交…'); continue; }
                feedback.retry.click();
                await waitFor(() => {
                    const active = Q.find(hit.win.document);
                    return active && Q.extract(active) && !Q.feedback(active, entry.question).wrong;
                }, 10000);
                state.phase = ''; saveState();
            }
            guard();
            if (!coursePage() && coordinator) report('video-quiz-finished', { task });
            const video = hit.win.document.querySelector('video');
            if (video && !video.ended) {
                applyMediaRate(video);
                try { await video.play(); } catch { if (!selectedMuted) throw new Error('浏览器阻止有声自动播放，请手动播放或勾选静音'); video.muted = true; await video.play(); }
            }
            if (coursePage()) {
                if (video?.ended) window.app?._continueAfterVideo(); else window.app?.play();
            }
            notify('视频弹题已结束，继续本节视频…');
        } catch (error) {
            // An older run must not pause a new Start/grant or the next chapter.
            const superseded = currentEpoch !== epoch || (coursePage() && task !== courseTask());
            if (!unloaded && !superseded) pause(error.message);
        }
        finally { responseWatch?.close(); if (videoQuizRun === currentEpoch) videoQuizRun = null; busy = false; inFlight = null; }
    }
    async function tick() {
        if(inspectVerification())return;
        enforceTaskScope();
        if(globalThis.XxtHomework?.normalize(GM_getValue('xxt-homework-settings',{})).mode==='homework'){if(automatic)stop();mount();return;}
        forceRate.prune();
        if (unloaded) return;
        mount();
        if (!await syncQuietHours()) return;
        dismissInterruptions();
        if (coursePage()) for (const [source, entry] of quizFrames) {
            // Layout-hidden/detached players retire their old authorization. Scrolling an
            // attached iframe out of the viewport leaves its layout and authorization intact.
            if (entry.task !== courseTask() || !visibleDescendant(pageWindow, source)) {
                if (entry.task !== courseTask()) retiredQuizForms.add(`${entry.nonce}/${entry.signature}`);
                post(source, 'stop', { target: entry.nonce }); quizFrames.delete(source);
            }
        }
        if (!isTop && !coursePage() && Q.find(document)) report('video-quiz-ready', { viewVisible: renderedInPage,
            quizSignature: `${Q.extract(Q.find(document))?.signature || D.text(Q.find(document))}/${document.querySelector('video')?.currentSrc || ''}` });
        if (coursePage()) tickConfirmations();
        await tickRemoteVideo();
        const previewCount = D.extract(document).filter(entry => D.visible(entry.element)).length;
        if (!isTop && previewCount) broadcast('preview-ready', { count: previewCount, viewVisible: renderedInPage });
        if (!isTop && !coursePage() && (D.extract(document).length || D.readResult(document))) report('ready', {
            viewVisible: renderedInPage, viewKind: D.readResult(document) ? 'result' : 'questions'
        });
        if (!isTop && !coursePage() && !D.extract(document).length && !D.readResult(document) &&
            (F.find(document).length || openedDocument) && (!task || documentReportedTask !== task))
            report('document-ready', { viewVisible: renderedInPage });
        if (!automatic || stopped || busy || !task) return;
        if(isTop&&globalThis.XxtCourseHub?.gate())return;
        if (navigationContent && courseTask() !== navigationContent.task) {
            if (checkContent() === navigationContent.signature) {
                if (uiTimedOut(navigationContent.at, 30000)) pause('新章节仍显示旧检测内容，已停止，避免误跳章节。');
                return;
            }
            navigationContent = null;
        }
        if (coursePage() && task !== courseTask()) {
            setTask(courseTask()); expectedCheckTask = ''; expectedDocumentTask = ''; expectedVideoTask = courseTask(); frameClaimAt = 0; navigationRequested = false;
            window.app?._reenterVideoMode?.(); return;
        }
        if (coursePage() && syncCard()) return;
        try {
            const videoQuiz = Q.across(pageWindow).find(hit => !quizFrames.has(hit.win) && !skippedQuizWindows.has(hit.win) && (!coursePage() || pendingTaskEntry(hit)));
            if (videoQuiz && (coursePage() || isTop || quizAuthorized)) { await solveVideoQuiz(videoQuiz); return; }
            if (hasVideoQuiz()) return;
            if (coursePage() && await coordinatePage()) return;
            if (coursePage() && taskPointsOnly() && !pageInventory().questions.some(asset => asset.win === pageWindow && !questionDone(asset))) {
                await advanceCourse('本页未完成任务点已处理，跳过无任务点内容'); return;
            }
            const result = D.readResult(document);
            if (result) { busy = true; await processResult(result); return; }
            if (!coursePage() && record.phase === 'submitted' && record.confirmed) {
                waitForSubmittedGrade(); return;
            }
            if (await readTopics()) return;
            if (await readDocuments()) return;
            if (D.enabled(document.querySelector('.btnSubmit.workBtnIndex')) && D.extract(document).length) {
                if(record.phase==='short-answer-deferred'){
                    const entries=D.extract(document),value=record.shortAnswer;
                    if(value&&value.mode===SA?.load()&&value.signature===JSON.stringify(entries.map(entry=>entry.question))){
                        await deferWholeQuiz(value.reason,value,value.signature);return;
                    }
                }
                if (!aiEnabled()&&!D.extract(document).some(entry=>entry.essayLike)) { pause('不接入 AI：章节题目留待手动作答，记录后继续'); return; }
                if (record.phase === 'submitted') {
                    if (!record.confirmed) { busy = true; await finishSubmission(); return; }
                    waitForSubmittedGrade();
                    return;
                }
                if (record.phase === 'done') return;
                await solve(true); return;
            }
            if (!coursePage() && ['submitted', 'redo-clicked'].includes(record.phase) && uiTimedOut(record.at, 30000)) throw new Error('平台页面未更新，已停止');
            if (coursePage() && pageReviewNeeded) {
                const view = pageInventory();
                if (expectedCheckTask === task || record.phase === 'done') await advanceCourse('已核对本页所有任务');
                else if (view?.videos.length) finishVideo();
                else await continueKnowledge('已核对本页所有任务');
                return;
            }
            await skipUnknownStep();
        } catch (error) { pause(error.message); }
        finally { if (!inFlight) busy = false; }
    }
    function grant(source, entry, resume = false, resetVideoLines = false) {
        let documentIds;
        if (coursePage() && task!==courseTask()) return;
        if (coursePage() && navigationContent && courseTask()!==navigationContent.task && checkContent()===navigationContent.signature) return;
        if (coursePage() && P) {
            if (parentReadingFiles) return;
            if (stepTransition) return;
            const view = pageInventory();
            const video = view.videos.find(asset => !videoDone(asset));
            if (entry.kind === 'video' && (!video || !covers(video, source, 'video'))) return;
            if (entry.kind === 'document') {
                if (video || pendingMediaStep(view)) return;
                const file = view.documents.find(asset => !fileDone(asset));
                if (!file || !covers(file, source, 'document')) return;
                // Grant only the selected file when its ID is known in this
                // worker's document. A skipped sibling must not be reopened.
                if (file.entry && file.win === source) documentIds = [file.entry.id];
            }
            if (entry.kind === 'check') {
                if (pendingKnowledge(view)) return;
                const question = view.questions.find(asset => !questionDone(asset));
                if (!question || question.root !== source) return;
            }
            for (const [otherSource, other] of frames) if (other.running && otherSource !== source) {
                post(otherSource, 'stop', { target: other.nonce }); other.running = false;
            }
            resume ||= !entry.running; entry.running = true;
        }
        post(source, entry.kind === 'video' ? 'grant-video' : entry.kind === 'document' ? 'grant-document' : 'grant', { target: entry.nonce, task: courseTask(), resume,
            rate: getPlaybackRate(), forceRate: selectedForceRate, muted: getMuted(), mediaId: entry.mediaId, documentIds, resetVideoLines,
            taskPointRequired: taskPointsOnly() });
    }
    async function tickRemoteVideo() {
        if(verificationBlocked()){holdVerification();return;}
        if (quietNow()) { remoteVideo?.pause(); return; }
        if (coursePage()) return;
        const video = P?.playable(document)[0] || null;
        if (!video) return;
        const label = P.mediaLabel(video);
        // Manual/replaced players can exist while automation is stopped.
        selectedMuted = GM_getValue('xxt-video-muted', true) !== false;
        if (selectedMuted && video.muted!==getMuted()) video.muted=getMuted();
        const identity = video.currentSrc || video.src || '';
        if (video !== remoteVideo || identity !== remoteMediaIdentity) {
            remoteVideo = video; remoteMediaIdentity = identity; remoteMediaId = crypto.randomUUID(); remoteVideoEnded = false; remotePlayAttempts = 0;
            remoteVideoTask = '';
            remoteSettlementMedia = ''; remoteSettlementRequests.clear();
        }
        report('video-ready', { mediaId: remoteMediaId, mediaKind: P.mediaKind(video), viewVisible: renderedInPage, ended: video.ended,
            currentTime: video.currentTime, duration: Number.isFinite(video.duration)?video.duration:null, seeking:video.seeking });
        if (remoteSettlementMedia === remoteMediaId) return;
        if (Q.find(document)) return;
        if (!remoteVideoTask || !automatic || stopped || !coordinator || D.extract(document).length) return;
        applyMediaRate(video, remoteVideoRate);
        if (video.ended) {
            if (!remoteVideoEnded) { remoteVideoEnded = true; report('video-ended', { task: remoteVideoTask, mediaId: remoteMediaId }); }
            return;
        }
        if (renderedInPage === false) return;
        if (P.mediaKind(video) !== 'audio' && await recoverVideoLine(video, remoteVideoTask)) return;
        if (!video.paused || remotePlayBusy || Date.now() - remotePlayAt < 2000) return;
        if (remotePlayAttempts >= 10) { pause(`${label}未能自动播放，请先点播放器的播放按钮再开始自动。`); return; }
        remotePlayAt = Date.now(); remotePlayAttempts++; remotePlayBusy = true;
        applyMediaRate(video, remoteVideoRate);
        try {
            const play = (video.closest('.video-js') || video.parentElement)?.querySelector('.vjs-big-play-button,button.vjs-play-control');
            if (video.readyState === 0 && D.enabled(play)) play.click();
            try { await video.play(); } catch { if (!selectedMuted) throw new Error('浏览器阻止有声自动播放，请手动播放或勾选静音'); video.muted = true; await video.play(); }
            if (stopped || !automatic || quietNow()) { video.pause(); return; }
            remotePlayAttempts = 0; report('status', { task: remoteVideoTask, value: `正在播放本节${label}…` });
        } catch { report('status', { task: remoteVideoTask, value: `正在等待新${label}加载，尝试自动播放…` }); }
        finally { remotePlayBusy = false; }
    }
    async function start({ recovery = false, manual = false } = {}) {
        if(manual)globalThis.XxtCourseHub?.started();
        if(manual && taskPointsOnly()) sessionStorage.setItem(`${autoKey}/task-points-confirmed`, '1');
        if(manual)savedJumpSerial++;
        if(globalThis.XxtHomework?.normalize(GM_getValue('xxt-homework-settings',{})).mode==='homework'){stop();notify('当前选择了作业模式，请打开作业页；章节学习请先切回章节。');return;}
        if(verificationPresent()){holdVerification();return;}
        if(backgroundManual&&!manual){holdVerification();return;}
        if(manual){releaseVerification();for(const[source,entry]of new Map([...controlledFrames(),...verificationSources]))post(source,'verification-resume',{target:entry.nonce});}
        if(manual)forceRate.releaseAll(true);
        if (previewClient || previewWorker) { if (!manual) return; cancelPreview('已切换到自动模式，预览已取消。'); }
        if (unloaded) { notify('页面运行已结束，请刷新课程页后重新点击“开始自动”。'); return; }
        if (manual) { startedVideos = new WeakSet(); for (const entry of frames.values()) if (entry.kind === 'video') entry.running = false; }
        if (!recovery) { apiFailureShown=false;apiFailureUntil=0;retryQueue=null; recoverySerial++; recovering = false; inFlight?.abort(); XxtAi.cancelImageTest(); videoLines?.reset(); }
        if (isTop && coursePage()) sessionStorage.setItem(autoKey, '1');
        if (quietNow()) { suspendForQuiet(); resumeAfterQuiet = true; notify('已预约：夜间休息中，07:00 后自动开始（北京时间）'); return; }
        stopped = false; automatic = true; navigationRequested = false; documentReportedTask = ''; epoch++;
        if(coursePage()&&GM_getValue('xxt-prefetch',false))void preparePrefetch();
        if (videoQuizRun !== null) inFlight?.abort(); XxtAi.cancelImageTest();
        dismissInterruptions();
        syncPlaybackRate();
        if (coursePage()) {
            setTask(courseTask());
            if (syncCard()) return;
            if (!recovery) {
                // Explicit Start retries this card's failed work. Historical logs
                // remain, but must not keep the current editable quiz excluded.
                skippedAssets.clear(); skippedMarkers.clear(); skippedQuizWindows.clear();awaitingReviewAssets.clear();awaitingReviewMarkers.clear();
                skippedChapters.delete(courseTask()); recoveryAttempts.delete(courseTask());
                pageBlockedAt = 0; pageReviewNeeded = true;
            }
            if (!checkStep() && expectedCheckTask !== courseTask()) expectedVideoTask = courseTask();
            completedTasks.delete(courseTask());
            for (const [source, entry] of frames) {
                if (!recovery) {
                    completedSenders.delete(entry.nonce);
                    if (entry.kind === 'document') completedDocumentSenders.delete(entry.nonce);
                }
                if (entry.kind === 'video' ? canClaimVideo(source, entry) && !parentHasVideo() :
                    canClaim(source, entry) && (entry.kind !== 'document' || !F.find(document).length)) grant(source, entry, true, !recovery);
            }
            for (const [source, entry] of quizFrames) if (entry.task === courseTask() && Date.now() - entry.at < 4000)
                post(source, 'grant-video-quiz', { target: entry.nonce, task: courseTask(), resume: true });
            if (D.ancestorNavigationPrompt(pageWindow)) {
                if (expectedCheckTask === courseTask()) await advanceCourse('继续本轮章节切换');
                else await continueKnowledge('恢复未完成任务提示');
                return;
            }
            if (window.app) { window.app.configs.autoplay = true; window.app.play(); }
            notify(taskPointsOnly() ? '任务点模式已开启：只处理未完成任务点，跳过无任务点内容；平台确认完成后继续，不为满分重做。' :
                aiEnabled() ? '自动模式已开启：音视频和阅读完成后处理检测；全对继续，未全对按平台剩余次数重做。' : '不接入 AI：自动处理音视频和阅读，题目记录后跳过；跳过不等于完成。');
            if (busy) notify('正在结束上一轮任务，请稍候；仍无进展时请停止并刷新课程页。');
            else await tick();
        } else {
            if (!isTop) { const since = Date.now(); report('start'); await D.delay(800); if (grantAt < since && !task) setTask(localTask()); }
            else if (!task) setTask(localTask());
            record.paused = false; save(); await tick();
        }
    }
    function stopPlayer() {
        pageVideo?.pause();
        if (window.app) { window.app.configs.autoplay = false; window.app._isPlaying = false; window.app._clearCheckInterval(); window.app._videoEl?.pause(); }
    }
    function stop(cancelQueue = true) {
        if(isTop&&cancelQueue)globalThis.XxtCourseHub?.cancel();
        savedJumpSerial++;
        cancelPreview();
        retryQueue=null;
        recoverySerial++; recovering = false;
        if (isTop && coursePage()) sessionStorage.removeItem(autoKey);
        resumeAfterQuiet = false;
        pause('已停止自动答题。', false);
        if (coursePage()) { stopPlayer(); for (const [source, entry] of controlledFrames()) post(source, 'stop', { target: entry.nonce }); }
        if (!isTop && !coursePage()) report('stop');
    }
    // Preview leases are independent from automatic submit/grade/navigation leases.
    const previewWorkers = new Map();
    let previewClient = null, previewWorker = null;
    function previewBox(value, phase = 'loading') {
        const box = panel?.querySelector('[data-answer-preview]');
        if (!box) return;
        box.hidden = false; box.dataset.phase = phase;
        box.querySelector('strong').textContent = phase === 'done' ? 'AI 答案预览（未填写、未提交）' : phase === 'error' ? '预览未完成' : phase === 'cancelled' ? '预览已取消' : '正在预览 AI 答案…';
        box.querySelector('[data-preview-content]').textContent = value;
    }
    function finishPreview(state, value, phase) {
        if (previewClient !== state) return;
        clearInterval(state.timer); previewClient = null;
        const button = panel?.querySelector('[data-action="solve"]');
        if (button) { button.disabled = !aiEnabled(); button.textContent = '预览 AI 答案'; }
        previewBox(value, phase);
        if (phase === 'done') notify('AI 答案已生成，请查看下方预览；未填写、未提交。');
        else if (phase === 'error') notify(value);
    }
    function cancelPreview(reason = '已停止预览。') {
        if (previewClient) {
            const state = previewClient;
            if (state.source && state.source !== pageWindow) post(state.source, 'preview-cancel', { target: state.nonce, requestId: state.id });
            finishPreview(state, reason, 'cancelled');
        }
        if (previewWorker) {
            previewWorker = null; stopped = true; automatic = false; epoch++; inFlight?.abort(); XxtAi.cancelImageTest();
        }
    }
    function previewMessage(worker, type, value) {
        if (previewWorker !== worker) return;
        const data = { requestId: worker.id, context: worker.context, value: String(value).slice(0,256000) };
        if (worker.source === pageWindow) receivePreview(pageWindow, { ...data, nonce, type });
        else post(worker.source, type, data);
    }
    function receivePreview(source, data) {
        const state = previewClient;
        if (!state || source !== state.source || data.nonce !== state.nonce || data.requestId !== state.id || data.context !== state.context || typeof data.value !== 'string' || data.value.length > 256000) return;
        if (state.context !== (coursePage() ? courseTask() : localTask()) ||
            (source !== pageWindow && !canClaim(source, previewWorkers.get(source)))) { cancelPreview('题目页面已切换，旧预览已取消。'); return; }
        if (data.type === 'preview-progress') previewBox(data.value);
        else finishPreview(state, data.value, data.type === 'preview-result' ? 'done' : 'error');
    }
    async function executePreview(source, data) {
        if (previewWorker) return;
        const worker = { source, id: data.requestId, context: data.context };
        previewWorker = worker;
        automatic = false; stopped = true; resumeAfterQuiet = false; recoverySerial++; recovering = false;
        epoch++; inFlight?.abort(); XxtAi.cancelImageTest(); stopPlayer(); remoteVideo?.pause();
        discussionOwner?.cancel();
        cancelConfirmation(); pendingConfirmations.clear();
        try {
            previewMessage(worker, 'preview-progress', '正在结束旧任务并读取题目；不会填写、提交或切换章节。');
            const until = Date.now() + 5000;
            while (busy && Date.now() < until && previewWorker === worker) await D.delay(50);
            if (previewWorker !== worker) return;
            if (busy) throw Error('旧任务仍在结束，请稍后重新预览。');
            if (quietNow()) throw Error('夜间休息中，07:00 后可预览 AI 答案。');
            if (typeof verificationBlocked === 'function' && verificationBlocked()) throw Error('请先手动完成人工验证，再预览 AI 答案。');
            if (!aiEnabled()) throw Error('请先接入 AI 再预览答案。');
            if (!D.extract(document).some(entry => D.visible(entry.element))) throw Error('题目尚未加载或已切换，请重新打开检测页后预览。');
            if (!task) setTask(localTask());
            stopped = false; automatic = false; epoch++;
            const value = await solve(false);
            if (!value) throw Error('未生成可预览的答案，请检查图片用途配置和题目加载状态。');
            if (previewWorker === worker) previewMessage(worker, 'preview-result', value);
        } catch (error) { previewMessage(worker, 'preview-error', error.message); }
        finally { if (previewWorker === worker) { previewWorker = null; stopped = true; automatic = false; } }
    }
    async function previewAnswers() {
        if (!aiEnabled()) { notify('请先切换为接入 AI，再预览答案。'); return; }
        if (typeof verificationBlocked === 'function' && verificationBlocked()) { notify('请先手动完成人工验证，再预览 AI 答案。'); return; }
        if (previewClient || previewWorker) { notify('答案正在预览中，请稍候；可点“停止”取消。'); return; }
        stop();
        if (quietNow()) { previewBox('夜间休息中，07:00 后可预览 AI 答案。', 'error'); return; }
        const state = { id: crypto.randomUUID(), context: coursePage() ? courseTask() : localTask(), at: Date.now(), source: null };
        previewClient = state;
        panel.querySelector('[data-action="solve"]').disabled = true;
        previewBox('正在查找当前可见的检测题目；不会填写或提交。');
        notify('正在预览 AI 答案，请查看下方预览区域。');
        state.timer = setInterval(() => {
            if (previewClient !== state) return;
            if (quietNow() || unloaded || state.context !== (coursePage() ? courseTask() : localTask())) { cancelPreview('休息或题目页面已切换，预览已取消。'); return; }
            if (Date.now() - state.at > 180000) { cancelPreview('预览等待超时，请检查模型连接后重试。'); return; }
            const elapsed = panel?.querySelector('[data-preview-elapsed]');
            if (elapsed) elapsed.textContent = `已用 ${Math.floor((Date.now()-state.at)/1000)} 秒 · AI 参考答案，调用可能消耗模型额度`;
        }, 250);
        try {
            if (D.extract(document).some(entry => D.visible(entry.element))) {
                state.source = pageWindow; state.nonce = nonce;
                await executePreview(pageWindow, { requestId: state.id, context: state.context }); return;
            }
            // Allow all visible nested workers to announce; never guess between siblings.
            await D.delay(800);
            const candidates = () => [...previewWorkers].filter(([source, entry]) => entry.count > 0 && Date.now()-entry.at < 4000 && canClaim(source, entry));
            const until = Date.now()+3000;
            while (previewClient === state && !candidates().length && Date.now() < until) await D.delay(100);
            if (previewClient !== state) return;
            const found = candidates();
            if (found.length > 1) throw Error('检测到多个可见测验，请先只打开要预览的那一份，再点击“预览 AI 答案”。');
            if (!found.length) throw Error('未发现可预览的题目，请等待检测内容加载；更新脚本后需刷新整个课程页。');
            const [source, entry] = found[0]; state.source = source; state.nonce = entry.nonce;
            post(source, 'preview-request', { target: entry.nonce, requestId: state.id, context: state.context });
        } catch (error) { finishPreview(state, error.message, 'error'); }
    }
    function mountPreviewBox() {
        const box = document.createElement('section'); box.dataset.answerPreview = 'true'; box.hidden = true;
        box.style.cssText='padding:12px;border:1px solid currentColor;border-radius:12px;margin:12px 0;min-width:0';
        const title=document.createElement('strong'),close=document.createElement('button'),elapsed=document.createElement('small'),content=document.createElement('div');
        close.type='button';close.textContent='关闭预览';close.onclick=()=>{cancelPreview('预览已关闭。');box.hidden=true;};
        elapsed.dataset.previewElapsed='true';elapsed.style.display='block';
        content.dataset.previewContent='true';content.setAttribute('role','status');content.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;max-height:320px;overflow:auto;font:inherit';
        box.append(title,close,elapsed,content);if(globalThis.XxtPanelLayout)globalThis.XxtPanelLayout.placePreview(panel,box);else panel.querySelector('.xxt-status-card').after(box);
    }


    function mount() {
        if (panel || !(backgroundManual || XxtManualVerification.requiresManual() || coursePage() || D.extract(document).length || D.readResult(document) || Q.find(document))) return;
        panel = document.createElement('section'); panel.setAttribute('data-xxt-codex-panel', 'true'); panel.setAttribute('data-html2canvas-ignore', 'true');
        panel.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;width:340px;max-height:65vh;overflow:auto;background:white;color:#172033;border:1px solid #abb8c8;border-radius:10px;padding:14px;box-shadow:0 3px 20px #0002;font:14px/1.6 sans-serif;text-align:left';
        const title = document.createElement('strong'); title.textContent = '学习助手'; panel.append(title);
        const actions = document.createElement('div');
        for (const [action, label] of [['connect', '测试 AI'], ['start', '开始自动'], ['solve', '预览 AI 答案'], ['stop', '停止']]) {
            const button = document.createElement('button'); button.textContent = label; button.dataset.action = action; button.style.cssText = 'margin:8px 4px 8px 0;padding:5px 9px;cursor:pointer';
            button.addEventListener('click', async () => {
                let connectionNotice,connectionTimer;
                try {
                    if(!['start','stop'].includes(action)&&verificationBlocked()){holdVerification();return;}
                    if (action === 'stop') stop();
                    if (action === 'start') await start({ manual: true });
                    if (action === 'solve') await previewAnswers();
                    if (action === 'connect') {
                        if (!aiEnabled()) { notify('不接入 AI 模式无需连接测试，点击“开始自动”即可。'); return; }
                        if (busy) throw new Error('请先停止当前任务再测试 AI');
                        if (quietNow()) { notify('夜间休息中，07:00 后可测试 AI'); return; }
                        button.disabled=true;button.textContent='正在测试…';
                        apiFailureShown=false;apiFailureUntil=0;
                        let onProgress;
                        if((XxtAi.load().key&&['codex','codebuddy'].includes(XxtAi.load().protocol))||['codex','codebuddy'].includes(XxtAi.imageConfig()?.protocol)){
                            const started=Date.now(),completed=[];let phase='正在连接本地服务';
                            connectionNotice=document.createElement('aside');connectionNotice.className='xxt-test-wait';connectionNotice.dataset.connectionTestWait='true';connectionNotice.setAttribute('role','status');
                            const heading=document.createElement('strong'),tip=document.createElement('p'),status=document.createElement('p'),help=document.createElement('small');
                            const localName=[XxtAi.load(),XxtAi.imageConfig()].some(c=>c?.protocol==='codebuddy')?'CodeBuddy / WorkBuddy':'Codex';heading.textContent=`本地 ${localName} 测试可能需要更长时间，请耐心等待`;tip.textContent=`需要启动 ${localName} CLI 并依次调用模型验证文字和已选图片，可能持续数十秒或更久。`;help.textContent='请保持 PowerShell 服务窗口开启；无需重复点击，可点“停止”取消。';
                            connectionNotice.append(heading,tip,status,help);actions.after(connectionNotice);
                            const render=()=>{const value=[...completed,phase,`已用 ${Math.floor((Date.now()-started)/1000)} 秒`].join(' · ');if(status.textContent!==value)status.textContent=value;};
                            onProgress=info=>{if(info.phase==='done'){completed.push(`${info.role}${info.success?'已通过':'未通过'}`);phase='正在整理测试结果';}else phase=info.phase==='health'?'正在连接本地服务':`正在验证${info.role}${info.role==='图片'?'识别':'作答'}`;render();};
                            render();connectionTimer=setInterval(render,1000);notify(`正在测试本地 ${localName}，请查看按钮下方的进度提示。`);
                        }
                        let result;
                        try{result=await request('/test-selected',{onProgress});}catch(error){
                            if(!/停止|取消|夜间/.test(error.message)){const c=XxtAi.load();globalThis.XxtAssistantTheme.testResult(button,{success:false,results:[{role:'文字',provider:c.provider,model:c.model,character:XxtPersonas.character(c),success:false,...XxtPersonas.explain(error)}]});}throw error;
                        }
                        notify(result.success?'AI 连接测试通过，点击“开始自动”即可。':'部分接口测试未通过，请查看结果中的原因。');
                        globalThis.XxtAssistantTheme.testResult(button,result);
                    }
                } catch (error) { notify(error.message); }
                finally { clearInterval(connectionTimer);connectionNotice?.remove();if(action==='connect'){button.disabled=false;button.textContent=label;} }
            });
            actions.append(button);
        }
        const output = document.createElement('pre'); output.style.cssText = 'white-space:pre-wrap;word-break:break-word;font:inherit;margin:0';
        const details = document.createElement('details');details.dataset.questionPreviews='true'; const summary = document.createElement('summary'); summary.textContent = '查看发送给 AI 的题目截图'; details.append(summary);
        const savedLog=document.createElement('details');savedLog.dataset.savedQuizzes='true';
        const savedSummary=document.createElement('summary');savedSummary.textContent='暂时保存的测验';
        const savedNote=document.createElement('p');savedNote.textContent='仅记录确认“保存成功”的测验。点击可返回原章节及测验，不会自动作答或提交；当前提交状态以平台为准。显示最近20份，历史保存记录不等于任务完成。';
        savedLog.append(savedSummary,savedNote,document.createElement('ul'));
        const runLog = document.createElement('details'); runLog.dataset.skippedLog = 'true';
        const logTitle = document.createElement('summary'); logTitle.textContent = '跳过记录';
        const logNote = document.createElement('p'); logNote.textContent = taskPointsOnly() ?
            '仅任务点模式遇到无法确认的归属或完成状态时暂停，等待人工核对；不会自动恢复后扩大处理范围。记录仅保存在当前浏览器。' :
            '自动异常在 AI 模式下每章先测试 AI 并重新开始一次（短请求可能计费）；不接入 AI 时直接记录并继续。跳过不等于平台已完成。记录仅保存在当前浏览器，显示最近20项。';
        runLog.append(logTitle, logNote, document.createElement('ul'));
        const retryButton=document.createElement('button');retryButton.type='button';retryButton.dataset.retryPending='true';retryButton.textContent='集中补做未完成章节';retryButton.hidden=!coursePage();
        retryButton.onclick=async()=>{if(verificationBlocked()){holdVerification();return;}stop();if(!ledgerValid()){notify('无法确认当前账号或课程标识，请手动打开待复核章节。');return;}const chapters=XxtRunLedger.plan(liveSkippedRecords(),catalogSnapshot().filter(entry=>!noTaskChapters.has(catalogKey(entry))),ledgerScope);
            if(!chapters.length){notify('已复查当前目录，没有可安全补做的跳过章节；目录已完成项已移出待复核，旧记录、目录变化或提交结果未确认项需手动检查。');return;}
            retryButton.disabled=true;notify(`已复查当前目录，准备补做 ${chapters.length} 个跳过章节。`);retryQueue={remaining:chapters,current:null};try{await nextRetryChapter(false);}catch(error){pause(error.message,false);retryQueue=null;}finally{retryButton.disabled=false;}};
        runLog.append(retryButton);
        const preloadLabel=document.createElement('label'),preload=document.createElement('input');preload.type='checkbox';preload.checked=GM_getValue('xxt-prefetch',false);preload.dataset.prefetch='true';
        const prefetchStatus=document.createElement('small');prefetchStatus.dataset.prefetchStatus='true';prefetchStatus.setAttribute('role','status');prefetchStatus.style.display='block';prefetchStatus.textContent=preload.checked?'预读已开启：开始自动时检查可用链接。':'预读默认关闭；只读取页面结构，不检测或完成任务。';
        preload.onchange=()=>{locator.clear();GM_setValue('xxt-prefetch',preload.checked);void preparePrefetch();};preloadLabel.append(preload,'同源章节预读（可选）');runLog.append(preloadLabel,prefetchStatus);
        const exportLog = document.createElement('button'); exportLog.type='button';exportLog.dataset.exportDiagnostics='true';exportLog.textContent='导出脱敏诊断';
        exportLog.onclick=()=>{const value=diagnostics.export(globalThis.XxtRelease?.version || '1.1.0');const url=URL.createObjectURL(new Blob([value],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='learning-assistant-diagnostics.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
        const privacyNote=document.createElement('p');privacyNote.textContent='诊断仅含错误分类、发生时间和批次数量，不含密钥、题目、截图、课程地址或接口原始响应。导出后可自行检查并附到反馈中，不会自动上传。';runLog.append(exportLog,privacyNote);
        panel.append(actions, output, details);
        themeStatus = XxtAssistantTheme.decorate(panel, { title, actions, output, details, runLog, savedLog, studyControls:true, playbackRate: getPlaybackRate(), onRateChange: changePlaybackRate, videoAdvance:selectedVideoAdvance,onVideoAdvanceChange:changeVideoAdvance,forceRateEnabled: selectedForceRate, onForceRateChange: changeForceRate, muted: selectedMuted, onMutedChange: changeMuted,
            onAiChange: () => { stop(); notify('AI 配置已更改，请测试后重新开始自动。'); }, onShortAnswerChange:()=>{stop();notify('简答题设置已更改，请点击“开始自动”继续。');}, onQuietChange: () => syncQuietHours().catch(error => pause(error.message)) });
        if (taskPointsOnly()) {
            const scopeNote = document.createElement('p'); scopeNote.dataset.taskPointScope = 'true';
            scopeNote.textContent = '仅任务点模式：只做未完成任务点；已完成直接跳过；加载稳定后确认无任务点的内容跳过。标题 * 不代替平台任务点判断。';
            (panel.querySelector('.xxt-body') || panel).prepend(scopeNote);
        }
        mountPreviewBox();
        document.body.append(panel); notify(messageValue);
        if(isTop&&coursePage())globalThis.XxtCourseHub?.attach(panel,{
            catalog:catalogSnapshot,isTaskRelevant:entry=>!noTaskChapters.has(catalogKey(entry)),canStart:()=>!quietNow()&&!verificationBlocked()&&!previewClient&&!previewWorker&&!unloaded,
            start:()=>start({manual:true}),stop:()=>stop(false),
            skip:async()=>{if(quietNow()||verificationBlocked()||previewClient||previewWorker)throw Error('请先结束休息、验证或预览');
                stop(false);automatic=true;stopped=false;setTask(courseTask());completedTasks.delete(courseTask());
                sessionStorage.setItem(autoKey,'1');rememberSkipped('用户主动跳过当前章节，待复核');await advanceCourse('用户主动跳过当前章节',true,true);}
        });
        if(apiFailureUntil>Date.now())themeStatus.showApiFailure(apiFailureUntil,apiFailureAutomatic);
        if (coordinator && !coursePage()) panel.hidden = true;
    }
    function descendant(root, target, depth = 0) {
        if (root === target) return true;
        if (depth > 6) return false;
        try { for (let index = 0; index < root.frames.length; index++) if (descendant(root.frames[index], target, depth + 1)) return true; } catch {}
        return false;
    }
    function visibleDescendant(root, target, depth = 0) {
        if (depth > 6) return false;
        try {
            for (const frame of root.document.querySelectorAll('iframe')) {
                if (!D.visible(frame) || frame.getBoundingClientRect().height < 1) continue;
                if (frame.contentWindow === target || visibleDescendant(frame.contentWindow, target, depth + 1)) return true;
                // Across origins, only accept descendants of a visible outer frame during a known check step.
                if ((checkStep() || expectedCheckTask === courseTask() || expectedVideoTask === courseTask()) && descendant(frame.contentWindow, target)) return true;
            }
        } catch {}
        return false;
    }
    function canClaim(source, view = {}) {
        if (view.viewVisible === false) return false;
        if (!visibleDescendant(pageWindow, source)) return false;
        if (view.viewVisible === true) return true;
        const el = document.querySelector('.prev_title');
        const title = el?.title || D.text(el);
        if (!checkStep() && expectedCheckTask !== courseTask() && /视频|安全知识|学习目标/.test(title)) return false;
        if (!checkStep() && expectedCheckTask !== courseTask() && window.app?._videoEl?.isConnected && !window.app._videoEl.ended) return false;
        return true;
    }
    function canClaimVideo(source, view = {}) {
        if (view.viewVisible === false) return false;
        if (view.viewVisible === true) return visibleDescendant(pageWindow, source);
        return visibleDescendant(pageWindow, source) && expectedCheckTask !== courseTask() &&
            (!checkStep() || expectedVideoTask === courseTask());
    }
    function parentHasVideo() {
        const app = window.app;
        return app?._isLiveVideo ? app._isLiveVideo(app._videoEl) : !!app?._videoEl?.isConnected;
    }
    function handleMessage(event) {
        let allowed = false;
        try { allowed = /(^|\.)chaoxing\.com$/.test(new URL(event.origin).hostname); } catch {}
        const data = event.data;
        if (!allowed || !data || data.source !== 'xxt-codex-0.3') return;
        if(data.type==='manual-verification'&&typeof data.required==='boolean'&&typeof data.nonce==='string'&&data.nonce.length<=64&&event.source!==pageWindow&&descendant(pageWindow,event.source)&&visibleDescendant(pageWindow,event.source)){
            verificationSources.set(event.source,{nonce:data.nonce,required:data.required});if(coursePage()||isTop)post(event.source,'owner',{target:data.nonce});if(data.required)holdVerification();return;
        }
        if(data.type==='verification-hold'&&!isTop&&Number.isFinite(ancestorDistance(event.source))){backgroundManual=true;holdVerification();return;}
        if(data.type==='verification-resume'&&!isTop&&data.target===nonce&&Number.isFinite(ancestorDistance(event.source))&&!XxtManualVerification.requiresManual()){releaseVerification();return;}
        if(backgroundManual&&!['owner','stop','quiet-rest','preview-cancel'].includes(data.type))return;
        if(coursePage()&&data.type==='force-rate-info'&&selectedForceRate&&automatic&&!stopped&&data.task===courseTask()&&frames.get(event.source)?.nonce===data.nonce&&typeof data.value==='string'&&data.value.length<=500){
            const hint=panel?.querySelector('[data-setting="force-rate-status"]');if(hint)hint.textContent=data.value;return;
        }
        if (data.type === 'preview-ready' && event.source !== pageWindow && descendant(pageWindow,event.source)) {
            if (typeof data.nonce === 'string' && Number.isInteger(data.count) && data.count > 0 && data.count <= 256 && canClaim(event.source,data)) previewWorkers.set(event.source,{nonce:data.nonce,count:data.count,viewVisible:data.viewVisible,at:Date.now()});
            return;
        }
        if (['preview-progress','preview-result','preview-error'].includes(data.type)) { receivePreview(event.source,data); return; }
        if (!isTop && data.target === nonce && Number.isFinite(ancestorDistance(event.source))) {
            if (data.type === 'preview-cancel' && previewWorker?.source === event.source && previewWorker.id === data.requestId) { cancelPreview(); return; }
            if (data.type === 'preview-request' && typeof data.requestId === 'string' && data.requestId.length <= 80 && typeof data.context === 'string' && data.context.length <= 4096 && chooseCoordinator(event.source)) { void executePreview(event.source,data); return; }
            if ((previewWorker || previewClient) && ['grant','grant-video','grant-document','grant-video-quiz'].includes(data.type)) return;
        }

        if (coursePage() && event.source !== pageWindow && descendant(pageWindow, event.source)) {
            if (quietNow() && !['stop', 'pause', 'ready', 'video-ready', 'document-ready'].includes(data.type)) return;
            if (data.type === 'video-quiz-ready' && pendingTaskEntry({win:event.source}) && !skippedQuizWindows.has(event.source) && data.viewVisible !== false && visibleDescendant(pageWindow, event.source)) {
                if (task && task !== courseTask()) return;
                if (typeof data.quizSignature !== 'string' || retiredQuizForms.has(`${data.nonce}/${data.quizSignature}`)) return;
                // Document access alone does not prove the parent scanner saw
                // this dynamically mounted form. Delegate only a missing form;
                // retain an existing child lease until it reports completion.
                const detectedHere = Q.across(pageWindow).some(hit => hit.win === event.source);
                if (quizFrames.has(event.source) || !detectedHere) {
                    const previous = quizFrames.get(event.source);
                    const newClaim = !previous || previous.nonce !== data.nonce || previous.task !== courseTask() || previous.signature !== data.quizSignature;
                    quizFrames.set(event.source, { nonce: data.nonce, task: courseTask(), at: Date.now(), signature: data.quizSignature });
                    post(event.source, 'owner', { target: data.nonce });
                    if (automatic && !stopped) post(event.source, 'grant-video-quiz', { target: data.nonce, task: courseTask(), resume: newClaim, taskPointRequired:taskPointsOnly() });
                }
            }
            if (data.type === 'video-quiz-finished' && data.task === courseTask() && quizFrames.get(event.source)?.nonce === data.nonce) {
                quizFrames.delete(event.source);
                if (automatic && !stopped && parentHasVideo()) {
                    if (window.app._getVideoEl()?.ended) window.app._continueAfterVideo(); else window.app.play();
                }
            }
            if (data.type === 'document-ready' && !F.find(document).length && !completedDocumentSenders.has(data.nonce) &&
                (!documentOwner || documentOwner === event.source || !canClaim(documentOwner, frames.get(documentOwner))) &&
                canClaim(event.source, data)) {
                documentOwner = event.source;
                const previous = frames.get(event.source);
                frames.set(event.source, { nonce: data.nonce, kind: 'document', running: previous?.nonce === data.nonce && previous?.running, viewVisible: data.viewVisible, seenAt: Date.now() });
                post(event.source, 'owner', { target: data.nonce });
                if (automatic && !stopped) grant(event.source, frames.get(event.source));
            }
            if (['document-finished', 'document-unrecognized'].includes(data.type) && automatic && !stopped && data.task === courseTask() &&
                frames.get(event.source)?.nonce === data.nonce && !completedDocumentSenders.has(data.nonce)) {
                if (data.type === 'document-finished') {
                    const ids = Array.isArray(data.documentIds) ? data.documentIds : [];
                    for (const asset of pageInventory()?.documents || []) {
                        if (asset.root !== event.source && !descendant(asset.root, event.source) && !descendant(event.source, asset.root)) continue;
                        if (asset.entry && (ids.includes(asset.entry.id) ||
                            (asset.entry.inline && asset.entry.element.tagName === 'IFRAME' &&
                                (asset.root === event.source || descendant(asset.root, event.source)))))
                            completedFileAssets.add(asset.id);
                    }
                }
                completedDocumentSenders.add(data.nonce);
                documentOwner = null; pageReviewNeeded = true;
                if (data.type === 'document-unrecognized') { completedDocumentSenders.delete(data.nonce); pause(`文献任务未完成：${data.reason || '无法识别预览'}`); }
                else afterDocuments().catch(error => pause(error.message));
            }
            if (data.type === 'confirm-request' && automatic && !stopped && data.task === courseTask() &&
                frames.get(event.source)?.nonce === data.nonce && frames.get(event.source)?.kind === 'check' &&
                canClaim(event.source, frames.get(event.source)) && typeof data.requestId === 'string' && ['submit', 'redo'].includes(data.kind)) {
                pendingConfirmations.set(data.requestId, { source: event.source, nonce: data.nonce, task: data.task, kind: data.kind, at: Date.now() });
            }
            if (data.type === 'confirm-cancel' && pendingConfirmations.get(data.requestId)?.source === event.source) pendingConfirmations.delete(data.requestId);
            if (data.type === 'video-ready' && canClaimVideo(event.source, data) &&
                !(data.ended && expectedCheckTask === courseTask()) && !completedMedia.has(`${data.nonce}/${data.mediaId}`)) {
                const previous = frames.get(event.source);
                frames.set(event.source, { nonce: data.nonce, kind: 'video', mediaKind: data.mediaKind === 'audio' ? 'audio' : 'video', mediaId: data.mediaId, ended: data.ended,
                    currentTime:Number.isFinite(data.currentTime)?data.currentTime:null,duration:Number.isFinite(data.duration)?data.duration:null,seeking:data.seeking===true,
                    running: previous?.nonce === data.nonce && previous?.running, viewVisible: data.viewVisible, seenAt: Date.now() });
                post(event.source, 'owner', { target: data.nonce });
                // The original player owns same-origin videos; the agent is for inaccessible players.
                if (automatic && !stopped && !parentHasVideo()) grant(event.source, frames.get(event.source));
            }
            if (data.type === 'video-ended' && automatic && !stopped && data.task === courseTask() && frames.get(event.source)?.nonce === data.nonce &&
                frames.get(event.source)?.mediaId === data.mediaId && !completedMedia.has(`${data.nonce}/${data.mediaId}`)) {
                if(isTop)globalThis.XxtCourseHub?.mediaEnded();
                completedMedia.add(`${data.nonce}/${data.mediaId}`);
                expectedVideoTask = '';
                if (!finishVideo()) window.app?._continueAfterVideo();
            }
            if (data.type === 'ready' && !completedSenders.has(data.nonce) && canClaim(event.source, data)) {
                const previous = frames.get(event.source);
                frames.set(event.source, { nonce: data.nonce, kind: 'check', running: previous?.nonce === data.nonce && previous?.running, viewVisible: data.viewVisible, seenAt: Date.now() }); frameClaimAt = Date.now(); frameClaimTask = courseTask();
                post(event.source, 'owner', { target: data.nonce });
                if (automatic && !stopped) grant(event.source, frames.get(event.source));
            }
            if (data.type === 'start') { automatic = true; stopped = false; setTask(courseTask()); frames.set(event.source, { nonce: data.nonce }); grant(event.source, frames.get(event.source), true); }
            if (data.type === 'stop') {
                forceRate.releaseAll(); recoverySerial++; resumeAfterQuiet = false; pause(data.reason || '自动模式已停止。', false); }
            if(data.type==='skip-check'&&automatic&&!stopped&&data.task===courseTask()&&frames.get(event.source)?.nonce===data.nonce){void recoverAutomatic(data.reason,false);}
            if(data.type==='short-answer-deferred'&&automatic&&!stopped&&data.task===courseTask()&&frames.get(event.source)?.nonce===data.nonce&&
                frames.get(event.source)?.kind==='check'&&canClaim(event.source,frames.get(event.source))&&
                ['save','skip','submit'].includes(data.detail?.mode)&&['saved','skipped','uncertain'].includes(data.detail?.state)&&
                typeof data.reason==='string'&&data.reason.length<=3000&&Number.isInteger(data.detail?.total)&&data.detail.total>0&&data.detail.total<=XxtCodexCore.pageQuestionLimit&&
                Array.isArray(data.detail?.essays)&&data.detail.essays.length<=data.detail.total){
                try{deferOwnedCheck(event.source,data.reason,{mode:data.detail.mode,state:data.detail.state,total:data.detail.total,
                    essays:data.detail.essays.filter(item=>Number.isInteger(item.number)&&item.number>0&&item.number<=data.detail.total).map(item=>({number:item.number,kind:String(item.kind).slice(0,40),id:String(item.id).slice(0,80)}))});}
                catch(error){pause(error.message,false);}
            }
            if(data.type==='check-awaiting-review'&&automatic&&!stopped&&data.task===courseTask()&&frames.get(event.source)?.nonce===data.nonce&&
                frames.get(event.source)?.kind==='check'&&canClaim(event.source,frames.get(event.source))&&typeof data.fingerprint==='string'&&data.fingerprint.length<=200){
                try{beforeClick();rememberAwaitingReview(event.source);notify('已提交，待批阅；最终成绩以老师批阅为准，继续本章其余任务。');}
                catch(error){pause(error.message,false);}
            }
            if (data.type === 'pause') pause(data.reason || '自动模式已停止。', data.manual !== true);
            if (data.type === 'finished' && automatic && data.task === courseTask() && frames.get(event.source)?.kind === 'check' &&
                frames.get(event.source)?.nonce === data.nonce && !completedSenders.has(data.nonce)) {
                completedSenders.add(data.nonce); pageReviewNeeded = true; advanceCourse(data.reason).catch(error => pause(error.message));
            }
            if(data.type==='ai-call-failed' && automatic && !stopped && !quietNow() && data.task===courseTask() &&
                (frames.get(event.source)?.nonce===data.nonce || quizFrames.get(event.source)?.nonce===data.nonce))showApiFailure(data.wasAutomatic===true);
            if (data.type === 'status' && automatic && !stopped && !quietNow() && data.task === courseTask() && !completedSenders.has(data.nonce) &&
                !(data.value === '正在播放本节视频…' && hasVideoQuiz())) notify(data.value);
        } else if (!isTop && data.target === nonce && chooseCoordinator(event.source)) {
            if (data.type === 'quiet-rest') { suspendForQuiet(); resumeAfterQuiet = data.resume; }
            if (data.type === 'confirm-done' && submitRequest?.id === data.requestId && submitRequest.kind === data.kind && submitRequest.task === data.task && automatic && !stopped) submitRequest.confirmed = true;
            if (data.type === 'grant' || data.type === 'grant-document') {
                grantedTaskPoint = data.taskPointRequired === true;
                const newlyGranted = !parentManaged || task !== data.task || data.resume;
                grantAt = Date.now(); parentManaged = true;
                if (data.type === 'grant-document') grantedDocumentIds = Array.isArray(data.documentIds) && data.documentIds.every(id => typeof id === 'string') ? data.documentIds : null;
                if (data.resume) { stopped = false; navigationRequested = false; if (data.type === 'grant-document') documentReportedTask = ''; }
                if (!stopped) { setTask(data.task); automatic = true; if (newlyGranted) notify('检测页已接管，正在读取平台成绩或题目…'); }
            }
            if (data.type === 'grant-video') {
                grantedTaskPoint = data.taskPointRequired === true;
                if(typeof data.forceRate==='boolean')selectedForceRate=data.forceRate; if(data.resume)forceRate.releaseAll(true);
                if (data.mediaId !== remoteMediaId) return;
                if (data.resetVideoLines) videoLines?.reset();
                remoteVideoTask = data.task; selectedPlaybackRate = remoteVideoRate = XxtCodexCore.normalizePlaybackRate(data.rate); parentManaged = true;
                if (typeof data.muted === 'boolean') selectedMuted = data.muted;
                if (data.resume) stopped = false;
                if (!stopped) automatic = true;
            }
            if (data.type === 'settle-video' && data.task === remoteVideoTask && data.mediaId === remoteMediaId &&
                automatic && !stopped && !quietNow() && renderedInPage !== false && !Q.find(document)) {
                const key = `${data.task}/${data.mediaId}`;
                if (remoteSettlementRequests.has(key)) return;
                const replay = P?.replayControl(remoteVideo);
                if (replay) {
                    remoteSettlementRequests.add(key); remoteSettlementMedia = remoteMediaId;
                    replay.click();
                }
            }
            if (data.type === 'set-playback-rate' && (data.task === task || data.task === remoteVideoTask)) {
                selectedPlaybackRate = XxtCodexCore.normalizePlaybackRate(data.rate); if(typeof data.forceRate==='boolean')selectedForceRate=data.forceRate; forceRate.releaseAll(true); syncPlaybackRate();
                const select = panel?.querySelector('[data-setting="playback-rate"]'); if (select) select.value = String(selectedPlaybackRate);
            }
            if (data.type === 'set-muted' && typeof data.muted === 'boolean' && (data.task === task || data.task === remoteVideoTask)) {
                selectedMuted = data.muted; syncMuted();
                const input = panel?.querySelector('[data-setting="muted"]'); if (input) input.checked = selectedMuted;
            }
            if (data.type === 'grant-video-quiz') {
                grantedTaskPoint = data.taskPointRequired === true;
                if (data.resume) {
                    if (videoQuizRun !== null) { epoch++; inFlight?.abort(); XxtAi.cancelImageTest(); }
                    stopped = false;
                }
                if (!stopped) { setTask(data.task); parentManaged = true; quizAuthorized = true; automatic = true; }
            }
            if (data.type === 'stop') {
                cancelPreview();
                resumeAfterQuiet = false;
                closeDocument();
                cancelConfirmation(); pendingConfirmations.clear();
                automatic = false; stopped = true; epoch++; inFlight?.abort(); XxtAi.cancelImageTest(); remoteVideo?.pause();
                messageValue = '自动模式已停止。'; if (panel) panel.querySelector('pre').textContent = messageValue;
            }
        }
    }
    globalThis.XxtCodexControl = {
        isQuietHours: quietNow,
        allowPageGuards:()=>automatic&&!stopped&&!quietNow()&&!verificationBlocked(),
        getPlaybackRate, applyPlaybackRate: applyMediaRate,
        getMuted, audioBlocked,
        videoCandidate: P ? videoCandidate : undefined,
        finishVideo,
        beforeNextChapter() {
            if(verificationBlocked()){holdVerification();return true;}
            if (!coursePage() || completedTasks.has(courseTask())) return false;
            if (hasVideoQuiz() || videoFinishProbe?.pending) return true;
            if (!checkStep() && expectedCheckTask !== courseTask()) return finishVideo();
            return true;
        },
        hasVideoQuiz,
        shouldHold() { if(verificationBlocked())return true; if (coursePage() && !automatic) return true;
            if(isTop&&globalThis.XxtCourseHub?.mediaGate(videoCandidate()))return true;
            if (coursePage() && P && pageInventory().videos.length) return quietNow() || stopped || hasVideoQuiz() || !!stepTransition || !videoCandidate();
            return quietNow() || hasVideoQuiz() || (coursePage() && (stopped || !!stepTransition || R?.find(pageWindow).some(entry => !topicDone.has(entry.element)) || expectedDocumentTask === courseTask() || F.find(document).length > 0 || expectedCheckTask === courseTask() ||
            (expectedVideoTask !== courseTask() && (checkStep() || (frameClaimTask === courseTask() && Date.now() - frameClaimAt < 4000))))); },
        noteVideoNavigation() {
            videoFinishProbe = null;
            if (openedDocument) { closeDocument(); epoch++; }
            expectedDocumentTask = '';
            expectedCheckTask = ''; expectedVideoTask = courseTask(); frameClaimAt = 0;
            if (automatic && !stopped) notify('已切换到新视频，正在重新接管播放…');
        },
        onVideoPlaying() { if (automatic && !stopped && !hasVideoQuiz() && !videoLines?.active(window.app?._videoEl) && expectedCheckTask !== courseTask()) notify(`正在播放本节${P?.mediaLabel(window.app?._videoEl) || '视频'}…`); },
        enterCheckStep(status) {
            if(verificationBlocked()){holdVerification();return true;}
            if (hasVideoQuiz()) return true;
            if (quietNow()) return true;
            if (stopped) return true;
            if (transitionBlocked(false)) return true;
            if (pageInventory()?.questions.some(asset => !questionDone(asset))) return true;
            if (expectedCheckTask === courseTask()) return true;
            if (!coursePage() || completedTasks.has(courseTask())) return false;
            if (nextStudyStep()) return true;
            if (P?.steps(document).items.length) return false;
            const tab = findCheckTab();
            if (!tab) return false;
            expectedCheckTask = courseTask(); expectedVideoTask = '';
            tab.click(); window.app?._clearCheckInterval(); notify(status || (automatic ? '视频结束，进入学习检测…' : '已进入学习检测，点击“开始自动”可作答。')); return true;
        }
    };
    window.addEventListener('message', handleMessage);
    document.addEventListener('visibilitychange', recheckForeground);
    for (const type of ['loadedmetadata','play','volumechange']) document.addEventListener(type, keepMediaMuted, true);
    window.addEventListener('focus', recheckForeground);
    mount();
    let tabAudioStarted=false;
    tabAudio?.observe(()=>{syncMuted();audioStatus();});
    syncMuted(); audioStatus();
    if(coursePage()||P?.playable(document).length){tabAudioStarted=true;void tabAudio?.start();}
    const verificationObserver=new MutationObserver(()=>{if(!unloaded)inspectVerification();});
    verificationObserver.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class','hidden']});
    inspectVerification();
    // Preserve only an explicitly started run, in this tab and this course.
    // Stops/errors clear it; first visits and other courses never auto-submit.
    if (isTop && coursePage() && taskPointsOnly() && sessionStorage.getItem(`${autoKey}/task-points-confirmed`) !== '1') {
        sessionStorage.removeItem(autoKey);
        globalThis.XxtCourseHub?.hold('已切换为仅任务点模式，请手动点击开始自动。');
    }
    if (isTop && coursePage() && sessionStorage.getItem(autoKey) === '1') start().catch(error => pause(error.message));
    const timer = setInterval(() => { tick().catch(error => pause(error.message)); }, 700);
    window.addEventListener('pagehide', () => { tabAudio?.destroy(); verificationObserver.disconnect(); forceRate.releaseAll(); cancelPreview('页面已离开，预览已取消。'); locator.close(); topicOwner?.cancel(); discussionOwner?.close(); closeDocument(); cancelConfirmation(); pendingConfirmations.clear(); unloaded = true; stopped = true; epoch++; inFlight?.abort(); XxtAi.cancelImageTest(); visibilityObserver?.disconnect(); clearInterval(timer); for (const type of ['loadedmetadata','play','volumechange']) document.removeEventListener(type, keepMediaMuted, true); }, { once: true });
})();
