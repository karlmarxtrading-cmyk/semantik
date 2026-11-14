/** Publish no durable-save receipt until the storage transaction actually finishes. */
export async function commitWithStatus<T>(commit:()=>Promise<T>,notify:(state:'saving'|'saved'|'failed')=>void):Promise<T>{
 notify('saving');
 try{const result=await commit();notify('saved');return result;}
 catch(error){notify('failed');throw error;}
}
