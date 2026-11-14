// Controlled dependency test of the exact production module (not a browser/PDF decoder test).
// Real pdf-reader.js and layout.js are loaded unmodified in vm.SourceTextModule.
// PDF.js and canvas dependencies expose deterministic page/asset sizes to test accounting.
import vm from 'node:vm';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=path.resolve(import.meta.dirname,'./baseline');
const assetSize=8*1024*1024;
const transform=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
const page=n=>({getViewport:({scale})=>({width:595*scale,height:842*scale,scale,transform:[scale,0,0,-scale,0,842*scale]}),getTextContent:async()=>({items:[{str:`Scientific source page ${n} contains a measurable result.`,transform:[10,0,0,10,40,780],width:350,fontName:'F1'}],styles:{F1:{ascent:0.8,fontFamily:'serif'}}}),getOperatorList:async()=>({fnArray:[],argsArray:[]}),render:()=>({promise:Promise.resolve(),cancel(){}}),cleanup(){}});
const pdf={numPages:17,getPage:async n=>page(n),getMetadata:async()=>({info:{}})};
const fakePdfJs={GlobalWorkerOptions:{},Util:{transform},OPS:{},PasswordResponses:{INCORRECT_PASSWORD:2},AnnotationMode:{DISABLE:0},getDocument:()=>({promise:Promise.resolve(pdf),destroy:async()=>{}})};
const context=vm.createContext({URL,Blob,File,Uint8Array,TextDecoder,DOMException,setTimeout,clearTimeout,console,document:{createElement:type=>({width:0,height:0,getContext:()=>({drawImage(){}}),toBlob:cb=>cb({size:assetSize,type:'image/jpeg'})})}});
const cache=new Map();
async function load(url){
 if(cache.has(url))return cache.get(url);
 let mod;
 if(url.endsWith('/vendor/pdfjs/pdf.min.mjs')){
  mod=new vm.SyntheticModule(Object.keys(fakePdfJs),function(){for(const [k,v] of Object.entries(fakePdfJs))this.setExport(k,v)},{context,identifier:url});
 }else{
  mod=new vm.SourceTextModule(await fs.readFile(fileURLToPath(url),'utf8'),{context,identifier:url,initializeImportMeta:m=>{m.url=url;},importModuleDynamically:async spec=>{const m=await load(new URL(spec,url).href);if(m.status==='unlinked')await m.link(link);if(m.status!=='evaluated')await m.evaluate();return m;}});
 }
 cache.set(url,mod);return mod;
}
const link=async(spec,ref)=>load(new URL(spec,ref.identifier).href);
const module=await load(pathToFileURL(path.join(root,'app/pdf-reader.js')).href);await module.link(link);await module.evaluate();
const reader=await module.namespace.openPdf(new File(['%PDF-1.7\n'], 'fixture.pdf',{type:'application/pdf'}));
const checkpoint=[];let firstError;
try{await reader.extract({onPage:async(page,assets)=>checkpoint.push({page,assets})});}catch(e){firstError=e.message;}
const resumed=await reader.extract({startPage:17,initialReferenceSection:false,initialTextCharacters:checkpoint.reduce((n,p)=>n+p.page.sourceTextCharacters,0)});
const previousBytes=checkpoint.flatMap(p=>p.assets).reduce((n,a)=>n+a.blob.size,0);
const resumedBytes=resumed.assets.reduce((n,a)=>n+a.blob.size,0);
const result={testKind:'Unmodified module with explicit PDF.js/canvas stubs; not real decoding',firstRun:{savedPages:checkpoint.length,bytes:previousBytes,error:firstError},resume:{pages:resumed.pages.length,bytes:resumedBytes,succeeded:true},mergedAssetsBytes:previousBytes+resumedBytes,documentedLimit:module.namespace.PDF_LIMITS.maxAssetsBytes,bypassConfirmed:previousBytes+resumedBytes>module.namespace.PDF_LIMITS.maxAssetsBytes};
if(!result.bypassConfirmed||checkpoint.length!==16)throw new Error('Expected accounting bypass not reproduced');
console.log(JSON.stringify(result,null,2));

