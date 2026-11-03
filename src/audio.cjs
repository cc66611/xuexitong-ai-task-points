/* Tab output mute is separate from HTMLMediaElement.muted. Never unlock media before verified silence. */
(function(root){
 'use strict';
 function create({host=root,read=(k,d)=>typeof GM_getValue==='function'?GM_getValue(k,d):d,write=(k,v)=>{if(typeof GM_setValue==='function')GM_setValue(k,v);},audio=(typeof GM_audio!=='undefined'?GM_audio:host.GM_audio||host.GM?.audio),callback=(typeof GM_audio!=='undefined'||!!host.GM_audio),owner=(()=>{try{const page=typeof unsafeWindow!=='undefined'?unsafeWindow:host;return page===page.top&&(/studentstudy/i.test(page.location.pathname)||!!page.document.getElementById('coursetree'));}catch{return false;}})(),timeout=3000}={}){
  let tabMuted=null,reason='',owned=false,failed='',blocked=false,destroyed=false,signature='',serial=0,chain=Promise.resolve(),listening=false,monitorFailed=false;
  const observers=new Set(),pending=new Set();
  const supported=()=>!!audio&&typeof audio.getState==='function'&&typeof audio.setMute==='function';
  const wanted=()=>read('xxt-video-muted',true)!==false,mode=()=> 'tab';
  const mediaMuted=()=>wanted()&&(mode()==='media'||tabMuted!==true||!!failed||monitorFailed);
  function status(){return{wanted:wanted(),mode:mode(),supported:supported(),tabMuted,owned,mediaMuted:mediaMuted(),state:!wanted()?'off':mode()==='media'?'media':monitorFailed?'fallback':tabMuted===true&&!failed?'tab':failed||!supported()?'fallback':'pending',error:monitorFailed?'listener-failed':failed};}
  function emit(){for(const fn of observers)try{fn(status());}catch{}}
  function invoke(name,arg){return new Promise((resolve,reject)=>{
   let settled=false;const finish=(error,value)=>{if(settled)return;settled=true;host.clearTimeout(timer);pending.delete(cancel);error?reject(Error(error)):resolve(value);};
   const cancel=()=>finish('cancelled'),timer=host.setTimeout(()=>finish('timeout'),timeout);pending.add(cancel);
   try{
    let value;
    if(callback)value=name==='getState'?audio.getState(info=>info&&typeof info.isMuted==='boolean'?finish(null,info):finish('state-unavailable')):audio.setMute(arg,error=>finish(error?'set-failed':null));
    else value=name==='getState'?audio.getState():audio.setMute(arg);
    if(value?.then)value.then(result=>finish(null,result),()=>finish('api-failed'));
   }catch{finish('api-failed');}
  });}
  function observe(fn){observers.add(fn);fn(status());return()=>observers.delete(fn);}
  const onState=event=>{
   if(destroyed)return;
   if(!('muted'in event))return;
   if('muted'in event){tabMuted=!!event.muted;reason=typeof event.muted==='string'?event.muted:'';if(!tabMuted||reason==='user'||reason==='capture')owned=false;if(tabMuted){failed='';blocked=false;}else if(wanted()&&mode()==='tab'){failed='tab-unmuted';blocked=true;}}
   emit();
  };
  async function run(id,allowUnmute){
   if(destroyed||id!==serial)return;
   if(!supported()){failed='unsupported';emit();return;}
   if(mode()==='media'&&(wanted()||!allowUnmute||!owned)){failed='';emit();return;}
   try{
    const state=await invoke('getState');if(destroyed||id!==serial)return;
    if(!state||typeof state.isMuted!=='boolean')throw Error('state-unavailable');
    tabMuted=state.isMuted;reason=state.muteReason||'';if(reason==='user'||reason==='capture')owned=false;
    if(!wanted()){
     if(owner&&allowUnmute&&owned&&tabMuted&&reason==='extension'){await invoke('setMute',{isMuted:false});if(destroyed||id!==serial)return;tabMuted=false;owned=false;}
     failed='';emit();return;
    }
    if(!tabMuted&&owner&&!blocked){await invoke('setMute',{isMuted:true});owned=true;if(destroyed||id!==serial)return;const verified=await invoke('getState');if(destroyed||id!==serial)return;if(verified?.isMuted!==true)throw Error('not-confirmed');tabMuted=true;reason=verified.muteReason||'';}
    if(tabMuted){failed='';}else failed=blocked?'tab-unmuted':'not-confirmed';emit();
   }catch(error){if(destroyed||id!==serial)return;failed=['timeout','state-unavailable','not-confirmed','tab-unmuted','unsupported'].includes(error.message)?error.message:'api-failed';emit();}
  }
  function refresh(force=false,allowUnmute=false){
   if(destroyed)return Promise.resolve();
   const key=JSON.stringify([wanted(),mode()]);if(!force&&key===signature)return chain;
   signature=key;const id=++serial;
   // Until the new choice is confirmed, old verification cannot unlock media.
   if(wanted()&&mode()==='tab'&&tabMuted!==true)failed='';emit();
   chain=chain.catch(()=>{}).then(()=>run(id,allowUnmute));return chain;
  }
  function setPreference(value){write('xxt-video-muted',!!value);blocked=false;return refresh(true,!value);}
  function setMode(value){write('xxt-mute-output',value==='media'?'media':'tab');blocked=false;return refresh(true);}
  function retry(){blocked=false;failed='';return refresh(true);}
  function destroy(){if(destroyed)return;destroyed=true;serial++;for(const cancel of [...pending])cancel();if(listening)try{const result=audio.removeStateChangeListener?.(onState,()=>{});result?.catch?.(()=>{});}catch{}observers.clear();}
  function start(){if(supported()&&!listening){if(typeof audio.addStateChangeListener!=='function'){monitorFailed=true;}else try{listening=true;const result=callback?audio.addStateChangeListener(onState,error=>{if(error){monitorFailed=true;emit();}}):audio.addStateChangeListener(onState);result?.catch?.(()=>{monitorFailed=true;emit();});}catch{monitorFailed=true;}}return refresh();}
  return{start,refresh,setPreference,setMode,retry,observe,status,mediaMuted,destroy};
 }
 const api={create};if(typeof module==='object'&&module.exports)module.exports=api;
 if(root.document)Object.assign(api,create());root.XxtAudio=api;
})(typeof globalThis!=='undefined'?globalThis:this);
