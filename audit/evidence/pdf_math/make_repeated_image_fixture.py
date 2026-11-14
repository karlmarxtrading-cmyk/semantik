from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
import io

base=Path(__file__).resolve().parent
im=Image.new('RGB',(900,100),'white')
d=ImageDraw.Draw(im);font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',30)
d.text((8,28),'Critical image-only result: Group A had 10 events.',fill='black',font=font)
b=io.BytesIO();im.save(b,'PNG');b.seek(0)
c=canvas.Canvas(str(base/'repeated_images_fixture.pdf'),pagesize=(595,842))
c.setTitle('Repeated raster text coverage fixture')
c.setFont('Helvetica',10)
c.drawString(40,810,'A synthetic digital header; the actual critical result is present only inside the raster strips below.')
for j in range(10):
    c.drawImage(ImageReader(b),40,725-j*65,width=510,height=56)
c.save()
print(base/'repeated_images_fixture.pdf')
