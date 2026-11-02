import {z} from 'zod';
import {CharacterDNASchema,type CharacterDNA} from './character-dna.js';
export const DnaFieldSchema=z.enum(['build.age','build.gender','build.species','build.height','build.bodyType','build.bust','build.hipsGlutes','build.skinTone','hair.color','hair.length','hair.style','eyes.color','eyes.shape','faceFeatures','demeanor','signatureOutfit','activeOutfit','distinguishingFeatures','colorPalette']);
export type DnaField=z.infer<typeof DnaFieldSchema>;
export const DNA_FIELDS=DnaFieldSchema.options;
export const DNA_FIELD_LABELS:Record<DnaField,string>={
 'build.age':'Age','build.gender':'Gender','build.species':'Species','build.height':'Height','build.bodyType':'Body type','build.bust':'Chest / bust','build.hipsGlutes':'Hips, waist and glutes','build.skinTone':'Skin tone',
 'hair.color':'Hair color','hair.length':'Hair length','hair.style':'Hair style','eyes.color':'Eye color','eyes.shape':'Eye shape','faceFeatures':'Facial structure','demeanor':'Demeanor and posture','signatureOutfit':'Signature outfit','activeOutfit':'Current scene attire','distinguishingFeatures':'Distinguishing features','colorPalette':'Color palette'
};
export const DnaChangeSchema=z.object({path:DnaFieldSchema,value:z.union([z.string().trim().min(1).max(1000),z.array(z.string().trim().min(1).max(200)).max(24)]),classification:z.enum(['evidence','inferred','generated']),sourceRefs:z.array(z.string().max(160)).max(8)}).strict();
export type DnaChange=z.infer<typeof DnaChangeSchema>;
export type DnaEvidence={id:string;source:string;text:string;kind:'context'|'reference'};
export type DnaSourceStatus={source:string;status:string};
export type DnaProposal={id:string;characterId:string;baseRevision:number;changes:DnaChange[];evidence:DnaEvidence[];statuses:DnaSourceStatus[]};
const envelope={type:z.literal('vn_character_dna'),chatId:z.string().trim().min(1).max(256),requestId:z.string().min(1).max(128)};
const target={characterName:z.string().trim().min(1).max(160),characterId:z.string().trim().min(1).max(256).optional()};
export const DnaRequestSchema=z.discriminatedUnion('action',[
 z.object({...envelope,action:z.literal('list')}).strict(),
 z.object({...envelope,action:z.literal('save'),dna:CharacterDNASchema,revision:z.number().int().nonnegative()}).strict(),
 z.object({...envelope,action:z.enum(['harvest','autofill','propose']),...target,fields:z.array(DnaFieldSchema).min(1).max(19).optional()}).strict(),
 z.object({...envelope,action:z.literal('apply'),proposalId:z.string().min(1).max(128),fields:z.array(DnaFieldSchema).min(1).max(19)}).strict(),
 z.object({...envelope,action:z.literal('cancel')}).strict(),
 z.object({...envelope,action:z.enum(['delete','restore']),characterId:z.string().min(1).max(256),dna:CharacterDNASchema.optional(),revision:z.number().int().nonnegative()}).strict(),
 z.object({...envelope,action:z.literal('merge'),characterId:z.string().min(1).max(256),otherId:z.string().min(1).max(256),revision:z.number().int().nonnegative()}).strict()
]);
export type DnaRequest=z.infer<typeof DnaRequestSchema>;
export function dnaFieldValue(dna:CharacterDNA,path:DnaField):string|string[]|undefined{const[a,b]=path.split('.');return b?(dna as any)[a!]?.[b]:(dna as any)[a!];}
export function applyDnaChanges(base:CharacterDNA,changes:DnaChange[]):CharacterDNA{
 const next=structuredClone(base);
 for(const change of changes){const[a,b]=change.path.split('.');if(b)(next as any)[a!][b]=change.value;else(next as any)[a!]=change.value;}
 return CharacterDNASchema.parse(next);
}
