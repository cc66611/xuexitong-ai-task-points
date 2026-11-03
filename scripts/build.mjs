import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import {fontDependenciesCode} from './font-dependencies.mjs';
import { themeAssetCode } from './theme-assets.mjs';
const root = resolve(import.meta.dirname, '..');
const {version,taskPointsVersion} = JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));
const scriptVersion=taskPointsVersion||version;
const release = JSON.parse(readFileSync(resolve(root,'src/release.json'),'utf8'));
if (release.version !== version || release.localVersion !== taskPointsVersion || release.taskPointsOnly !== true) throw Error('Task-point release metadata is out of sync');
const header = `// ==UserScript==
// @name         超星学习通自动化脚本（支持接入各种主流AI模型api）
// @namespace    xuexitong-ai-assistant.public
// @version      ${scriptVersion}
// @description  仅处理未完成任务点，支持本地 Codex；不含任何账号或密钥
// @supportURL   https://github.com/cc66611/xuexitong-ai-task-points/issues
// @updateURL    none
// @downloadURL  none
// @match        https://*.chaoxing.com/*
// @match        https://chaoxing.com/*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_getTab
// @grant        GM_saveTab
// @grant        GM_xmlhttpRequest
// @grant        GM_audio
// @grant        GM_openInTab
// @grant        unsafeWindow
// @connect      *
// ==/UserScript==

`;
const files = ['vendor/jquery-3.6.0.min.js','vendor/html2canvas-1.4.1.min.js','src/core.cjs','src/retry.cjs','src/fonts.js','src/dom.js','src/capture.js','src/documents.js','src/manual-verification.js','src/reading.js','src/page-tasks.js','src/interruptions.js','src/video-lines.js','src/video-quiz.js','src/models.cjs','src/locator.cjs','src/run-ledger.cjs','src/dispatch.cjs','src/diagnostics.cjs','src/profiles.cjs','src/personas.cjs','src/ai.js','src/discussion.js','src/short-answer.js','src/updates.cjs','src/rate-notice.js','src/force-rate.js','src/theme.js','src/audio.cjs','src/workflow.js','src/player.js'];
files.splice(files.indexOf('src/dom.js'),0,'src/structured-questions.js');
files.splice(files.indexOf('src/dom.js'),0,'src/composite-questions.js');
files.splice(files.indexOf('src/theme.js'),0,'src/homework.cjs','src/saved-quizzes.cjs','src/panel-layout.js');
files.splice(files.indexOf('src/theme.js'),0,'src/panel-motion.js');
files.splice(files.indexOf('src/workflow.js'),0,'src/homework-dom.js','src/homework-runtime.js');
files.splice(files.indexOf('src/workflow.js'),0,'src/course-hub.js');
const thirdParty = ['vendor/fk-dropdown-LICENSE.txt','vendor/ocs-LICENSE.txt'].map(path=>'/*\n'+readFileSync(resolve(root,path),'utf8')+'\n*/\n').join('\n');
const content = header + '(() => { const module = undefined, exports = undefined, define = undefined;\n' + thirdParty + `globalThis.XxtRelease = ${JSON.stringify(release)};\n` + themeAssetCode() + fontDependenciesCode() + files.map(path=>readFileSync(resolve(root,path),'utf8')).join('\n') + '\n})();\n';
mkdirSync(resolve(root,'dist'),{recursive:true});
writeFileSync(resolve(root,'dist/xuexitong-ai-assistant.user.js'),content);
writeFileSync(resolve(root,'dist/xuexitong-ai-assistant.meta.js'),header);
writeFileSync(resolve(root,'dist/release.json'),JSON.stringify(release,null,2)+'\n');
console.log(`Built public userscript ${version}; no local configuration included.`);
