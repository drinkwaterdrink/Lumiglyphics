import {describe, expect, test} from 'bun:test';
import type {AssetView} from '../../protocol.js';
import {inspectorState} from './inspector-model.js';

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
  });
});
