/** Independent minimal PDF fixture: standard PDF fonts, explicit glyph positions
 * and stroked operators. No geometry output is injected into the parser. */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {extractMathVectors,reconstructMath} from '../app/app/math-geometry.js';
const out=new URL('../evidence/cp20/math/',import.meta.url);await fs.mkdir(out,{recursive:true});
const ops=`BT /F1 16 Tf 50 720 Td (y =) Tj ET
BT /F2 20 Tf 100 720 Td (\\326) Tj ET
BT /F1 16 Tf 114 720 Td (x + 1) Tj ET
0.8 w 111 738 m 151 738 l S
BT /F1 16 Tf 160 620 Td (y = x) Tj ET
1 w 153 637 m 143 633 143 625 153 621 c S
BT /F1 16 Tf 50 520 Td (z = t) Tj ET
BT /F1 16 Tf 99 520 Td (\\(2\\)) Tj ET
BT /F1 12 Tf 50 420 Td (This PDF tests geometric reconstruction, not translation quality.) Tj ET
`;
const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>','<< /Type /Font /Subtype /Type1 /BaseFont /Symbol >>',`<< /Length ${Buffer.byteLength(ops)} >>\nstream\n${ops}endstream`];
let pdf='%PDF-1.7\n',offsets=[0];for(const [i,obj]of objects.entries()){offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${obj}\nendobj\n`};const start=Buffer.byteLength(pdf);pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;const bytes=Buffer.from(pdf);await fs.writeFile(new URL('CP20_MATH_CONTROL.pdf',out),bytes);
const require=createRequire(new URL('../tools/package.json',import.meta.url));const canvas=require('@napi-rs/canvas');for(const k of ['DOMMatrix','ImageData','Path2D'])globalThis[k]=canvas[k];
if(!Uint8Array.prototype.toHex)Uint8Array.prototype.toHex=function(){return Buffer.from(this).toString('hex')};
if(!Map.prototype.getOrInsertComputed)Map.prototype.getOrInsertComputed=function(k,f){if(!this.has(k))this.set(k,f(k));return this.get(k)};
if(!Map.prototype.getOrInsert)Map.prototype.getOrInsert=function(k,v){if(!this.has(k))this.set(k,v);return this.get(k)};
if(!Math.sumPrecise)Math.sumPrecise=vs=>[...vs].reduce((a,b)=>a+b,0);
const pdfjs=await import('../app/vendor/pdfjs/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc=new URL('../app/vendor/pdfjs/pdf.worker.min.mjs',import.meta.url).href;
const {normalizeItems}=await import('../app/app/pdf-reader.js');
const task=pdfjs.getDocument({data:new Uint8Array(bytes),isEvalSupported:false,useSystemFonts:false,disableFontFace:false,stopAtErrors:true,enableXfa:false,standardFontDataUrl:new URL('../app/vendor/pdfjs/standard_fonts/',import.meta.url).pathname});const doc=await task.promise,page=await doc.getPage(1),viewport=page.getViewport({scale:1});const items=normalizeItems(await page.getTextContent(),viewport,pdfjs),vectors=extractMathVectors(await page.getOperatorList(),viewport,pdfjs.OPS),result=reconstructMath(items,vectors);
const checks=[];function test(name,fn){try{fn();checks.push({name,status:'PASS'})}catch(e){checks.push({name,status:'FAIL',error:e.message});process.exitCode=1}}
test('real-PDF-square-root',()=>{const r=result.regions.find(r=>r.sourceText.includes('√'));assert(r);assert.equal(r.latex?.replace(/\s+/g,''),'y=\\sqrt{x+1}');assert.equal(r.verified,true);assert.equal(r.vectorIds.length,1)});
test('real-PDF-curved-brace-retained-as-uncertain',()=>{const r=result.regions.find(r=>r.sourceText.replace(/\s/g,'').includes('y=x'));assert(r);assert.equal(r.verified,false);assert.equal(r.latex,null);assert(r.warnings.includes('unresolved-nearby-vector-curve'))});
test('real-PDF-separate-equation-label-not-flattened',()=>{const r=result.regions.find(r=>r.sourceText.includes('z = t'));assert(r);assert.equal(r.verified,false);assert(r.warnings.includes('equation-label-needs-layout-context'))});
test('real-PDF-source-caption-remains-unconsumed',()=>assert(result.remainingItems.some(i=>i.text.startsWith('This PDF'))));
const katex=require('katex');let renderedRoot='';test('actual-root-LaTeX-accepted-by-target-KaTeX',()=>{renderedRoot=katex.renderToString(result.regions[0].latex,{displayMode:true,throwOnError:true,trust:false});assert(renderedRoot.includes('sqrt'))});
await task.destroy();
const sha=b=>createHash('sha256').update(b).digest('hex');const report={scope:'Actual PDF.js parser on independent synthetic PDF generated from literal text/path operators; source preservation and geometry only. No browser/OCR/semantic quality claim.',sourceSha256:sha(await fs.readFile(new URL('../app/app/math-geometry.js',import.meta.url))),fixtureSha256:sha(bytes),pdfjsVersion:pdfjs.version,renderer:{name:'KaTeX',version:katex.version,renderedRootHtmlBytes:Buffer.byteLength(renderedRoot)},passed:checks.filter(x=>x.status==='PASS').length,failed:checks.filter(x=>x.status==='FAIL').length,checks,items,vectors,result};await fs.writeFile(new URL('REAL_PDF_CONTROL.json',out),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed,checks,result},null,2));
