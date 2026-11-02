import type {SpeechAudioElement} from '../src/frontend/speech/controller.js';
const players:FakeAudio[]=[],requests:Array<{url:string;body:unknown}>=[];
class FakeAudio implements SpeechAudioElement {
 src='';volume=1;currentTime=0;duration=12;paused=true;ended=false;loop=false;listeners=new Map<string,Set<()=>void>>();playCalls=0;
 constructor(src=''){this.src=src;players.push(this);}
 async play(){this.paused=false;this.ended=false;this.playCalls++;}
 pause(){this.paused=true;this.emit('pause');}
 addEventListener(type:string,listener:()=>void){const set=this.listeners.get(type)??new Set();set.add(listener);this.listeners.set(type,set);}
 removeEventListener(type:string,listener:()=>void){this.listeners.get(type)?.delete(listener);}
 emit(type:string){for(const listener of [...this.listeners.get(type)??[]])listener();}
}
(window as any).Audio=FakeAudio;
const realFetch=window.fetch.bind(window);
window.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{const url=String(input);if(!url.startsWith('/api/v1/tts'))return realFetch(input,init);requests.push({url,body:typeof init?.body==='string'?JSON.parse(init.body):null});if(url.includes('/tts-connections/read-along-profile'))return new Response(JSON.stringify({id:'read-along-profile',name:'Fixture voice',provider:'test',model:'fixture',voice:'voice',updated_at:'1',default_parameters:{}}),{headers:{'Content-Type':'application/json'}});if(url.endsWith('/tts/synthesize'))return new Response(new Uint8Array([1,2,3]),{headers:{'Content-Type':'audio/mpeg'}});throw Error(`Unexpected fixture TTS endpoint: ${url}`);};
await import('./host-lifecycle-fixture.js');
Object.assign(window,{readAlongFixture:{players,requests,audio:()=>players.find(player=>player.src.startsWith('blob:'))}});
