import {expect,test} from 'bun:test';
import expected from './fixtures/expected.json';
import {goldenOutputs} from './fixtures/golden-inputs.js';
import {getPromptSerializer} from './index.js';
import {PromptDialectIdSchema} from '../../../shared/image-prompt-profile-v2.js';
test('all 11 dialect keys retain reviewed wording, negatives, references and framing',()=>{const outputs=goldenOutputs();expect(Object.keys(outputs)).toHaveLength(44);expect(outputs).toEqual(expected);});
test('serializer registry intentionally aliases NovelAI to Anima and has eleven implementations',()=>{expect(getPromptSerializer('novelai')).toBe(getPromptSerializer('anima'));expect(new Set(PromptDialectIdSchema.options.map(getPromptSerializer)).size).toBe(11);});
test('golden prompts retain identity and budget invariants alongside exact wording',()=>{for(const [key,value]of Object.entries(goldenOutputs())){expect(value.prompt.length).toBeGreaterThan(20);if(key.endsWith('/long'))expect(value.prompt.length+value.negativePrompt.length).toBeLessThanOrEqual(1800);if(key.endsWith('/ensemble')){expect(value.prompt).toContain('Mira');expect(value.prompt).toContain('Jo');}if(key.endsWith('/solo')||key.endsWith('/long')){// Tag dialects intentionally identify a solo person by traits rather than a name.
if(!/^(anima|novelai|generic-tags)\//.test(key))expect(value.prompt).toContain('Mira');expect(value.prompt.toLowerCase()).toContain('silver');expect(value.prompt).toContain('green coat');}}});
