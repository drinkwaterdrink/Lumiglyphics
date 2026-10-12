import {z} from 'zod';

const id=z.string().trim().min(1).max(256);
export const StageAssetRoleSchema=z.enum(['scene','background','portrait']);
export type StageAssetRole=z.infer<typeof StageAssetRoleSchema>;
export const LocationArtVariantSchema=z.object({
 id,imageId:id,requestFingerprint:id,environmentFingerprint:id,
 approved:z.literal(true),createdAt:z.string().max(64)
}).strict();
export const LocationArtRecordSchema=z.object({
 entityId:id,name:id,artRevision:z.number().int().nonnegative(),
 description:z.string().max(4000),preferredVariantId:id.nullable().default(null),
 variants:z.array(LocationArtVariantSchema).max(8)
}).strict();
export const LocationArtLibrarySchema=z.object({version:z.literal(1),locations:z.array(LocationArtRecordSchema).max(128)}).strict();
export type LocationArtLibrary=z.infer<typeof LocationArtLibrarySchema>;
export type LocationArtRecord=z.infer<typeof LocationArtRecordSchema>;
export type LocationArtVariant=z.infer<typeof LocationArtVariantSchema>;
export const LocationArtRequestSchema=z.object({
 type:z.literal('vn_location_art'),version:z.literal(1),chatId:id,requestId:id,
 action:z.enum(['list','select','forget','reset']),locationId:id.optional(),variantId:id.optional()
}).strict().superRefine((value,ctx)=>{
 if((value.action==='select'||value.action==='forget')&&!value.locationId)ctx.addIssue({code:'custom',path:['locationId'],message:'Choose a location.'});
 if(value.action==='select'&&!value.variantId)ctx.addIssue({code:'custom',path:['variantId'],message:'Choose a variant.'});
});
export type LocationArtAction=Pick<z.infer<typeof LocationArtRequestSchema>,'action'|'locationId'|'variantId'>;
