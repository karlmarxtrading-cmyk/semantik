import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {analyzeLayout,analyzeLayoutAsync,markRepeatedMetadata} from '../app/app/layout.js';
import {ocrPlan, mergeOcrItems, validateAssetBudget, imageCoverage, PDF_LIMITS} from '../app/app/pdf-reader.js';
const checks=[]; const test=(name,fn)=>{fn();checks.push({name,status:'PASS'});};
const item=(text,x=40,y=100,index=0)=>({text,x,y,width:400,height:12,fontSize:12,baseline:y+12,sourceIndex:index});
for(const variable of ['x','𝑥'])for(const op of ['<','>','≤','≥','='])test(`formula ${variable} ${op}`,()=>{
 const b=analyzeLayout([item(`||${variable} − 4| − 4| ${op} 1`)]).blocks[0];assert.equal(b.type,'formula');assert.equal(b.translatable,false);assert.equal(b.text,`||${variable} − 4| − 4| ${op} 1`);
});
test('Formula in normal prose is not a whole frozen block',()=>assert.equal(analyzeLayout([item('Solve the inequality |x| < 2.')]).blocks[0].translatable,true));
test('Table prose remains translatable; source cells/bboxes kept',()=>{
 const a=[{...item('Treatment',40,100,0),width:60},{...item('Result',300,100,1),width:50},{...item('Control',40,120,2),width:60},{...item('10 mg',300,120,3),width:50}];
 const b=analyzeLayout(a).blocks[0];assert.equal(b.type,'table');assert.equal(b.translatable,true);assert.deepEqual(b.rows,[['Treatment','Result'],['Control','10 mg']]);assert.equal(b.cellBboxes.length,2);assert.equal(b.sourceItemIds.length,4);
});
test('Mixed long-digital page does not skip image region OCR',()=>{
 const r=ocrPlan([item('Digital '.repeat(90))],{regions:[{bbox:[40,257,515,515]}]}, {width:595,height:842});assert.ok(r.textCharacters>=400);assert.equal(r.useOCR,true);assert.equal(r.fullPage,false);assert.equal(r.regions[0].status,'ocr-required');
});
test('Digital page without images avoids OCR',()=>assert.equal(ocrPlan([item('Scientific findings are carefully reported.')],{regions:[]},{width:595,height:842}).useOCR,false));
test('Small uncovered image is explicit unresolved region',()=>assert.equal(ocrPlan([item('Scientific findings are carefully reported.')],{regions:[{bbox:[0,0,20,20]}]},{width:595,height:842}).regions[0].status,'unresolved-small-region'));
test('Mixed merge preserves exact digital text; OCR region coordinates/provenance retained',()=>{
 const r=mergeOcrItems([{...item('Digital correct string',40,100),width:180}],[{...item('Digital',0,0,0),width:30},{...item('Scan',0,30,1),width:30}],[40,100]);assert.equal(r.length,2);assert.equal(r[0].text,'Digital correct string');assert.equal(r[1].text,'Scan');assert.equal(r[1].y,130);assert.equal(r[1].source,'ocr');assert.equal(r[1].sourceIndex,1);
});
const makeAsset=(n,size=8*1024*1024)=>({path:`assets/halaman-${n}.jpg`,blob:{size}});
test('128 MiB boundary matches after resume',()=>{const a=Array.from({length:16},(_,i)=>makeAsset(i));assert.equal(validateAssetBudget(a),PDF_LIMITS.maxAssetsBytes);assert.throws(()=>validateAssetBudget([...a,makeAsset(16)]),{code:'PDF_ASSET_LIMIT'});assert.equal(validateAssetBudget([...a,a[0]]),PDF_LIMITS.maxAssetsBytes)});
test('Conflicting/invalid checkpoint asset rejected',()=>{assert.throws(()=>validateAssetBudget([makeAsset(1),makeAsset(1,5)]));assert.throws(()=>validateAssetBudget([{path:'../../x',blob:{size:1}}]));});
test('Only repeated margin metadata is annotated, with all IDs/provenance kept',()=>{
 const blocks=[{id:'a',page:1,type:'paragraph',text:'https://example.org/article 1/2',bbox:[40,800,400,12]},{id:'b',page:2,type:'paragraph',text:'https://example.org/article 2/2',bbox:[40,800,400,12]},{id:'c',page:1,type:'paragraph',text:'Repeated scientific claim 10 mg.',bbox:[40,300,400,12]},{id:'d',page:2,type:'paragraph',text:'Repeated scientific claim 10 mg.',bbox:[40,300,400,12]}];
 const doc=markRepeatedMetadata({pages:[{number:1,height:842},{number:2,height:842}],blocks});assert.equal(doc.blocks.length,4);assert.deepEqual(doc.blocks[0].runningMetadata.sourceBlockIds,['a','b']);assert.equal(doc.blocks[1].runningMetadata.firstOccurrence,false);assert.equal(doc.blocks[2].runningMetadata,undefined);
});
const timings=[];
for(const count of [1000,5000,20000]){const a=Array.from({length:count},(_,i)=>({text:'x',x:i*.02,y:100,baseline:101,width:.01,height:1,fontSize:1,sourceIndex:i}));const start=performance.now();const r=analyzeLayout(a);const ms=performance.now()-start;assert.equal(r.coveredItemCount,count);timings.push({count,ms,coveredItemCount:r.coveredItemCount});}
await assert.rejects(imageCoverage({getOperatorList:async()=>({fnArray:Array(200001),argsArray:[]})},{width:595,height:842},{OPS:{},Util:{}},undefined),{code:'PDF_OPERATOR_LIMIT'});checks.push({name:'Declared operator-count limit rejects before scan',status:'PASS'});
const c=new AbortController();c.abort();await assert.rejects(analyzeLayoutAsync([item('Example')],{},{signal:c.signal}),{name:'AbortError'});checks.push({name:'Pre-aborted layout does not run',status:'PASS'});
// Boundary double verifies worker is lazy and abort terminates it; not real browser proof.
let created=0,terminated=0;globalThis.Worker=class{constructor(){created++}postMessage(){}terminate(){terminated++}};
assert.equal(created,0);const a=new AbortController(),pending=analyzeLayoutAsync([item('Example')],{},{signal:a.signal});assert.equal(created,1);a.abort();await assert.rejects(pending,{name:'AbortError'});assert.equal(terminated,1);delete globalThis.Worker;checks.push({name:'Worker transport double: abort terminates in-flight layout',status:'PASS'});
const result={method:'Current production module pure functions; explicit Worker boundary double. No real browser or device performance claim.',checks,timings};await fs.writeFile(new URL('../evidence/pdf/layout-after.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
