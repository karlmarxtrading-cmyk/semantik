import {uid} from './types';
export class WorkerClient{
 worker:Worker|undefined;
 pending=new Map<string,{resolve:(r:any)=>void;reject:(e:Error)=>void;progress?:(r:any)=>void}>();
 constructor(private factory:()=>Worker){}
 private start(){const w=this.factory();w.onmessage=({data})=>{const p=this.pending.get(data.id);if(!p)return;if(data.progress||data.tokenProgress){p.progress?.(data.progress||{tokens:data.tokenProgress});return;}this.pending.delete(data.id);if(data.error)p.reject(new Error(data.error));else p.resolve(data.result);};w.onerror=()=>this.reset('Worker berhenti. Hasil committed tetap tersimpan. Siapkan mesin lalu lanjutkan.');return w;}
 call<T=any>(action:string,payload:any,progress?:(r:any)=>void):Promise<T>{const id=uid();return new Promise((resolve,reject)=>{try{this.worker??=this.start();this.pending.set(id,{resolve,reject,progress});this.worker.postMessage({id,action,payload});}catch(e){this.pending.delete(id);reject(new Error('Worker tidak tersedia atau gagal dimulai. Gunakan browser yang mendukung Web Worker. '+String(e)));}});}
 reset(reason='Proses dibatalkan'){this.worker?.terminate();this.worker=undefined;for(const p of this.pending.values())p.reject(new Error(reason));this.pending.clear();}
}
