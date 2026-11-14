from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
pdfmetrics.registerFont(TTFont('Fixture','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('FixtureBold','/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
p=Path(__file__).resolve().parent/'fixtures/cp20-reference-midbook.pdf'
c=canvas.Canvas(str(p),pagesize=(595,842),invariant=1);c.setTitle('CP20 references and arbitrary section headings regression')
def page(title,lines):
 y=790
 if title:c.setFont('FixtureBold',18);c.drawString(40,y,title);y-=45
 c.setFont('Fixture',11)
 for text in lines:c.drawString(40,y,text);y-=30
 c.showPage()
page('References',['Smith, A. (2024). A study of local methods. Journal 12, 34-56.'])
page('Unexpected Horizons',['A new experiment examines changes in pressure and volume.','1. Record the initial temperature.','2. Measure the final pressure.','• Compare the two observations.'])
page('References',['Jones, B. (2023). Statistical methods. Scientific Review 4, 12-18.'])
page(None,['Brown, C. (2022). Further experiments. Research Quarterly 8, 10-20.'])
page('Boundary Layers',['This ordinary paragraph belongs to the next section.'])
c.save();print(p)
