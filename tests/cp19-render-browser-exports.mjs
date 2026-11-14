import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
import {renderMarkdown} from './markdown-renderer.mjs';
const out=new URL('../evidence/cp19/browser/',import.meta.url),report=[];
for(const id of ['EN_TO_ID','ID_TO_EN','MATHEMATICS']){
 const file='SAMPLE_'+id+'_BROWSER.md',raw=await fs.readFile(new URL(file,out)),md=raw.toString();
 const render=renderMarkdown(md);await fs.writeFile(new URL(id+'.html',out),render.html);
 const images=[...md.matchAll(/data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)/g)];
 for(let i=0;i<images.length;i++)await fs.writeFile(new URL(id+'-embedded-'+i+'.'+images[i][1],out),Buffer.from(images[i][2],'base64'));
 report.push({file,sha256:createHash('sha256').update(raw).digest('hex'),bytes:raw.length,formulas:render.formulas,embeddedImages:images.length,missingLocalLinks:/\]\(assets\//.test(md),stackTrace:/\bat (?:file:|https?:)|Error:.*\n\s+at /.test(md)});
}
await fs.cp(new URL('../evidence/cp19/fresh/renderer/',import.meta.url),new URL('renderer/',out),{recursive:true});
await fs.writeFile(new URL('RENDERED_BROWSER_EXPORTS.json',out),JSON.stringify({method:'Actual Chrome standalone Markdown downloads rendered with Marked17.0.1 and KaTeX0.19.1; human review not claimed.',report},null,2));
console.log(report.map(x=>({file:x.file,formulas:x.formulas.length,images:x.embeddedImages,missing:x.missingLocalLinks,stack:x.stackTrace})));
