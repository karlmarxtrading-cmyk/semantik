/* Reconcile files actually downloaded through the consumer browser controls.
 * This is output verification, not a claim of semantic or browser RAM quality. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {marked} from '../tools/node_modules/marked/lib/marked.esm.js';
import katex from '../tools/node_modules/katex/dist/katex.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const specPath=process.argv[2]||'evidence/cp20/browser/DOWNLOAD_INPUTS.json';
const spec=JSON.parse(await fs.readFile(path.join(root,specPath),'utf8'));
let mathStyle=await fs.readFile(path.join(root,'tools/node_modules/katex/dist/katex.min.css'),'utf8');
for(const font of [...new Set([...mathStyle.matchAll(/url\((fonts\/[^)]+)\)/g)].map(x=>x[1]))]){
 const bytes=await fs.readFile(path.join(root,'tools/node_modules/katex/dist',font));
 const mime=font.endsWith('.woff2')?'font/woff2':font.endsWith('.woff')?'font/woff':'font/ttf';
 mathStyle=mathStyle.replaceAll('url('+font+')','url(data:'+mime+';base64,'+bytes.toString('base64')+')');
}
const outputs=[];
for(const row of spec.outputs){
 const raw=await fs.readFile(path.join(root,row.path)),md=raw.toString('utf8');
 const pages=[...md.matchAll(/<!-- halaman: (\d+) -->/g)].map(x=>Number(x[1]));
 const blocks=[...md.matchAll(/<!-- bagian: ([^ |]+) \| halaman: (\d+) -->/g)].map(x=>({id:x[1],page:Number(x[2])}));
 const traceIDs=[...new Set([...md.replaceAll('\\_','_').matchAll(/CP20B\d{4}_\d{2}/g)].map(x=>x[0]))];
 const exporter=md.match(/\*\*Rilis eksportir:\*\* ([^ ·]+)/)?.[1];
 const sourceSha256=md.match(/\*\*SHA-256 PDF sumber:\*\* ([a-f0-9]{64})/)?.[1];
 const actualSourceSha=createHash('sha256').update(await fs.readFile(path.join(root,row.source))).digest('hex');
 assert.equal(sourceSha256,actualSourceSha,'source SHA');
 assert.equal(pages.length,row.expectedPages,'page count');
 assert.deepEqual(pages,Array.from({length:row.expectedPages},(_,i)=>i+1),'ordered complete page IDs');
 assert.equal(new Set(blocks.map(x=>x.id)).size,blocks.length,'unique block IDs');
 if(row.expectedBlocks!==undefined)assert.equal(blocks.length,row.expectedBlocks,'block count');
 if(row.expectedTraceIDs!==undefined)assert.equal(traceIDs.length,row.expectedTraceIDs,'source trace ID count');
 assert.ok(blocks.every(x=>pages.includes(x.page)),'all blocks map to an exported page');
 assert.ok(!/<script\b|file:\/\/|(?:Traceback \(most recent|Error: at )/.test(md),'no internal script/path/traceback');
 const definitions=[...md.matchAll(/^\[([^\]]+)\]: (data:image\/[^\s]+)$/gm)];
 assert.equal(new Set(definitions.map(x=>x[2])).size,definitions.length,'deduplicated image definitions');
 const start=performance.now();
 const mathErrors=[];let mathCount=0;
 const renderedInput=md.replace(/\$\$([\s\S]*?)\$\$/g,(_,math)=>{mathCount++;try{return katex.renderToString(math.trim(),{displayMode:true,throwOnError:true,trust:false});}catch(e){mathErrors.push(String(e));return '<pre>FORMULA REQUIRES REVIEW</pre>';}});
 const html=marked.parse(renderedInput),renderMs=performance.now()-start;
 assert.ok(!/<script\b/i.test(html),'rendered script-free');
 const renderPath=row.path.replace(/\.md$/,'.rendered.html');
 await fs.writeFile(path.join(root,renderPath),'<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>CP20 — hasil unduhan aktual</title><style>body{max-width:850px;margin:40px auto;padding:0 24px;font:18px/1.65 system-ui;color:#202923}h1,h2,h3{line-height:1.3}img{max-width:100%}table{border-collapse:collapse}td,th{border:1px solid #aaa;padding:8px}blockquote{border-left:4px solid #9b6a24;padding-left:18px}pre{white-space:pre-wrap}'+(mathCount?mathStyle:'')+'</style><body>'+html+'</body></html>');
 outputs.push({...row,exporter,sourceSha256,bytes:raw.length,sha256:createHash('sha256').update(raw).digest('hex'),pages:pages.length,blocks:blocks.length,traceIDs:traceIDs.length,duplicateBlocks:0,imageDefinitions:definitions.length,mathCount,mathErrors,renderMs,renderPath,renderedHeadingCounts:[1,2,3,4,5,6].map(n=>({level:n,count:(html.match(new RegExp('<h'+n+'\\b','g'))||[]).length})),declaredStatus:md.match(/\*\*Status:\*\* (.*)/)?.[1],structuralStatus:'PASS',semanticStatus:'NOT_APPROVED',method:'Actual browser-downloaded Markdown → source SHA/page/block/trace reconciliation → full Marked17.0.1 and KaTeX0.19.1 render. No independent human review.'});
}
const result={status:'PASS_FOR_STRUCTURAL_RECONCILIATION_ONLY',outputs,limits:['No semantic acceptance inferred from translated count or structural pass','Synthetic capacity templates repeat conceptual patterns; not natural-book diversity','Render parsing does not qualify all Markdown editors','Exporter and source build identities are explicit; any later build bindings must be documented separately']};
await fs.writeFile(path.join(root,'evidence/cp20/browser/DOWNLOAD_RECONCILIATION.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(outputs.map(({path,bytes,pages,blocks,traceIDs,declaredStatus})=>({path,bytes,pages,blocks,traceIDs,declaredStatus})),null,2));
