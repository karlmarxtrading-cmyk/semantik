/* Actual production reader and PDF.js with native Canvas/file transport in Node.
 * Page records written to disk are a QA sink, NOT browser IndexedDB durability.
 * No translation inference, browser download, OCR accuracy, or hosting claim.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import * as canvas from '../tools/node_modules/@napi-rs/canvas/index.js';
for(const k of ['DOMMatrix','ImageData','Path2D'])globalThis[k]=canvas[k];
if(!Uint8Array.prototype.toHex)Uint8Array.prototype.toHex=function(){return Buffer.from(this).toString('hex')};
if(!Map.prototype.getOrInsertComputed)Map.prototype.getOrInsertComputed=function(k,f){if(!this.has(k))this.set(k,f(k));return this.get(k)};
if(!Math.sumPrecise)Math.sumPrecise=values=>{let s=0,c=0;for(const x of values){const y=x-c,t=s+y;c=(t-s)-y;s=t;}return s};
globalThis.document={createElement(type){assert.equal(type,'canvas');const c=canvas.createCanvas(1,1);c.style={};c.toBlob=(cb,type='image/png',q=.9)=>cb(new Blob([c.toBuffer(type,type==='image/jpeg'?Math.round(q*100):undefined)],{type}));return c}};
const nativeFetch=globalThis.fetch;globalThis.fetch=async(input,options)=>{const url=String(input?.url||input);if(url.startsWith('file:'))return new Response(await fs.readFile(fileURLToPath(url)));return nativeFetch(input,options)};

const repo=fileURLToPath(new URL('../',import.meta.url));
const activeRoot=process.env.CP20_APP_ROOT?path.resolve(process.env.CP20_APP_ROOT):path.join(repo,'app');
const {openPdf,validatePdf,PDF_LIMITS}=await import(pathToFileURL(path.join(activeRoot,'app/pdf-reader.js')).href);
const input=path.join(repo,'evidence/cp20/qa/byte-fixture/exact-100MiB-inert.pdf');const bytes=await fs.readFile(input);const file=new File([bytes],'exact.pdf',{type:'application/pdf'});const started=performance.now();
assert.equal(file.size,PDF_LIMITS.maxBytes);await validatePdf(file);const reader=await openPdf(file);let doc;try{assert.equal(reader.numPages,1);doc=await reader.extract({startPage:1,endPage:1,bounded:true,includePageImages:false});assert.ok(doc.blocks.some(b=>b.text.includes('input byte boundary')));assert.equal(doc.sourceItemCount,doc.coveredItemCount);}finally{await reader.destroy();}
await assert.rejects(validatePdf(new File([file,'x'],'too-large.pdf',{type:'application/pdf'})),/100 MiB/);
const report={status:'PASS',scope:'Real exact-100MiB PDF open and one digital-page extract; maxBytes+1 rejected before decode. Unreferenced inert stream isolates input file bytes; not scan/image capacity.',inputBytes:file.size,sourceSha256:createHash('sha256').update(bytes).digest('hex'),pages:doc.pages.length,sourceItems:doc.sourceItemCount,coveredItems:doc.coveredItemCount,elapsedMs:performance.now()-started,sourceHashes:Object.fromEntries(await Promise.all(['pdf-reader.js','layout.js'].map(async n=>[n,createHash('sha256').update(await fs.readFile(path.join(activeRoot,'app',n))).digest('hex')])))};await fs.writeFile(path.join(repo,'evidence/cp20/qa/byte-limit.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
