/** Small compositional terms. No corpus IDs, sentences, answers or network calls.
 * Inflections are explicit: Indonesian -nya retains its possessive meaning.
 * These constraints reduce lexical/attachment errors; they are not a semantic proof.
 */
export function academicPhrases(context,direction){
  const pairs=[];
  const math=/\b(?:matrices|matrix|matriks|determinant|determinan|functions?|fungsi|interval|theorem|teorema)\b/iu.test(context);
  const chemistry=/\b(?:solution|larutan|catalyst|katalis|solute|terlarut|reaction|reaksi|solvent|pelarut)\b/iu.test(context);
  const statistics=/\b(?:sampling|sampel|population|populasi|parameter|confidence|kepercayaan|experiment|eksperimen|treatment|perlakuan)\b/iu.test(context);
  const economics=/\b(?:demand|supply|income|price|prices|permintaan|penawaran|pendapatan|harga|pasar)\b/iu.test(context);
  if(math)pairs.push(
    ['closed and bounded interval','interval tertutup dan terbatas'],['bounded interval','interval terbatas'],
    ['closed interval','interval tertutup'],['open interval','interval terbuka'],
    ['square matrix','matriks persegi'],['inverse','invers'],['maximum value','nilai maksimum'],
    ['nonzero determinant','determinan tidak nol'],['determinant','determinan'],
    ['attains','mencapai'],['attain','mencapai']
  );
  if(chemistry)pairs.push(
    ['diluting','mengencerkan'],['dilute','encerkan'],['solute','zat terlarut'],
    ['amount of dissolved substance','jumlah zat terlarut'],['amount of solute','jumlah zat terlarut'],
    ['equilibrium yield','hasil kesetimbangan'],['equilibrium constant','tetapan kesetimbangan'],
    ['rate of a reaction','laju reaksi'],['rate of reaction','laju reaksi'],['fixed temperature','suhu tetap'],
    ['recovery','perolehan kembali']
  );
  if(statistics)pairs.push(
    ['random assignment','penugasan acak'],['random sampling','pengambilan sampel acak'],
    ['confounding','perancu'],['frequentist interpretation','interpretasi frekuentis'],
    ['fixed parameter','parameter tetap'],['repeated-sampling coverage','cakupan dalam pengambilan sampel berulang']
  );
  if(economics)pairs.push(
    ['price ceiling','batas harga maksimum'],['binding price ceiling','batas harga maksimum yang mengikat'],
    ['excess demand','kelebihan permintaan'],['inferior good','barang inferior'],['inferior goods','barang inferior'],
    ['quantity supplied','jumlah yang ditawarkan'],['demand curve','kurva permintaan'],['supply curve','kurva penawaran'],
    ['goods','barang'],['good','barang']
  );
  // Compositional relative noun phrases retain the counted object and actor.
  // The decoder still translates the surrounding assertion and comparison.
  if(economics){
    const actors={buyers:'pembeli',consumers:'konsumen',sellers:'penjual',producers:'produsen'};
    const verbs={buy:'dibeli',purchase:'dibeli',sell:'dijual',offer:'ditawarkan',supply:'dipasok'};
    if(direction==='en-id')for(const m of context.matchAll(/\bquantity (buyers|consumers|sellers|producers) (?:(wish|want) to )?(buy|purchase|sell|offer|supply)\b/giu))pairs.push([m[0],'jumlah barang yang '+(m[2]?'ingin ':'')+verbs[m[3].toLowerCase()]+' '+actors[m[1].toLowerCase()]]);
    if(direction==='id-en')for(const m of context.matchAll(/\bjumlah (?:barang )?yang (?:(ingin|hendak) )?(dibeli|dijual|ditawarkan|dipasok) (pembeli|konsumen|penjual|produsen)\b/giu)){
      const actor=Object.keys(actors).find(k=>actors[k]===m[3].toLowerCase());
      const verb=Object.keys(verbs).find(k=>verbs[k]===m[2].toLowerCase());
      pairs.push(['quantity '+actor+' '+(m[1]?'wish to ':'')+verb,m[0]]);
    }
  }
  if(math&&direction==='en-id'&&/\b(?:conclusion|theorem|claim|result)\b/iu.test(context))pairs.push(['hold','berlaku'],['holds','berlaku']);
  if(chemistry)pairs.push(['equilibrium','kesetimbangan'],['recovered','diperoleh kembali']);
  if(chemistry&&direction==='id-en'&&/\bjumlah\b[^.;!?]{0,60}\btetap\b/iu.test(context))pairs.push(['remains constant','tetap']);
  if(chemistry&&direction==='en-id'&&/\b(?:solvent|solution|water) boiled\b/iu.test(context))pairs.push(['boiled','mendidih']);
  if(economics&&direction==='id-en')pairs.push(['increase','peningkatan']);
  if(direction==='en-id'&&/\bcompar\w*\s+fairly\b|\bfairly\s+compar\w*\b/iu.test(context))pairs.push(['fairly','secara adil']);
  if(statistics&&/\b(?:numerator|denominator|experiment|pembilang|penyebut|eksperimen)\b/iu.test(context))pairs.push(['treatment','perlakuan']);
  // Generate adjective+noun constraints across concepts, not whole propositions.
  const nouns=[['sampling procedure','prosedur pengambilan sampel'],['explanation','penjelasan'],
    ['hypothesis','hipotesis'],['assumption','asumsi'],['demand curve','kurva permintaan'],
    ['supply curve','kurva penawaran'],['parameter','parameter'],['method','metode'],['model','model']];
  const modifiers=[['assumed','yang diasumsikan'],['proposed','yang diajukan'],['stated','yang dinyatakan'],['unchanged','yang tidak berubah']];
  for(const [en,id] of nouns)for(const [adj,rel] of modifiers)pairs.push([adj+' '+en,id+' '+rel]);
  const result=direction==='en-id'?pairs:pairs.map(([en,id])=>[id,en]);
  if(direction==='id-en'&&chemistry)result.push(['konsentrasinya','its concentration'],['tetapan kesetimbangannya','its equilibrium constant']);
  // A capital label follows its role, including the otherwise ambiguous label A.
  const roles=direction==='en-id'?[['treatment','perlakuan'],['group','kelompok'],['cohort','kohort']]:[['perlakuan','treatment'],['kelompok','group'],['kohort','cohort']];
  for(const [s,t] of roles)for(const m of context.matchAll(new RegExp('\\b'+s+'\\s+([A-Z])\\b','gi')))if(m[1]===m[1].toUpperCase())result.push([m[0],t+' '+m[1]]);
  // A lexical verb after a document subject must not become the plural noun documents.
  if(direction==='en-id')for(const m of context.matchAll(/\b(?:appendix|report|article|chapter|table|protocol)\s+(documents)\b/giu))result.push([m[1],'mendokumentasikan']);
  result.push(...grammaticalSenseRules(context,direction));
  return result;
}

/** CP22 closed-class sense rules (not vocabulary lists for particular sentences).
 * 1. EN adjective/verb homographs directly after an auxiliary or "to" are verbs.
 * 2. Clause-final or degree-modified "matter(s)" is the intransitive verb "to be important".
 * 3. ID collective "kedua N" after a two-operand relational noun means "the two N",
 *    never the ordinal "second" (ordinal kedua follows its own head noun: "tahap kedua").
 */
export function grammaticalSenseRules(context,direction){
  const out=[];
  if(direction==='en-id'){
    const verbs={lower:'menurunkan',lowers:'menurunkan',slow:'memperlambat',slows:'memperlambat',narrow:'mempersempit',narrows:'mempersempit',empty:'mengosongkan',empties:'mengosongkan'};
    const aux={'does not necessarily':'tidak selalu','do not necessarily':'tidak selalu','did not necessarily':'tidak selalu','need not':'tidak harus',
      'does not':'tidak','do not':'tidak','did not':'tidak','cannot':'tidak dapat','can not':'tidak dapat','can':'dapat','could':'dapat','may':'dapat','might':'mungkin',
      'will':'akan','would':'akan','must':'harus','should':'seharusnya','may not':'mungkin tidak','will not':'tidak akan','would not':'tidak akan','to':'untuk','not necessarily':'tidak selalu'};
    const auxRe=Object.keys(aux).sort((a,b)=>b.length-a.length).map(a=>a.replace(/ /g,'\\s+')).join('|');
    for(const m of context.matchAll(new RegExp(`\\b(${auxRe})\\s+(lower|lowers|slow|slows|narrow|narrows|empty|empties)\\b(?!\\s+(?:than|bound|limit|level|case|half|part|end)\\b)`,'giu'))){
      const a=aux[m[1].toLowerCase().replace(/\s+/g,' ')];if(a)out.push([m[0],a+' '+verbs[m[2].toLowerCase()]]);
    }
    for(const m of context.matchAll(/\b(\p{L}+)\s+(matters|matter)(?:\s+(less|more|most|greatly|little))?(?=\s*(?:[.;:!?,]|$)|\s+(?:for|because|here|when|if|in|to)\b)/giu)){
      if(/^(?:the|a|an|no|this|that|subject|dark|organic|what|whatever|grey|gray|particulate|any|some|of)$/iu.test(m[1]))continue;
      const degree={less:'kurang penting',more:'lebih penting',most:'paling penting',greatly:'sangat penting',little:'tidak terlalu penting'}[(m[3]||'').toLowerCase()]||'penting';
      const span=m[0].slice(m[1].length).trim();out.push([span,degree]);
    }
  }
  if(direction==='id-en'){
    const rel={selisih:'difference between',perbedaan:'difference between',perbandingan:'comparison of',hubungan:'relationship between',korelasi:'correlation between',
      jarak:'distance between',gabungan:'union of',irisan:'intersection of',kesamaan:'similarity of'};
    for(const m of context.matchAll(/(?<![\p{L}])(selisih|perbedaan|perbandingan|hubungan|korelasi|jarak|gabungan|irisan|kesamaan)\s+kedua(?=\s+\p{Ll})/gu))
      out.push([m[0],rel[m[1]]+' the two']);
  }
  return out;
}

/** CP22 morphological derivation of existing terminology: an adjective constraint
 * X→Y implies the nominalisation X-ness → ke-Y-an (and the reverse). Only applied
 * to single-word pairs whose derived form occurs in the text. */
export function derivedNominalTerms(pairs,text,direction){
  const out=[];
  for(const [s,t] of pairs){
    if(!/^\p{L}+$/u.test(s)||!/^\p{L}+$/u.test(t))continue;
    if(direction==='en-id'){const ds=s+'ness';if(new RegExp(`\\b${ds}\\b`,'iu').test(text))out.push([ds,'ke'+t+'an']);}
    else{const ds='ke'+s+'an';if(new RegExp(`\\b${ds}\\b`,'iu').test(text)&&/^\p{L}+$/u.test(t))out.push([ds,t+'ness']);}
  }
  return out;
}
