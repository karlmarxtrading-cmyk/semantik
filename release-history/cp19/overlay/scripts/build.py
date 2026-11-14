"""Reproducible static assembly of inherited CP17 code and CP18 patches.
No network or model conversion. Model provenance is retained separately.
"""
from pathlib import Path
import hashlib,json,re,shutil
ROOT=Path(__file__).resolve().parent.parent
SRC=ROOT/'app';DST=ROOT/'dist'
sha=lambda b:hashlib.sha256(b).hexdigest()
ignored={'sw.js','offline-assets.json','README.md','app/build-info.js'}
source_files=[p for p in sorted(SRC.rglob('*')) if p.is_file() and str(p.relative_to(SRC)) not in ignored]
identity=[{'path':str(p.relative_to(SRC)),'sha256':sha(p.read_bytes()),'bytes':p.stat().st_size} for p in source_files]
for p in [ROOT/'scripts/build.py',ROOT/'scripts/sw-template.js']:
 identity.append({'path':str(p.relative_to(ROOT)),'sha256':sha(p.read_bytes()),'bytes':p.stat().st_size})
source_hash=sha(json.dumps(identity,sort_keys=True,separators=(',',':')).encode());rid=source_hash[:16];base=f'/r/{rid}/'
if DST.exists():shutil.rmtree(DST)
DST.mkdir();release=DST/'r'/rid;release.mkdir(parents=True)
for p in source_files:
 rel=p.relative_to(SRC)
 if rel.as_posix() in ['index.html','_headers']:continue
 out=release/rel;out.parent.mkdir(parents=True,exist_ok=True);data=p.read_bytes()
 if p.suffix in ['.js','.mjs','.html','.css','.json','.webmanifest']:
  txt=data.decode()
  txt=re.sub(r'(?<=[\'"`(])/((?:app|vendor|assets|runtime|models|licenses)/)',lambda m:base+m[1],txt)
  txt=txt.replace('"/icon.svg"','"'+base+'icon.svg"')
  data=txt.encode()
 out.write_bytes(data)
models={d:json.loads((SRC/'models'/d/'manifest.json').read_text())['fingerprint'] for d in ['id-en','en-id']}
build={'release':'cp19-'+rid,'version':'0.19.0','sourceHash':source_hash,'modelHashes':models,'base':base}
(release/'app/build-info.js').write_text('export const BUILD_INFO = Object.freeze('+json.dumps(build,sort_keys=True)+');\n')
html=(SRC/'index.html').read_text()
for path in ['app/','icon.svg','manifest.webmanifest']:html=html.replace('"/'+path,'"'+base+path)
(DST/'index.html').write_text(html)
headers=(SRC/'_headers').read_text().split('/sw.js')[0]
headers+='\n/\n  Cache-Control: no-cache\n/index.html\n  Cache-Control: no-cache\n/sw.js\n  Content-Type: application/javascript; charset=utf-8\n  Cache-Control: no-cache\n/r/*\n  Cache-Control: public, max-age=31536000, immutable\n'
for ext,mime in [('mjs','application/javascript; charset=utf-8'),('js','application/javascript; charset=utf-8'),('wasm','application/wasm'),('webmanifest','application/manifest+json')]:headers+=f'/r/*.{ext}\n  Content-Type: {mime}\n'
headers+=f'{base}models/*\n  Content-Type: application/octet-stream\n  Content-Encoding: identity\n'
(DST/'_headers').write_text(headers)
files=[]
for p in sorted(DST.rglob('*')):
 if not p.is_file() or p.name=='_headers' or '/models/' in str(p) or '/licenses/' in str(p) or p.name=='MODEL_NOTICE.txt':continue
 files.append({'path':'/'+p.relative_to(DST).as_posix(),'size':p.stat().st_size,'sha256':sha(p.read_bytes())})
cache='semantik-pdf-cp19-'+rid
manifest={'schema':2,'release':build,'base':base,'cache':cache,'files':files}
mp=release/'offline-assets.json';mp.write_text(json.dumps(manifest,sort_keys=True,indent=2)+'\n')
files=files+[{'path':base+'offline-assets.json','size':mp.stat().st_size,'sha256':sha(mp.read_bytes())}]
shell=['/index.html']+[base+x for x in ['app/styles.css','app/main.js','app/storage.js','app/build-info.js','icon.svg','manifest.webmanifest']]
config={'cache':cache,'base':base,'files':files,'shell':shell}
(DST/'sw.js').write_text((ROOT/'scripts/sw-template.js').read_text().replace('__CONFIG__',json.dumps(config,separators=(',',':'))))
allfiles=[{'path':str(p.relative_to(DST)),'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())} for p in sorted(DST.rglob('*')) if p.is_file()]
e=ROOT/'evidence/build';e.mkdir(parents=True,exist_ok=True)
(e/'SOURCE_MANIFEST.json').write_text(json.dumps(identity,indent=2)+'\n')
(e/'BUILD_MANIFEST.json').write_text(json.dumps({'build':build,'files':allfiles},indent=2)+'\n')
print(json.dumps({'build':build,'files':len(allfiles),'bytes':sum(x['bytes'] for x in allfiles),'maxAssetBytes':max(x['bytes'] for x in allfiles)},indent=2))
