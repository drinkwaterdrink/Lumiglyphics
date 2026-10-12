import { z } from 'zod';
import { TurnKeySchema } from './contracts.js';
const id=z.string().trim().min(1).max(256);
export const PresentationAnchorSchema=z.object({key:TurnKeySchema,paragraphIndex:z.number().int().nonnegative()}).strict();
export const EvidenceSourceSchema=z.object({provider:z.enum(['story','card','manual','lumibooks','warp','simtracker','lumiscript']),recordId:id,chatId:id,messageId:id.optional(),sourceFingerprint:id.optional(),observedAt:z.string().max(64)}).strict();
export const EntityFactSchema=z.object({id,entityId:id,field:z.string().min(1).max(64),value:z.string().max(1200),visibility:z.enum(['observed','private','unclassified']),source:EvidenceSourceSchema,revealedAt:PresentationAnchorSchema.optional()}).strict();
export const PresentationEntitySchema=z.object({id,kind:z.enum(['npc','place','object']),name:id,aliases:z.array(id).max(12),firstParagraph:z.number().int().nonnegative(),legacyCharacterId:id.optional(),facts:z.array(EntityFactSchema).max(128)}).strict();
export const PresentationStateSchema=z.object({appearance:z.string().max(1200).optional(),outfit:z.string().max(1200).optional(),condition:z.string().max(1200).optional(),owner:z.string().max(256).optional(),location:z.string().max(256).optional(),presence:z.enum(['present','absent']).optional()}).strict();
export const EntityStateDeltaSchema=z.object({entityId:id,at:PresentationAnchorSchema,changes:PresentationStateSchema.partial().extend({appearance:z.string().max(1200).nullable().optional(),outfit:z.string().max(1200).nullable().optional(),condition:z.string().max(1200).nullable().optional(),owner:z.string().max(256).nullable().optional(),location:z.string().max(256).nullable().optional(),presence:z.enum(['present','absent']).nullable().optional()})}).strict();
export const ReaderEntitySchema=PresentationEntitySchema.omit({facts:true}).extend({facts:z.array(EntityFactSchema.extend({visibility:z.literal('observed')})).max(128)});
export const PresentationSnapshotSchema=z.object({at:PresentationAnchorSchema,locationId:id.nullable(),presentEntityIds:z.array(id).max(32),speakerEntityId:id.nullable(),drawableEntityId:id.nullable(),stateByEntity:z.record(id,PresentationStateSchema),entities:z.array(ReaderEntitySchema).max(32)}).strict();
export const ReaderPresentationSchema=z.object({version:z.literal(1),snapshots:z.array(PresentationSnapshotSchema).max(10000)}).strict();
export type PresentationAnchor=z.infer<typeof PresentationAnchorSchema>;
export type EvidenceSource=z.infer<typeof EvidenceSourceSchema>;
export type EntityFact=z.infer<typeof EntityFactSchema>;
export type PresentationEntity=z.infer<typeof PresentationEntitySchema>;
export type PresentationState=z.infer<typeof PresentationStateSchema>;
export type EntityStateDelta=z.infer<typeof EntityStateDeltaSchema>;
export type PresentationSnapshot=z.infer<typeof PresentationSnapshotSchema>;
export type ReaderPresentation=z.infer<typeof ReaderPresentationSchema>;
export function samePresentationTurn(a:PresentationAnchor['key'],b:PresentationAnchor['key']):boolean {
  return a.chatId===b.chatId && a.assistantMessageId===b.assistantMessageId && a.swipeId===b.swipeId && a.sourceFingerprint===b.sourceFingerprint && a.revision===b.revision;
}
