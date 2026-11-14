import type {Direction} from './types';
import {maskLiterals,restoreLiterals} from './literal-guard';
import {preservationErrors} from './protection';
import {parentheticalPlan,restoreParentheticals} from './parenthetical-protection';
import {relativeClausePlan,restoreRelativeClauses} from './relative-clause-protection';

export type InferenceText={text:string;complete:boolean;inputTokens:number;outputTokens:number};
/** The same actual model translates the outer sentence and each protected aside.
 * This is structural preservation, not a second-model or human semantic review. */
export async function translateUnit(source:string,direction:Direction,knownVariables:ReadonlySet<string>,infer:(text:string)=>Promise<InferenceText>,depth=0,context=source):Promise<InferenceText>{
 if(depth>4)throw new Error('SOURCE_COMPLEXITY: kedalaman klausa melebihi batas; sumber tidak dipotong');
 const clauses=parentheticalPlan(source),targets:string[]=[];
 let inputTokens=0,outputTokens=0;
 for(const part of clauses.ranges){
  const r=await translateUnit(part.inner.trim(),direction,knownVariables,infer,depth+1,context);
  inputTokens+=r.inputTokens;outputTokens+=r.outputTokens;
  if(!r.complete)return {text:'',complete:false,inputTokens,outputTokens};
  targets.push(r.text);
 }
 const relatives=relativeClausePlan(clauses.masked.trim(),direction),relativeTargets:string[]=[];
 for(const part of relatives.ranges){
  const child=await translateUnit(part.predicate,direction,knownVariables,infer,depth+1,context);
  inputTokens+=child.inputTokens;outputTokens+=child.outputTokens;
  if(!child.complete)return {text:'',complete:false,inputTokens,outputTokens};
  relativeTargets.push(child.text);
 }
 const literals=maskLiterals(relatives.masked,direction,knownVariables,context),r=await infer(literals.masked);
 inputTokens+=r.inputTokens;outputTokens+=r.outputTokens;
 if(!r.complete)return {text:'',complete:false,inputTokens,outputTokens};
 try{
  const text=restoreParentheticals(clauses,restoreRelativeClauses(relatives,restoreLiterals(literals,r.text),relativeTargets),targets);
  const errors=preservationErrors(source,text,{knownVariables});
  if(errors.length)throw new Error('PROTECTED_MARKER: '+errors.join('; '));
  return {text,complete:true,inputTokens,outputTokens};
 }catch(e){
  throw Object.assign(new Error(String(e)),{rejectedCandidate:{sourcePart:source,maskedSource:literals.masked,rawTarget:r.text,markers:literals.markers}});
 }
}
