"""Independent reference OCR preparation only; not app/browser OCR acceptance."""
from pathlib import Path
import gzip, fitz, subprocess, tempfile, json, hashlib
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'evidence/acceptance'
SOURCE=BASE/'journals/JOURNAL-05-replacement.pdf'
OUT=BASE/'journals/scan-ocr'
OUT.mkdir(exist_ok=True)
rows=[]
with tempfile.TemporaryDirectory(prefix='cp18-reference-tessdata-') as tmp:
    td=Path(tmp)
    for lang in ['eng','ind']:
        p=ROOT/'app/vendor/ocr'/(lang+'.traineddata.gz')
        (td/(lang+'.traineddata')).write_bytes(gzip.decompress(p.read_bytes()))
    with fitz.open(SOURCE) as doc:
        for index,page in enumerate(doc,1):
            image=OUT/f'page-{index:02d}.png';page.get_pixmap(matrix=fitz.Matrix(2,2)).save(image)
            dest=OUT/f'page-{index:02d}'
            r=subprocess.run(['tesseract',str(image),str(dest),'--tessdata-dir',str(td),'-l','ind+eng','--psm','3','txt','tsv'],capture_output=True,text=True,check=True)
            rows.append({'page':index,'returncode':r.returncode,'imageSha256':hashlib.sha256(image.read_bytes()).hexdigest(),'textChars':len(dest.with_suffix('.txt').read_text()),'stderr':r.stderr})
report={'method':'Native Tesseract CLI5 + pinned bundled tessdata_fast; reference-extraction preparation only, NOT CP18 browser OCR test.',
        'version':subprocess.check_output(['tesseract','--version'],text=True),'sourceSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'pages':rows}
(BASE/'JOURNAL_SCAN_OCR_RECEIPT.json').write_text(json.dumps(report,indent=2))
print(json.dumps({'pages':len(rows),'scope':'REFERENCE_OCR_NOT_APP_TEST'}))
