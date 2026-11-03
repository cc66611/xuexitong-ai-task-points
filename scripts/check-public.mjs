import {readFileSync,readdirSync,statSync} from 'node:fs';
import {resolve,relative} from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {fontDependenciesCode} from './font-dependencies.mjs';
import {themeAssetCode} from './theme-assets.mjs';
const root=resolve(import.meta.dirname,'..');
function walk(dir){return readdirSync(dir).flatMap(name=>{if(['.git','node_modules','artifacts','local','output','.playwright-cli'].includes(name))return [];const path=resolve(dir,name);return statSync(path).isDirectory()?walk(path):[path];});}
// These local working notes are excluded by package.mjs and the upload whitelist.
const paths=walk(root).filter(path=>!['TASK_PROGRESS.md'].includes(relative(root,path)));
for(const path of paths){
 const name=relative(root,path).replaceAll('\\','/');
 if(/bridge-token|\.log$|本机\.user\.js|hongya|虹芽|job-/.test(name))throw Error(`Private artifact path: ${name}`);
 if(!/\.(js|cjs|mjs|md|json|yml|yaml|txt|cmd|ps1|html|css|svg)$/.test(name))continue;
 const raw=readFileSync(path,'utf8');
 // Exempt only the exact, hash-verified public theme asset block from the private PNG check.
 const text=['dist/xuexitong-ai-assistant.user.js','dist/xuexitong-task-points-only.user.js'].includes(name) ? raw.replace(themeAssetCode(),'') : raw;
 if(name !== 'scripts/check-public.mjs')assert(!/[A-Z]:[/\\](Users|Codex)[/\\]|XxtHongyaAsset|data:image\/png;base64,[A-Za-z0-9+/]{500}/.test(text),`Personal asset/path in ${name}`);
 assert(!/GM_setValue\(['"]xxt-codex-token['"],\s*['"][a-f0-9]{64}/.test(text),`Paired token in ${name}`);
 assert(!/sk-[A-Za-z0-9_-]{20,}/.test(text),`Possible key in ${name}`);
 assert(!/\b(?:ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})/.test(text),`Possible GitHub credential in ${name}`);
 if(/\.(js|cjs|mjs)$/.test(name))execFileSync(process.execPath,['--check',path],{stdio:'inherit'});
}
const script=readFileSync(resolve(root,'dist/xuexitong-ai-assistant.user.js'),'utf8');
for(const name of ['structured-questions.js','composite-questions.js'])assert(script.includes(readFileSync(resolve(root,'src',name),'utf8')),`Stale build: ${name}`);
assert(script.includes(themeAssetCode()),'Stale theme assets');
assert(script.includes(fontDependenciesCode()),'Stale font dependencies');
for(const name of ['core.cjs','retry.cjs','fonts.js','dom.js','capture.js','documents.js','manual-verification.js','reading.js','page-tasks.js','interruptions.js','video-lines.js','video-quiz.js','models.cjs','locator.cjs','run-ledger.cjs','dispatch.cjs','diagnostics.cjs','profiles.cjs','personas.cjs','ai.js','discussion.js','short-answer.js','saved-quizzes.cjs','updates.cjs','rate-notice.js','force-rate.js','homework.cjs','panel-layout.js','panel-motion.js','theme.js','audio.cjs','homework-dom.js','homework-runtime.js','course-hub.js','workflow.js','player.js'])assert(script.includes(readFileSync(resolve(root,'src',name),'utf8')),`Stale build: ${name}`);
const {version,taskPointsVersion}=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));
const readme=readFileSync(resolve(root,'README.md'),'utf8');
assert(readme.includes(taskPointsVersion),'README must show the install version');
assert(script.includes(`@version      ${taskPointsVersion}`));assert(script.includes('@connect      *'));
const release=JSON.parse(readFileSync(resolve(root,'src/release.json'),'utf8'));
assert.equal(release.version,version);assert.deepEqual(JSON.parse(readFileSync(resolve(root,'dist/release.json'),'utf8')),release);
const meta=readFileSync(resolve(root,'dist/xuexitong-ai-assistant.meta.js'),'utf8');assert.equal(meta,script.slice(0,script.indexOf('(() => {')));
assert(meta.includes('@updateURL    none')&&meta.includes('@downloadURL  none'));
for(const name of ['dist/xuexitong-ai-assistant.user.js','dist/xuexitong-task-points-only.user.js']){const text=readFileSync(resolve(root,name),'utf8');assert(text.includes('taskPointsOnly\":true'),`Unrestricted build: ${name}`);assert(text.includes(`@version      ${taskPointsVersion}`));assert(text.includes(`localVersion\":\"${taskPointsVersion}\"`));}
assert.equal(release.localVersion,taskPointsVersion);assert.equal(release.taskPointsOnly,true);
console.log(`Public build checked: ${paths.length} files, source sync and JavaScript syntax; theme assets hash-verified; no known personal paths or paired credentials.`);

