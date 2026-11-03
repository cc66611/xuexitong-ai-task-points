// Compose only the freshly rendered UI screenshots; never alter their pixels or version text.
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from '../tests/browser-runtime.mjs';
const root=resolve(import.meta.dirname,'..'),browser=await chromium.launch({headless:true});
try{for(const [name,brands,labels] of [
 ['featured',['deepseek','openai','claude'],['DeepSeek','GPT','Claude']],
 ['gallery-2',['gemini','zhipu','kimi'],['Gemini','GLM','Kimi']],
 ['gallery-3',['qwen','doubao','xiaomi'],['千问','豆包','MiMo']]
]){
 const images=await Promise.all(brands.map(async brand=>{const bytes=await readFile(resolve(root,'docs/themes',brand+'.png'));assert.equal(bytes.readUInt32BE(16),384);assert.equal(bytes.readUInt32BE(20),972);return 'data:image/png;base64,'+bytes.toString('base64');}));
 const page=await browser.newPage({viewport:{width:1168,height:1018},deviceScaleFactor:1});
 await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;background:#101c30;color:#fff;font:600 18px/30px system-ui,sans-serif;display:flex;gap:8px;padding:0}figure{margin:0;width:384px}figcaption{text-align:center;height:46px;padding:8px}img{display:block;width:384px;height:972px}</style>`+images.map((src,i)=>`<figure><figcaption>${labels[i]}</figcaption><img src="${src}"></figure>`).join(''));
 await page.locator('img').evaluateAll(es=>Promise.all(es.map(e=>e.decode())));assert.equal(await page.locator('img').count(),3);await page.screenshot({path:resolve(root,'docs/themes',name+'.png')});await page.close();
}console.log('Three theme galleries composed from nine current UI captures.');}finally{await browser.close();}
