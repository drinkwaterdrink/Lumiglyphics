import {expect,test} from 'bun:test';
import {compileDisplayRules,findReDoSHazard,MAX_DISPLAY_RULE_PATTERN} from './display-rules.js';

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
test('safe rules compile without executing patterns on story content',()=>{
 const result=compileDisplayRules('/[A-Z]+/i => name\n/foo(?:bar)?/g => baz\n/(hi|hey) there/ => $1');
 expect(result.issues).toEqual([]);
 expect(result.rules).toHaveLength(3);
});

test('catastrophic backtracking shapes are rejected at compile time',()=>{
 const result=compileDisplayRules('/(a+)+$/g => replacement\n/[A-Z]+/i => name');
 expect(result.rules).toHaveLength(1);
 expect(result.rules[0]!.pattern.source).toBe('[A-Z]+');
 expect(result.issues.map(i=>i.line)).toEqual([1]);
 expect(result.issues[0]!.message).toMatch(/catastrophic/);
});

test('the ReDoS screen recognizes nested quantifiers and repeated alternation',()=>{
 expect(findReDoSHazard('(a+)+')).toMatch(/catastrophic/);
 expect(findReDoSHazard('(\\w+\\s?)*')).toMatch(/catastrophic/);
 expect(findReDoSHazard('(a|a)*')).toMatch(/catastrophic/);
 expect(findReDoSHazard('(x{2,3})+')).toMatch(/catastrophic/);
 expect(findReDoSHazard('[A-Z][a-z]+?')).toBeNull();
 expect(findReDoSHazard('(?:foo|bar)\\s+\\d+')).toBeNull();
 expect(findReDoSHazard('a+?b*?')).toBeNull();
 expect(findReDoSHazard('[()+*?]')).toBeNull();
});

test('oversized patterns are rejected with a length diagnostic',()=>{
 const result=compileDisplayRules(`${'a'.repeat(MAX_DISPLAY_RULE_PATTERN+1)} => x`);
 expect(result.rules).toHaveLength(0);
 expect(result.issues[0]!.message).toMatch(/1000 characters/);
});
