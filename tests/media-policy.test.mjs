import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const C=createRequire(import.meta.url)('../src/core.cjs');
const video=(currentTime,duration=100,extra={})=>({tagName:'VIDEO',currentTime,duration,ended:false,...extra});
test('video switching defaults to full playback and preserves existing speed choices',()=>{
 for(const value of [undefined,null,0,91,99,'bad'])assert.equal(C.normalizeVideoAdvance(value),100);
 assert.equal(C.normalizeVideoAdvance('90'),90);
 for(const rate of [1,1.1,1.2,1.25,1.5,1.75,2,4,8,16])assert.equal(C.normalizePlaybackRate(rate),rate);
 assert.equal(C.normalizePlaybackRate(3),1);
});
test('90 percent selection leaves a real margin without changing media state',()=>{
 for(const position of [0,89,90,90.999])assert.equal(C.videoAdvanceReached(video(position),90),false);
 const media=video(91);assert.equal(C.videoAdvanceReached(media,90),true);assert.equal(media.currentTime,91);assert.equal(media.ended,false);
 assert.equal(C.videoAdvanceReached(video(99.99),100),false);
 assert.equal(C.videoAdvanceReached(video(100,100,{ended:true}),100),true);
});
test('unknown duration, seeking and audio never qualify for early video switching',()=>{
 for(const duration of [0,-1,NaN,Infinity,null,'100'])assert.equal(C.videoAdvanceReached(video(91,duration),90),false);
 assert.equal(C.videoAdvanceReached(video(91,100,{seeking:true}),90),false);
 assert.equal(C.videoAdvanceReached(video(91,100,{tagName:'AUDIO'}),90),false);
 assert.equal(C.videoAdvanceReached({mediaKind:'video',currentTime:91,duration:100},90),true);
 assert.equal(C.videoAdvanceReached({mediaKind:'audio',currentTime:91,duration:100},90),false);
});

