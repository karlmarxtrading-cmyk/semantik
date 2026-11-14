export type Protection={start:number;end:number;value:string;kind:string};
// Establish names only from explicit mathematical noun phrases. Articles a/I
// remain prose unless an operator establishes them independently below.
function namedVariables(text:string){
 const names=new Set<string>();
 const cue=/\b(?:functions?|fungsi|inputs?|masukan|variables?|variabel|parameters?|parameter|coefficients?|koefisien|values?(?:\s+of)?|nilai(?:\s+dari)?)\s+([A-Za-z]\b(?:\s*(?:,\s*(?:(?:and|dan|or|atau)\s+)?|(?:and|dan|or|atau)\s+)[A-Za-z]\b)*)/gi;
 for(const m of text.matchAll(cue))for(const n of m[1].matchAll(/\b[A-Za-z]\b/g))if(!/^[aAI]$/.test(n[0]))names.add(n[0]);
 return names;
}
export function protectedSpans(text:string,knownVariables:ReadonlySet<string>=new Set()):Protection[]{
 const namedInText=namedVariables(text);
 const found:Protection[]=[];const add=(regex:RegExp,kind:string)=>{for(const m of text.matchAll(regex)){const start=m.index!,end=start+m[0].length;if(!found.some(p=>start<p.end&&end>p.start))found.push({start,end,value:m[0],kind});}};
 add(/\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$|(?<!\\)\$(?![\s{]|\d+(?:[.,]\d+)*[ \t]+[A-Za-z]{2})[^$\r\n]+?(?<!\\)\$(?![\d{])/g,'formula');
 add(/√\([^()\r\n]*\)|\|[A-Za-z](?:[⁰¹²³⁴⁵⁶⁷⁸⁹]|\^[0-9]+)?\|/g,'formula');
 add(/`+[^`]*`+/g,'code');add(/\$\{[^{}]+\}|\{\{[^{}]+\}\}|\{[A-Za-z_]\w*\}|(?<![\d%])%(?:\d+\$)?[-+#0 ]?\d*(?:\.\d+)?[sdif]/g,'placeholder');
 add(/https?:\/\/[^\s<>]+|(?:doi:)?10\.\d{4,9}\/[^\s]+/gi,'url');
 add(/\]\([^\r\n)]*\)/g,'link-destination');
 // A comparison such as "a < b, a = b, a > b" is not an HTML tag.
 // Tag names must immediately follow < or </; comments/doctype remain opaque.
 add(/<!--[\s\S]*?-->|<!DOCTYPE\s[^>]*>|<\/?[A-Za-z][\w:-]*(?=[\s/>])(?:[^<>"']|"[^"]*"|'[^']*')*>/gi,'html');
 if(/\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20e3/u.test(text))for(const cluster of new Intl.Segmenter('und',{granularity:'grapheme'}).segment(text)){if(/\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20e3/u.test(cluster.segment)){const start=cluster.index,end=start+cluster.segment.length;if(!found.some(p=>start<p.end&&end>p.start))found.push({start,end,value:cluster.segment,kind:'grapheme'});}}
 // Uppercase truth predicates in logical prose are translatable language.
 // Named constants, identifiers, formula/code tokens remain byte-exact.
 for(const m of text.matchAll(/\b(?:Q\d+|[A-Z][A-Z_\d]{2,})\b/g)){
  const start=m.index!,end=start+m[0].length;
  const truthPredicate=/^(?:TRUE|FALSE|BENAR|SALAH)$/.test(m[0])&&/\b(?:statements?|propositions?|pernyataan|proposisi)\b/i.test(text)&&!/\b(?:identifier|constant|variable|code|konstanta|variabel|kode)\b/i.test(text);
  if(!truthPredicate&&!found.some(p=>start<p.end&&end>p.start))found.push({start,end,value:m[0],kind:'identifier'});
 }
 // Bare algebra letters next to operators, or named x/y/z in a mathematical
 // instruction, must not silently change while the numeric multiset survives.
 const letters=[...text.matchAll(/\b[A-Za-z]\b/g)];
 // Establish algebra names before counting occurrences. Otherwise source only
 // counted the occurrence next to =, while the target counted every occurrence,
 // rejecting even an unchanged source. Ambiguous articles a/A/I stay contextual.
 for(const m of letters){
  const start=m.index!,end=start+1;
  if(!/^[aAI]$/.test(m[0])&&!found.some(p=>start<p.end&&end>p.start)&&
   (/[=<>≤≥≠+×÷−^]\s*$/.test(text.slice(0,start))||/^\s*[=<>≤≥≠+×÷−^]/.test(text.slice(end))))namedInText.add(m[0]);
 }
 for(const m of letters){
  const start=m.index!,end=start+1,before=text.slice(0,start),after=text.slice(end);
  const algebra=/[=<>≤≥≠+×÷−^]\s*$/.test(before)||/^\s*[=<>≤≥≠+×÷−^]/.test(after);
  const articleBeforeSignedNumber=m[0].toLowerCase()==='a'&&/\b(?:is|are|was|were|be|has|have|contains?|with|of|as|gets?|got)\s+$/i.test(before)&&/^\s*[+−-]\s*\d/.test(after);
  const named=knownVariables.has(m[0])||namedInText.has(m[0])||/[xyz]/i.test(m[0])&&/\b(?:find|solve|value|variable|equation|nilai|variabel|persamaan|tentukan|cari|carilah|temukan|hitung)\b/i.test(text);
  if((algebra||named)&&!articleBeforeSignedNumber&&!found.some(p=>start<p.end&&end>p.start))found.push({start,end,value:m[0],kind:'variable'});
 }
 add(/[\[(]\s*[−-]?\d+(?:[.,]\d+)?\s*,\s*[−-]?\d+(?:[.,]\d+)?\s*[\])]/g,'interval');
 add(/[$€£]\d+(?:[.,]\d+)*(?![\w])/g,'currency');
 add(/(?:Rp\s*)?[−-]?\d+(?:[.,/]\d+)*(?:%|[²³])?/g,'number');
 add(/(?:[\[(]\s*[−-]?\d+(?:[.,]\d+)?\s*,\s*[−-]?\d+(?:[.,]\d+)?\s*[\])])/g,'interval');add(/\b(?:mm|cm|km|m|in|ft)[²³]|[⁰¹²³⁴⁵⁶⁷⁸⁹]/g,'unit-power');add(/[+−^=<>≤≥≠≈±×÷∞∈∉∪∩→↔⇒⇔√∑∏]+/g,'operator');
 add(/\*\*|__|(?<!\*)\*(?!\*)|\|/g,'markup');
 return found.sort((a,b)=>a.start-b.start);
}
// Keep historical parser span selection stable when strengthening literal guards.
// Removing newly guarded single letters here could delete existing table segment IDs.
export function prosePresent(text:string){let s=text;for(const p of [...protectedSpans(text)].reverse())if(p.kind!=='variable')s=s.slice(0,p.start)+s.slice(p.end);return /\p{L}{2}/u.test(s);}
export function preservationErrors(source:string,target:string,options:{tableCell?:boolean;knownVariables?:ReadonlySet<string>}={}):string[]{
 const include=(p:Protection)=>!options.tableCell||p.kind!=='markup'||p.value!=='|';const a=protectedSpans(source,options.knownVariables).filter(include);
 // Target wording may omit the lexical cue ("find" -> "cari", "nilai x" -> "x").
 // Once a name is established by source math, count its target occurrences even
 // when the target cue is absent. Do not treat English articles a/I this way.
 const known=new Set([...(options.knownVariables??[]),...a.filter(p=>p.kind==='variable'&&!/^[aAI]$/.test(p.value)).map(p=>p.value)]);
 const b=protectedSpans(target,known).filter(include);const cnt=(x:Protection[])=>{const m=new Map<string,number>();x.forEach(p=>m.set(p.value,(m.get(p.value)||0)+1));return m;};const ca=cnt(a),cb=cnt(b);const errs:string[]=[];
 for(const [s,n] of ca)if(cb.get(s)!==n)errs.push(`Literal terlindungi berubah/hilang: ${s}`);
 for(const [s,n] of cb)if(ca.get(s)!==n)errs.push(`Literal terlindungi bertambah/berubah: ${s}`);
 return [...new Set(errs)];
}
