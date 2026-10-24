import {CastArtPanel} from '../src/frontend/settings/cast-art.js';
import {LocationArtPanel} from '../src/frontend/settings/location-art.js';
import type {CastArtLibrary,CastArtAction} from '../src/shared/cast-art.js';
import type {LocationArtLibrary} from '../src/shared/stage-assets.js';

const state={chatId:'story-a',actions:[] as Array<{chatId:string,action:CastArtAction}>,voice:[] as string[],left:0,hold:false,reply:null as null|(()=>void),
 library:{version:1,characters:[{entityId:'dana',name:'Dana Kessler',artRevision:0,description:'Learned description',preferredVariantId:null,variants:[],setup:{appearance:'Human woman, dark angled bob, green eyes.',aliases:['DK'],outfits:[{id:'coat',name:'Everyday coat',description:'Blue wool coat.'}],defaultOutfitId:'coat'}},{entityId:'mira',name:'Mira',artRevision:0,description:'Auburn hair.',preferredVariantId:null,variants:[]}]} as CastArtLibrary,
 places:{version:1,locations:[{entityId:'library',name:'Old library',artRevision:0,description:'Tall shelves and warm lamps.',preferredVariantId:'v',variants:[{id:'v',imageId:'place',requestFingerprint:'r',environmentFingerprint:'e',approved:true,createdAt:'2026-10-17'}]}]} as LocationArtLibrary};
document.body.style.cssText='margin:0;background:#18191d;color:#ececf0;font:16px system-ui';
const mount=document.createElement('main');mount.style.cssText='padding:16px;max-width:1000px;margin:auto;--lumiverse-primary:#b7a1ef;--lumiverse-text:#ececf0;--lumiverse-text-muted:#c1becb;--lumiverse-bg-elevated:#24252c;--lumiverse-border:#484953';document.body.append(mount);
const cast=new CastArtPanel(()=>state.chatId,(chatId,requestId,action)=>{
 state.actions.push({chatId,action});
 const reply=()=>{
  if(action.action==='scan'){cast.receiveScan(chatId,requestId,{notice:'Saved story and enabled sources only.',candidates:[{name:'Dana Kessler',source:'Saved story appearance',setup:{appearance:'Human woman with silver hair.',aliases:['DK','D'],outfits:[{id:'coat',name:'Everyday coat',description:'Red wool coat.'},{id:'source-new',name:'Uniform',description:'White shirt and navy trousers.'}],defaultOutfitId:'source-new'}},{name:'Dana Kessler',source:'Revealed reference — name only',setup:{appearance:'',aliases:[],outfits:[],defaultOutfitId:null}},{name:'Mira',source:'Story appearance',setup:{appearance:'Auburn hair.',aliases:[],outfits:[],defaultOutfitId:null}}]});return;}
  let record=state.library.characters.find(r=>r.entityId===action.characterId);
  if(action.action==='setup'){
   if(!record){record={entityId:action.name!.toLowerCase(),name:action.name!,artRevision:0,description:'',preferredVariantId:null,variants:[]};state.library.characters.push(record);}
   const previous=record.setup;record.setup={...structuredClone(action.setup!),...(previous?.imageId?{imageId:previous.imageId,imageAppearance:previous.imageAppearance}:{})};
  }
  if(action.action==='setup_supply'&&record?.setup){const target=action.outfitId?record.setup.outfits.find(o=>o.id===action.outfitId)!:record.setup;target.imageId=action.imageId;target.imageAppearance=record.setup.appearance;if('description' in target)target.imageAttire=target.description;}
  if(action.action==='clear_setup'&&record)delete record.setup;
  if(action.action==='forget')state.library.characters=state.library.characters.filter(r=>r.entityId!==action.characterId);
  if(action.action==='reset')state.library.characters=[];
  cast.receive(chatId,requestId,structuredClone(state.library));
 };
 if(state.hold)state.reply=reply;else queueMicrotask(reply);
},(chatId,requestId,offset)=>queueMicrotask(()=>cast.receiveGallery(chatId,requestId,{offset,total:1,images:[{id:'portrait',name:'Portrait.png',url:'/api/v1/images/portrait'}]})),name=>state.voice.push(name));
const places=new LocationArtPanel(()=>state.chatId,(chatId,requestId)=>queueMicrotask(()=>places.receive(chatId,requestId,structuredClone(state.places))));
mount.append(cast.host,places.host);cast.ensureLoaded();
(window as any).castWorkspace={state,cast,places,leave:()=>cast.guardNavigation(()=>state.left++)};
