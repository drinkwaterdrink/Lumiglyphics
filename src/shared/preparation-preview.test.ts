import {test,expect} from 'bun:test';
import {NarrativePreviewSchema,previewCursorForTurn} from './preparation-preview.js';
const preview={type:'vn_narrative_preview' as const,chatId:'c',messageId:'m',swipeId:0,sourceFingerprint:'fingerprint',sessionId:'session',paragraphs:['First','Second']};
test('preparation preview is bounded and scoped to a view session',()=>{
 expect(NarrativePreviewSchema.safeParse(preview).success).toBe(true);
 expect(NarrativePreviewSchema.safeParse({...preview,sessionId:''}).success).toBe(false);
 expect(NarrativePreviewSchema.safeParse({...preview,paragraphs:Array(257).fill('text')}).success).toBe(false);
 expect(NarrativePreviewSchema.safeParse({...preview,paragraphs:['x'.repeat(20001)]}).success).toBe(false);
});
test('preview position transfers only to the exact source and exact paragraph sequence',()=>{
 expect(previewCursorForTurn(preview,1,preview)).toBe(1);
 for(const changed of [{messageId:'new'},{chatId:'other'},{swipeId:1},{sourceFingerprint:'edited'},{paragraphs:['First','changed']}])expect(previewCursorForTurn(preview,1,{...preview,...changed})).toBeNull();
 expect(previewCursorForTurn(preview,99,preview)).toBe(1);
});
