"""Deterministic labeled PDF rendering of the frozen synthetic holdout (not original user PDFs)."""
from pathlib import Path
from io import BytesIO
import json, hashlib
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'evidence/acceptance'
OUT=BASE/'fixtures';OUT.mkdir(exist_ok=True)
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
pdfmetrics.registerFont(TTFont('FixtureSans',FONT))
corpus=json.loads((BASE/'G7_HOLDOUT_CORPUS.json').read_text())
W,H=595,842

def wrap(text,width,size=11):
    lines=[];line=''
    for word in text.split():
        candidate=(line+' '+word).strip()
        if line and pdfmetrics.stringWidth(candidate,'FixtureSans',size)>width:
            lines.append(line);line=word
        else:line=candidate
    if line:lines.append(line)
    return lines

def text(c,text,x,y,width=499,size=11):
    c.setFont('FixtureSans',size)
    for line in wrap(text,width,size):c.drawString(x,y,line);y-=17
    return y-18

def raster(rows,width=1000):
    im=Image.new('RGB',(width,620),'white');d=ImageDraw.Draw(im);f=ImageFont.truetype(FONT,24)
    y=25
    for row in rows:
        line=''
        for word in row.split():
            test=(line+' '+word).strip()
            if line and d.textlength(test,font=f)>width-50:d.text((25,y),line,font=f,fill='black');y+=40;line=word
            else:line=test
        d.text((25,y),line,font=f,fill='black');y+=65
    return im

receipt=[]
for doc in corpus['documents']:
    p=OUT/(doc['documentId']+'.pdf')
    c=canvas.Canvas(str(p),pagesize=(W,H),invariant=1,pageCompression=1)
    c.setTitle('SYNTHETIC CP18 HOLDOUT — '+doc['documentId'])
    c.setAuthor('CP18 task-created AI fixture; human reference unreviewed')
    c.setSubject('Test-only; NOT a historical user PDF or real journal article')
    y=text(c,'SYNTHETIC TEST FIXTURE — '+doc['documentId'],48,795,size=12)
    y=text(c,'Not a real journal. Source sentences are AI-authored test data.',48,y,size=9)
    rows=[s['source'] for s in doc['segments']]
    if doc['structure']=='scan':
        im=raster(rows);c.drawImage(ImageReader(im),48,330,width=499,height=310)
    elif doc['structure']=='mixed':
        for row in rows[:2]:y=text(c,row,48,y)
        im=raster(rows[2:]);c.drawImage(ImageReader(im),48,200,width=499,height=310)
    elif doc['structure']=='two-column':
        for column in range(2):
            cy=y
            for row in rows[column*2:column*2+2]:cy=text(c,row,48+column*260,cy,230)
    elif doc['structure']=='table':
        cy=y
        for i,row in enumerate(rows,1):
            lines=wrap(row,440,11);height=max(55,len(lines)*17+20)
            c.rect(48,cy-height,499,height);c.line(80,cy,80,cy-height)
            text(c,str(i),57,cy-20,20)
            text(c,row,90,cy-20,440);cy-=height
    else:
        for row in rows:y=text(c,row,48,y)
    text(c,'Local fixture only | Human scientific review: UNREVIEWED',48,45,size=8)
    c.save()
    receipt.append({'path':str(p.relative_to(ROOT)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),
                    'documentId':doc['documentId'],'expectedSourceSegmentIds':[s['id'] for s in doc['segments']],
                    'structure':doc['structure'],'origin':'AI_AUTHORED_SYNTHETIC_FIXTURE'})
(BASE/'FIXTURE_MANIFEST.json').write_text(json.dumps({'corpusSha256':hashlib.sha256((BASE/'G7_HOLDOUT_CORPUS.json').read_bytes()).hexdigest(),'files':receipt},indent=2))
print(json.dumps({'fixtures':len(receipt),'manifest':str(BASE/'FIXTURE_MANIFEST.json')}))
