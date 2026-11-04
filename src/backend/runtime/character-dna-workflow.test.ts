import {it,expect} from 'bun:test';
import {handleCharacterDnaRequest} from './character-dna-workflow.js';
import {saveCharacterDNA,loadCharacterDNALibrary} from './character-dna-store.js';
import {createEmptyCharacterDNA} from '../../shared/character-dna.js';
import {isFrontendRequest} from '../../protocol.js';
function fixture(){const data=new Map<string,unknown>(),messages:any[]=[];const spindle:any={userStorage:{getJson:async(p:string,o:any)=>structuredClone(data.get(p)??o?.fallback??null),setJson:async(p:string,v:any)=>{data.set(p,structuredClone(v));}},sendToFrontend:(message:any,userId:string)=>messages.push({message,userId})};return{spindle,data,messages};}
it('strictly rejects arbitrary caller JSON, invalid targets and unknown DNA fields',()=>{
 expect(isFrontendRequest({type:'vn_character_dna',action:'save',chatId:'c',requestId:'r',dna:createEmptyCharacterDNA('Nadine')})).toBe(false);
 expect(isFrontendRequest({type:'vn_character_dna',action:'autofill',chatId:'c',requestId:'r',characterName:'Nadine',contextText:'{"build":{"gender":"boy"}}'})).toBe(false);
 expect(isFrontendRequest({type:'vn_character_dna',action:'propose',chatId:'c',requestId:'r',characterName:'Nadine',fields:['id']})).toBe(false);
 expect(isFrontendRequest({type:'vn_character_dna',action:'list',chatId:'',requestId:'r'})).toBe(false);
});
it('prepares without saving then applies only selected fields and refuses a cancelled proposal',async()=>{
 const{spindle,messages}=fixture();spindle.chat={getMessages:async()=>[{id:'m',is_user:false,content:'Darby is a boy. Nadine enters. She is in her mid forties.'}]};spindle.connections={list:async()=>[{id:'writer',provider:'openai',model:'m',is_default:true}]};
 spindle.generate={raw:async()=>({content:JSON.stringify({changes:[{path:'build.gender',value:'woman',classification:'inferred',sourceRefs:['source:0']},{path:'hair.color',value:'auburn',classification:'generated',sourceRefs:[]}]})})};
 const request={type:'vn_character_dna' as const,action:'propose' as const,chatId:'c',requestId:'p',characterName:'Nadine',characterId:'nadine'};await handleCharacterDnaRequest(spindle,request,'u');const p=messages.at(-1)?.message.proposal;expect(p).toBeDefined();expect(Object.keys((await loadCharacterDNALibrary(spindle,'c','u')).characters)).toHaveLength(0);
 await handleCharacterDnaRequest(spindle,{type:'vn_character_dna',action:'apply',chatId:'c',requestId:'apply',proposalId:p.id,fields:['build.gender']},'u');const saved=(await loadCharacterDNALibrary(spindle,'c','u')).characters.nadine!;expect(saved.build.gender).toBe('woman');expect(saved.hair.color).toBeUndefined();expect(saved.fieldSources?.['build.gender']?.classification).toBe('inferred');
 await handleCharacterDnaRequest(spindle,{...request,requestId:'p2'},'u');const p2=messages.at(-1)?.message.proposal;await handleCharacterDnaRequest(spindle,{type:'vn_character_dna',action:'cancel',chatId:'c',requestId:'cancel'},'u');await handleCharacterDnaRequest(spindle,{type:'vn_character_dna',action:'apply',chatId:'c',requestId:'stale',proposalId:p2.id,fields:['hair.color']},'u');expect(messages.at(-1)?.message.error).toContain('expired');expect((await loadCharacterDNALibrary(spindle,'c','u')).characters.nadine?.hair.color).toBeUndefined();
});
it('refuses to apply a proposal after its reading context changes',async()=>{
 const{spindle,messages,data}=fixture();spindle.chat={getMessages:async()=>[{id:'m',is_user:false,content:'Nadine enters. She smiles.'}]};spindle.connections={list:async()=>[{id:'writer',provider:'openai',model:'m',is_default:true}]};spindle.generate={raw:async()=>({content:JSON.stringify({changes:[{path:'hair.color',value:'auburn',classification:'generated',sourceRefs:[]}]})})};
 await handleCharacterDnaRequest(spindle,{type:'vn_character_dna',action:'propose',chatId:'c',requestId:'p',characterName:'Nadine'},'u');const p=messages.at(-1)?.message.proposal;expect(p).toBeDefined();
 // A valid cursor appears while the old no-cursor proposal is under review.
 const{saveReadingPosition}=await import('./storage.js');await saveReadingPosition(spindle,{version:1,key:{chatId:'c',assistantMessageId:'m',sourceFingerprint:'12345678',swipeId:1,revision:0},paragraphIndex:0} as any,'u');
 await handleCharacterDnaRequest(spindle,{type:'vn_character_dna',action:'apply',chatId:'c',requestId:'a',proposalId:p.id,fields:['hair.color']},'u');expect(messages.at(-1)?.message.error).toContain('context changed');expect(Object.keys((await loadCharacterDNALibrary(spindle,'c','u')).characters)).toHaveLength(0);
});
it('deletes only this profile, refuses stale resurrection, and restores without deleting image/source data',async()=>{
 const{spindle,data,messages}=fixture();const dna=createEmptyCharacterDNA('Nadine');await saveCharacterDNA(spindle,'c',dna,'u');data.set('gallery',{imageId:'retain'});
 await handleCharacterDnaRequest(spindle,{type:'vn_character_dna',action:'delete',chatId:'c',requestId:'r',characterId:dna.id,revision:1},'u');let l=await loadCharacterDNALibrary(spindle,'c','u');expect(Object.keys(l.characters)).toHaveLength(0);expect(l.deleted?.nadine?.name).toBe('Nadine');
 await expect(saveCharacterDNA(spindle,'c',dna,'u')).rejects.toThrow('deleted');expect(data.get('gallery')).toEqual({imageId:'retain'});
 await handleCharacterDnaRequest(spindle,{type:'vn_character_dna',action:'restore',chatId:'c',requestId:'restore',characterId:dna.id,revision:2},'u');l=await loadCharacterDNALibrary(spindle,'c','u');expect(l.characters.nadine?.name).toBe('Nadine');expect(messages.every(m=>m.userId==='u')).toBe(true);
});
it('can keep editing the retained character after merging a same-name legacy duplicate',async()=>{
 const{spindle,data}=fixture();const a=createEmptyCharacterDNA('Nadine','nadine'),b=createEmptyCharacterDNA('Nadine','nadine-copy');a.hair.color='auburn';b.eyes.color='hazel';data.set('chats/c/character-dna.json',{version:1,characters:{a,b}});
 await handleCharacterDnaRequest(spindle,{type:'vn_character_dna',action:'merge',chatId:'c',requestId:'merge',characterId:a.id,otherId:b.id,revision:0},'u');const l=await loadCharacterDNALibrary(spindle,'c','u');expect(Object.keys(l.characters)).toEqual(['nadine']);expect(l.characters.nadine?.eyes.color).toBe('hazel');
 const next=l.characters.nadine!;next.hair.style='wavy';await expect(saveCharacterDNA(spindle,'c',next,'u',1)).resolves.toBeDefined();
});
it('rejects stale writes and leaves data untouched on failed persistence',async()=>{
 const{spindle}=fixture();const dna=createEmptyCharacterDNA('Nadine');await saveCharacterDNA(spindle,'c',dna,'u');await expect(saveCharacterDNA(spindle,'c',dna,'u',0)).rejects.toThrow('changed');const set=spindle.userStorage.setJson;spindle.userStorage.setJson=async()=>{throw new Error('disk unavailable');};await expect(saveCharacterDNA(spindle,'c',createEmptyCharacterDNA('Darby'),'u')).rejects.toThrow('disk');spindle.userStorage.setJson=set;expect(Object.keys((await loadCharacterDNALibrary(spindle,'c','u')).characters)).toEqual(['nadine']);
});

it('refuses a pending DNA proposal after the cursor moves within the same reply',async()=>{
 const{spindle,messages}=fixture();const{saveReadingPosition}=await import('./storage.js');const key={chatId:'c',assistantMessageId:'m',sourceFingerprint:'12345678',swipeId:0,revision:0};
 spindle.chat={getMessages:async()=>[{id:'m',swipe_id:0,is_user:false,content:'Nadine enters. Nadine turns away.'}]};spindle.connections={list:async()=>[{id:'writer',provider:'openai',model:'m',is_default:true}]};spindle.generate={raw:async()=>({content:JSON.stringify({changes:[{path:'hair.color',value:'auburn',classification:'generated',sourceRefs:[]}]})})};
 await saveReadingPosition(spindle,{version:1,key,paragraphIndex:1},'u');await handleCharacterDnaRequest(spindle,{type:'vn_character_dna',action:'propose',chatId:'c',requestId:'p',characterName:'Nadine'},'u');const proposal=messages.at(-1)?.message.proposal;expect(proposal).toBeDefined();
 await saveReadingPosition(spindle,{version:1,key,paragraphIndex:0},'u');await handleCharacterDnaRequest(spindle,{type:'vn_character_dna',action:'apply',chatId:'c',requestId:'apply',proposalId:proposal.id,fields:['hair.color']},'u');
 expect(messages.at(-1)?.message.error).toContain('story context changed');expect(Object.keys((await loadCharacterDNALibrary(spindle,'c','u')).characters)).toHaveLength(0);
});
