import {protectedSpans,preservationErrors} from './protection';
import {mathTerminologySpans,TERMINOLOGY_POLICY} from './math-terminology';
import type {Direction} from './types';

export const LITERAL_POLICY='ordered-xml-literals-v11-dash-separators-'+TERMINOLOGY_POLICY;
/** Keep a complete numeric expression in one opaque marker instead of dozens of tokens.
 * No prose, variable names, conditions or units may be swallowed by this grouping. */
export function literalSpans(source:string,knownVariables:ReadonlySet<string>=new Set()){
 let spans=protectedSpans(source,knownVariables);
 // Editorial separators are structure, not prose or an invented list bullet.
 // Opaque formulas/code already own their spans; never overlap those ranges.
 for(const m of source.matchAll(/(?<=\s)[—–](?=\s)/gu)){
  const start=m.index!,end=start+m[0].length;
  if(!spans.some(p=>start<p.end&&end>p.start))spans.push({start,end,value:m[0],kind:'markup'});
 }
 // Bounded algebra grammar: implicit multiplication and function calls, with
 // at most two parenthesis levels. Multi-letter words and units remain prose.
 const number=String.raw`\d+(?:[.,]\d+)*`;
 const letter=String.raw`[A-Za-z](?![\p{L}\p{N}_])`;
 const op=String.raw`[ \t]*(?:[+*/=×÷−<>≤≥≠≈]|-(?!>))[ \t]*`;
 let term=String.raw`[−-]?(?:${number}(?:${letter})?|${letter})`;
 for(let depth=0;depth<2;depth++){
  const inner=String.raw`${term}(?:${op}${term})*`;
  term=String.raw`[−-]?(?:(?:${number}|[A-Za-z])?\(${inner}\)(?:${letter})?|${number}(?:${letter})?|${letter})`;
 }
 const numericExpression=new RegExp(String.raw`(?<![\p{L}\p{N}_])${term}(?:${op}${term})+(?![\p{L}\p{N}_])`,'gu');
 for(const m of source.matchAll(numericExpression)){
  const start=m.index!,end=start+m[0].length,overlap=spans.filter(p=>p.start<end&&p.end>start);
  let depth=0,balanced=true;for(const ch of m[0]){if(ch==='(')depth++;if(ch===')'&&--depth<0){balanced=false;break;}}if(depth!==0)balanced=false;
  if(!balanced||overlap.length<2||overlap.some(p=>p.start<start||p.end>end||!['number','operator','variable'].includes(p.kind)&&!(p.kind==='markup'&&p.value==='*')))continue;
  spans=spans.filter(p=>!overlap.includes(p));spans.push({start,end,value:m[0],kind:'arithmetic'});
 }
 return spans.sort((a,b)=>a.start-b.start);
}
export function maskLiterals(source:string,direction?:Direction,knownVariables:ReadonlySet<string>=new Set(),context=source){
  const spans=[...literalSpans(source,knownVariables),...(direction?mathTerminologySpans(source,direction,context):[])].sort((a,b)=>a.start-b.start);
  // Adjacent protected pieces form one indivisible run. Never bridge prose or
  // a line break. This reduces marker loss in equations and compound IDs while
  // retaining each byte and each source-bound terminology replacement.
  const groups:{start:number;end:number;replacement:string}[]=[];
  for(const p of spans){
    const replacement='replacement' in p?String(p.replacement):p.value,last=groups.at(-1);
    if(last&&p.start<last.end)throw new Error('PROTECTED_SPAN_OVERLAP');
    const gap=last?source.slice(last.end,p.start):'';
    if(last&&/^[ \t–—-]*$/.test(gap)){last.replacement+=gap+replacement;last.end=p.end;}
    else groups.push({start:p.start,end:p.end,replacement});
  }
  const replacements=groups.map(p=>p.replacement);
  // Select a namespace absent from source, including hostile marker-looking prose.
  let prefix='x';while(source.includes('<'+prefix))prefix+='x';
  const markers=groups.map((_,i)=>`<${prefix}${i}/>`);
  let masked='',cursor=0;
  groups.forEach((p,i)=>{masked+=source.slice(cursor,p.start)+markers[i];cursor=p.end;});
  masked+=source.slice(cursor);
  return {source,masked,spans,groups,markers,prefix,replacements,knownVariables};
}
export function restoreLiterals(plan:ReturnType<typeof maskLiterals>,candidate:string){
  let previousEnd=0;
  const ranges=plan.markers.map(marker=>{
    const first=candidate.indexOf(marker);
    if(first<0||candidate.indexOf(marker,first+1)>=0)throw new Error('PROTECTED_MARKER: penanda hilang/duplikat; target ditolak');
    if(first<previousEnd)throw new Error('PROTECTED_MARKER: urutan/overlap penanda berubah; target ditolak');
    previousEnd=first+marker.length;return {start:first,end:previousEnd};
  });
  let target='',cursor=0,unmasked='';
  ranges.forEach((p,i)=>{const gap=candidate.slice(cursor,p.start);target+=gap+plan.replacements[i];unmasked+=gap;cursor=p.end;});
  target+=candidate.slice(cursor);unmasked+=candidate.slice(cursor);
  if(unmasked.includes('<'+plan.prefix))throw new Error('PROTECTED_MARKER: penanda tambahan/berubah; target ditolak');
  const errors=preservationErrors(plan.source,target,{knownVariables:plan.knownVariables});
  if(errors.length)throw new Error('PROTECTED_MARKER: '+errors.join('; '));
  return target;
}
