import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const here=path.dirname(fileURLToPath(import.meta.url));
const release=path.resolve(here,'../../source/r/7a8e787a497535f5');
const require=createRequire(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'@napi-rs/canvas/package.json'));
const canvas=require('@napi-rs/canvas');
for(const key of ['DOMMatrix','ImageData','Path2D'])globalThis[key]=canvas[key];
if(!Uint8Array.prototype.toHex)Object.defineProperty(Uint8Array.prototype,'toHex',{value(){return Buffer.from(this).toString('hex');}});
if(!Map.prototype.getOrInsertComputed)Object.defineProperty(Map.prototype,'getOrInsertComputed',{value(key,callback){if(!this.has(key))this.set(key,callback(key));return this.get(key);}});
if(!Map.prototype.getOrInsert)Object.defineProperty(Map.prototype,'getOrInsert',{value(key,value){if(!this.has(key))this.set(key,value);return this.get(key);}});
if(!Math.sumPrecise)Math.sumPrecise=function(values){let sum=0,correction=0;for(const x of values){const t=sum+x;if(Math.abs(sum)>=Math.abs(x))correction+=(sum-t)+x;else correction+=(x-t)+sum;sum=t;}return sum+correction;};
try{
 const pdfjs=await import(pathToFileURL(path.join(release,'vendor/pdfjs/pdf.min.mjs')).href);
 pdfjs.GlobalWorkerOptions.workerSrc=pathToFileURL(path.join(release,'vendor/pdfjs/pdf.worker.min.mjs')).href;
 const [{normalizeItems,imageCoverage,ocrPlan,validateAssetBudget},{analyzeLayout},{createMarkdown,markdownText}]=await Promise.all([
  import(pathToFileURL(path.join(release,'app/pdf-reader.js')).href),
  import(pathToFileURL(path.join(release,'app/layout.js')).href),
  import(pathToFileURL(path.join(release,'app/export.js')).href)
 ]);
 const data=new Uint8Array(await fs.readFile(path.join(here,'mathematics_fixture.pdf')));
 const task=pdfjs.getDocument({data,isEvalSupported:false,useSystemFonts:false,disableFontFace:false,stopAtErrors:true,enableXfa:false,maxImageSize:-1,standardFontDataUrl:path.join(release,'vendor/pdfjs/standard_fonts/'),cMapUrl:path.join(release,'vendor/pdfjs/cmaps/'),cMapPacked:true,wasmUrl:path.join(release,'vendor/pdfjs/wasm/')});
 const pdf=await task.promise;
 const pages=[],blocks=[],allItems=[];
 for(let i=1;i<=pdf.numPages;i++){
  const page=await pdf.getPage(i),viewport=page.getViewport({scale:1});
  const content=await page.getTextContent({includeMarkedContent:false,disableNormalization:false});
  const items=normalizeItems(content,viewport,pdfjs),layout=analyzeLayout(items,{pageNumber:i,width:viewport.width,height:viewport.height,layout:'auto',source:'pdf-text'});
  const images=await imageCoverage(page,viewport,pdfjs);
  allItems.push({page:i,items});blocks.push(...layout.blocks);pages.push({number:i,width:viewport.width,height:viewport.height,source:'pdf-text',blocks:layout.blocks,columnCount:layout.columnCount,images,warnings:layout.warnings});
 }
 const metadata=(await pdf.getMetadata()).info;
 const doc={numPages:pdf.numPages,pages,blocks,assets:[],sourceLanguage:'en',targetLanguage:'id',metadata:{title:metadata.Title},warnings:pages.flatMap(p=>p.warnings)};
 const job={file:{name:'mathematics_fixture.pdf'},document:doc,status:'extracted',config:{source:'en',target:'id'}};
 const sourceMarkdown=createMarkdown(job,'source');
 const header=Array.from({length:8},(_,i)=>({text:'The metadata and title cover only the digital part of this page.',x:10,y:10+i*15,width:500,height:12,sourceIndex:i}));
 const mixedPlan=ocrPlan(header,{regions:[{bbox:[0,250,595,450]}]},{width:595,height:842});
 let assetOverflow;try{validateAssetBudget(Array.from({length:17},(_,i)=>({path:`assets/page-${i+1}.jpg`,blob:{size:8*1024*1024}})));assetOverflow={rejected:false};}catch(e){assetOverflow={rejected:true,code:e.code,message:e.message};}
 const result={testScope:'Actual uploaded CP18 PDF.js parser, normalizeItems, analyzeLayout and source Markdown exporter in Node. DOMMatrix/ImageData/Path2D from @napi-rs/canvas plus Uint8Array.toHex, Map.getOrInsertComputed/getOrInsert and compensated Math.sumPrecise are environment shims. No browser, render/OCR, or translation model was used; source PDF was rendered separately with Poppler for visual verification.',pdfjsVersion:pdfjs.version,document:doc,allItems,sourceMarkdown,inlineLatex:markdownText('The estimator is $\\hat\\beta=(X^TX)^{-1}X^Ty$.'),mixedPlan,assetOverflow};
 await fs.writeFile(path.join(here,'math_node_extraction.json'),JSON.stringify(result,null,2));
 await fs.writeFile(path.join(here,'MATHEMATICS_ACTUAL_SOURCE_EXPORT.md'),sourceMarkdown);
 console.log(JSON.stringify({pdfjsVersion:result.pdfjsVersion,blocks:blocks.map(b=>({id:b.id,type:b.type,text:b.text,issues:b.issues})),inlineLatex:result.inlineLatex,mixedPlan,assetOverflow},null,2));
 await task.destroy();
}catch(e){console.error(e.name+': '+e.message);process.exitCode=1;}
