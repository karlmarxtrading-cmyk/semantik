"""Create clean deploy and recoverable source/evidence packages, with full CRC verification."""
from pathlib import Path
import zipfile,json,hashlib,datetime,sys
r=Path(__file__).resolve().parent.parent;o=r/'deliverables';o.mkdir(exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def package(path,files,manifest=False):
 records=[]
 with zipfile.ZipFile(path,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True) as z:
  for name,p in sorted(files):
   assert not p.is_symlink(),str(p)
   data=p.read_bytes();rec={'path':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()};records.append(rec)
   i=zipfile.ZipInfo(name,date_time=(2026,11,12,0,0,0));i.compress_type=zipfile.ZIP_DEFLATED;i.external_attr=0o100644<<16;z.writestr(i,data)
  if manifest:z.writestr('PACKAGE_MANIFEST_SHA256.json',json.dumps({'files':records,'selfExcluded':True},indent=2)+'\n')
 with zipfile.ZipFile(path) as z:
  assert z.testzip() is None
  for x in records:assert hashlib.sha256(z.read(x['path'])).hexdigest()==x['sha256']
  count=len(z.infolist())
 return {'filename':path.name,'bytes':path.stat().st_size,'files':count,'sha256':sha(path),'crc':'PASS','allEntryHashes':'PASS'}
manifest=json.loads((r/'evidence/build/BUILD_MANIFEST.json').read_text())
deploy=[(x['path'],r/'dist'/x['path']) for x in manifest['files']]
for x in manifest['files']:assert sha(r/'dist'/x['path'])==x['sha256']
receipts=[package(o/'SEMANTIK_SETARA_CP18_CANDIDATE_NOT_PRODUCTION_READY.zip',deploy)]
# Keep original checkpoint, active code, necessary assets and all evidence. Omit bulky
# recovery inputs, credentials, dependency installs, QA staging copies and recursive ZIPs.
include=['app','dist','scripts','tests','tools','evidence','audit_produk','audit_hasil','model-provenance-source','previous-source-qa','instructions']
files=[]
for folder in include:
 for p in (r/folder).rglob('*'):
  if not p.is_file():continue
  rel=p.relative_to(r);parts=rel.parts
  if 'node_modules' in parts or '__pycache__' in parts or (parts[:2]==('dist','qa')) or p.name.endswith('-temporary-worker.mjs'):continue
  files.append((rel.as_posix(),p))
for name in ['README.md','DEPLOY_AND_ROLLBACK_CP18.md','CHANGELOG_CP18.md','RELEASE_ACCEPTANCE_CP18.json','NEXT_ACTIONS.json','RECOVERY_CONTINUATION.md']:
 files.append((name,r/name))
# Exact original worker is required to reproduce the two ordered patch scripts.
files.append(('baseline/assets/engine.worker-4c3dcfee.js',r/'baseline/assets/engine.worker-4c3dcfee.js'))
receipts.append(package(o/'SEMANTIK_SETARA_CP18_SOURCE_AND_EVIDENCE.zip',files,True))
(o/'PACKAGE_RECEIPTS_CP18.json').write_text(json.dumps({'build':manifest['build'],'packages':receipts},indent=2)+'\n')
(o/'SHA256SUMS_CP18.txt').write_text(''.join(x['sha256']+'  '+x['filename']+'\n' for x in receipts))
print(json.dumps(receipts,indent=2))
