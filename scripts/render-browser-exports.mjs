import fs from 'node:fs/promises';import path from 'node:path';import{fileURLToPath}from'node:url';import {marked} from '../tools/node_modules/marked/lib/marked.esm.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),base=path.join(root,'evidence/browser/fresh-exports');
for(const name of await fs.readdir(base)){
 const dir=path.join(base,name);const md=await fs.readFile(path.join(dir,'JURNAL_TERJEMAHAN.md'),'utf8');
 await fs.writeFile(path.join(dir,'render.html'),'<!doctype html><html lang="id"><meta charset="utf-8"><title>Ekspor aktual CP18: '+name+'</title><link rel="stylesheet" href="render.css"><main>'+marked.parse(md)+'</main></html>');
 await fs.writeFile(path.join(dir,'render.css'),'body{font:17px/1.65 system-ui;background:#f7f6f1;color:#19302d;margin:0}main{max-width:900px;margin:40px auto;background:white;padding:36px}img{max-width:100%}table{border-collapse:collapse}td,th{padding:12px;border:1px solid #aaa}pre{white-space:pre-wrap}code{background:#edf3ef}');
 await fs.cp(dir,path.join(root,'dist/qa/render',name),{recursive:true});
}
console.log('Rendered four actual browser export Markdown documents; copied to QA only.');
