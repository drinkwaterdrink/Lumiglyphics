import {z} from 'zod';
export const NarrativePreviewSchema=z.object({
 type:z.literal('vn_narrative_preview'),chatId:z.string().min(1).max(256),messageId:z.string().min(1).max(256),
 swipeId:z.number().int().nonnegative(),sourceFingerprint:z.string().min(1).max(256),sessionId:z.string().min(1).max(256),
 paragraphs:z.array(z.string().min(1).max(20000)).min(1).max(256),
}).strict().refine(value=>value.paragraphs.reduce((size,text)=>size+text.length,0)<=200000);
export type NarrativePreview=z.infer<typeof NarrativePreviewSchema>;
type PreviewSource=Pick<NarrativePreview,'chatId'|'messageId'|'swipeId'|'sourceFingerprint'|'paragraphs'>;
/** Temporary reading never invents a TurnView, revision, or saved read acknowledgment. */
export function previewCursorForTurn(preview:PreviewSource,index:number,turn:PreviewSource):number|null {
 if(preview.chatId!==turn.chatId||preview.messageId!==turn.messageId||preview.swipeId!==turn.swipeId||preview.sourceFingerprint!==turn.sourceFingerprint||preview.paragraphs.length!==turn.paragraphs.length||preview.paragraphs.some((text,i)=>text!==turn.paragraphs[i]))return null;
 return Math.max(0,Math.min(Number.isFinite(index)?Math.floor(index):0,turn.paragraphs.length-1));
}
