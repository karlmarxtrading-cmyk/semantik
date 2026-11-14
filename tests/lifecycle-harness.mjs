// Executes the actual audited main.js in a VM; browser/IDB boundaries are explicit doubles.
// This is logic evidence, not a live-browser or BFCache compatibility test.
import vm from 'node:vm';
import * as longDocument from '../app/app/long-document.js';
import * as metadataLanguage from '../app/app/metadata-language.js';
import {markRepeatedMetadata} from '../app/app/layout.js';
import {readFile} from 'node:fs/promises';
const ROOT = new URL('../app/', import.meta.url);
export async function loadMain({checkpoint: cp={},translation={},locks,exporter={},offline={},sourcePath}={}) {
  const nodes=new Map(), listeners=new Map(), writes=[];
  class El {
    constructor(tag='div'){this.tagName=tag;this.children=[];this.options=[];this.value='';this.textContent='';this.hidden=false;this.disabled=false;this.dataset={};this.open=false;this.checked=false;this.classList={add(){},remove(){},toggle(){}};this.handlers=new Map();this.firstElementChild={textContent:''};}
    addEventListener(k,f){const a=this.handlers.get(k)||[];a.push(f);this.handlers.set(k,a);}
    removeEventListener(){}
    append(...x){this.children.push(...x);this.lastElementChild=this.children.at(-1);}
    replaceChildren(...x){this.children=x;this.options=x;this.lastElementChild=x.at(-1);}
    querySelectorAll(){return [];}
    setAttribute(k,v){this[k]=v;}
    removeAttribute(k){delete this[k];}
    focus(){}
    showModal(){queueMicrotask(()=>{this.returnValue='yes';for(const f of this.handlers.get('close')||[])f();this.handlers.delete('close');});}
  }
  const element=id=>{if(!nodes.has(id))nodes.set(id,new El());return nodes.get(id);};
  element('target-language').value='id';element('source-language').value='en';element('layout-mode').value='auto';
  const document={getElementById:element,createElement:t=>new El(t),body:new El('body'),activeElement:null};
  const window={isSecureContext:true,addEventListener(k,f){const a=listeners.get(k)||[];a.push(f);listeners.set(k,a);}};
  const lockManager=locks||{request:async(name,options,callback)=>callback({name})};
  const checkpoint={};
  for(const name of ['getCheckpointInfo','loadCheckpoint','createCheckpoint','beginExtraction','saveExtractedPage','saveExtraction','clearTranslations','saveCheckpointMeta','saveBlock','deleteCheckpoint','claimCheckpoint','saveSnapshot','commitPage','saveStreamSummary','loadPage','iteratePages']) {
    checkpoint[name]=cp[name]||async function(...args){writes.push({name,args:structuredClone(args)});return null;};
  }
  const translationImpl={detectLanguage:()=> 'en',auditTranslation:()=>[],Translator:class{async prepare(){}async translate(text){return {text:'Translated '+text,status:'translated',issues:[]};}cancel(){}},...translation};
  const context=vm.createContext({document,window,navigator:{onLine:true,locks:lockManager},location:{protocol:'https:'},console,URL,AbortController,DOMException,Worker:class{},WebAssembly,DecompressionStream,Promise,Set,Map,WeakMap,Date,setTimeout,clearTimeout,queueMicrotask,structuredClone,Blob,TextEncoder,TextDecoder,crypto:globalThis.crypto});
  const synthetic=(name,values)=>new vm.SyntheticModule(Object.keys(values),function(){for(const[k,v]of Object.entries(values))this.setExport(k,v);},{context,identifier:name});
  const buildModule=synthetic('build',{BUILD_INFO:{release:'cp18-test',version:'0.18.0',sourceHash:'test'}});await buildModule.link(()=>{});await buildModule.evaluate();
  const offlineModule=synthetic('offline',{waitForOfflineWorker:async()=>({}),prepareOfflineAssets:async()=>{},...offline});await offlineModule.link(()=>{});await offlineModule.evaluate();
  const exportModule=synthetic('export',{exportDocument:async()=>({}),...exporter});await exportModule.link(()=>{});await exportModule.evaluate();
  const layoutModule=synthetic('layout',{markRepeatedMetadata});await layoutModule.link(()=>{});await layoutModule.evaluate();
  const pdfModule=synthetic('pdf',{validateAssetBudget:()=>0,openPdf:async()=>({numPages:1,destroy:async()=>{}})});await pdfModule.link(()=>{});await pdfModule.evaluate();
  const longModule=synthetic('long-document',longDocument);await longModule.link(()=>{});await longModule.evaluate();
  const metadataModule=synthetic('metadata-language',metadataLanguage);await metadataModule.link(()=>{});await metadataModule.evaluate();
  const storageModule=synthetic('storage',checkpoint);const transModule=synthetic('translation',translationImpl);
  await storageModule.link(()=>{});await storageModule.evaluate();await transModule.link(()=>{});await transModule.evaluate();
  let code=await readFile(sourcePath||new URL('app/main.js',ROOT),'utf8');
  code+='\nexport {state,save,meta,stats,readConfig,editBlock,correctSource,flushEdits,acquireDocumentLock,releaseDocumentLock,run,runNow,extract,renderResults,resultPage,displayFile,selectFileNow,resumeNow,retrySave,clearDocumentNow,download,completed,prepareOffline};\n';
  const mod=new vm.SourceTextModule(code,{context,identifier:new URL('app/main.js',ROOT).href,importModuleDynamically:async spec=>{if(spec==='./offline.js')return offlineModule;if(spec==='./export.js')return exportModule;if(spec==='./translation.js')return transModule;if(spec==='./pdf-reader.js')return pdfModule;if(spec==='./layout.js')return layoutModule;throw Error('Unexpected dynamic import '+spec);}});
  await mod.link(spec=>{if(spec==='./storage.js')return storageModule;if(spec==='./build-info.js')return buildModule;if(spec==='./long-document.js')return longModule;if(spec==='./metadata-language.js')return metadataModule;throw Error('Unexpected import '+spec);});await mod.evaluate();await Promise.resolve();
  return {api:mod.namespace,nodes,element,listeners,writes,checkpoint,context,async event(name,event={}){for(const f of listeners.get(name)||[])await f(event);}};
}
