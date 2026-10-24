import {expect, test} from 'bun:test';
import {promptRevisionSummary} from './prompt-revision.js';

test('reports field changes when the combined count is unchanged',()=>{
  expect(promptRevisionSummary({prompt:'abcd',negative:'xx'},{prompt:'abcdef',negative:''})).toEqual({
    before:6,after:6,delta:0,positive:{before:4,after:6,changed:true},negative:{before:2,after:0,changed:true},
  });
});
test('uses the editor character metric without trimming or claiming semantic preservation',()=>{
  const text={prompt:' A 🌙\n',negative:' '};
  const result=promptRevisionSummary(text,text);
  expect(result.before).toBe(text.prompt.length+text.negative.length);
  expect(result.positive.changed).toBe(false);
  expect(result.negative.changed).toBe(false);
  expect(promptRevisionSummary(text,{prompt:'A',negative:''}).delta).toBe(1-result.before);
});
