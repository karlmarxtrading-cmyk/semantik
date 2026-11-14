"""Reproducible static assembly for CP22 (Claude continuation of CP21).
No network or model conversion. Model provenance is retained separately.
"""
from pathlib import Path
import argparse,hashlib,json,re,shutil
ROOT=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output',type=Path,default=ROOT/'dist')
parser.add_argument('--evidence-dir',type=Path,default=ROOT/'evidence/build')
parser.add_argument('--retain-from',type=Path,help='Verified prior deploy directory; retain immutable /r namespaces for active tabs')
args=parser.parse_args()
SRC=ROOT/'app';DST=args.output.resolve()
retained_source=args.retain_from.resolve() if args.retain_from else None
if retained_source and (retained_source==DST or retained_source.is_relative_to(DST)):
 raise ValueError('Previous deploy must not be inside cleaned output')
# Never permit the clean-build operation to erase source or its ancestors.
if DST==ROOT or ROOT.is_relative_to(DST) or DST==SRC or DST.is_relative_to(SRC):
 raise ValueError('Output must not overlap the source tree')
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
build={'release':'cp22-'+rid,'version':'0.22.0','sourceHash':source_hash,'modelHashes':models,'base':base}
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
 if not p.is_file() or p.name=='_headers' or '/models/' in str(p):continue
 files.append({'path':'/'+p.relative_to(DST).as_posix(),'size':p.stat().st_size,'sha256':sha(p.read_bytes())})
cache='semantik-pdf-'+build['release']
manifest={'schema':2,'release':build,'base':base,'cache':cache,'files':files}
mp=release/'offline-assets.json';mp.write_text(json.dumps(manifest,sort_keys=True,indent=2)+'\n')
files=files+[{'path':base+'offline-assets.json','size':mp.stat().st_size,'sha256':sha(mp.read_bytes())}]
shell=['/index.html']+[base+x for x in ['app/styles.css','app/main.js','app/storage.js','app/build-info.js','icon.svg','manifest.webmanifest']]
config={'cache':cache,'base':base,'files':files,'shell':shell}
(DST/'sw.js').write_text((ROOT/'scripts/sw-template.js').read_text().replace('__CONFIG__',json.dumps(config,separators=(',',':'))))
retained=[]
if retained_source:
 previous_root=retained_source/'r'
 if not previous_root.is_dir():raise ValueError('Previous deploy has no immutable release directory')
 for previous in sorted(previous_root.iterdir()):
  if previous.is_symlink() or not previous.is_dir() or not re.fullmatch('[a-f0-9]{16}',previous.name):
   raise ValueError('Unexpected prior release namespace')
  old_manifest=json.loads((previous/'offline-assets.json').read_text())
  if old_manifest.get('base')!=f'/r/{previous.name}/' or old_manifest.get('release',{}).get('sourceHash','')[:16]!=previous.name:
   raise ValueError('Prior release identity does not match directory')
  for record in old_manifest['files']:
   if record['path']=='/index.html':continue
   old_path=retained_source/record['path'].lstrip('/')
   if not old_path.resolve().is_relative_to(previous.resolve()) or old_path.is_symlink():raise ValueError('Invalid prior asset path')
   data=old_path.read_bytes()
   if len(data)!=record['size'] or sha(data)!=record['sha256']:raise ValueError('Prior asset integrity failed: '+record['path'])
  entries=[]
  for item in sorted(previous.rglob('*')):
   if item.is_symlink():raise ValueError('Prior release must not contain symbolic links')
   if not item.is_file():continue
   rel=item.relative_to(retained_source);target=DST/rel;data=item.read_bytes()
   if target.exists():
    if target.read_bytes()!=data:raise ValueError('Immutable namespace collision: '+str(rel))
   else:target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
   entries.append({'path':rel.as_posix(),'bytes':len(data),'sha256':sha(data)})
  retained.append({'base':f'/r/{previous.name}/','files':len(entries),'bytes':sum(x['bytes'] for x in entries),'inventorySha256':sha(json.dumps(entries,sort_keys=True,separators=(',',':')).encode())})
allfiles=[{'path':str(p.relative_to(DST)),'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())} for p in sorted(DST.rglob('*')) if p.is_file()]
e=args.evidence_dir.resolve();e.mkdir(parents=True,exist_ok=True)
(e/'SOURCE_MANIFEST.json').write_text(json.dumps(identity,indent=2)+'\n')
(e/'BUILD_MANIFEST.json').write_text(json.dumps({'build':build,'retainedReleases':retained,'files':allfiles},indent=2)+'\n')
print(json.dumps({'build':build,'files':len(allfiles),'bytes':sum(x['bytes'] for x in allfiles),'maxAssetBytes':max(x['bytes'] for x in allfiles),'retainedReleases':retained},indent=2))
