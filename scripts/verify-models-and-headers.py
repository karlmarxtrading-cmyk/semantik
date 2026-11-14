from pathlib import Path
import gzip,hashlib,json,fnmatch
r=Path(__file__).resolve().parent.parent
sha=lambda b:hashlib.sha256(b).hexdigest()
build=json.loads((r/'evidence/build/BUILD_MANIFEST.json').read_text())['build']
rows=[]
for direction in ['en-id','id-en']:
 m=json.loads((r/'app/models'/direction/'manifest.json').read_text())
 for f in m['files']:
  h=hashlib.sha256();n=0;parts=[]
  for p in f['parts']:
   raw=(r/'app'/p['path'].lstrip('/')).read_bytes();decoded=gzip.decompress(raw) if p.get('encoding')=='gzip' else raw
   ok=len(raw)==p['size'] and sha(raw)==p['sha256'] and len(decoded)==p.get('decodedSize',len(decoded)) and sha(decoded)==p.get('decodedSha256',sha(decoded))
   parts.append({'path':p['path'],'pass':ok,'storedBytes':len(raw),'decodedBytes':len(decoded)});h.update(decoded);n+=len(decoded)
  rows.append({'direction':direction,'name':f['name'],'pass':all(p['pass'] for p in parts) and n==f['size'] and h.hexdigest()==f['sha256'],'actualSha256':h.hexdigest(),'parts':parts})
headers=(r/'dist/_headers').read_text();rules=[]
for line in headers.splitlines():
 if line.startswith('/'):
  rules.append({'pattern':line.strip(),'values':[]})
 elif line.strip() and not line.lstrip().startswith('#'):
  key,sep,val=line.strip().partition(':')
  if sep and key.lower()=='cache-control':rules[-1]['values'].append(val.strip())
cache=[]
for path in ['/','/index.html','/sw.js',build['base']+'app/main.js',build['base']+'models/en-id/encoder_q8.onnx.part000.gz']:
 matches=[r for r in rules if fnmatch.fnmatchcase(path,r['pattern'])];values=[v for r in matches for v in r['values']]
 cache.append({'path':path,'values':values,'pass':len(values)==1 and ('no-cache'==values[0] if path in ['/','/index.html','/sw.js'] else 'immutable' in values[0])})
report={'build':build,'scope':'Actual gzip/decoded bytes; static Cloudflare matching-rule simulation only, not response-header verification','modelFiles':rows,'cacheControl':cache,'allPass':all(x['pass'] for x in rows+cache)}
(r/'evidence/cp19/MODEL_AND_HEADERS.json').write_text(json.dumps(report,indent=2)+'\n');print('Model files:',len(rows),'passed:',sum(x['pass'] for x in rows),'Header paths:',len(cache),'allPass:',report['allPass']);assert report['allPass']
