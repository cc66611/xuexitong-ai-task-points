import {spawn} from 'node:child_process';
import {codebuddyCommand} from '../src/codebuddy-runner.mjs';
import {fileURLToPath} from 'node:url';

try{
    process.env.CODEBUDDY_CONFIG_DIR ||= fileURLToPath(new URL('../src/local/codebuddy-config',import.meta.url));
    const command=await codebuddyCommand();
    if(process.argv.includes('--login')){
        const child=spawn(command.file,command.args,{stdio:'inherit',shell:false,windowsHide:false});
        child.on('error',()=>{console.error('无法启动 CodeBuddy 登录，请检查安装。');process.exitCode=1;});
        child.on('exit',code=>{process.exitCode=code??1;});
    }else{
        process.env.XXT_LOCAL_PROVIDER='codebuddy';
        console.log('使用官方 CodeBuddy CLI；请先登录与 WorkBuddy 相同站点、相同账号。');
        console.log('模型默认沿用 CLI 账号设置；可用 XXT_CODEBUDDY_MODEL 指定账号可用的完整模型 ID。');
        console.log('积分是否扣减及具体扣减类型，请在官方用量明细中核对。');
        await import('../src/bridge.mjs');
    }
}catch(error){console.error(error.message);process.exitCode=1;}
