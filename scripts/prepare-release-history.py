"""Capture a verified CP19 source overlay for source-only reconstruction of retained assets.
Run after application edits; shared files are referenced by hash, not duplicated.
"""
from pathlib import Path
import argparse,hashlib,json,shutil
ROOT=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--baseline-source',type=Path,required=True)
args=parser.parse_args();baseline=args.baseline_source.resolve();out=ROOT/'release-history/cp19';out.mkdir(parents=True,exist_ok=True)
sha=lambda data:hashlib.sha256(data).hexdigest()
expected_source='6ed0d134e1770b2742b0c4c54e3a156bf1822443adea84e4de4ba0cd96308913'
records=[]
paths=list(sorted((baseline/'app').rglob('*')))+[baseline/'scripts/build.py',baseline/'scripts/sw-template.js']
for p in paths:
 if not p.is_file():continue
 if p.is_symlink():raise ValueError('Baseline symlinks are not accepted')
 rel=p.relative_to(baseline);data=p.read_bytes();current=ROOT/rel
 # Keep all first-party app modules and shell files, since siblings may still be
 # editing them. Large unchanged vendor/model files stay shared and hash-pinned.
 keep=(rel.parts[:2]==('app','app') or rel.parts[0]=='scripts' or len(rel.parts)==2 or not current.is_file() or sha(current.read_bytes())!=sha(data))
 record={'path':rel.as_posix(),'bytes':len(data),'sha256':sha(data),'storage':'overlay' if keep else 'shared'}
 if keep:
  target=out/'overlay'/rel;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
 records.append(record)
manifest={'schema':1,'release':'cp19-6ed0d134e1770b27','sourceHash':expected_source,'sourceZipSha256':'3dde79754bed538e0992f0aac854845266159fa6794a3a55a0a2d79a358ece42','purpose':'Reconstruct the immutable CP19 namespace without duplicating unchanged model/runtime assets. Original CP19 code is historical, not active CP20 source.','files':records}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'files':len(records),'overlayFiles':sum(x['storage']=='overlay' for x in records),'overlayBytes':sum(x['bytes'] for x in records if x['storage']=='overlay'),'sharedBytes':sum(x['bytes'] for x in records if x['storage']=='shared')},indent=2))
