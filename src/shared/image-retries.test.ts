import {test,expect} from 'bun:test';
import {QueueImageRetriesSchema} from './image-retries.js';
import {isFrontendRequest} from '../protocol.js';
const request={type:'vn_queue_image_retries',version:1,chatId:'chat',messageId:'reply',sourceFingerprint:'fingerprint',swipeId:0,revision:0,requestId:'request',action:'enqueue',jobIds:['a','b']};
test('retry requests require a bounded explicit job selection and complete source version',()=>{
 expect(isFrontendRequest(request)).toBe(true);
 for(const change of [{jobIds:[]},{jobIds:Array(25).fill('a')},{revision:-1},{swipeId:undefined},{requestId:''},{autoApproveAll:true}])expect(QueueImageRetriesSchema.safeParse({...request,...change}).success).toBe(false);
 expect(QueueImageRetriesSchema.safeParse({...request,action:'clear',jobIds:undefined}).success).toBe(true);
});
