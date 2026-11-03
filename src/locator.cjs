/* Detached, read-only HTML prefetch; metadata is a hint, never task credit. */
(function(root){
    function create({now=Date.now,fetcher=(url,options)=>fetch(url,options),onCatalogChange=()=>{}}={}){
        let cachedRoot,observer,snapshot=[],dirty=true,controller=new AbortController(),generation=0;
        const cache=new Map(),pending=new Map();
        const clear=()=>{generation++;controller.abort();controller=new AbortController();cache.clear();pending.clear();dirty=true;};
        function catalog(container){
            if(container!==cachedRoot){observer?.disconnect();cachedRoot=container;dirty=true;if(container){observer=new MutationObserver(()=>{clear();onCatalogChange();});observer.observe(container,{subtree:true,childList:true,attributes:true,characterData:true});}}
            if(dirty){snapshot=[...(container?.querySelectorAll('.posCatalog_select')||[])].map((node,index)=>{const name=node.querySelector('.posCatalog_name');return{node,index,get completion(){return completion(node);},title:name?.getAttribute('title')||name?.textContent.trim()||''};});dirty=false;}
            return snapshot;
        }
        function completion(node){
            if(!node?.querySelector('.posCatalog_name'))return 'unknown';
            // Real catalog markers: a numeric orange badge wins over a stale green icon.
            if([...node.querySelectorAll('.orangeNew')].some(el=>/^\d+$/.test(el.textContent.trim())&&Number(el.textContent.trim())>0))return 'pending';
            if(node.querySelector('.icon_Completed'))return 'completed';
            return 'unknown';
        }
        function urls(entries,current){return [...new Set(entries.flatMap(e=>[...e.node.querySelectorAll('a[href]')].map(a=>safeUrl(a.getAttribute('href'),current)).filter(Boolean)))].slice(0,4);}
        function safeUrl(href,current){
            try{const u=new URL(href,current),base=new URL(current);if(u.origin!==base.origin||u.username||u.password||!/^\/mycourse\/studentstudy(?:Ajax)?$/.test(u.pathname))return null;
                for(const names of [['courseId','courseid'],['clazzid','clazzId'],['cpi','personid']]){const read=url=>names.map(n=>url.searchParams.get(n)).find(Boolean)||'';if(read(u)!==read(base))return null;}return u.href;
            }catch{return null;}
        }
        async function prefetch(entries,current){
            const serial=generation;
            return Promise.all(urls(entries,current).map(url=>{
                if(cache.has(url)&&now()-cache.get(url).at<60000)return cache.get(url).value;
                if(pending.has(url))return pending.get(url);
                const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(15000)]);
                const work=(async()=>{try{const response=await fetcher(url,{method:'GET',credentials:'same-origin',redirect:'error',signal});
                    if(!response.ok||!/(?:text\/html|application\/xhtml\+xml)/i.test(response.headers.get('content-type')||''))return null;
                    const reader=response.body?.getReader();if(!reader)return null;const decoder=new TextDecoder();let html='',bytes=0;
                    try{while(true){const item=await reader.read();if(item.done)break;bytes+=item.value.byteLength;if(bytes>2*1024*1024){await reader.cancel();return null;}html+=decoder.decode(item.value,{stream:true});}}finally{reader.releaseLock();}
                    if(serial!==generation||signal.aborted)return null;
                    // Template contents stay inert: never attach them, execute scripts,
                    // load embedded resources, extract answers or infer task credit.
                    const template=document.createElement('template');template.innerHTML=html;const doc=template.content;
                    const value={cards:doc.querySelectorAll('.prev_ul li,[data-card-id]').length,frames:doc.querySelectorAll('iframe').length};
                    cache.set(url,{at:now(),value});while(cache.size>4)cache.delete(cache.keys().next().value);return value;
                }catch{return null;}finally{if(serial===generation)pending.delete(url);}})();pending.set(url,work);return work;
            }));
        }
        return{catalog,completion,urls,prefetch,clear,close(){clear();observer?.disconnect();cachedRoot=null;},safeUrl};
    }
    const api={create};if(typeof module==='object'&&module.exports)module.exports=api;root.XxtLocator=api;
})(typeof globalThis!=='undefined'?globalThis:this);
