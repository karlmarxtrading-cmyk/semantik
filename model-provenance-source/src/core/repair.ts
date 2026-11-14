/** Retry only rejected protected-marker candidates. Never commit a failed attempt. */
export async function withMarkerRepair<T>(attempt:()=>Promise<T>, options:{cancelled?:()=>boolean;onRepair?:(number:number)=>void;maxRepairs?:number}={}):Promise<T>{
 const max=options.maxRepairs??2;
 if(!Number.isInteger(max)||max<0||max>2)throw new Error('Batas repair tidak valid');
 for(let n=0;;n++){
  if(options.cancelled?.())throw new Error('Proses dibatalkan');
  try{return await attempt();}catch(error){
   if(!String(error).includes('PROTECTED_MARKER:')||n>=max||options.cancelled?.())throw error;
   options.onRepair?.(n+1);
  }
 }
}
