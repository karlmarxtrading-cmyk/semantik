"""Bundle the actual CP20 evidence and acceptance without model weights."""
from pathlib import Path
import json,zipfile,shutil,hashlib
r=Path(__file__).resolve().parent.parent
o=r.parent/'deliverables';o.mkdir(exist_ok=True)
docs=['RELEASE_ACCEPTANCE_CP20.md','RELEASE_ACCEPTANCE_CP20.json','AUDIT_CLOSURE_CP20.md','AUDIT_CLOSURE_CP20.json','VERIFICATION_REMAINING_CP20.md','DEPLOY_UPDATE_ROLLBACK_CP20.md','QUALIFICATION_PLAN_CP20.md','CHANGELOG_CP20.md']
name='SEMANTIK_SETARA_CP20_BUKTI_DAN_HASIL_CHECKPOINT_NOT_PRODUCTION_READY.zip'
files=[r/x for x in docs]
for base in ['evidence/cp20','evidence/build','tests/fixtures/cp20-capacity','tests/fixtures/cp20-authentic','review-bilingual']:
 files += [p for p in (r/base).rglob('*') if p.is_file() and not ('byte-fixture' in p.parts and p.suffix=='.pdf')]
files += [r/'tests/fixtures/mathematics.pdf',r/'tests/fixtures/digital-en.pdf',r/'tests/fixtures/digital-id.pdf',r/'tests/cp20-browser-downloads.mjs',r/'scripts/fetch-cp20-authentic.py']
with zipfile.ZipFile(o/name,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in sorted(set(files)):z.write(p,p.relative_to(r))
 z.writestr('BACA_DULU.txt','CHECKPOINT_NOT_PRODUCTION_READY\nMulai dari RELEASE_ACCEPTANCE_CP20.md. Bukti parser, Node, browser, kontrol terisolasi dan historis memiliki lingkup berbeda. Angka translated bukan skor akurasi. Korpus/review AI bukan persetujuan manusia.\nModel/runtime dan seluruh source/tes berada dalam paket SOURCE_AND_QA terpisah. Buku asli tidak didistribusikan ulang; provenance dan fetcher ber-SHA tersedia.\n')
with zipfile.ZipFile(o/name) as z:assert z.testzip() is None
for x in docs:shutil.copy2(r/x,o/x)
manifest=json.loads((o/'ARTIFACT_MANIFEST_CP20.json').read_text())
manifest['artifacts']=[row for row in manifest['artifacts'] if row['filename']!=name]
for p in [o/name]+[o/x for x in docs]:
 row={'filename':p.name,'bytes':p.stat().st_size,'sha256':hashlib.file_digest(p.open('rb'),'sha256').hexdigest()}
 if p.suffix=='.zip':
  with zipfile.ZipFile(p) as z:row['entries']=len(z.namelist())
 manifest['artifacts'].append(row)
manifest['manifestPolicy']='This manifest hashes deliverables other than itself; source/build hash and ZIP hashes are distinct.'
(o/'ARTIFACT_MANIFEST_CP20.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest['artifacts'],indent=2))
