import {expect,test} from 'bun:test';
import {describePictureExplanation} from './picture-explanation.js';
test('missing reasons stay explicitly unrecorded',()=>{expect(describePictureExplanation(undefined)).toBe('Not recorded');expect(describePictureExplanation({version:1,sources:[]})).toContain('Framing: Not recorded');});
test('bounded recorded reasons have human wording',()=>{const text=describePictureExplanation({version:1,cue:{kind:'sprite',paragraphIndex:2},sources:['Saved appearance'],cache:'reused',review:'review',selection:'manual'});expect(text).toContain('Passage: 3');expect(text).toContain('Character portrait');expect(text).toContain('Held for your review');expect(text).toContain('Reused a compatible');});
