import {expect,test} from 'bun:test';
import {retainedSceneEvidence,changedSceneEvidence} from './prompt-scene-evidence.js';

test('captures only short complete scene fields still present in the editing source',()=>{
 const action='Mira hands Jon the sealed letter.';
 const composition='Mira stands left of Jon.';
 expect(retainedSceneEvidence(`${action}\n${composition}`,{action,composition})).toEqual([{field:'action',text:action},{field:'composition',text:composition}]);
 expect(retainedSceneEvidence('Mira walks away.',{action,composition})).toEqual([]);
 expect(retainedSceneEvidence(action,{action,composition:'x'.repeat(401)})).toHaveLength(1);
 expect(retainedSceneEvidence(action,undefined)).toEqual([]);
});
test('does not borrow partial matches, very short labels or metadata missing from a manual edit',()=>{
 expect(retainedSceneEvidence('She is misunderstanding the map.',{action:'understanding the map',composition:'wide'})).toEqual([]);
 expect(retainedSceneEvidence('Jon hands Mira the sealed letter.',{action:'Mira hands Jon the sealed letter.'})).toEqual([]);
});
test('reports exact wording changes without rejecting valid paraphrases or claiming semantic equivalence',()=>{
 const evidence=retainedSceneEvidence('Mira hands Jon the sealed letter.',{action:'Mira hands Jon the sealed letter.'});
 expect(changedSceneEvidence(evidence,'Mira gives the sealed letter to Jon.')).toEqual(evidence);
 expect(changedSceneEvidence(evidence,'Mira hands Jon the sealed letter. Rain falls.')).toEqual([]);
 expect(changedSceneEvidence([], 'Anything')).toEqual([]);
});
