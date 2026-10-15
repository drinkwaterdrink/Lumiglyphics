import {test,expect} from 'bun:test';
import {normalizeTooltipPreferences,linkEntityMentions,selectReaderDossier,referenceEntries,eligibleEntities} from './dossiers.js';
const entity={id:'m',kind:'npc' as const,name:'Mira',aliases:[],firstParagraph:0,facts:[]};
test('category gates, boundaries, ambiguous names and density preserve prose',()=>{
 const prefs=normalizeTooltipPreferences({enabled:true});
 expect(linkEntityMentions('Mira meets Mirabel.',[entity],prefs)).toEqual([{start:0,end:4,entityId:'m'}]);
 expect(linkEntityMentions('Mira',[entity],normalizeTooltipPreferences({enabled:true,categories:{npcs:false}}))).toEqual([]);
 expect(linkEntityMentions('Mira',[entity,{...entity,id:'other'}],prefs)).toEqual([]);
 expect(linkEntityMentions('`Mira` and Mira',[entity],prefs)).toEqual([{start:11,end:15,entityId:'m'}]);
 expect(linkEntityMentions('Mira',[entity],normalizeTooltipPreferences({}))).toEqual([]);
});
test('dossiers expose observed timed facts only',()=>{
 const key={chatId:'c',assistantMessageId:'m',swipeId:0,sourceFingerprint:'12345678',revision:0};
 const source={provider:'story' as const,recordId:'m',chatId:'c',messageId:'m',sourceFingerprint:'12345678',observedAt:'today'};
 const fact={id:'f',entityId:'m',field:'description',value:'silver hair',visibility:'observed' as const,source,revealedAt:{key,paragraphIndex:0}};
 const snapshot={at:{key,paragraphIndex:0},entities:[{...entity,facts:[fact,{...fact,id:'secret',visibility:'private' as any,value:'hidden'},{...fact,id:'future',value:'later',revealedAt:{key,paragraphIndex:1}}]}],stateByEntity:{},presentEntityIds:[],locationId:null,speakerEntityId:null,drawableEntityId:null};
 expect(selectReaderDossier('m',snapshot,'expanded')?.facts.map(f=>f.value)).toEqual(['silver hair']);
 expect(JSON.stringify(selectReaderDossier('m',snapshot,'expanded'))).not.toMatch(/hidden|later/);
});

test('Unicode offsets, reserved pronouns, pin/suppression and hostile densities stay bounded',()=>{
 const prefs=normalizeTooltipPreferences({enabled:true,maxLinksPerParagraph:999,detail:'expanded'});
 const entities=[{...entity,id:'a',name:'灯台'},{...entity,id:'b',name:'鍵'},{...entity,id:'c',name:'she'}];
 expect(linkEntityMentions('🌙 灯台 and 鍵',entities,prefs)).toEqual([{start:3,end:5,entityId:'a'},{start:10,end:11,entityId:'b'}]);
 expect(linkEntityMentions('she',entities,prefs)).toEqual([]);
 expect(linkEntityMentions('Mira'.repeat(6000),[entity],prefs)).toEqual([]);
 expect(linkEntityMentions('Mira',[entity],normalizeTooltipPreferences({enabled:true,overrides:[{chatId:'chat',kind:'npc',name:'Mira',suppressed:true,pinned:true,note:''}]}),'chat')).toEqual([]);
 expect(linkEntityMentions('Mira',[entity],normalizeTooltipPreferences({enabled:true,overrides:[{chatId:'other',kind:'npc',name:'Mira',suppressed:true,pinned:true,note:''}]}),'chat')).toHaveLength(1);
 expect(prefs.maxLinksPerParagraph).toBe(6);
});

test('category toggles and pin order cannot bypass suppression or density',()=>{
 const entities=[entity,{...entity,id:'p',kind:'place' as const,name:'Garden'},{...entity,id:'o',kind:'object' as const,name:'Key'}];
 for(const [kind,category] of [['npc','npcs'],['place','locations'],['object','objects']] as const) {
  const prefs=normalizeTooltipPreferences({enabled:true,categories:{[category]:false}});
  expect(linkEntityMentions('Mira Garden Key',entities,prefs).some(a=>entities.find(e=>e.id===a.entityId)?.kind===kind)).toBe(false);
 }
 const pinned=normalizeTooltipPreferences({enabled:true,maxLinksPerParagraph:1,overrides:[{chatId:'c',name:'Key',kind:'object',pinned:true}]});
 expect(linkEntityMentions('Mira Garden Key',entities,pinned,'c')).toEqual([{start:12,end:15,entityId:'o'}]);
});

test('first-mention exclusions preserve all known name and alias owners',()=>{
 const prefs=normalizeTooltipPreferences({enabled:true});
 const old={...entity,name:'Rose',aliases:['Red']};
 const newer={...entity,id:'o',kind:'object' as const,name:'Rose',aliases:['Red']};
 expect(linkEntityMentions('Rose Red',[old,newer],prefs,'c',3,[],new Set(['m']))).toEqual([]);
 expect(linkEntityMentions('Mira',[entity],prefs,'c',3,[],new Set(['m']))).toEqual([]);
 const pinned=normalizeTooltipPreferences({enabled:true,overrides:[{chatId:'c',kind:'npc',name:'Mira',pinned:true}]});
 expect(linkEntityMentions('Mira',[entity],pinned,'c',3,[],new Set(['m']))).toHaveLength(1);
});

test('menu-only keeps category-gated reference access while suppressing inline anchors',()=>{
 const prefs=normalizeTooltipPreferences({enabled:true,linking:'menu-only'});
 expect(prefs.linking).toBe('menu-only');expect(linkEntityMentions('Mira',[entity],prefs)).toEqual([]);expect(eligibleEntities([entity],prefs)).toHaveLength(1);
});
test('reference search prioritizes pins and scene entries without revealing future or suppressed entities',()=>{
 const key={chatId:'c',assistantMessageId:'m',swipeId:0,sourceFingerprint:'12345678',revision:0};
 const snapshot:any={at:{key,paragraphIndex:0},entities:[entity,{...entity,id:'away',name:'Rena',aliases:['Fox']},{...entity,id:'future',name:'Later',firstParagraph:1},{...entity,id:'hidden',name:'Hidden'},{...entity,id:'place',kind:'place',name:'Garden'}],presentEntityIds:['m'],locationId:'place',stateByEntity:{away:{presence:'absent'}}};
 const prefs=normalizeTooltipPreferences({enabled:true,overrides:[{chatId:'c',kind:'npc',name:'Rena',pinned:true},{chatId:'c',kind:'npc',name:'Hidden',suppressed:true}]});
 expect(referenceEntries(snapshot,prefs,'','all').map(e=>e.entity.name)).toEqual(['Rena','Garden','Mira']);
 expect(referenceEntries(snapshot,prefs,'fox','npc')[0]!.label).toContain('Not in this scene');expect(referenceEntries(snapshot,prefs,'silver','all')).toEqual([]);
});

test('location names and IDs describe the same current scene conservatively',()=>{
 const snapshot:any={at:{key:{chatId:'c'},paragraphIndex:0},entities:[entity,{id:'garden',kind:'place',name:'Garden',aliases:[],firstParagraph:0,facts:[]},{id:'inn',kind:'place',name:'Inn',aliases:[],firstParagraph:0,facts:[]}],presentEntityIds:['m'],locationId:'garden',stateByEntity:{m:{location:'Garden'}}};
 const prefs=normalizeTooltipPreferences({enabled:true});expect(referenceEntries(snapshot,prefs).find(e=>e.entity.id==='m')!.label).toBe('In this scene');
 snapshot.stateByEntity.m.location='Inn';expect(referenceEntries(snapshot,prefs).find(e=>e.entity.id==='m')!.label).toBe('Elsewhere');
});
