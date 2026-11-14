import {resolveBilingualBindings} from './bilingual';
import {outputEncoding} from './encoding-policy';
import {Document,Span,Segment,uid,sha256} from './types';
import {isStructuralHeading,displayHeadingPatches,escapeTableCell} from './display-profile';
import {parseLossless,validUnicode} from './json';
import {prosePresent,preservationErrors} from './protection';
export function decodeBytes(bytes:Uint8Array){let encoding:Document['encoding']='utf-8',bom=false,offset=0;if(bytes[0]===239&&bytes[1]===187&&bytes[2]===191){bom=true;offset=3;}else if(bytes[0]===255&&bytes[1]===254){encoding='utf-16le';bom=true;offset=2;}else if(bytes[0]===254&&bytes[1]===255){encoding='utf-16be';bom=true;offset=2;}const text=new TextDecoder(encoding,{fatal:true,ignoreBOM:true}).decode(bytes.subarray(offset));if(text.includes('\u0000'))throw new Error('NUL dalam teks; encoding ambigu atau input bukan teks');return{text,encoding,bom};}
export function encodeText(text:string,encoding:Document['encoding'],bom:boolean){if(encoding==='utf-8'){const b=new TextEncoder().encode(text);if(!bom)return b;const out=new Uint8Array(b.length+3);out.set([239,187,191]);out.set(b,3);return out;}const bytes=new Uint8Array(text.length*2+(bom?2:0));let off=bom?2:0;if(bom){bytes[0]=encoding==='utf-16le'?255:254;bytes[1]=encoding==='utf-16le'?254:255;}for(let i=0;i<text.length;i++){const c=text.charCodeAt(i);bytes[off++]=encoding==='utf-16le'?c&255:c>>8;bytes[off++]=encoding==='utf-16le'?c>>8:c&255;}return bytes;}
const knownFields=new Set(['title','description','question','explanation','hint','concept','learningObjective','text','alt','xLabel','yLabel','caption']);
export function jsonSpans(text:string,legacyJsonStrings=false):{spans:Span[];profile:string;confirmed:boolean}{const {tokens,root}=parseLossless(text);const keys=root.children.map(n=>n.pointer);const mcq=keys.includes('/questions')&&keys.includes('/schemaVersion')&&keys.includes('/type');const spans:Span[]=[];
 for(const t of tokens.filter(t=>!t.key)){const p=t.pointer,parts=p.split('/'),key=parts.at(-1)!;const label=/\/visuals\/\d+\/data\/.+\/(?:label|labels\/\d+)$/.test(p)||/\/visuals\/\d+\/data\/(?:labels\/\d+|.*Label)$/.test(p);const select=mcq&&(knownFields.has(key)||label||(key==='answer'&&/\p{L}{2}[\s]+\p{L}{2}/u.test(t.value)))&&prosePresent(t.value);const unitId=p.match(/^\/questions\/\d+/)?.[0]||'document';if(!legacyJsonStrings&&/(?:^|\n)\s*\|.+\|/.test(t.value)){const inner=txtSpans(t.value);for(const span of inner.spans)spans.push({...span,unitId,pointer:p,jsonContainer:{start:t.start,end:t.end,source:t.value},selected:select&&span.selected,group:span.group?t.start+':'+span.group:undefined});}else spans.push({start:t.start,end:t.end,source:t.value,role:key||'root',unitId,pointer:p,json:true,selected:select});}
 return{spans,profile:mcq?'JSON-MCQ-1':'JSON-CUSTOM',confirmed:false};}
export function txtSpans(text:string):{spans:Span[];profile:string;confirmed:boolean}{const spans:Span[]=[];let role='prose',fence='',unit='0',record=0;const four=/^title:\s*$/m.test(text)&&/^question:\s*$/m.test(text);const canonical=new Map<string,string>();
 const add=(start:number,end:number,part:string,r:string,group?:string)=>{const lead=part.match(/^\s*/)?.[0].length||0,trail=part.match(/\s*$/)?.[0].length||0;start+=lead;end-=trail;const source=text.slice(start,end);if(source&&prosePresent(source))spans.push({start,end,source,role:r,unitId:unit,selected:true,group});};
 const lines=[...text.matchAll(/[^\r\n]+(?:\r\n|\r|\n|$)|(?:\r\n|\r|\n)/g)];
 for(const m of lines){const raw=m[0].replace(/[\r\n]+$/,''),offset=m.index!;if(!raw.trim())continue;const f=/^\s*(`{3,}|~{3,})/.exec(raw);if(f){if(!fence)fence=f[1][0];else if(fence===f[1][0])fence='';continue;}if(fence)continue;
 const marker=/^(title|question|answer|explanation):\s*$/.exec(raw);if(marker){role=marker[1];if(role==='title'){record++;unit=String(record);}continue;}
 const u=/^###\s+Unit\s+(\d+)\s*$/.exec(raw);if(u){unit=u[1];continue;}
 if(isStructuralHeading(raw)){if(/^###\s+(?:Rujukan|References)\s*$/.test(raw))role='reference';continue;}
 if(role==='reference')continue;
 const q=/^(?:###\s+(?:(?:Penjelasan|Explanation)\s+)?)?Q(\d+)\.\s+/.exec(raw);if(q){const body=raw.slice(q[0].length),key=unit+':Q'+q[1];if(!raw.startsWith('###'))canonical.set(key,body.trim());const same=canonical.get(key)===body.trim();add(offset+q[0].length,offset+raw.length,body,role,same?key:undefined);continue;}
 if(/^\s*\|(?:\s*:?-+:?\s*\|)+\s*$/.test(raw))continue;
 if(raw.trimStart().startsWith('|')){let start=0;let escaped=false;for(let k=0;k<=raw.length;k++){if((raw[k]==='|'&&!escaped)||k===raw.length){add(offset+start,offset+k,raw.slice(start,k),'table');start=k+1;}escaped=raw[k]==='\\'&&!escaped;}continue;}
 const prefix=/^(?:\s*#{1,6}\s+|\s*(?:[-+*]|\d+[.)])\s+)/.exec(raw)?.[0]||'';add(offset+prefix.length,offset+raw.length,raw.slice(prefix.length),role);
 }
 if(fence)throw new Error('Code fence TXT belum ditutup');return{spans,profile:four?'TXT-FOUR-FIELD':'TXT-PLAIN',confirmed:true};
}
export async function parseDocument(path:string,bytes:Uint8Array,options:{legacyJsonStrings?:boolean}={}):Promise<Document>{const hash=await sha256(bytes),id=uid();const base={id,path,bytes,hash,encoding:'utf-8' as const,bom:false,text:'',profile:'UNSUPPORTED',mappingConfirmed:false,segments:[] as Segment[],errors:[] as string[],disposition:'translate' as const};try{const decoded=decodeBytes(bytes);const p=path.toLowerCase().endsWith('.json')?jsonSpans(decoded.text,options.legacyJsonStrings):txtSpans(decoded.text);const groups=new Map<string,Segment>();const segments:Segment[]=[];for(const span of p.spans){if(span.group&&groups.has(span.group)){groups.get(span.group)!.occurrences.push({start:span.start,end:span.end});continue;}const seg:Segment={...span,id:await sha256(hash+'|'+path+'|'+(span.jsonContainer?'container-'+span.jsonContainer.start+'|':'')+span.start+'|'+span.role+'|parser-v1'),occurrences:[{start:span.start,end:span.end}],status:'NOT_STARTED',revision:0,history:[],historyAt:-1,findings:[],context:decoded.text.slice(Math.max(0,span.start-500),Math.min(decoded.text.length,span.end+500))};segments.push(seg);if(span.group)groups.set(span.group,seg);}const contextBounds=new Map<string,{start:number;end:number}>();for(const span of p.spans){const key=span.unitId||'document',start=span.jsonContainer?.start??span.start,end=span.jsonContainer?.end??span.end;const prior=contextBounds.get(key);contextBounds.set(key,{start:prior?Math.min(prior.start,start):start,end:prior?Math.max(prior.end,end):end});}for(const segment of segments){const unitId=segment.unitId||'document',bounds=contextBounds.get(unitId)!;segment.contextRef=unitId==='document'?{start:0,end:decoded.text.length,unitId}:{...bounds,unitId};}return{...base,...decoded,parserVersion:options.legacyJsonStrings?'parser-v1':'parser-v2',profile:p.profile,mappingConfirmed:p.confirmed,segments};}catch(e){return{...base,errors:[String(e)]};}}
export function reconstruct(doc:Document,mode:'final'|'draft'='final'):Uint8Array{
 const patches:{start:number;end:number;text:string}[]=displayHeadingPatches(doc);
 const bilingual=resolveBilingualBindings(doc);
 const embedded=new Map<number,{container:{start:number;end:number;source:string};patches:{start:number;end:number;text:string}[]}>();
 for(const s of doc.segments.filter(s=>s.selected)){
  if(isLockedSegment(doc,s))throw new Error(`Pemetaan mencoba mengubah identifier/answer key terkunci: ${doc.path} ${s.pointer}`);
  if(s.target===undefined){if(mode==='draft')continue;throw new Error(`Segmen belum diterjemahkan: ${doc.path} ${s.pointer||s.start}`);}
  if(!validUnicode(s.target))throw new Error('Target memiliki surrogate tidak berpasangan');
  const errors=preservationErrors(s.source,s.target,{tableCell:s.role==='table'});if(errors.length)throw new Error(errors.join('; '));
  if(s.role==='table'&&/[\r\n]/.test(s.target))throw new Error('Target merusak sel tabel');
  if(JSON.stringify(s.source.match(/\r\n|\r|\n/g)||[])!==JSON.stringify(s.target.match(/\r\n|\r|\n/g)||[]))throw new Error('Target mengubah jumlah/jenis newline sumber');
  const destinationField=bilingual.get(s.id);
  if(destinationField){
   const consent=doc.bilingualBindings!.find(p=>p.sourceId===s.id)!;
   if(consent.approvedText!==s.target||consent.approvedRevision!==s.revision){if(mode==='draft')continue;throw new Error('Overwrite field bilingual belum disetujui untuk revisi ini: '+destinationField.pointer);}
   patches.push({start:destinationField.start,end:destinationField.end,text:JSON.stringify(s.target)});continue;
  }
  const target=s.role==='table'?escapeTableCell(s.target):s.target;
  let sourceText=doc.text,destination=patches;
  if(s.jsonContainer){
   const c=s.jsonContainer;
   if(JSON.parse(doc.text.slice(c.start,c.end))!==c.source)throw new Error('Container JSON tidak cocok sumber immutable');
   let group=embedded.get(c.start);if(!group){group={container:c,patches:[]};embedded.set(c.start,group);}else if(group.container.end!==c.end||group.container.source!==c.source)throw new Error('Container JSON ambigu');
   sourceText=c.source;destination=group.patches;
  }
  for(const o of s.occurrences){
   if(!Number.isSafeInteger(o.start)||!Number.isSafeInteger(o.end)||o.start<0||o.end<=o.start||o.end>sourceText.length)throw new Error('Rentang patch sumber tidak valid');
   const original=sourceText.slice(o.start,o.end);
   if((s.json?JSON.parse(original):original)!==s.source)throw new Error('Patch tidak cocok dengan sumber immutable');
   destination.push({...o,text:s.json?JSON.stringify(target):target});
  }
 }
 const apply=(source:string,items:typeof patches)=>{items.sort((a,b)=>a.start-b.start);for(let i=1;i<items.length;i++)if(items[i].start<items[i-1].end)throw new Error('Patch overlap');let result='',cursor=0;for(const p of items){result+=source.slice(cursor,p.start)+p.text;cursor=p.end;}return result+source.slice(cursor);};
 for(const {container,patches:inner} of embedded.values())patches.push({start:container.start,end:container.end,text:JSON.stringify(apply(container.source,inner))});
 const out=apply(doc.text,patches);if(doc.path.toLowerCase().endsWith('.json'))parseLossless(out);
 const encoding=outputEncoding(doc);return encodeText(out,encoding.encoding,encoding.bom);
}
export function isLockedSegment(doc:Pick<Document,'profile'>,segment:Pick<Segment,'role'|'source'|'pointer'>){
 if(doc.profile!=='JSON-MCQ-1')return false;
 if(/\/visuals\/\d+\/data\/.+\/(?:label|labels\/\d+)$/.test(segment.pointer||'')||/\/visuals\/\d+\/data\/(?:labels\/\d+|.*Label)$/.test(segment.pointer||''))return false;
 return ['schemaVersion','type','id','category','label'].includes(segment.role)||segment.role==='answer'&&!/\p{L}{2}[\s]+\p{L}{2}/u.test(segment.source);
}
