import {expect,test} from 'bun:test';
import {compileDisplayRules} from './display-rules.js';

test('invalid slash rules never fall back to an unrelated plain pattern',()=>{
 const result=compileDisplayRules('# Example\n/foo/gg => bar\n/[/g => hidden\nvalid => kept');
 expect(result.rules).toHaveLength(1);
 expect(result.rules[0]!.pattern.source).toBe('valid');
 expect(result.issues.map(i=>i.line)).toEqual([2,3]);
});
test('rule diagnostics preserve source lines, comments and deliberate empty replacement',()=>{
 const result=compileDisplayRules('\n// comment\n/secret/gi =>\nfoo => bar => baz\nmissing separator\n => empty pattern');
 expect(result.rules).toHaveLength(2);
 expect(result.rules[0]!.replacement).toBe('');
 expect(result.rules[1]!.replacement).toBe('bar => baz');
 expect(result.issues.map(i=>i.line)).toEqual([5,6]);
});
test('syntax validation compiles without executing patterns on story content',()=>{
 const result=compileDisplayRules('/(a+)+$/g => replacement\n/[A-Z]+/i => name');
 expect(result.issues).toEqual([]);
 expect(result.rules).toHaveLength(2);
});
