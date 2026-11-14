import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright/package.json'));
const {chromium}=require('playwright');
const out=path.dirname(new URL(import.meta.url).pathname);
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage();
const logs=[];page.on('console',m=>logs.push({type:m.type(),text:m.text()}));page.on('pageerror',e=>logs.push({type:'pageerror',text:String(e)}));
try{
 await page.goto('http://127.0.0.1:8783/');
 const result=await page.evaluate(async()=>{
  const base='/source/r/7a8e787a497535f5/app/';
  const [{openPdf,ocrPlan,validateAssetBudget},{createMarkdown,markdownText}]=await Promise.all([import(base+'pdf-reader.js'),import(base+'export.js')]);
  const response=await fetch('/evidence/pdf_math/mathematics_fixture.pdf');
  const file=new File([await response.arrayBuffer()],'mathematics_fixture.pdf',{type:'application/pdf'});
  const reader=await openPdf(file);
  try{
   const document=await reader.extract({layout:'auto'});
   const doc={...document,sourceLanguage:'en',targetLanguage:'id'};
   const job={file,document:doc,status:'extracted',config:{source:'en',target:'id'}};
   const sourceMarkdown=createMarkdown(job,'source');
   const stripped={...doc,assets:doc.assets.map(a=>({...a,blob:{size:a.blob.size,type:a.blob.type}})),pages:doc.pages.map(p=>({...p,imageBlob:{size:p.imageBlob.size,type:p.imageBlob.type}}))};
   const header=Array.from({length:8},(_,i)=>({text:'The metadata and title cover only the digital part of this page.',x:10,y:10+i*15,width:500,height:12,sourceIndex:i}));
   const mixedPlan=ocrPlan(header,{regions:[{bbox:[0,250,595,450]}]},{width:595,height:842});
   let assetOverflow;try{validateAssetBudget(Array.from({length:17},(_,i)=>({path:`assets/page-${i+1}.jpg`,blob:{size:8*1024*1024}})));assetOverflow={rejected:false};}catch(e){assetOverflow={rejected:true,code:e.code,message:e.message};}
   return {kind:'Actual Chromium + bundled PDF.js + CP18 openPdf/extract + createMarkdown(source); no translation model invoked',document:stripped,sourceMarkdown,inlineLatex:markdownText('The estimator is $\\hat\\beta=(X^TX)^{-1}X^Ty$.'),mixedPlan,assetOverflow};
  }finally{await reader.destroy();}
 });
 result.browser=await browser.version();result.logs=logs;
 await fs.writeFile(path.join(out,'math_browser_extraction.json'),JSON.stringify(result,null,2));
 await fs.writeFile(path.join(out,'MATHEMATICS_ACTUAL_SOURCE_EXPORT.md'),result.sourceMarkdown);
 console.log(JSON.stringify({browser:result.browser,blocks:result.document.blocks.map(b=>({id:b.id,type:b.type,text:b.text,issues:b.issues,assetPath:b.assetPath})),inlineLatex:result.inlineLatex,mixedPlan:result.mixedPlan,assetOverflow:result.assetOverflow,logs},null,2));
}finally{await browser.close();}
