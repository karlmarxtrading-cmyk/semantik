import fs from 'node:fs/promises';import path from 'node:path';import {pathToFileURL,fileURLToPath} from 'node:url';import{createRequire}from'node:module';
const here=path.dirname(fileURLToPath(import.meta.url)),release=path.resolve(here,'../../source/r/7a8e787a497535f5');
const require=createRequire(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'@napi-rs/canvas/package.json'));const canvas=require('@napi-rs/canvas');for(const key of ['DOMMatrix','ImageData','Path2D'])globalThis[key]=canvas[key];
if(!Uint8Array.prototype.toHex)Object.defineProperty(Uint8Array.prototype,'toHex',{value(){return Buffer.from(this).toString('hex');}});
if(!Map.prototype.getOrInsertComputed)Object.defineProperty(Map.prototype,'getOrInsertComputed',{value(k,fn){if(!this.has(k))this.set(k,fn(k));return this.get(k);}});
if(!Map.prototype.getOrInsert)Object.defineProperty(Map.prototype,'getOrInsert',{value(k,v){if(!this.has(k))this.set(k,v);return this.get(k);}});
if(!Math.sumPrecise)Math.sumPrecise=function(values){let s=0,c=0;for(const x of values){const t=s+x;c+=Math.abs(s)>=Math.abs(x)?(s-t)+x:(x-t)+s;s=t;}return s+c;};
try{
 const pdfjs=await import(pathToFileURL(path.join(release,'vendor/pdfjs/pdf.min.mjs')).href);pdfjs.GlobalWorkerOptions.workerSrc=pathToFileURL(path.join(release,'vendor/pdfjs/pdf.worker.min.mjs')).href;
 const{normalizeItems,imageCoverage,ocrPlan}=await import(pathToFileURL(path.join(release,'app/pdf-reader.js')).href);
 const task=pdfjs.getDocument({data:new Uint8Array(await fs.readFile(path.join(here,'repeated_images_fixture.pdf'))),isEvalSupported:false,standardFontDataUrl:path.join(release,'vendor/pdfjs/standard_fonts/'),useSystemFonts:false});const pdf=await task.promise,page=await pdf.getPage(1),viewport=page.getViewport({scale:1}),ops=await page.getOperatorList();
 const names=Object.fromEntries(Object.entries(pdfjs.OPS).map(([k,v])=>[v,k]));const imageOperators=ops.fnArray.map((id,i)=>({op:names[id],args:ops.argsArray[i]})).filter(x=>/Image|Form/.test(x.op));
 const items=normalizeItems(await page.getTextContent(),viewport,pdfjs);const images=await imageCoverage(page,viewport,pdfjs);const plan=ocrPlan(items,images,viewport);
 const result={scope:'Bundled PDF.js operator list + actual CP18 imageCoverage/ocrPlan in Node with standard API shims; no OCR engine invoked.',pdfjsVersion:pdfjs.version,items,imageOperators,images,plan};await fs.writeFile(path.join(here,'repeated_image_result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await task.destroy();
}catch(e){console.error(e.name+': '+e.message);process.exitCode=1;}
