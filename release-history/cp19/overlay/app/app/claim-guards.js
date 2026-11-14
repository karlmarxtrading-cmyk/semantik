/** Bounded bilingual invariants. Detection is not a proof of semantic equivalence. */
const effect = [
  ['down', /\b(?:reduc(?:e|es|ed|ing|tion)|decreas(?:e|es|ed|ing)|lower(?:s|ed|ing)?|declin(?:e|es|ed|ing)|menurun(?:kan)?|menurunkan|penurunan|berkurang|mengurangi|dikurangi)\b/giu],
  ['up', /\b(?:increas(?:e|es|ed|ing)|rais(?:e|es|ed|ing)|ris(?:e|es|ing)|rose|meningkat(?:kan)?|peningkatan|bertambah|menaikkan|kenaikan)\b/giu]
];
const matches=(s,re)=>[...s.matchAll(re)];
export function scientificClaimIssues(source,target){
  const issues=[];
  // Match only explicit direction vocabulary; unknown paraphrases remain a review risk.
  const a=effect.flatMap(([kind,re])=>matches(source,re).map(m=>({kind,index:m.index}))).sort((x,y)=>x.index-y.index);
  const b=effect.flatMap(([kind,re])=>matches(target,re).map(m=>({kind,index:m.index}))).sort((x,y)=>x.index-y.index);
  if(a.length&&b.length&&a.map(x=>x.kind).join()!==b.map(x=>x.kind).join())issues.push('Arah perubahan pada klaim ilmiah berubah.');
  // Respectively/masing-masing binds an ordered pair, unlike a number multiset.
  const paired=/\b(?:respectively|masing-masing)\b/iu;
  const concepts=[[/\bsystolic\b/giu,/\bsistolik\b/giu],[/\bdiastolic\b/giu,/\bdiastolik\b/giu]];
  const relation=s=>{
    if(!paired.test(s))return null;
    const anchors=concepts.flatMap((rs,id)=>rs.flatMap(re=>matches(s,re).map(m=>({id,index:m.index})))).sort((x,y)=>x.index-y.index);
    if(anchors.length!==2||anchors[0].id===anchors[1].id)return null;
    const values=matches(s.slice(anchors[1].index),/[-−+]?\d+(?:[.,]\d+)*/gu).map(m=>m[0]);
    if(values.length!==2)return null;
    return Object.fromEntries(anchors.map((x,i)=>[x.id,values[i]]));
  };
  const ar=relation(source),br=relation(target);
  if(ar&&(!br||Object.keys(ar).some(k=>ar[k]!==br[k])))issues.push('Hubungan nilai sistolik/diastolik dengan urutan masing-masing berubah.');
  const both=/\b(?:both\s+(?:conditions?|requirements?|groups?|hypotheses|sides|inequalities)|kedua\s+(?:syarat|kondisi|kelompok|hipotesis|sisi|pertidaksamaan))\b/iu;
  if(both.test(source)&&!both.test(target))issues.push('Kuantor kedua/both hilang atau berubah menjadi urutan kedua.');
  const clinical=/\b(?:non[- ]?inferiority|non[- ]?inferioritas|randomi[sz]ed|acak|patients?|pasien|clinical|klinis|placebo|plasebo)\b/iu;
  if(clinical.test(source)&&/\btrial\b/iu.test(source)&&/\b(?:pengadilan|persidangan)\b/iu.test(target))issues.push('Makna trial klinis berubah menjadi perkara pengadilan.');
  const confidence=/\bconfidence\s+(?:intervals?|limits?|bounds?|levels?)\b/iu;
  if(confidence.test(source)&&/\b(?:kepercayaan\s+diri|percaya\s+diri)\b/iu.test(target))issues.push('Istilah confidence statistik berubah menjadi kepercayaan diri.');
  const necessary=/\b(?:only if|hanya jika)\b/iu, iff=/\b(?:if and only if|jika dan hanya jika)\b/iu;
  if(necessary.test(source)&&(!necessary.test(target)||iff.test(source)!==iff.test(target)))issues.push('Implikasi hanya jika/only if berubah.');
  const scientific=[[/\b(?:rawat inap|hospital admissions|hospitalization|inpatient)\b/iu,/\b(?:intimacy|keintiman)\b/iu], [/\b(?:estimator|penduga)\b/iu,/\b(?:expectants|peramal)\b/iu]];
  for(const [sourceTerm,badMeaning] of scientific)if(sourceTerm.test(source)&&badMeaning.test(target))issues.push('Istilah ilmiah berubah ke makna yang tidak sesuai konteks.');
  if(/\b(?:exposure|paparan)\b/iu.test(source)&&! /\b(?:exposure|paparan|eksposur)\b/iu.test(target))issues.push('Hubungan paparan/exposure hilang dari klaim.');
  // Bilingual concept anchors reject known scientific sense loss; they do not
  // claim that arbitrary unlisted concepts are semantically verified.
  const conceptAnchors=[
    ['tetapan kesetimbangan', /\b(?:equilibrium constants?|(?:tetapan|konstanta) kesetimbangan)\b/iu],
    ['varians', /\b(?:variance|variances|varians|ragam)\b/iu],
    ['upah nominal', /\b(?:nominal wages?|upah nominal|gaji nominal)\b/iu],
    ['daya beli', /\b(?:purchasing power|daya beli)\b/iu],
    ['penilai luaran', /\b(?:outcome assessors?|penilai (?:luaran|hasil)|asesor (?:luaran|hasil))\b/iu],
  ];
  for(const [label,re] of conceptAnchors)if(re.test(source)&&!re.test(target))issues.push('Konsep ilmiah '+label+' hilang atau berubah.');
  // Negation counts alone cannot distinguish inclusion of a null effect from
  // exclusion of an effect. Require the same explicit interval relationship.
  const ci=/\b(?:confidence interval|interval kepercayaan|selang kepercayaan)\b/iu;
  const includesNull=/\b(?:includes? (?:no effect|zero|the null)|(?:mencakup|meliputi|memuat) (?:tidak adanya efek|tanpa efek|nol))\b/iu;
  if(ci.test(source)&&includesNull.test(source)&&!(ci.test(target)&&includesNull.test(target)))issues.push('Cakupan interval terhadap efek nol berubah atau hilang.');
  return issues;
}
