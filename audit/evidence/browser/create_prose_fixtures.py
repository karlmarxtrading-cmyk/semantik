from pathlib import Path
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib import colors
from xml.sax.saxutils import escape
import json

OUT=Path(__file__).resolve().parent
pdfmetrics.registerFont(TTFont('FixtureSans','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('FixtureSansBold','/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='BodyFixture',fontName='FixtureSans',fontSize=10.5,leading=16,spaceAfter=10))
styles.add(ParagraphStyle(name='HeadingFixture',fontName='FixtureSansBold',fontSize=12,leading=18,spaceBefore=12,spaceAfter=7,textColor=colors.HexColor('#204c40')))
fixtures={
 'en':[
  ('Abstract','We examined the association between fine particulate matter exposure and hospital admissions. This observational study does not establish a causal relationship.'),
  ('Methods','The primary endpoint was time to disease progression. The trial failed to demonstrate non-inferiority.'),
  ('Results','Group A received 10 mg, whereas group B received 20 mg. The effect was not statistically significant (p = 0.08).'),
  ('Mathematics','Given f(x)=x², the derivative is f′(x)=2x.'),
  ('','The estimator is unbiased only if both conditions hold.'),
  ('Conclusion','Absence of evidence is not evidence of absence.')],
 'id':[
  ('Abstrak','Kami meneliti hubungan antara paparan partikulat halus dan rawat inap. Penelitian observasional ini tidak membuktikan hubungan sebab akibat.'),
  ('Metode','Luaran utama adalah waktu hingga progresi penyakit. Uji ini gagal membuktikan non-inferioritas.'),
  ('Hasil','Kelompok A menerima 10 mg, sedangkan kelompok B menerima 20 mg. Efek tersebut tidak signifikan secara statistik (p = 0.08).'),
  ('Matematika','Diberikan f(x)=x², turunannya adalah f′(x)=2x.'),
  ('','Penduga tidak bias hanya jika kedua syarat terpenuhi.'),
  ('Kesimpulan','Ketiadaan bukti bukanlah bukti ketiadaan.')]
}
for language,sections in fixtures.items():
 path=OUT/f'academic_prose_{language}.pdf'
 doc=SimpleDocTemplate(str(path),pagesize=(595.28,841.89),leftMargin=48,rightMargin=48,topMargin=44,bottomMargin=44,title=f'Controlled academic prose fixture ({language})',author='Independent CP18 audit')
 story=[Paragraph(f'Controlled academic prose fixture ({language})',styles['HeadingFixture']),Paragraph('Synthetic audit input. Not a published study or medical guidance.',styles['BodyFixture']),Spacer(1,8)]
 for heading,text in sections:
  if heading:story.append(Paragraph(escape(heading),styles['HeadingFixture']))
  story.append(Paragraph(escape(text),styles['BodyFixture']))
 doc.build(story)
(OUT/'prose_fixture_expected.json').write_text(json.dumps(fixtures,ensure_ascii=False,indent=2))
print('Created academic_prose_en.pdf and academic_prose_id.pdf')
