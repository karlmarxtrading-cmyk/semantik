"""Package only verified production files; source/QA is a separate recovery ZIP."""
from pathlib import Path
import zipfile,hashlib,json,io
r=Path(__file__).resolve().parent.parent;root=r.parent.parent;out=r.parent/'deliverables';out.mkdir(exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
bm=json.loads((r/'evidence/build/BUILD_MANIFEST.json').read_text());build=bm['build']
def writezip(dest,entries,extra=None):
 assert not dest.exists(),f'Refuse overwrite: {dest}'
 with zipfile.ZipFile(dest,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True) as z:
  for name,path in sorted(entries):
   assert not Path(name).is_absolute() and '..' not in Path(name).parts and not path.is_symlink(),name
   z.write(path,name)
  for name,data in (extra or {}).items():z.writestr(name,data)
 with zipfile.ZipFile(dest) as z:
  assert z.testzip() is None
  assert len(z.namelist())==len(set(z.namelist()))
 return {'filename':dest.name,'bytes':dest.stat().st_size,'sha256':sha(dest.read_bytes()),'files':len(entries)+len(extra or {}),'crc':'PASS'}
entries=[]
for x in bm['files']:
 p=r/'dist'/x['path'];raw=p.read_bytes();assert len(raw)==x['bytes'] and sha(raw)==x['sha256'],x['path'];entries.append((x['path'],p))
assert len(entries)==300
assert not any(any(x in Path(n).parts for x in ['qa','src','tests','evidence','node_modules']) or n.endswith('.zip') for n,p in entries)
deploy=writezip(out/'SEMANTIK_SETARA_CP19_PDF_TRANSLATOR_DEPLOY.zip',entries)
(r/'evidence/cp19/DEPLOY_PACKAGE_RECEIPT.json').write_text(json.dumps({'build':build,'status':'NOT_PRODUCTION_READY',**deploy},indent=2)+'\n')
# Keep exact source, weights, tests, locks, evidence and independent fixtures.
source=[]
for base in [r,r.parent/'audit',r.parent/'research-math']:
 for p in base.rglob('*'):
  if not p.is_file():continue
  rel=p.relative_to(base)
  if any(x in ['node_modules','__pycache__','.openai'] for x in rel.parts) or (base==r and rel.parts[0]=='dist') or p.name.startswith('cp19-temporary-worker-'):continue
  source.append((p.relative_to(root).as_posix(),p))
research=r.parent/'CP19_ENGINE_RESEARCH_EVIDENCE.zip';source.append((research.relative_to(root).as_posix(),research))
for n in ['SAMPLE_EN_TO_ID.md','SAMPLE_ID_TO_EN.md','SAMPLE_MATHEMATICS.md','RELEASE_ACCEPTANCE_CP19.md','RELEASE_ACCEPTANCE_CP19.json','CHANGELOG_CP19.md','DEPLOY_CLOUDFLARE_PAGES.md','ROLLBACK_CP19.md']:
 source.append((n,out/n))
source.append(('RECOVERY_CONTINUATION.md',r/'RECOVERY_CONTINUATION.md'))
manifest={'build':build,'status':'NOT_PRODUCTION_READY','files':[{'path':n,'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())} for n,p in sorted(source)]}
manifestBytes=(json.dumps(manifest,indent=2)+'\n').encode();manifestName='SOURCE_MANIFEST_CP19.json'
sums=''.join(x['sha256']+'  '+x['path']+'\n' for x in manifest['files'])+sha(manifestBytes)+'  '+manifestName+'\n'
src=writezip(out/'SEMANTIK_SETARA_CP19_SOURCE_AND_QA.zip',source,{manifestName:manifestBytes,'SOURCE_SHA256SUMS.txt':sums})
with zipfile.ZipFile(out/src['filename']) as z:
 for line in z.read('SOURCE_SHA256SUMS.txt').decode().splitlines():
  h,n=line.split('  ',1);assert sha(z.read(n))==h,n
 assert json.loads(z.read(manifestName))['build']==build
receipt={'build':build,'status':'NOT_PRODUCTION_READY','artifacts':[deploy,src],'sourceInternalManifest':'PASS','sourceInternalSHA256':'PASS','deploymentPerformed':False}
(out/'PACKAGE_RECEIPT_CP19.json').write_text(json.dumps(receipt,indent=2)+'\n')
checks=[]
for p in sorted(out.iterdir()):
 if not p.is_file() or p.name=='SHA256SUMS.txt' or 'STAGE' in p.name:continue
 checks.append(sha(p.read_bytes())+'  '+p.name+'\n')
(out/'SHA256SUMS.txt').write_text(''.join(checks));print(json.dumps(receipt,indent=2))
