import {test,expect} from 'bun:test';
import type {SpindleAPI} from 'lumiverse-spindle-types';
import {castArtToken,manageCastArt,loadCastArt,findCastArt,findSetupDisplayArt,saveCastArt} from './cast-art.js';
import {saveCharacterRegistry,mergeCharacterRegistry,saveSingleCharacterState,mergeCharacterAppearanceFromState,mergePlannerCharacters,loadSingleCharacterState,loadCharacterAppearance,loadCharacterRegistry} from './storage.js';
import {isFrontendRequest} from '../../protocol.js';
import {sendState} from './controller.js';

function fixture(){
 const data=new Map<string,unknown>();let calls=0;
 const api={userStorage:{getJson:async(p:string,o:any)=>structuredClone(data.get(`${o?.userId}:${p}`)??o.fallback),setJson:async(p:string,v:unknown,o:any)=>{data.set(`${o?.userId}:${p}`,structuredClone(v));}},images:{get:async(id:string,user:string)=>{calls++;return user==='u'&&id==='photo'?{id,mime_type:'image/png'}:null;}}} as unknown as SpindleAPI;
 return {api,data,calls:()=>calls};
}
const setup={appearance:'silver fur, blue eyes, fox ears',aliases:['Ren'],outfits:[{id:'coat',name:'Winter',description:'red coat'}],defaultOutfitId:'coat'};
const action=(extra:any={})=>({action:'setup' as const,name:'Rena',setup,...extra});

test('register a nonhuman NPC before any generated portrait; appearance and aliases stay scoped',async()=>{
 const f=fixture();const library=await manageCastArt(f.api,'chat',action(),'u');
 expect(library.characters[0]!.variants).toHaveLength(0);expect(library.characters[0]!.setup!.appearance).toBe(setup.appearance);expect(f.calls()).toBe(0);
 expect((await loadCharacterAppearance(f.api,'u','chat')).Rena).toContain('red coat');
 const registry=await loadCharacterRegistry(f.api,'chat','u');const npc=Object.values(registry).find(e=>e.name==='Rena')!;expect(npc.aliases).toContain('Ren');expect(npc.tags).toContain('silver fur');
 expect(await loadCharacterAppearance(f.api,'other','chat')).toEqual({});expect(await loadCharacterAppearance(f.api,'u','other')).toEqual({});
});
test('manual edits override learned appearance without rewriting it or existing portrait variants',async()=>{
 const f=fixture();f.data.set('u:chats/chat/characters.json',{Rena:'black fur, amber eyes'});
 await saveCastArt(f.api,'chat',{character:'Rena',description:'black fur',requestFingerprint:'12345678',appearanceFingerprint:'old-look',imageId:'generated'},'u');
 await manageCastArt(f.api,'chat',action({characterId:'rena'}),'u');
 expect((await loadCharacterAppearance(f.api,'u','chat')).Rena).toContain('silver fur');
 expect(f.data.get('u:chats/chat/characters.json')).toEqual({Rena:'black fur, amber eyes'});
 expect((await loadCastArt(f.api,'chat','u')).characters[0]!.variants[0]!.imageId).toBe('generated');
 await manageCastArt(f.api,'chat',{action:'clear_setup',characterId:'rena'},'u');expect((await loadCharacterAppearance(f.api,'u','chat')).Rena).toBe('black fur, amber eyes');
});
test('aliases cannot steal a known character name and failed registration makes no writes',async()=>{
 const f=fixture();await manageCastArt(f.api,'chat',action(),'u');const before=JSON.stringify([...f.data]);
 await expect(manageCastArt(f.api,'chat',action({name:'Other',setup:{...setup,aliases:['Rena']}}),'u')).rejects.toThrow(/already|belongs/i);
 expect(JSON.stringify([...f.data])).toBe(before);
 await expect(manageCastArt(f.api,'chat',action({name:'Ren'}),'u')).rejects.toThrow(/already|belongs/i);
});
test('supplied setup art is scoped, outfit-safe and never reused as a generated image',async()=>{
 const f=fixture();await manageCastArt(f.api,'chat',action(),'u');
 await manageCastArt(f.api,'chat',{action:'setup_supply',characterId:'rena',outfitId:'coat',imageId:'photo'},'u');
 expect(await findSetupDisplayArt(f.api,'chat',{character:'Ren',baseIdentity:'silver fur, blue eyes, fox ears, red coat',attire:'red coat'},'u')).toBe('/api/v1/images/photo');
 expect(await findSetupDisplayArt(f.api,'chat',{character:'Rena',baseIdentity:'silver fur, blue eyes, fox ears, red coat',attire:'blue dress'},'u')).toBeNull();
 expect(await findCastArt(f.api,'chat',{character:'Rena',description:setup.appearance,requestFingerprint:'12345678',appearanceFingerprint:'look'},'u')).toBeNull();
 await expect(manageCastArt(f.api,'chat',{action:'setup_supply',characterId:'rena',outfitId:'coat',imageId:'missing'},'u')).rejects.toThrow(/available/i);
});
test('setup edits preserve assigned artwork; unknown library versions remain intact',async()=>{
 const f=fixture();await manageCastArt(f.api,'chat',action(),'u');await manageCastArt(f.api,'chat',{action:'setup_supply',characterId:'rena',outfitId:'coat',imageId:'photo'},'u');
 await manageCastArt(f.api,'chat',action({characterId:'rena',setup:{...setup,appearance:'white fur, blue eyes, fox ears'}}),'u');
 expect((await loadCastArt(f.api,'chat','u')).characters[0]!.setup!.outfits[0]!.imageId).toBe('photo');
 f.data.set('u:chats/chat/cast-art.json',{version:2,characters:['future']});
 await expect(manageCastArt(f.api,'chat',action(),'u')).rejects.toThrow(/unsupported/i);expect(f.data.get('u:chats/chat/cast-art.json')).toEqual({version:2,characters:['future']});
});
test('strict setup requests reject duplicate outfit IDs, bad defaults and unsafe extra fields',()=>{
 const request={type:'vn_cast_art',version:1,chatId:'chat',requestId:'r',...action()};
 expect(isFrontendRequest(request)).toBe(true);expect(isFrontendRequest({...request,setup:{...setup,defaultOutfitId:'missing'}})).toBe(false);
 expect(isFrontendRequest({...request,setup:{...setup,outfits:[setup.outfits[0],setup.outfits[0]]}})).toBe(false);
 expect(isFrontendRequest({...request,setup:{...setup,imageUrl:'https://outside'}})).toBe(false);
});
test('a cast-management display refresh cannot bootstrap an unplanned reply',async()=>{
 const f=fixture();let bootstrapReads=0;
 f.api.log={info:()=>{},warn:()=>{},debug:()=>{},error:()=>{}} as any;f.api.sendToFrontend=()=>{};
 f.api.chat={getMessages:async()=>{bootstrapReads++;return [];}} as any;
 try{await sendState(f.api,'setup-refresh','u',{viewOpen:true,readOnly:true} as any);expect(bootstrapReads).toBe(0);}
 finally{await sendState(f.api,'setup-refresh','u',{viewOpen:false,readOnly:true} as any);}
});

test('planning persistence never bakes reversible setup into learned identities',async()=>{
 for(const learned of [false,true]){
  const f=fixture();if(learned)f.data.set('u:chats/chat/characters.json',{Rena:'black fur, amber eyes'});
  await manageCastArt(f.api,'chat',action(),'u');
  const effective=await loadCharacterRegistry(f.api,'chat','u');
  await saveCharacterRegistry(f.api,'chat',effective,'u');
  await mergeCharacterRegistry(f.api,'chat',[{name:'Other',tags:'brown hair, green eyes'}],'u');
  const state={schemaVersion:1,protagonist:{name:'Ren',tags:['silver fur','blue eyes','fox ears']},environment:'forest',updatedAt:new Date().toISOString()} as any;
  await saveSingleCharacterState(f.api,'chat',state,'u');
  await mergeCharacterAppearanceFromState(f.api,state,'u','chat');
  await mergePlannerCharacters(f.api,[{name:'Ren',description:'silver fur, blue eyes'}],'u','chat');
  await manageCastArt(f.api,'chat',{action:'clear_setup',characterId:'rena'},'u');
  const registry=await loadCharacterRegistry(f.api,'chat','u');
  expect(Object.values(registry).some(e=>e.aliases.includes('Ren')||e.tags.includes('silver fur'))).toBe(false);
  expect((await loadCharacterAppearance(f.api,'u','chat')).Rena).toBe(learned?'black fur, amber eyes':undefined);
  expect((await loadSingleCharacterState(f.api,'chat','u')).protagonist.tags).toEqual([]);
 }
});

test('setup removed during planning cannot leak captured manual identity after removal',async()=>{
 const f=fixture();await manageCastArt(f.api,'chat',action(),'u');
 const token=castArtToken(f.api,'chat','u'),current=()=>token===castArtToken(f.api,'chat','u');
 const captured=await loadCharacterRegistry(f.api,'chat','u');
 await manageCastArt(f.api,'chat',{action:'clear_setup',characterId:'rena'},'u');
 const state={protagonist:{name:'Rena',tags:['silver fur','blue eyes']},environment:'forest'} as any;
 await saveCharacterRegistry(f.api,'chat',captured,'u',current);
 await saveSingleCharacterState(f.api,'chat',state,'u',current);
 await mergeCharacterAppearanceFromState(f.api,state,'u','chat',current);
 await mergePlannerCharacters(f.api,[{name:'Ren',description:'silver fur, blue eyes'}],'u','chat',current);
 expect(await loadCharacterRegistry(f.api,'chat','u')).toEqual({});
 expect(await loadCharacterAppearance(f.api,'u','chat')).toEqual({});
 expect((await loadSingleCharacterState(f.api,'chat','u')).protagonist.tags).toEqual([]);
});
