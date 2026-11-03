import './host-lifecycle-fixture.ts';
import {ImageUsageLedger} from '../src/backend/runtime/image-usage.js';
const ledger=new ImageUsageLedger(),f=(window as any).hostFixture;
const turn=f.turn('A',0,{paragraphs:['Mira in a quiet library.'],assets:[{jobId:'job',cueId:'cue',paragraphIndex:0,status:'generating'}],imageRequests:[{requestId:'request',jobId:'job',paragraphIndex:0,state:'prepared',prompt:'Mira at the library.',negativePrompt:'blur',model:'model',provider:'fixture',connectionId:'connection',parameters:{},referenceSummary:'No reference',createdAt:'2026-11-02T00:00:00Z'}]});
const key={chatId:'A',assistantMessageId:turn.messageId,swipeId:0,sourceFingerprint:turn.sourceFingerprint,revision:0};
Object.assign(window,{activityFixture:{turn,key,emit(kind:any){const activity=ledger.record('fixture',{key,jobId:'job',requestId:'request',...(kind.startsWith('provider-')||kind==='cancel-unknown'?{attemptId:'attempt-1'}:{}),kind});f.receive({type:'vn_image_activity',chatId:'A',activity});return activity;}}});
