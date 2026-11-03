/* Presentation only: motion never owns learning, storage of answers, or navigation. */
(() => {
    'use strict';
    const instances=new WeakMap(),EASE='cubic-bezier(.23,1,.32,1)';
    function attach(panel){
        if(instances.has(panel))return instances.get(panel);
        const doc=panel.ownerDocument,win=doc.defaultView,reduce=win.matchMedia('(prefers-reduced-motion: reduce)'),fine=win.matchMedia('(hover: hover) and (pointer: fine)');
        const style=doc.createElement('style');style.textContent=`
        [data-xxt-codex-panel][data-panel-motion] .xxt-workspace-nav{position:relative}
        [data-xxt-codex-panel] .xxt-liquid-indicator{position:absolute;left:0;top:0;pointer-events:none;z-index:2;box-sizing:border-box;border:1px solid var(--accent);border-radius:12px;background:color-mix(in srgb,var(--accent),transparent 91%);opacity:.72;transition:transform 160ms var(--ease-out)}
        [data-xxt-codex-panel] .xxt-motion-ripple{position:fixed;pointer-events:none;z-index:8;box-sizing:border-box;border:1px solid var(--accent);border-radius:14px;background:radial-gradient(ellipse,color-mix(in srgb,var(--accent),transparent 78%),transparent 75%)}
        [data-xxt-codex-panel] [data-motion-controls]{display:block;font-size:12px;line-height:1.7;margin:12px 0}
        [data-xxt-codex-panel][data-motion-input=keyboard] *,[data-xxt-codex-panel][data-panel-motion=off] *{transition-duration:0s!important;animation-duration:0s!important}
        @media(hover:hover) and (pointer:fine){[data-xxt-codex-panel][data-panel-motion=on][data-motion-input=pointer] .xxt-scene-art,[data-xxt-codex-panel][data-panel-motion=on][data-motion-input=pointer] .xxt-brand{transition:transform 160ms var(--ease-out)}}
        @media(prefers-reduced-motion:reduce){[data-xxt-codex-panel][data-panel-motion] .xxt-scene-art,[data-xxt-codex-panel][data-panel-motion] .xxt-brand{transform:none!important}[data-xxt-codex-panel][data-panel-motion] .xxt-liquid-indicator{transition:none}[data-xxt-codex-panel][data-panel-motion] button{transition:none!important}}
        `;doc.head.append(style);
        let input='pointer',enabled=GM_getValue('xxt-panel-motion',true)!==false,closed=false,frame=0,transition=null,lastStatus='',pointerTrigger=null;
        const animations=new Map(),detailStates=new WeakMap(),indicator=doc.createElement('span');indicator.className='xxt-liquid-indicator';indicator.setAttribute('aria-hidden','true');
        const nav=panel.querySelector('.xxt-workspace-nav'),scene=panel.querySelector('.xxt-scene-art'),brand=panel.querySelector('.xxt-brand');nav?.append(indicator);
        const full=()=>enabled&&!reduce.matches&&input!=='keyboard'&&!closed;
        const animate=(node,frames,options={},key=node)=>{
            if(!node||!full()||!node.animate)return null;
            const previous=animations.get(key);
            if(previous){const current=win.getComputedStyle(node);for(const property of Object.keys(frames[0]))if(['transform','opacity','height'].includes(property))frames[0][property]=current[property];previous.cancel();}
            const animation=node.animate(frames,{duration:160,easing:EASE,...options});animations.set(key,animation);
            animation.finished.catch(()=>{}).finally(()=>{if(animations.get(key)===animation)animations.delete(key);});return animation;
        };
        function cancel(){for(const a of animations.values())a.cancel();animations.clear();transition?.skipTransition();transition=null;delete doc.documentElement.dataset.xxtThemeTransition;win.cancelAnimationFrame(frame);frame=0;resetParallax();}
        function sync(){panel.dataset.panelMotion=enabled?'on':'off';panel.dataset.motionInput=input;}
        function syncIndicator(){
            const selected=nav?.querySelector('[role=tab][aria-selected=true]');if(!selected||!nav.isConnected)return;
            const r=selected.getBoundingClientRect(),n=nav.getBoundingClientRect();indicator.style.transitionDuration=full()&&pointerTrigger==='workspace'?'160ms':'0ms';
            indicator.style.width=r.width+'px';indicator.style.height=r.height+'px';indicator.style.transform=`translate(${r.left-n.left+nav.scrollLeft}px,${r.top-n.top+nav.scrollTop}px)`;
        }
        function ripple(button){
            if(!full())return;const r=button.getBoundingClientRect(),echo=doc.createElement('span');echo.className='xxt-motion-ripple';echo.setAttribute('aria-hidden','true');
            Object.assign(echo.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});panel.append(echo);
            const a=animate(echo,[{opacity:.5,transform:'scale(.97)'},{opacity:0,transform:'scale(1.04)'}],{duration:160},'ripple');
            if(a)a.finished.catch(()=>{}).finally(()=>echo.remove());else echo.remove();
        }
        function disclose(event){
            const summary=event.target.closest('summary');if(!summary||summary.parentElement.tagName!=='DETAILS'||!full()||event.detail===0)return;
            const details=summary.parentElement,old=detailStates.get(details),opening=!(old?.opening??details.open),from=details.getBoundingClientRect().height;
            event.preventDefault();details.open=true;
            const cs=win.getComputedStyle(details),closedHeight=summary.getBoundingClientRect().height+parseFloat(cs.paddingTop||0)+parseFloat(cs.paddingBottom||0)+parseFloat(cs.borderTopWidth||0)+parseFloat(cs.borderBottomWidth||0);
            const natural=details.scrollHeight+parseFloat(cs.borderTopWidth||0)+parseFloat(cs.borderBottomWidth||0),to=opening?natural:closedHeight;
            details.style.overflow='hidden';const state={opening};detailStates.set(details,state);
            const a=animate(details,[{height:from+'px',opacity:1},{height:to+'px',opacity:opening?1:.85}],{duration:180},details);
            if(!a){details.open=opening;details.style.overflow='';detailStates.delete(details);return;}
            a.finished.then(()=>{if(detailStates.get(details)===state){details.open=opening;detailStates.delete(details);details.style.overflow='';}}).catch(()=>{if(detailStates.get(details)===state){details.open=opening;detailStates.delete(details);details.style.overflow='';}});
        }
        function resetParallax(){if(scene){scene.style.transform='';scene.style.willChange='';}if(brand)brand.style.transform='';}
        const pointerDown=event=>{input='pointer';pointerTrigger=event.target.closest('[data-workspace-tab]')?'workspace':null;sync();};
        const keyboard=()=>{input='keyboard';pointerTrigger=null;sync();cancel();};
        const pointerMove=event=>{
            if(!full()||!fine.matches||event.buttons)return;const r=panel.getBoundingClientRect(),x=(event.clientX-r.left)/Math.max(1,r.width)-.5,y=(event.clientY-r.top)/Math.max(1,r.height)-.5;
            win.cancelAnimationFrame(frame);frame=win.requestAnimationFrame(()=>{frame=0;if(!full())return;if(scene){scene.style.willChange='transform';scene.style.transform=`translate(${(-x*3).toFixed(2)}px,${(-y*3).toFixed(2)}px)`;}if(brand)brand.style.transform=`translate(${(x*2).toFixed(2)}px,${(y*2).toFixed(2)}px)`;});
        };
        const click=event=>{
            disclose(event);if(event.detail===0)return;
            const button=event.target.closest('.xxt-mode-group button');if(button&&!button.disabled)queueMicrotask(()=>ripple(button));
        };
        panel.addEventListener('pointerdown',pointerDown,true);panel.addEventListener('keydown',keyboard,true);panel.addEventListener('click',click,true);panel.addEventListener('pointermove',pointerMove);panel.addEventListener('pointerleave',resetParallax);
        let oldWorkspace=panel.dataset.workspace;
        const stateObserver=new MutationObserver(()=>{
            if(panel.dataset.workspace!==oldWorkspace){oldWorkspace=panel.dataset.workspace;syncIndicator();const pane=panel.querySelector('[data-workspace-pane]:not([hidden])');if(pointerTrigger==='workspace')animate(pane,[{opacity:.65,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}],{duration:160},'workspace');}
            const card=panel.querySelector('.xxt-status-card'),status=card?.dataset.status;if(status&&status!==lastStatus){if(lastStatus)animate(card.querySelector('.xxt-status-badge'),[{opacity:.65,transform:'scale(.98)'},{opacity:1,transform:'scale(1)'}],{duration:140},'status');lastStatus=status;}
        });stateObserver.observe(panel,{subtree:true,attributes:true,attributeFilter:['data-workspace','data-status']});
        const resize=new ResizeObserver(syncIndicator);if(nav)resize.observe(nav);nav?.addEventListener('scroll',syncIndicator,{passive:true});
        const modalObserver=new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes){if(node.nodeType!==1||!full())continue;const dialog=node.matches?.('[data-rate-notice]')?node.querySelector('[role=dialog]'):node.matches?.('dialog.xxt-test-result')?node:null;if(dialog)animate(dialog,[{opacity:0,transform:'scale(.96)'},{opacity:1,transform:'scale(1)'}],{duration:200},'dialog');}});modalObserver.observe(doc.body,{childList:true,subtree:true});
        const controls=doc.createElement('label');controls.dataset.motionControls='true';const check=doc.createElement('input');check.type='checkbox';check.checked=enabled;check.dataset.setting='panel-motion';controls.append(check,doc.createTextNode(' 界面动效（跟随系统减少动态效果设置）'));
        check.onchange=()=>{enabled=check.checked;GM_setValue('xxt-panel-motion',enabled);cancel();sync();syncIndicator();};panel.querySelector('[data-workspace-pane=more]')?.append(controls);
        const reduceChanged=()=>{cancel();syncIndicator();};reduce.addEventListener('change',reduceChanged);
        sync();queueMicrotask(syncIndicator);
        const name='xxt-panel-'+crypto.randomUUID().replaceAll('-','');panel.style.viewTransitionName=name;
        const radialStyle=doc.createElement('style');radialStyle.textContent=`::view-transition-old(${name}),::view-transition-new(${name}){animation:none;mix-blend-mode:normal}::view-transition-group(${name}){animation-duration:0s}html[data-xxt-theme-transition=${name}]::view-transition-old(root),html[data-xxt-theme-transition=${name}]::view-transition-new(root){animation:none}html[data-xxt-theme-transition=${name}]::view-transition{pointer-events:none}`;doc.head.append(radialStyle);
        const api={
            theme(event,commit){
                if(!full()||event?.detail===0||!doc.startViewTransition){commit();return;}
                transition?.skipTransition();const r=panel.getBoundingClientRect(),x=Math.max(0,Math.min(r.width,(event?.clientX||r.left+r.width/2)-r.left)),y=Math.max(0,Math.min(r.height,(event?.clientY||r.top+r.height/2)-r.top)),radius=Math.hypot(Math.max(x,r.width-x),Math.max(y,r.height-y));
                doc.documentElement.dataset.xxtThemeTransition=name;let committed=false;const apply=()=>{if(!committed){committed=true;commit();}};
                try{const t=doc.startViewTransition(apply);transition=t;t.ready.then(()=>{if(transition!==t||!full()){t.skipTransition();return;}const a=doc.documentElement.animate([{clipPath:`circle(0px at ${x}px ${y}px)`},{clipPath:`circle(${radius}px at ${x}px ${y}px)`}],{duration:240,easing:EASE,pseudoElement:`::view-transition-new(${name})`});animations.set('theme',a);a.finished.catch(()=>{}).finally(()=>{if(animations.get('theme')===a)animations.delete('theme');});}).catch(apply);t.finished.catch(apply).finally(()=>{if(transition===t){transition=null;delete doc.documentElement.dataset.xxtThemeTransition;}});}catch{delete doc.documentElement.dataset.xxtThemeTransition;apply();}
            },
            inspect(){return{enabled,input,reduced:reduce.matches,activeAnimations:animations.size,framePending:!!frame,transition:!!transition};},
            close(){closed=true;cancel();stateObserver.disconnect();modalObserver.disconnect();resize.disconnect();reduce.removeEventListener('change',reduceChanged);nav?.removeEventListener('scroll',syncIndicator);panel.removeEventListener('pointerdown',pointerDown,true);panel.removeEventListener('keydown',keyboard,true);panel.removeEventListener('click',click,true);panel.removeEventListener('pointermove',pointerMove);panel.removeEventListener('pointerleave',resetParallax);style.remove();radialStyle.remove();indicator.remove();controls.remove();}
        };instances.set(panel,api);win.addEventListener('pagehide',()=>api.close(),{once:true});return api;
    }
    globalThis.XxtPanelMotion={attach,theme(panel,event,commit){const ui=instances.get(panel);if(ui)ui.theme(event,commit);else commit();},inspect:panel=>instances.get(panel)?.inspect()};
})();
