/* A user decision before changing playback speed; never asserts platform credit. */
(() => {
    'use strict';
    let current = null;
    function open({selected,commit}) {
        current?.close();
        const previous=document.activeElement,overlay=document.createElement('div'),dialog=document.createElement('section');
        overlay.dataset.rateNotice='true';overlay.style.cssText='position:fixed;inset:0;z-index:2147483647;display:grid;grid-template-columns:minmax(0,1fr);place-items:center;background:#071123ad;padding:16px;box-sizing:border-box;color:#182338;font:15px/1.7 system-ui,sans-serif';
        dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','友情提示：倍速播放，不一定能更快完成任务点');
        dialog.style.cssText='background:#fff;border-radius:18px;padding:22px;width:680px;max-width:100%;max-height:85vh;overflow:auto;box-sizing:border-box;box-shadow:0 16px 60px #0006;overflow-wrap:anywhere';
        const title=document.createElement('h2');title.textContent='友情提示：倍速播放，不一定能更快完成任务点';title.style.cssText='font-size:20px;font-weight:800;line-height:1.5;margin:0 0 14px';dialog.append(title);
        const paragraph=(text,bold=false)=>{const p=document.createElement('p');if(bold){const s=document.createElement('strong');s.textContent=text;s.style.fontWeight='800';s.dataset.rateEmphasis='true';p.append(s);}else p.textContent=text;dialog.append(p);return p;};
        function emphasize(p,phrases,underline=false){
            const text=p.textContent;p.replaceChildren();let start=0;
            while(start<text.length){const hit=phrases.map(value=>({value,index:text.indexOf(value,start)})).filter(x=>x.index>=0).sort((a,b)=>a.index-b.index)[0];if(!hit){p.append(document.createTextNode(text.slice(start)));break;}p.append(document.createTextNode(text.slice(start,hit.index)));const strong=document.createElement('strong');strong.textContent=hit.value;strong.dataset.rateEmphasis='true';strong.style.fontWeight='800';if(underline){strong.style.textDecoration='underline';strong.style.textUnderlineOffset='3px';}p.append(strong);start=hit.index+hit.value.length;}
        }
        paragraph('你正在选择非 1× 播放速度，请先了解以下情况。');
        paragraph('一、原本限制倍速的视频，强制加速可能无法节省任务完成时间',true);
        const timing=paragraph('根据目前的实测，部分限速视频即使以 2× 播放到结尾，任务点仍不会立即完成。平台可能还会核对实际累计的有效观看时间，而不只是判断进度条是否到达末尾。');
        emphasize(timing,['任务点仍不会立即完成','实际累计的有效观看时间'],true);
        const example=paragraph('例如：一段 10 分钟的视频，如果课程要求累计观看 9 分钟，以 2× 播完一遍只实际用了约 5 分钟。虽然视频已经播完，但累计观看时间可能仍不达标，任务点也就不会变绿。');
        emphasize(example,['累计观看 9 分钟','只实际用了约 5 分钟']);
        const meaningless=paragraph('因此，对于这类视频，单纯为了提前完成任务点而强制倍速，可能是 '),red=document.createElement('strong');red.textContent='无意义';red.dataset.rateMeaningless='true';red.style.color='#c2182d';red.style.fontWeight='800';meaningless.append(red,document.createTextNode(' 的，还可能出现播完后等待或重新播放的情况。'));
        paragraph('二、播放进度达标，不代表后台学习记录一定达标',true);
        paragraph('平台或教师后台可能记录、核对实际观看时长。如果累计有效观看时间明显少于课程要求，即使视频进度已经显示完成，也可能被判定为学习记录异常。具体记录方式和处理规则，以所在课程及平台要求为准。');
        paragraph('该怎么选？',true);
        const advice=paragraph('播放器原本限制倍速的视频：建议保持 1×，不建议使用强制倍速来追求提前完成。',true);
        emphasize(advice,['建议保持 1×','不建议使用强制倍速来追求提前完成'],true);
        const allowed=paragraph(''),green=document.createElement('span');green.textContent='播放器本身开放倍速、课程也允许使用的视频：可以';green.style.color='#15803d';allowed.append(green,document.createTextNode('按课程要求正常选择倍速。这类视频与你本次测试的限速视频不同，不必一概按限速视频处理。'));
        const limits=paragraph('强制倍速功能仍会保留，但它只能尝试改变播放速度，不能保证缩短平台认可的学习时间，也不能保证任务点提前完成。',true);
        emphasize(limits,['不能保证缩短平台认可的学习时间','也不能保证任务点提前完成'],true);
        const actions=document.createElement('div');actions.style.cssText='display:flex;gap:10px;flex-wrap:wrap;position:sticky;bottom:-22px;background:#fff;padding:14px 0';
        const restore=document.createElement('button'),accept=document.createElement('button'),cancel=document.createElement('button');
        for(const button of [restore,accept,cancel]){button.type='button';button.style.cssText='padding:10px 14px;border:1px solid #8495aa;border-radius:10px;background:#f4f7fb;color:#182338;font:inherit;cursor:pointer';}
        restore.textContent='恢复 1×（推荐）';accept.textContent='仍使用所选倍速';cancel.textContent='取消';
        function close(){document.removeEventListener('keydown',key,true);overlay.remove();if(current?.overlay===overlay)current=null;previous?.focus?.();}
        function key(event){if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}if(event.key==='Tab'){const buttons=[restore,accept,cancel],i=buttons.indexOf(document.activeElement);event.preventDefault();buttons[(i+(event.shiftKey?2:1)+3)%3].focus();}}
        restore.onclick=()=>{close();commit(1);};accept.onclick=()=>{close();if(Number.isFinite(selected))commit(selected);};cancel.onclick=close;
        const skin=document.querySelector('[data-xxt-codex-panel]')?.dataset.skin;
        if(['ridge','tide'].includes(skin)){
            const accent=skin==='ridge'?'#d8ea35':'#ffb47a';
            overlay.dataset.theme=skin;overlay.style.color='#fff4e5';dialog.style.background='linear-gradient(145deg,#18383bf5,#10262bf5)';dialog.style.border='1px solid '+accent+'66';dialog.style.backdropFilter='blur(24px)';title.style.color=accent;actions.style.background='#122d33';
            for(const b of [restore,accept,cancel]){b.style.color='#fff4e5';b.style.background='#28464b';b.style.borderColor=accent+'80';}
            restore.style.background=accent;restore.style.color='#10262b';green.style.color='#a9edbd';red.style.color='#ffb5ae';
        }
        document.addEventListener('keydown',key,true);actions.append(restore,accept,cancel);dialog.append(actions);overlay.append(dialog);document.body.append(overlay);current={close,overlay};restore.focus();return current;
    }
    globalThis.XxtRateNotice={open};
})();
