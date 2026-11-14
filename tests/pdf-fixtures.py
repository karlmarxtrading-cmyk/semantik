"""Synthetic CP18 development/regression fixtures, NOT the user's historical PDF.
CC0 test text written for regression. ReportLab/font provenance retained.
"""
from pathlib import Path
import json,hashlib,shutil,re
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from PIL import Image,ImageDraw,ImageFont
from pypdf import PdfReader,PdfWriter
ROOT=Path(__file__).resolve().parent/'fixtures';ROOT.mkdir(exist_ok=True)
pdfmetrics.registerFont(TTFont('Fixture','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('Math','/usr/share/fonts/truetype/dejavu/DejaVuMathTeXGyre.ttf'))
def begin(name,title):
 c=canvas.Canvas(str(ROOT/name),pagesize=(595,842),invariant=1);c.setTitle('CP18 SYNTHETIC FIXTURE: '+title);c.setAuthor('Semantik Setara regression fixtures (CC0)');c.setFont('Fixture',11);return c
c=begin('digital-en.pdf','English scientific prose');
for i,s in enumerate(['Scientific results','The intervention did not improve survival.','The hazard ratio was 1.42 with a 95% confidence interval of 1.11 to 1.82.','The concentration was 10 μM and the Ca2+ concentration increased.','The evidence remains uncertain.','The solution set is ∅.']):c.drawString(40,790-i*35,s)
c.save()
c=begin('digital-id.pdf','Indonesian scientific prose');
for i,s in enumerate(['Hasil ilmiah','Intervensi tidak meningkatkan kelangsungan hidup.','Regresi linear mengestimasi ukuran efek.','Konsentrasi sampel adalah 10 μM.','Bukti masih belum pasti.','Himpunan penyelesaian adalah ∅.']):c.drawString(40,790-i*35,s)
c.save()
c=begin('table-two-column.pdf','Tables and two columns');
for i in range(4):
 c.drawString(35,780-i*30,'Left column scientific prose line '+str(i+1)+'.')
 c.drawString(315,780-i*30,'Right column results and discussion '+str(i+1)+'.')
for y,a,b in [(560,'Treatment','Outcome'),(530,'Control group','10 mg'),(500,'Intervention group','20 mg')]:c.drawString(40,y,a);c.drawString(310,y,b)
c.save()
c=begin('rotated.pdf','Rotated text');c.saveState();c.translate(100,180);c.rotate(90);c.drawString(0,0,'Rotated scientific label: concentration 10 mg.');c.restoreState();c.drawString(40,780,'Digital upright heading');c.save()
c=begin('mathematics.pdf','Inequality notation and mathematical identifiers');c.setFont('Math',15)
for i,s in enumerate(['||𝑥 − 4| − 4| < 1','||x − 4| − 4| > 1','|𝑥 + 4| + |𝑥 + 3| ≤ 0','x ≥ 2','∅   ℝ   ℕ   ℤ   ∈   ∉   ∪   ∩','(−∞, −3) ∪ (2, ∞)']):c.drawString(40,790-i*45,s)
c.setFont('Fixture',9);c.drawString(40,460,'Solve the inequality. Express the solution set in interval notation.');c.drawString(40,430,'ID absolute-value-inequalities~challenge~nested-abs~34f24hj2-0~0');c.save()
# Correct ReportLab's non-BMP ToUnicode mapping to valid UTF-16BE; this fixes
# the fixture generator, not the application or historical input.
p=ROOT/'mathematics.pdf';reader=PdfReader(p);writer=PdfWriter();writer.clone_document_from_reader(reader)
for page in writer.pages:
 for ref in page['/Resources']['/Font'].values():
  f=ref.get_object();u=f.get('/ToUnicode')
  if u:
   stream=u.get_object();data=stream.get_data().decode('latin1');data=re.sub(r'<([0-9A-Fa-f]{5,6})>',lambda m:'<'+chr(int(m.group(1),16)).encode('utf-16-be').hex().upper()+'>',data);stream.set_data(data.encode('latin1'))
writer.write(p)
img=Image.new('RGB',(1500,1900),'white');d=ImageDraw.Draw(img);font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',40)
for i,t in enumerate(['SYNTHETIC SCAN FIXTURE','The intervention did not improve survival.','The hazard ratio was 1.42.','The evidence remains uncertain.']):d.text((60,100+i*95),t,font=font,fill='black')
c=begin('scan.pdf','Image-only page');c.drawImage(ImageReader(img),0,0,width=595,height=842);c.save()
r=PdfReader(ROOT/'digital-en.pdf');w=PdfWriter();w.append_pages_from_reader(r);w.add_metadata({'/Title':'CP18 SYNTHETIC FIXTURE: password protected'});w.encrypt('cp18-test-password');w.write(ROOT/'password.pdf')
c=begin('dense.pdf','Dense but bounded source page');c.setFont('Fixture',3)
for row in range(100):
 for col in range(40):c.drawString(20+col*14,810-row*7,'x')
c.save()
(ROOT/'corrupt.pdf').write_bytes(b'%PDF-1.7\nSYNTHETIC invalid PDF with no objects or trailer\n')
shutil.copyfile(Path(__file__).resolve().parent.parent/'audit_produk/repros/mixed-digital-500-scan.pdf',ROOT/'mixed-digital-500-scan.pdf')
records=[]
for p in sorted(ROOT.glob('*.pdf')):records.append({'file':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'origin':'provided synthetic audit fixture' if p.name.startswith('mixed') else 'CP18 synthetic regression fixture','historical_user_pdf':False})
(ROOT/'MANIFEST.json').write_text(json.dumps({'license':'CC0 text and test design; embedded DejaVu fonts retain font license','password':'cp18-test-password (public test fixture only)','files':records},indent=2))
print(json.dumps(records,indent=2))
