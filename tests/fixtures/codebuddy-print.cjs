const fs=require('node:fs'),args=process.argv.slice(2);
let input='';process.stdin.on('data',b=>input+=b);process.stdin.on('end',()=>{
 const stream=args.includes('--input-format'),message=stream?JSON.parse(input).message.content:null;
 const prompt=stream?message.find(x=>x.type==='text').text:input,images=message?.filter(x=>x.type==='image')||[];
 if(process.env.XXT_TEST_CB_RECORD)fs.writeFileSync(process.env.XXT_TEST_CB_RECORD,JSON.stringify({pid:process.pid,args,prompt,images}));
 if(process.env.XXT_TEST_CB_RECORD){const file=process.env.XXT_TEST_CB_RECORD+'.calls.json',calls=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):[];calls.push({correction:prompt.includes('格式修正数据'),images:images.length});fs.writeFileSync(file,JSON.stringify(calls));}
 if(['auth','auth-zero'].includes(process.env.XXT_TEST_CB_MODE)){console.error('Authentication required sk-not-a-real-secret');process.exit(process.env.XXT_TEST_CB_MODE==='auth-zero'?0:1);}
 const questions=JSON.parse(prompt.match(/题目数据：\n([\s\S]+?)\n图片映射：/)[1]);
 const answers=questions.map(q=>{const sum=q.text.match(/计算 (\d+) \+ (\d+)/);return {id:q.id,choices:q.options.length?['A']:[],texts:q.options.length?[]:[sum?String(+sum[1]+ +sum[2]):q.id==='image-probe'?'012345':'fixture answer'],readable:true,confidence:process.env.XXT_TEST_CB_MODE==='uncertain'?0.2:1,explanation:'隔离模拟，不是实课结果'};});
 if(process.env.XXT_TEST_CB_MODE==='format-always'||process.env.XXT_TEST_CB_MODE==='format-once'&&!prompt.includes('格式修正数据'))for(const a of answers)if(a.texts.length)a.texts=[];
 if(process.env.XXT_TEST_CB_MODE==='invalid')answers[0].id='unknown-question';
 setTimeout(()=>{
  const data={type:'result',subtype:'success',is_error:false,result:JSON.stringify({answers})};
  if(stream)console.log(JSON.stringify({type:'system',subtype:'init'}));
  console.log(JSON.stringify(stream?data:[{type:'message',role:'user',content:'fixture history; not an answer'},data]));
  if(process.env.XXT_TEST_CB_COMPLETED)fs.writeFileSync(process.env.XXT_TEST_CB_COMPLETED,'done');
 },Number(process.env.XXT_TEST_CB_DELAY||0));
});
