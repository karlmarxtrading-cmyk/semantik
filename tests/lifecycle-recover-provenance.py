from pathlib import Path,PurePosixPath
import zipfile,hashlib,json,stat
root=Path('cp18/provenance-input');out=Path('cp18/model-provenance-source');evidence=Path('cp18/evidence/provenance');evidence.mkdir(parents=True,exist_ok=True)
paths=[root/'SEMANTIK_SETARA_CP16_RECOVERY_CHECKPOINT.zip',root/'baseline/SEMANTIK_SETARA_CP15_CHECKPOINT.zip',root/'cp15/baseline/CP14_RECOVERY_LATEST.zip',root/'stage1.zip',root/'cp13.zip']
archives=[zipfile.ZipFile(p)for p in paths];receipts=[]
for p,z in zip(paths,archives):
 for i in z.infolist():
  q=PurePosixPath(i.filename);assert not q.is_absolute()and'..'not in q.parts and'\\'not in i.filename and not stat.S_ISLNK(i.external_attr>>16)
 assert len(z.namelist())==len(set(z.namelist()));assert z.testzip()is None
 receipts.append({'path':p.name,'bytes':p.stat().st_size,'sha256':hashlib.file_digest(p.open('rb'),'sha256').hexdigest(),'crc':'PASS','safePaths':True})
rows=json.loads(archives[0].read('WORKSPACE_MANIFEST.json'))['files'];lookup={r['path']:r for r in rows}
def recover(row):
 name=row['path'];candidates=[]
 if 'blob'in row:candidates.append((0,row['blob']))
 else:
  for k in range(1,len(archives)):
   for n in ['overlay/app/'+name,'app/'+name]:
    if n in archives[k].namelist():candidates.append((k,n))
 for k,n in candidates:
  data=archives[k].read(n)
  if len(data)==row['bytes']and hashlib.sha256(data).hexdigest()==row['sha256']:return data,k,n
 raise RuntimeError('canonical row missing '+name)
selected=[r for r in rows if r['path'].startswith(('docs/engine/','scripts/model-conversion/','src/'))or r['path'] in ['package.json','package-lock.json','vite.config.ts','tsconfig.json','tsconfig.node.json','tsconfig.app.json']]
recovered=[]
for r in selected:
 data,k,n=recover(r);p=out/r['path'];p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data);recovered.append({**r,'archive':paths[k].name,'member':n,'verified':True})
comparisons=[]
for p in Path('cp18/baseline/models').rglob('*'):
 if not p.is_file():continue
 name='dist/'+p.relative_to('cp18/baseline').as_posix();r=lookup.get(name)
 if not r:comparisons.append({'cp17Path':str(p.relative_to('cp18/baseline')),'match':False,'reason':'not in CP16 canonical manifest'});continue
 data,k,n=recover(r);sha=hashlib.sha256(data).hexdigest();actual=hashlib.file_digest(p.open('rb'),'sha256').hexdigest();comparisons.append({'cp17Path':str(p.relative_to('cp18/baseline')),'cp16Member':n,'cp16Archive':paths[k].name,'sha256':sha,'cp17Sha256':actual,'match':sha==actual,'bytesCompared':len(data)})
workerRows=[r for r in rows if r['path'].startswith('dist/assets/engine.worker')and r['path'].endswith('.js')]
worker=[]
for r in workerRows:
 data,k,n=recover(r);p=out/'dist-reference'/Path(r['path']).name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data);worker.append({'cp16Path':r['path'],'sha256':hashlib.sha256(data).hexdigest(),'file':str(p),'archive':paths[k].name,'member':n})
report={'libraryFileId':'libfile_fde3_f-18e7493a0e148191909aaffaa8677eab_6a790e7c218c81918b962131f5a46ccd','archives':receipts,'recoveredSourceFiles':recovered,'modelComparisons':comparisons,'allCp17ModelFilesMatchActualCp16Bytes':all(r['match']for r in comparisons),'modelFileCount':len(comparisons),'workers':worker,'scope':'historical source/provenance recovery only; not replacement baseline; parity results are recovered historical evidence, not new conversion run'}
(evidence/'RECOVERY_PROVENANCE.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'filesRecovered':len(recovered),'models':len(comparisons),'allModelsMatch':report['allCp17ModelFilesMatchActualCp16Bytes'],'workers':worker},indent=2))
