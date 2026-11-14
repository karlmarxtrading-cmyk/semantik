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
    ['tidak nol', /\b(?:nonzero|non-zero|not zero|bukan nol|tidak nol|tak nol)\b/iu],
    ['interval terbatas', /\b(?:bounded interval|interval (?:tertutup dan )?terbatas)\b/iu],
    ['invers matriks', /\b(?:inverse|invers)\b/iu],
    ['pengenceran', /\b(?:dilut(?:e|es|ed|ing|ion)|mengencerkan|diencerkan|pengenceran)\b/iu],
    ['zat terlarut', /\b(?:solutes?|dissolved substance|zat terlarut)\b/iu],
    ['hasil kesetimbangan', /\b(?:equilibrium yield|hasil kesetimbangan)\b/iu],
    ['penugasan acak', /\b(?:random assignment|penugasan acak|alokasi acak)\b/iu],
    ['perancu', /\b(?:confounding|confounders?|perancu|perancuan)\b/iu],
    ['interpretasi frekuentis', /\b(?:frequentist interpretation|interpretasi frekuentis)\b/iu],
    ['batas harga maksimum', /\b(?:price ceiling|batas harga maksimum|harga maksimum)\b/iu],
    ['barang inferior', /\b(?:inferior goods?|barang inferior)\b/iu],
    ['keterdiferensialan', /\b(?:differentiab\w*|dapat diturunkan|keterdiferensialan)\b/iu],
    ['kekontinuan', /\b(?:continuous|continuity|kontinu|kekontinuan|kesinambungan|berkesinambungan|berkelanjutan|kelanjutan|terus(?:-|\s+)menerus)\b/iu],
    ['generalisasi', /\b(?:generali[sz](?:ed|ation)|digeneralisasi|generalisasi)\b/iu],
    ['tindakan yang diamati', /\b(?:observed actions?|tindakan yang diamati)\b/iu],
    ['tetapan kesetimbangan', /\b(?:equilibrium constants?|(?:tetapan|konstanta) kesetimbangan(?:nya)?)\b/iu],
    ['varians', /\b(?:variance|variances|varians|ragam)\b/iu],
    ['upah nominal', /\b(?:nominal wages?|upah nominal|gaji nominal)\b/iu],
    ['daya beli', /\b(?:purchasing power|daya beli)\b/iu],
    ['penilai luaran', /\b(?:outcome assessors?|penilai (?:luaran|hasil)|asesor (?:luaran|hasil))\b/iu],
  ];
  for(const [label,re] of conceptAnchors)if(re.test(source)&&!re.test(target))issues.push('Konsep ilmiah '+label+' hilang atau berubah.');
  if(/\b(?:functions?|fungsi|interval)\b/iu.test(source)&&/\b(?:maximum|maksimum)\b/iu.test(source)&&!/\b(?:maximum|maksimum)\b/iu.test(target))issues.push('Pencapaian maksimum fungsi hilang atau berubah.');
  if(/\bcompar\w*\s+fairly\b|\bfairly\s+compar\w*\b/iu.test(source)&&!/\b(?:adil|fairly)\b/iu.test(target))issues.push('Perbandingan yang adil berubah menjadi rerata atau makna lain.');
  // Modifier attachment is stricter than a bag of preserved words.
  const qualified=[
    ['asumsi prosedur',/\b(?:assumed sampling procedures?|prosedur pengambilan sampel yang diasumsikan)\b/iu],
    ['usulan penjelasan',/\b(?:proposed explanations?|penjelasan yang diajukan|penjelasan yang diusulkan)\b/iu],
    ['asumsi yang dinyatakan',/\b(?:stated assumptions?|asumsi yang dinyatakan)\b/iu],
    ['kurva permintaan tetap',/\b(?:unchang(?:ed|ing) demand curve|demand curve (?:that |which )?(?:is |remains )?unchanged|kurva permintaan yang (?:tidak|tak) berubah)\b/iu]
  ];
  for(const [label,re] of qualified)if(re.test(source)&&!re.test(target))issues.push('Cakupan pembatas '+label+' hilang atau berpindah.');
  if(/\b(?:quantity (?:buyers|sellers|consumers|producers)|jumlah (?:barang )?yang (?:ingin )?(?:dibeli|ditawarkan) (?:pembeli|penjual))\b/iu.test(source)&&/\b(?:(?:amount|number) of (?:buyers|sellers)|(?:jumlah|kuantitas) (?:pembeli|penjual)|(?:pembeli|penjual) kuantitas)\b/iu.test(target))issues.push('Jumlah barang berubah menjadi jumlah pelaku pasar.');
  if(/\b(?:catalysts?|katalis)\b/iu.test(source)&&/\b(?:recovered|diperoleh kembali)\b/iu.test(source)&&!/\b(?:recovered|diperoleh kembali|dipulihkan)\b/iu.test(target))issues.push('Perolehan kembali katalis hilang atau berubah menjadi penemuan.');
  // Intransitive boiling and passive boiling make different process claims.
  if(/\b(?:solvent|solution|water) boiled\b/iu.test(source)&&/\bdirebus\b/iu.test(target))issues.push('Proses mendidih berubah menjadi tindakan merebus oleh pelaku.');
  // A label before "treatment" can be an article; require role-label identity.
  const rolePairs=[['treatment','perlakuan','pengobatan','perawatan'],['group','kelompok','grup'],['cohort','kohort']];
  for(const roles of rolePairs)for(const m of source.matchAll(new RegExp('\\b(?:'+roles.join('|')+')\\s+([A-Z])\\b','giu'))){
    if(m[1]!==m[1].toUpperCase())continue;
    const forward=new RegExp('\\b(?:'+roles.join('|')+')\\s+'+m[1]+'\\b','iu').test(target);
    const reverseRoles=m[1]==='A'?roles.slice(1):roles;
    const reverse=new RegExp('\\b'+m[1]+'\\s+(?:'+reverseRoles.join('|')+')\\b','iu').test(target);
    if(!forward&&!reverse)issues.push('Identitas label setelah peran eksperimen hilang atau ambigu.');
  }
  // Negation counts alone cannot distinguish inclusion of a null effect from
  // exclusion of an effect. Require the same explicit interval relationship.
  const ci=/\b(?:confidence interval|interval kepercayaan|selang kepercayaan)\b/iu;
  const includesNull=/\b(?:includes? (?:no effect|zero|the null)|(?:mencakup|meliputi|memuat) (?:tidak adanya efek|tanpa efek|nol))\b/iu;
  if(ci.test(source)&&includesNull.test(source)&&!(ci.test(target)&&includesNull.test(target)))issues.push('Cakupan interval terhadap efek nol berubah atau hilang.');
  // CP20 domain concepts. These constrain terms/qualifiers, not full sentences.
  const finite=/\b(?:finite|hingga)\b/iu, infinite=/\b(?:infinite(?:ly)?|(?:tak|tidak) hingga)\b/iu;
  const mathematical=/\b(?:sets?|subgroups?|himpunan|subgrup|sequences?|barisan)\b/iu;
  if(mathematical.test(source)){
    const fin=s=>[...s.replace(/\b(?:infinite(?:ly)?|(?:tak|tidak) hingga)\b/giu,'INFINITE').matchAll(/\b(?:finite|hingga)\b/giu)].length;
    if(fin(source)!==fin(target)||[...source.matchAll(new RegExp(infinite.source,'giu'))].length!==[...target.matchAll(new RegExp(infinite.source,'giu'))].length)issues.push('Pembatas hingga/tak hingga pada konsep matematika hilang atau berubah.');
    for(const [label,re] of [['himpunan/set',/\b(?:sets?|himpunan)\b/iu],['subgrup/subgroup',/\b(?:subgroups?|subgrup)\b/iu],['barisan/sequence',/\b(?:sequences?|barisan)\b/iu],['konvergensi',/\b(?:converges?|convergence|konvergen|kekonvergenan)\b/iu]])if(re.test(source)&&!re.test(target))issues.push('Konsep matematika '+label+' hilang atau berubah.');
    if(/\b(?:bounded|terbatas)\b/iu.test(source)&&/\b(?:sequence|barisan)\b/iu.test(source)&&!/\b(?:bounded|terbatas)\b/iu.test(target))issues.push('Sifat terbatas pada barisan hilang atau berubah.');
  }
  if(/\b(?:solvent|evaporat\w*|pelarut|menguap|reagents?|reagen|molar|saline|sodium|natrium|chloride|klorida|concentration|konsentrasi)\b/iu.test(source)&&/\b(?:solutions?|larutan)\b/iu.test(source)&&!/\b(?:solutions?|larutan)\b/iu.test(target))issues.push('Makna larutan dalam konteks kimia hilang atau berubah.');
  if(/\b(?:prices?|supply|elastic|inelastic|economics?|markets?|harga|penawaran|elastis|inelastis|ekonomi|pasar)\b/iu.test(source)&&/\b(?:demand|permintaan)\b/iu.test(source)&&!/\b(?:demand|permintaan)\b/iu.test(target))issues.push('Makna demand/permintaan ekonomi hilang atau berubah.');
  const notConsumed=/\b(?:not (?:be )?consumed|(?:tidak|tak) habis(?: bereaksi| terpakai)?|(?:tidak|tak) dikonsumsi)\b/iu;
  if(/\b(?:catalysts?|katalis)\b/iu.test(source)&&notConsumed.test(source)&&!notConsumed.test(target))issues.push('Klaim katalis tidak habis bereaksi hilang atau berubah.');
  const documentContext=/\b(?:authors?|chapter|manuscript|editors?|articles?|reports?|research|accounts|passages|penulis|bab|naskah|penyunting|artikel|laporan|penelitian|keterangan)\b/iu;
  const anatomy=/\b(?:appendicitis|abdominal|anatom(?:y|ical)|surg(?:ery|ical)|intestin\w*|inflam\w*|apendisitis|perut|anatomi|operasi|usus|radang)\b/iu;
  if(documentContext.test(source)&&!anatomy.test(source)&&/\b(?:appendi(?:x|ces)|lampiran)\b/iu.test(source)&&(!/\b(?:appendi(?:x|ces)|lampiran)\b/iu.test(target)||/\b(?:usus buntu|appendicitis)\b/iu.test(target)))issues.push('Makna lampiran dokumen berubah menjadi organ anatomi atau hilang.');
  if(/\bmay not\b/iu.test(source)&&/\b(?:tidak|tak) (?:dapat|bisa)\b/iu.test(target)&&!/\b(?:mungkin|barangkali) (?:tidak|tak)\b/iu.test(target))issues.push('Modalitas mungkin tidak berubah menjadi ketidakmampuan atau kepastian.');
  // Recovery v5: preserve scientific noun senses and explicit predicate roles.
  // These checks deliberately do not claim completeness for arbitrary prose.
  const recoveryConcepts=[
    ['rata-rata populasi', /\b(?:population mean|rata-rata populasi)\b/iu],
    ['prosedur pengambilan sampel', /\b(?:sampling procedures?|prosedur pengambilan sampel)\b/iu],
    ['galat pengukuran', /\b(?:measurement errors?|(?:galat|kesalahan) pengukuran)\b/iu],
    ['ketidakpastian pengukuran', /\b(?:measurement uncertainty|ketidakpastian pengukuran)\b/iu],
  ];
  for(const [label,re] of recoveryConcepts)if(re.test(source)&&!re.test(target))issues.push('Konsep ilmiah '+label+' hilang atau berubah.');
  if(/\b(?:reviewers?|penelaah|peninjau)\b/iu.test(source)&&!/\b(?:reviewers?|penelaah|peninjau)\b/iu.test(target))issues.push('Peran penelaah ilmiah hilang atau berubah menjadi pelaku lain.');
  const calibration=/\b(?:calibrat(?:e|es|ed|ing|ion|ions)|(?:di|meng)?kalibrasi|mengalibrasi)\b/giu;
  const sourceCal=matches(source,calibration).length,targetCal=matches(target,calibration).length;
  if(sourceCal&&sourceCal!==targetCal)issues.push('Identitas atau jumlah rujukan kalibrasi berubah; periksa setiap operasi pengukuran.');
  const economic=/\b(?:demand|supply|tax|taxes|markets?|economics?|purchasing|permintaan|penawaran|pajak|pasar|ekonomi|daya beli)\b/iu;
  if(economic.test(source)){
    for(const [label,re] of [
      ['harga',/\b(?:prices?|harga)\b/iu],
      ['penawaran ekonomi',/\b(?:supply|penawaran)\b/iu],
      ['beban ekonomi',/\b(?:economic burden|beban ekonomi(?:nya)?)\b/iu],
      ['kepekaan relatif',/\b(?:relative sensitivity|kepekaan relatif)\b/iu]
    ])if(re.test(source)&&!re.test(target))issues.push('Konsep '+label+' hilang atau berubah.');
  }
  const chemical=/\b(?:solutions?|larutan|solvents?|pelarut|reagents?|reagen|salt|garam|molar)\b/iu;
  if(chemical.test(source)){
    for(const [label,re] of [['konsentrasi',/\b(?:concentrations?|konsentrasi)\b/iu],['pelarutan',/\b(?:dissolv(?:e|es|ed|ing)|melarutkan|terlarut|pelarutan)\b/iu]])if(re.test(source)&&!re.test(target))issues.push('Konsep kimia '+label+' hilang atau berubah.');
  }
  const dependent=/\b(?:depends? (?:on|upon)|dependent (?:on|upon)|relies? on|(?:is|are) determined by|(?:bergantung|tergantung) (?:pada|dari)|ditentukan oleh)\b/iu;
  if(dependent.test(source)&&!dependent.test(target))issues.push('Hubungan ketergantungan eksplisit hilang atau berubah menjadi perintah.');
  // Keep a price-change predicate attached to the price within its clause.
  // Noun phrases such as "an increase in a substitute" are not "price rises".
  const pricePredicates=text=>text.split(/[,;.!?]/u).flatMap(clause=>{
    const anchor=clause.match(/\b(?:prices?|harga)\b/iu);if(!anchor)return [];
    const tail=clause.slice(anchor.index+anchor[0].length);
    if(/\b(?:demand|supply|permintaan|penawaran)\b/iu.test(tail))return [];
    const up=/\b(?:rises?|rose|increases?|increased|go(?:es)? up|went up|naik|meningkat)\b/iu;
    const down=/\b(?:falls?|fell|decreases?|decreased|drops?|dropped|go(?:es)? down|went down|turun|menurun)\b/iu;
    const a=up.test(tail),b=down.test(tail);return a!==b?[a?'up':'down']:[];
  });
  if(economic.test(source)){const a=pricePredicates(source),b=pricePredicates(target);if(a.length&&JSON.stringify(a)!==JSON.stringify(b))issues.push('Predikat perubahan harga hilang, berpindah subjek, atau berubah arah.');}
  const assessment=/\b(?:assess\w*|scores?|answers?|education\w*|penilai\w*|skor|jawaban|pendidikan)\b/iu;
  if(assessment.test(source)&&/\b(?:rubrics?|rubrik)\b/iu.test(source)&&!/\b(?:rubrics?|rubrik)\b/iu.test(target))issues.push('Identitas rubrik penilaian hilang atau berubah.');
  if(/\b(?:evidence|documentation|records?|bukti|dokumentasi|catatan)\b/iu.test(source)&&/\b(?:events?|peristiwa|kejadian)\b/iu.test(source)&&!/\b(?:events?|peristiwa|kejadian)\b/iu.test(target))issues.push('Peristiwa yang dibedakan dari bukti atau pencatatan hilang.');
  if(economic.test(source)&&/\b(?:quantity demanded|jumlah yang diminta)\b/iu.test(source)&&!/\b(?:quantity demanded|jumlah yang diminta)\b/iu.test(target))issues.push('Kuantitas yang diminta dalam hubungan ekonomi hilang atau berubah.');
  if(/\bcertif(?:y|ies|ied) that\b/iu.test(source)&&!/\b(?:certif(?:y|ies|ied)|guarantee\w*|ensure\w*|menjamin|memastikan|mengesahkan)\b/iu.test(target))issues.push('Predikat penjaminan atau pengesahan berubah menjadi sekadar pernyataan.');
  const numericRatio=/\b(?:sample|samples|sampling|statistic\w*|sampel|statistik\w*|treatment|perlakuan|numerator|pembilang)\b/iu;
  if(numericRatio.test(source))for(const [label,re] of [['penyebut',/\b(?:denominators?|penyebut)\b/iu],['pembilang',/\b(?:numerators?|pembilang)\b/iu]])if(re.test(source)&&!re.test(target))issues.push('Konsep rasio '+label+' hilang atau berubah.');
  if(mathematical.test(source)&&/\b(?:ordering|pengurutan)\b/iu.test(source)&&!/\b(?:ordering|pengurutan|urutan|tatanan)\b/iu.test(target))issues.push('Relasi pengurutan matematika berubah menjadi pesanan atau makna lain.');
  const financial=/\b(?:accounts?|rekening)\b/iu.test(source)&&/\b(?:money|households?|nominal|purchas\w*|banks?|uang|rumah tangga|tabungan|daya beli)\b/iu.test(source);
  if(financial&&/\b(?:balance|saldo)\b/iu.test(source)&&(!/\b(?:balance|saldo)\b/iu.test(target)||/\b(?:keseimbangan|kesetimbangan)\b/iu.test(target)))issues.push('Saldo rekening berubah menjadi keseimbangan fisik atau hilang.');
  const questionInstrument=/\binterview schedule\b/iu.test(source)&&/\b(?:questions?|questionnaire)\b/iu.test(source)&&!/\b(?:timetable|calendar|appointment)\b/iu.test(source);
  if(questionInstrument&&!/\b(?:interview schedule|interview guide|pedoman wawancara|panduan wawancara|daftar pertanyaan wawancara)\b/iu.test(target))issues.push('Instrumen pertanyaan wawancara berubah menjadi jadwal waktu atau hilang.');
  // "an observation was recorded incorrectly" predicates an error of recording;
  // "a misrecorded observation is recorded" changes that predicate into a tautology.
  const badRecordPredicate=/\b(?:observations?|data|pengamatan)\b[^.;!?]{0,65}\b(?:recorded (?:incorrectly|erroneously|wrongly)|(?:incorrectly|erroneously|wrongly) recorded|dicatat (?:secara )?(?:keliru|salah)|salah dicatat)\b/iu;
  if(badRecordPredicate.test(source)&&!badRecordPredicate.test(target))issues.push('Predikat pencatatan keliru pada pengamatan berubah atau hilang.');
  const idRecordPassive=/\bpengamatan\b[^.;!?]{0,65}\bdicatat (?:secara )?(?:keliru|salah)\b/iu;
  const enRecordPassive=/\bobservations?\b[^.;!?]{0,45}\b(?:was|were|is|are|has been|have been|had been|being|be)\s+(?:(?:incorrectly|erroneously|wrongly)\s+recorded|recorded\s+(?:incorrectly|erroneously|wrongly))\b/iu;
  if(idRecordPassive.test(source)&&/\bobservations?\b/iu.test(target)&&!enRecordPassive.test(target))issues.push('Peran pasif pencatatan pengamatan belum dipertahankan secara jelas.');
  const hypothesesHold=/\b(?:hypothes(?:is|es)|conditions?|hipotesis|syarat|kondisi)\b[^.;!?]{0,55}\b(?:holds?|(?:is|are) (?:satisfied|fulfilled)|terpenuhi)\b/iu;
  if(hypothesesHold.test(source)&&!hypothesesHold.test(target))issues.push('Pemenuhan hipotesis atau syarat berubah menjadi kekuatan atau sifat lain.');
  const wholeInterval=/\b(?:(?:over|throughout|across) (?:the )?(?:entire |whole )?interval|(?:di|pada) seluruh interval)\b/iu;
  if(wholeInterval.test(source)&&/\b(?:all intervals|setiap interval|semua interval)\b/iu.test(target))issues.push('Cakupan sepanjang satu interval berubah menjadi semua interval.');
  const numberRoles=[['experiment','percobaan'],['calculation','perhitungan']];
  for(const terms of numberRoles){
    const pattern=new RegExp('\\b(?:'+terms.join('|')+')\\s+(?:no\\.?\\s*|nomor\\s+)?([A-Z]?\\d+(?:[.-]\\d+)*)\\b','giu');
    const a=matches(source,pattern).map(m=>m[1]),b=matches(target,pattern).map(m=>m[1]);
    if(a.length&&JSON.stringify(a)!==JSON.stringify(b))issues.push('Pengenal bernomor '+terms[0]+' berubah menjadi jumlah atau kehilangan keterkaitan.');
  }
  return issues;
}
