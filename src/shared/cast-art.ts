import {z} from 'zod';
const id=z.string().trim().min(1).max(256);
export const CastArtVariantSchema=z.object({
 id,imageId:id,requestFingerprint:id,appearanceFingerprint:id,description:z.string().max(4000),
 displayImageId:id.optional(),approved:z.literal(true),createdAt:z.string().max(64)
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
 action:z.enum(['list','select','forget','reset','supply','restore']),characterId:id.optional(),variantId:id.optional(),imageId:id.optional()
}).strict().superRefine((value,ctx)=>{
 if((['select','forget','supply','restore'].includes(value.action))&&!value.characterId)ctx.addIssue({code:'custom',path:['characterId'],message:'Choose a character.'});
 if(['select','supply','restore'].includes(value.action)&&!value.variantId)ctx.addIssue({code:'custom',path:['variantId'],message:'Choose a variant.'});
 if(value.action==='supply'&&!value.imageId)ctx.addIssue({code:'custom',path:['imageId'],message:'Choose artwork.'});
});
export type CastArtAction=Pick<z.infer<typeof CastArtRequestSchema>,'action'|'characterId'|'variantId'|'imageId'>;

export const CastGalleryRequestSchema=z.object({type:z.literal('vn_cast_gallery'),chatId:id,requestId:id,offset:z.number().int().min(0).max(10000)}).strict();
export const CastGallerySchema=z.object({offset:z.number().int().nonnegative(),total:z.number().int().nonnegative(),images:z.array(z.object({id,name:z.string().max(256),url:z.string().max(1024).refine(v=>v.startsWith('/')&&!v.startsWith('//')&&!v.includes('\\'))}).strict()).max(12)}).strict();
export type CastGallery=z.infer<typeof CastGallerySchema>;
