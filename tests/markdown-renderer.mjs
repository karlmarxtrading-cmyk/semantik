import {Marked} from '../tools/node_modules/marked/lib/marked.esm.js';
import katex from '../tools/node_modules/katex/dist/katex.mjs';
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
export function renderMarkdown(markdown){
 const formulas=[];
 const render=(text,displayMode)=>{const html=katex.renderToString(text,{displayMode,throwOnError:true,trust:false,strict:'error',maxExpand:500,maxSize:30});formulas.push({text,displayMode,mathML:html.includes('<math')});return html;};
 const md=new Marked({extensions:[
  {name:'displayMath',level:'block',start:src=>src.indexOf('$$'),tokenizer(src){const m=/^\$\$\n([\s\S]+?)\n\$\$(?:\n|$)/.exec(src);if(m)return {type:'displayMath',raw:m[0],text:m[1]};},renderer:t=>render(t.text,true)+'\n'},
  {name:'inlineMath',level:'inline',start:src=>src.indexOf('$'),tokenizer(src){const m=/^\$(?!\$)([^$\n]+)\$/.exec(src);if(m)return{type:'inlineMath',raw:m[0],text:m[1]};},renderer:t=>render(t.text,false)}
 ]});
 const body=md.parse(markdown);return {html:'<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>CP19 — render hasil Markdown aktual</title><link rel="stylesheet" href="renderer/katex.min.css"><link rel="stylesheet" href="renderer/reader.css"><main>'+body+'</main></html>',formulas};
}
