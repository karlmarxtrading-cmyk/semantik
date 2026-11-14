from pathlib import Path
import shutil,json
r=Path(__file__).resolve().parent.parent
build=json.loads((r/'evidence/build/BUILD_MANIFEST.json').read_text())['build']
d=r/'dist/qa';d.mkdir(exist_ok=True)
for n in ['browser.html','browser.css','browser.js','translation-table-contract.js']:(d/n).write_text((r/'tests'/n).read_text().replace('__BASE__',build['base']))
shutil.copytree(r/'tests/fixtures',d/'fixtures',dirs_exist_ok=True)
print('QA harness staged outside build manifest; must be removed before packaging')

shutil.copy2(r/'evidence/acceptance/journals/JOURNAL-04.pdf',d/'fixtures/JOURNAL-04.pdf')
