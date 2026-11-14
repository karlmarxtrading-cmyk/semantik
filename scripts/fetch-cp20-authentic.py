#!/usr/bin/env python3
"""Fetch exact author-linked source outside the release tree; never run inference."""
import argparse, hashlib, json, pathlib, time, urllib.request
p=argparse.ArgumentParser();p.add_argument('--output',required=True,help='Explicit scratch directory outside the cp20 release source tree');args=p.parse_args()
repo=pathlib.Path(__file__).resolve().parents[1];out=pathlib.Path(args.output).resolve()
if out==repo or repo in out.parents: raise SystemExit('Choose a scratch directory outside the release source tree.')
m=json.loads((repo/'tests/fixtures/cp20-authentic/MANIFEST.json').read_text());out.mkdir(parents=True,exist_ok=True)
target=out/'light-and-matter.pdf';partial=target.with_suffix('.pdf.part');started=time.monotonic();size=0;digest=hashlib.sha256()
if target.exists():
 if hashlib.sha256(target.read_bytes()).hexdigest()==m['sha256']: print(str(target));raise SystemExit(0)
 raise SystemExit('Existing PDF hash mismatch; no overwrite performed.')
try:
 with urllib.request.urlopen(m['url'],timeout=30) as response,partial.open('xb') as stream:
  while True:
   block=response.read(1024*1024)
   if not block:break
   size+=len(block)
   if size>100*1024*1024 or time.monotonic()-started>120:raise RuntimeError('Download exceeded QA size/time cap')
   digest.update(block);stream.write(block)
 if size!=m['bytes'] or digest.hexdigest()!=m['sha256']:raise RuntimeError('Exact fixture checksum/size mismatch')
 partial.rename(target);print(str(target))
except BaseException:
 partial.unlink(missing_ok=True);raise
