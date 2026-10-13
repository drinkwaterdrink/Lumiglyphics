import {test,expect} from 'bun:test';
import type {SpindleAPI} from 'lumiverse-spindle-types';
import {loadCastArt,saveCastArt,findCastArt,manageCastArt,castArtToken} from './cast-art.js';

function fixture(){
 const data=new Map<string,unknown>();const ids=new Set(['image']);
 const api={userStorage:{getJson:async(path:string,o:any)=>data.get(`${o?.userId}:${path}`)??o.fallback,setJson:async(path:string,v:unknown,o:any)=>{data.set(`${o?.userId}:${path}`,v);}},images:{get:async(id:string)=>ids.has(id)?{id}:null}} as unknown as SpindleAPI;
 return {api,data,ids};
}
const art={character:'Aleister',description:'Dark hair, blue coat',requestFingerprint:'scene-v2:123456789',appearanceFingerprint:'env:123456789',imageId:'image'};
test('persistent art survives reload, uses fresh host pointers, and isolates users/chats',async()=>{
 const {api}=fixture();await saveCastArt(api,'c',art,'u');
 expect((await loadCastArt(api,'c','u')).characters).toHaveLength(1);
 expect(await findCastArt(api,'c',art,'u')).toEqual({imageId:'image',imageUrl:'/api/v1/images/image'});
 expect(await findCastArt(api,'other',art,'u')).toBeNull();
 expect(await findCastArt(api,'c',art,'other')).toBeNull();
});
test('strict request/environment compatibility and missing images fail closed',async()=>{
 const {api,ids}=fixture();await saveCastArt(api,'c',art);
 expect(await findCastArt(api,'c',{...art,requestFingerprint:'different-model'})).toBeNull();
 expect(await findCastArt(api,'c',{...art,appearanceFingerprint:'rain'})).toBeNull();
 ids.clear();expect(await findCastArt(api,'c',art)).toBeNull();
});
test('reset/forget invalidate in-flight saves without deleting host images',async()=>{
 const {api,ids}=fixture();const token=castArtToken(api,'c');
 await saveCastArt(api,'c',art);await manageCastArt(api,'c',{action:'reset'});
 expect(await saveCastArt(api,'c',art,undefined,{token})).toBe(false);
 expect((await loadCastArt(api,'c')).characters).toHaveLength(0);expect(ids.has('image')).toBe(true);
});
test('concurrent variant writes serialize; capacity never silently drops records',async()=>{
 const {api}=fixture();await Promise.all(Array.from({length:8},(_,i)=>saveCastArt(api,'c',{...art,imageId:`image${i}`})));
 const library=await loadCastArt(api,'c');expect(library.characters[0]?.variants).toHaveLength(8);
 await expect(saveCastArt(api,'c',{...art,imageId:'ninth'})).rejects.toThrow(/8/);
 expect((await loadCastArt(api,'c')).characters[0]?.variants).toHaveLength(8);
});
test('unknown storage versions are preserved rather than overwritten',async()=>{
 const {api,data}=fixture();await saveCastArt(api,'c',art);
 const path=[...data.keys()][0]!;data.set(path,{version:2,characters:[]});
 await expect(saveCastArt(api,'c',art)).rejects.toThrow(/unsupported/i);
 expect(data.get(path)).toEqual({version:2,characters:[]});
});

 test('preference only selects compatible art; forgetting variant preserves other outfits',async()=>{
 const {api,ids}=fixture();ids.add('second');ids.add('other-outfit');
 await saveCastArt(api,'c',art,'u');await saveCastArt(api,'c',{...art,imageId:'second'},'u');
 await saveCastArt(api,'c',{...art,imageId:'other-outfit',description:'Red coat',appearanceFingerprint:'red'},'u');
 const r=(await loadCastArt(api,'c','u')).characters[0]!;
 const second=r.variants.find(v=>v.imageId==='second')!;
 await manageCastArt(api,'c',{action:'select',characterId:r.entityId,variantId:second.id},'u');
 expect((await findCastArt(api,'c',art,'u'))?.imageId).toBe('second');
 await manageCastArt(api,'c',{action:'select',characterId:r.entityId,variantId:r.variants.find(v=>v.imageId==='other-outfit')!.id},'u');
 expect((await findCastArt(api,'c',art,'u'))?.imageId).not.toBe('other-outfit');
 await manageCastArt(api,'c',{action:'forget',characterId:r.entityId,variantId:second.id},'u');
 expect((await loadCastArt(api,'c','u')).characters[0]?.variants).toHaveLength(2);
 expect(ids.has('second')).toBe(true);
 });
 test('cast management validates bounded strict request grammar',async()=>{
 const {isFrontendRequest}=await import('../../protocol.js');
 const base={type:'vn_cast_art',version:1,chatId:'c',requestId:'r',action:'select',characterId:'aleister',variantId:'v'};
 expect(isFrontendRequest(base)).toBe(true);
 expect(isFrontendRequest({...base,characterId:undefined})).toBe(false);
 expect(isFrontendRequest({...base,variantId:undefined})).toBe(false);
 expect(isFrontendRequest({...base,version:2})).toBe(false);
 expect(isFrontendRequest({...base,imageUrl:'external'})).toBe(false);
 });

 test('forget during host verification prevents a late portrait reuse',async()=>{
 const {api}=fixture();await saveCastArt(api,'c',art,'u');
 let release!:(value:any)=>void;let entered!:()=>void;
 const ready=new Promise<void>(r=>entered=r);
 (api.images as any).get=()=>{entered();return new Promise(r=>release=r);};
 const finding=findCastArt(api,'c',art,'u');await ready;
 await manageCastArt(api,'c',{action:'reset'},'u');release({id:'image'});
 expect(await finding).toBeNull();
 });
