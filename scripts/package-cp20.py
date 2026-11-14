"""Package only verified release assets and the reproducible CP20 source/QA tree.
Run after all writers and acceptance reporting have finished. No network required.
"""
from pathlib import Path
import argparse, hashlib, json, zipfile

root=Path(__file__).resolve().parent.parent
p=argparse.ArgumentParser();p.add_argument('--output',default=str(root.parent/'deliverables'));args=p.parse_args()
out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
build=json.loads((root/'evidence/build/BUILD_MANIFEST.json').read_text())
accept=json.loads((root/'RELEASE_ACCEPTANCE_CP20.json').read_text())
assert accept['build']['sourceHash']==build['build']['sourceHash'],'Acceptance must identify current packaged build'
assert accept.get('productionReady') is False,'This checkpoint packager does not authorize a production label'
suffix='_CHECKPOINT_NOT_PRODUCTION_READY'
deploy=out/('SEMANTIK_SETARA_CP20_PDF_TRANSLATOR_DEPLOY'+suffix+'.zip')
source=out/('SEMANTIK_SETARA_CP20_SOURCE_AND_QA'+suffix+'.zip')
with zipfile.ZipFile(deploy,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for row in build['files']:
  content=(root/'dist'/row['path']).read_bytes()
  assert len(content)==row['bytes'] and sha(content)==row['sha256'],row['path']
  z.writestr(row['path'],content)
excluded_dirs={'node_modules','dist','.openai','__pycache__','.git','experiments'}
manifest=[]
with zipfile.ZipFile(source,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for path in sorted(root.rglob('*')):
  rel=path.relative_to(root)
  if not path.is_file() or any(x in excluded_dirs for x in rel.parts):continue
  # Alternative-model experiments are reproducible research, not the product.
  # Retain their pinned downloader, lockfile, provenance and actual results;
  # omit unselected weights and package-manager tarball caches.
  if rel.parts[0]=='experiments' and ('model' in rel.parts or path.suffix=='.tgz'):continue
  if path.name in {'SOURCE_MANIFEST_CP20.json','SOURCE_SHA256SUMS_CP20.txt'}:continue
  if 'temporary-worker-' in path.name or 'capacity-layout-worker-' in path.name:continue
  # The 100MiB inert byte-boundary PDF is exactly reproducible and has no content
  # value; include its generator + measured SHA instead of duplicating zeros.
  if 'byte-fixture' in rel.parts and path.suffix=='.pdf':continue
  content=path.read_bytes();name='cp20/'+rel.as_posix();z.writestr(name,content)
  manifest.append({'path':name,'bytes':len(content),'sha256':sha(content)})
 z.writestr('SOURCE_MANIFEST_CP20.json',json.dumps({'status':'CHECKPOINT_NOT_PRODUCTION_READY','build':build['build'],'files':manifest},indent=2)+'\n')
 z.writestr('SOURCE_SHA256SUMS_CP20.txt','\n'.join(x['sha256']+'  '+x['path'] for x in manifest)+'\n')
receipts=[]
for path in [deploy,source]:
 with zipfile.ZipFile(path) as z:assert z.testzip() is None
 receipts.append({'filename':path.name,'bytes':path.stat().st_size,'sha256':hashlib.file_digest(path.open('rb'),'sha256').hexdigest(),'entries':len(zipfile.ZipFile(path).namelist())})
(out/'ARTIFACT_MANIFEST_CP20.json').write_text(json.dumps({'build':build['build'],'productionReady':False,'artifacts':receipts},indent=2)+'\n')
print(json.dumps(receipts,indent=2))
