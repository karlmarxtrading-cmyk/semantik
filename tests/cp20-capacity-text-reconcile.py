"""Reconcile every actual extracted word/order against deterministic fixture source.
This strengthens page/ID coverage without regenerating PDFs or replaying inference.
"""
from pathlib import Path
import ast,json,re,hashlib
r=Path(__file__).resolve().parents[1];q=r/'evidence/cp20/qa';tree=ast.parse((r/'tests/cp20-capacity-fixtures.py').read_text());selected=[n for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id in ['EN','ID'] for t in n.targets)];env={};exec(compile(ast.Module(body=selected,type_ignores=[]),'capacity fixture declared ground truth','exec'),env)
manifest=json.loads((r/'tests/fixtures/cp20-capacity/MANIFEST.json').read_text());parser=json.loads((q/'capacity-parser-final/RESULTS.json').read_text());normalize=lambda s:re.sub(r'\s+',' ',s).strip();rows=[]
for f in manifest['files']:
 trace=json.loads((r/'tests/fixtures/cp20-capacity'/f['traceManifest']).read_text());directory=q/'capacity-parser-final'/f['file'].replace('.pdf','');fail=[];verified=0
 for p in range(1,f['pages']+1):
  pid=f'CP20P{p:04d}';heading=pid+': '+('Catatan penelitian' if f['language']=='id' else 'Research observations');corpus=env['ID' if f['language']=='id' else 'EN']
  paragraphs=[f'CP20B{p:04d}_{j:02d}. '+corpus[(p+j)%len(corpus)](p*31+j*7+11) for j in range(13)] if f['rich'] else [f'CP20B{p:04d}_00. '+corpus[(p-1)%len(corpus)](p*7+11)]
  expected=heading+'\n'+'\n\n'.join(paragraphs)+'\n'+pid+' END'
  assert hashlib.sha256(expected.encode()).hexdigest()==trace['pages'][p-1]['sourceSha256'],'Ground truth reconstruction must match original trace manifest'
  actual='\n'.join(b['text'] for b in json.loads((directory/f'{p:04d}.json').read_text())['blocks'])
  if normalize(expected)!=normalize(actual):fail.append({'page':p,'expected':expected,'actual':actual})
  else:verified+=1
 rows.append({'file':f['file'],'status':'FAIL' if fail else 'PASS','pages':f['pages'],'fullTextOrderMatchedPages':verified,'failures':fail})
report={'method':'Every actual extracted page normalized only for whitespace and compared to original authored full text/order, after independently checking reconstructed ground truth against the original per-page SHA-256 trace manifest. No source/extractor changes, no inference, no browser claim.','parserEvidence':'capacity-parser-final/RESULTS.json','parserModuleHashes':parser['sourceAfter'],'currentBuildBinding':'CAPACITY_FINAL_BUILD_BINDING.json','rows':rows}
(q/'CAPACITY_FULL_TEXT_RECONCILIATION.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print([(x['file'],x['status'],x['fullTextOrderMatchedPages']) for x in rows]);raise SystemExit(int(any(x['status']=='FAIL' for x in rows)))
