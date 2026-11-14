// Separate synthetic trace metadata from scientific prose in actual outputs.
// This never reclassifies application outcomes or turns rejected into PASS.
import fs from 'node:fs/promises';import path from 'node:path';
const repo=path.resolve(import.meta.dirname,'..'),dir=path.resolve(repo,process.argv[2]||'evidence/cp20/qa/real-inference-final-1668'),name=process.argv[3]||'capacity-1500-id';
const committed=path.join(dir,name+'-committed');const summary=JSON.parse(await fs.readFile(path.join(committed,'SUMMARY.json')));
const category=()=>({total:0,translated:0,preserved:0,rejected:0,failed:0,pending:0});const groups={prose:category(),pageHeading:category(),traceFooter:category(),other:category()},reasons={},samples=[];
for(let n=1;n<=summary.summary.committedPageCount;n++){
 const record=JSON.parse(await fs.readFile(path.join(committed,String(n).padStart(4,'0')+'.json')));
 for(const block of record.page.blocks){const group=/^CP20B\d{4}_\d{2}\./.test(block.text)?'prose':/^CP20P\d{4}\s+END$/.test(block.text)?'traceFooter':block.type==='heading'?'pageHeading':'other';const target=typeof block.target==='string'&&(!block.text.trim()||block.target.trim());const outcome=!target?'pending':block.outcome==='failed'?'failed':block.outcome==='rejected'||block.sourcePreserved?'rejected':block.status==='preserved'?'preserved':'translated';groups[group].total++;groups[group][outcome]++;
  if(outcome==='rejected'||outcome==='failed'){for(const issue of block.diagnostics||[]){const key=group+' | '+issue.message;reasons[key]=(reasons[key]||0)+1;}if(samples.filter(x=>x.category===group).length<10)samples.push({page:n,blockId:block.id,category:group,outcome,source:block.text,target:block.target,diagnostics:block.diagnostics});}
 }
}
const report={build:summary.build,fixture:name,sourceSha256:summary.summary.sourceSha256,committedPages:summary.summary.committedPageCount,applicationCounts:summary.summary.counts,groups,reasons,samples,method:'Descriptive breakdown of actual application outcomes using the declared synthetic fixture trace schema. English END footer is deliberately reported separately as mixed-language trace metadata. Rejected is never reclassified as success. No semantic accuracy score is inferred; translated prose still requires independent semantic review.',humanApprovals:0};await fs.writeFile(path.join(dir,name+'-OUTCOME_BREAKDOWN.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({fixture:name,pages:report.committedPages,groups,reasons},null,2));
