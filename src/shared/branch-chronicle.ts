import { z } from 'zod';
import { ReadingPositionSchema } from './reading-position.js';

const id = z.string().min(1).max(256);
export const ChronicleBookmarkSchema = z.object({
  id,
  position: ReadingPositionSchema,
  replyNumber: z.number().int().positive(),
  swipeTimestamp: z.number().int().nonnegative().optional(),
}).strict();
export const ChronicleDocumentSchema = z.object({
  version: z.literal(1),
  bookmarks: z.array(ChronicleBookmarkSchema).max(100),
}).strict();

const scope = { type: z.literal('vn_branch_chronicle'), chatId: id, requestId: id };
export const BranchChronicleRequestSchema = z.discriminatedUnion('action', [
  z.object({ ...scope, action: z.literal('list') }).strict(),
  z.object({ ...scope, action: z.literal('bookmark'), position: ReadingPositionSchema }).strict(),
  z.object({ ...scope, action: z.literal('remove'), bookmarkId: id }).strict(),
  z.object({ ...scope, action: z.literal('compare'), firstId: id, secondId: id }).strict(),
]);
export type BranchChronicleRequest = z.infer<typeof BranchChronicleRequestSchema>;
export type ChronicleBookmark = z.infer<typeof ChronicleBookmarkSchema>;
export type ChronicleDocument = z.infer<typeof ChronicleDocumentSchema>;

export const ChronicleSideSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('missing') }).strict(),
  z.object({ status: z.literal('changed') }).strict(),
  z.object({
    status: z.literal('ready'),
    passage: z.string().max(4000),
    facts: z.array(z.string().max(1000)).max(256),
    completeFacts: z.boolean(),
    choices: z.array(z.object({ label: z.string().max(512), locked: z.boolean() }).strict()).max(32),
    pictures: z.array(z.object({
      passage: z.number().int().positive(),
      provider: z.string().max(256),
      imageId: id,
    }).strict()).max(128),
    morePictures: z.boolean(),
  }).strict(),
]);
export const BranchChronicleResultSchema = z.object({
  bookmarks: ChronicleDocumentSchema.shape.bookmarks,
  comparison: z.tuple([ChronicleSideSchema, ChronicleSideSchema]).optional(),
}).strict();
export type ChronicleSide = z.infer<typeof ChronicleSideSchema>;
export type BranchChronicleResult = z.infer<typeof BranchChronicleResultSchema>;
