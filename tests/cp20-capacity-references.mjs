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
const {openPdf}=await import(pathToFileURL(path.join(activeRoot,'app/pdf-reader.js')).href);
const rows=[];
for(const name of ['cp20-reference-followed-by-chapter.pdf','cp20-reference-midbook.pdf']){
 const bytes=await fs.readFile(path.join(repo,'tests/fixtures',name));const reader=await openPdf(new File([bytes],name,{type:'application/pdf'}));let reference=false,chars=0,all=[];
 try{for(let n=1;n<=reader.numPages;n++){const doc=await reader.extract({startPage:n,endPage:n,bounded:true,includePageImages:false,initialReferenceSection:reference,initialTextCharacters:chars});reference=doc.pages[0].referenceSection;chars+=doc.pages[0].sourceTextCharacters;all.push(...doc.blocks);}
 if(name.includes('followed')){const target=all.find(b=>b.page===2&&b.text.includes('This chapter examines the rates'));assert.ok(target);assert.equal(target.type,'paragraph');assert.equal(target.translatable,true);}
 else{for(const p of [2,5]){const target=all.find(b=>b.page===p&&b.type==='paragraph');assert.ok(target,`body page ${p}`);assert.equal(target.translatable,true);}
 const continuation=all.find(b=>b.page===4&&b.text.includes('Brown'));assert.equal(continuation.type,'reference');assert.equal(continuation.translatable,false);const items=all.filter(b=>b.page===2&&b.type==='list-item');assert.equal(items.length,3);assert.deepEqual(items.slice(0,2).map(b=>b.list.start),[1,2]);}
 rows.push({name,status:'PASS',sha256:createHash('sha256').update(bytes).digest('hex'),pages:reader.numPages,blocks:all});
 }catch(e){rows.push({name,status:'FAIL',error:e.stack,blocks:all});}finally{await reader.destroy();}
}
const report={scope:'Actual PDF.js and production bounded reader; original audit fixture plus new arbitrary-heading/midbook references/list control. Native Canvas; no inference/browser/OCR claim.',sourceHashes:Object.fromEntries(await Promise.all(['pdf-reader.js','layout.js'].map(async n=>[n,createHash('sha256').update(await fs.readFile(path.join(activeRoot,'app',n))).digest('hex')]))),rows};
await fs.writeFile(path.join(repo,'evidence/cp20/qa/reference-real-parser.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(rows.map(r=>({name:r.name,status:r.status,error:r.error})),null,2));if(rows.some(r=>r.status==='FAIL'))process.exitCode=1;
