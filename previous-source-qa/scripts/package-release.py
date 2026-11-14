"""Package deploy + reproducible source/QA without duplicate model/vendor bytes."""
from pathlib import Path
import hashlib,json,zipfile,datetime

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT.parent/'deliverables'
OUT.mkdir(exist_ok=True)
DEPLOY_DIRS={'app','assets','vendor','models','runtime','licenses'}
DEPLOY_FILES={'index.html','_headers','sw.js','offline-assets.json','manifest.webmanifest','icon.svg','MODEL_NOTICE.txt','README.md'}
SOURCE_DIRS={'app','tests','scripts','evidence','docs'}
SOURCE_FILES={'index.html','_headers','sw.js','offline-assets.json','manifest.webmanifest','icon.svg','MODEL_NOTICE.txt','README.md'}
def selected(path,dirs,files):
    rel=path.relative_to(ROOT)
    return path.is_file() and '__pycache__' not in rel.parts and path.suffix not in {'.pyc','.log'} and (rel.parts[0] in dirs or rel.as_posix() in files)
deploy=sorted(p for p in ROOT.rglob('*') if selected(p,DEPLOY_DIRS,DEPLOY_FILES))
for p in deploy:
    if p.stat().st_size>25*1024*1024:raise ValueError('Asset exceeds Cloudflare Pages limit: '+str(p))
inventory=[{'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in deploy]
(ROOT/'evidence/deploy-inventory.json').write_text(json.dumps(inventory,indent=2)+'\n')
source=sorted(p for p in ROOT.rglob('*') if selected(p,SOURCE_DIRS,SOURCE_FILES) and p.name not in {'http-requests.ndjson','ui-server.log'} and 'renders' not in p.parts)
def build(name,paths):
    target=OUT/name
    with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
        for p in paths:
            info=zipfile.ZipInfo(p.relative_to(ROOT).as_posix(),date_time=(2026,11,12,0,0,0))
            info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16
            archive.writestr(info,p.read_bytes())
    with zipfile.ZipFile(target) as archive:
        bad=archive.testzip()
        if bad:raise ValueError('ZIP CRC failure '+bad)
        for n in archive.namelist():
            if n.startswith('/') or '..' in Path(n).parts:raise ValueError('Unsafe archive path')
    return {'filename':name,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'entries':len(paths),'path':str(target)}
results=[build('SEMANTIK_SETARA_CP17_PDF_ONLY_CLOUDFLARE_PAGES.zip',deploy),build('SEMANTIK_SETARA_CP17_SOURCE_QA.zip',source)]
(OUT/'RECEIPT_CP17_PDF_ONLY.json').write_text(json.dumps({'release':'CP17_PDF_ONLY','client_date':'2026-11-12','archives':results},indent=2)+'\n')
(OUT/'SHA256SUMS_CP17.txt').write_text(''.join(x['sha256']+'  '+x['filename']+'\n' for x in results))
print(json.dumps(results,indent=2))
