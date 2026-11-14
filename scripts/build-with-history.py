"""Build CP22 retaining verified immutable CP19, CP20 and CP21 namespaces for old tabs.
All source/model bytes are local; unchanged historical files are not duplicated in source.
"""
from pathlib import Path
import argparse,hashlib,json,os,shutil,subprocess,sys,tempfile
ROOT=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output',type=Path,default=ROOT/'dist')
parser.add_argument('--evidence-dir',type=Path,default=ROOT/'evidence/build')
a=parser.parse_args();sha=lambda b:hashlib.sha256(b).hexdigest();proof=[]
with tempfile.TemporaryDirectory(prefix='semantik-history-') as temp:
 prior_dist=None
 for label in ['cp19','cp20','cp21']:
  history=ROOT/'release-history'/label;m=json.loads((history/'manifest.json').read_text());work=Path(temp)/label
  for x in m['files']:
   rel=Path(x['path'])
   if rel.is_absolute() or '..' in rel.parts:raise ValueError('Invalid history path')
   src=(history/'overlay'/rel) if x['storage']=='overlay' else ROOT/rel
   if src.is_symlink():raise ValueError('History symlink')
   data=src.read_bytes()
   if len(data)!=x['bytes'] or sha(data)!=x['sha256']:raise ValueError('History integrity failed: '+str(rel))
   dest=work/rel;dest.parent.mkdir(parents=True,exist_ok=True)
   try:os.link(src,dest)
   except OSError:shutil.copyfile(src,dest)
  cmd=[sys.executable,str(work/'scripts/build.py')]
  if prior_dist:cmd+=['--retain-from',str(prior_dist)]
  subprocess.run(cmd,cwd=work,check=True)
  built=json.loads((work/'evidence/build/BUILD_MANIFEST.json').read_text())
  if built['build']['sourceHash']!=m['sourceHash'] or built['build']['release']!=m['release']:raise ValueError('Historical release identity mismatch')
  proof.append({'build':built['build'],'files':len(built['files']),'historyManifestSHA256':sha((history/'manifest.json').read_bytes())});prior_dist=work/'dist'
 subprocess.run([sys.executable,str(ROOT/'scripts/build.py'),'--output',str(a.output.resolve()),'--evidence-dir',str(a.evidence_dir.resolve()),'--retain-from',str(prior_dist)],cwd=ROOT,check=True)
 a.evidence_dir.mkdir(parents=True,exist_ok=True);(a.evidence_dir/'RETAINED_RECONSTRUCTION.json').write_text(json.dumps({'method':'Exact local historical manifests verified, original builders executed, both original releases matched.','retained':proof},indent=2)+'\n')
