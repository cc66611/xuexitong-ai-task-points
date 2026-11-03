import {chromium} from './browser-runtime.mjs';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url);
const browser = await chromium.launch({headless:true});
try {
    const page = await browser.newPage({viewport:{width:1100,height:900}});
    // No real site, account, model or network request is used by this regression.
    await page.route('**/*', route=>route.abort());
    await page.setContent('<style>.TiMu{width:700px}.after img{width:90px;height:45px}li{list-style:none;margin:8px}.num_option{display:inline-block;width:35px}</style><main></main>');
    for (const file of ['src/core.cjs','src/dom.js','src/dispatch.cjs','vendor/html2canvas-1.4.1.min.js','src/capture.js'])
        await page.addScriptTag({content:await readFile(new URL(file,root),'utf8')});
    const colors=['#ff0000','#00ff00','#0000ff','#ffff00','#ff00ff'];
    await page.evaluate(colors=>{
        const data=colors.map(color=>{const c=document.createElement('canvas');c.width=90;c.height=45;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,90,45);return c.toDataURL();});
        document.querySelector('main').innerHTML=`<div class="TiMu"><div class="Zy_TItle"><span class="newZy_TItle">【单选题】</span>Choose a formula</div><ul class="Zy_ulTop w-top fl" tabindex="-1" aria-hidden="true">${data.map((src,i)=>`<li class="font-cxsecret before-after" role="radio"><label><span class="num_option choice215257648" data="${String.fromCharCode(65+i)}">${String.fromCharCode(65+i)}</span></label><a class="after" href="javascript:void(0)"><img class="ans-latex-moudle" src="${src}" data-original="${src}"></a></li>`).join('')}</ul></div>`;
    },colors);
    await page.waitForFunction(()=>[...document.querySelectorAll('img')].every(img=>img.complete&&img.naturalWidth));
    const initial=await page.evaluate(()=>{
        const [entry]=XxtCodexDom.extract(document), q=entry.question;
        XxtCodexCore.validateQuestions([q]);
        return {q,vision:XxtDispatch.needsVision(q)};
    });
    assert.equal(initial.vision,true);
    assert.deepEqual(initial.q.options.map(o=>o.key),['A','B','C','D','E']);
    assert(initial.q.options.every(o=>o.text.trim()&&o.imageKey));
    assert.equal(new Set(initial.q.options.map(o=>o.imageKey)).size,5);
    const screenshot=await page.evaluate(()=>XxtQuestionCapture.capture(document.querySelector('.TiMu')));
    const pixels=await page.evaluate(async data=>{
        const img=new Image();img.src=data;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);
        const bytes=ctx.getImageData(0,0,c.width,c.height).data,counts=[0,0,0,0,0];
        for(let i=0;i<bytes.length;i+=4){const [r,g,b]=bytes.slice(i,i+3);if(r>230&&g<20&&b<20)counts[0]++;if(r<20&&g>230&&b<20)counts[1]++;if(r<20&&g<20&&b>230)counts[2]++;if(r>230&&g>230&&b<20)counts[3]++;if(r>230&&g<20&&b>230)counts[4]++;}return counts;
    },screenshot);
    assert(pixels.every(n=>n>2500),'Real html2canvas must include all five rendered option images.');
    const routed=await page.evaluate(({q,image})=>{
        const [part]=XxtDispatch.batches({questions:[q],images:[image],imageQuestionIds:[q.id]});
        return {kind:part.kind,keys:part.questions[0].options.map(o=>o.key),images:part.images.length,manifest:part.imageManifest};
    },{q:initial.q,image:screenshot});
    assert.equal(routed.kind,'vision');assert.equal(routed.images,1);assert.deepEqual(routed.keys,['A','B','C','D','E']);
    await page.evaluate(()=>{
        const content=document.querySelector('.after'),base=content.querySelector('img').cloneNode();
        for(const html of ['<button></button>','<span aria-hidden="true"></span>','<span hidden></span>','<span style="display:none"></span>']){const t=document.createElement('template');t.innerHTML=html;const host=t.content.firstElementChild;const img=base.cloneNode();img.src+='ignored';host.append(img);content.append(host);}
    });
    const decorated=await page.evaluate(()=>XxtCodexDom.extract(document)[0].question);
    assert.equal(decorated.options[0].imageKey,initial.q.options[0].imageKey,'Hidden/decorative/button images must not affect option identity.');
    const rejected=await page.evaluate(()=>{
        document.querySelector('.Zy_ulTop').style.display='none';
        const q=XxtCodexDom.extract(document)[0].question;
        let error='';try{XxtCodexCore.validateQuestions([q]);}catch(e){error=e.message;}
        return {keys:q.options.map(o=>o.imageKey),error};
    });
    assert(rejected.keys.every(k=>!k));assert.equal(rejected.error,'选项无效或重复');
    const output=new URL('artifacts/formula-options/',root);await mkdir(output,{recursive:true});
    await writeFile(new URL('question-capture.png',output),Buffer.from(screenshot.split(',')[1],'base64'));
    await writeFile(new URL('observations.json',output),JSON.stringify({options:initial.q.options.map(o=>({key:o.key,text:o.text,imageKey:o.imageKey})),pixels,routed,hiddenContentRejected:!!rejected.error},null,2));
    console.log('Formula regression passed: five visible images under aria-hidden UL, A-E mapping, real screenshot pixels, vision routing, decorative exclusion, hidden-content rejection.');
} finally {await browser.close();}
