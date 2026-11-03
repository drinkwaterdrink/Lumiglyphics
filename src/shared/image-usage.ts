import {z} from 'zod';
import {TurnKeySchema} from './contracts.js';
export const ImageActivityKindSchema=z.enum(['provider-start','provider-success','provider-failure','cancel-unknown','held','skipped','cache-reuse','restore']);
export const ImageActivityEventSchema=z.object({key:TurnKeySchema,jobId:z.string().min(1).max(256),requestId:z.string().max(256).optional(),attemptId:z.string().max(256).optional(),kind:ImageActivityKindSchema,at:z.string().max(64)}).strict();
export type ImageActivityInput=Omit<z.infer<typeof ImageActivityEventSchema>,'at'>;
const count=z.number().int().nonnegative();
export const ImageActivitySchema=z.object({version:z.literal(1),sessionId:z.string().max(128),since:z.string().max(64),totals:z.object({attempts:count,succeeded:count,failed:count,cancelUnknown:count,inFlight:count,held:count,skipped:count,cacheReuses:count,restores:count}).strict(),price:z.literal('unavailable'),events:z.array(ImageActivityEventSchema).max(128)}).strict();
export type ImageActivity=z.infer<typeof ImageActivitySchema>;
