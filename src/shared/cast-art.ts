import {z} from 'zod';
const id=z.string().trim().min(1).max(256);
export const CastArtVariantSchema=z.object({
 id,imageId:id,requestFingerprint:id,appearanceFingerprint:id,description:z.string().max(4000),
 approved:z.literal(true),createdAt:z.string().max(64)
}).strict();
export const CastArtRecordSchema=z.object({
 entityId:id,name:id,artRevision:z.number().int().nonnegative(),
 description:z.string().max(4000),preferredVariantId:id.nullable().default(null),
 variants:z.array(CastArtVariantSchema).max(8)
}).strict();
export const CastArtLibrarySchema=z.object({version:z.literal(1),characters:z.array(CastArtRecordSchema).max(128)}).strict();
export type CastArtLibrary=z.infer<typeof CastArtLibrarySchema>;
export type CastArtRecord=z.infer<typeof CastArtRecordSchema>;
export type CastArtVariant=z.infer<typeof CastArtVariantSchema>;
export const CastArtRequestSchema=z.object({
 type:z.literal('vn_cast_art'),version:z.literal(1),chatId:id,requestId:id,
 action:z.enum(['list','select','forget','reset']),characterId:id.optional(),variantId:id.optional()
}).strict().superRefine((value,ctx)=>{
 if((value.action==='select'||value.action==='forget')&&!value.characterId)ctx.addIssue({code:'custom',path:['characterId'],message:'Choose a character.'});
 if(value.action==='select'&&!value.variantId)ctx.addIssue({code:'custom',path:['variantId'],message:'Choose a variant.'});
});
export type CastArtAction=Pick<z.infer<typeof CastArtRequestSchema>,'action'|'characterId'|'variantId'>;
