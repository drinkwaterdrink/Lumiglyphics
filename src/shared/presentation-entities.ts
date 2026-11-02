import {StoryDocumentSchema} from './story-documents.js';
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
export const ReaderPresentationV1Schema=z.object({version:z.literal(1),snapshots:z.array(PresentationSnapshotSchema).max(10000),documents:z.array(StoryDocumentSchema).max(12).optional()}).strict();
export const MAX_PRESENTATION_BYTES=2_000_000;
export const presentationSerializedBytes=(value:unknown):number=>new TextEncoder().encode(JSON.stringify(value)).length;
export const MAX_PRESENTATION_PARAGRAPHS=10000;
export const MAX_PRESENTATION_CHANGES=MAX_PRESENTATION_PARAGRAPHS*32;
export const CompactPresentationChangeSchema=EntityStateDeltaSchema.omit({at:true}).extend({paragraphIndex:z.number().int().nonnegative()}).strict();
export const PresentationBeatSchema=z.object({paragraphIndex:z.number().int().nonnegative(),locationId:id.nullable(),speakerEntityId:id.nullable(),drawableEntityId:id.nullable()}).strict();
export const ReaderPresentationV2Schema=z.object({
  version:z.literal(2),key:TurnKeySchema,paragraphCount:z.number().int().positive(),availableThrough:z.number().int().min(-1).max(MAX_PRESENTATION_PARAGRAPHS-1),
  entities:z.array(ReaderEntitySchema).max(32),baseline:z.record(id,PresentationStateSchema),
  changes:z.array(CompactPresentationChangeSchema).max(MAX_PRESENTATION_CHANGES),beats:z.array(PresentationBeatSchema).max(MAX_PRESENTATION_PARAGRAPHS),
  documents:z.array(StoryDocumentSchema).max(12).optional(),
  warnings:z.array(z.enum(['paragraph-budget','byte-budget','entity-budget','fact-budget','change-budget'])).max(5).optional(),
}).strict().superRefine((value,ctx)=>{
  const fail=(message:string)=>ctx.addIssue({code:'custom',message});
  if(value.availableThrough>=value.paragraphCount||value.beats.length!==value.availableThrough+1)fail('Presentation coverage does not match its beat index.');
  if(value.availableThrough<value.paragraphCount-1&&!value.warnings?.some(w=>['paragraph-budget','byte-budget','change-budget'].includes(w)))fail('Limited coverage requires a diagnostic reason.');
  const entities=new Map(value.entities.map(e=>[e.id,e]));
  if(entities.size!==value.entities.length)fail('Entity ids must be unique.');
  const known=(entityId:string,at:number)=>{const e=entities.get(entityId);return !!e&&e.firstParagraph<=at;};
  const facts=new Set<string>();let total=0;
  for(const entity of value.entities){
    if(entity.firstParagraph>value.availableThrough)fail('Entity is outside available coverage.');
    for(const fact of entity.facts){
      total++;
      if(facts.has(fact.id)||fact.entityId!==entity.id||fact.source.chatId!==value.key.chatId||fact.source.messageId!==value.key.assistantMessageId||fact.source.sourceFingerprint!==value.key.sourceFingerprint||!fact.revealedAt||!samePresentationTurn(fact.revealedAt.key,value.key)||fact.revealedAt.paragraphIndex<entity.firstParagraph||fact.revealedAt.paragraphIndex>value.availableThrough)fail('Fact has invalid source or reveal identity.');
      facts.add(fact.id);
    }
  }
  if(total>128)fail('Presentation facts exceed the bounded dictionary.');
  for(const [entityId,state] of Object.entries(value.baseline))if(!entities.has(entityId)||(state.location&&!entities.has(state.location)))fail('Baseline references an unknown entity.');
  let previous=-1;
  for(const change of value.changes){
    if(change.paragraphIndex<previous||change.paragraphIndex>value.availableThrough||!known(change.entityId,change.paragraphIndex)||(change.changes.location&&!known(change.changes.location,change.paragraphIndex)))fail('State change has invalid order or entity identity.');
    previous=change.paragraphIndex;
  }
  for(const [index,beat] of value.beats.entries())if(beat.paragraphIndex!==index||[beat.locationId,beat.speakerEntityId,beat.drawableEntityId].some(entityId=>entityId!==null&&!known(entityId,index)))fail('Beat references an unrevealed entity.');
});
export const ReaderPresentationSchema=z.union([ReaderPresentationV1Schema,ReaderPresentationV2Schema]);
export type PresentationAnchor=z.infer<typeof PresentationAnchorSchema>;
export type EvidenceSource=z.infer<typeof EvidenceSourceSchema>;
export type EntityFact=z.infer<typeof EntityFactSchema>;
export type PresentationEntity=z.infer<typeof PresentationEntitySchema>;
export type PresentationState=z.infer<typeof PresentationStateSchema>;
export type EntityStateDelta=z.infer<typeof EntityStateDeltaSchema>;
export type PresentationSnapshot=z.infer<typeof PresentationSnapshotSchema>;
export type ReaderPresentation=z.infer<typeof ReaderPresentationSchema>;
export type ReaderPresentationV1=z.infer<typeof ReaderPresentationV1Schema>;
export type ReaderPresentationV2=z.infer<typeof ReaderPresentationV2Schema>;
export function samePresentationTurn(a:PresentationAnchor['key'],b:PresentationAnchor['key']):boolean {
  return a.chatId===b.chatId && a.assistantMessageId===b.assistantMessageId && a.swipeId===b.swipeId && a.sourceFingerprint===b.sourceFingerprint && a.revision===b.revision;
}
