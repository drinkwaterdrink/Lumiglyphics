import {expect,test} from 'bun:test';
import {handleImageReviewRpc,type ImageReviewRpcRequest,type ReviewRpcContext} from './review-rpc-handlers';
const scope={chatId:'chat',messageId:'message',sourceFingerprint:'fingerprint',requestId:'request'};
const requests:ImageReviewRpcRequest[]=[{...scope,type:'vn_regenerate_image_prompt'},{...scope,type:'vn_enrich_image_prompt'},{...scope,type:'vn_reprepare_image_template',templateId:'portrait'},{...scope,type:'vn_image_review',action:'generate'}];
function harness(){
 const calls:any[]=[];let reads=0;
 const state={open:true,turn:{assistantMessageId:'message',sourceFingerprint:'fingerprint'},gate:{regenerate:async(...args:any[])=>{calls.push(['regenerate',...args]);return true;},enrich:async(...args:any[])=>{calls.push(['enrich',...args]);return true;},reprepare:async(...args:any[])=>{calls.push(['reprepare',...args]);return true;},decide:(...args:any[])=>{calls.push(['decide',...args]);return true;}}};
 const context:ReviewRpcContext={current:()=>{reads++;return state;},approveHeld:async id=>{calls.push(['held',id]);return true;}};
 return {state,context,calls,reads:()=>reads};
}
for(const request of requests)for(const boundary of ['closed','no turn','message','fingerprint'])test(`${request.type} rejects ${boundary} before invoking the gate`,async()=>{
 const h=harness();if(boundary==='closed')h.state.open=false;if(boundary==='no turn')(h.state as any).turn=undefined;if(boundary==='message')h.state.turn.assistantMessageId='other';if(boundary==='fingerprint')h.state.turn.sourceFingerprint='other';
 await expect(handleImageReviewRpc(request,h.context)).rejects.toThrow(/older or closed turn/);expect(h.calls).toEqual([]);
});
test('prompt routes forward the exact selected edits and guidance in their original argument order',async()=>{
 const h=harness(),edits={prompt:'Keep all these exact details.',negativePrompt:'unchanged negative'};
 await handleImageReviewRpc({...scope,type:'vn_regenerate_image_prompt',edits,guidance:'warmer light'},h.context);
 await handleImageReviewRpc({...scope,type:'vn_enrich_image_prompt',edits,guidance:'longer hair'},h.context);
 expect(h.calls).toEqual([['regenerate','request',edits,'warmer light'],['enrich','request','longer hair',edits]]);expect(h.calls[0][2]).toBe(edits);
});
test('template preparation forwards every rebuild option unchanged',async()=>{
 const h=harness();const request:any={...scope,type:'vn_reprepare_image_template',templateId:'portrait',reframe:true,styleId:'style',fitToModel:true,model:'model',connectionId:'connection',manualCamera:{shotScale:'close-up'}};
 await handleImageReviewRpc(request,h.context);
 expect(h.calls).toEqual([['reprepare','request','portrait',{reframe:true,styleId:'style',fitToModel:true,model:'model',connectionId:'connection',manualCamera:request.manualCamera}]]);
});
test('an accepted review never also approves a held request',async()=>{const h=harness();await handleImageReviewRpc(requests[3]!,h.context);expect(h.calls).toEqual([['decide','request','generate',{}]]);});
test('only unedited Generate can fall back to the current held-request owner',async()=>{
 for(const request of [{...scope,type:'vn_image_review',action:'generate'},{...scope,type:'vn_image_review',action:'skip'},{...scope,type:'vn_image_review',action:'generate',edits:{}}] as ImageReviewRpcRequest[]){
  const h=harness();h.state.gate.decide=(...args:any[])=>{h.calls.push(['decide',...args]);return false;};
  if((request as any).action==='generate'&&!(request as any).edits){await handleImageReviewRpc(request,h.context);expect(h.calls.at(-1)).toEqual(['held','request']);}
  else{await expect(handleImageReviewRpc(request,h.context)).rejects.toThrow(/already been handled/);expect(h.calls).toHaveLength(1);}
 }
});
test('missing gates and false results retain the handled/cancelled error',async()=>{
 for(const request of requests){const h=harness();(h.state as any).gate=undefined;h.context.approveHeld=undefined;await expect(handleImageReviewRpc(request,h.context)).rejects.toThrow(/handled or cancelled/);expect(h.calls).toEqual([]);}
});
test('invalid selections fail before reading operator-owned state',async()=>{
 for(const request of [{...requests[0],requestId:''},{...requests[1],requestId:'x'.repeat(101)},{...requests[2],templateId:7},{...requests[3],action:'invalid'},{...requests[3],chatId:null}]){const h=harness();await expect(handleImageReviewRpc(request as any,h.context)).rejects.toThrow(/Invalid/);expect(h.reads()).toBe(0);expect(h.calls).toEqual([]);}
});
test('gate failures propagate without attempting a second approval',async()=>{const h=harness();h.state.gate.decide=()=>{throw new Error('Keep selected draft');};await expect(handleImageReviewRpc(requests[3]!,h.context)).rejects.toThrow('Keep selected draft');expect(h.calls).toEqual([]);});

test('false gate results never silently succeed or generate a second request',async()=>{
 for(const request of requests){const h=harness();h.state.gate.regenerate=async()=>false;h.state.gate.enrich=async()=>false;h.state.gate.reprepare=async()=>false;h.state.gate.decide=()=>false;h.context.approveHeld=async()=>false;await expect(handleImageReviewRpc(request,h.context)).rejects.toThrow(/handled or cancelled/);}
});
