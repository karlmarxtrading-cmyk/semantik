import {domainPairs} from './domain-concepts';
import {protectedSpans} from './protection';
import type {Direction} from './types';
import {wordFractionPairs} from './word-fractions';
export const TERMINOLOGY_POLICY='math-phrases-v12-contextual-concepts';
// Only unambiguous multiword phrases. Do not rewrite isolated square, plane,
// line, base or term: those need context. Custom glossaries remain QA constraints.
const pairs:[string,string][]=[
 ['numerasi','numeracy'],
 ['sistem bilangan','number system'],['sistem bilangan','number systems'],
 ['kumpulan berhingga','finite collection'],['kumpulan berhingga','finite collections'],
 ['himpunan berhingga','finite set'],['himpunan berhingga','finite sets'],
 ['barisan aritmetika','arithmetic sequence'],['suku awal','first term'],
 ['beda barisan','common difference'],['grafik garis','line graph'],['grafik garis','line graphs'],
 ['garis horizontal','horizontal line'],['garis vertikal','vertical line'],
 ['sudut lancip','acute angle'],['garis sejajar','parallel lines'],
 ['untuk semua real','for all real'],['niscaya benar','necessarily true'],['vektor arah','direction vector'],['titik potong','intersection point'],
 ['lengkapi kuadrat','complete the square'],
 ['prisma tegak beralas persegi panjang','right rectangular prism'],
 ['tunjukkan pembagian','show the division'],
 ['tidak perlu dihafal','need not be memorized'],
 ['tidak harus','need not'],['tidak perlu','does not need to'],
 ['berada di urutan','be in position'],
 ['persegi panjang','rectangle'],['persegi panjang','rectangles'],
 ['bilangan genap','even number'],['bilangan genap','even numbers'],
 ['bilangan ganjil','odd number'],['bilangan ganjil','odd numbers'],
 ['bilangan prima','prime number'],['bilangan prima','prime numbers'],
 ['paritas genap','even parity'],['paritas ganjil','odd parity'],
 ['suku ganjil','odd term'],['suku genap','even term'],
 ['bilangan cacah','nonnegative integers'],['basis dua','base two'],['basis lima','base five'],
 ['satu ratusan','one hundred'],['satu puluhan','one ten'],['sepuluh puluhan','ten tens'],
 ['sebuah stoples','a jar'],['stoples tersebut','the jar'],
 ['aturan hubungan masukan–keluaran','input–output relationship rule'],
 ['analisis tanda','sign analysis'],['bilangan asli','natural number'],['sifat distributif','distributive property'],
 ['bilangan dua angka','two-digit number'],['bilangan tiga angka','three-digit number'],['bilangan empat angka','four-digit number'],
 ['disusun mandiri','prepared independently'],
 ['bilangan bulat','integer'],['bilangan bulat','integers'],['pecahan','fraction'],['pecahan','fractions'],
 ['kuadratkan kedua ruas','square both sides'],['kuadratkan ekspresi','square the expression'],
 ['mengkuadratkan entri tunggal','squaring the single entry'],
 ['mengkuadratkan masukan','squares the input'],
 ['selisih barisan aritmetika','common difference of the arithmetic sequence'],
 ['relasi rekurensi','recurrence relation'],['panjang keliling','perimeter length'],
 ['trikotomi','trichotomy'],['kalikan silang','cross multiply'],
 ...wordFractionPairs.flatMap(([id,en]):[string,string][]=>[[id,en],[id,en.replace('-',' ')]]),
];
export function mathTerminologySpans(source:string,direction:Direction,context=source){
 const protected_=protectedSpans(source),spans:{start:number;end:number;value:string;replacement:string;kind:string}[]=[];
 const contextual:[string,string][]=domainPairs(source,context);
 const hasFormula=protected_.some(p=>p.kind==='formula');
 const arithmetic=/\b(?:arithmetic|equations?|integers?|primes?|numbers?|exponents?|polynomials?|parity|bilangan|barisan|persamaan|rumus|distributif|genap|ganjil|penjumlahan|radical|domain)\b/i.test(source);
 const paragraphMath=/\b(?:arithmetic|sequence|equation|number|exponent|polynomial|parity|bilangan|barisan|persamaan|rumus)\b/i.test(context);
 const geometry=/\b(?:angles?|points?|projection|perpendicular|parallel|rectangles?|rectangular|prism|circle|intersects|tangent|slope|equation|distance|direction vector|passes through|scale factor|graphed|axis|axes|sudut|sejajar|tegak lurus)\b/i.test(source)||hasFormula&&/\b(?:geometry|line|lines|plane|planes|region|perimeter|geometri|garis|bidang)\b/i.test(source);
 if(direction==='en-id'&&/\b(?:primes?|integer|parity|equation|theorem)\b/i.test(source))contextual.push(['tidak memenuhi sifat','fails the property'],['sifat','property']);
 if(arithmetic||hasFormula&&paragraphMath){contextual.push(['suku','term'],['suku','terms'],['basisnya sama','bases are equal']);}
 if(/\b(?:bilangan|sepuluh|puluhan|ratusan)\b/i.test(source))contextual.push(['membaginya','dividing it']);
 const placeValue=/\b(?:puluhan|ratusan|ribuan|tens|hundreds|thousands)\b/i.test(context);
 const positionalMath=/\b(?:nilai tempat(?!\s+(?:wisata|tinggal|parkir)\b)|place[- ]values?(?!\s+(?:on|upon)\b)|positional values?)\b/i.test(context);
 if(positionalMath){
  contextual.push(['nilai tempat','place value'],['nilai tempat','place values'],['nilai tempat','positional value']);
  if(direction==='id-en')contextual.push(['nilai tempat bertingkat dengan faktor','place values increase by a factor of'],['bertingkat dengan faktor','increase in steps by a factor of']);
 }
 if(direction==='id-en'&&/^Membandingkan\b/i.test(source)&&/\bmelatih pemahaman bahwa\b/i.test(source))contextual.push(['membandingkan nilai-nilai itu','comparing those values'],['membandingkan','comparing'],['melatih pemahaman bahwa','develops an understanding that']);
 if(placeValue)contextual.push(['nilai angka','digit value'],['lambang','numeral']);
 if(direction==='en-id')contextual.push(['angka','digit'],['angka','digits']);
 if(/\b(?:arithmetic sequence|barisan aritmetika)\b/i.test(source))contextual.push(['beda','common difference']);
 if(geometry){contextual.push(['digambarkan pada grafik','graphed'],['persegi','square'],['garis','line'],['garis','lines'],['bidang','plane'],['bidang','planes'],['keliling','perimeter'],['luas','area']);}
 if(arithmetic||hasFormula)contextual.push(['relasi rekurensi','recurrence'],['terbatas di bawah','bounded below'],['terbatas di atas','bounded above']);
 if(/\b(?:logarithm|logaritma|log_|log\\|power law|product law)\b/i.test(source)||hasFormula&&/\\log\b/.test(source))contextual.push(['aturan pangkat','power law'],['aturan perkalian','product law']);
 if(/\b(?:bilangan|kumpulan|menghitung|number|collection|count)\b/i.test(source)){contextual.push(['kumpulan kosong','empty collection']);if(direction==='id-en')contextual.push(['mencacah','count']);}
 if(/\b(?:alasan|kenyataan|kumpulan|rumus|persamaan)\b/i.test(source))contextual.push(['ia mengikuti dari','it follows from']);
 const countingObjects=/\b(?:count|counting|collection|matching|matches)\b/i.test(context)&&/\b(?:red|blue|green|yellow|finite|objects?)\b/i.test(context);
 if(countingObjects){
  contextual.push(['benda hitung','counters']);
  for(const [id,en]of [['merah','red'],['biru','blue'],['hijau','green'],['kuning','yellow'],['tanpa pasangan','unmatched']])contextual.push(['benda hitung '+id,en+' counter'],['benda hitung '+id,en+' counters']);
 }
 // Context belongs to the sentence. A temperature decrease is not a derivation;
 // "per dua" outside a grouping statement is not a mathematical unit.
 if(/\b(?:pengelompokan|mengelompokkan|kelompok|grouping|groups?|grouped)\b/i.test(source))contextual.push(['per dua','in groups of two']);
 if(/\b(?:rumus|teorema|identitas|basis|formula|theorem|identity|base)\b/i.test(source)&&/\b(?:disusun|rumus|teorema|derivation)\b/i.test(source))contextual.push(['penurunan','derivation']);
 if(/\b(?:latihan|pembelajaran|pendidikan|UTBK|SNBT|practice|learning|education)\b/i.test(source))contextual.push(['pengayaan','enrichment']);
 if(/\b(?:UTBK|SNBT|ujian|exam|examination)\b/i.test(source))contextual.push(['kisi-kisi','exam blueprint']);
 if(/\b(?:persamaan|rumus|barisan|distributif|equation|formula|sequence|distributive)\b/i.test(source))contextual.push(['setiap suku','each term']);
 // Longer phrases take precedence over their shorter components, irrespective
 // of declaration order. Domain senses never rewrite opaque formula/code spans.
 const candidates=[...pairs,...contextual].sort((a,b)=>(direction==='id-en'?b[0].length-a[0].length:b[1].length-a[1].length));
 for(const [id,en] of candidates){const from=direction==='id-en'?id:en,to=direction==='id-en'?en:id;
  for(const m of source.matchAll(new RegExp('\\b'+from+'\\b','gi'))){const start=m.index!,end=start+m[0].length;
   if([...protected_,...spans].some(p=>start<p.end&&end>p.start))continue;
   const first=m[0][0],replacement=first===first.toUpperCase()?to[0].toUpperCase()+to.slice(1):to;
   spans.push({start,end,value:m[0],replacement,kind:'terminology'});
  }
 }
 const addLocal=(start:number,value:string,replacement:string)=>{
  const end=start+value.length;if([...protected_,...spans].some(p=>start<p.end&&end>p.start))return;
  spans.push({start,end,value,replacement:value[0]===value[0].toUpperCase()?replacement[0].toUpperCase()+replacement.slice(1):replacement,kind:'terminology'});
 };
 if(direction==='id-en'&&placeValue)for(const m of source.matchAll(/\bangka(?=\s+(?:[a-z](?!\w)|\d(?!\d)|baru|di posisi)\b)/gi))addLocal(m.index!,m[0],'digit');
 if(direction==='en-id'&&(arithmetic||hasFormula)){
  // "even one" is concessive, not parity. Protect predicates and adjectival
  // number/prime/parity uses only; do not blanket-replace the homograph.
  for(const m of source.matchAll(/\b(?:is|are|be|also|and|result)\s+(even|odd)\b|\b(even|odd)(?=\s+(?:numbers?|integers?|primes?|parity|term)\b)/gi)){
   const value=m[1]||m[2],start=m.index!+m[0].lastIndexOf(value);addLocal(start,value,value.toLowerCase()==='even'?'genap':'ganjil');
  }
  for(const m of source.matchAll(/(?:^|[.!?]\s+)(square)\b|\b(squaring)\b|\b(square)(?=\s*[,;])/gi)){
   const value=m[1]||m[2]||m[3],start=m.index!+m[0].lastIndexOf(value);addLocal(start,value,value.toLowerCase()==='squaring'?'pengkuadratan':'kuadratkan');
  }
 }
 return spans.sort((a,b)=>a.start-b.start);
}
