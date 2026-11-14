"""Package a verified recovery candidate without changing application bytes.
Run from any directory: python3 scripts/package-recovery.py /absolute/output
Emergency checkpoint stays separate and unchanged; receipt required in evidence.
"""
from pathlib import Path
import hashlib,json,re,sys,zipfile,time
root=Path(__file__).resolve().parent.parent
out=Path(sys.argv[1]).resolve();out.mkdir(parents=True,exist_ok=True)
def digest(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
def write_json(p,obj):p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
freeze=json.loads((root/'evidence/recovery/acceptance/FREEZE.json').read_text())
for p,h in freeze['files'].items():assert digest(root/p)==h,('changed since acceptance',p)
build=json.loads((root/'evidence/build/BUILD_MANIFEST.json').read_text())
assert build['build']==freeze['build']
for x in build['files']:
 p=root/'dist'/x['path'];assert p.stat().st_size==x['bytes'] and digest(p)==x['sha256'],p
exclude={'dist','node_modules','.openai','.git','__pycache__','experiments'}
def included(p):
 rel=p.relative_to(root)
 return p.is_file() and not p.is_symlink() and not any(x in exclude for x in rel.parts) and 'temporary-worker-' not in p.name and p.name!='RECOVERY_BROWSER_RESULT.jpg' and p.suffix!='.pyc'
# High-confidence credential signatures only. Never print potential secret values.
signatures=[rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',rb'AKIA[0-9A-Z]{16}',rb'gh[pousr]_[A-Za-z0-9]{30,}',rb'sk-proj-[A-Za-z0-9_-]{30,}']
hits=[]
review=json.loads((root/'evidence/recovery/root/CREDENTIAL_SCAN_BINARY_REVIEW.json').read_text())
reviewed={x['file']:x for x in review}
for p in root.rglob('*'):
 if not included(p):continue
 if p.name in {'.env','credentials.json','service-account.json','id_rsa','id_ed25519'}:hits.append(str(p.relative_to(root)))
 if p.stat().st_size<=4*1024**2 and p.suffix.lower() in {'.js','.mjs','.json','.md','.txt','.py','.yml','.yaml','.toml','.html','.css','.sh','.log'}:
  blob=p.read_bytes();rel=str(p.relative_to(root));known=reviewed.get(rel)
  allowed={(x['patternIndex'],x['offset']) for x in known['matches'] if x.get('decodedSignatureAbsent') and x.get('decodedType') in {'WASM','TTF'}} if known and digest(p)==known['sha256'] else set()
  for idx,sig in enumerate(signatures):
   if any((idx,m.start()) not in allowed for m in re.finditer(sig,blob)):hits.append(rel)
assert not hits,('Credential scan requires review; values suppressed',sorted(set(hits)))
write_json(root/'evidence/recovery/root/FINAL_CREDENTIAL_SCAN.json',dict(status='PASS',method='High-confidence key/token signatures and credential filenames; values never emitted; not a full security audit. Exact base64 binary false positives recorded in CREDENTIAL_SCAN_BINARY_REVIEW.json; decoded WASM and parsed TTF bytes contain no matching key signature.',excluded='Development dependencies, preview state, temporary workers, generated screenshot, build directory. Deploy verified separately against exact manifest.'))
sourcefiles=sorted([p for p in root.rglob('*') if included(p)])
qafiles=sorted(set(p for p in sourcefiles if 'evidence'==p.relative_to(root).parts[0] or p.name.startswith('SEMANTIK_SETARA_CP19_') or p.relative_to(root).parts[:3]==('tests','fixtures','recovery')))
receipts=[]
def archive(name,items,manifest_name=None):
 records=[dict(path=arc,bytes=p.stat().st_size,sha256=digest(p)) for p,arc in items]
 dest=out/name
 with zipfile.ZipFile(dest,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True) as z:
  for p,arc in items:z.write(p,arc)
  if manifest_name:z.writestr(manifest_name,json.dumps(dict(status='NOT_PRODUCTION_READY',build=build['build'],files=records,selfExcluded=True),ensure_ascii=False,indent=2)+'\n')
 with zipfile.ZipFile(dest) as z:
  assert z.testzip() is None
  for x in records:assert hashlib.sha256(z.read(x['path'])).hexdigest()==x['sha256'],x['path']
  count=len(z.namelist())
 receipt=dict(filename=name,bytes=dest.stat().st_size,sha256=digest(dest),entries=count,importantFiles=len(records),zipIntegrity='PASS',allFileSHA256='PASS',productionReady=False)
 receipts.append(receipt);print(json.dumps(receipt),flush=True)
archive('SEMANTIK_SETARA_CP19_RECOVERED_SOURCE.zip',[(p,'cp20/'+p.relative_to(root).as_posix()) for p in sourcefiles],'SOURCE_MANIFEST_RECOVERY.json')
archive('SEMANTIK_SETARA_CP19_DEPLOY_CANDIDATE.zip',[(root/'dist'/x['path'],x['path']) for x in build['files']])
archive('SEMANTIK_SETARA_CP19_QA_EVIDENCE.zip',[(p,p.relative_to(root).as_posix()) for p in qafiles],'QA_MANIFEST_RECOVERY.json')
for name in ['SEMANTIK_SETARA_CP19_RECOVERY_REPORT.md','SEMANTIK_SETARA_CP19_CONTINUATION.md']:
 p=out/name;p.write_bytes((root/name).read_bytes());receipts.append(dict(filename=name,bytes=p.stat().st_size,sha256=digest(p)))
emergency=json.loads((root/'evidence/recovery/safety/EMERGENCY_RECOVERY_RECEIPT.json').read_text())
write_json(out/'ARTIFACT_MANIFEST_RECOVERY.json',dict(status='NOT_PRODUCTION_READY',build=build['build'],emergencyCheckpoint=emergency,artifacts=receipts,sourceFiles=len(sourcefiles),qaEvidenceFiles=len(qafiles),deployAssets=len(build['files']),notes=['Emergency checkpoint is delivered separately and unchanged.','Source/QA manifest covers each contained content file, excluding manifest itself.','Deploy is exactly the build manifest assets; its manifest is in source/QA.','Old evidence retains its original execution identity; it is not reclassified as final-build acceptance.','New screenshot excluded from persisted packages; actual JSON and MD downloads are included.']))
print('COMPLETE',flush=True)
