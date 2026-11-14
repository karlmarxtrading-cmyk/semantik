#!/usr/bin/env python3
"""Check every supplied model shard, decoded part, and full model digest."""
from pathlib import Path
import json,hashlib,gzip,sys,datetime
root=Path(__file__).resolve().parents[1]
checks=[]
def check(label,actual,expected):
    checks.append({'check':label,'pass':actual==expected,'actual':actual,'expected':expected})
def digest(b): return hashlib.sha256(b).hexdigest()
for d in ['en-id','id-en']:
    manifest=json.loads((root/'models'/d/'manifest.json').read_text())
    for f in manifest['files']:
        whole=hashlib.sha256(); total=0
        for part in f['parts']:
            path=root/part['path'].lstrip('/'); data=path.read_bytes()
            prefix=f'{d}/{path.name}'
            check(prefix+' transport size',len(data),part['size'])
            check(prefix+' transport SHA-256',digest(data),part['sha256'])
            decoded=gzip.decompress(data) if part.get('encoding')=='gzip' else data
            check(prefix+' decoded size',len(decoded),part['decodedSize'])
            check(prefix+' decoded SHA-256',digest(decoded),part['decodedSha256'])
            whole.update(decoded);total+=len(decoded)
        check(d+'/'+f['name']+' full size',total,f['size'])
        check(d+'/'+f['name']+' full SHA-256',whole.hexdigest(),f['sha256'])
result={'recordedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'scope':'Local supplied model manifests, transport shards and decoded complete files',
 'pass':all(x['pass'] for x in checks),'checks':len(checks),'failed':[x for x in checks if not x['pass']],
 'details':checks}
out=root/'evidence'/'model-integrity.json';out.parent.mkdir(exist_ok=True);out.write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='details'},indent=2))
sys.exit(0 if result['pass'] else 1)
