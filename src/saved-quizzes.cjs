/* Confirmed draft saves are distinct from skipped or uncertain work. */
(function(root){
    const identity=x=>JSON.stringify([x.scope,x.index,x.title,x.card?.id||'',x.quizKey||'legacy']);
    function upsert(records,entry){
        return [...records.filter(x=>identity(x)!==identity(entry)),{...entry,state:'saved'}].slice(-100);
    }
    function migrate(skipped,saved,scope){
        let changed=false;let next=saved;
        const remaining=skipped.flatMap(entry=>{
            if(entry.scope!==scope)return[entry];
            const drafts=(entry.quizSkips||[]).filter(q=>q.state==='saved');
            if(!drafts.length)return[entry];changed=true;
            for(const [index,quiz]of drafts.entries())next=upsert(next,{chapter:entry.chapter,title:entry.title,index:entry.index,scope,at:quiz.at||entry.at,reason:quiz.reason,total:quiz.total,essays:quiz.essays,quizKey:quiz.quizKey||'legacy:'+index,legacy:!quiz.quizKey});
            const quizSkips=entry.quizSkips.filter(q=>q.state!=='saved');
            let reason=entry.reason||'';for(const draft of drafts)reason=reason.replace(draft.reason,'');
            reason=reason.replace(/^[；;\s]+|[；;\s]+$/g,'').replace(/[；;]{2,}/g,'；');
            if(!reason&&!quizSkips.length&&!entry.discussionSkips?.length)return[];
            return[{...entry,quizSkips,reason:reason||quizSkips.map(q=>q.reason).join('；')||(entry.discussionSkips||[]).map(d=>d.reason).join('；')}];
        });
        return {changed,skipped:changed?remaining:skipped,saved:next};
    }
    const api={identity,upsert,migrate};if(typeof module==='object'&&module.exports)module.exports=api;root.XxtSavedQuizzes=api;
})(typeof globalThis!=='undefined'?globalThis:this);
