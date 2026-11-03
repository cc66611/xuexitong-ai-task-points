/* Retry only chapters from the user's own saved queue and unchanged catalog. */
(function(root){
    const identity=entry=>JSON.stringify([entry.index,entry.title]);
    function plan(records,catalog,scope){
        const seen=new Set();
        return records.filter(x=>x.scope===scope && !['reviewed','completed'].includes(x.status) && !x.uncertainSubmission)
            .flatMap(x=>{const chapter=catalog[x.index];if(!chapter||chapter.title!==x.title||chapter.completion==='completed'||seen.has(identity(x)))return[];seen.add(identity(x));return[{index:x.index,title:x.title}];});
    }
    function reconcile(records,catalog,scope){
        let changed=false;
        const result=records.map(entry=>{
            const chapter=catalog[entry.index];
            if(entry.scope!==scope||!chapter||chapter.title!==entry.title||entry.uncertainSubmission)return entry;
            const status=chapter.completion==='completed'?'completed':chapter.completion==='pending'&&entry.status==='completed'?'pending':entry.status;
            if(status===entry.status)return entry;
            changed=true;return{...entry,status};
        });
        return changed?result:records;
    }
    function record(records,entry){
        const previous=records.find(x=>x.scope===entry.scope&&identity(x)===identity(entry));
        const rest=records.filter(x=>x.scope!==entry.scope||identity(x)!==identity(entry));
        return [...rest,{...entry,uncertainSubmission:!!(entry.uncertainSubmission||previous?.uncertainSubmission),status:'pending'}].slice(-100);
    }
    const api={plan,record,identity,reconcile};if(typeof module==='object'&&module.exports)module.exports=api;root.XxtRunLedger=api;
})(typeof globalThis!=='undefined'?globalThis:this);
