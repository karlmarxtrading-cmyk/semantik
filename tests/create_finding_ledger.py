"""Create the complete CP18 closure register without declaring historical fixes verified."""
from pathlib import Path
import json, csv, datetime

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'evidence/acceptance'
mapping={'LIFE-01':['G1'],'LIFE-02':['G1'],'LIFE-03':['G5','G6'],'LIFE-04':['G1','G4'],
         'LIFE-05':['G1','G4'],'LIFE-06':['G1','G4'],'LIFE-07':['G5'],
         'PDF-01':['G2'],'PDF-02':['G1','G2'],'PDF-03':['G2','G4'],
         'TR-01':['G3'],'TR-02':['G3'],'TR-03':['G1','G3','G4'],'TR-04':['G3','G7'],'TR-05':['G3','G7'],
         'DEP-01':['G2','G6'],'OPS-01':['G6'],'OPT-01':['G3','G5','G6'],
         'OUT-01':['G2','G3'],'OUT-02':['G3','G7'],'OUT-03':['G3'],'OUT-04':['G3'],
         'OUT-05':['G2','G3','G4'],'OUT-06':['G1','G4'],'OUT-07':['G4','G6'],'OUT-08':['G6','G7']}
overlap={'OUT-01':['PDF-03','TR-02'],'OUT-02':['TR-01','TR-04'],'OUT-03':['TR-02'],'OUT-04':['TR-02'],
         'OUT-05':['TR-01','TR-05'],'OUT-06':['TR-03','LIFE-02'],'OUT-07':['LIFE-05'],'OUT-08':['OPS-01','TR-04']}
findings=[]
for fn in ['findings_lifecycle.json','findings_pdf.json','findings_translation.json','findings_root.json']:
    data=json.loads((ROOT/'audit_produk'/fn).read_text())
    for f in data['findings']:
        evidence=f.get('evidence',f.get('resultFiles',f.get('resultFile',[])))
        findings.append({'id':f['id'],'category':'product','priority':f.get('priority',f.get('severity')),
                         'title':f['title'],'sourceEvidence':[f'audit_produk/{fn}',evidence],
                         'certainty':f.get('classification',f.get('status')),
                         'rootCause':f.get('condition',f.get('reproduction',f.get('evidence'))),
                         'baselineEvidence':f.get('repro',f.get('reproduction',f.get('resultFile',evidence))),
                         'acceptance':f.get('acceptance',[]),'gates':mapping[f['id']],
                         'changedFiles':[],'tests':[],'beforeResult':'See immutable CP17 evidence; fresh reproduction tracked separately.',
                         'afterResult':None,'freshExportEvidence':None,'regressionRisk':f.get('impact',f.get('measurement_limit')),
                         'relatedFindings':[k for k,v in overlap.items() if f['id'] in v],
                         'status':'OPEN','closureLimit':None})
for f in json.loads((ROOT/'audit_hasil/report-content.json').read_text())['sections']:
    findings.append({'id':f['id'],'category':'output-theme','priority':'P1' if f['id'] in ['OUT-01','OUT-02','OUT-03','OUT-04'] else 'P2',
                     'title':f['title'],'sourceEvidence':['audit_hasil/report-content.json',*f['evidence']],
                     'certainty':'Output pattern and code/model evidence; original worksheet PDF absent.',
                     'rootCause':f['paragraphs'],'baselineEvidence':f['evidence'],'acceptance':f['acceptance'],
                     'gates':mapping[f['id']],'changedFiles':[],'tests':[],
                     'beforeResult':'See historical user export and immutable audit reproductions.',
                     'afterResult':None,'freshExportEvidence':None,
                     'regressionRisk':'Preserve valid formulas/intervals, provenance, local PDF-only lazy flow; old Markdown does not prove new exports.',
                     'relatedFindings':overlap[f['id']],'status':'OPEN','closureLimit':None})
assert len(findings)==26 and len({f['id'] for f in findings})==26
report={'schemaVersion':1,'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'baselineArchiveSha256':'02e31d4195b72377b9fed94f130ffa84d6ec9ec5d5ab2b6fcc1c52c109d4d623',
        'note':'18 product findings and 8 output themes overlap; they are not 26 independent bugs. Statuses require actual CP18 evidence.',
        'allowedStatuses':['OPEN','IN_PROGRESS','FIXED_UNVERIFIED','VERIFIED','BLOCKED_EXTERNAL','NOT_APPLICABLE_WITH_EVIDENCE'],
        'findings':findings}
path=OUT/'FINDING_CLOSURE_LEDGER_CP18.json'
if path.exists():raise SystemExit('Ledger already exists. Update evidence explicitly; do not overwrite closure progress.')
path.write_text(json.dumps(report,ensure_ascii=False,indent=2))
with (OUT/'FINDING_CLOSURE_LEDGER_CP18.csv').open('w',newline='',encoding='utf-8-sig') as f:
    w=csv.DictWriter(f,fieldnames=['id','category','priority','title','status','gates','relatedFindings','changedFiles','tests','afterResult'],extrasaction='ignore');w.writeheader()
    w.writerows({**r,**{k:json.dumps(r[k],ensure_ascii=False) for k in ['gates','relatedFindings','changedFiles','tests']}} for r in findings)
print(json.dumps({'findings':len(findings),'status':'OPEN','path':str(path)}))
