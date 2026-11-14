import {scientificSpans,isFormulaText} from './semantic-spans.js';
import {toLatex} from './math-geometry.js';
const safeCommands=new Set('frac dfrac tfrac sqrt int sum prod lim sin cos tan log ln exp det rank var cov Pr begin end left right mathbb mathbf mathit mathrm text overline bar hat vec dot ddot partial nabla infty le leq ge geq ne neq approx equiv pm times div cdot emptyset varnothing in notin cup cap subset supset subseteq supseteq forall exists alpha beta gamma delta epsilon theta lambda mu pi rho sigma tau phi psi omega Gamma Delta Theta Lambda Pi Sigma Phi Psi Omega prime lvert rvert vert Vert to implies iff quad qquad'.split(' '));
export function explicitLatex(text){
  let body=null,display=false;
  if(text.startsWith('$$')&&text.endsWith('$$')){body=text.slice(2,-2);display=true;}
  else if(text.startsWith('\\[')&&text.endsWith('\\]')){body=text.slice(2,-2);display=true;}
  else if(text.startsWith('\\(')&&text.endsWith('\\)'))body=text.slice(2,-2);
  else if(text.startsWith('$')&&text.endsWith('$'))body=text.slice(1,-1);
  if(body===null||body.length>4000||/[`]/.test(body))return null;
  for(const m of body.matchAll(/\\([A-Za-z]+)/g))if(!safeCommands.has(m[1]))return null;
  let depth=0;for(const c of body){if(c==='{')depth++;if(c==='}'&&--depth<0)return null;}if(depth)return null;
  return {latex:body.trim(),display,verified:true,verification:'literal-source-notation'};
}
// Lexical expressions are bounded by whole prose words. Never join partial
// scientific protection spans: that can omit a left operand or a closing bracket.
function balanced(text){
  const stack=[],closes={')':'(',']':'[','}':'{'};
  for(const c of text){if('([{'.includes(c))stack.push(c);else if(closes[c]&&stack.pop()!==closes[c])return false;}
  return !stack.length;
}
export function inlineMathSpans(text){
  const protectedSpans=scientificSpans(text),out=[];
  const add=(span)=>{if(!out.some(s=>span.start<s.end&&span.end>s.start))out.push(span);};
  for(const span of protectedSpans){const literal=explicitLatex(span.value);if(literal)add({...span,...literal});}
  const atom=String.raw`(?:sin|cos|tan|log|ln|exp|det|rank|Var|Cov|Pr)(?=\s*\()|(?:[A-Za-zα-ωΑ-Ω\u{1D400}-\u{1D7FF}][\p{M}′″‴'’⁰¹²³⁴⁵⁶⁷⁸⁹₀-₉ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓ]*)(?![\p{L}\p{N}_])|\d+(?:[.,]\d+)?|[∅ℝℕℤℚℂ∞∈∉∪∩≤≥≠≈±×÷∫∑∏=<>+−*/^_()[\]{}|\-]|[ \t]`;
  for(const m of text.matchAll(new RegExp('(?<![\\p{L}\\p{N}_])(?:'+atom+')+','gu'))){
    const value=m[0].trim(),start=m.index+m[0].indexOf(value),end=start+value.length;
    if(!value||value.length>400||/[\p{L}\p{N}_]/u.test(text[end]||'')||!balanced(value))continue;
    if(!/[=<>≤≥≠∈∉∪∩∅ℝℕℤℚℂ^_⁰¹²³⁴⁵⁶⁷⁸⁹₀-₉ᵢ′″‴\p{M}\u{1D400}-\u{1D7FF}]/u.test(value)&&!/[A-Za-z]\(/.test(value))continue;
    if(/^[=<>≤≥≠*/^_]|[=<>≤≥≠+−*/^_\-]$/.test(value))continue;
    if(protectedSpans.some(s=>start<s.end&&end>s.start&&(s.kind==='quantity'||/^https?:|^`|\$|\\\(|\\\[/.test(s.value))))continue;
    const parsed=toLatex(value);if(parsed.verified)add({start,end,value,...parsed,display:false});
  }
  // Individual supported identities still render, but malformed larger math
  // stays verbatim rather than being certified through a smaller fragment.
  for(const span of protectedSpans){
    if(span.kind==='quantity'||/[\r\n]/.test(span.value)||!balanced(span.value)||/^[+\-=<>|^⁰¹²³⁴⁵⁶⁷⁸⁹]+$/.test(span.value))continue;
    if(span.kind!=='function'&&!isFormulaText(span.value)&&!/[\p{M}′″‴∅ℝℕℤℚℂ∈∉∪∩α-ωΑ-Ω\u{1D400}-\u{1D7FF}]/u.test(span.value))continue;
    const parsed=toLatex(span.value);if(parsed.verified)add({...span,...parsed,display:false});
  }
  return out.sort((a,b)=>a.start-b.start);
}
export function formulaLatex(block,text){
  // A source edit invalidates geometric verification. Never reuse old geometry for a corrected expression.
  if(block.math?.verified&&block.math.latex&&text===block.text&&!(block.originalText!==undefined&&block.originalText!==block.text))return {latex:block.math.latex,verified:true};
  if(block.math?.verified===false)return null;
  const literal=explicitLatex(text);if(literal)return literal;
  if(!isFormulaText(text))return null;
  const parsed=toLatex(text);return parsed.verified?parsed:null;
}
