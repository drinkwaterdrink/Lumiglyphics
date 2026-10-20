import {z} from 'zod';
import {TurnKeySchema} from './contracts.js';
const id=z.string().min(1).max(256);
export const SavedLibraryImageSchema=z.object({
 key:TurnKeySchema,imageId:id,jobId:id,paragraphIndex:z.number().int().nonnegative(),
 createdAt:z.string().max(64),excerpt:z.string().max(600),rawFingerprint:id.optional(),
 template:z.string().max(256).optional(),role:z.enum(['scene','background','portrait']).default('scene'),
 prompt:z.string().max(65000).optional(),negativePrompt:z.string().max(65000).optional(),
 model:z.string().max(256).optional(),provider:z.string().max(256).optional(),
 legacyPrevious:z.boolean().optional()
}).strict();
export const ImageLibraryArchiveSchema=z.object({version:z.literal(1),entries:z.array(SavedLibraryImageSchema).max(128),full:z.boolean().default(false),incomplete:z.boolean().optional()}).strict();
export type SavedLibraryImage=z.infer<typeof SavedLibraryImageSchema>;
export type ImageLibraryArchive=z.infer<typeof ImageLibraryArchiveSchema>;
export const ImageLibraryRequestSchema=z.object({
 type:z.literal('vn_image_library'),chatId:id,requestId:id,
 anchor:z.object({messageId:id,swipeId:z.number().int().nonnegative(),sourceFingerprint:id,paragraphIndex:z.number().int().nonnegative()}).strict(),
 mode:z.enum(['story','images']).default('images'),
 range:z.enum(['read','all']),versions:z.enum(['active','all']),includeReplaced:z.boolean(),order:z.enum(['newest','oldest']),
 role:z.enum(['all','scene','background','portrait']).default('all'),templateQuery:z.string().max(64).default(''),
 cursor:z.string().regex(/^\d{1,5}:\d{1,3}$/).optional()
}).strict();
export type ImageLibraryRequest=z.infer<typeof ImageLibraryRequestSchema>;
const url=z.string().max(2048).refine(v=>v.startsWith('/api/v1/images/')&&!v.includes('\\')&&!/[\r\n]/.test(v));
export const LibraryImageViewSchema=SavedLibraryImageSchema.extend({
 messageNumber:z.number().int().positive().default(1),
 available:z.boolean(),thumbnailUrl:url.optional(),imageUrl:url.optional(),versionLabel:z.enum(['current','replaced','alternate'])
}).strict();
export const LibraryReplySchema=z.object({key:TurnKeySchema,messageNumber:z.number().int().positive(),speaker:z.string().max(256),versionLabel:z.enum(['current','alternate']).default('current'),paragraphs:z.array(z.object({index:z.number().int().nonnegative(),text:z.string().max(12000),speaker:z.string().max(256)}).strict()).max(256),truncated:z.boolean()}).strict();
export const ImageLibraryPageSchema=z.object({entries:z.array(LibraryImageViewSchema).max(24),replies:z.array(LibraryReplySchema).max(24).default([]),nextCursor:z.string().nullable(),notice:z.string().max(1000)}).strict();
export type LibraryImageView=z.infer<typeof LibraryImageViewSchema>;
export type ImageLibraryPage=z.infer<typeof ImageLibraryPageSchema>;
