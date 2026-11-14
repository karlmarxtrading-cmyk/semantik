"""Deterministic AI-authored CC0 capacity fixtures. Not independent human semantic gold.
Each page has a trace ID and materially differing numerical/domain statements.
The rich 1001-page fixture independently exercises >2M chars. It does not stand in
for real scientific books, OCR/large image capacity, physical devices, or inference.
"""
from pathlib import Path
import json,hashlib,textwrap,platform
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
R=Path(__file__).resolve().parents[1];OUT=R/'tests/fixtures/cp20-capacity';OUT.mkdir(parents=True,exist_ok=True)
pdfmetrics.registerFont(TTFont('Capacity','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('CapacityBold','/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
EN=[
 lambda n:f'The research team measured {n} samples before the intervention. The comparison group received no treatment. This observation alone does not establish a causal relationship.',
 lambda n:f'The chemical solution contained {n} milligrams of dissolved salt. Heating removed the solvent but did not destroy the salt. The concentration depends on the final volume.',
 lambda n:f'The finite set in experiment {n} contains distinct elements. A subgroup must contain the identity element. These mathematical objects are defined separately.',
 lambda n:f'The economic survey recorded {n} transactions. Demand increased when the price fell while other conditions remained fixed. The estimate describes this sample, not every market.',
 lambda n:f'The statistical analysis used {n} observations. The sample mean differs from the population mean. A confidence interval expresses uncertainty under the stated model.',
 lambda n:f'The ecology study followed {n} marked trees. Growth varied across locations because rainfall and soil conditions differed. The authors reported the limitations of their measurements.',
 lambda n:f'The education study included {n} written responses. The rubric distinguished an unsupported answer from an explanation supported by evidence. Two assessors compared their judgments.',
 lambda n:f'The engineering laboratory recorded {n} measurements of pressure. The instrument was calibrated before each session. The reported unit and the measurement uncertainty must remain together.',
 lambda n:f'The historical archive contains {n} indexed entries. A later interpretation may conflict with the original record. The researcher separates documentary evidence from speculation.',
 lambda n:f'The sequence in calculation {n} is bounded and monotone. Under the stated assumptions, the sequence converges. Removing an assumption requires a different proof.'
]
ID=[
 lambda n:f'Tim penelitian mengukur {n} sampel sebelum intervensi. Kelompok pembanding tidak menerima perlakuan. Pengamatan ini saja tidak membuktikan hubungan sebab akibat.',
 lambda n:f'Larutan kimia mengandung {n} miligram garam terlarut. Pemanasan menghilangkan pelarut tetapi tidak menghancurkan garam. Konsentrasi bergantung pada volume akhir.',
 lambda n:f'Himpunan hingga dalam percobaan {n} berisi elemen yang berbeda. Subgrup harus memuat elemen identitas. Objek matematika ini didefinisikan secara terpisah.',
 lambda n:f'Survei ekonomi mencatat {n} transaksi. Permintaan meningkat ketika harga turun sementara kondisi lain tetap. Estimasi ini menggambarkan sampel tersebut, bukan setiap pasar.',
 lambda n:f'Analisis statistika menggunakan {n} pengamatan. Rata-rata sampel berbeda dari rata-rata populasi. Interval kepercayaan menyatakan ketidakpastian dalam model yang disebutkan.',
 lambda n:f'Penelitian ekologi mengikuti {n} pohon yang ditandai. Pertumbuhan berbeda antar lokasi karena curah hujan dan kondisi tanah berbeda. Penulis melaporkan keterbatasan pengukuran.',
 lambda n:f'Penelitian pendidikan mencakup {n} jawaban tertulis. Rubrik membedakan jawaban tanpa alasan dari penjelasan yang didukung bukti. Dua penilai membandingkan penilaian mereka.',
 lambda n:f'Laboratorium teknik mencatat {n} pengukuran tekanan. Instrumen dikalibrasi sebelum setiap sesi. Satuan yang dilaporkan dan ketidakpastian pengukuran harus tetap bersama.',
 lambda n:f'Arsip sejarah memuat {n} entri berindeks. Penafsiran berikutnya dapat bertentangan dengan catatan asli. Peneliti memisahkan bukti dokumenter dari spekulasi.',
 lambda n:f'Barisan dalam perhitungan {n} bersifat monoton dan terbatas. Dengan asumsi yang dinyatakan, barisan itu konvergen. Menghapus asumsi memerlukan pembuktian yang berbeda.'
]
def create(pages,lang,rich=False):
 name=f'capacity-{pages}-{lang}'+('-rich' if rich else '')+'.pdf';path=OUT/name
 c=canvas.Canvas(str(path),pagesize=(595,842),invariant=1,pageCompression=1)
 c.setTitle(f'CP20 synthetic capacity {pages} pages {lang}'+(' rich text' if rich else ''))
 c.setAuthor('Semantik Setara AI-authored CC0 test material')
 page_records=[]
 for p in range(1,pages+1):
  pid=f'CP20P{p:04d}';heading=f'{pid}: '+('Catatan penelitian' if lang=='id' else 'Research observations')
  c.setFont('CapacityBold',14);c.drawString(35,805,heading)
  corpus=ID if lang=='id' else EN
  if rich:
   paragraphs=[f'CP20B{p:04d}_{j:02d}. '+corpus[(p+j)%len(corpus)](p*31+j*7+11) for j in range(13)]
  else:
   paragraphs=[f'CP20B{p:04d}_00. '+corpus[(p-1)%len(corpus)](p*7+11)]
  y=775;c.setFont('Capacity',9 if rich else 11)
  for para in paragraphs:
   for line in textwrap.wrap(para,width=103 if rich else 81):
    c.drawString(35,y,line);y-=12 if rich else 16
   y-=5 if rich else 9
  if y<30:raise RuntimeError((p,'page overflow',y))
  c.setFont('Capacity',8);c.drawString(35,22,f'{pid} END')
  text=heading+'\n'+'\n\n'.join(paragraphs)+'\n'+pid+' END'
  page_records.append({'page':p,'id':pid,'blockIds':[f'CP20B{p:04d}_{j:02d}' for j in range(len(paragraphs))],'sourceCharacters':len(text),'sourceSha256':hashlib.sha256(text.encode()).hexdigest()})
  c.showPage()
 c.save()
 record={'file':name,'pages':pages,'language':lang,'rich':rich,'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'sourceCharacters':sum(x['sourceCharacters'] for x in page_records),'uniqueProseParagraphs':sum(len(x['blockIds']) for x in page_records),'traceManifest':name.replace('.pdf','.json')}
 (OUT/record['traceManifest']).write_text(json.dumps({'fixture':record,'pages':page_records},indent=2)+'\n')
 return record
rows=[create(p,'en') for p in [300,301,1000,1001]]+[create(1500,'id'),create(1001,'en',True)]
manifest={'fixtureKind':'AI-authored synthetic capacity fixtures; not semantic gold standard','license':'CC0 original text; embedded DejaVu license retained by project','files':rows}
(OUT/'MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest,indent=2))
