import {AudioEngine} from '../src/frontend/stage/audio-engine.js';
import {resolveSceneAmbient} from '../src/shared/scene-atmosphere.js';
const audio:Array<{kind:string;src?:string}>=[];
AudioEngine.prototype.playBgm=function(src){audio.push({kind:'play',src});};
AudioEngine.prototype.stopBgm=function(){audio.push({kind:'stop'});};
await import('./host-lifecycle-fixture.js');
Object.assign(window,{atmosphereFixture:{audio,resolveSceneAmbient}});
