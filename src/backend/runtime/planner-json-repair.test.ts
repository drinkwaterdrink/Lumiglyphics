import {expect,test} from 'bun:test';
import {repairJsonString} from './planner.js';

function parseRepaired(input:string){
 return JSON.parse(repairJsonString(input));
}

test('quotes followed by structural delimiters close the string',()=>{
 const repaired=repairJsonString('{"a":"x", "b": [ "y" ] , "c":{"z":"w"}}');
 expect(JSON.parse(repaired)).toEqual({a:'x',b:['y'],c:{z:'w'}});
});

test('unescaped inner quotes are escaped while real closing quotes survive',()=>{
 const input='{"choices":[{"submission":"I say "Wait, who?" with surprise.","label":"Ask"}]}';
 const parsed=parseRepaired(input);
 expect(parsed.choices[0].submission).toContain('Wait, who?');
 expect(parsed.choices[0].label).toBe('Ask');
});

test('a quote followed only by whitespace/end closes the string instead of being escaped',()=>{
 expect(parseRepaired('{"a":"x"  ')).toEqual({a:'x'});
 expect(parseRepaired('{"a":"x"')).toEqual({a:'x'});
});

test('comma-followed values: quoted key, bracket, string, number, literals all close the quote',()=>{
 const input='{"a":"1", "b":2, "c":"s", "d":true, "e":false, "f":null, "g":{"k":"v"}, "h":[1], "i":"-3"}';
 expect(parseRepaired(input)).toEqual({a:'1',b:2,c:'s',d:true,e:false,f:null,g:{k:'v'},h:[1],i:'-3'});
});

test('raw control characters inside strings are escaped',()=>{
 const parsed=parseRepaired('{"description":"line one\nline two\ttabbed\r\nend"}');
 expect(parsed.description).toBe('line one\nline two\ttabbed\r\nend');
});

test('python literals, single-quoted keys, comments and trailing commas are normalized',()=>{
 const input=`{
  // a comment
  'name': True,
  'other': False,
  'missing': None,
  unquoted: 1,
  "list": [1, 2, 3,],
 } /* block */`;
 expect(parseRepaired(input)).toEqual({name:true,other:false,missing:null,unquoted:1,list:[1,2,3]});
});

test('F8: repair of long responses with many inner quotes stays linear (no quadratic tail copies)',()=>{
 const items=Array.from({length:3000},(_,index)=>`{"s":"character says "word ${index}" and continues walking down the corridor"}`);
 const input=`{"items":[${items.join(',')}]}`;
 const started=performance.now();
 const repaired=repairJsonString(input);
 const elapsed=performance.now()-started;
 const parsed=JSON.parse(repaired);
 expect(parsed.items).toHaveLength(3000);
 expect(parsed.items[0].s).toContain('word 0');
 // The old slice()+trimStart()-per-quote implementation allocated hundreds of
 // megabytes of tail copies on this input and ran for seconds. 2 s leaves a
 // wide margin over the O(n) index-table walk while still catching regressions.
 expect(elapsed).toBeLessThan(2000);
});
