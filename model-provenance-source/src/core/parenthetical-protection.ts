import {protectedSpans} from './protection';

/** Keep prose asides as explicit translation units. Never move an aside, invent
 * one, split inside a formula/code span, or silently repair unbalanced input. */
export function parentheticalPlan(source:string){
 const opaque=protectedSpans(source).filter(p=>['formula','code','url','html','placeholder','link-destination','interval'].includes(p.kind));
 const ranges:{start:number;end:number;inner:string}[]=[];
 let depth=0,start=-1,unbalanced=false;
 for(let i=0;i<source.length;i++){
  const skip=opaque.find(p=>i>=p.start&&i<p.end);if(skip){i=skip.end-1;continue;}
  if(source[i]==='('){if(depth===0)start=i;depth++;}
  if(source[i]===')'){
   if(depth===0){unbalanced=true;continue;}
   if(--depth===0){
    const inner=source.slice(start+1,i);
    let prose=inner;for(const p of [...protectedSpans(inner)].reverse())prose=prose.slice(0,p.start)+' '.repeat(p.end-p.start)+prose.slice(p.end);
    if(/\p{L}{2}/u.test(prose)&&!/^\s*(?:mm|cm|km|m|kg|g|mg|s|ms|h|Hz|Pa|N|J|W|V)\s*$/.test(prose))ranges.push({start,end:i+1,inner});
   }
  }
 }
 if(depth||unbalanced)ranges.length=0;
 let prefix='pcl';while(source.includes('<'+prefix))prefix+='x';
 const markers=ranges.map((_,i)=>`<${prefix}${i}/>`);
 let masked='',cursor=0;
 ranges.forEach((p,i)=>{masked+=source.slice(cursor,p.start)+markers[i];cursor=p.end;});masked+=source.slice(cursor);
 return {source,masked,ranges,markers,prefix};
}
export function restoreParentheticals(plan:ReturnType<typeof parentheticalPlan>,candidate:string,targets:string[]){
 if(targets.length!==plan.ranges.length)throw new Error('PARENTHETICAL_MARKER: jumlah klausa tidak cocok');
 let result='',cursor=0;
 for(let i=0;i<plan.markers.length;i++){
  const marker=plan.markers[i],at=candidate.indexOf(marker);
  if(at<cursor||candidate.indexOf(marker,at+1)>=0)throw new Error('PARENTHETICAL_MARKER: klausa hilang, berulang, atau berpindah urutan');
  const inner=plan.ranges[i].inner,left=inner.match(/^\s*/)?.[0]??'',right=inner.match(/\s*$/)?.[0]??'';
  result+=candidate.slice(cursor,at)+'('+left+targets[i].trim()+right+')';cursor=at+marker.length;
 }
 result+=candidate.slice(cursor);
 if(result.includes('<'+plan.prefix))throw new Error('PARENTHETICAL_MARKER: penanda tambahan');
 return result;
}
