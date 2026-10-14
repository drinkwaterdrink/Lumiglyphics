import {test,expect} from 'bun:test';
import type {SpindleAPI} from 'lumiverse-spindle-types';
import {loadLocationArt,saveLocationArt,findLocationArt,manageLocationArt,locationArtToken} from './location-art.js';

function fixture(){
 const data=new Map<string,unknown>();const ids=new Set(['image']);
 const api={userStorage:{getJson:async(path:string,o:any)=>data.get(`${o?.userId}:${path}`)??o.fallback,setJson:async(path:string,v:unknown,o:any)=>{data.set(`${o?.userId}:${path}`,v);}},images:{get:async(id:string)=>ids.has(id)?{id}:null}} as unknown as SpindleAPI;
 return {api,data,ids};
}
const art={location:'Observatory',description:'Brass telescope',requestFingerprint:'scene-v2:123456789',environmentFingerprint:'env:123456789',imageId:'image'};
test('persistent art survives reload, uses fresh host pointers, and isolates users/chats',async()=>{
 const {api}=fixture();await saveLocationArt(api,'c',art,'u');
 expect((await loadLocationArt(api,'c','u')).locations).toHaveLength(1);
 expect(await findLocationArt(api,'c',art,'u')).toEqual({imageId:'image',imageUrl:'/api/v1/images/image'});
 expect(await findLocationArt(api,'other',art,'u')).toBeNull();
 expect(await findLocationArt(api,'c',art,'other')).toBeNull();
});
test('strict request/environment compatibility and missing images fail closed',async()=>{
 const {api,ids}=fixture();await saveLocationArt(api,'c',art);
 expect(await findLocationArt(api,'c',{...art,requestFingerprint:'different-model'})).toBeNull();
 expect(await findLocationArt(api,'c',{...art,environmentFingerprint:'rain'})).toBeNull();
 ids.clear();expect(await findLocationArt(api,'c',art)).toBeNull();
});
test('reset/forget invalidate in-flight saves without deleting host images',async()=>{
 const {api,ids}=fixture();const token=locationArtToken(api,'c');
 await saveLocationArt(api,'c',art);await manageLocationArt(api,'c',{action:'reset'});
 expect(await saveLocationArt(api,'c',art,undefined,{token})).toBe(false);
 expect((await loadLocationArt(api,'c')).locations).toHaveLength(0);expect(ids.has('image')).toBe(true);
});
test('concurrent variant writes serialize; capacity never silently drops records',async()=>{
 const {api}=fixture();await Promise.all(Array.from({length:8},(_,i)=>saveLocationArt(api,'c',{...art,imageId:`image${i}`})));
 const library=await loadLocationArt(api,'c');expect(library.locations[0]?.variants).toHaveLength(8);
 await expect(saveLocationArt(api,'c',{...art,imageId:'ninth'})).rejects.toThrow(/8/);
 expect((await loadLocationArt(api,'c')).locations[0]?.variants).toHaveLength(8);
});
test('unknown storage versions are preserved rather than overwritten',async()=>{
 const {api,data}=fixture();await saveLocationArt(api,'c',art);
 const path=[...data.keys()][0]!;data.set(path,{version:2,locations:[]});
 await expect(saveLocationArt(api,'c',art)).rejects.toThrow(/unsupported/i);
 expect(data.get(path)).toEqual({version:2,locations:[]});
});

function deferred<T>(){
 let resolve!:(value:T)=>void;
 const promise=new Promise<T>(done=>{resolve=done;});
 return {promise,resolve};
}

for(const action of ['reset','forget','select'] as const){
 test(`${action} cancels a location lookup awaiting host image verification`,async()=>{
  const {api}=fixture();await saveLocationArt(api,'c',art,'u');
  const variant=(await loadLocationArt(api,'c','u')).locations[0]!.variants[0]!;
  const entered=deferred<void>(),image=deferred<any>();
  api.images.get=async()=>{entered.resolve();return image.promise;};
  const lookup=findLocationArt(api,'c',art,'u');await entered.promise;
  await manageLocationArt(api,'c',{action,locationId:'observatory',variantId:variant.id},'u');
  image.resolve({id:'image'});
  expect(await lookup).toBeNull();
 });
}

test('reset cancels a lookup awaiting a stale storage snapshot',async()=>{
 const {api}=fixture();await saveLocationArt(api,'c',art,'u');
 const getJson=api.userStorage.getJson.bind(api.userStorage);
 const entered=deferred<void>(),resume=deferred<void>();let delayed=false;
 api.userStorage.getJson=async(...args:any[])=>{
  const snapshot=await (getJson as any)(...args);
  if(!delayed){delayed=true;entered.resolve();await resume.promise;}
  return snapshot;
 };
 const lookup=findLocationArt(api,'c',art,'u');await entered.promise;
 await manageLocationArt(api,'c',{action:'reset'},'u');resume.resolve();
 expect(await lookup).toBeNull();
 expect((await loadLocationArt(api,'c','u')).locations).toHaveLength(0);
});

test('another user or chat resetting art does not cancel the originating lookup',async()=>{
 const {api}=fixture();await saveLocationArt(api,'c',art,'u');
 const entered=deferred<void>(),image=deferred<any>();
 api.images.get=async()=>{entered.resolve();return image.promise;};
 const lookup=findLocationArt(api,'c',art,'u');await entered.promise;
 await manageLocationArt(api,'c',{action:'reset'},'other');
 await manageLocationArt(api,'other',{action:'reset'},'u');image.resolve({id:'image'});
 expect(await lookup).toEqual({imageId:'image',imageUrl:'/api/v1/images/image'});
});
