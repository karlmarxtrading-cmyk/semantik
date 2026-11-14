#!/usr/bin/env python3
"""Generate synthetic, redistributable journal PDFs for reproducible browser QA."""
from pathlib import Path
import io, json, hashlib
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from PIL import Image, ImageDraw, ImageFont
from pypdf import PdfReader, PdfWriter

HERE = Path(__file__).resolve().parent
OUT = HERE / 'fixtures'
OUT.mkdir(exist_ok=True)
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
pdfmetrics.registerFont(TTFont('FixtureSans', FONT))
W,H = A4
manifest = {}

def start(name, title):
    c = canvas.Canvas(str(OUT/name), pagesize=A4, invariant=1)
    c.setTitle(title); c.setAuthor('SEMANTIK SETARA synthetic QA')
    return c

def lines(c, text, x=52, y=780, size=11, leading=17):
    c.setFont('FixtureSans',size)
    for s in text:
        c.drawString(x,y,s); y -= leading
    return y

def finish(c,name,checks,**extra):
    c.save()
    manifest[name] = {'purpose':checks.pop('purpose'),**checks,**extra}

c = start('digital-en.pdf','Synthetic English journal')
lines(c,['Education and Economic Growth'],size=17)
lines(c,['Abstract','This study examines education and economic growth.',
 'We studied 120 participants in 2024. The sample mean was 12.5.',
 'The confidence interval was 10.2 to 14.8 and p = 0.031.',
 'Methods','The participants completed a survey.',
 'Results','Education was associated with economic growth.',
 'References','Smith, A. (2024). Education research. doi:10.1234/example.2024.001'],y=735)
finish(c,'digital-en.pdf',{'purpose':'English text, headings, protected statistics and DOI','pages':1,
 'contains':['120','2024','12.5','10.2','14.8','0.031','10.1234/example.2024.001']})

c = start('digital-id.pdf','Jurnal sintetis Indonesia')
lines(c,['Pendidikan dan Pertumbuhan Ekonomi'],size=17)
lines(c,['Abstrak','Penelitian ini mengkaji pendidikan dan pertumbuhan ekonomi.',
 'Kami meneliti 120 peserta pada tahun 2024. Rata-rata sampel adalah 12.5.',
 'Metode','Para peserta mengisi kuesioner.',
 'Hasil','Pendidikan berhubungan dengan pertumbuhan ekonomi.',
 'Daftar Pustaka','Sari, A. (2024). Kajian pendidikan. doi:10.1234/contoh.2024.001'],y=735)
finish(c,'digital-id.pdf',{'purpose':'Indonesian text and ID to EN inference','pages':1,
 'contains':['120','2024','12.5','10.1234/contoh.2024.001']})

c = start('two-column.pdf','Two column ordering fixture')
lines(c,['A Two Column Scientific Article'],size=18)
lines(c,['This introduction spans the width of the page and precedes both columns.'],y=735,size=10)
left=['LEFT-ONE: Education improves access.','This is the second line of the first paragraph.','',
      'LEFT-TWO: We collected survey data.','The sample includes 200 households.','',
      'LEFT-THREE: The treatment group improved.','The study used a controlled design.']
right=['RIGHT-ONE: The results show an association.','The first right paragraph follows the left column.','',
       'RIGHT-TWO: The estimates were stable.','The average score was 25.0 points.','',
       'RIGHT-THREE: Replication is necessary.','Further studies should include more regions.']
lines(c,left,x=40,y=685,size=9.2,leading=18)
lines(c,right,x=310,y=685,size=9.2,leading=18)
lines(c,['Conclusion','This full-width conclusion follows both columns.'],y=480,size=11)
finish(c,'two-column.pdf',{'purpose':'Read all left column blocks before all right blocks','pages':1,
 'order':['LEFT-ONE','LEFT-TWO','LEFT-THREE','RIGHT-ONE','RIGHT-TWO','RIGHT-THREE','Conclusion']})

c = start('academic-structures.pdf','Statistics, formula, table and figure')
lines(c,['Statistical Measurements'],size=18)
lines(c,['The trial enrolled 125 participants (95% CI: 1.20-2.50).',
 'The treatment effect was -0.35 kg; p < 0.05; n = 125.',
 'The equation below is preserved from the source:'],y=735)
lines(c,['E = mc²     y = 2x + 5     α = 0.05'],y=655,size=15)
lines(c,['Table 1. Measured results'],y=605,size=12)
rows=[['Group','n','Mean (kg)','p-value'],['Control','60','12.50','0.031'],['Treatment','65','14.25','0.004']]
xs=[55,190,285,420]
for ri,row in enumerate(rows):
    for xi,s in zip(xs,row): lines(c,[s],x=xi,y=570-ri*28,size=11)
for y in [590,555,527,499]: c.line(45,y,535,y)
c.setFillColorRGB(.13,.44,.38)
c.rect(80,320,80,80,fill=1); c.rect(215,320,80,120,fill=1)
c.setFillColorRGB(0,0,0)
lines(c,['Figure 1. Outcome by group.'],y=295)
lines(c,['References','Li, B. (2025). Measurement theory. https://doi.org/10.5678/test.12'],y=240)
finish(c,'academic-structures.pdf',{'purpose':'Table and formula preservation with visual fallback','pages':1,
 'contains':['125','95%','1.20','2.50','-0.35','0.05','12.50','14.25','0.031','0.004','10.5678/test.12']})

def scan_image(lang='en'):
    image=Image.new('RGB',(1240,1754),'white'); draw=ImageDraw.Draw(image)
    titlefont=ImageFont.truetype(FONT,40); font=ImageFont.truetype(FONT,28)
    if lang=='en':
        title='SCANNED JOURNAL'; body=['Abstract','This study examines education and health.',
          'We examined 120 participants in 2024.',
          'The average score was 12.5 points.',
          'Methods','The participants completed a survey.',
          'Results','Education was associated with better health.']
    else:
        title='JURNAL PINDAI'; body=['Abstrak','Penelitian ini mengkaji pendidikan dan kesehatan.',
          'Kami meneliti 120 peserta pada tahun 2024.',
          'Nilai rata-rata adalah 12.5 poin.',
          'Metode','Para peserta mengisi kuesioner.',
          'Hasil','Pendidikan berkaitan dengan kesehatan.']
    draw.text((100,100),title,font=titlefont,fill='black')
    for i,line in enumerate(body): draw.text((100,220+i*70),line,font=font,fill='black')
    return image

for lang in ['en','id']:
    name=f'scan-{lang}.pdf'; c=start(name,f'Scanned {lang} journal')
    c.drawImage(ImageReader(scan_image(lang)),0,0,width=W,height=H)
    finish(c,name,{'purpose':'Image-only page requiring OCR','pages':1,'sourceLanguage':lang,
      'contains':['120','2024','12.5']})

c = start('mixed.pdf','Mixed digital and scanned journal')
lines(c,['DIGITAL PAGE ONE'],size=18)
lines(c,['This page is digital text. The sample size was 45.'],y=730)
c.showPage(); c.drawImage(ImageReader(scan_image('en')),0,0,width=W,height=H)
finish(c,'mixed.pdf',{'purpose':'Per-page OCR without replacing digital text','pages':2,
 'contains':['DIGITAL PAGE ONE','45','120','2024','12.5']})

c = start('unsafe-strings.pdf','Escaping fixture')
lines(c,['Untrusted Text in a PDF'],size=18)
lines(c,['<script>window.__PDF_XSS = true</script>',
 '<img src=x onerror=alert(1)>',
 '[click](javascript:alert(1))',
 '`code` | <b>bold</b> & text',
 '../../outside.txt',
 'This content is text, never HTML or executable code.'],y=730,size=10)
finish(c,'unsafe-strings.pdf',{'purpose':'UI and Markdown escaping of untrusted document strings','pages':1,
 'contains':['<script>','javascript:','../../outside.txt']})

reader=PdfReader(OUT/'digital-en.pdf'); writer=PdfWriter()
for page in reader.pages: writer.add_page(page)
writer.encrypt('journal-test-password',algorithm='RC4-128')
with (OUT/'password-protected.pdf').open('wb') as f: writer.write(f)
manifest['password-protected.pdf']={'purpose':'Password prompt and cancel path','pages':1,
 'password':'journal-test-password'}

c = start('page-limit-301.pdf','Page limit fixture')
for i in range(301):
    lines(c,[f'Page {i+1}','This fixture verifies the configured page count limit.'])
    c.showPage()
finish(c,'page-limit-301.pdf',{'purpose':'Reject over configured 300-page limit','pages':301})

c = start('rotated.pdf','Rotated article')
c.setPageRotation(90); lines(c,['Rotated Article','This rotated page contains 27 observations.'],x=70,y=500)
finish(c,'rotated.pdf',{'purpose':'Rotation-aware geometry and extraction','pages':1,'contains':['27']})

c = start('empty.pdf','Empty page fixture'); c.showPage()
finish(c,'empty.pdf',{'purpose':'Blank page should not be treated as successful translated text','pages':1})

(OUT/'corrupt.pdf').write_bytes(b'%PDF-1.7\nThis is not a valid PDF document.\n%%EOF\n')
(OUT/'json-masquerading.pdf').write_text('{"title":"Must not be accepted as a PDF"}\n')
(OUT/'input.json').write_text('{"text":"JSON upload is forbidden"}\n')
(OUT/'input.txt').write_text('Plain text upload is forbidden\n')
for name in ['corrupt.pdf','json-masquerading.pdf','input.json','input.txt']:
    manifest[name]={'purpose':'Reject unsupported or invalid input'}
from fixture_bilingual import create as create_bilingual
manifest['bilingual-text.pdf']=create_bilingual(OUT)
for name,item in manifest.items():
    data=(OUT/name).read_bytes(); item['bytes']=len(data); item['sha256']=hashlib.sha256(data).hexdigest()
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'fixtures':len(manifest),'directory':str(OUT),'bytes':sum(x['bytes'] for x in manifest.values())},indent=2))
