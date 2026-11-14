import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {markdownText,createMarkdown,createStandaloneMarkdown,markdownFilename} from '../app/app/export.js';
import {toLatex} from '../app/app/math-geometry.js';
import {renderMarkdown} from './markdown-renderer.mjs';
const results=[];async function test(name,fn){try{await fn();results.push({name,pass:true});}catch(e){results.push({name,pass:false,error:e.stack});}}
await test('literal inline and multiline math now render to MathML, no code fences',()=>{
 const md=markdownText('Solve $|x| < 1$ over ℝ.\n1. Preserve ∅ and (−∞, 0).\n\nText\n$$\nx < 1\n$$\n2. Source label.');
 const r=renderMarkdown(md);assert.ok(r.formulas.length>=4);assert.ok(r.formulas.some(f=>f.displayMode));assert.ok(!r.html.includes('<code>'));assert.ok(!r.html.includes('<script'));assert.ok(r.html.includes('Source label.'));
});
await test('prime and combining accent structure survives actual KaTeX',()=>{for(const input of ['f′(x)','z̄','f″(x)','𝐱','𝑥']){const p=toLatex(input);assert.ok(p.verified,input);const r=renderMarkdown('$'+p.latex+'$');assert.equal(r.formulas.length,1);assert.ok(r.formulas[0].mathML);}});
await test('unknown math does not silently become verified latex',()=>{assert.equal(toLatex('√x+1').verified,false);assert.equal(toLatex('x⍰y').verified,false);});
await test('source LaTeX cannot execute HTML or include external content',()=>{const s=markdownText('$\\href{https://evil.invalid}{x}$ <script>bad()</script>');assert.ok(!s.includes('<script>'));assert.equal(renderMarkdown(s).formulas.length,0);});
const image=new Blob([Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+iH1kAAAAASUVORK5CYII=','base64'))],{type:'image/png'});
const job={file:{name:'Test Article.pdf'},status:'complete',config:{source:'en',target:'id'},document:{numPages:1,sourceLanguage:'en',targetLanguage:'id',pages:[{number:1}],blocks:[{id:'math',type:'formula',page:1,text:'opaque source',target:'opaque source',status:'preserved',math:{verified:false},assetPath:'assets/source.png'}],assets:[{path:'assets/source.png',blob:image}]}};
await test('standalone Markdown embeds actual raster bytes and labels uncertainty',async()=>{const s=await createStandaloneMarkdown(job);assert.ok(s.includes('data:image/png;base64,'));assert.ok(!s.includes('](assets/'));assert.ok(s.includes('RUMUS BELUM TERVERIFIKASI'));const r=renderMarkdown(s);assert.equal(r.formulas.length,0);assert.ok(r.html.includes('<img'));});
await test('missing raster is a failed export, not silent data loss',async()=>{await assert.rejects(()=>createStandaloneMarkdown({...job,document:{...job.document,assets:[]}}),/Gambar sumber/);});
await test('filename follows PDF direction and distinguishes partial',()=>{assert.equal(markdownFilename(job),'Test_Article_EN_TO_ID.md');assert.equal(markdownFilename({...job,status:'paused'}),'Test_Article_EN_TO_ID_PARTIAL.md');});
await test('source corrections invalidate old geometry verification',()=>{const b={...job.document.blocks[0],text:'Changed unknown formula',originalText:'old',math:{verified:true,latex:'x^2'}};const md=createMarkdown({...job,document:{...job.document,blocks:[b]}},'source');assert.ok(!md.includes('$$\nx^2'));});
await test('inline equations include both operands and balanced parentheses',()=>{
 const r=renderMarkdown(markdownText('Given f(x)=x², the derivative is f′(x)=2x. Also y=x²; z=aᵢ; f(x)=(x+1)/(x−1).'));
 assert.deepEqual(r.formulas.map(f=>f.text),['f(x)=x^{2}',"f'(x)=2x",'y=x^{2}','z=a_{i}','f(x)=(x+1)/(x-1)']);
});
await fs.mkdir(new URL('../evidence/cp19/',import.meta.url),{recursive:true});await fs.writeFile(new URL('../evidence/cp19/markdown-tests.json',import.meta.url),JSON.stringify({method:'Actual exported Markdown through Marked17 and KaTeX0.19.1; raster embedding fixture, NOT a browser or human review',results},null,2));console.log(results);if(results.some(x=>!x.pass))process.exitCode=1;
