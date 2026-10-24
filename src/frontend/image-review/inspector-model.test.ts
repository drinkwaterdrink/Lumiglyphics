import {describe, expect, test} from 'bun:test';
import type {AssetView} from '../../protocol.js';
import {inspectorState,pictureStateLabel,pictureStateSummary} from './inspector-model.js';

describe('image inspector state', () => {
  const asset:AssetView={jobId:'one',cueId:'cue',paragraphIndex:0,status:'generated'};
  test('planning and an empty current reply never masquerade as historical requests',()=>{
    expect(inspectorState({planning:true}).kind).toBe('planning');
    expect(inspectorState({hasTurn:true}).kind).toBe('empty');
    expect(inspectorState({hasTurn:true,zeroBudget:true}).kind).toBe('zero-budget');
    expect(inspectorState({}).kind).toBe('idle');
  });
  test('a requestless queued picture is preparing, while a completed one is historical',()=>{
    expect(inspectorState({asset:{...asset,status:'queued'}}).kind).toBe('preparing');
    expect(inspectorState({asset}).kind).toBe('historical');
    expect(inspectorState({asset:{...asset,source:'cache'}}).kind).toBe('reused');
  });
  test('held approval, failures and cancellation take their own actions',()=>{
    expect(inspectorState({asset:{...asset,status:'generating'},requestState:'review'})).toMatchObject({kind:'held',action:'generate'});
    expect(inspectorState({asset:{...asset,status:'failed'}})).toMatchObject({kind:'failed',action:'retry'});
    expect(inspectorState({asset:{...asset,status:'cancelled'}})).toMatchObject({kind:'cancelled',action:'retry'});
    expect(inspectorState({asset,requestState:'approved'})).toMatchObject({kind:'completed',action:'prepare'});
  });
  test('approved running requests and local preparation never offer generation',()=>{
    expect(inspectorState({asset:{...asset,status:'generating'},requestState:'approved'})).toMatchObject({kind:'generating',action:null});
    expect(inspectorState({asset,requestState:'review',preparing:true})).toMatchObject({kind:'preparing',action:null});
    expect(inspectorState({asset:{...asset,status:'queued'},requestState:'prepared'})).toMatchObject({kind:'waiting',action:null});
  });
  test('local operations and retry queue explain the actual work before stale asset status',()=>{
    const failed={...asset,status:'failed' as const};
    expect(inspectorState({asset:failed,retryQueued:true})).toMatchObject({kind:'retry-queued',title:'Retry queued',action:null});
    expect(inspectorState({asset:failed,retryRunning:true})).toMatchObject({kind:'retry-running',action:null});
    expect(inspectorState({asset:failed,operation:'rewrite',retryQueued:true})).toMatchObject({kind:'rewriting',action:null});
    expect(inspectorState({asset,operation:'template'})).toMatchObject({kind:'rebuilding',action:null});
    expect(inspectorState({asset,operation:'rewrite',planning:true}).kind).toBe('planning');
  });
  test('picture labels and reply totals share operation meaning without counting a retry as another picture',()=>{
    const states=[
      inspectorState({asset,requestState:'approved'}),
      inspectorState({asset:{...asset,source:'cache'}}),
      inspectorState({asset,requestState:'review'}),
      inspectorState({asset:{...asset,status:'failed'},retryQueued:true}),
      inspectorState({asset:{...asset,status:'failed'}}),
    ];
    expect(states.map(pictureStateLabel)).toEqual(['Ready','Reused','Needs review','Retry queued','Failed']);
    expect(pictureStateSummary(states)).toBe('5 pictures · 2 ready · 1 needs review · 1 retry queued · 1 failed');
    expect(pictureStateSummary([])).toBe('');
    expect(pictureStateLabel(inspectorState({asset,operation:'rewrite'}))).toBe('Rewriting prompt');
    expect(pictureStateLabel(inspectorState({asset:{...asset,status:'cancelled'},requestState:'skipped'}))).toBe('Skipped');
  });
});
