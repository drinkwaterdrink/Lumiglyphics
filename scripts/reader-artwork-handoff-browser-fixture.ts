import './image-review-browser-fixture.js';
import {CastStage} from '../src/frontend/stage/cast-stage.js';
const root=document.createElement('div');root.id='handoff-cast';root.style.cssText='position:relative;width:100%;height:450px;font:14px system-ui';document.body.append(root);
const cast=new CastStage(root);cast.setEnabled(true);
const turn:any={chatId:'handoff',messageId:'m',sourceFingerprint:'12345678',swipeId:0,revision:0,speaker:'Mira',paragraphs:['Mira waits.'],paragraphSpeakers:['Mira'],choices:[],status:'ready',assets:[]};
const set=(portrait:any)=>{turn.assets=[{jobId:'bg',paragraphIndex:0,status:'browser_ready',imageUrl:'/media/background',stageAsset:{role:'background',sceneId:'s'}},{jobId:'portrait',paragraphIndex:0,status:'generated',...portrait,stageAsset:{role:'portrait',sceneId:'s',character:'Mira',...portrait.stageAsset}}];cast.set(structuredClone(turn),0);};
Object.assign(window,{handoff:{cast,set,turn}});
