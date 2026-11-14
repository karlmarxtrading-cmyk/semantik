from pathlib import Path
import json,zipfile,io,hashlib,re
r=Path(__file__).resolve().parent.parent;e=r/'evidence/browser';out=e/'fresh-exports';out.mkdir(exist_ok=True);results=[]
outer=zipfile.ZipFile(e/'CP18_FINAL_BROWSER_EXPORTS.zip');assert outer.testzip() is None
for name in outer.namelist():
 if not name.endswith('.zip'):continue
 z=zipfile.ZipFile(io.BytesIO(outer.read(name)));assert z.testzip() is None
 dest=out/name[:-4];dest.mkdir(exist_ok=True)
 for n in z.namelist():
  assert not n.startswith('/') and '..' not in Path(n).parts
  if not n.endswith('/'):(dest/n).parent.mkdir(exist_ok=True,parents=True);(dest/n).write_bytes(z.read(n))
 for line in z.read('SHA256SUMS.txt').decode().splitlines():
  if not line.strip():continue
  h,n=line.split(None,1);assert hashlib.sha256(z.read(n.strip())).hexdigest()==h,n
 p=json.loads(z.read('PROVENANCE.json'));meta=p['metadata'];assert meta['humanApproval'] is False and meta['semanticVerified'] is False
 assert meta['build']==json.loads((r/'evidence/build/BUILD_MANIFEST.json').read_text())['build']
 results.append({'archive':name,'files':len(z.infolist()),'crc':'PASS','internalHashes':'PASS','build':meta['build'],'counts':meta['counts'],'provenanceBlocks':len(p['blocks'])})
z=zipfile.ZipFile(e/'consumer-final-edit-reload.zip');assert z.testzip() is None;p=json.loads(z.read('PROVENANCE.json'));b=next(x for x in p['blocks']if x['id']=='p0001-b0004')
assert '20 μM' in b['text'] and '10 μM' in b['originalText'] and b['target']=='Konsentrasi sampel adalah 20 μM dan konsentrasi Ca2+ meningkat.' and b['status']=='edited'
results.append({'archive':'consumer-final-edit-reload.zip','crc':'PASS','correctedSource':b['text'],'originalSource':b['originalText'],'target':b['target'],'status':b['status'],'build':p['metadata']['build']})
(e/'FRESH_EXPORT_VERIFICATION.json').write_text(json.dumps({'method':'Actual final browser downloads; ZIP CRC, all internal SHA256, provenance and exact correction verified from bytes. Rendering separately recorded.','results':results},indent=2)+'\n');print(json.dumps(results,indent=2))
