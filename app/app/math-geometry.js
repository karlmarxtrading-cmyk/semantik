/** CP20 geometry-first mathematical reconstruction. No OCR, model or fixture lookup.
 * Consumes PDF.js normalized text items in viewport (top-left) coordinates.
 * verified means supported geometric structure, never independent scientific QA.
 */
const IDENTITY=[1,0,0,1,0,0];
const mul=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
const point=(m,x,y)=>[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];
const uniq=a=>[...new Set(a)];
const median=a=>a.length?[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)]:12;
const box=ns=>{const x=Math.min(...ns.map(n=>n.x)),y=Math.min(...ns.map(n=>n.y)),r=Math.max(...ns.map(n=>n.x+n.width)),b=Math.max(...ns.map(n=>n.y+n.height));return {x,y,width:r-x,height:b-y}};
const ids=ns=>uniq(ns.flatMap(n=>n.sourceItemIds||[]));
const vids=ns=>uniq(ns.flatMap(n=>n.vectorIds||[]));
const text=ns=>ns.map(n=>n.sourceText||'').join(' ');
const centerX=n=>n.x+n.width/2;
const bottom=n=>n.y+n.height;
const right=n=>n.x+n.width;
const centerY=n=>n.y+n.height/2;

/** Extract straight segments from stroked vector paths, preserving provenance.
 * PDF.js6 draw OPS: move=0,line=1,cubic=2,quadratic=3,close=4.
 * Also accepts legacy constructPath operand arrays. Curves remain explicitly
 * unsupported; they are not flattened into guessed brackets/radicals.
 */
export function extractMathVectors(operatorList,viewport,OPS){
  const segments=[],unsupported=[];let ctm=[...IDENTITY],lineWidth=1,stack=[];
  const vm=viewport.transform||viewport;
  for(let i=0;i<operatorList.fnArray.length;i++){
    const fn=operatorList.fnArray[i],a=operatorList.argsArray[i]||[];
    if(fn===OPS.save){stack.push({ctm:[...ctm],lineWidth});continue}
    if(fn===OPS.restore){const s=stack.pop();if(s){ctm=s.ctm;lineWidth=s.lineWidth}continue}
    if(fn===OPS.transform){ctm=mul(ctm,a);continue}
    if(fn===OPS.setLineWidth){lineWidth=a[0];continue}
    if(fn!==OPS.constructPath)continue;
    const m=mul(vm,ctm);let start=null,current=null,part=0;
    const emit=(p,q)=>{if(!p||!q)return;const u=point(m,...p),v=point(m,...q);segments.push({id:`op${i}:seg${part++}`,operatorIndex:i,x1:u[0],y1:u[1],x2:v[0],y2:v[1],lineWidth:lineWidth*Math.hypot(m[0],m[1]),paintOperator:a[0]})};
    if(typeof a[0]==='number'){
      // Fill-only paths may be glyph outlines; never treat them as fraction bars.
      if(![OPS.stroke,OPS.closeStroke,OPS.fillStroke,OPS.eoFillStroke,OPS.closeFillStroke,OPS.closeEOFillStroke].includes(a[0]))continue;
      const data=a[1]?.[0];if(!data||typeof data.length!=='number')continue;
      for(let j=0;j<data.length;){const op=data[j++];
        if(op===0){current=[data[j++],data[j++]];start=current}
        else if(op===1){const q=[data[j++],data[j++]];emit(current,q);current=q}
        else if(op===4){emit(current,start);current=start}
        else if(op===2||op===3){const count=op===2?6:4;const vals=Array.from(data.slice(j,j+count));j+=count;unsupported.push({id:`op${i}:curve${part++}`,operatorIndex:i,kind:'curve',points:[...(current?[point(m,...current)]:[]),...vals.reduce((out,_,k)=>k%2?out:[...out,point(m,vals[k],vals[k+1])],[])]});current=vals.slice(-2)}
        else {unsupported.push({id:`op${i}:unknown`,operatorIndex:i,kind:'unsupported-path-op',op});break}
      }
    } else if(Array.isArray(a[0])||ArrayBuffer.isView(a[0])){
      let j=0;const coords=a[1];for(const op of a[0]){
        if(op===OPS.moveTo){current=[coords[j++],coords[j++]];start=current}
        else if(op===OPS.lineTo){const q=[coords[j++],coords[j++]];emit(current,q);current=q}
        else if(op===OPS.rectangle){const x=coords[j++],y=coords[j++],w=coords[j++],h=coords[j++];const p=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];for(let k=0;k<4;k++)emit(p[k],p[(k+1)%4])}
        else if(op===OPS.closePath){emit(current,start);current=start}
        else {const count=op===OPS.curveTo?6:(op===OPS.curveTo2||op===OPS.curveTo3)?4:0;const vals=Array.from(coords.slice(j,j+count));unsupported.push({id:`op${i}:curve${part++}`,operatorIndex:i,kind:'legacy-unsupported-curve',points:[...(current?[point(m,...current)]:[]),...vals.reduce((out,_,k)=>k%2?out:[...out,point(m,vals[k],vals[k+1])],[])]});j+=count;if(count)current=vals.slice(-2)}
      }
    }
  }
  return {segments,unsupported};
}

const SYMBOLS={'−':'-','–':'-','×':'\\times ','÷':'\\div ','·':'\\cdot ','⋅':'\\cdot ','≤':'\\le ','≥':'\\ge ','≠':'\\ne ','≈':'\\approx ','≡':'\\equiv ','∞':'\\infty ','∅':'\\varnothing ','∈':'\\in ','∉':'\\notin ','⊂':'\\subset ','⊆':'\\subseteq ','⊃':'\\supset ','⊇':'\\supseteq ','∪':'\\cup ','∩':'\\cap ','∀':'\\forall ','∃':'\\exists ','¬':'\\neg ','∧':'\\land ','∨':'\\lor ','⇒':'\\Rightarrow ','⇔':'\\Leftrightarrow ','→':'\\to ','↦':'\\mapsto ','∂':'\\partial ','∇':'\\nabla ','∫':'\\int ','∑':'\\sum ','∏':'\\prod ','±':'\\pm ','∓':'\\mp ','α':'\\alpha ','β':'\\beta ','γ':'\\gamma ','δ':'\\delta ','ε':'\\varepsilon ','θ':'\\theta ','λ':'\\lambda ','μ':'\\mu ','π':'\\pi ','ρ':'\\rho ','σ':'\\sigma ','τ':'\\tau ','φ':'\\varphi ','ω':'\\omega ','Γ':'\\Gamma ','Δ':'\\Delta ','Θ':'\\Theta ','Λ':'\\Lambda ','Π':'\\Pi ','Σ':'\\Sigma ','Φ':'\\Phi ','Ω':'\\Omega ','ℝ':'\\mathbb{R}','ℤ':'\\mathbb{Z}','ℕ':'\\mathbb{N}','ℚ':'\\mathbb{Q}','ℂ':'\\mathbb{C}','ℙ':'\\mathbb{P}','′':"'",'″':"''",'‴':"'''",'…':'\\ldots ','⋯':'\\cdots ','°':'^{\\circ}'};
const SUPER=Object.fromEntries([...'⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ'].map((c,i)=>[c,[...'0123456789+-=()ni'][i]]));
const SUB=Object.fromEntries([...'₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓ'].map((c,i)=>[c,[...'0123456789+-=()aehijklmnoprstuvx'][i]]));
const FUNCTIONS=new Set(['sin','cos','tan','cot','sec','csc','sinh','cosh','tanh','arcsin','arccos','arctan','log','ln','exp','lim','min','max','sup','inf','det','gcd','Pr']);
export function toLatex(input){
  let out='',unknown=[],chars=[...input];
  for(let i=0;i<chars.length;i++){
    const c=chars[i];
    const accents={'\u0304':'bar','\u0302':'hat','\u0307':'dot','\u0308':'ddot','\u20d7':'vec'};
    if(accents[c]){if(/[A-Za-z]$/.test(out)){out=out.slice(0,-1)+'\\'+accents[c]+'{'+out.at(-1)+'}';}else unknown.push('ambiguous-combining-accent');continue;}
    if(SUPER[c]||SUB[c]){const map=SUPER[c]?SUPER:SUB,mark=SUPER[c]?'^':'_';let run='';while(i<chars.length&&map[chars[i]])run+=map[chars[i++]];i--;out+=`${mark}{${run}}`;continue}
    if(SYMBOLS[c]){out+=SYMBOLS[c];continue}
    if(c==='√'){unknown.push('radical-scope-needs-geometry');out+='\\sqrt{\\;?\\;}';continue}
    if(c==='{'||c==='}'){out+='\\'+c;continue}
    if(c==='&'||c==='#'||c==='%'){out+='\\'+c;continue}
    if(c==='$'||c==='\\'){unknown.push(`literal-${c}`);out+='\\text{?}';continue}
    const nf=c.normalize('NFKC');
    if(/^[\x20-\x7E]$/.test(c)){out+=c;continue}
    if(nf!==c&&/^[A-Za-z0-9]$/.test(nf)){const cp=c.codePointAt(0);if(cp>=0x1d400&&cp<=0x1d433||cp>=0x1d468&&cp<=0x1d49b)out+='\\mathbf{'+nf+'}';else if(cp>=0x1d538&&cp<=0x1d56b)out+='\\mathbb{'+nf+'}';else if(cp>=0x1d434&&cp<=0x1d467)out+=nf;else {unknown.push('unsupported-mathematical-font');out+=nf;}continue}
    if(/\s/.test(c)){out+=' ';continue}
    unknown.push(`unmapped-U+${c.codePointAt(0).toString(16).toUpperCase()}`);out+='\\text{?}';
  }
  out=out.replace(/\b([A-Za-z]{2,})\b/g,(word,_,offset,str)=>FUNCTIONS.has(word)&&str[offset-1]!=='\\'?`\\${word}`:word);
  // Existing plain ^/_ can be legal TeX for a single token but not arbitrary text.
  return {latex:out.replace(/\s+/g,' ').trim(),verified:!unknown.length,warnings:uniq(unknown)};
}
function mathEligible(s){
 const stripped=s.replace(/\b(?:sin|cos|tan|cot|sec|csc|sinh|cosh|log|ln|exp|lim|min|max|det|dx|dy|dt)\b/g,'');
 if(/[A-Za-z]{3,}/.test(stripped))return false;
 return /^[\p{L}\p{N}\p{S}\s=+\-*/^_.,;:()[\]{}|′″‴'⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉]+$/u.test(s);
}
function mathSeed(s){return mathEligible(s)&&(/[=<>≤≥≠≈∫∑∏√∈∉∪∩∀∃∅∂∇^_′″‴⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉]/.test(s)||/\b(?:sin|cos|tan|log|lim)\s*\(/.test(s))}
function astLatex(ast){
 if(ast.type==='text')return toLatex(ast.text);
 if(ast.type==='sequence'){const a=ast.children.map(astLatex);return {latex:a.map(v=>v.latex).join(' '),verified:a.every(v=>v.verified),warnings:a.flatMap(v=>v.warnings)}}
 if(ast.type==='fraction'){const a=astLatex(ast.numerator),b=astLatex(ast.denominator);return {latex:`\\frac{${a.latex}}{${b.latex}}`,verified:a.verified&&b.verified,warnings:[...a.warnings,...b.warnings]}}
 if(ast.type==='sqrt'){const a=astLatex(ast.radicand);return {latex:`\\sqrt{${a.latex}}`,verified:a.verified,warnings:a.warnings}}
 if(ast.type==='scripts'){const b=astLatex(ast.base),sup=ast.sup?astLatex(ast.sup):null,sub=ast.sub?astLatex(ast.sub):null;return {latex:b.latex+(sub?`_{${sub.latex}}`:'')+(sup?`^{${sup.latex}}`:''),verified:b.verified&&(!sup||sup.verified)&&(!sub||sub.verified),warnings:[...b.warnings,...(sup?.warnings||[]),...(sub?.warnings||[])]}}
 if(ast.type==='operator'){const sup=ast.sup?astLatex(ast.sup):null,sub=ast.sub?astLatex(ast.sub):null;return {latex:SYMBOLS[ast.symbol].trim()+(sub?`_{${sub.latex}}`:'')+(sup?`^{${sup.latex}}`:''),verified:(!sup||sup.verified)&&(!sub||sub.verified),warnings:[...(sup?.warnings||[]),...(sub?.warnings||[])]}}
 if(ast.type==='matrix'){const rows=ast.rows.map(row=>row.map(astLatex));return {latex:`\\begin{bmatrix}${rows.map(r=>r.map(v=>v.latex).join(' & ')).join(' \\\\ ')}\\end{bmatrix}`,verified:rows.every(r=>r.every(v=>v.verified)),warnings:rows.flatMap(r=>r.flatMap(v=>v.warnings))}}
 return {latex:'',verified:false,warnings:['unsupported-ast']};
}
function seq(ns){return {type:'sequence',children:ns.map(n=>n.ast)}}
function composite(kind,ns,ast,extra={}){return {...box(ns),kind,ast,sourceItemIds:ids(ns),vectorIds:vids(ns),sourceText:text(ns),fontSize:median(ns.map(n=>n.fontSize)),baseline:median(ns.map(n=>n.baseline)),warnings:ns.flatMap(n=>n.warnings||[]),...extra}}
function splitTail(ast){
 if(ast.type!=='text')return [null,ast];
 const s=ast.text;let k=s.length-1;
 if(s[k]===')'||s[k]===']'){const close=s[k],open=close===')'?'(':'[';let depth=1;while(--k>=0){if(s[k]===close)depth++;if(s[k]===open&&!--depth)break}if(k<0)return [null,ast]}
 else {while(k>0&&/[0-9.]/.test(s[k])&&/[0-9.]/.test(s[k-1]))k--}
 return k>0?[{type:'text',text:s.slice(0,k)},{type:'text',text:s.slice(k)}]:[null,ast];
}
function attachScripts(nodes){
 let remaining=[...nodes].sort((a,b)=>a.x-b.x||a.baseline-b.baseline);
 for(let i=0;i<remaining.length;i++){
  let base=remaining[i];if(base.kind==='operator'||!mathEligible(base.sourceText))continue;
  const near=remaining.filter(n=>n!==base&&n.x>=right(base)-base.fontSize*.25&&n.x<=right(base)+base.fontSize*.65&&n.fontSize<=base.fontSize*.82&&Math.abs(n.baseline-base.baseline)>base.fontSize*.2&&Math.abs(n.baseline-base.baseline)<base.fontSize*1.1&&mathEligible(n.sourceText));
  const supers=near.filter(n=>n.baseline<base.baseline),subs=near.filter(n=>n.baseline>base.baseline);
  if(supers.length>1||subs.length>1){base.warnings.push('ambiguous-script-attachment');continue}
  if(!near.length)continue;
  const [prefix,tail]=splitTail(base.ast);const ast={type:'scripts',base:tail,sup:supers[0]?.ast,sub:subs[0]?.ast};
  const merged=composite('scripts',[base,...near],prefix?{type:'sequence',children:[prefix,ast]}:ast,{fontSize:base.fontSize,baseline:base.baseline});
  remaining[i]=merged;remaining=remaining.filter(n=>!near.includes(n));base=merged;
 }
 return remaining;
}
function rowsOf(ns,tolerance){const rows=[];for(const n of [...ns].sort((a,b)=>a.baseline-b.baseline||a.x-b.x)){let r=rows.find(r=>Math.abs(r[0].baseline-n.baseline)<tolerance);if(!r){r=[];rows.push(r)}r.push(n)}return rows.map(r=>r.sort((a,b)=>a.x-b.x))}

export function reconstructMath(items,vectorInput,{pageNumber=1}={}){
 const segments=Array.isArray(vectorInput)?vectorInput:vectorInput.segments||[];
 if(items.length>2500||segments.length>5000)return {regions:[],consumedItemIds:[],remainingItems:items,warnings:[{reason:'math-complexity-limit',message:'Geometry retained as source images; automatic reconstruction skipped.'}],vectorEvidence:{usedVectorIds:[],skipped:true}};
 const originalItems=items,ocrItems=items.filter(item=>item.source==='ocr');
 items=items.map((item,i)=>({...item,sourceIndex:item.sourceIndex??i})).filter(item=>item.source!=='ocr');
 let nodes=items.map((item,i)=>({...item,kind:'text',ast:{type:'text',text:item.text},sourceText:item.text,sourceItemIds:[item.sourceIndex??i],vectorIds:[],warnings:item.rotated?['rotated-text-unsupported']:[]}));
 const usedVectors=new Set();const lineTol=median(items.map(i=>i.fontSize))*.04;
 const horizontal=segments.filter(s=>Math.abs(s.y2-s.y1)<=Math.max(lineTol,s.lineWidth*.4)&&Math.abs(s.x2-s.x1)>Math.max(4*lineTol,s.lineWidth*4)).map(s=>({...s,x:Math.min(s.x1,s.x2),r:Math.max(s.x1,s.x2),y:(s.y1+s.y2)/2}));
 const vertical=segments.filter(s=>Math.abs(s.x2-s.x1)<=Math.max(lineTol,s.lineWidth*.4)).map(s=>({...s,x:(s.x1+s.x2)/2,y:Math.min(s.y1,s.y2),b:Math.max(s.y1,s.y2)}));
 // Bracketed matrices: both vertical stems, four inward hooks, aligned cells.
 for(const left of vertical){
  const candidates=vertical.filter(v=>v.x>left.x&&Math.abs(v.y-left.y)<=lineTol*3&&Math.abs(v.b-left.b)<=lineTol*3&&v.b-v.y>lineTol*20).sort((a,b)=>a.x-b.x);
  for(const r of candidates){
   const hooks=(v,side)=>horizontal.filter(h=>Math.min(Math.abs(h.y-v.y),Math.abs(h.y-v.b))<=lineTol*3&&Math.min(Math.abs(h.x-v.x),Math.abs(h.r-v.x))<=lineTol*3&&(side===1?h.r>v.x:h.x<v.x));
   const lh=hooks(left,1),rh=hooks(r,-1);if(lh.length!==2||rh.length!==2)continue;
   const inside=nodes.filter(n=>n.x>left.x&&right(n)<r.x&&n.baseline>=left.y&&n.baseline<=left.b&&mathEligible(n.sourceText));
   const fs=median(inside.map(n=>n.fontSize));const rows=rowsOf(inside,fs*.3);if(rows.length<2||rows.length>12||rows.some(row=>row.length!==rows[0].length)||rows[0].length<1)continue;
   if(rows.some(row=>row.some((n,j)=>Math.abs(centerX(n)-centerX(rows[0][j]))>fs*.45)))continue;
   const vs=[left,r,...lh,...rh].map(v=>v.id);if(vs.some(id=>usedVectors.has(id)))continue;
   const n=composite('matrix',inside,{type:'matrix',rows:rows.map(row=>row.map(n=>n.ast))},{x:left.x,y:left.y,width:r.x-left.x,height:left.b-left.y,baseline:(left.y+left.b)/2+fs*.3,fontSize:fs,vectorIds:vs});
   nodes=nodes.filter(n=>!inside.includes(n));nodes.push(n);vs.forEach(id=>usedVectors.add(id));break;
  }
 }
 // Build innermost fractions first; boxes of completed fractions are atoms.
 for(const bar of [...horizontal].sort((a,b)=>(a.r-a.x)-(b.r-b.x))){
  if(usedVectors.has(bar.id))continue;
  const eligible=nodes.filter(n=>mathEligible(n.sourceText)&&centerX(n)>=bar.x&&centerX(n)<=bar.r&&n.x>=bar.x-n.fontSize*.3&&right(n)<=bar.r+n.fontSize*.3);
  const above=eligible.filter(n=>bottom(n)<=bar.y+n.fontSize*.08&&bar.y-bottom(n)<n.fontSize*2.8);
  const below=eligible.filter(n=>n.y>=bar.y-n.fontSize*.08&&n.y-bar.y<n.fontSize*2.8);
  if(!above.length||!below.length)continue;
  const au=above.reduce((a,b)=>bottom(a)>bottom(b)?a:b),bd=below.reduce((a,b)=>a.y<b.y?a:b);
  const top=above.filter(n=>Math.abs(n.baseline-au.baseline)<Math.max(n.fontSize,au.fontSize)*.4);
  const bot=below.filter(n=>Math.abs(n.baseline-bd.baseline)<Math.max(n.fontSize,bd.fontSize)*.4);
  const ns=[...top,...bot],fs=median(ns.map(n=>n.fontSize));
  if(bar.r-bar.x>Math.max(box(top).width,box(bot).width)+fs*2.5)continue;
  const n=composite('fraction',ns,{type:'fraction',numerator:seq(attachScripts(top)),denominator:seq(attachScripts(bot))},{baseline:bar.y+fs*.24,fontSize:fs,vectorIds:uniq([...vids(ns),bar.id])});
  nodes=nodes.filter(n=>!ns.includes(n));nodes.push(n);usedVectors.add(bar.id);
 }
 // A square-root glyph alone does not establish its scope. Accept only an
 // isolated glyph with one explicit overbar enclosing a nonempty radicand.
 // Right-to-left permits nested supported roots; indexed roots remain uncertain.
 for(const radical of [...nodes].filter(n=>n.kind==='text'&&n.sourceText==='√').sort((a,b)=>b.x-a.x)){
  if(!nodes.includes(radical)||radical.rotated)continue;
  const fs=radical.fontSize;
  const bars=horizontal.filter(b=>!usedVectors.has(b.id)&&Math.abs(b.x-right(radical))<=fs*.5&&b.y>=radical.y-fs*.25&&b.y<=radical.y+fs*.4&&b.r-b.x>fs*.3);
  if(bars.length!==1)continue;
  const bar=bars[0];
  const contained=nodes.filter(n=>n!==radical&&n.x>=right(radical)-fs*.25&&right(n)<=bar.r+fs*.2&&n.y>=bar.y-fs*.15&&bottom(n)<=bottom(radical)+fs*.5);
  const indices=nodes.filter(n=>n!==radical&&n.fontSize<fs*.8&&right(n)>=radical.x-fs*.3&&n.x<right(radical)&&n.baseline<radical.baseline-fs*.45&&bottom(n)>=radical.y-fs*.5);
  if(!contained.length||indices.length||contained.some(n=>!mathEligible(n.sourceText)||n.rotated))continue;
  const radicand=box(contained);
  if(bar.r-right(radicand)>fs*.65||contained.some(n=>n.kind==='text'&&n.sourceText==='√'))continue;
  const rs=rowsOf(contained,median(contained.map(n=>n.fontSize))*.4);
  if(rs.length!==1)continue;
  const n=composite('sqrt',[radical,...contained],{type:'sqrt',radicand:seq(attachScripts(rs[0]))},{...box([radical,...contained,{x:bar.x,y:bar.y-bar.lineWidth/2,width:bar.r-bar.x,height:bar.lineWidth}]),baseline:median(contained.map(n=>n.baseline)),fontSize:median(contained.map(n=>n.fontSize)),vectorIds:uniq([...vids(contained),bar.id])});
  nodes=nodes.filter(n=>n!==radical&&!contained.includes(n));nodes.push(n);usedVectors.add(bar.id);
 }
 // Large operator + spatial upper/lower bounds. Other neighbouring glyphs stay atoms.
 for(const op of [...nodes]){
  if(!/^[∫∑∏]$/.test(op.sourceText))continue;
  const near=nodes.filter(n=>n!==op&&n.kind==='text'&&n.fontSize<op.fontSize*.67&&centerX(n)>=op.x-op.fontSize*.25&&centerX(n)<=right(op)+op.fontSize*.22&&mathEligible(n.sourceText));
  const sup=near.filter(n=>n.baseline<op.baseline-op.fontSize*.45&&n.baseline>op.y-op.fontSize*.6);
  const sub=near.filter(n=>n.baseline>op.baseline-op.fontSize*.05&&n.baseline<bottom(op)+op.fontSize*.6);
  const warnings=(sup.length>1||sub.length>1)?['ambiguous-operator-limits']:[];
  const take=warnings.length?[]:[...sup,...sub];
  const n=composite('operator',[op,...take],{type:'operator',symbol:op.sourceText,sup:sup.length===1?sup[0].ast:null,sub:sub.length===1?sub[0].ast:null},{fontSize:op.fontSize*.5,baseline:op.baseline-op.fontSize*.22,warnings});
  nodes=nodes.filter(n=>n!==op&&!take.includes(n));nodes.push(n);
 }
 nodes=attachScripts(nodes);
 // Join expression atoms along their mathematical baseline, respecting wide gaps.
 const candidates=nodes.filter(n=>mathEligible(n.sourceText)&&!n.rotated);
 const groups=[];const assigned=new Set();
 for(const seed of [...candidates].sort((a,b)=>a.baseline-b.baseline||a.x-b.x)){
  if(assigned.has(seed)||!(seed.kind!=='text'||seed.warnings.length||mathSeed(seed.sourceText)))continue;
  let group=[seed],changed=true;assigned.add(seed);
  while(changed){changed=false;for(const n of candidates){if(assigned.has(n))continue;const fs=Math.max(n.fontSize,seed.fontSize),b=box(group),gap=n.x>b.x+b.width?n.x-(b.x+b.width):b.x>right(n)?b.x-right(n):0;
   const incomplete=/[=<>≤≥]\s*$/.test(n.sourceText)||group.some(g=>/[=<>≤≥]\s*$/.test(g.sourceText));
   if(Math.abs(n.baseline-seed.baseline)<=fs*.34&&gap<=fs*(incomplete?3.2:1.8)){group.push(n);assigned.add(n);changed=true}
  }}
  group.sort((a,b)=>a.x-b.x);groups.push(group);
 }
 for(const n of nodes)if(n.rotated&&mathSeed(n.sourceText)&&!assigned.has(n)){groups.push([n]);assigned.add(n);}
 const regions=groups.map((group,index)=>{
  const n=composite('region',group,seq(group));const result=astLatex(n.ast);let warnings=uniq([...n.warnings,...result.warnings]);
  // A separate parenthesized numeral can be an equation label or a factor.
  // Without the document's numbering model, do not silently choose either.
  if(group.some((item,i)=>i>0&&/^\(\d+(?:[.\-]\d+)*\)$/.test(item.sourceText)&&item.x-right(group[i-1])>item.fontSize*.5))warnings.push('equation-label-needs-layout-context');
  const ambiguous=nodes.filter(a=>!group.includes(a)&&!assigned.has(a)&&a.kind==='text'&&mathEligible(a.sourceText)&&a.x>=n.x-n.fontSize*.4&&right(a)<=right(n)+n.fontSize*.8&&a.y<bottom(n)+n.fontSize*.5&&bottom(a)>n.y-n.fontSize*.5);
  if(ambiguous.length){warnings.push('unattached-nearby-math-glyphs');n.sourceItemIds=uniq([...n.sourceItemIds,...ids(ambiguous)]);Object.assign(n,box([n,...ambiguous]));}
  if(/[=<>≤≥]\s*$/.test(result.latex))warnings.push('dangling-relation');
  // A nearby unresolved curve may be a radical, brace, scalable parenthesis,
  // or scientific drawing. Keep it visible rather than asserting flat text.
  const nearbyCurves=(vectorInput.unsupported||[]).filter(v=>v.points?.length).filter(v=>{
    const xs=v.points.map(p=>p[0]),ys=v.points.map(p=>p[1]);
    return Math.max(...xs)>=n.x-n.fontSize*.9&&Math.min(...xs)<=right(n)+n.fontSize*.9&&Math.max(...ys)>=n.y-n.fontSize*.3&&Math.min(...ys)<=bottom(n)+n.fontSize*.3;
  });
  if(nearbyCurves.length){warnings.push('unresolved-nearby-vector-curve');n.vectorIds=uniq([...n.vectorIds,...nearbyCurves.map(v=>v.id)]);Object.assign(n,box([n,...nearbyCurves.flatMap(v=>v.points.map(p=>({x:p[0],y:p[1],width:0,height:0})))]));}
  const verified=result.verified&&!warnings.length;
  return {id:`p${pageNumber}-math-${index+1}`,bbox:[n.x,n.y,n.width,n.height],latex:verified?result.latex:null,ast:n.ast,verified,verification:'supported-geometry-only',sourceItemIds:n.sourceItemIds,vectorIds:n.vectorIds,warnings,sourceText:n.sourceText};
 });
 const consumedItemIds=uniq(regions.flatMap(r=>r.sourceItemIds));
 return {regions,consumedItemIds,remainingItems:originalItems.filter((item,i)=>item.source==='ocr'||!consumedItemIds.includes(item.sourceIndex??i)),warnings:[...regions.filter(r=>!r.verified).map(r=>({regionId:r.id,warnings:r.warnings})),...(ocrItems.length?[{reason:'ocr-math-unverified',message:'OCR items retained for review; digital geometry cannot establish their mathematical identity.'}]:[])],vectorEvidence:{usedVectorIds:[...usedVectors],unsupported:vectorInput.unsupported||[]}};
}
export {astLatex};
