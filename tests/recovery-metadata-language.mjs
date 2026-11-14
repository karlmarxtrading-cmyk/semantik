import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {detectMetadataLanguage} from '../app/app/metadata-language.js';
import {processLongDocument} from '../app/app/long-document.js';
import {detectLanguage,semanticWarnings} from '../app/app/translation.js';
import {createStreamingMarkdown} from '../app/app/export.js';

const root=new URL('../',import.meta.url),out=new URL('evidence/recovery/metadata/',root);
await fs.mkdir(out,{recursive:true});
const sha=data=>createHash('sha256').update(data).digest('hex');
const tests=[];
const positive={
  en:['RPT9 END','Start QX-417','Page 12','SECTION AB_19','Figure F7','Document ID: Q9-3','ZX11 | continued','record No 517','Appendix S2','TRACE #q31','Reference R2.7','VERSION v3'],
  id:['XZ19 AKHIR','Awal QX-417','Halaman 12','BAGIAN AB_19','Gambar F7','Dokumen ID: Q9-3','ZX11 | lanjutan','rekaman nomor 517','Lampiran S2','JEJAK #q31','Rujukan R2.7','VERSI v3']
};
for(const [language,values] of Object.entries(positive))for(const text of values){assert.equal(detectMetadataLanguage(text),language,text);tests.push({text,expected:language,actual:language,status:'PASS'});}
const negative=[
  'END','ID A17','A17','42','the end','END A17 is not evidence','A17 did not end',
  'End the experiment 15','The record is 12','No records were lost in 5 trials.',
  'Page 12 is not sufficient proof','Page 12 tidak lengkap','AKHIR PAGE Q17',
  'Kode A3 tidak berubah','Rata-rata populasi naik 5','The catalyst is not consumed.',
  'If X1 is zero, the hypothesis is false.','Harga naik 5%','A1 + B2 END',
  'END 20mg','A1 END?','A1 END\nNo evidence','A1=2 END','www.example.com END',
  '<script>END A1</script>','not END A1','END A17; BEGIN B18','A17 END α',
  'END A1 B2 C3 D4','Page table record chapter A1','END '+ 'X'.repeat(161)+'1'
];
for(const text of negative){assert.equal(detectMetadataLanguage(text),'unknown',text);tests.push({text,expected:'unknown',actual:'unknown',status:'PASS'});}

// Recover the already-written source footers from both actual long-run exports.
// Fixture-specific expected IDs are used only here as ground truth, never by the
// production classifier. No PDF extraction or long-document inference is rerun.
const manifest=JSON.parse(await fs.readFile(new URL('tests/fixtures/cp20-capacity/capacity-1500-id.json',root)));
const historicalRuns=[];
for(const path of [
  'evidence/cp20/qa/real-inference-final-1668/capacity-1500-id-NODE_PARTIAL_TRANSLATION.md',
  'evidence/cp20/browser/final-8c643/BROWSER_1500_ID_TO_EN.md'
]){
  const raw=await fs.readFile(new URL(path,root)),md=raw.toString('utf8');
  const records=[...md.matchAll(/<!-- bagian: ([^ |]+) \| halaman: (\d+) -->\n([\s\S]*?)(?=\n<!-- (?:bagian|halaman):|$)/g)];
  assert.equal(records.length,4500,path);
  const blockIDs=new Set(),observations=[];
  for(const row of manifest.pages){
    const blockId=`p${String(row.page).padStart(4,'0')}-b0003`;
    const matched=records.filter(m=>m[1]===blockId&&Number(m[2])===row.page);
    assert.equal(matched.length,1,blockId);
    const expectedSource=row.id+' END';
    const lines=matched[0][3].split(/\r?\n/).map(x=>x.trim());
    assert.equal(lines.filter(x=>x===expectedSource).length,1,blockId);
    assert.ok(matched[0][3].includes('KANDIDAT DITOLAK'),blockId);
    const source=lines.find(x=>x===expectedSource);
    assert.equal(detectMetadataLanguage(source),'en',blockId);
    blockIDs.add(blockId);observations.push({page:row.page,blockId,source,classification:'en',candidateRouting:'preserved-already-target-metadata'});
  }
  assert.equal(blockIDs.size,1500);
  historicalRuns.push({path,sha256:sha(raw),bytes:raw.length,originalBlocks:records.length,originalRejectedFooters:1500,recognizedAlreadyEnglishMetadata:observations.length,changedSourceTexts:0,changedBlockIDs:0,newInferenceCalls:0,scope:'Classification replay of saved source labels only; original Markdown/statuses untouched; not a new1500-page translation run.'});
  await fs.writeFile(new URL(path.includes('/browser/')?'BROWSER_1500_METADATA_REPLAY.json':'NODE_1500_METADATA_REPLAY.json',out),JSON.stringify(observations,null,2)+'\n');
}

// Keep the unchanged-language guard for prose and direct translation intact.
assert.ok(semanticWarnings('Q17 END','Q17 END','id-en').some(x=>x.includes('belum berubah bahasa')));
assert.ok(semanticWarnings('This does not prove a causal relationship.','This does not prove a causal relationship.','id-en').some(x=>x.includes('belum berubah bahasa')));

const controls=[];
async function runControl({source,target,texts,reject=[]}){
  const records=new Map(),calls=[];
  const file=new Blob(['%PDF-1.7 metadata-routing controlled input']);file.name='controlled-routing.pdf';
  const build={release:'recovery-metadata-control',version:'0.20.0',sourceHash:'control'};
  const pdf={sourceSha256:'d'.repeat(64),numPages:1,metadata:{title:'Metadata routing control'},async extract(){return {pages:[{number:1,blocks:texts.map((text,i)=>({id:`p0001-b${String(i+1).padStart(4,'0')}`,page:1,type:'paragraph',text,translatable:true,sourceItemIds:[i+1],issues:[]})),sourceItemCount:texts.length,coveredItemCount:texts.length,sourceTextCharacters:texts.join('').length,referenceSection:false,warnings:[]}],assets:[]};}};
  const translationModule={RULESET:'recovery-metadata-control',detectLanguage,Translator:class{
    async prepare(direction){assert.equal(direction,source+'-'+target);}
    async translate(text){calls.push(text);return reject.includes(text)?{text,status:'review',outcome:'rejected',sourcePreserved:true,retryable:false,issues:['Controlled unchanged-language rejection'],metrics:{inferenceCalls:1,cacheHits:0}}:{text:'CONTROLLED_TRANSLATION '+text,status:'translated',outcome:'translated',issues:[],metrics:{inferenceCalls:1,cacheHits:0}};}
  }};
  const result=await processLongDocument({file,pdf,config:{source,target,layout:'auto',glossary:[]},translate:true,translationModule,build,loadPage:async n=>structuredClone(records.get(n)),commit:async record=>{records.set(record.id,structuredClone(record));}});
  const blocks=records.get(1).page.blocks;
  for(let i=0;i<blocks.length;i++){
    const block=blocks[i];assert.equal(block.text,texts[i]);assert.equal(block.id,`p0001-b${String(i+1).padStart(4,'0')}`);assert.equal(block.page,1);assert.deepEqual(block.sourceItemIds,[i+1]);
    const expectedPreserved=detectMetadataLanguage(texts[i])===target;
    assert.equal(block.status==='preserved',expectedPreserved,texts[i]);
    if(expectedPreserved){assert.equal(block.target,texts[i]);assert.equal(block.preservationReason,'already-target-metadata');assert.equal(block.outcome,'preserved');assert.equal(block.sourcePreserved,false);assert.equal(block.semanticVerified,false);assert.ok(!calls.includes(texts[i]));}
    else {assert.ok(calls.includes(texts[i]));assert.equal(block.preservationReason,undefined);}
    if(reject.includes(texts[i])){assert.equal(block.outcome,'rejected');assert.equal(block.status,'review');assert.equal(block.sourcePreserved,true);}
  }
  assert.equal(result.document.counts.rejected,reject.length);
  async function* pages(){for(const record of records.values())yield record;}
  const exported=await createStreamingMarkdown({document:result.document,pages:pages(),status:'complete',file,build,sourceSha256:pdf.sourceSha256});
  const md=await exported.text();
  assert.equal([...md.matchAll(/<!-- bagian:/g)].length,texts.length);
  for(const block of blocks)assert.ok(md.includes(`<!-- bagian: ${block.id} | halaman: 1 -->`));
  assert.equal((md.match(/KANDIDAT DITOLAK/g)||[]).length,reject.length);
  if(reject.length)assert.ok(md.includes('HASIL SEMENTARA'));
  const name=`CONTROL_${source}_${target}.md`;await fs.writeFile(new URL(name,out),md);
  controls.push({source,target,blocks:blocks.length,counts:result.document.counts,controlledTranslatorCalls:calls.length,actualModelInferenceCalls:0,sourceAndIDsUnchanged:true,export:{path:name,bytes:exported.size,sha256:sha(md),partial:exported.exportStats.partial},status:'PASS'});
}
await runControl({source:'id',target:'en',texts:['ZX91 END','Page 12','Document ID: K-24','HALAMAN 19','Rata-rata populasi tidak sama.','No records were lost in 5 trials.','END 20mg'],reject:['No records were lost in 5 trials.','END 20mg']});
await runControl({source:'en',target:'id',texts:['ZX91 AKHIR','Halaman 12','Dokumen ID: K-24','PAGE 19','The population mean is not equal.','Kode A3 tidak berubah'],reject:['Kode A3 tidak berubah']});

const sourceHashes={};for(const p of ['app/app/metadata-language.js','app/app/long-document.js'])sourceHashes[p]=sha(await fs.readFile(new URL(p,root)));
const report={status:'PASS_FOR_METADATA_CLASSIFICATION_AND_CONTROLLED_ROUTING',productionReady:false,method:'Actual saved Node/browser1500 footer source labels replayed through new pure classifier; short controlled real processLongDocument and createStreamingMarkdown routing/export, no new PDF1500 or ONNX run.',sourceHashes,independentCases:tests.length,tests,historicalRuns,controls,unchangedLanguageGuardStillActive:true,limitations:['Historical long run prose remains unreviewed or semantically failed; old outputs are not relabelled as complete','A metadata marker is not a statement of meaning correctness','Unknown, mixed-language, numeric-unit and free-form prose remain on ordinary translation/guard paths','Short controls use a controlled translator; browser and actual model evidence require separate root qualification']};
await fs.writeFile(new URL('RESULTS.json',out),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,independentCases:tests.length,historicalFooterObservations:historicalRuns.reduce((n,x)=>n+x.recognizedAlreadyEnglishMetadata,0),controls},null,2));
