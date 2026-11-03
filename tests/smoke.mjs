import {spawnSync} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';

const root=resolve(import.meta.dirname,'..');
// Reuse the platform-contract regressions; every request is fulfilled by fixtures.
const cases=['verify-late-media-loading.mjs','verify-chapter-worker-loading.mjs','verify-media-policy.mjs','verify-pending-review.mjs','verify-pending-review-nested.mjs','verify-answer-language.mjs','verify-rich-blanks.mjs','verify-two-checks.mjs','verify-grade-recovery.mjs','verify-quiet-hours.mjs','verify-notify-render.mjs','verify-audio-tasks.mjs','verify-start-after-test.mjs','verify-completed-documents.mjs','verify-large-pages.mjs','verify-completed-media.mjs','verify-video-mute.mjs','verify-answer-preview.mjs','verify-merge-ui-rate.mjs','verify-captcha-guard.mjs','verify-updates.mjs','verify-topic-reading.mjs','verify-custom-guide.mjs','verify-live-ledger.mjs','verify-retry-navigation.mjs','verify-discussions.mjs','verify-short-answer-settings.mjs','verify-short-answer-workflow.mjs','verify-short-answer-nested.mjs','verify-homework-observed-dom.mjs','verify-homework-adapter.mjs','verify-homework-runtime.mjs','verify-homework-ui.mjs','verify-panel-layout.mjs','verify-portrait-placement.mjs'];
const results=[];
cases.push('verify-homework-real-choices.mjs','verify-codebuddy-connection.mjs','verify-ai-theme-connection.mjs','verify-no-home-panel.mjs','verify-panel-motion.mjs','verify-landscape-themes.mjs','verify-tab-mute.mjs','verify-course-hub.mjs','verify-course-queue-bridge.mjs','verify-page-tasks.mjs');
const runtimeSHA256=createHash('sha256').update(await readFile(resolve(root,'dist/xuexitong-ai-assistant.user.js'))).digest('hex');
let prior=null;
if(process.env.XXT_SMOKE_RESUME==='1'){
 prior=JSON.parse(await readFile(resolve(root,'output/playwright/smoke.json'),'utf8'));
 if(prior.runtimeSHA256!==runtimeSHA256)throw Error('Cannot reuse smoke results from different or unidentified runtime bytes');
}
for(const file of cases){
 const completed=prior?.results.find(r=>r.file===file&&r.passed);
 if(completed){console.log(`\nReuse verified unchanged runtime: ${file}`);results.push({...completed,reused:true});continue;}
 console.log(`\nSmoke: ${file}`);
 const started=Date.now();
 // Legacy-reproduction flags are deliberately excluded from the acceptance run.
 const env={...process.env};
 delete env.XXT_EXPECT_BASELINE;
 delete env.XXT_DISCUSSION_CASE;
 for(const key of ['XXT_LATE_MEDIA_BUNDLE','XXT_LATE_MEDIA_CASE','XXT_LEGACY_BUNDLE','XXT_LEGACY_TWO_CHECKS','XXT_LEGACY_GRADE_BUNDLE','XXT_NOTIFY_BUNDLE','XXT_NOTIFY_OUTPUT','XXT_NOTIFY_BASELINE','XXT_AUDIO_BUNDLE','XXT_AUDIO_OUTPUT','XXT_START_BUNDLE','XXT_DOC_BUNDLE','XXT_COMPLETED_MEDIA_BUNDLE','XXT_VIDEO_MUTE_BUNDLE','XXT_RETRY_BUNDLE'])delete env[key];
 const timeout=file==='verify-discussions.mjs'?480000:file==='verify-page-tasks.mjs'?300000:180000;
 const result=spawnSync(process.execPath,[resolve(root,'tests',file)],{cwd:root,env,stdio:'inherit',timeout});
 results.push({file,passed:result.status===0,error:result.error?.message,signal:result.signal,durationMs:Date.now()-started});
 if(result.status!==0)break;
}
const out=resolve(root,'output/playwright');await mkdir(out,{recursive:true});
// The existing CI artifact already includes smoke.json. Embed the audio evidence
// here so it is retained without a separate workflow or artifact-path change.
const audioEvidence=results.find(x=>x.file==='verify-audio-tasks.mjs'&&x.passed)
 ? JSON.parse(await readFile(resolve(out,'audio/observations.json'),'utf8')) : null;
const featureEvidence={};
for(const [file,key,path] of [
 ['verify-late-media-loading.mjs','lateMediaLoading','issue-7/candidate-regression.json'],
 ['verify-chapter-worker-loading.mjs','chapterWorkerLoading','issue-7/chapter-worker.json'],
 ['verify-ai-theme-connection.mjs','aiThemeConnection','ai-theme-connection/verification.json'],
 ['verify-media-policy.mjs','mediaPolicy','media-policy/observations.json'],
 ['verify-panel-motion.mjs','panelMotion','panel-motion/observations.json'],
 ['verify-landscape-themes.mjs','landscapeThemes','landscape-themes/observations.json'],
 ['verify-no-home-panel.mjs','noHomePanel','../../artifacts/no-home-panel/verification.json'],
 ['verify-course-hub.mjs','courseHub','../../artifacts/course-hub/verification.json'],
 ['verify-course-queue-bridge.mjs','courseQueueBridge','../../artifacts/course-hub/bridge-verification.json'],
 ['verify-panel-layout.mjs','panelLayout','../../artifacts/panel-layout/verification.json'],
 ['verify-portrait-placement.mjs','portraitLayout','../../artifacts/portrait-clearance/verification.json'],
 ['verify-start-after-test.mjs','startAfterTest','start-after-test/observations.json'],
 ['verify-completed-documents.mjs','completedDocuments','completed-documents/observations.json'],
 ['verify-large-pages.mjs','largePages','large-pages/observations.json'],
 ['verify-completed-media.mjs','completedMedia','completed-media/observations.json'],
 ['verify-video-mute.mjs','videoMute','video-mute/observations.json'],
 ['verify-answer-preview.mjs','answerPreview','answer-preview/observations.json'],
 ['verify-merge-ui-rate.mjs','mergeUiRate','merge-ui-rate/observations.json'],
 ['verify-captcha-guard.mjs','captchaGuard','captcha/observations.json'],
 ['verify-updates.mjs','updates','../../artifacts/updates/observations.json'],
 ['verify-topic-reading.mjs','topicReading','../../artifacts/topic-reading/observations.json'],
 ['verify-custom-guide.mjs','customGuide','custom-guide/observations.json'],
 ['verify-codebuddy-connection.mjs','workbuddyConnection','workbuddy/verification.json'],
 ['verify-live-ledger.mjs','ledgerLocator','ledger-locator/observations.json'],
 ['verify-retry-navigation.mjs','retryNavigation','retry-navigation/observations.json'],
 ['verify-discussions.mjs','discussions','discussions/observations.json'],
 ['verify-short-answer-settings.mjs','shortAnswerSettings','short-answer/observations.json'],
 ['verify-short-answer-workflow.mjs','shortAnswerWorkflow','short-answer-workflow/observations.json'],
 ['verify-short-answer-nested.mjs','shortAnswerNested','short-answer-nested/observations.json'],
 ['verify-homework-observed-dom.mjs','homeworkStructure','homework/observed-dom.json'],
 ['verify-homework-adapter.mjs','homeworkAdapter','homework/adapter-observations.json'],
 ['verify-homework-runtime.mjs','homeworkRuntime','homework/runtime-observations.json'],
 ['verify-homework-ui.mjs','homeworkUI','homework/observations.json']
])if(results.some(r=>r.file===file&&r.passed))featureEvidence[key]=JSON.parse(await readFile(resolve(out,path),'utf8'));
if(createHash('sha256').update(await readFile(resolve(root,'dist/xuexitong-ai-assistant.user.js'))).digest('hex')!==runtimeSHA256)throw Error('Runtime changed during smoke run');
await writeFile(resolve(out,'smoke.json'),JSON.stringify({scope:'Isolated browser pages and simulated models only',runtimeSHA256,resumed:!!prior,results,audioEvidence,featureEvidence},null,2)+'\n');
if(results.length!==cases.length||results.some(x=>!x.passed))process.exitCode=1;
else console.log(`Smoke passed: ${results.length} browser regression groups.`);
