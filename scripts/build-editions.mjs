import './build-task-only.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..'),pkg=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));
const common=readFileSync(resolve(root,'dist/xuexitong-task-points-only.user.js'),'utf8');
const editions=[
 {id:'universal',name:'多 AI 通用版',providerPreset:'openai',file:'xuexitong-task-points-only.user.js',guide:'docs/USER_GUIDE.md'},
 {id:'codex',name:'Codex 账号版',providerPreset:'codex',file:'xuexitong-codex.user.js',guide:'docs/CODEX.md'},
 {id:'workbuddy',name:'WorkBuddy / CodeBuddy 账号版',providerPreset:'codebuddy',file:'xuexitong-workbuddy.user.js',guide:'docs/WORKBUDDY.md'},
 {id:'api',name:'多服务商 API 版',providerPreset:'openai',file:'xuexitong-api.user.js',guide:'docs/API.md'}
];
for(const edition of editions){
 const output=common.replace(/^\/\/ @description\s+.+$/m,`// @description  ${edition.name}；仅处理未完成任务点；无内置账号或密钥`)
  .replace(/globalThis\.XxtRelease = (\{[^\n]+\});/,(_,json)=>`globalThis.XxtRelease = ${JSON.stringify({...JSON.parse(json),edition:edition.id,providerPreset:edition.providerPreset,taskPointsOnly:true})};`);
 writeFileSync(resolve(root,'dist',edition.file),output);
}
// The old filename remains a safe, full-featured universal compatibility entry.
writeFileSync(resolve(root,'dist/xuexitong-ai-assistant.user.js'),readFileSync(resolve(root,'dist/xuexitong-task-points-only.user.js')));
const universal=readFileSync(resolve(root,'dist/xuexitong-task-points-only.user.js'),'utf8');
writeFileSync(resolve(root,'dist/xuexitong-ai-assistant.meta.js'),universal.slice(0,universal.indexOf('(() => {')));
writeFileSync(resolve(root,'dist/editions.json'),JSON.stringify({version:pkg.taskPointsVersion,sharedCore:true,installOnlyOne:true,preservesExistingProfiles:true,editions},null,2)+'\n');
console.log(`Built ${editions.length} AI editions ${pkg.taskPointsVersion}; every edition retains all adapters and task-point-only rules.`);
