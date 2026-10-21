import {z} from 'zod';
const id=z.string().trim().min(1).max(256);
export const QueueImageRetriesSchema=z.object({type:z.literal('vn_queue_image_retries'),version:z.literal(1),chatId:id,messageId:id,sourceFingerprint:id,swipeId:z.number().int().nonnegative(),revision:z.number().int().nonnegative(),requestId:id,action:z.enum(['enqueue','clear']),jobIds:z.array(id).min(1).max(24).optional()}).strict().refine(r=>r.action==='clear'||Boolean(r.jobIds?.length),'Choose at least one picture.');
export type QueueImageRetriesRequest=z.infer<typeof QueueImageRetriesSchema>;
export type ImageRetryQueueView={chatId:string;messageId:string;sourceFingerprint:string;swipeId:number;revision:number;activeJobId:string|null;jobIds:string[]};
