import {test,expect} from 'bun:test';
import {selectHeldBackground} from './background-hold.js';
import type {AssetView,TurnView} from '../protocol.js';
const art=(id:string,p:number,extra:any={}):AssetView=>({jobId:id,cueId:id,paragraphIndex:p,status:'generated',imageUrl:`/${id}`,stageAsset:{role:'background',sceneId:'s',sceneRevision:0,...extra}});
const view=(assets:AssetView[],starts:any=[null,1,1,1]):TurnView=>({paragraphs:['a','b','c','d'],assets,backgroundHoldStarts:starts} as any);
test('hold retains prior background, releases without policy and never reads future images',()=>{
 const a=art('a',0),b=art('b',2),future=art('future',3);const t=view([a,b,future]);
 expect(selectHeldBackground(t,2,b)).toBe(a);
 const {backgroundHoldStarts,...legacy}=t;expect(selectHeldBackground(legacy,2,b)).toBe(b);
 expect(selectHeldBackground(view([b,future]),2,b)).toBe(b);
 expect(selectHeldBackground(view([a,b],[1]),2,b)).toBe(b);
});
test('manual artwork, scene boundaries, failed images and manga are never suppressed',()=>{
 const a=art('a',0),manual=art('manual',2,{manual:true}),b=art('b',3);
 expect(selectHeldBackground(view([a,manual,b]),3,b)).toBe(manual);
 const next=art('next',2,{sceneId:'new'});expect(selectHeldBackground(view([a,next]),2,next)).toBe(next);
 const revised=art('revised',2,{sceneRevision:1});expect(selectHeldBackground(view([a,revised]),2,revised)).toBe(revised);
 const page={...art('page',2),presentation:'page' as const};expect(selectHeldBackground(view([a,page]),2,page)).toBe(page);
 const scene=art('scene',2,{role:'scene'});expect(selectHeldBackground(view([a,scene]),2,scene)).toBe(scene);
 expect(selectHeldBackground(view([{...a,status:'failed'},b]),3,b)).toBe(b);
});
