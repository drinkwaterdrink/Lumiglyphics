import {expect,test} from 'bun:test';
import {normalizeConfig} from '../config.js';
import {sharedStyleSnapshot,SharedStyleSnapshotSchema} from './shared-style-snapshot.js';
import {BUILTIN_SHARED_STYLES} from './image-styles.js';

test('captures exact configured wording and direct template uses without recursive expansion',()=>{
 const config=normalizeConfig({selectedSharedStyleId:'',promptPrefix:'Ink {{suffix}}',promptSuffix:'Paper texture',negativePrompt:'logo'});
 const template={...config.imageTemplates[0]!,positive:'{{style}} {{style}}',negative:'{{style}} {{negative}}'};
 const saved=sharedStyleSnapshot(config,template);
 expect(saved.prefix).toEqual({text:'Ink {{suffix}}',characters:14,shortened:false,positiveOccurrences:2,negativeOccurrences:1});
 expect(saved.suffix.positiveOccurrences).toBe(0);
 expect(saved.negative.negativeOccurrences).toBe(1);
 expect(saved.presetId).toBe('');
 expect(SharedStyleSnapshotSchema.safeParse(saved).success).toBe(true);
});
test('records explicit preset association and customization without guessing older selections',()=>{
 const style=BUILTIN_SHARED_STYLES.find(style=>style.id==='builtin-style:anime')!;
 const config=normalizeConfig({selectedSharedStyleId:style.id,promptPrefix:style.positive,promptSuffix:style.suffix,negativePrompt:style.negative});
 const template=config.imageTemplates[0]!;
 expect(sharedStyleSnapshot(config,template).matchesPreset).toBe(true);
 expect(sharedStyleSnapshot({...config,promptPrefix:'My ink style'},template).matchesPreset).toBe(false);
 expect(sharedStyleSnapshot({...config,selectedSharedStyleId:null},template).presetName).toBeNull();
 expect(sharedStyleSnapshot({...config,selectedSharedStyleId:'removed-style'},template).matchesPreset).toBeNull();
});
test('bounds display snapshots without changing original configuration or claiming truncated wording is complete',()=>{
 const config=normalizeConfig({promptPrefix:'x'.repeat(5000)});
 const snapshot=sharedStyleSnapshot(config,config.imageTemplates[0]!);
 config.promptPrefix='New style';
 expect(snapshot.prefix.text.length).toBe(4000);
 expect(snapshot.prefix.characters).toBe(5000);
 expect(snapshot.prefix.shortened).toBe(true);
 expect(SharedStyleSnapshotSchema.safeParse({...snapshot,prefix:{...snapshot.prefix,shortened:false}}).success).toBe(false);
});
