import {chromium} from './browser-runtime.mjs';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const bundle = await readFile(new URL('../dist/xuexitong-task-points-only.user.js', import.meta.url), 'utf8');
const browser = await chromium.launch({headless:true, args:['--autoplay-policy=no-user-gesture-required']});
const observations = [];
const marker = '<div class="ans-job-icon" aria-label="任务点未完成"></div>';
const quiz = `<div class="TiMu"><div class="Zy_TItle"><span class="newZy_TItle">【单选题】</span>1+1?</div><ul class="Zy_ulTop"><li><span class="num_option choice1">A</span><a class="after">2</a></li><li><span class="num_option choice1">B</span><a class="after">3</a></li></ul></div>`;
async function scenario(name) {
    const context = await browser.newContext({viewport:{width:1400,height:1100}}), events=[];
    await context.exposeBinding('__event', (_, value) => events.push(value));
    await context.addInitScript(() => {
        window.unsafeWindow = window;
        window.GM_getValue = (key, fallback) => {const raw=localStorage.getItem(key);return raw===null?fallback:JSON.parse(raw);};
        window.GM_setValue = (key, value) => localStorage.setItem(key, JSON.stringify(value));
        GM_setValue('xxt-quiet-enabled',false);
        GM_setValue('xxt-ai-enabled',true);
        GM_setValue('xxt-ai-config',{provider:'codex',protocol:'codex',baseUrl:'http://127.0.0.1:18763',key:'b'.repeat(64)});
        // A custom build must remain strict even with a stale opt-out setting.
        GM_setValue('xxt-task-points-only',false);
        window.GM_xmlhttpRequest = config => {
            const payload=config.data&&JSON.parse(config.data);
            __event(payload?'model':'probe');
            setTimeout(()=>config.onload({status:200,responseText:JSON.stringify(payload?{answers:payload.questions.map(q=>({id:q.id,choices:q.type==='ordering'?[]:['A'],...(q.type==='ordering'?{texts:['C','A','B']}:{}),confidence:1,readable:true,explanation:'Synthetic'}))}:{ok:true})}),30);
            return {abort(){}};
        };
    });
    await context.route('**/*', async route => {
        const u=new URL(route.request().url());let html='';
        if(u.pathname==='/mycourse/studentstudy') html=`<div class="prev_title">章节测验</div><div id="coursetree"><div class="posCatalog_select posCatalog_active"><span class="posCatalog_name">第一章</span><span class="orangeNew">1</span></div><div class="posCatalog_select"><span class="posCatalog_name">下一章</span></div></div><iframe id="iframe" src="/mooc-ans/knowledge/cards" style="width:1000px;height:800px"></iframe><button id="next">下一节</button><script>document.querySelector('#next').onclick=()=>{__event('next');document.querySelector('.posCatalog_active').classList.remove('posCatalog_active');document.querySelectorAll('.posCatalog_select')[1].classList.add('posCatalog_active');document.querySelector('#iframe').remove();document.querySelector('#next').disabled=true;};</script>`;
        else if(u.pathname==='/mooc-ans/knowledge/cards') {
            const cross=name==='cross-origin';
            const frame=`<iframe src="${cross?'https://mooc1-1.chaoxing.com':''}/work?main=1" style="width:850px;height:420px"></iframe>`;
            const done=name==='completed-editable'||name==='completed-result';
            const required=!['optional','optional-media','unknown-marker'].includes(name);
            html=`<div class="ans-attach-ct ${done?'ans-job-finished':''}" data-main>${required?marker:''}${frame}</div>`;
            if(name==='unknown-marker')html+=`<div class="ans-attach-ct">${marker}<p>无法识别的必做任务</p></div>`;
            if(name==='mixed-inline')html=`<div class="ans-attach-ct">${marker}${quiz}</div><div class="ans-attach-ct">${quiz}</div><a class="btnSubmit workBtnIndex">提交</a><script>document.querySelector('.btnSubmit').onclick=()=>__event('mixed-submit');</script>`;
            // These optional assets must never open or receive a model call.
            html+=`<div class="ans-attach-ct"><button class="file" title="Optional.pdf">Optional.pdf</button></div><div class="ans-attach-ct"><iframe module="insertbbs" src="/mooc-ans/bbscircle/chapter" style="width:850px;height:180px"></iframe></div><script>document.querySelector('.file').onclick=()=>__event('optional-document');window.addEventListener('message',e=>{if(e.data?.syntheticTaskComplete)document.querySelector('[data-main]').classList.add('ans-job-finished');});</script>`;
            if(name==='optional-media')html+=`<div class="ans-attach-ct"><video controls style="width:400px;height:100px"></video><script>document.querySelector('video').play=()=>{__event('optional-play');return Promise.resolve()};</script></div>`;
            if(name==='required-media')html=`<div class="ans-attach-ct" data-main>${marker}<video controls style="width:600px;height:200px"></video></div><div class="ans-attach-ct"><button class="file" title="Optional.pdf">Optional.pdf</button></div><script>const video=document.querySelector('video');let paused=true;Object.defineProperty(video,'paused',{get:()=>paused});video.play=()=>{paused=false;__event('required-play');setTimeout(()=>document.querySelector('[data-main]').classList.add('ans-job-finished'),500);return Promise.resolve()};video.pause=()=>{if(!paused)__event('required-pause');paused=true};document.querySelector('.file').onclick=()=>__event('optional-document');</script>`;
        } else if(u.pathname==='/work') {
            html=name==='completed-result'?'<p>满分:100</p><p>最终成绩60分</p><button id="redo">重做</button>':quiz+'<a class="btnSubmit workBtnIndex">提交</a>';
            if(name==='ordering')html=`<div class="TiMu"><div class="Zy_TItle"><span class="newZy_TItle">【排序题】</span>Order these items</div><div id="sortQues_100"><ul class="sortQuesOption">${['A','B','C'].map(k=>`<li><div><i>${k}.</i><span>Item ${k}</span></div></li>`).join('')}</ul><ul class="sortQuesSelect">${[1,2,3].map(()=>`<li><select><option value="-">-</option>${['A','B','C'].map(k=>`<option value="${k}">${k}</option>`).join('')}</select></li>`).join('')}</ul></div><input type="hidden" id="answer100" name="answer100"><input type="hidden" id="answertype100"></div><a class="btnSubmit workBtnIndex">提交</a><script>document.querySelector('.btnSubmit').addEventListener('click',()=>__event('sort-field:'+document.querySelector('#answer100').value));</script>`;
            html+=`<script>document.querySelectorAll('.num_option').forEach(x=>x.onclick=()=>{x.classList.add('check_answer');__event('answer')});document.querySelector('.btnSubmit')?.addEventListener('click',()=>{__event('submit');if(${name!=='pending-result'})window.parent.postMessage({syntheticTaskComplete:true},'*');document.body.innerHTML='<p>满分:100</p><p>最终成绩60分</p><button id="redo">重做</button>';document.querySelector('#redo').onclick=()=>__event('redo');});document.querySelector('#redo')?.addEventListener('click',()=>__event('redo'));</script>`;
        } else if(u.pathname==='/mooc-ans/bbscircle/chapter')html='<div id="topicMainDiv" class="PublicCardBox" data="/mooc-ans/bbscircle/gettopicdetail?topicId=synthetic"><span class="cardRightTit">Optional discussion</span></div>';
        else return route.fulfill({body:''});
        if(['optional','optional-media'].includes(name))html=html.replace('<span class="orangeNew">1</span>','');
        await route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><style>body{margin:8px}iframe{border:0}</style>${html}<script>${bundle.replaceAll('</script','<\/script')}</script>`});
    });
    const page=await context.newPage();
    page.on('pageerror',error=>console.error(name,'page error:',error.message));
    try {
        await page.goto('https://mooc1.chaoxing.com/mycourse/studentstudy?courseId=synthetic&clazzid=1&cpi=2');
        await page.locator('[data-task-point-scope]').waitFor();
        await page.locator('[data-action=start]').click();
        if(['required','cross-origin','ordering'].includes(name)) {
            await page.waitForFunction(()=>!document.querySelector('#iframe'),null,{timeout:20000});
            assert.equal(events.filter(e=>e==='submit').length,1);
            assert.equal(events.filter(e=>e==='model').length,1);
            if(name==='ordering')assert(events.includes('sort-field:CAB'),'Sorting order must survive the complete model/apply/submit workflow.');
        } else if(name==='pending-result') {
            for(let n=0;n<100&&!events.includes('submit');n++)await page.waitForTimeout(100);
            assert(events.includes('submit'));await page.waitForTimeout(2500);
            assert(!events.includes('next'),'An unconfirmed pending task must not advance.');
        } else if(name==='mixed-inline'||name==='unknown-marker') {
            await page.waitForTimeout(4500);
            assert(!events.includes('model'));assert(!events.includes('submit'));assert(!events.includes('mixed-submit'));
            assert(!events.includes('next'),'Unknown or mixed task attribution must hold.');
        } else {
            await page.waitForFunction(()=>!document.querySelector('#iframe'),null,{timeout:20000});
            if(name==='required-media') {
                assert(events.includes('required-play'));assert(events.includes('required-pause'));
            }
            assert(!events.includes('model'));assert(!events.includes('submit'));
        }
        assert(!events.includes('redo'));assert(!events.includes('optional-document'));assert(!events.includes('optional-play'));
        observations.push({name,events});
        console.log(`Passed: ${name}`);
    } catch(error) {
        console.error(name,JSON.stringify(events));
        console.error((await page.locator('[data-xxt-codex-panel] pre').first().textContent().catch(()=>'')));
        throw error;
    } finally {await context.close();}
}
try {
    for(const name of ['optional','completed-editable','completed-result','required','cross-origin','pending-result','mixed-inline','unknown-marker','optional-media','required-media','ordering']) await scenario(name);
    await mkdir(new URL('../artifacts/task-points-only/',import.meta.url),{recursive:true});
    await writeFile(new URL('../artifacts/task-points-only/observations.json',import.meta.url),JSON.stringify(observations,null,2));
    console.log('11 task-point-only browser scenarios passed; synthetic pages and model only.');
} finally {await browser.close();}
