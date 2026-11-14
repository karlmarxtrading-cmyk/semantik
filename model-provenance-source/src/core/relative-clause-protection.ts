import {protectedSpans} from './protection';
import type {Direction} from './types';

/** A deliberately bounded copular relative-clause grammar. Preserve a positive
 * restrictive clause before an explicit main-clause modal. Ambiguous/nested
 * clauses stay with the model and QA rather than being silently reparsed. */
export function relativeClausePlan(source:string,direction:Direction){
 const ranges:{start:number;end:number;inner:string;predicate:string}[]=[];
 const opaque=protectedSpans(source);
 if(direction==='en-id'){
  const re=/\b(?:that|which|who)\s+(?:are|is)\s+((?:(?:a|an|the|prime|natural|real|rational|irrational|positive|negative|specific)\s+){0,3}(?:cats?|dogs?|pets?|integers?|numbers?|points?|lines?|planes?|members?|elements?|students?))(?=\s+(?:cannot|can|must|may|might|will|would|should|could)\b)/giu;
  for(const m of source.matchAll(re)){
   const start=m.index!,end=start+m[0].length,left=source.slice(0,start).trimEnd();
   if(!/[\p{L}]$/u.test(left)||/\b(?:given|assuming|provided|suppose|know|believe|decide|ask|say)\s*$/i.test(left))continue;
   if(/\b(?:not|never|that|which|who)\b/i.test(m[0].replace(/^(?:that|which|who)\s+/i,'')))continue;
   if(opaque.some(p=>start<p.end&&end>p.start))continue;
   ranges.push({start,end,inner:m[0],predicate:m[1]});
  }
 }
 let prefix='rcl';while(source.includes('<'+prefix))prefix+='x';
 const markers=ranges.map((_,i)=>`<${prefix}${i}/>`);let masked='',cursor=0;
 ranges.forEach((r,i)=>{masked+=source.slice(cursor,r.start)+markers[i];cursor=r.end;});masked+=source.slice(cursor);
 return {source,masked,ranges,markers,prefix};
}
export function restoreRelativeClauses(plan:ReturnType<typeof relativeClausePlan>,candidate:string,targets:string[]){
 if(targets.length!==plan.ranges.length)throw new Error('RELATIVE_CLAUSE_MARKER: jumlah klausa tidak cocok');
 let result='',cursor=0;
 for(let i=0;i<plan.markers.length;i++){
  const marker=plan.markers[i],at=candidate.indexOf(marker);
  if(at<cursor||candidate.indexOf(marker,at+1)>=0||!targets[i].trim())throw new Error('RELATIVE_CLAUSE_MARKER: klausa hilang, berulang, kosong atau berpindah urutan');
  // These ranges have a positive present-tense nominal predicate. Explicit
  // grammatical transfer avoids translating relative "that" as demonstrative
  // "itu". The noun phrase itself still goes through the actual model.
  result+=candidate.slice(cursor,at)+'yang merupakan '+(plan.ranges[i].predicate[0]===plan.ranges[i].predicate[0].toLowerCase()?targets[i].trim()[0].toLowerCase()+targets[i].trim().slice(1):targets[i].trim());cursor=at+marker.length;
 }
 result+=candidate.slice(cursor);
 if(result.includes('<'+plan.prefix))throw new Error('RELATIVE_CLAUSE_MARKER: penanda tambahan');
 return result;
}
