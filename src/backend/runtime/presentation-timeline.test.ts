import { expect, test } from 'bun:test';
import { buildPresentationTimeline } from './presentation-timeline.js';
import { EntityStateDeltaSchema } from '../../shared/presentation-entities.js';
const key={chatId:'chat',assistantMessageId:'message',swipeId:0,sourceFingerprint:'12345678',revision:0};
const source={provider:'story' as const,recordId:'message',chatId:'chat',messageId:'message',sourceFingerprint:key.sourceFingerprint,observedAt:'2026-10-11T00:00:00Z'};
const entity={id:'npc:mira',kind:'npc' as const,name:'Mira',aliases:[],firstParagraph:0,facts:[
  {id:'seen',entityId:'npc:mira',field:'appearance',value:'silver hair',visibility:'observed' as const,source,revealedAt:{key,paragraphIndex:0}},
  {id:'secret',entityId:'npc:mira',field:'motive',value:'secret betrayal',visibility:'private' as const,source},
]};
test('state changes reveal on their paragraph and backward reading restores old state',()=>{
 const snapshots=buildPresentationTimeline({key,paragraphCount:10,entities:[entity],baseline:{'npc:mira':{outfit:'coat',presence:'present'}},deltas:[{entityId:'npc:mira',at:{key,paragraphIndex:8},changes:{outfit:'uniform'}}],beats:[]});
 expect(snapshots[7]?.stateByEntity['npc:mira']?.outfit).toBe('coat');
 expect(snapshots[8]?.stateByEntity['npc:mira']?.outfit).toBe('uniform');
 snapshots[8]!.stateByEntity['npc:mira']!.outfit='mutated';
 expect(snapshots[7]?.stateByEntity['npc:mira']?.outfit).toBe('coat');
 expect(JSON.stringify(snapshots)).not.toContain('secret betrayal');
});
test('offscreen speaker remains distinct from the drawable subject and present cast',()=>{
 const offscreen={...entity,id:'npc:radio',name:'Radio',facts:[]};
 const snapshots=buildPresentationTimeline({key,paragraphCount:1,entities:[entity,offscreen],baseline:{'npc:mira':{presence:'present'},'npc:radio':{presence:'absent'}},deltas:[],beats:[{paragraphIndex:0,speakerEntityId:'npc:radio',drawableEntityId:'npc:mira',locationId:null}]});
 expect(snapshots[0]?.speakerEntityId).toBe('npc:radio');
 expect(snapshots[0]?.drawableEntityId).toBe('npc:mira');
 expect(snapshots[0]?.presentEntityIds).toEqual(['npc:mira']);
});
test('stale or mismatched deltas and evidence cannot alter this turn',()=>{
 const foreign={...entity,facts:[{...entity.facts[0]!,source:{...source,chatId:'other'}}]};
 const snapshots=buildPresentationTimeline({key,paragraphCount:1,entities:[foreign],baseline:{},beats:[],deltas:[{entityId:entity.id,at:{key:{...key,swipeId:1},paragraphIndex:0},changes:{outfit:'future'}}]});
 expect(snapshots[0]?.stateByEntity[entity.id]?.outfit).toBeUndefined();
 expect(snapshots[0]?.entities[0]?.facts).toEqual([]);
 expect(EntityStateDeltaSchema.safeParse({entityId:entity.id,at:{key,paragraphIndex:0},changes:{name:'new identity'}}).success).toBe(false);
});
test('future aliases and appearances stay unavailable before first mention',()=>{
 const future={...entity,firstParagraph:1,facts:[{...entity.facts[0]!,revealedAt:{key,paragraphIndex:1}}]};
 const snapshots=buildPresentationTimeline({key,paragraphCount:2,entities:[future],baseline:{},deltas:[],beats:[]});
 expect(snapshots[0]?.entities).toEqual([]);
 expect(snapshots[1]?.entities[0]?.facts[0]?.value).toBe('silver hair');
});
