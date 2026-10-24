import {expect,test} from 'bun:test';
import {scenarioPersonaSubject} from './scenario-persona.js';
const input={role:'auto' as const,cardName:'Made in Abyss RPG',cardHasIdentity:false,currentName:'Made in Abyss RPG',currentIdentity:'',cueName:'Made in Abyss RPG',visible:['Aleister Crowley'],paragraph:'Aleister Crowley lands in the courtyard.',persona:{name:'Aleister Crowley',description:'black hair, brown eyes'}};
test('unresolved wrapper can picture the declared present persona using only their own description',()=>{
 expect(scenarioPersonaSubject(input)).toEqual({name:'Aleister Crowley',identity:'black hair, brown eyes'});
 expect(scenarioPersonaSubject({...input,role:'scenario',currentName:'Protagonist',cueName:null})).not.toBeNull();
});
test('preserves genuine subjects, explicit Character choice and absent or undescribed personas',()=>{
 for(const patch of [{role:'character' as const},{currentIdentity:'silver hair'},{cardHasIdentity:true},{currentName:'Unknown guard',cueName:'Unknown guard'},{visible:[]},{paragraph:'He remembers Aleister Crowleysworth.'},{persona:{name:'Aleister Crowley',description:''}},{paragraph:'Made in Abyss RPG speaks to Aleister Crowley.'}]){
  expect(scenarioPersonaSubject({...input,...patch})).toBeNull();
 }
});
