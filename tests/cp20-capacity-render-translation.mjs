// Actual generated long translation/partial Markdown through pinned Marked.
// Structural rendering checks do not certify semantic equivalence.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {marked} from '../tools/node_modules/marked/lib/marked.esm.js';
const repo=path.resolve(import.meta.dirname,'..'),dir=path.resolve(repo,process.argv[2]||'evidence/cp20/qa/real-inference-final-1668'),fixture=process.argv[3]||'capacity-1500-id';
const result=JSON.parse(await fs.readFile(path.join(dir,fixture+'-RESULTS.json'))),file=path.join(dir,result.export.file),raw=await fs.readFile(file),md=raw.toString('utf8');
const started=performance.now(),html=marked.parse(md),renderMs=performance.now()-started;
const pages=[...md.matchAll(/<!-- halaman: (\d+) -->/g)].map(m=>Number(m[1]));assert.equal(pages.length,result.pages);assert.deepEqual(pages,Array.from({length:result.pages},(_,i)=>i+1));
const blockIds=[...md.matchAll(/<!-- bagian: (p\d+-b\d+) \| halaman: \d+ -->/g)].map(m=>m[1]);assert.equal(blockIds.length,result.counts.total);assert.equal(new Set(blockIds).size,blockIds.length);
const traceIds=new Set([...html.matchAll(/CP20B\d{4}_\d{2}/g)].map(m=>m[0]));assert.equal(traceIds.size,result.pages);assert.ok(!html.includes('<script>'));assert.match(md,/HASIL SEMENTARA/);assert.equal((html.match(/<h3\b/g)||[]).length,result.pages);assert.ok(!md.includes('data:image/'));
const report={status:'PASS',build:result.build,file:path.basename(file),bytes:raw.length,sha256:createHash('sha256').update(raw).digest('hex'),renderer:'Marked17.0.1; fixture has no formula or raster content, so no KaTeX/raster qualification inferred',renderMs,pages:pages.length,blockIds:blockIds.length,uniqueTraceIds:traceIds.size,renderedH3:(html.match(/<h3\b/g)||[]).length,partialLabelVerified:true,method:'Full actual long Markdown parsed with exact page/block/trace reconciliation. This is not a browser download or human semantic review.'};await fs.writeFile(path.join(dir,fixture+'-MARKDOWN_RENDER.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
