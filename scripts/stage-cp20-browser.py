from pathlib import Path
import json, shutil
r=Path(__file__).resolve().parent.parent
build=json.loads((r/'evidence/build/BUILD_MANIFEST.json').read_text())['build']
d=r/'dist/qa';d.mkdir(exist_ok=True)
for n in ['cp20-browser.html','cp20-browser.js','browser.css']:
 (d/n).write_text((r/'tests'/n).read_text().replace('__BASE__',build['base']))
shutil.copytree(r/'tests/fixtures',d/'fixtures',dirs_exist_ok=True)
print('Staged QA harness outside release manifest. Exclude dist/qa from all deploy packages.')
