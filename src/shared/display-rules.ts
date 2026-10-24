export type CustomRegexRule={pattern:RegExp;replacement:string};
export type DisplayRuleIssue={line:number;message:string};

/** Syntax diagnostics only. Compiling a RegExp does not establish execution safety. */
export function compileDisplayRules(input:string|undefined):{rules:CustomRegexRule[];issues:DisplayRuleIssue[]}{
 const rules:CustomRegexRule[]=[],issues:DisplayRuleIssue[]=[];
 for(const [index,line] of (input??'').split(/\r?\n/).entries()){
  const text=line.trim();
  if(!text||text.startsWith('#')||text.startsWith('//'))continue;
  const issue=(message:string)=>issues.push({line:index+1,message});
  let source:string,flags='g',replacement:string;
  if(text.startsWith('/')){
   const match=text.match(/^\/(.+)\/([a-z]*)\s*=>\s*(.*)$/);
   if(!match){issue('Use /pattern/flags => replacement.');continue;}
   source=match[1]!;flags=match[2]||'g';replacement=match[3]??'';
  }else{
   const separator=text.indexOf('=>');
   if(separator<0){issue('Add => between the pattern and its replacement.');continue;}
   source=text.slice(0,separator).trim();replacement=text.slice(separator+2).trim();
   if(!source){issue('Enter a pattern before =>.');continue;}
  }
  try{rules.push({pattern:new RegExp(source,flags),replacement});}
  catch{issue('Invalid pattern or flags. Check brackets, escapes and repeated flags.');}
 }
 return {rules,issues};
}
