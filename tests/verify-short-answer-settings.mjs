import { chromium } from './browser-runtime.mjs';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const root = resolve(import.meta.dirname, '..'), out = resolve(root, 'output/playwright/short-answer');
const bundle = await readFile(resolve(root, 'dist/xuexitong-ai-assistant.user.js'), 'utf8');
const control = await readFile(resolve(root, 'src/short-answer.js'), 'utf8');
const collector = await readFile(resolve(root, 'tools/collect-chapter-short-answer.js'), 'utf8');
await mkdir(out, { recursive: true });
const observations = [], browser = await chromium.launch({ headless: true });
try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await context.newPage();
    await page.route('**/*', route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<main><div class="TiMu"><div class="Zy_TItle"><span class="newZy_TItle">【填空题】</span>设置隔离验证</div><textarea></textarea></div><button class="btnSubmit workBtnIndex">提交</button></main>' }));
    await page.addInitScript(() => {
        window.unsafeWindow = window; window.__changes = []; window.__requests = 0;
        window.GM_getValue = (key, fallback) => JSON.parse(localStorage.getItem(key) || 'null') ??
            ({ 'xxt-quiet-enabled': false, 'xxt-ai-enabled': false }[key] ?? fallback);
        window.GM_setValue = (key, value) => {
            __changes.push(['save', key, value]); localStorage.setItem(key, JSON.stringify(value));
        };
        window.GM_xmlhttpRequest = () => { __requests++; return { abort() {} }; };
    });
    const mount = async () => {
        await page.goto('https://mooc1.chaoxing.com/mooc-ans/work/doHomeWorkNew');
        await page.addScriptTag({ content: bundle });
        await page.waitForSelector('.xxt-settings');
        await page.addScriptTag({ content: control });
        await page.evaluate(() => {
            document.querySelector('[data-short-answer-settings]')?.remove();
            const controls = XxtShortAnswer.controls(() => __changes.push(['cancel', XxtShortAnswer.load()]));
            document.querySelector('.xxt-settings').prepend(controls);
        });
        assert.equal(await page.locator('[data-short-answer-settings]').evaluate(n=>n.open),false);
        await page.locator('[data-short-answer-settings] > summary').click();
    };
    const selected = () => page.locator('[data-setting="short-answer-mode"]:checked').inputValue();
    await mount();
    assert.equal(await selected(), 'save');
    assert.equal(await page.locator('[data-setting="short-answer-mode"]').count(), 3);
    assert.equal(await page.locator('[data-setting="short-answer-mode"]:checked').count(), 1);
    observations.push({ name: 'first-use-default-save', passed: true });
    await page.locator('[data-short-answer-settings] > summary').click();
    const beforeFold=await page.evaluate(()=>__changes.length);
    await page.locator('[data-short-answer-settings] > summary').focus();await page.keyboard.press('Enter');
    assert.equal(await page.locator('[data-short-answer-settings]').evaluate(n=>n.open),true);
    assert.equal(await page.evaluate(()=>__changes.length),beforeFold);
    observations.push({name:'default-folded-mouse-and-keyboard-open-without-setting-change',passed:true});
    for (const mode of ['skip', 'submit', 'save']) {
        const radio = page.locator(`[data-setting="short-answer-mode"][value="${mode}"]`);
        await radio.locator('..').click();
        assert.equal(await selected(), mode);
        assert.equal(await page.locator('[data-setting="short-answer-mode"]:checked').count(), 1);
        const effects = await page.evaluate(() => __changes.slice(-2));
        assert.equal(effects[0][0], 'cancel'); assert.equal(effects[1][0], 'save');
        const shapes = await page.locator('.xxt-short-face').evaluateAll(nodes => nodes.map(node =>
            ({ checked: node.previousElementSibling.checked, transform: getComputedStyle(node).transform, shadow: getComputedStyle(node).boxShadow })));
        assert(shapes.find(item => item.checked).shadow.includes('inset'));
        assert.equal(new Set(shapes.map(item => item.transform)).size, 2);
        await mount(); assert.equal(await selected(), mode);
    }
    observations.push({ name: 'exclusive-pressed-shape-cancel-before-save-and-reload-all-modes', passed: true });
    const radio = page.locator('[data-setting="short-answer-mode"][value="save"]');
    await radio.focus(); await page.keyboard.press('ArrowRight'); assert.equal(await selected(), 'skip');
    await page.keyboard.press('ArrowLeft'); assert.equal(await selected(), 'save');
    assert.notEqual(await radio.evaluate(node => getComputedStyle(node.nextElementSibling).outlineStyle), 'none');
    observations.push({ name: 'native-keyboard-arrows-and-visible-focus', passed: true });
    await page.evaluate(() => localStorage.setItem(XxtShortAnswer.key, JSON.stringify('unsupported-old-setting')));
    await mount(); assert.equal(await selected(), 'save');
    for (const width of [1280, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.locator('[data-short-answer-settings]').scrollIntoViewIfNeeded();
        const bounds = await page.locator('[data-short-answer-settings]').boundingBox();
        assert(bounds.width > 0 && bounds.x >= 0 && bounds.x + bounds.width <= width);
        await page.screenshot({ path: resolve(out, `settings-${width}.png`) });
    }
    assert.equal(await page.evaluate(() => __requests), 0);
    observations.push({ name: 'invalid-setting-fallback-desktop-mobile-fit-and-no-model-request', passed: true });
    // Read-only collector fixture. No real course DOM, account or requests are used.
    await page.evaluate(() => {
        document.body.innerHTML = '<div class="TiMu" id="question123456"><div class="newZy_TItle">【其它】</div>' +
            '<div class="Zy_TItle">private-question-text</div><textarea id="answerEditor123456" name="answer123456">private-user-answer</textarea>' +
            '<iframe id="editor123456" src="about:blank"></iframe><input type="hidden" value="private-hidden-value"></div>' +
            '<button id="saveDraft" onclick="saveDraft(123456,987654)">暂时保存</button>';
        const area = document.querySelector('textarea'), frame = document.querySelector('iframe');
        window.__clicks = 0; window.__editorCalls = 0; window.__copied = '';
        document.addEventListener('click', () => __clicks++);
        window.UE = { instants: { fixture: { key: area.id, textarea: area, iframe: frame,
            isReady: true, body: frame.contentDocument.body,
            setContent() { __editorCalls++; }, getContent() { __editorCalls++; }, sync() { __editorCalls++; } } } };
        window.$0 = area; window.copy = value => { __copied = value; };
    });
    await page.evaluate(collector);
    let data = await page.evaluate(() => JSON.parse(__copied));
    assert(data.questionBlock); assert.equal(data.editors.length, 1); assert(!data.truncated);
    for (const forbidden of ['private-question-text', 'private-user-answer', 'private-hidden-value', '123456', '987654', 'about:blank'])
        assert(!JSON.stringify(data).includes(forbidden), `Collector retained ${forbidden}`);
    assert(data.html.includes('【其它】')); assert(data.html.includes('answerEditorN1'));
    await page.evaluate(() => { window.$0 = document.querySelector('iframe').contentDocument.body; });
    await page.evaluate(collector); data = await page.evaluate(() => JSON.parse(__copied));
    assert(data.questionBlock); assert.equal(data.editors.length, 1);
    assert(data.fields.some(field => field.tag === 'TEXTAREA'));
    await page.evaluate(() => { window.$0 = document.querySelector('button'); });
    await page.evaluate(collector); data = await page.evaluate(() => JSON.parse(__copied));
    assert(data.html.includes('暂时保存')); assert(data.html.includes('data-handler-name="saveDraft"'));
    assert(!data.html.includes('987654'));
    const counts = await page.evaluate(() => ({ clicks: __clicks, editorCalls: __editorCalls, requests: __requests,
        answer: document.querySelector('textarea').value }));
    assert.deepEqual(counts, { clicks: 0, editorCalls: 0, requests: 0, answer: 'private-user-answer' });
    observations.push({ name: 'collector-retains-structural-contract-removes-values-urls-and-handler-arguments-with-no-actions', passed: true });
    await context.close();
} finally {
    await browser.close();
    await writeFile(resolve(out, 'observations.json'), JSON.stringify({ scope: 'Synthetic settings/collector fixtures only; workflow not connected; no real course save/submit or grade verification', observations }, null, 2));
}
console.log(`${observations.length} short-answer settings/collector groups passed (synthetic fixtures only).`);
