import {z} from 'zod';
const id=z.string().trim().min(1).max(256);
const outfitShape={id,name:z.string().trim().min(1).max(100),description:z.string().trim().min(1).max(1000)};
const setupShape={appearance:z.string().trim().min(1).max(2000),aliases:z.array(z.string().trim().min(1).max(160)).max(16).default([]),defaultOutfitId:id.nullable().default(null)};
const validateSetup=(value:{outfits:Array<{id:string}>,defaultOutfitId:string|null},ctx:z.RefinementCtx)=>{
 if(new Set(value.outfits.map(o=>o.id)).size!==value.outfits.length)ctx.addIssue({code:'custom',path:['outfits'],message:'Outfit IDs must be distinct.'});
 if(value.defaultOutfitId&&!value.outfits.some(o=>o.id===value.defaultOutfitId))ctx.addIssue({code:'custom',path:['defaultOutfitId'],message:'Choose an existing outfit.'});
};
export const CastSetupInputSchema=z.object({...setupShape,outfits:z.array(z.object(outfitShape).strict()).max(7).default([])}).strict().superRefine(validateSetup);
export const CastSetupSchema=z.object({...setupShape,outfits:z.array(z.object({...outfitShape,imageId:id.optional(),imageAppearance:z.string().max(2000).optional(),imageAttire:z.string().max(1000).optional()}).strict()).max(7).default([]),imageId:id.optional(),imageAppearance:z.string().max(2000).optional()}).strict().superRefine(validateSetup);
export type CastSetup=z.infer<typeof CastSetupSchema>;
export type CastSetupInput=z.infer<typeof CastSetupInputSchema>;
export function setupAppearance(setup:CastSetup):string{return [setup.appearance,setup.outfits.find(o=>o.id===setup.defaultOutfitId)?.description].filter(Boolean).join(', ');}
export const CastArtVariantSchema=z.object({
 id,imageId:id,requestFingerprint:id,appearanceFingerprint:id,description:z.string().max(4000),
 displayImageId:id.optional(),approved:z.literal(true),createdAt:z.string().max(64)
}).strict();
export const CastArtRecordSchema=z.object({
 entityId:id,name:id,artRevision:z.number().int().nonnegative(),
 description:z.string().max(4000),preferredVariantId:id.nullable().default(null),
 variants:z.array(CastArtVariantSchema).max(8)
 ,setup:CastSetupSchema.optional()
}).strict();
export const CastArtLibrarySchema=z.object({version:z.literal(1),characters:z.array(CastArtRecordSchema).max(128)}).strict();
export type CastArtLibrary=z.infer<typeof CastArtLibrarySchema>;
export type CastArtRecord=z.infer<typeof CastArtRecordSchema>;
export type CastArtVariant=z.infer<typeof CastArtVariantSchema>;
export const CastArtRequestSchema=z.object({
 type:z.literal('vn_cast_art'),version:z.literal(1),chatId:id,requestId:id,
 action:z.enum(['list','scan','select','forget','reset','supply','restore','setup','clear_setup','setup_supply','setup_restore']),characterId:id.optional(),variantId:id.optional(),imageId:id.optional(),outfitId:id.optional(),name:z.string().trim().min(1).max(160).optional(),setup:CastSetupInputSchema.optional()
}).strict().superRefine((value,ctx)=>{
 if((['select','forget','supply','restore'].includes(value.action))&&!value.characterId)ctx.addIssue({code:'custom',path:['characterId'],message:'Choose a character.'});
 if(['select','supply','restore'].includes(value.action)&&!value.variantId)ctx.addIssue({code:'custom',path:['variantId'],message:'Choose a variant.'});
 if(value.action==='supply'&&!value.imageId)ctx.addIssue({code:'custom',path:['imageId'],message:'Choose artwork.'});
 if(['clear_setup','setup_supply','setup_restore'].includes(value.action)&&!value.characterId)ctx.addIssue({code:'custom',path:['characterId'],message:'Choose a character.'});
 if(value.action==='setup'&&(!value.name||!value.setup))ctx.addIssue({code:'custom',path:['setup'],message:'Enter a name and appearance.'});
 if(value.action==='setup_supply'&&!value.imageId)ctx.addIssue({code:'custom',path:['imageId'],message:'Choose artwork.'});
});
export type CastArtAction=Pick<z.infer<typeof CastArtRequestSchema>,'action'|'characterId'|'variantId'|'imageId'|'outfitId'|'name'|'setup'>;

export const CastGalleryRequestSchema=z.object({type:z.literal('vn_cast_gallery'),chatId:id,requestId:id,offset:z.number().int().min(0).max(10000)}).strict();
export const CastGallerySchema=z.object({offset:z.number().int().nonnegative(),total:z.number().int().nonnegative(),images:z.array(z.object({id,name:z.string().max(256),url:z.string().max(1024).refine(v=>v.startsWith('/')&&!v.startsWith('//')&&!v.includes('\\'))}).strict()).max(12)}).strict();
export type CastGallery=z.infer<typeof CastGallerySchema>;

export const CastContextScanSchema=z.object({candidates:z.array(z.object({name:z.string().min(1).max(160),source:z.string().max(256),setup:CastSetupInputSchema}).strict()).max(32),notice:z.string().max(1000)}).strict();
export type CastContextScan=z.infer<typeof CastContextScanSchema>;
