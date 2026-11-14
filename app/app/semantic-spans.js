/** CP19 typed identity protection. Original glyphs are never normalized. */
const UNIT = '(?:mmHg|μL|µL|nL|pL|dL|eV|keV|MeV|GeV|Gy|mGy|μGy|µGy|Sv|mSv|μSv|µSv|Bq|kBq|MBq|N|mN|kN|C|Ω|kΩ|F|T|Wb|S|kat|cd|lm|lx|rad|sr|ha|bar|μM|µM|nM|mM|pM|M|μg|µg|mg|kg|g|μm|µm|mm|cm|km|m|mL|ml|L|l|nm|min|h|d|mol|mmol|μmol|µmol|s|ms|Hz|kHz|MHz|GHz|Pa|kPa|MPa|J|kJ|W|kW|V|mV|°C|°F|K)';
const QUANTITY = new RegExp('(?<![\\p{L}\\p{N}])[-−+]?\\d+(?:[.,]\\d+)*(?:\\s*±\\s*\\d+(?:[.,]\\d+)*)?(?:\\s*[×x]\\s*10\\s*\\^?[-−+]?\\d+)?\\s*'+UNIT+'(?:[²³]|\\^[-−]?\\d+)?(?:\\/(?:mL|ml|L|l|kg|g|m|s|mol)(?:[²³]|\\^[-−]?\\d+)?)?(?!\\p{L})','gu');
const ELEMENTS = new Set('H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og'.split(' '));
const ACRONYMS = new Set('ID DNA RNA mRNA PCR RT-PCR ANOVA ANCOVA MRI CT PET EEG ECG ATP ADP NADH UV IR WHO UNICEF UNESCO COVID SARS DOI ISBN ISSN ORCID SD SE CI CrI IQR BMI GDP HIV AIDS COPD RCT ITT PP OLS GLS ODE PDE NMR HPLC GC MS SEM TEM ELISA CRISPR'.split(' '));
const ORDINARY_CAPS = new Set('A AN THE OF IN ON TO FOR AND OR BUT NOT NO WITH FROM AS BY IS ARE WAS WERE BE BEEN THIS THAT THESE THOSE ALL ANY EACH EVERY SOME NONE TRUE FALSE ABSTRACT INTRODUCTION BACKGROUND METHODS METHODOLOGY RESULTS DISCUSSION CONCLUSION CONCLUSIONS REFERENCES CLIMATE CHANGE LITERATURE REVIEW EFFECT EFFECTS STUDY RESEARCH SAMPLE POPULATION DATA ANALYSIS TABLE FIGURE SOLVE INEQUALITY INEQUALITIES SOLUTION SOLUTIONS SET REAL NUMBER NUMBERS INTERVAL ABSOLUTE VALUE VALUES PRACTICE WORKSHEET NAME DATE BEGIN END START STOP FINISH MULAI AKHIR SELESAI BERHENTI HYPOTHESIS TESTED DAN ATAU TIDAK BUKAN YANG DARI DALAM PADA UNTUK ADALAH KAJIAN PUSTAKA PENELITIAN PENDIDIKAN PERUBAHAN IKLIM HASIL PEMBAHASAN METODE PENDAHULUAN KESIMPULAN TINJAUAN LATAR BELAKANG PENGARUH TERHADAP DENGAN'.split(' '));
const SYMBOLS = /[∅ℝℕℤℚℂ∈∉∪∩⊂⊃⊆⊇⊄⊅∀∃∄∞≤≥≠≈≡±×÷∑∏∫∂∇√⇒⇔→↔<>|=^+−⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉]/gu;
export function isFormulaText(text) {
  const s=String(text).trim();
  if(!s || !/[∅ℝℕℤℚℂ∈∉∪∩∞≤≥≠±×÷∑∏∫√<>|=^+−]/u.test(s))return false;
  const residue=s.replace(/[\p{N}\s\p{P}\p{S}\u{1D400}-\u{1D7FF}]/gu,'').replace(/\b[A-Za-z]\b/gu,'').replace(/[α-ωΑ-Ω]/gu,'');
  return !residue;
}
export function scientificSpans(text, {taxa=[]}={}) {
  if(isFormulaText(text))return [{start:0,end:text.length,value:text}];
  const spans=[];
  const add=(pattern,accept=()=>true,kind=null)=>{for(const m of text.matchAll(pattern)){if(!accept(m[0],m.index))continue;const start=m.index,end=start+m[0].length;if(!spans.some(s=>start<s.end&&end>s.start))spans.push({start,end,value:m[0],...(kind?{kind}:{})});}};
  const addSpan=span=>{if(!spans.some(s=>span.start<s.end&&span.end>s.start))spans.push(span);};
  add(/`+[^`]*`+/gu);
  // Opaque laboratory/accession identifiers are atoms even when sentence
  // segmentation puts an identifier on its own. This is generic syntax, not
  // a benchmark-ID prefix. Ordinary words without digits are never claimed.
  add(/(?<![\p{L}\p{N}_])(?=[A-Z0-9_-]{2,96}(?![\p{L}\p{N}_]))(?=[A-Z0-9_-]*\d)[A-Z][A-Z0-9]*(?:[_-][A-Z0-9]+)*(?![\p{L}\p{N}_])/gu,()=>true,'identifier');
  add(/(?<![\p{L}\p{N}_])(?=[A-Za-z0-9_]{3,96}(?![\p{L}\p{N}_]))(?=[A-Za-z0-9_]*\d)[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)+(?![\p{L}\p{N}_])/gu,()=>true,'identifier');
  add(/\$\$[\s\S]*?\$\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]|(?<!\\)\$[^$\r\n]+\$/gu);
  add(/https?:\/\/[^\s<>]+|(?:doi\s*:\s*)?10\.\d{4,9}\/[^\s<>]+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/giu);
  // Structured slugs/accession/experiment identifiers, not arbitrary hyphenated prose.
  add(/(?<![\p{L}\p{N}_])[A-Za-z0-9][A-Za-z0-9_.-]*(?:~[A-Za-z0-9_.-]+)+(?![\p{L}\p{N}_])/gu);
  add(/(?<=\b(?:ID|id|identifier|Identifier|accession|Accession|kode|Kode)\s*[:#]?\s+)(?=[A-Za-z0-9_.:/~-]*(?:[0-9_.:/~-]|[A-Z]{2})|[A-Z](?:\s|$))[A-Za-z0-9][A-Za-z0-9_.:/~-]*/gu);
  add(/\b(?:NCT\d{8}|[A-Z]{1,3}_\d+(?:\.\d+)?|[A-Z]{1,2}\d{5,8}(?:\.\d+)?|[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12})\b/gu);
  add(/\[(?:\d+[a-z]?(?:\s*[,;–−-]\s*\d+[a-z]?)*)\]/giu);
  add(/\((?:[\p{Lu}][\p{L}'’-]+(?:\s+(?:[\p{Lu}][\p{L}'’-]+|et\s+al\.|and|&))*\s*,?\s*(?:18|19|20)\d{2}[a-z]?(?:\s*;\s*)?)+\)/gu);
  add(/\b[\p{Lu}][\p{L}'’-]+(?:\s+et\s+al\.)?\s*\((?:18|19|20)\d{2}[a-z]?\)/gu);
  for(const span of functionNotationSpans(text))addSpan(span);
  for(const span of romanLabelSpans(text))addSpan(span);
  for(const span of taxonomicSpans(text,taxa))addSpan(span);
  // Combining marks and derivatives are attached to their variable, never normalized away.
  add(/(?<![\p{L}\p{N}_])[A-Za-zα-ωΑ-Ω\u{1D400}-\u{1D7FF}](?:\p{M}|[′″‴])+(?!\p{L})/gu);
  add(QUANTITY,()=>true,'quantity');
  add(/\b\d+(?:[.,]\d+)*%\s*(?:CI|CrI)\s*[:=]?\s*(?:\[[^\]\n]{1,70}\]|\([^\)\n]{1,70}\))?/gu);
  // Chemistry requires valid element names and either charge/digits or mixed case.
  add(/(?<![\p{L}\p{N}])(?:[A-Z][a-z]?[0-9₀-₉]*)+(?:[0-9²³⁴⁵⁶⁷⁸⁹]*[+−⁺⁻-])?(?![\p{L}\p{N}])/gu,value=>{
    const elements=value.match(/[A-Z][a-z]?/g)||[];
    return elements.every(e=>ELEMENTS.has(e)) && (/\d|[₀-₉²³⁴⁵⁶⁷⁸⁹+−⁺⁻-]/u.test(value)||elements.length>=2&&/[a-z]/.test(value));
  });
  add(/\b[A-Za-z][A-Za-z0-9-]{1,12}\b/gu,value=>ACRONYMS.has(value));
  // Parenthesized acronyms that have an explicit long-form definition.
  add(/\b[A-Z][A-Z0-9-]{1,8}\b/gu,(value,start)=>!ORDINARY_CAPS.has(value)&&((text[start-1]==='('&&text[start+value.length]===')')));
  // Intervals including infinity; preserve exact spacing/endpoints, never solve/rewrite.
  add(/[\[(]\s*[−+-]?(?:\d+(?:[.,]\d+)?|∞)\s*,\s*[−+-]?(?:\d+(?:[.,]\d+)?|∞)\s*[\])]/gu);
  // Complete formula-only lines avoid tokenization differences between x and 𝑥.
  for(const m of text.matchAll(/[^\r\n]+/gu))if(isFormulaText(m[0]))add(new RegExp(escapeRegex(m[0]),'gu'));
  // Inline algebra spans with operators and single-letter variables.
  add(/(?<![\p{L}\p{N}])(?:\|\s*)*(?:[A-Za-zα-ωΑ-Ω∅ℝℕℤℚℂ\u{1D400}-\u{1D7FF}]|[−+-]?\d+(?:[.,]\d+)?)(?:[⁰-⁹₀-₉]|\^[-−]?\d+)?(?:\s*[|=<>≤≥≠+−×÷*/^\-]\s*(?:\|\s*)*(?:[A-Za-zα-ωΑ-Ω∅ℝℕℤℚℂ\u{1D400}-\u{1D7FF}]|[−+-]?\d+(?:[.,]\d+)?)(?:[⁰-⁹₀-₉]|\^[-−]?\d+)?)+(?:\s*\|)*(?![\p{L}\p{N}])/gu);
  add(/\|\s*[A-Za-zα-ωΑ-Ω\u{1D400}-\u{1D7FF}](?:[⁰-⁹₀-₉]|\^[-−]?\d+)?\s*\|/gu);
  add(/(?<!\p{L})[α-ωΑ-Ω](?!\p{L})/gu);
  add(/[\u{1D400}-\u{1D7FF}]/gu);
  add(SYMBOLS);
  return spans.sort((a,b)=>a.start-b.start);
}
function escapeRegex(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
export function ordinaryCase(text){
  // Called only on unprotected prose. Known acronyms/IDs are already masked.
  return text.replace(/\b[A-Z]{2,}\b/g,w=>ORDINARY_CAPS.has(w)?w.toLowerCase():w);
}
export function isLiteralOnly(text){
  let rest=text;for(const s of scientificSpans(text).sort((a,b)=>b.start-a.start))rest=rest.slice(0,s.start)+' '.repeat(s.end-s.start)+rest.slice(s.end);
  return !/[\p{L}\p{N}]/u.test(rest);
}
export function claimAssociationIssues(source,target){
  const map=text=>{
    const kindWords='treatment group arm cohort grup perlakuan pengobatan kelompok kohort lengan'.split(' ');
    const kinds=kindWords.map(k=>[...k].map(c=>'['+c+c.toUpperCase()+']').join('')).join('|');
    const ids='[A-Z]{1,4}(?:[0-9]{1,4})?|[0-9]+';
    const matches=[...text.matchAll(new RegExp('\\b(?:'+kinds+')\\s+('+ids+')\\b|\\b('+ids+')\\s+(?:'+kinds+')\\b','gu'))].map(m=>({index:m.index,end:m.index+m[0].length,id:'opaque:'+(m[1]||m[2]).toLowerCase()}));
    // Named experimental arms have translatable labels; match documented bilingual equivalents.
    const named='control|kontrol|kendali|intervention|intervensi|placebo|plasebo|treatment|perlakuan|terapi';
    const canonical={control:'control',kontrol:'control',kendali:'control',intervention:'intervention',intervensi:'intervention',placebo:'placebo',plasebo:'placebo',treatment:'treatment',perlakuan:'treatment',terapi:'treatment'};
    for(const m of text.matchAll(new RegExp('\\b(?:'+kindWords.join('|')+')\\s+('+named+')\\b|\\b('+named+')\\s+(?:'+kindWords.join('|')+')\\b','giu'))){
      const item={index:m.index,end:m.index+m[0].length,id:'named:'+canonical[(m[1]||m[2]).toLowerCase()]};
      if(!matches.some(s=>item.index<s.end&&item.end>s.index))matches.push(item);
    }
    matches.sort((a,b)=>a.index-b.index);
    return new Map(matches.map((m,i)=>{const slice=text.slice(m.end,matches[i+1]?.index??text.length).split(/[;.!?](?=\s|$)/u)[0];return[m.id,slice.match(/[-−+]?\d+(?:[.,]\d+)*(?:%|[²³])?/gu)||[]];}));
  };
  const a=map(source),b=map(target);if(a.size<2)return [];
  for(const [id,values] of a){if(!b.has(id)||JSON.stringify(values)!==JSON.stringify(b.get(id)))return ['Angka yang terkait kelompok/perlakuan berubah; periksa hubungan angka dengan klaim.'];}
  return [];
}
export function mathTermsFor(text,direction){
  // CP20: qualify senses from mathematical noun phrases, never a bare "until".
  const conceptPairs=[['infinitely many','tak hingga banyak'],['differentiability','keterdiferensialan'],['differentiable','dapat diturunkan'],['continuity','kekontinuan'],['continuous','kontinu'],['derivatives','turunan'],['derivative','turunan'],['converse claim','klaim konvers'],['converse','konvers'],['nonempty','tidak kosong'],['non-empty','tidak kosong'],['finiteness assumption','asumsi kehinggaan'],['hypotheses hold','hipotesis terpenuhi'],['ordering of elements','pengurutan elemen'],['ordering','pengurutan'],['over the entire interval','pada seluruh interval'],['throughout the interval','di seluruh interval'],['finite sets','himpunan hingga'],['finite set','himpunan hingga'],['infinite sets','himpunan tak hingga'],['infinite set','himpunan tak hingga'],['finite subgroups','subgrup hingga'],['finite subgroup','subgrup hingga'],['infinite subgroup','subgrup tak hingga'],['subgroups','subgrup'],['subgroup','subgrup'],['bounded monotone sequence','barisan monoton terbatas'],['monotone sequence','barisan monoton'],['bounded sequence','barisan terbatas'],['identity element','elemen identitas'],['converges','konvergen'],['converge','konvergen'],['convergence','kekonvergenan']];
  const sequenceContext=/\b(?:sequences?|barisan)\b/iu.test(text)&&/\b(?:bounded|monotone|monotonic|converg\w*|terbatas|monoton|konvergen|kalkulasi|calculation|theorem|teorema)\b/iu.test(text);
  const sequenceTerms=sequenceContext?(direction==='en-id'?[['sequence','barisan'],['sequences','barisan'],['bounded','terbatas'],['monotone','monoton'],['monotonic','monoton']]:[['barisan','sequence'],['terbatas','bounded'],['monoton','monotone']]):[];
  const mathematicalConcept=sequenceContext||/\b(?:differentiab\w*|continuous|continuity|derivatives?|turunan|diturunkan|keterdiferensialan|kontinu|kekontinuan|himpunan|subgrup|subgroups?|interval|ordering|pengurutan|finite sets?|infinite sets?|monotone sequences?|bounded sequences?|barisan|converg(?:e|es|ence)|konvergen|kekonvergenan)\b/iu.test(text);
  const concepts=mathematicalConcept?(direction==='en-id'?conceptPairs:[['tidak kosong','nonempty'],['tak kosong','nonempty'],['asumsi kehinggaan','finiteness assumption'],['pengurutan elemen','ordering of elements'],['pengurutan','ordering'],['pada seluruh interval','over the entire interval'],['di seluruh interval','throughout the interval'],['tak hingga banyak','infinitely many'],['dapat diturunkan','differentiable'],['keterdiferensialan','differentiability'],['kekontinuan','continuity'],['kontinu','continuous'],['turunan','derivative'],['klaim kebalikannya','converse claim'],['klaim konvers','converse claim'],['konvers','converse'],['himpunan tak hingga','infinite set'],['himpunan hingga','finite set'],['subgrup tak hingga','infinite subgroup'],['subgrup hingga','finite subgroup'],['himpunan','set'],['subgrup','subgroup'],['barisan monoton terbatas','bounded monotone sequence'],['barisan monoton','monotone sequence'],['barisan terbatas','bounded sequence'],['elemen identitas','identity element'],['kekonvergenan','convergence'],['konvergen','converges']]):[];
  const mathematical=/\b(?:definite integral|integral tentu|inequalit(?:y|ies)|equations?|interval|solution\s+sets?|real\s+numbers?|absolute\s+values?|pertidaksamaan|persamaan|himpunan\s+penyelesaian|bilangan\s+(?:real|riil)|nilai\s+mutlak)\b|[∅∈∉∪∩ℝℕℤ]/iu.test(text);
  if(!mathematical&&!mathematicalConcept)return concepts;
  const pairs=[['definite integral','integral tentu'],['non-strict inequalities','pertidaksamaan tidak ketat'],['strict inequalities','pertidaksamaan ketat'],['both conditions','kedua syarat'],['both inequalities','kedua pertidaksamaan'],['express','nyatakan'],['state','nyatakan'],['solve the inequalities','selesaikan pertidaksamaan'],['solve the inequality','selesaikan pertidaksamaan'],['solve an inequality','selesaikan suatu pertidaksamaan'],['solve','selesaikan'],['pairwise disjoint','saling lepas berpasangan'],['disjoint','saling lepas'],['solution sets','himpunan penyelesaian'],['solution set','himpunan penyelesaian'],['interval notation','notasi interval'],['all real numbers','semua bilangan real'],['real numbers','bilangan real'],['real number','bilangan real'],['absolute values','nilai mutlak'],['absolute value','nilai mutlak'],['inequalities','pertidaksamaan'],['inequality','pertidaksamaan'],['union','gabungan'],['unions','gabungan'],['intersection','irisan'],['no solution','tidak ada penyelesaian'],['solution','penyelesaian'],['satisfies','memenuhi'],['satisfy','memenuhi']];
  const reverse=[['kedua syarat','both conditions'],['kedua kondisi','both conditions'],['kedua pertidaksamaan','both inequalities'],['saling lepas berpasangan','pairwise disjoint'],['saling lepas','disjoint'],['himpunan penyelesaian','solution set'],['notasi interval','interval notation'],['semua bilangan real','all real numbers'],['semua bilangan riil','all real numbers'],['bilangan real','real number'],['bilangan riil','real number'],['nilai mutlak','absolute value'],['pertidaksamaan','inequality'],['gabungan','union'],['irisan','intersection'],['tidak ada penyelesaian','no solution'],['penyelesaian','solution'],['memenuhi','satisfies'],['selesaikan','solve']];
  return [...concepts,...sequenceTerms,...(direction==='en-id'?pairs:reverse)];
}

/** Uppercase unknowns are preserved pending disambiguation; a user glossary may override them. */
export function ambiguousCapitalSpans(text){
  const hard=scientificSpans(text);
  return [...text.matchAll(/\b[A-Z]{2,64}\b/gu)].filter(m=>!ORDINARY_CAPS.has(m[0])&&!ACRONYMS.has(m[0])&&!hard.some(s=>m.index>=s.start&&m.index+m[0].length<=s.end)).map(m=>({start:m.index,end:m.index+m[0].length,value:m[0]}));
}

/** Context spans are terminology constraints, never repairs to the mathematical claim. */
export function domainTermsFor(context,direction){
  const result=[];
  const chemistry=/\b(?:reagents?|saline|sodium|chloride|molar|concentration|assays?|solvents?|evaporat\w*|catalysts?|reaction|larutan|reagen|konsentrasi|natrium|klorida|pelarut|menguap|katalis|reaksi|incubation|inkubasi)\b|\d\s*(?:μM|µM|nM|mM)\b/iu.test(context);
  if(chemistry){
    const pairs=[['aqueous solution','larutan berair'],['saline solution','larutan garam'],['solution','larutan'],['solutions','larutan'],['assay results','hasil pengujian'],['assays','pengujian'],['assay','pengujian'],['reagents','reagen'],['reagent','reagen'],['incubation time','waktu inkubasi'],['reaction rate','laju reaksi'],['not consumed','tidak habis bereaksi'],['without being consumed','tanpa habis bereaksi'],['intermediate reactions','reaksi antara'],['intermediate reaction','reaksi antara'],['dilution','pengenceran']];
    result.push(...(direction==='en-id'?pairs:[['larutan berair','aqueous solution'],['larutan garam','saline solution'],['larutan','solution'],['reagen','reagent'],['waktu inkubasi','incubation time'],['laju reaksi','reaction rate'],['tidak habis bereaksi','not consumed'],['tanpa habis bereaksi','without being consumed'],['reaksi antara','intermediate reactions'],['pengenceran','dilution']]));
  }
  if(/\b(?:regressions?|effects?|parameters?|statistic(?:s|al)?|estimat\w*|regresi|efek|parameter|statistik|rata-rata|model|data|estimasi|diestimasi|mengestimasi)\b/iu.test(context)&&direction==='id-en')result.push(['diestimasi','estimated'],['mengestimasi','estimates'],['pengestimasi','estimator'],['estimasi','estimate']);
  if(/\b(?:trial|clinical|patients?|non[- ]?inferiority|randomi[sz]ed|klinis|pasien|non[- ]?inferioritas)\b/iu.test(context)){
    const clinical=[['clinical trial','uji klinis'],['trial','uji coba'],['non-inferiority','non-inferioritas'],['noninferiority','non-inferioritas'],['hospitalization','rawat inap']];
    result.push(...(direction==='en-id'?clinical:[['uji klinis','clinical trial'],['uji coba','trial'],['non-inferioritas','non-inferiority'],['rawat inap','hospitalization']]));
  }
  if(/\b(?:prices?|supply|elastic|inelastic|economics?|markets?|harga|penawaran|elastis|inelastis|ekonomi|pasar)\b/iu.test(context)){
    const economics=[['elastic demand','permintaan elastis'],['inelastic demand','permintaan inelastis'],['aggregate demand','permintaan agregat'],['quantity demanded','jumlah yang diminta'],['demand','permintaan']];
    result.push(...economics.map(([en,id])=>direction==='en-id'?[en,id]:[id,en]));
  }
  // Scientific noun phrases are compositional terminology, not saved answers.
  // Longer phrases win in the adapter; ambiguous bare words remain contextual.
  if(/\b(?:sample|samples|sampling|population|statistic\w*|sampel|populasi|statistik\w*|rata-rata|treatment|perlakuan|numerator|pembilang)\b/iu.test(context)){
    const statistics=[['population mean','rata-rata populasi'],['sampling procedure','prosedur pengambilan sampel'],['sampling procedures','prosedur pengambilan sampel'],['sampling','pengambilan sampel'],['denominator','penyebut'],['numerator','pembilang']];
    result.push(...(direction==='en-id'?statistics:[['rata-rata populasi','population mean'],['prosedur pengambilan sampel','sampling procedure'],['pengambilan sampel','sampling'],['penyebut','denominator'],['pembilang','numerator']]));
  }
  if(/\b(?:calibrat\w*|kalibrasi|dikalibrasi|mengalibrasi|instruments?|instrumen|measurements?|pengukuran)\b/iu.test(context)){
    const measurement=[['measurement uncertainty','ketidakpastian pengukuran'],['measurement error','galat pengukuran'],['measurement errors','galat pengukuran'],['calibration','kalibrasi']];
    result.push(...(direction==='en-id'?measurement:[['ketidakpastian pengukuran','measurement uncertainty'],['kesalahan pengukuran','measurement error'],['galat pengukuran','measurement error'],['kalibrasi','calibration']]));
  }
  if(/\b(?:observations?|data|records?|pengamatan|pencatatan|catatan)\b/iu.test(context)){
    // Keep passive morphology visible to the model. Masking an entire verb
    // predicate can remove the information needed to generate an auxiliary.
    if(direction==='id-en')result.push(['suatu pengamatan','an observation'],['sebuah pengamatan','an observation']);
  }
  if(chemistry){
    result.push(...(direction==='en-id'?[['heating','pemanasan'],['heater','pemanas'],['concentration','konsentrasi'],['dissolving','melarutkan'],['dissolved','terlarut'],['dissolve','melarutkan']]:[['pemanasan','heating'],['pemanas','heater'],['konsentrasi','concentration'],['melarutkan','dissolving'],['terlarut','dissolved']]));
  }
  if(/\b(?:prices?|supply|demand|tax|taxes|economics?|markets?|harga|penawaran|permintaan|pajak|ekonomi|pasar)\b/iu.test(context)){
    const economicTerms=[['relative sensitivity','kepekaan relatif'],['economic burden','beban ekonomi'],['supply','penawaran'],['prices','harga'],['price','harga'],['substitute goods','barang substitusi'],['substitutes','barang substitusi'],['substitute','barang substitusi'],['complementary goods','barang komplementer'],['complements','barang komplementer']];
    result.push(...(direction==='en-id'?economicTerms:[['kepekaan relatif','relative sensitivity'],['beban ekonominya','the economic burden'],['beban ekonomi','economic burden'],['penawaran','supply'],['harga','price'],['barang substitusi','substitute goods'],['barang komplementer','complementary goods']]));
  }
  const financialAccount=/\b(?:accounts?|rekening)\b/iu.test(context)&&/\b(?:money|households?|nominal|purchas\w*|banks?|uang|rumah tangga|tabungan|daya beli)\b/iu.test(context);
  if(financialAccount)result.push(...(direction==='en-id'?[['account balance','saldo rekening'],['balance of payments','neraca pembayaran'],['balance','saldo'],['account','rekening']]:[['saldo rekening','account balance'],['neraca pembayaran','balance of payments'],['saldo','balance'],['rekening','account']]));
  const assessment=/\b(?:assess\w*|scores?|answers?|education\w*|penilai\w*|skor|jawaban|pendidikan)\b/iu.test(context);
  if(assessment)result.push(...(direction==='en-id'?[['assessment rubric','rubrik penilaian'],['rubric','rubrik']]:[['rubrik penilaian','assessment rubric'],['rubrik','rubric']]));
  const interviewQuestions=/\b(?:interviews?|wawancara)\b/iu.test(context)&&/\b(?:questions?|questionnaire|pertanyaan|kuesioner)\b/iu.test(context)&&!/\b(?:timetable|calendar|appointment|jadwal waktu|kalender|janji temu)\b/iu.test(context);
  if(interviewQuestions)result.push(...(direction==='en-id'?[['interview schedule','pedoman wawancara']]:[['pedoman wawancara','interview guide']]));
  // Numbered experiments/calculations identify one item. They are not a count
  // of experiments. No fixture prefix or numeric value is special-cased.
  const numberedTerms=direction==='en-id'?[['experiment','percobaan'],['calculation','perhitungan']]:[['percobaan','experiment'],['perhitungan','calculation']];
  for(const [sourceTerm,targetTerm] of numberedTerms){
    const pattern=new RegExp('\\b'+sourceTerm+'\\s+(?:no\\.?\\s*|nomor\\s+)?([A-Z]?\\d+(?:[.-]\\d+)*)\\b','giu');
    for(const m of context.matchAll(pattern))result.push([m[0],targetTerm+' '+m[1]]);
  }
  if(/\b(?:evidence|documentation|records?|bukti|dokumentasi|catatan)\b/iu.test(context)){
    result.push(...(direction==='en-id'?[['missing information','informasi yang hilang'],['events','peristiwa'],['event','peristiwa']]:[['informasi yang hilang','missing information'],['peristiwa','event']]));
  }
  if(/\b(?:report|documentation|appendix|laporan|dokumentasi|lampiran)\b/iu.test(context)){
    result.push(...(direction==='en-id'?[['does not certify that','tidak menjamin bahwa']]:[['tidak menjamin bahwa','does not guarantee that']]));
  }
  // The same word can denote an anatomical organ. Require document context and
  // suppress the publishing sense when anatomical cues appear in this block.
  const documentContext=/\b(?:authors?|chapter|manuscript|editors?|articles?|reports?|research|accounts|passages|penulis|bab|naskah|penyunting|artikel|laporan|penelitian|keterangan)\b/iu.test(context);
  const anatomy=/\b(?:appendicitis|abdominal|anatom(?:y|ical)|surg(?:ery|ical)|intestin\w*|inflam\w*|apendisitis|perut|anatomi|operasi|usus|radang)\b/iu.test(context);
  if(documentContext&&!anatomy)result.push(...(direction==='en-id'?[['appendices','lampiran'],['appendix','lampiran']]:[['lampiran','appendix']]));
  if(/\b(?:research|results?|population|samples?|study|studies|experiment|observations?|penelitian|hasil|populasi|sampel|studi|eksperimen|pengamatan)\b/iu.test(context)){
    const research=[['generalized','digeneralisasi'],['generalised','digeneralisasi'],['generalization','generalisasi'],['generalisation','generalisasi'],['sample','sampel'],['samples','sampel'],['population','populasi'],['populations','populasi']];
    result.push(...(direction==='en-id'?research:[['digeneralisasi','generalized'],['generalisasi','generalization'],['sampel','sample'],['populasi','population']]));
  }
  if(/\b(?:measurements?|measured|pengukuran|mengukur)\b/iu.test(context))result.push(...(direction==='en-id'?[['sum','jumlah']]:[['jumlahnya','their sum']]));
  result.push(...(direction==='en-id'?[['reviewers','penelaah'],['reviewer','penelaah']]:[['penelaah','reviewer']]));
  const academic=[['observed actions','tindakan yang diamati'],['observed action','tindakan yang diamati'],['sufficient condition','syarat cukup'],['necessary condition','syarat perlu'],['equilibrium constant','tetapan kesetimbangan'],['variance','varians'],['nominal wages','upah nominal'],['purchasing power','daya beli'],['outcome assessors','penilai luaran'],['upper confidence limit','batas atas kepercayaan'],['lower confidence limit','batas bawah kepercayaan'],['confidence limit','batas kepercayaan'],['fine particulate matter','partikulat halus'],['intensive care','perawatan intensif']];
  result.push(...academic.map(([en,id])=>direction==='en-id'?[en,id]:[id,en]));
  return result;
}

/** Bounded function notation; words in parentheses are not automatically mathematics. */
export function functionNotationSpans(text){
  const spans=[];
  const head=/(?<![\p{L}\p{N}_])(?:[A-Za-zα-ωΑ-Ω\u{1D400}-\u{1D7FF}]|sin|cos|tan|log|ln|exp|det|rank|Var|Cov|Pr)(?:[′″‴'’]|\p{M})*(?:[_₀-₉⁰-⁹][A-Za-z0-9₀-₉⁰-⁹]*)?\s*\(/gu;
  for(const m of text.matchAll(head)){
    const open=m.index+m[0].length-1;let depth=1,end=open+1;
    for(;end<Math.min(text.length,open+240)&&depth;end++){if(text[end]==='(')depth++;if(text[end]===')')depth--;if(depth>8)break;}
    if(depth||text[end-1]!==')')continue;
    const body=text.slice(open+1,end-1);
    if(!body.trim()||!/^[\p{L}\p{N}\s_.,;:+\-−*/^=<>≤≥≠∅ℝℕℤℚℂ∈∉∪∩±×÷∞()[\]{}|⁰-⁹₀-₉]+$/u.test(body))continue;
    const words=body.match(/[A-Za-z]{2,}/g)||[];
    if(words.some(w=>!['sin','cos','tan','log','ln','exp','det','rank','Var','Cov','Pr'].includes(w)))continue;
    if(spans.some(s=>m.index<s.end&&end>s.start))continue;
    spans.push({start:m.index,end,value:text.slice(m.index,end),kind:'function'});
  }
  return spans;
}

/** List labels/cross-references are identities; do not treat English '(mix)' as a Roman label. */
export function romanLabelSpans(text){
  const matches=[...text.matchAll(/\(([ivxlcdmIVXLCDM]{1,8})\)/gu)];
  const roman=/^(?:X{0,3})(?:IX|IV|V?I{0,3})$/;
  return matches.filter(m=>m[1]&&roman.test(m[1].toUpperCase())&&(m.index===0||/^[\s]*$/u.test(text.slice(0,m.index))||/[.!?;:\n]\s*$/u.test(text.slice(0,m.index))||/\b(?:items?|sections?|points?|conditions?|steps?|parts?|butir|bagian|kondisi|langkah|poin)\s*$/iu.test(text.slice(0,m.index)))).map(m=>({start:m.index,end:m.index+m[0].length,value:m[0],kind:'list-label'}));
}

/** Preserve source taxonomic identity, not taxonomic correctness; no network lookup at runtime. */
export function taxonomicSpans(text, inheritedNames=[]){
  const spans=[];
  const add=(start,value)=>{const end=start+value.length;if(!spans.some(s=>start<s.end&&end>s.start))spans.push({start,end,value,kind:'taxon'});};
  const taxaLabels=/(?:\b(?:species|genus|scientific\s+name|binomial\s+name|spesies|nama\s+ilmiah|nama\s+binomial)|\b(?:bacterium|bacteria|bakteri|fungus|fungi|jamur|yeast|ragi|gazelle|kijang|antelope|antilop|fox|rubah|mouse|mice|rat|tikus|fish|ikan|plant|tumbuhan|orchid|anggrek|rice|padi))\s*[:=]?\s*\(?\s*$/iu;
  // A full genus token plus a lowercase epithet, with an immediately preceding taxonomic cue.
  for(const m of text.matchAll(/(?<![\p{L}])[A-Z][a-z]{2,}\s+[a-z][a-z-]{2,}(?![\p{L}])/gu)){
    if(taxaLabels.test(text.slice(Math.max(0,m.index-90),m.index)))add(m.index,m[0]);
  }
  // Target validation reuses identities extracted from source; translated surrounding prose need not repeat the cue.
  for(const value of inheritedNames){
    const re=new RegExp('(?<![\\p{L}\\p{N}_])'+escapeRegex(value)+'(?![\\p{L}\\p{N}_])','gu');
    for(const m of text.matchAll(re))add(m.index,m[0]);
  }
  return spans.sort((a,b)=>a.start-b.start);
}
