import './host-lifecycle-fixture.js';
import {AudioEngine} from '../src/frontend/stage/audio-engine.js';
const state={factor:1,calls:[] as Array<{kind:string;factor:number;volume:number;src?:string}>};
const attenuation=AudioEngine.prototype.setBgmAttenuation;
AudioEngine.prototype.setBgmAttenuation=function(factor){state.factor=factor;state.calls.push({kind:'gain',factor,volume:this.getBgmVolume()});attenuation.call(this,factor);};
const volume=AudioEngine.prototype.setBgmVolume;
AudioEngine.prototype.setBgmVolume=function(value){volume.call(this,value);state.calls.push({kind:'volume',factor:state.factor,volume:this.getBgmVolume()});};
// Playback is observed, not sent to a browser/media provider. Engine fades use separate deterministic unit tests.
AudioEngine.prototype.playBgm=function(src){state.calls.push({kind:'bgm',src,factor:state.factor,volume:this.getBgmVolume()});};
AudioEngine.prototype.playSfx=function(src){state.calls.push({kind:'sfx',src,factor:state.factor,volume:this.getSfxVolume()});};
(window as any).musicFixture=state;
