import './build.mjs';
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root = resolve(import.meta.dirname, '..');
const {taskPointsVersion:version}=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));
if(!/^\d+\.\d+\.\d+\.\d+$/.test(version||''))throw Error('Missing task-point install version');
let bundle = readFileSync(resolve(root, 'dist/xuexitong-ai-assistant.user.js'), 'utf8');
bundle = bundle.replace(/^\/\/ @version\s+.+$/m, '// @version      '+version)
    .replace(/^\/\/ @description\s+.+$/m, '// @description  仅完成平台标记的未完成任务点；跳过无任务点内容；不为满分重做')
    .replace(/^\/\/ @updateURL\s+.+$/m, '// @updateURL    none')
    .replace(/^\/\/ @downloadURL\s+.+$/m, '// @downloadURL  none')
    .replace(/globalThis\.XxtRelease = (\{[^\n]+\});/, (_, json) =>
        `globalThis.XxtRelease = ${JSON.stringify({...JSON.parse(json), taskPointsOnly: true, localVersion:version})};`);
writeFileSync(resolve(root, 'dist/xuexitong-task-points-only.user.js'), bundle);
console.log(`Built task-point-only userscript ${version} (same identity; keeps existing settings on update).`);
