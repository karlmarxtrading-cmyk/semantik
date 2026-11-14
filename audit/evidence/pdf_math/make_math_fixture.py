from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

base=Path(__file__).resolve().parent
pdfmetrics.registerFont(TTFont('MathSans','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('MathBold','/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
c=canvas.Canvas(str(base/'mathematics_fixture.pdf'),pagesize=(595,842))
c.setTitle('Scientific mathematics regression fixture')
def text(x,y,s,size=14,font='MathSans'):
    c.setFont(font,size);c.drawString(x,y,s)
text(44,800,'Scientific mathematics regression fixture',17,'MathBold')
text(44,776,'Purpose: verify exact mathematical structure in a PDF-to-Markdown pipeline.',10)
text(44,750,'These examples are synthetic tests, not a journal-quality evaluation corpus.',10)
text(44,711,'1. Power and subscript',11,'MathBold')
text(64,681,'y = x',18);text(115,690,'2',11)
text(245,681,'z = a',18);text(297,675,'i',11)
text(44,626,'2. Stacked fraction',11,'MathBold')
text(64,590,'f(x) =',18)
text(144,602,'x + 1',16);c.setLineWidth(.8);c.line(140,594,193,594);text(144,576,'x − 1',16)
text(44,526,'3. Definite integral',11,'MathBold')
text(64,476,'∫',36);text(79,509,'1',10);text(75,468,'0',10)
text(94,484,'x',18);text(105,492,'2',11);text(120,484,'dx =',18)
text(178,495,'1',15);c.line(174,488,193,488);text(178,472,'3',15)
text(44,420,'4. Matrix',11,'MathBold')
text(64,365,'A =',18)
c.setLineWidth(1)
c.lines([(116,392,110,392),(110,392,110,346),(110,346,116,346),(174,392,180,392),(180,392,180,346),(180,346,174,346)])
text(122,376,'1',17);text(154,376,'2',17);text(122,351,'3',17);text(154,351,'4',17)
text(44,300,'5. Named mathematical functions',11,'MathBold')
text(64,265,'y = sin(x) + log(x)',18)
text(44,212,'6. Strict and non-strict inequalities',11,'MathBold')
text(64,178,'|x − 4| < 1',18);text(280,178,'|x − 4| ≤ 1',18)
text(44,99,'Expected structure: y=x²; z=aᵢ; f(x)=(x+1)/(x−1); integral from 0 to 1 of x² dx=1/3;',10)
text(44,82,'A is the two-by-two matrix with rows (1,2) and (3,4). Parentheses and symbols matter.',10)
c.save()
print(base/'mathematics_fixture.pdf')
