import {MODEL_REVIEW_METHOD,type ModelReviewTask} from '../core/model-review';
import {releaseAll,tensorLifetime} from '../core/resource-lifetime';
import {probeCapabilities,requireDirection} from '../core/engine-capabilities';
import * as ort from 'onnxruntime-web/wasm';
import {SentencePieceProcessor} from '@sctg/sentencepiece-js';
import registry from '../model-registry.json';
import {sha256,POLICY,type Direction,type EngineTask,type EngineResult} from '../core/types';
import {decodeModelPart} from '../core/model-delivery';
import {protectedSpans,preservationErrors} from '../core/protection';
import {parentheticalPlan} from '../core/parenthetical-protection';
import {translateUnit} from '../core/translation-unit';
import {maskLiterals,LITERAL_POLICY} from '../core/literal-guard';
ort.env.wasm.numThreads=1;ort.env.wasm.wasmPaths='/runtime/';ort.env.logLevel='error';
let encoder:ort.InferenceSession|undefined,decoder:ort.InferenceSession|undefined,tokenizer:SentencePieceProcessor|undefined,ready:Direction|undefined,vocab:Record<string,number>={},words:string[]=[],fingerprint='',pad=0;
const toB64=(bytes:Uint8Array)=>{let s='';for(let i=0;i<bytes.length;i+=16384)s+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(s);};
async function asset(file:(typeof registry)['id-en']['files'][number],id:string,base:number,total:number){const out=new Uint8Array(file.size);let offset=0,wireDone=0;const cache=await caches.open('semantik-model-v1');for(const part of file.parts){let response=await cache.match(part.path);let bytes:Uint8Array|undefined;if(response){bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length!==part.size||await sha256(bytes)!==part.sha256){await cache.delete(part.path);bytes=undefined;}}
 if(!bytes){response=await fetch(part.path,{credentials:'same-origin',cache:'no-cache'});if(!response.ok||!response.body)throw new Error(`Unduhan model gagal: ${part.path} (${response.status})`);const chunks:Uint8Array[]=[];let n=0;const reader=response.body.getReader();try{while(true){const r=await reader.read();if(r.done)break;n+=r.value.length;if(n>part.size)throw new Error('Ukuran shard model melebihi manifest');chunks.push(r.value);self.postMessage({id,progress:{done:base+wireDone+n,total,label:file.name}});}}finally{reader.releaseLock();}bytes=new Uint8Array(n);let pos=0;for(const c of chunks){bytes.set(c,pos);pos+=c.length;}if(n!==part.size||await sha256(bytes)!==part.sha256)throw new Error(`Hash model tidak cocok: ${part.path}`);await cache.put(part.path,new Response(bytes,{headers:{'Content-Type':'application/octet-stream'}}));}
 const decoded=await decodeModelPart(bytes,part);out.set(decoded,offset);offset+=decoded.length;wireDone+=part.size;self.postMessage({id,progress:{done:base+wireDone,total,label:file.name}});}
 if(await sha256(out)!==file.sha256)throw new Error(`Hash model lengkap gagal: ${file.name}`);return out;}
async function dispose(){
 const oldEncoder=encoder,oldDecoder=decoder,oldTokenizer=tokenizer;
 encoder=decoder=undefined;tokenizer=undefined;ready=undefined;vocab={};words=[];fingerprint='';
 await releaseAll([oldEncoder?()=>oldEncoder.release():undefined,oldDecoder?()=>oldDecoder.release():undefined,oldTokenizer?()=>oldTokenizer.processor.delete():undefined]);
}
async function prepare(direction:Direction,id:string){requireDirection(probeCapabilities(registry,{worker:true,wasm:typeof WebAssembly!=='undefined'}),direction);await dispose();const model=registry[direction];if(!model)throw new Error('Arah model tidak tersedia');const need=['encoder_q8.onnx','decoder_q8.onnx','source.spm','vocab.json'];const files=model.files.filter(f=>need.includes(f.name));const total=files.reduce((a,b)=>a+b.parts.reduce((n,p)=>n+p.size,0),0);let done=0;const assets=new Map<string,Uint8Array>();for(const f of files){assets.set(f.name,await asset(f,id,done,total));done+=f.parts.reduce((n,p)=>n+p.size,0);}
 tokenizer=new SentencePieceProcessor();await tokenizer.loadFromB64StringModel(toB64(assets.get('source.spm')!));vocab=JSON.parse(new TextDecoder().decode(assets.get('vocab.json')!));words=[];for(const [piece,index]of Object.entries(vocab))words[index]=piece;pad=model.padTokenId;self.postMessage({id,progress:{done:total,total,label:'Menyiapkan runtime lokal'}});
 encoder=await ort.InferenceSession.create(assets.get('encoder_q8.onnx')!,{executionProviders:['wasm'],graphOptimizationLevel:'all'});decoder=await ort.InferenceSession.create(assets.get('decoder_q8.onnx')!,{executionProviders:['wasm'],graphOptimizationLevel:'all'});assets.clear();ready=direction;fingerprint=model.fingerprint+'|'+LITERAL_POLICY+'|'+POLICY;return{direction,fingerprint,runtime:'onnxruntime-web 1.23.2 / WASM, 1 thread',model:model.id,maxInputTokens:128,maxOutputTokens:256,supportsAbort:'worker termination',supportsGlossaryConstraints:false,requiresNetworkForInference:false};}
const idsFor=(s:string)=>[...tokenizer!.encodePieces(s).map(p=>Object.hasOwn(vocab,p)?vocab[p]:1),0];
async function infer(text:string,id:string){
 const input=idsFor(text);if(input.length>128)throw new Error(`Segmen ${input.length} token melebihi batas 128; pecah pada batas kalimat. Tidak ada teks yang dipotong.`);
 const owned=tensorLifetime();
 try{
  const inputIds=owned.own(new ort.Tensor('int64',BigInt64Array.from(input,BigInt),[1,input.length]));
  const mask=owned.own(new ort.Tensor('int64',BigInt64Array.from(input,()=>1n),[1,input.length]));
  const enc=await encoder!.run({input_ids:inputIds,attention_mask:mask});Object.values(enc).forEach(t=>owned.own(t));
  const hidden=enc.last_hidden_state,output=[pad];let complete=false;
  for(let step=0;step<256;step++){
   const decoderIds=owned.own(new ort.Tensor('int64',BigInt64Array.from(output,BigInt),[1,output.length]));
   const out=await decoder!.run({input_ids:decoderIds,encoder_hidden_states:hidden,encoder_attention_mask:mask});Object.values(out).forEach(t=>owned.own(t));
   const logits=out.logits.data as Float32Array;let best=0;for(let j=1;j<logits.length;j++)if(j!==pad&&logits[j]>logits[best])best=j;
   owned.release(decoderIds);Object.values(out).forEach(t=>owned.release(t));
   if(best===0){complete=true;break;}output.push(best);self.postMessage({id,tokenProgress:step+1});
  }
  return{text:output.slice(1).map(i=>words[i]||'<unk>').join('').replaceAll('▁',' ').trim(),complete,inputTokens:input.length,outputTokens:output.length-1};
 }finally{owned.close();}
}
function splitForModel(source:string,direction:Direction,knownVariables:ReadonlySet<string>){
 const bounds=[...protectedSpans(source,knownVariables),...parentheticalPlan(source).ranges];
 const segmenter=new Intl.Segmenter(direction==='id-en'?'id':'en',{granularity:'sentence'});
 const parts:string[]=[];let pending='';
 for(const part of segmenter.segment(source)){
  const end=part.index+part.segment.length;
  if(bounds.some(p=>end>p.start&&end<p.end)){pending+=part.segment;continue;}
  const chunk=pending+part.segment;pending='';
  if(idsFor(maskLiterals(parentheticalPlan(chunk).masked,direction,knownVariables).masked).length>128)throw new Error('Satu kalimat melebihi kapasitas model. Gunakan pemisahan sumber yang disengaja; teks tidak dipotong.');
  parts.push(chunk);
 }
 if(pending)parts.push(pending);return parts;
}
async function translateTask(task:EngineTask,id:string):Promise<EngineResult>{
  if(ready!==task.direction||!tokenizer||!encoder||!decoder)throw new Error('Model untuk arah ini belum siap');
  const knownVariables=new Set(protectedSpans(task.sourceText).filter(p=>p.kind==='variable'&&!/^[aAI]$/.test(p.value)).map(p=>p.value));
  let resultText='',inputTokens=0,outputTokens=0,complete=true;
  for(const part of splitForModel(task.sourceText,task.direction,knownVariables)){
   const r=await translateUnit(part.trim(),task.direction,knownVariables,text=>infer(text,id),0,task.sourceText);
   inputTokens+=r.inputTokens;outputTokens+=r.outputTokens;complete&&=r.complete;
   resultText+=r.text+(part.match(/\s+$/)?.[0]||'');if(!complete)break;
  }
  if(complete){const errors=preservationErrors(task.sourceText,resultText);if(errors.length)throw new Error('PROTECTED_MARKER: '+errors.join('; '));}
  const result:EngineResult={...task,targetText:resultText.trim(),finishReason:complete?'complete':'length',engineFingerprint:fingerprint,inputTokens,outputTokens};
  return result;
}
self.onmessage=async({data})=>{
 const {id,action,payload}=data;
 try{
  if(action==='probe'){self.postMessage({id,result:probeCapabilities(registry,{worker:true,wasm:typeof WebAssembly!=='undefined'})});return;}
  if(action==='prepare'){try{self.postMessage({id,result:await prepare(payload,id)});}catch(e){try{await dispose();}catch{}throw e;}return;}
  if(action==='dispose'){await dispose();self.postMessage({id,result:true});return;}
  if(!['translate','review'].includes(action))throw new Error('Perintah mesin tidak dikenal');
  const task:EngineTask|ModelReviewTask=payload;
  if(action==='review'&&(typeof payload.candidateText!=='string'||payload.candidateText.length>100000))throw new Error('Candidate diagnostik tidak valid');
  const translated=await translateTask(task,id);
  const result=action==='review'?{...translated,reviewMethod:MODEL_REVIEW_METHOD,candidateText:payload.candidateText,generatorFingerprint:payload.generatorFingerprint}:translated;
  self.postMessage({id,result});
 }catch(e){
  const diagnostic=e as Error&{rejectedCandidate?:unknown};
  self.postMessage({id,error:String(e),...(payload?.captureRejectionForTest&&diagnostic.rejectedCandidate?{rejectedCandidate:diagnostic.rejectedCandidate}:{})});
 }
};
