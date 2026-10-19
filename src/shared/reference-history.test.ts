import {test,expect} from 'bun:test';
import {ReferenceHistorySchema,referenceHistoryFor} from './reference-history.js';
import {normalizeTooltipPreferences,referenceEntriesWithHistory,dossierWithHistory,selectReaderDossier,selectEarlierDossier} from './dossiers.js';
const target={chatId:'c',assistantMessageId:'new',swipeId:0,sourceFingerprint:'12345678',revision:0};
const source={...target,assistantMessageId:'old'};
const entry={sourceKey:source,replyNumber:1,reference:{kind:'npc' as const,name:'Mira',field:'appearance' as const,value:'silver hair',evidence:'Mira has silver hair.',paragraphIndex:2}};
const history=ReferenceHistorySchema.parse({version:1,target,targetReplyNumber:3,entries:[entry,{...entry,reference:{...entry.reference,name:'Rowan',evidence:'Rowan has silver hair.'}}],truncated:false});
const snapshot={at:{key:target,paragraphIndex:0},entities:[{id:'m',name:'Mira',kind:'npc' as const,aliases:[],firstParagraph:0,facts:[]}],stateByEntity:{},presentEntityIds:['m'],locationId:null,speakerEntityId:null,drawableEntityId:null};
test('history payload rejects current/future/foreign facts and a replaced target',()=>{
 expect(referenceHistoryFor(history,{...target,revision:1})).toBeUndefined();
 for(const invalid of [{sourceKey:target},{replyNumber:3},{sourceKey:{...source,chatId:'other'}},{reference:{...entry.reference,field:'owner'}}])expect(ReferenceHistorySchema.safeParse({...history,entries:[{...entry,...invalid}]}).success).toBe(false);
});
test('earlier facts are separate from current facts and earlier-only menu entries have no state',()=>{
 const prefs=normalizeTooltipPreferences({enabled:true,detail:'expanded'}),dossier=selectReaderDossier('m',snapshot,'expanded')!;
 const combined=dossierWithHistory(dossier,snapshot,prefs,history);
 expect(combined.facts).toEqual([]);expect(combined.earlier?.map(e=>e.reference.value)).toEqual(['silver hair']);
 const entries=referenceEntriesWithHistory(snapshot,prefs,history);expect(entries.map(e=>e.entity.name)).toEqual(['Mira','Rowan']);
 const rowan=selectEarlierDossier(entries[1]!.entity.id,snapshot,prefs,history)!;expect(rowan.state).toEqual({});expect(rowan.entity.facts).toEqual([]);expect(rowan.earlier).toHaveLength(1);
});
test('history obeys opt-out, categories and field groups and never grants a new alias match',()=>{
 for(const options of [{rememberReferences:false},{categories:{npcs:false}},{fieldGroups:{appearance:false}}]){
  const prefs=normalizeTooltipPreferences({enabled:true,...options});
  expect(dossierWithHistory(selectReaderDossier('m',snapshot,'expanded')!,snapshot,prefs,history).earlier??[]).toEqual([]);
  expect(referenceEntriesWithHistory({...snapshot,entities:[]},prefs,history)).toEqual([]);
 }
 const renamed={...snapshot,entities:[{...snapshot.entities[0]!,name:'MIRA',aliases:['Mira']}]};
 expect(dossierWithHistory(selectReaderDossier('m',renamed,'expanded')!,renamed,normalizeTooltipPreferences({enabled:true}),history).earlier??[]).toEqual([]);
});
