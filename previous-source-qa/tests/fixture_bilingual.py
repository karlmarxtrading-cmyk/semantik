"""One synthetic Indonesian article with an English abstract."""
from pathlib import Path
import json,hashlib
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

def create(out):
    out=Path(out);out.mkdir(exist_ok=True)
    if 'FixtureSans' not in pdfmetrics.getRegisteredFontNames():
        pdfmetrics.registerFont(TTFont('FixtureSans','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
    path=out/'bilingual-text.pdf'
    c=canvas.Canvas(str(path),pagesize=A4,invariant=1)
    c.setTitle('Penelitian Pendidikan dengan Abstrak Inggris');c.setAuthor('SEMANTIK SETARA synthetic QA')
    def line(text,y,size=11):c.setFont('FixtureSans',size);c.drawString(52,y,text)
    line('Penelitian Pendidikan di Indonesia',790,17)
    line('Pendahuluan',745,13)
    body=['Penelitian ini dilakukan untuk memahami pendidikan dan kesehatan.',
          'Metode yang digunakan dalam penelitian ini adalah survei.',
          'Hasil penelitian ini menunjukkan bahwa pendidikan dapat membantu',
          'masyarakat dalam menjaga kesehatan dan memahami informasi.',
          'Data ini dianalisis dengan metode yang sesuai untuk penelitian.']
    for i,text in enumerate(body):line(text,720-i*17)
    line('Abstract',595,13)
    line('This study examines education and health.',570)
    line('The sample mean was 12.5.',553)
    line('Metode',490,13)
    for i,text in enumerate(['Data penelitian ini dikumpulkan dengan metode survei.',
       'Penelitian ini menggunakan data yang sesuai dengan tujuan penelitian.',
       'Hasil yang diperoleh dalam penelitian ini dapat digunakan untuk kajian.']):line(text,465-i*17)
    c.save();data=path.read_bytes()
    return {'purpose':'English abstract must translate within mostly Indonesian PDF; Indonesian body stays unchanged',
      'pages':1,'contains':['12.5'],'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}

if __name__=='__main__':
    folder=Path(__file__).resolve().parent/'fixtures';entry=create(folder)
    manifest_path=folder/'manifest.json';manifest=json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    manifest['bilingual-text.pdf']=entry;manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
    print(json.dumps(entry,indent=2))
