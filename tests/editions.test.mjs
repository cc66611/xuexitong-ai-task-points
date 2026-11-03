import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),catalog=require('../src/models.cjs');
const code=readFileSync(new URL('../src/ai.js',import.meta.url),'utf8');
for(const [edition,provider]of [['universal','openai'],['codex','codex'],['workbuddy','codebuddy'],['api','openai']])test(`${edition} selects its first-use preset without removing adapters or replacing saved profiles`,()=>{
 const saved={provider:'deepseek',protocol:'chat',baseUrl:'https://api.deepseek.com/v1',model:'deepseek-flash',key:'existing-profile',reasoning:''};
 const context={XxtModelCatalog:catalog,XxtRelease:{edition,providerPreset:provider},module:{exports:{}},GM_getValue:(_,fallback)=>fallback};
 vm.runInNewContext(code,context);const A=context.module.exports;assert.equal(A.defaults.provider,provider);assert.equal(Object.keys(A.presets).length,13);assert.equal(A.defaults.key,'');
 context.GM_getValue=()=>saved;const loaded=A.load();assert.equal(loaded.provider,'deepseek');assert.equal(loaded.key,'existing-profile');assert.equal(loaded.baseUrl,saved.baseUrl);
});
test('unknown edition presets fall back to the universal provider',()=>{const context={XxtModelCatalog:catalog,XxtRelease:{providerPreset:'unknown'},module:{exports:{}}};vm.runInNewContext(code,context);assert.equal(context.module.exports.defaults.provider,'openai');});
