import { expect, test } from 'bun:test';
import { imageDiagnostic } from './image-diagnostics.js';
import type { VisualCue } from './contracts.js';
const cue = { character:'Aleister',characterId:'npc-aleister',resolvedIdentity:'black hair, brown eyes',imageTemplate:{name:'Portrait',subjectMode:'one'},trackerStatus:'detected',visualSources:['private story secrets', 'manual subject correction'] } as unknown as VisualCue;
test('diagnostics explain missing subject and appearance separately without copying private material',()=>{
 expect(imageDiagnostic({...cue,character:null,characterId:undefined,resolvedIdentity:''},true)).toMatchObject({status:'needs_subject'});
 const result=imageDiagnostic({...cue,resolvedIdentity:''},true);
 expect(result).toMatchObject({status:'needs_appearance',subject:'Aleister'});
 expect(JSON.stringify(result)).not.toContain('private story');
 expect(JSON.stringify(result)).not.toContain('black hair');
});
test('no-people templates bypass appearance diagnostics and report generation failure separately',()=>{
 expect(imageDiagnostic({...cue,character:null,resolvedIdentity:'',imageTemplate:{...cue.imageTemplate!,subjectMode:'none'}},false)?.status).toBe('no_people');
 expect(imageDiagnostic(cue,true)?.status).toBe('generation_failed');
 expect(imageDiagnostic(undefined,true)?.status).toBe('unavailable');
});

import { ReplanTurnRequestSchema, isFrontendRequest } from '../protocol.js';
test('replan protocol rejects unsupported versions, extra fields and unbounded requests',()=>{
 const request={type:'vn_replan_turn',version:1,chatId:'chat',messageId:'message',swipeId:0,sourceFingerprint:'source',requestId:'request'};
 expect(isFrontendRequest(request)).toBe(true);
 expect(ReplanTurnRequestSchema.safeParse({...request,version:2}).success).toBe(false);
 expect(isFrontendRequest({...request,swipeId:-1})).toBe(false);
 expect(isFrontendRequest({...request,prompt:'injected'})).toBe(false);
 expect(isFrontendRequest({...request,requestId:'x'.repeat(101)})).toBe(false);
});
