/** CP22 concept-coverage verification.
 * Pure functions, no model, no network. A round-trip (back) translation of the
 * candidate is compared with the source in the SOURCE language, so no bilingual
 * dictionary is needed. Missing content stems indicate a dropped or substituted
 * concept. Passing this check is NOT semantic approval: relations, attachment and
 * grammar can still be wrong. It only detects lexical concept loss.
 */
export const COVERAGE_RULES = 'cp22-roundtrip-concept-coverage-v1';

const STOP = {
  en: new Set(`a an the this that these those there here it its it's they them their theirs he she him her his we us our you your i me my
is are was were be been being am do does did done doing have has had having will would shall should can could may might must
of in on at by for to from with without into onto over under about above below between among through during before after since until
and or but nor so yet if then than because although though while whereas when where which who whom whose what why how whether
as such also very just even still already too quite rather fairly much many more most less least few several some any each every all both either neither
not no never none nothing only again ever thus hence therefore however moreover furthermore indeed instead
one ones own other others another same per via upon within across toward towards against
make makes made get gets got take takes took give gives given one's itself themselves himself herself
would've could've don't doesn't didn't isn't aren't wasn't weren't can't cannot won't
on another each other alone merely solely simply whole entire particular certain respectively`.split(/\s+/)),
  id: new Set(`yang dan atau tetapi namun serta lalu kemudian maka sehingga karena sebab jika kalau apabila bila ketika saat sewaktu selama sejak hingga sampai
di ke dari pada dalam untuk bagi oleh dengan tanpa tentang terhadap antara sebagai seperti menurut melalui atas bawah
ini itu tersebut sini sana situ begitu demikian
adalah ialah merupakan ada akan telah sudah sedang masih pernah belum harus dapat bisa boleh mungkin perlu
tidak bukan tak jangan
saya aku kami kita anda kamu ia dia mereka beliau nya -nya
juga pun saja hanya lagi sangat amat lebih paling cukup agak terlalu pula bahkan memang tentu
semua seluruh setiap tiap masing beberapa sebagian banyak sedikit para sang si
apa siapa mana mengapa bagaimana kapan dimana
yaitu yakni bahwa agar supaya walaupun meskipun walau sedangkan sementara
satu lain hal masing-masing antar secara suatu sebuah seorang begitu pun-pun`.split(/\s+/))
};

// General lexical-equivalence classes used ONLY to tolerate round-trip paraphrase
// in the source language. Each entry lists stems (see stem()). These are generic
// language facts, not sentence-specific answers.
const SYNONYMS = {
  en: [['bound','limit'],['same','equal','identic'],['postpon','delay','defer'],['immediat','instant','prompt','right away','at once'],
    ['show','demonstr','indicat','reveal'],['larg','big'],['small','littl','tiny'],['requir','need'],['obtain','get','acquir','gain','collect','gather','retriev'],
    ['increas','rise','grow','rais'],['decreas','reduc','declin','fall','drop','lower','diminish','shrink'],['result','outcom'],
    ['assess','evalu','judg','rate'],['chang','alter','modif'],['error','mistak'],['method','approach','procedur'],['examin','investig','studi','stud','analy'],
    ['use','utiliz','employ','appli'],['differ','distinct','dissimilar'],['conclud','infer','deduc'],['conceal','hid','hidden','mask','blind'],
    ['particip','subject','respond'],['observ','watch','monitor'],['measur','gaug'],['comput','calcul'],['allow','permit','enabl'],
    ['caus','induc','produc','lead'],['affect','influenc','impact'],['suffici','enough','adequ'],['establish','prove','demonstr','confirm'],
    ['independ','autonom'],['depend','reli'],['justif','warrant'],['formula','equat','express'],['estim','approxim'],['substanti','consider','signific','great'],
    ['common','frequent','usual','often'],['rare','uncommon','infrequent','seldom'],['strong','power'],['weak','feebl'],['correct','right','accur'],
    ['exclud','omit','leav','except'],['includ','contain','compris'],['final','last','end'],['mixtur','mix','blend'],['solvent','solut'],
    ['mass','weight'],['weigh','weight'],['sampl','specimen'],['remov','eliminat','delet','eras'],['guarante','ensur','assur'],['converg','converg'],
    ['sequenc','seri','progress'],['order','sequenc','arrang'],['matter','import','signific','relev'],['help','assist','aid'],['begin','start','commenc'],
    ['purchas','buy','bought'],['household','famili','home'],['price','cost'],['level','degre','rate'],['decis','choic','determin'],['evid','proof','data'],
    ['hypothes','theor','assum'],['reject','refus','dismiss','declin'],['interpret','constru','understand','read'],['incomplet','partial','insuffici'],['mutual','each other','one another','reciproc']],
  id: [['mutlak','absolut'],['zat','materi','bahan','benda'],['seleksi','pilih'],['sama','setara','identik'],['salah','galat','keliru'],
    ['kira','estimasi','taksir','duga'],['besar','luas'],['kecil','sedikit'],['hapus','hilang','buang','lenyap'],['butuh','perlu'],['ambil','kumpul','peroleh','himpun'],
    ['naik','tingkat','tambah','besar'],['turun','kurang','kecil','rendah'],['hasil','luaran','akibat'],['nilai','kaji','evaluasi'],['ubah','ganti'],
    ['metode','cara','pendekatan','prosedur'],['teliti','kaji','studi','analisis','periksa'],['guna','pakai','terap'],['beda','selisih','lain'],
    ['simpul','duga'],['sembunyi','tutup','samar','rahasia'],['serta','peserta','partisipan','subjek','responden'],['amat','pantau','lihat'],
    ['ukur','takar'],['hitung','kalkulasi'],['izin','boleh','mungkin'],['sebab','akibat','timbul'],['pengaruh','dampak'],['cukup','memadai'],
    ['bukti','buktikan','tunjuk'],['independen','bebas','merdeka'],['gantung','tergantung','andal'],['benar','tepat','akurat','betul'],['rumus','formula','persamaan'],
    ['sering','umum','lazim','biasa'],['jarang','langka'],['kuat','tegas'],['lemah'],['tunda','undur'],['tolak','sangkal'],['tafsir','arti','maksud'],
    ['segera','langsung','cepat'],['rata','purata'],['ulang','kembali'],['sinyal','isyarat'],['alat','instrumen','perangkat'],['kelompok','grup','golongan'],
    ['laku','perlakuan','perawatan','rawat','obat'],['pengamat','amat'],['informasi','keterangan','data'],['tuju','maksud','arah'],
    ['pendapatan','penghasilan','upah'],['beli'],['harga','biaya'],['rumah tangga','keluarga'],['padat','solid','keras'],['larut','lebur'],['reaksi','tanggap'],
    ['bentuk','wujud','rupa'],['acak','random'],['otomatis','sendiri'],['sumber','asal'],['bias','prasangka'],['asumsi','anggap','andai'],
    ['turunan','derivasi','penurunan'],['jamin','pasti'],['batas','terbatas','hingga'],['saling','satu sama lain','timbal balik','mutual']]
};

const VOWEL = /^[aiueo]/;
// Degree adverbs are rendered by an intensifier rather than a fixed lexeme.
const DEGREE = { en: /^(?:substantially|significantly|considerably|greatly|highly|strongly|slightly|largely|markedly|somewhat|extremely|sharply)$/iu,
  id: /^(?:sangat|amat|jauh|cukup|agak|sedikit|terlalu|begitu|nyata)$/iu };
const INTENSIFIER = { id: /(?<![\p{L}])(?:sangat|amat|jauh|cukup|agak|sedikit|sekali|secara\s+(?:substansial|signifikan|nyata|drastis|tajam|besar))(?![\p{L}])/iu,
  en: /\b(?:very|highly|greatly|substantially|significantly|considerably|much|far|quite|rather|slightly|somewhat|markedly|sharply)\b/iu };

/** Light, deterministic stemmer. Returns a Set of candidate stems (ID morphology is ambiguous). */
export function stems(word, lang) {
  let w = String(word).toLowerCase().replace(/[’']s$/u, '').replace(/[’']/gu, '');
  const out = new Set();
  if (!w) return out;
  if (lang === 'id') {
    const redup = w.match(/^(\p{L}+)-\1$/u); if (redup) w = redup[1];
    w = w.replace(/-?(?:lah|kah|tah|pun)$/u, '').replace(/-?(?:ku|mu|nya)$/u, '');
    const roots = new Set([w]);
    for (const r of [...roots]) for (const s of ['kan', 'an', 'i']) if (r.endsWith(s) && r.length - s.length >= 3) roots.add(r.slice(0, -s.length));
    const prefixed = new Set();
    for (const r of roots) {
      prefixed.add(r);
      const tryPrefix = (p, replacements = ['']) => { if (r.startsWith(p) && r.length - p.length >= 3) for (const x of replacements) prefixed.add(x + r.slice(p.length)); };
      tryPrefix('memper'); tryPrefix('diper'); tryPrefix('per'); tryPrefix('ber'); tryPrefix('be'); tryPrefix('ter'); tryPrefix('di'); tryPrefix('ke'); tryPrefix('se');
      for (const [p, nasal] of [['meny', 's'], ['peny', 's'], ['meng', 'k'], ['peng', 'k'], ['mem', 'p'], ['pem', 'p'], ['men', 't'], ['pen', 't'], ['me', ''], ['pe', '']]) {
        if (r.startsWith(p) && r.length - p.length >= 3) { const rest = r.slice(p.length); prefixed.add(rest); if (nasal && VOWEL.test(rest)) prefixed.add(nasal + rest); }
      }
    }
    // a second derivational layer (ke-ter-batas-an, pe-nye-lesai-an)
    for (const r of [...prefixed]) for (const p of ['ter', 'ber', 'per', 'ke', 'se']) if (r.startsWith(p) && r.length - p.length >= 3) prefixed.add(r.slice(p.length));
    for (const r of prefixed) if (r.length >= 3) out.add(r);
    return out;
  }
  const irregular = {children:'child',men:'man',women:'woman',data:'data',analyses:'analysi',hypotheses:'hypothes',theses:'thes',criteria:'criteri',phenomena:'phenomen',
    took:'take',taken:'take',gave:'give',given:'give',chose:'choos',chosen:'choos',fell:'fall',fallen:'fall',rose:'rise',risen:'rise',grew:'grow',grown:'grow',
    bought:'buy',sought:'seek',thought:'think',found:'find',held:'hold',led:'lead',left:'leav',lost:'lose',made:'make',met:'meet',paid:'pay',said:'say',
    saw:'see',seen:'see',shown:'show',told:'tell',understood:'understand',won:'win',wrote:'writ',written:'writ',better:'good',best:'good',worse:'bad',worst:'bad'};
  if (irregular[w]) { out.add(irregular[w]); return out; }
  let s = w;
  for (let round = 0; round < 3; round++) {
    const before = s;
    for (const suf of ['ational','ization','isation','iveness','fulness','ousness','ations','ation','nesses','ness','ments','ment','ities','ity','ings','ing','edly','ingly','ied','ies','ed','es','ly','ous','ive','al','ence','ance','ency','ancy','ent','ant','ions','ion','ers','er','s']) {
      if (s.endsWith(suf) && s.length - suf.length >= 3 && !(suf === 's' && /(?:ss|us|is)$/.test(s))) {
        s = s.slice(0, -suf.length) + (suf === 'ies' || suf === 'ied' || suf === 'ity' || suf === 'ities' ? 'i' : '');
        break;
      }
    }
    if (s === before) break;
  }
  s = s.replace(/y$/u, 'i').replace(/e$/u, '').replace(/([bdfgklmnprt])\1$/u, '$1');
  out.add(s.length >= 3 ? s : w);
  return out;
}

// Synonym entries are stem prefixes; normalise them through the same stemmer so a stemmer
// change can never silently disable an entry (e.g. delay -> delai).
const NORMALISED = {};
function synonymGroups(lang) {
  if (!NORMALISED[lang]) NORMALISED[lang] = (SYNONYMS[lang] || []).map(group => [...new Set(group.flatMap(g => g.includes(' ') || lang !== 'en' ? [g] : [g, ...[...stems(g, lang)].filter(x => x.length >= 4 && x.slice(0, 4) === g.slice(0, 4))]))]);
  return NORMALISED[lang];
}
function synonymClosure(stemSet, lang) {
  const out = new Set(stemSet);
  for (const group of synonymGroups(lang)) {
    if (group.some(g => [...stemSet].some(s => s === g || (g.length >= 5 && s.startsWith(g)) || (s.length >= 5 && g.startsWith(s))))) for (const g of group) out.add(g);
  }
  return out;
}

const WORD = /\p{L}+(?:-\p{L}+)*/gu;

/** Content words of a text, with stems. Hyphenated reduplication is one unit. */
export function contentUnits(text, lang) {
  const units = [];
  for (const m of String(text).matchAll(WORD)) {
    const word = m[0];
    const lower = word.toLowerCase();
    if (STOP[lang].has(lower) || lower.length < 3) continue;
    if (/^\p{Lu}{2,}$/u.test(word)) continue; // acronyms/labels are protected elsewhere
    if (lang === 'en' && /^(?:[a-z])$/i.test(word)) continue;
    units.push({ word, index: m.index, stems: stems(word, lang) });
  }
  return units;
}

function matches(unitStems, pool) {
  for (const s of unitStems) {
    if (pool.has(s)) return true;
    for (const p of pool) {
      if (s.length >= 5 && p.length >= 5 && (s.startsWith(p) || p.startsWith(s))) return true;
      // multiword synonym entries ("right away") match as substrings of the pool text
    }
  }
  return false;
}

/** Return source content units whose concept is absent from the back-translation.
 * coveredWords: words already guaranteed by an exact terminology constraint. */
export function missingConcepts(source, back, lang, { coveredWords = [] } = {}) {
  const backUnits = contentUnits(back, lang);
  const pool = new Set();
  for (const u of backUnits) for (const s of synonymClosure(u.stems, lang)) pool.add(s);
  const backLower = String(back).toLowerCase();
  for (const group of synonymGroups(lang)) for (const g of group) if (g.includes(' ') && backLower.includes(g)) for (const x of group) pool.add(x);
  const covered = new Set(coveredWords.map(w => w.toLowerCase()));
  const missing = [];
  for (const u of contentUnits(source, lang)) {
    if (covered.has(u.word.toLowerCase())) continue;
    const closure = synonymClosure(u.stems, lang);
    if (!matches(closure, pool)) missing.push({ word: u.word, stems: [...u.stems] });
  }
  return missing;
}

/** Sentence-aligned comparison; falls back to whole-text comparison when counts differ. */
export function alignedMissing(source, back, lang, options = {}) {
  const seg = t => typeof Intl.Segmenter === 'function'
    ? [...new Intl.Segmenter(lang, { granularity: 'sentence' }).segment(t)].map(x => x.segment.trim()).filter(Boolean)
    : t.split(/(?<=[.!?])\s+/u).filter(Boolean);
  const a = seg(source), b = seg(back);
  if (a.length > 1 && a.length === b.length) return a.flatMap((s, i) => missingConcepts(s, b[i], lang, options).map(m => ({ ...m, sentence: i })));
  return missingConcepts(source, back, lang, options).map(m => ({ ...m, sentence: 0 }));
}

export function sentences(text, lang) {
  return typeof Intl.Segmenter === 'function'
    ? [...new Intl.Segmenter(lang, { granularity: 'sentence' }).segment(String(text))].map(x => x.segment.trim()).filter(Boolean)
    : String(text).split(/(?<=[.!?])\s+/u).filter(Boolean);
}

/** Words that fail BOTH independent coverage tests:
 *  (a) absent from the back-translation (source language, stems + general synonyms), and
 *  (b) the model's isolated translation of the word is absent from the aligned target sentence.
 * `iso(word)` returns the isolated target term or '' when unknown (then (b) cannot rescue it).
 * Sentences are aligned only when source, target and back have equal counts. */
export function conceptGaps({ source, target, back, srcLang, tgtLang, iso, phraseIso = null, coveredWords = [] }) {
  const s = sentences(source, srcLang), t = sentences(target, tgtLang), b = sentences(back, srcLang);
  const pairs = s.length > 1 && s.length === t.length && t.length === b.length ? s.map((x, i) => [x, t[i], b[i]]) : [[source, target, back]];
  const gaps = [];
  pairs.forEach(([src, tgt, bk], sentence) => {
    for (const m of missingConcepts(src, bk, srcLang, { coveredWords })) {
      if (DEGREE[srcLang]?.test(m.word) && INTENSIFIER[tgtLang]?.test(tgt)) continue;
      const term = iso(m.word.toLowerCase());
      if (term && containsTerm(tgt, term, tgtLang)) continue;
      // Context-sensitive evidence: the model's translation of the word with a neighbouring content word.
      if ((phraseIso?.(m.word, src) || []).some(p => p && containsTerm(tgt, p, tgtLang))) continue;
      gaps.push({ ...m, sentence, isoTerm: term || '' });
    }
    if (srcLang === 'id') for (const v of voiceGaps(src, bk)) gaps.push({ ...v, sentence, isoTerm: '' });
  });
  return gaps;
}

/** Indonesian voice is morphological: me-/mem-/men-/meng-/meny- active, di- passive.
 * A source verb whose stem returns ONLY with the opposite voice in the back-translation
 * signals an inverted relation (who requires what). Indonesian source only. */
const ID_ACTIVE=/^(?:meng|meny|mem|men|me)\p{L}{3,}$/u, ID_PASSIVE=/^di\p{L}{4,}$/u;
const NOT_PASSIVE=new Set(['diri','dirinya','dia','dian','dinding','dingin','dinas','diskusi','distribusi','dimensi','diagram','diagnosis','dinamika','dinamis','digital','disiplin','diet']);
function idVoice(word){const w=word.toLowerCase();if(ID_ACTIVE.test(w))return 'active';if(ID_PASSIVE.test(w)&&!NOT_PASSIVE.has(w))return 'passive';return '';}
export function voiceGaps(source, back) {
  const gaps=[];const backVerbs=[];
  for(const m of String(back).matchAll(WORD)){const v=idVoice(m[0]);if(v)backVerbs.push({v,stems:stems(m[0],'id')});}
  for(const m of String(source).matchAll(WORD)){
    const v=idVoice(m[0]);if(!v)continue;const st=stems(m[0],'id');
    const same=backVerbs.filter(b=>[...b.stems].some(x=>st.has(x)));
    if(same.length&&same.every(b=>b.v!==v))gaps.push({word:m[0],stems:[...st],kind:'voice'});
  }
  return gaps;
}

/** Bigram phrases around a word inside one sentence (previous/next content word). */
export function neighbourPhrases(word, sentence, lang) {
  const toks = [...String(sentence).matchAll(WORD)].map(m => m[0]);
  const i = toks.findIndex(t => t.toLowerCase() === String(word).toLowerCase());
  if (i < 0) return [];
  const ok = t => t && !STOP[lang].has(t.toLowerCase()) && t.length >= 3;
  const out = [];
  if (ok(toks[i + 1])) out.push(toks[i] + ' ' + toks[i + 1]);
  if (ok(toks[i - 1])) out.push(toks[i - 1] + ' ' + toks[i]);
  return out.map(x => x.toLowerCase());
}

/** Does the target contain the (target-language) term? Stem-level, for iso-term checks. */
export function containsTerm(target, term, lang) {
  const termUnits = contentUnits(term, lang);
  if (!termUnits.length) return String(target).toLowerCase().includes(String(term).toLowerCase());
  const pool = new Set(); for (const u of contentUnits(target, lang)) for (const s of synonymClosure(u.stems, lang)) pool.add(s);
  return termUnits.every(u => matches(synonymClosure(u.stems, lang), pool));
}
