const fs=require('node:fs'),assert=require('node:assert/strict');
const args=process.argv.slice(2),output=args[args.indexOf('--output-last-message')+1];
assert.equal(args[args.indexOf('--model')+1],'gpt-6-luna');assert(args.includes('model_reasoning_effort="low"'));
const images=args.flatMap((value,i)=>value==='-i'?[args[i+1]]:[]);assert(images.length<=1);if(images.length){assert(fs.existsSync(images[0]));
assert.equal(fs.readFileSync(images[0]).subarray(0,8).toString('hex'),'89504e470d0a1a0a');}
fs.writeFileSync('fake-execution.json',JSON.stringify({pid:process.pid,model:'gpt-6-luna',reasoning:'low',images:images.length}));
let prompt='';process.stdin.on('data',chunk=>{prompt+=chunk;});process.stdin.on('end',()=>{
 const questions=JSON.parse(prompt.match(/题目数据：\n([\s\S]+?)\n图片映射/)[1]);
 const correction=prompt.includes('格式修正数据'),mode=process.env.XXT_FAKE_TEXT_FORMAT;
 const file='fake-invocations.json',invocations=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):[];
 invocations.push({ids:questions.map(q=>q.id),correction,images:images.length});fs.writeFileSync(file,JSON.stringify(invocations));
 setTimeout(()=>{
  fs.writeFileSync(output,JSON.stringify({answers:questions.map(q=>{
   const text=['blank','essay','ordering','matching'].includes(q.type),missing=text&&(mode==='always-empty'||mode==='unavailable'||(mode==='repair-once'&&!correction));
   return{id:q.id,choices:text?[]:[q.options[0].key],texts:!text||missing?[]:Array.from({length:q.slots},()=>q.id==='text-probe'?String(q.text.match(/计算 (\d+) \+ (\d+)/).slice(1).map(Number).reduce((a,b)=>a+b)):'012345'),readable:mode!=='unavailable',confidence:mode==='unavailable'?0:Number(process.env.XXT_FAKE_CONFIDENCE||1),explanation:'isolated fake inference'};
  })}));
  fs.writeFileSync('fake-completed','done');
 },Number(process.env.XXT_FAKE_DELAY||0));
});
