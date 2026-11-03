/* Presentation only. Existing controls and their handlers keep their identity. */
(() => {
    'use strict';
    const instances = new WeakMap();
    const icons = {
        study: 'M4 5h16v14H4zM8 9h8M8 13h5',
        course: 'M5 5h4v4H5zM5 15h4v4H5zM15 5h4v4h-4zM15 15h4v4h-4zM9 7h6M7 9v6M17 9v6',
        ai: 'M5 7h5v10H5zM14 4h5v7h-5zM14 15h5v5h-5zM10 12h3V7h1M13 12v5h1',
        records: 'M6 3h12v18H6zM9 8h6M9 12h6M9 16h4',
        more: 'M5 6h14M5 12h14M5 18h14M9 4v4M15 10v4M10 16v4',
        update: 'M19 8a8 8 0 0 0-13-2L3 9m0-5v5h5M5 16a8 8 0 0 0 13 2l3-3m0 5v-5h-5'
    };
    function icon(name) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        for (const [k,v] of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.6','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'})) svg.setAttribute(k,v);
        const path = document.createElementNS(svg.namespaceURI,'path');
        path.setAttribute('d',icons[name]); svg.append(path); return svg;
    }
    function style() {
        if(document.querySelector('style[data-xxt-workspace-style]')) return;
        const css = document.createElement('style'); css.dataset.xxtWorkspaceStyle='true';
        css.textContent = `
        [data-xxt-codex-panel][data-workspace]{width:min(440px,calc(100vw - 36px))!important}
        [data-workspace] .xxt-shell{height:min(850px,calc(100dvh - 112px));max-height:calc(100dvh - 112px)}
        [data-workspace][data-layout-collapsed=true] .xxt-shell{height:auto}
        [data-workspace] .xxt-head{flex:0 0 auto;padding-right:102px}
        [data-workspace] .xxt-head .xxt-quick-update{position:absolute;right:57px;top:18px;width:32px;height:32px;padding:6px;display:grid;place-items:center;border-radius:10px;box-shadow:none;z-index:2}
        [data-workspace] .xxt-quick-update svg{width:19px;height:19px}
        [data-workspace] .xxt-quick-update[data-state=available]::after{content:'';position:absolute;right:2px;top:2px;width:6px;height:6px;border-radius:50%;background:var(--accent)}
        [data-workspace] .xxt-quick-update[data-state=checking] svg{animation:xxt-update-check 1s linear infinite}
        @keyframes xxt-update-check{to{transform:rotate(360deg)}}
        [data-workspace] .xxt-body{padding:12px;display:flex;flex-direction:column;overflow:hidden;max-height:none;gap:10px;min-height:0}
        [data-workspace] .xxt-fixed-controls{flex:0 0 auto;min-width:0}
        [data-workspace] .xxt-fixed-controls .xxt-mode-dock{margin:0 0 8px;padding:0}
        [data-workspace] .xxt-fixed-controls .xxt-mode-heading{display:none}
        [data-workspace] .xxt-fixed-controls .xxt-mode-rail button{min-height:40px;padding:8px 6px}
        [data-workspace] .xxt-fixed-controls .xxt-actions{margin:0 0 9px;gap:7px}
        [data-workspace] .xxt-fixed-controls .xxt-actions button{min-height:38px;padding:8px;font-size:12px}
        [data-workspace] .xxt-fixed-controls .xxt-state{margin:0 0 5px;font-size:10px}
        [data-workspace] .xxt-status-card{padding:10px 12px;margin:0;border-radius:14px}
        [data-workspace] .xxt-status-top{margin-bottom:4px}
        [data-workspace] .xxt-status-card pre{font-size:12px!important;line-height:1.65!important;max-height:76px!important;overflow-y:auto!important;scrollbar-width:thin}
        [data-workspace] .xxt-workspace-grid{display:grid;grid-template-columns:52px minmax(0,1fr);gap:10px;min-height:0;flex:1}
        [data-workspace] .xxt-workspace-nav{display:flex;flex-direction:column;gap:6px;border-right:1px solid var(--line);padding-right:8px;min-width:0}
        [data-workspace] .xxt-workspace-nav button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;width:44px;min-height:49px;padding:5px 3px;border:1px solid transparent;background:transparent;box-shadow:none;border-radius:11px;font-size:10px;color:var(--muted);transition:none}
        [data-workspace] .xxt-workspace-nav button svg{width:19px;height:19px}
        [data-workspace] .xxt-workspace-nav button[aria-selected=true]{background:var(--surface,#ffffff14);border-color:var(--line);color:var(--accent);box-shadow:inset 3px 0 var(--accent)}
        [data-workspace] .xxt-workspace-nav button:disabled{opacity:.4}
        [data-workspace] .xxt-workspace-nav button:focus-visible,[data-workspace] .xxt-quick-update:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
        [data-workspace] .xxt-workspace-pages{min-height:0;min-width:0;position:relative;display:flex;flex-direction:column}
        [data-workspace] .xxt-workspace-pane{min-height:0;min-width:0;flex:1;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-gutter:stable;scrollbar-width:thin;padding:0 4px 14px 0;outline-offset:-2px}
        [data-workspace] .xxt-workspace-pane>h3{font-size:13px;line-height:1.5;margin:2px 0 5px}
        [data-workspace] .xxt-workspace-pane>.xxt-pane-note{font-size:10px;color:var(--muted);margin:0 0 10px;line-height:1.65}
        [data-workspace] .xxt-workspace-pane .xxt-skin-picker{padding:10px 0;gap:6px;flex-wrap:wrap;background:transparent;backdrop-filter:none;border:0}
        [data-workspace] .xxt-workspace-pane [data-xxt-hub]{width:100%;min-width:0}
        [data-workspace] .xxt-workspace-pane [data-xxt-hub] ol{max-height:none}
        [data-workspace] .xxt-workspace-pane .xxt-foreground-note{font-size:10px;padding:9px;margin:8px 0;line-height:1.7}
        [data-workspace] .xxt-workspace-pane .xxt-settings{margin-top:8px}
        [data-workspace] .xxt-layout-idle{font-size:11px;line-height:1.75;color:var(--muted);padding:12px 0}
        @media(max-width:600px){
          [data-xxt-codex-panel][data-workspace]{width:calc(100vw - 32px)!important;right:16px!important}
          [data-workspace] .xxt-head{padding:14px 98px 14px 14px}
          [data-workspace] .xxt-head .xxt-quick-update{top:14px}
          [data-workspace] .xxt-workspace-grid{grid-template-columns:minmax(0,1fr);grid-template-rows:auto minmax(0,1fr);gap:9px}
          [data-workspace] .xxt-workspace-nav{flex-direction:row;border:0;border-bottom:1px solid var(--line);padding:0 0 7px;gap:3px}
          [data-workspace] .xxt-workspace-nav button{flex:1;flex-direction:row;gap:4px;width:auto;min-height:36px;padding:5px 2px;font-size:10px}
          [data-workspace] .xxt-workspace-nav button svg{width:15px;height:15px}
          [data-workspace] .xxt-workspace-nav button[aria-selected=true]{box-shadow:inset 0 -2px var(--accent)}
        }
        @media(prefers-reduced-motion:reduce){[data-workspace] .xxt-quick-update[data-state=checking] svg{animation:none}}
        `;
        document.head.append(css);
    }
    function attach(panel, slots) {
        if(instances.has(panel)) return instances.get(panel);
        style(); panel.dataset.workspace='study';
        const body=panel.querySelector('.xxt-body'),shell=panel.querySelector('.xxt-shell'),header=panel.querySelector('.xxt-head');
        const fixed=document.createElement('div'); fixed.className='xxt-fixed-controls';
        const grid=document.createElement('div'); grid.className='xxt-workspace-grid';
        const nav=document.createElement('div');nav.className='xxt-workspace-nav';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','学习助手工作区');
        const pages=document.createElement('div');pages.className='xxt-workspace-pages';
        const specs=[['study','学习','当前学习设置','常用操作与运行状态保持在上方。'],['course','课程','章节与课程队列','找章节、调整课程顺序；切换本区域不会自动开始。'],['ai','接口','文字 / 图片接口','配置、切换和测试你的模型。修改配置沿用原有停止规则。'],['records','记录','答案与待复核记录','预览不填写、不提交；保存与跳过记录各自保留。'],['more','更多','外观、更新与反馈','这些入口不会自行启动课程任务。']];
        const id=crypto.randomUUID(),tabs=new Map(),panes=new Map(),positions=new Map();let active='study',closed=false;
        for(const [key,label,title,note]of specs){
            const tab=document.createElement('button');tab.type='button';tab.dataset.workspaceTab=key;tab.id='xxt-tab-'+id+'-'+key;tab.setAttribute('role','tab');tab.setAttribute('aria-selected',String(key===active));tab.tabIndex=key===active?0:-1;tab.append(icon(key),Object.assign(document.createElement('span'),{textContent:label}));
            const pane=document.createElement('section');pane.dataset.workspacePane=key;pane.className='xxt-workspace-pane';pane.id='xxt-pane-'+id+'-'+key;pane.setAttribute('role','tabpanel');pane.setAttribute('aria-labelledby',tab.id);pane.tabIndex=0;pane.hidden=key!==active;tab.setAttribute('aria-controls',pane.id);
            pane.append(Object.assign(document.createElement('h3'),{textContent:title}),Object.assign(document.createElement('p'),{className:'xxt-pane-note',textContent:note}));
            tabs.set(key,tab);panes.set(key,pane);nav.append(tab);pages.append(pane);tab.onclick=()=>activate(key);
        }
        function activate(key,{focus=false}={}){
            if(!panes.has(key)||tabs.get(key).disabled)return;
            positions.set(active,panes.get(active).scrollTop);active=key;panel.dataset.workspace=key;
            for(const [name,pane]of panes){pane.hidden=name!==key;const tab=tabs.get(name);tab.setAttribute('aria-selected',String(name===key));tab.tabIndex=name===key?0:-1;}
            panes.get(key).scrollTop=positions.get(key)||0;if(focus)tabs.get(key).focus();
        }
        nav.onkeydown=event=>{
            const all=[...tabs.values()].filter(b=>!b.disabled),current=all.indexOf(event.target.closest('[role=tab]'));
            if(current<0)return;let next;
            if(['ArrowDown','ArrowRight'].includes(event.key))next=(current+1)%all.length;
            if(['ArrowUp','ArrowLeft'].includes(event.key))next=(current+all.length-1)%all.length;
            if(event.key==='Home')next=0;if(event.key==='End')next=all.length-1;
            if(next===undefined)return;event.preventDefault();activate(all[next].dataset.workspaceTab,{focus:true});
        };
        const move=(key,nodes)=>{for(const node of nodes.filter(Boolean))panes.get(key).append(node);};
        const dock=body.querySelector('.xxt-mode-dock');if(dock)fixed.append(dock);
        fixed.append(slots.actions,slots.status,slots.statusCard);
        move('study',[slots.foregroundNote,slots.settings,body.querySelector('[data-homework-options]')]);
        move('ai',[slots.modeLabel,slots.modeNote,slots.selectedSummary,slots.routingNote,slots.aiForm,slots.profiles]);
        move('records',[slots.details,slots.runLog,slots.savedLog]);
        move('more',[slots.picker,slots.themeFeedback,slots.updates,slots.feedback]);
        const empty=document.createElement('p');empty.className='xxt-layout-idle';empty.textContent='当前页面没有可用的章节目录。请进入具体课程学习页，再查看本区域。';panes.get('course').append(empty);
        grid.append(nav,pages);body.append(fixed,grid);
        function placeHub(host){
            empty.hidden=true;
            const settings=host.querySelector('[data-hub-settings]');
            if(settings)panes.get('study').append(settings);
            panes.get('course').append(host);tabs.get('course').disabled=false;
        }
        function placePreview(box){const pane=panes.get('records');pane.insertBefore(box,pane.children[2]||null);if(!box.hidden)activate('records');}
        tabs.get('course').disabled=!panel.querySelector('[data-xxt-hub]');
        for(const host of panel.querySelectorAll('[data-xxt-hub]'))placeHub(host);
        const routeLateNodes=()=>{for(const child of [...body.children]){
            if(child===fixed||child===grid)continue;
            if(child.matches('[data-answer-preview]')){panes.get('records').prepend(child);if(!child.hidden)activate('records');}
            else if(child.matches('[data-xxt-hub]'))placeHub(child);
        }};
        const lateObserver=new MutationObserver(routeLateNodes);lateObserver.observe(body,{childList:true});routeLateNodes();
        const previewObserver=new MutationObserver(records=>{for(const row of records)if(row.attributeName==='hidden'&&row.target.matches('[data-answer-preview]')&&!row.target.hidden)activate('records');});
        previewObserver.observe(panel,{subtree:true,attributes:true,attributeFilter:['hidden']});
        const modeObserver=new MutationObserver(()=>activate('study'));modeObserver.observe(panel,{attributes:true,attributeFilter:['data-study-mode']});
        const quick=document.createElement('button');quick.type='button';quick.className='xxt-quick-update';quick.dataset.quickUpdate='true';quick.setAttribute('aria-label','检查脚本更新');quick.title='检查脚本更新';quick.append(icon('update'));header.append(quick);
        const check=slots.updates.querySelector('[data-update-check]'),output=slots.updates.querySelector('[data-update-status]');
        const fold=panel.querySelector('.xxt-fold'),originalFold=fold.onclick;
        function constrain(){
            if(!panel.isConnected)return;
            const box=panel.getBoundingClientRect();
            if(panel.style.left&&panel.style.left!=='auto')panel.style.left=Math.max(8,Math.min(Math.max(8,innerWidth-box.width-8),box.left))+'px';
            if(panel.style.top&&panel.style.top!=='auto')panel.style.top=Math.max(8,Math.min(Math.max(8,innerHeight-box.height-8),box.top))+'px';
        }
        const syncFold=()=>{panel.dataset.layoutCollapsed=String(body.hidden);fold.setAttribute('aria-expanded',String(!body.hidden));fold.setAttribute('aria-label',body.hidden?'展开面板':'收起面板');if(!body.hidden)queueMicrotask(constrain);};syncFold();
        fold.onclick=event=>{originalFold?.call(fold,event);syncFold();};
        quick.onclick=()=>{if(body.hidden){body.hidden=false;fold.textContent='−';fold.title='收起面板';syncFold();}activate('more');slots.updates.open=true;check.click();slots.updates.scrollIntoView({block:'nearest',behavior:'instant'});};
        const refreshQuick=()=>{quick.disabled=check.disabled;quick.dataset.state=check.disabled?'checking':!slots.updates.querySelector('[data-update-install]').hidden?'available':/失败|超时|离线/.test(output.textContent)?'error':'idle';quick.title=check.disabled?'正在检查脚本更新…':output.textContent||'检查脚本更新';quick.setAttribute('aria-busy',String(check.disabled));};
        const updateObserver=new MutationObserver(refreshQuick);updateObserver.observe(slots.updates,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['disabled','hidden']});refreshQuick();
        const media=matchMedia('(max-width:600px)'),orientation=()=>nav.setAttribute('aria-orientation',media.matches?'horizontal':'vertical');orientation();media.addEventListener('change',orientation);
        window.addEventListener('resize',constrain);
        const api={activate,placeHub,placePreview,get active(){return active;}};instances.set(panel,api);
        window.addEventListener('pagehide',()=>{if(closed)return;closed=true;lateObserver.disconnect();previewObserver.disconnect();modeObserver.disconnect();updateObserver.disconnect();media.removeEventListener('change',orientation);window.removeEventListener('resize',constrain);},{once:true});
        return api;
    }
    globalThis.XxtPanelLayout={attach,placeHub(panel,host){const ui=instances.get(panel);if(ui)ui.placeHub(host);else (panel.querySelector('.xxt-body')||panel).append(host);},placePreview(panel,box){const ui=instances.get(panel);if(ui)ui.placePreview(box);else panel.querySelector('.xxt-status-card').after(box);},activate(panel,key){instances.get(panel)?.activate(key);}};
})();
