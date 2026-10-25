import {expect,test} from 'bun:test';
import {sharedStylePreparation} from './shared-style-preparation.js';
import {sharedStyleSnapshot} from '../../shared/shared-style-snapshot.js';
import {normalizeConfig} from '../../config.js';

test('older requests never borrow a style label or wording from current settings',()=>{
 expect(sharedStylePreparation(undefined).rows).toEqual([]);
 expect(sharedStylePreparation(undefined).notes.join(' ')).toContain('unavailable');
});
test('shows saved words, direct placeholder use and customized preset association',()=>{
 const config=normalizeConfig({selectedSharedStyleId:'builtin-style:anime',promptPrefix:'My ink style',promptSuffix:'Paper grain',negativePrompt:'logo'});
 const snapshot=sharedStyleSnapshot(config,{positive:'{{style}} {{style}}',negative:'{{negative}}'});
 const view=sharedStylePreparation(snapshot);
 expect(view.rows[0]?.value).toContain('(customized)');
 expect(view.rows.find(row=>row.label==='Style prefix')?.value).toContain('My ink style');
 expect(view.rows.find(row=>row.label==='Style prefix')?.value).toContain('positive ×2');
 expect(view.rows.find(row=>row.label==='Suffix')?.value).toContain('Not referenced');
 expect(view.notes.join(' ')).toContain('customized');
 expect(view.notes.join(' ')).toContain('final prompt');
});
test('describes truncated display data and unset versus unknown preset choices honestly',()=>{
 const config=normalizeConfig({selectedSharedStyleId:'',promptPrefix:'x'.repeat(5000)});
 const snapshot=sharedStyleSnapshot(config,config.imageTemplates[0]!);
 expect(sharedStylePreparation(snapshot).notes.join(' ')).toContain('4,000 of 5,000');
 expect(sharedStylePreparation(snapshot).rows[0]?.value).toBe('No preset selected');
 expect(sharedStylePreparation({...snapshot,presetId:null}).rows[0]?.value).toContain('not recorded');
 expect(sharedStylePreparation({...snapshot,presetId:'removed'}).rows[0]?.value).toContain('label unavailable');
});
