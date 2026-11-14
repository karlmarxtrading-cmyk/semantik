/** Release every resource even if another release fails. The caller clears its
 * owning references first, so an interrupted cleanup can never advertise READY. */
export async function releaseAll(resources:(undefined|(()=>unknown|Promise<unknown>))[]){
 const outcomes=await Promise.allSettled(resources.filter((f):f is ()=>unknown|Promise<unknown>=>!!f).map(f=>Promise.resolve().then(f)));
 const failed=outcomes.find((r):r is PromiseRejectedResult=>r.status==='rejected');
 if(failed)throw failed.reason;
}
export function tensorLifetime(){
 const resources=new Set<{dispose:()=>void}>();
 return {own<T extends {dispose:()=>void}>(r:T):T{resources.add(r);return r;},
  release(r:{dispose:()=>void}){if(resources.delete(r))r.dispose();},
  close(){let failure:unknown;for(const r of resources){try{r.dispose();}catch(e){failure??=e;}}resources.clear();if(failure)throw failure;}};
}
