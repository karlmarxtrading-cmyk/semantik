/* Current PDF.js + production reader; native Canvas stand-in for browser canvas.
 * No browser/OCR-model claim: Tesseract browser transport is not exercised here.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import * as canvas from '../tools/node_modules/@napi-rs/canvas/index.js';
for(const k of ['DOMMatrix','ImageData','Path2D'])globalThis[k]=canvas[k];
if(!Uint8Array.prototype.toHex)Uint8Array.prototype.toHex=function(){return Buffer.from(this).toString('hex')};
if(!Map.prototype.getOrInsertComputed)Map.prototype.getOrInsertComputed=function(k,f){if(!this.has(k))this.set(k,f(k));return this.get(k)};
globalThis.document={createElement(type){assert.equal(type,'canvas');const c=canvas.createCanvas(1,1);c.style={};c.toBlob=(cb,type='image/png',q=.9)=>{try{cb(new Blob([c.toBuffer(type,type==='image/jpeg'?Math.round(q*100):undefined)],{type}))}catch(e){console.error(e);cb(null)}};return c}};
// Node 24 transport shims for modern browser APIs, declared in the report.
if(!Math.sumPrecise)Math.sumPrecise=values=>{let s=0,c=0;for(const x of values){const y=x-c,t=s+y;c=(t-s)-y;s=t;}return s};
const nativeFetch=globalThis.fetch;globalThis.fetch=async(input,options)=>{const url=String(input?.url||input);if(url.startsWith('file:'))return new Response(await fs.readFile(fileURLToPath(url)));return nativeFetch(input,options)};
const {openPdf,validatePdf,imageCoverage,ocrPlan}=await import('../app/app/pdf-reader.js');

const dir=fileURLToPath(new URL('../previous-source-qa/tests/fixtures/',import.meta.url));
const bytes=await fs.readFile(path.join(dir,'references-continuation.pdf'));const r=await openPdf(new File([bytes],'refs.pdf',{type:'application/pdf'}));const d=await r.extract();console.log(JSON.stringify(d.blocks,null,2));await r.destroy();