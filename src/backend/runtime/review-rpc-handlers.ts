import type {FrontendRequest} from '../../protocol.js';
import type {TurnKey} from '../../shared/contracts.js';
import type {ImageReviewGate} from './image-review.js';

export type ImageReviewRpcRequest=Extract<FrontendRequest,{type:'vn_regenerate_image_prompt'|'vn_enrich_image_prompt'|'vn_reprepare_image_template'|'vn_image_review'}>;
export interface ReviewRpcContext {
 /** Resolve current state from the controller's operator/chat scope after input validation. */
 current:()=>{open:boolean;turn:Pick<TurnKey,'assistantMessageId'|'sourceFingerprint'>|undefined;gate:Pick<ImageReviewGate,'regenerate'|'enrich'|'reprepare'|'decide'>|undefined};
 approveHeld?:((requestId:string)=>Promise<boolean>|undefined)|undefined;
}
/** Dispatch only. Gate/batch owners retain cancellation, persistence and generation. */
export async function handleImageReviewRpc(request:ImageReviewRpcRequest,context:ReviewRpcContext):Promise<void>{
  switch(request.type){
    case "vn_regenerate_image_prompt": {
      if(typeof request.requestId!=='string'||!request.requestId||request.requestId.length>100)throw new Error('Invalid prompt selection.');
      const {open,turn,gate}=context.current();
      if(!open||!turn||turn.assistantMessageId!==request.messageId||turn.sourceFingerprint!==request.sourceFingerprint)throw new Error('This prompt belongs to an older or closed turn.');
      if(!await gate?.regenerate(request.requestId,request.edits,request.guidance))throw new Error('This prompt is already being handled or cancelled.');
      return;
    }
    case "vn_enrich_image_prompt": {
      if(typeof request.requestId!=='string'||!request.requestId||request.requestId.length>100)throw new Error('Invalid prompt selection.');
      const {open,turn,gate}=context.current();
      if(!open||!turn||turn.assistantMessageId!==request.messageId||turn.sourceFingerprint!==request.sourceFingerprint)throw new Error('This prompt belongs to an older or closed turn.');
      if(!await gate?.enrich(request.requestId,request.guidance,request.edits))throw new Error('This prompt is already being handled or cancelled.');
      return;
    }
    case "vn_reprepare_image_template": {
      if (typeof request.requestId !== "string" || request.requestId.length > 100 || typeof request.templateId !== "string") throw new Error("Invalid template selection.");
      const {open,turn,gate}=context.current();
      if (!open || !turn || turn.assistantMessageId !== request.messageId || turn.sourceFingerprint !== request.sourceFingerprint) throw new Error("This review belongs to an older or closed turn.");
      if (!(await gate?.reprepare(request.requestId, request.templateId, {
        reframe: request.reframe,
        styleId: request.styleId,
        fitToModel: request.fitToModel,
        model: request.model,
        connectionId: request.connectionId,
        manualCamera: request.manualCamera
      }))) throw new Error("This request has already been handled or cancelled.");
      return;
    }
    case "vn_image_review": {
      if (typeof request.chatId !== "string" || typeof request.requestId !== "string" || request.requestId.length > 100 || (request.action !== "generate" && request.action !== "skip")) throw new Error("Invalid image review action.");
      const {open,turn,gate}=context.current();
      if (!open || !turn || turn.assistantMessageId !== request.messageId || turn.sourceFingerprint !== request.sourceFingerprint) throw new Error("This review belongs to an older or closed turn.");
      if (!gate?.decide(request.requestId, request.action, request.edits ?? {}) && !(request.action==='generate'&&!request.edits&&await context.approveHeld?.(request.requestId))) throw new Error("This request has already been handled or cancelled. Prepare it again if needed.");
      return;
    }
  }
}
