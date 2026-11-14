"""Independent, labeled synthetic PDF geometry controls; not user source PDFs."""
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pathlib import Path
base=Path(__file__).parent
pdfmetrics.registerFont(TTFont('Control','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
c=canvas.Canvas(str(base/'independent-controls.pdf'),pagesize=(650,850))
def t(x,y,s,fs=18):
 c.setFont('Control',fs);c.drawString(x,y,s)
def line(x1,y1,x2,y2):c.setLineWidth(.75);c.line(x1,y1,x2,y2)
# All geometry translated/scaled via CTM to exercise vector transforms.
c.saveState();c.translate(25,60);c.scale(.85,.85)
t(30,860,'Synthetic independent geometry controls',12)
t(40,800,'q = b',20);t(94,810,'3',12);t(95,793,'j',12)
# r = (1/(u+2))/(v-3), a genuinely nested fraction.
t(40,695,'r =',18)
t(124,733,'1',13);line(112,727,155,727);t(114,709,'u + 2',13)
line(105,699,163,699);t(112,678,'v − 3',15)
# Changed-valued definite integral, not copied fixture output.
t(40,570,'∫',38);t(57,605,'4',10);t(52,562,'2',10)
t(73,578,'t',18);t(85,586,'3',11);t(100,578,'dt',18)
# A rectangular 2x3 bracketed matrix with non-digit entries.
t(40,460,'B =',18)
for x,sign in [(95,1),(192,-1)]:
 line(x+sign*6,490,x,490);line(x,490,x,437);line(x,437,x+sign*6,437)
for y,values in [(472,['a','b','c']),(447,['d','e','f'])]:
 for x,v in zip([105,135,165],values):t(x,y,v,17)
t(40,370,"g′(x) = 2x",18)
t(40,320,'S = {x ∈ ℝ : x ≥ 0}',18)
t(40,270,'h = √x',18) # scope has no overbar => explicitly unverified
# Ordinary prose with equals must not become formula region.
t(40,210,'This result is reported with p = 0.05 for the control group.',12)
c.restoreState();c.save()
