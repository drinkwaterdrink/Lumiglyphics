import {expect,test} from 'bun:test';
import {promptWriterFields} from './prompt-writer-fields.js';
test('alternate names are unambiguous and missing negative text preserves supplied constraints',()=>{
 expect(promptWriterFields({positive:'A scene',negative:null},'no watermark')).toEqual({prompt:'A scene',negativePrompt:'no watermark'});
 expect(promptWriterFields({prompt:' A scene ',positive_prompt:'A scene',negative_prompt:'blur',notes:'A shorter description.'},'old')).toEqual({prompt:'A scene',negativePrompt:'blur'});
});
test('unknown visual fields and competing alternatives cannot be silently flattened',()=>{
 expect(()=>promptWriterFields({prompt:'A scene',lighting:'Moonlight'},'')).toThrow('unexpected fields');
 expect(()=>promptWriterFields({prompt:'A scene',positive:'Another scene'},'')).toThrow('conflicting');
 expect(()=>promptWriterFields([{prompt:'A scene'}],'')).toThrow('one JSON object');
 expect(()=>promptWriterFields({prompt:{scene:'A scene'}},'')).toThrow('must be text');
});
test('supports Ideogram Direct JSON objects directly and nested in prompt',()=>{
 const direct = { high_level_description: 'A scene description', style_description: { aesthetics: 'photo' } };
 expect(promptWriterFields(direct, 'no blur')).toEqual({ prompt: JSON.stringify(direct), negativePrompt: '' });

 const nested = { prompt: direct, negativePrompt: 'should be cleared' };
 expect(promptWriterFields(nested, 'no blur')).toEqual({ prompt: JSON.stringify(direct), negativePrompt: '' });
});
