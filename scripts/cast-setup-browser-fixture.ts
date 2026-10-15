import {VisualNovelSettingsPanel} from '../src/frontend/settings/panel.js';
import {SpeechSettingsSection} from '../src/frontend/speech/settings-ui.js';
import {DEFAULT_CONFIG} from '../src/config.js';
import {DEFAULT_SPEECH_SETTINGS} from '../src/speech-config.js';
import type {CastArtLibrary} from '../src/shared/cast-art.js';
const mount=document.createElement('div');mount.style.cssText='min-height:100vh;background:#08090d';document.body.append(mount);
const state={chatId:'chat',actions:[] as any[],patches:[] as any[],profileCalls:0,speechPatches:[] as any[],library:{version:1,characters:[]} as CastArtLibrary};
const panel=new VisualNovelSettingsPanel({mount,getChatId:()=>state.chatId,setupStorage:{getItem:()=> '1',setItem:()=>{}},onSave:p=>state.patches.push(p),onOpenPreview:()=>{},onRefreshConnections:()=>{},
 onCastArt:(chatId,requestId,action)=>{
  state.actions.push(action);queueMicrotask(()=>{
   if(action.action==='scan'){panel.setCastContext(chatId,requestId,{candidates:[{name:'Rena',source:'SimTracker · current reply',setup:{appearance:'white fur, blue eyes, fox ears',aliases:['Ren'],outfits:[{id:'scan',name:'Current outfit',description:'blue coat'}],defaultOutfitId:'scan'}}],notice:'Nothing saved or generated.'});return;}
   if(action.action==='setup'){
    let record=state.library.characters.find(r=>r.entityId===(action.characterId??action.name!.toLowerCase()));
    if(!record){record={entityId:action.name!.toLowerCase(),name:action.name!,description:action.setup!.appearance,artRevision:0,preferredVariantId:null,variants:[]};state.library.characters.push(record);}
    record.setup={...action.setup!,outfits:action.setup!.outfits.map(o=>({...o}))};
   }else if(action.action==='setup_supply'){
    const record=state.library.characters.find(r=>r.entityId===action.characterId)!,target=action.outfitId?record.setup!.outfits.find(o=>o.id===action.outfitId)!:record.setup!;
    target.imageId=action.imageId!;target.imageAppearance=record.setup!.appearance;if('description' in target)target.imageAttire=target.description;
   }
   panel.setCastArt(chatId,requestId,structuredClone(state.library));
  });
 },onCastGallery:(chatId,requestId,offset)=>queueMicrotask(()=>panel.setCastGallery(chatId,requestId,{offset,total:1,images:[{id:'photo',name:'Portrait.png',url:'/api/v1/images/photo?size=sm'}]})),
 onCastVoice:name=>speech.prepareCharacter(name)});
const speech=new SpeechSettingsSection({mount:panel.voiceMount(),getChatId:()=>state.chatId,onSave:s=>state.speechPatches.push(s),listProfiles:async()=>{state.profileCalls++;return [];},listVoices:async()=>[]});speech.setConfig(DEFAULT_SPEECH_SETTINGS);
panel.setConfig(DEFAULT_CONFIG);panel.openSection('pictures');
(window as any).castSetupFixture={state,panel,speech};
