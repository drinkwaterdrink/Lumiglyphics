import {test,expect} from 'bun:test';
import {selectCastComposition} from './cast-composition.js';
import type {TurnView,AssetView} from '../protocol.js';
const asset=(name:string,p:number,role:'portrait'|'background'|'scene'='portrait',sceneId='s'):AssetView=>({jobId:name,cueId:name,paragraphIndex:p,status:'generated',imageUrl:'/'+name,stageAsset:{role,sceneId,...(role==='portrait'?{character:name}:{})}});
const turn=(assets:AssetView[]):TurnView=>({chatId:'c',messageId:'m',swipeId:0,sourceFingerprint:'fingerprint',revision:0,speaker:'Mira',paragraphs:['a','b','c'],choices:[],assets,status:'ready'});
test('cast projection uses only existing cursor-bounded art, active speaker and two faces',()=>{
 const t=turn([asset('place',0,'background'),asset('Mira',0),asset('Rin',1),asset('Sol',1),asset('Future',2)]);
 const c=selectCastComposition(t,1)!;expect(c.portraits.map(p=>p.name)).toEqual(['Mira','Rin']);expect(c.portraits[0]!.active).toBe(true);expect(c.otherCast.map(p=>p.name)).toEqual(['Sol']);expect(selectCastComposition(t,1,'Sol')!.portraits[1]!.name).toBe('Sol');
});
test('outfit replacement failures give a neutral placeholder instead of stale art',()=>{
 const t=turn([asset('place',0,'background'),asset('Mira',0),{...asset('Mira',1),status:'failed',previousImage:true,stageAsset:{role:'portrait',sceneId:'s',character:'Mira',attire:'uniform'}}]);
 expect(selectCastComposition(t,1)!.portraits[0]!.asset).toBeNull();
});
test('scene, manga, location boundaries and missing backgrounds fall back to scene display',()=>{
 expect(selectCastComposition(turn([asset('Mira',0)]),0)).toBeNull();
 expect(selectCastComposition(turn([asset('place',0,'background'),asset('Mira',0),asset('action',1,'scene')]),1)).toBeNull();
 expect(selectCastComposition(turn([asset('place',0,'background'),asset('Mira',0),{...asset('page',1),presentation:'page'}]),1)).toBeNull();
 expect(selectCastComposition(turn([asset('place',0,'background'),asset('Mira',1,'portrait','new')]),1)).toBeNull();
});


test('environment revisions and failed backgrounds never combine stale art with current portraits',()=>{
 const t=turn([asset('place',0,'background'),asset('Mira',0),{...asset('Mira',1),stageAsset:{role:'portrait',sceneId:'s',sceneRevision:1,character:'Mira'}}]);
 expect(selectCastComposition(t,1)).toBeNull();
 const failed=turn([asset('place',0,'background'),asset('Mira',0),{...asset('place',1,'background'),status:'failed'}]);
 expect(selectCastComposition(failed,1)).toBeNull();
});

test('turn-scoped absence state hides absent cast and rejects stale state from another chat',()=>{
 const t=turn([asset('place',0,'background'),asset('Mira',0)]);
 const key={chatId:'c',assistantMessageId:'m',swipeId:0,sourceFingerprint:'fingerprint',revision:0};
 t.presentation={version:1,snapshots:[{at:{key,paragraphIndex:0},locationId:null,presentEntityIds:[],speakerEntityId:null,drawableEntityId:null,stateByEntity:{m:{presence:'absent'}},entities:[{id:'m',name:'Mira',kind:'npc',aliases:[],firstParagraph:0,facts:[]}]}]};
 expect(selectCastComposition(t,0)).toBeNull();
 t.presentation.snapshots[0]!.at.key.chatId='different';
 expect(selectCastComposition(t,0)!.portraits[0]!.name).toBe('Mira');
});

 test('supplied art replaces only an established cast portrait, not its underlying job',()=>{
 const portrait={...asset('Mira',1),stageAsset:{role:'portrait' as const,sceneId:'s',character:'Mira',displayImageUrl:'/supplied'}};
 const t=turn([asset('place',0,'background'),portrait]);
 expect(selectCastComposition(t,0)).toBeNull();
 expect(selectCastComposition(t,1)?.portraits[0]?.asset?.imageUrl).toBe('/supplied');
 expect(t.assets[1]?.imageUrl).toBe('/Mira');
 expect(selectCastComposition({...t,assets:[...t.assets,asset('page',2,'scene')]},2)).toBeNull();
 });

test('cast mode shares held background selection while retaining independently selected portraits',()=>{
 const t={...turn([asset('place',0,'background'),asset('Mira',0),asset('new-place',1,'background'),asset('Rin',1)]),backgroundHoldStarts:[null,1,1]};
 // Hold starts at paragraph 1: artwork at that cursor is the anchor.
 expect(selectCastComposition(t,2)?.background.jobId).toBe('new-place');
 t.backgroundHoldStarts=[0,0,0];expect(selectCastComposition(t,2)?.background.jobId).toBe('place');
 expect(selectCastComposition(t,2)?.portraits.map(p=>p.name)).toEqual(['Mira','Rin']);
});

test('scene background assigned to a later paragraph within the same scene is used for earlier paragraph cast portraits',()=>{
 const t=turn([asset('Mira',0),asset('kitchen',1,'background')]);
 const comp=selectCastComposition(t,0);
 expect(comp).not.toBeNull();
 expect(comp?.background.jobId).toBe('kitchen');
 expect(comp?.portraits[0]?.name).toBe('Mira');
});
