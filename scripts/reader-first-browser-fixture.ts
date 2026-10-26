/** UI-only sample host. Uses the shipped controller and tools, not the concept UI.
 * No live backend, credentials, generation, or durable story storage. */
import './host-lifecycle-fixture.js';
import { normalizeConfig } from '../src/config.js';
import { normalizeStoryDocuments } from '../src/shared/story-documents.js';
import { buildPresentationTimeline } from '../src/backend/runtime/presentation-timeline.js';
import type { TurnView, FrontendRequest } from '../src/protocol.js';

const f = (window as any).hostFixture;
const key = {chatId:'A', assistantMessageId:'m', swipeId:0, sourceFingerprint:'abcdef12345678', revision:0};
const paragraphs = [
  'Mira rests one hand on the observatory railing. Below, the harbor lights drift into the evening mist. “There’s still time,” she says. “We don’t have to decide everything tonight.”',
  'The brass telescope points toward an empty patch of sky. Beside it, the folded note reads: Keep the eastern lantern burning. Mira waits while you read it.',
  'Beyond the glass, the first star appears. Mira turns toward you, a quiet question in her expression.',
];
const entities = [
  {id:'mira',kind:'npc' as const,name:'Mira',aliases:[],firstParagraph:0,facts:[]},
  {id:'observatory',kind:'place' as const,name:'observatory',aliases:[],firstParagraph:0,facts:[]},
  {id:'note',kind:'object' as const,name:'folded note',aliases:[],firstParagraph:1,facts:[]},
];
const view: TurnView = f.turn('A',0,{
  speaker:'Mira', paragraphs, paragraphSpeakers:['Mira','Narrator','Mira'],
  presentation:{version:1,snapshots:buildPresentationTimeline({key,paragraphCount:3,entities,baseline:{},deltas:[],beats:[]}),
    documents:normalizeStoryDocuments([{name:'folded note',kind:'note',paragraphIndex:1,sections:[{paragraphIndex:1,text:'Keep the eastern lantern burning.',evidence:paragraphs[1]}]}],paragraphs.map(text=>({text})))},
  assets:[{jobId:'sample-art',cueId:'sample-cue',paragraphIndex:0,status:'browser_ready',imageId:'reader-first-sample',imageUrl:'/sample-art.jpg'}],
  imageRequests:[{requestId:'sample-review',jobId:'sample-art',paragraphIndex:0,state:'review',prompt:'An observatory above the harbor, a brass telescope in the last light of evening.',negativePrompt:'text, watermark',model:'sample-model',provider:'nanogpt',connectionId:'sample-images',parameters:{seed:42},referenceSummary:'Sample UI data · no live provider',createdAt:'2026-10-24T00:00:00Z'}],
});
Object.assign(f.config,normalizeConfig({...f.config,apertureMode:true,themePreset:'paper-novel',tooltips:{enabled:true,linking:'all-known'},readerPreferences:{adjustableSheetEnabled:true,sheetSize:'reading',layout:'overlay',backgroundOpacity:.94}}));
// Only service responses needed to exercise navigation/settings. Paid operations
// remain recorded intents; the fixture never sends them to a provider.
const push = f.sent.push.bind(f.sent);
f.sent.push = (...messages: FrontendRequest[]) => {
  const result = push(...messages);
  for (const request of messages) queueMicrotask(() => {
    if(request.type==='vn_set_config') {
      Object.assign(f.config,normalizeConfig({...f.config,...request.patch}));
      f.receive({type:'vn_config',config:f.config,requestId:request.requestId});
    }
    if(request.type==='vn_image_library') f.receive({type:'vn_image_library',chatId:'A',requestId:request.requestId,page:{entries:[],replies:[{key,messageNumber:1,speaker:'Mira',paragraphs:paragraphs.slice(0,f.stage().getState().currentParagraphIndex+1).map((text,index)=>({text,index,speaker:'Mira'})),truncated:false}],nextCursor:null,notice:'UI fixture: sample passages only; no live archive.'}});
  });
  return result;
};
const chat = document.createElement('main');
chat.innerHTML = '<h1>Lumiglyphics · production UI fixture</h1><p>Sample content, no live model or persistent story data. This runs the real extension controller, Settings, Story, Artwork and History.</p><button type="button">Reopen reader</button>';
Object.assign(chat.style,{padding:'32px',font:'16px/1.6 system-ui',color:'#22302d',background:'#f2f1eb',minHeight:'100vh',boxSizing:'border-box'});
chat.querySelector('button')!.onclick=()=>{f.open();f.state(view);};document.body.prepend(chat);
f.state(view);f.open();f.state(view);
Object.assign(window,{readerFirstFixture:{view,config:f.config,sent:f.sent,stage:()=>f.stage()}});
