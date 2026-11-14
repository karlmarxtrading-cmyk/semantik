"""Assemble immutable actual journal inference evidence; never fabricate human ratings.

Qualitative notes below were recorded after reading every revised source/target pair.
They are AI screening observations, not a gold reference or human adjudication.
"""
from pathlib import Path
import json,csv,hashlib,datetime,collections,statistics

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'evidence/acceptance'
def read(name): return json.loads((BASE/name).read_text())
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
corpus=read('G7_REAL_JOURNAL_CORPUS.json')
baseline=read('REAL_JOURNAL_BASELINE_INFERENCE.json')
revised=read('REAL_JOURNAL_REVISED_INFERENCE.json')
assert revised['complete'] and revised['completedSegments']==160
assert baseline['corpusSha256']==revised['corpusSha256']==sha(BASE/'G7_REAL_JOURNAL_CORPUS.json')
b={x['id']:x for x in baseline['output']};r={x['id']:x for x in revised['output']}
assert len(b)==len(r)==160
notes={
'JOURNAL-01-S02':('MAJOR_FLUENCY','Meaning is difficult to recover from literal word order; broad drift from research focus is rendered melayang.'),
'JOURNAL-01-S05':('MAJOR_TERMINOLOGY','The named simplex method is rendered metode sederhana, an ordinary simple method.'),
'JOURNAL-01-S09':('MAJOR_OMISSION','The prior qualifier of mathematical knowledge is absent from the target.'),
'JOURNAL-01-S10':('MAJOR_TERMINOLOGY','Purposive and convenience sampling are rendered purpositif and mudah sampling.'),
'JOURNAL-01-S11':('MAJOR_TERMINOLOGY','Post-test becomes tes pos/ujian-pos rather than the post-intervention assessment term.'),
'JOURNAL-01-S12':('CRITICAL_RELATION','Performance AND attitude becomes kinerja ATAU sikap; target also adds (V) and corrupts the instrument name.'),
'JOURNAL-01-S14':('MAJOR_TERMINOLOGY','Heuristic problem-solving approach and post attitude questionnaire are garbled as masalah-larut and peta-petanya sikap pos.'),
'JOURNAL-01-S15':('MAJOR_TERMINOLOGY','Bartlett test of sphericity is malformed as tes bulatan Bartlett-- dari bulatan; mathematical literals remain present.'),
'JOURNAL-02-S03':('MAJOR_ENTITY','Statisticians are rendered statistik/statistikians; the counted participants lose their role in parts of the sentence.'),
'JOURNAL-02-S08':('MAJOR_TERMINOLOGY','Model building is rendered model bangunan, suggesting physical buildings rather than constructing a statistical model.'),
'JOURNAL-02-S14':('MAJOR_TERMINOLOGY','Confidence intervals become interval kepercayaan diri; the statistical term is not stable.'),
'JOURNAL-02-S15':('MAJOR_RELATION','Oversight of research misconduct is garbled as tempat yang melampaui kesalahan penelitian; source has the typo oversite.'),
'JOURNAL-02-S16':('MAJOR_RELATION','Recommendation that journals provide templates is blurred into journals recommending templates; provision role is lost.'),
'JOURNAL-02-S19':('MAJOR_GLYPH_OR_TERM','Living documents is malformed as dokumen dinamis åglaving without an automatic issue.'),
'JOURNAL-03-S02':('MAJOR_RELATION','Maternal and newborn health metrics become kedudukan terkemuka ibu dan anak baru dalam metrik kesehatan.'),
'JOURNAL-03-S04':('MAJOR_TERMINOLOGY','The term SSA becomes suku SSA, changing term to tribe; remainder also needs domain review.'),
'JOURNAL-03-S10':('MAJOR_TERMINOLOGY','Decision of interest becomes keputusan dari bunga; branches and chance-node explanation are malformed.'),
'JOURNAL-03-S11':('CRITICAL_OMISSION','Postnatally is omitted from the antenatal/labour/postnatal intervention timing list.'),
'JOURNAL-03-S12':('CRITICAL_OMISSION','Seven outcome categories (maternal/neonatal mortality, morbidity, DALYs and stillbirths) collapse into unrelated Penciptaan Kefanatikan Maternal yang mematikan.'),
'JOURNAL-03-S17':('CRITICAL_TERMINOLOGY','Morbidity becomes keadaan tidak wajar and stillbirths becomes kelahiran kembali (rebirth); the scientific outcomes change.'),
'JOURNAL-04-S03':('MAJOR_TERMINOLOGY','Autoregressive moving average becomes proses bergerak secara otomatis; ARMA model type is not conveyed.'),
'JOURNAL-04-S04':('MAJOR_TERMINOLOGY','State space models become model ruang angkasa (outer space models).'),
'JOURNAL-04-S13':('CRITICAL_TERMINOLOGY','Seasonality becomes tingkat keserasian (harmony) and deterministic becomes menentukan; the reported property changes.'),
'JOURNAL-04-S16':('CRITICAL_ENTITY','Latin binomial Nanger granti becomes Nanger hidi, eland is omitted, and browsers is interpreted as web browsers.'),
'JOURNAL-04-S18':('CRITICAL_RELATION','Milk availability for the young and green grass for weaning are conflated into milk for young and green grass; calving/weaning terms also fail.'),
'JOURNAL-05-S02':('MAJOR_TERMINOLOGY','Weaned piglets and slaughter-ready weight are rendered calf pig cubs and weight of the cut; source OCR has iepas.'),
'JOURNAL-05-S03':('MAJOR_QUANTIFIER','Many offspring (anak yang banyak) becomes a large child; animal-production context is also lost.'),
'JOURNAL-05-S04':('MAJOR_TERMINOLOGY','Preweaning piglets becomes precowling pig cubs, an invented target term.'),
'JOURNAL-05-S06':('MAJOR_TERMINOLOGY','Regression equation becomes regression equivalent; litter/milk-yield context is poorly conveyed.'),
'JOURNAL-05-S07':('MAJOR_TERMINOLOGY','Eleven piglets becomes a child 11 tail; milk-production computation becomes mother milk completion.'),
'JOURNAL-05-S08':('MAJOR_TERMINOLOGY','Reproductive performance is replaced by prologue.'),
'JOURNAL-05-S10':('SOURCE_REVIEW_REQUIRED','Reference OCR interleaves/truncates column fragments. No valid scientific semantic score is assigned; retain this frozen row and repair source extraction separately.'),
'JOURNAL-05-S11':('SOURCE_REVIEW_REQUIRED','Reference OCR has truncated fragments (a/ya/menguj); source transcription needs page review before a full semantic score.'),
'JOURNAL-05-S12':('CRITICAL_ENTITY','Pig-production context becomes capacity of cultivated cattle; livestock species changes.'),
'JOURNAL-05-S14':('CRITICAL_POLARITY','The source literal Least cost diet is translated as Most cost diet, reversing the optimization direction.'),
'JOURNAL-05-S16':('MAJOR_TERMINOLOGY','Least-cost diet becomes east-cost diet.'),
'JOURNAL-05-S17':('MAJOR_OMISSION','Ration price per ton is reduced to price is higher; the denominator/subject is lost.'),
'JOURNAL-05-S19':('SOURCE_CONTEXT_REVIEW_REQUIRED','The PDF contains the beginning of an adjacent sheep-husbandry article on its last page. Frozen selection is PDF-based; this is not from the pig-paper body. Location term is also malformed.'),
'JOURNAL-05-S20':('SOURCE_CONTEXT_REVIEW_REQUIRED','Adjacent sheep-article source and OCR P « 0,05 need page transcription review. Candidate safely rejected; no completed English translation.'),
'JOURNAL-06-S06':('SOURCE_REVIEW_REQUIRED','Reference extraction already lacks mathematical symbols/operators in R {- } and missing operation notation. Do not score reconstructed algebra as faithful to the PDF.'),
'JOURNAL-06-S07':('SOURCE_REVIEW_REQUIRED','Reference extraction has missing algebra operators and infinity symbols; human/page transcription is required.'),
'JOURNAL-06-S12':('CRITICAL_IDENTIFIER','The definition label (iii) changes to (ii), even though (iv) remains; identity is not preserved.'),
'JOURNAL-06-S13':('CRITICAL_IDENTIFIER_WITH_SOURCE_LIMIT','G(A) becomes G wayA). The final formula is already incomplete in reference extraction, which is a separate source limitation.'),
'JOURNAL-06-S16':('SOURCE_REVIEW_REQUIRED','Reference extraction has missing quantifier/set-membership/infinity notation. Corpus is retained but mathematical fidelity to the PDF is unresolved.'),
'JOURNAL-07-S01':('MAJOR_TERMINOLOGY','Population count is rendered souls and statistical bureau name becomes Statistical Centers.'),
'JOURNAL-07-S02':('CRITICAL_ENTITY_WITH_SOURCE_LIMIT','Rancabolang, Mekarjaya and Cibaduyut become Rancabolangism, Jarical and Cidduyut. The source itself says two districts then lists three; that inconsistency must not be silently corrected.'),
'JOURNAL-07-S05':('CRITICAL_ENTITY','Kecamatan Lengkong becomes Lengkong Mischief and Kecamatan Regol becomes Mutiny; monitoring-location identities change.'),
'JOURNAL-07-S08':('SOURCE_REVIEW_REQUIRED','Selected source ends mid-clause (baik untuk). This frozen fragment cannot establish whole-claim semantic coverage.'),
'JOURNAL-07-S12':('MAJOR_RELATION','A place frequently visited by residents becomes one of Bandungs most frequent visits.'),
'JOURNAL-07-S15':('CRITICAL_RELATION','Highest concentration at location1 and lowest at location2 become contradictory lowest and lowest square wording; spatial ranking is corrupted.'),
'JOURNAL-07-S18':('MAJOR_OMISSION_WITH_SOURCE_LIMIT','Economic conditions are dropped (social and social); puskesmas becomes packaging. The source also ends mid-sentence.'),
'JOURNAL-07-S19':('MAJOR_MODALITY','Terindikasi tercemar (indicated contamination) becomes have been contaminated, strengthening evidential certainty.'),
'JOURNAL-07-S20':('MAJOR_ENTITY','Institution and centre names are malformed, although the opaque funding identifier is retained.'),
'JOURNAL-08-S02':('CRITICAL_ENTITY','Pucangsawit becomes Pucangamitis; Surakarta becomes Surkarta and administrative locality becomes faults.'),
'JOURNAL-08-S03':('CRITICAL_ENTITY','Puskesmas Pucangsawit becomes Puskesmas Pucangapit, changing the named data source.'),
'JOURNAL-08-S04':('MAJOR_ENTITY','Local government page Mapan Mas is rendered Mas4 Maspan box; source superscript citation is joined to name.'),
'JOURNAL-08-S06':('CRITICAL_ENTITY','Pucangsawit becomes Pucancletics, changing the study-area identity.'),
'JOURNAL-08-S09':('CRITICAL_TERMINOLOGY','Coliform becomes collide, changing the microbiological test target.'),
'JOURNAL-08-S10':('MAJOR_METHOD','Inoculating culture medium is rendered injecting samples; the procedural term needs scientific review.'),
'JOURNAL-08-S11':('CRITICAL_ENTITY','Pucangsawit becomes Pucangaptit, changing the study location.'),
'JOURNAL-08-S13':('MAJOR_RELATION','Relationship among pollutant-source distance, well depth and measured values is grammatically entangled; coliform is misspelled collioform.'),
'JOURNAL-08-S14':('CRITICAL_RELATION','The deeper the well relation becomes the more in the drill well, obscuring the independent variable and inverse relation.'),
'JOURNAL-08-S15':('CRITICAL_RELATION','Well depth becomes Perspicuous Wells and Pucangsawit becomes Pucangatit; study variables and location are corrupted.'),
'JOURNAL-08-S16':('MAJOR_TERMINOLOGY','Infiltration well (sumur resapan) becomes well of the laying.'),
'JOURNAL-08-S17':('CRITICAL_TERMINOLOGY','Soil permeability (source typo pemeabilitas) becomes soil stability, a different physical property.'),
}

rows=[]; blinded=[]; keys=[]
for d in corpus['documents']:
 for s in d['segments']:
  rid=s['id'];old=b[rid];new=r[rid]
  assert old['source']==new['source']==s['source']
  assert old['direction']==new['direction']==d['direction']
  severity,note=notes.get(rid,('NO_DEFINITE_CRITICAL_OBSERVED_NOT_APPROVAL','Limited bilingual AI screening found no definite critical violation; this is not a semantic PASS or human fluency/terminology rating.'))
  if new['outcome']=='rejected' and rid not in notes:
   severity,note='SAFE_REJECTION','Candidate explicitly rejected; exact source fallback retained. This is not a completed translation.'
  row={'id':rid,'documentId':d['documentId'],'direction':d['direction'],'domain':d['domain'],
       'pdfPath':d['pdfPath'],'pdfSha256':d['pdfSha256'],'page':s['page'],'bbox':s.get('bbox'),
       'source':s['source'],'sourceTranscriptionStatus':'HUMAN_UNVERIFIED',
       'baselineOutput':old['text'],'baselineStatus':old['status'],
       'cp18Output':new['text'],'cp18Status':new['status'],'cp18Outcome':new['outcome'],
       'cp18Warnings':new.get('issues',[]),'outputChanged':old['text']!=new['text'],
       'aiFindingSeverity':severity,'aiFinding':note,'reviewerA':None,'reviewerB':None,
       'adjudicator':None,'humanReference':None,'humanDecision':'UNREVIEWED'}
  rows.append(row)
  swap=int(hashlib.sha256(rid.encode()).hexdigest()[:2],16)%2
  outs=[old['text'],new['text']];outs.reverse() if swap else None
  blinded.append({'id':rid,'documentId':d['documentId'],'direction':d['direction'],'domain':d['domain'],
                  'pdfPath':d['pdfPath'],'page':s['page'],'source':s['source'],
                  'outputA':outs[0],'outputB':outs[1], 'sourceTranscriptionConfirmed':'',
                  'literalIntegrityA':'','literalIntegrityB':'','criticalErrorA':'','criticalErrorB':'',
                  'terminologyAcceptableA':'','terminologyAcceptableB':'','fluency1to5A':'','fluency1to5B':'',
                  'correctedReference':'','reasoning':'','reviewerIdentity':'','qualification':'','date':'','decision':'UNREVIEWED'})
  keys.append({'id':rid,'outputA':'CP18' if swap else 'CP17_BASELINE','outputB':'CP17_BASELINE' if swap else 'CP18'})

def stats(data):
 out=data['output'];ms=sorted(x['ms'] for x in out)
 return {'count':len(out),'statuses':dict(collections.Counter(x['status'] for x in out)),
         'explicitOutcomes':dict(collections.Counter(x.get('outcome','NOT_RECORDED_IN_CP17') for x in out)),
         'recordsWithWarnings':sum(bool(x.get('issues')) for x in out),
         'wallLatencyMs':{'sum':sum(ms),'mean':statistics.mean(ms),'median':statistics.median(ms),'p95NearestRank':ms[max(0,__import__('math').ceil(.95*len(ms))-1)],'max':max(ms)},
         'directions':{di:{'count':sum(x['direction']==di for x in out),
                           'explicitOutcomes':dict(collections.Counter(x.get('outcome','NOT_RECORDED_IN_CP17') for x in out if x['direction']==di))} for di in ['en-id','id-en']}}

critical=[x for x in rows if x['aiFindingSeverity'].startswith('CRITICAL')]
report={'schemaVersion':1,'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'corpusSha256':revised['corpusSha256'],'corpusHeldOutAtInference':True,
        'method':'Actual local Node/WASM model inference, filesystem fetch and RAM CacheStorage transport. All160 revised pairs screened by AI against frozen source strings. No browser/PDF export or human approval is implied.',
        'identities':{'baseline':baseline['identities'],'cp18':revised['identities']},
        'inputHashes':{x:sha(BASE/x) for x in ['G7_REAL_JOURNAL_CORPUS.json','G7_PREDECLARED_RUBRIC.json','REAL_JOURNAL_BASELINE_INFERENCE.json','REAL_JOURNAL_REVISED_INFERENCE.json']},
        'summary':{'documents':8,'segments':160,'directions':{'en-id':80,'id-en':80},
                   'baseline':stats(baseline),'cp18':stats(revised),'changedOutputs':sum(x['outputChanged'] for x in rows),
                   'aiScreeningCounts':dict(collections.Counter(x['aiFindingSeverity'] for x in rows)),
                   'aiObservedCriticalCases':len(critical),'aiCriticalCasesWithoutAutomaticWarning':sum(not x['cp18Warnings'] for x in critical),
                   'humanApprovals':0,'humanReviewerA':'UNREVIEWED','humanReviewerB':'UNREVIEWED','adjudicator':'UNREVIEWED',
                   'scientificGate':'FAIL_OBSERVED_CRITICAL_ERRORS_AND_HUMAN_REVIEW_PENDING'},
        'gateChecks':{
         'criticalMeaningErrors':{'status':'FAIL_OBSERVED','maximumAllowed':0,'aiObservedCases':len(critical),'humanAdjudication':'UNREVIEWED','evidenceIds':[x['id'] for x in critical]},
         'literalIntegrity':{'status':'FAIL_OBSERVED','minimumRequired':1.0,'evidenceIds':['JOURNAL-06-S12','JOURNAL-06-S13'],'note':'Definition label and G(A) mutated; not a complete literal census.'},
         'extractionCoverage':{'status':'UNVERIFIED_FOR_FULL_PIPELINE','note':'Reference PDF extraction/OCR and separate production parser evidence are not final browser-export coverage; unresolved reference-source fragments retained.'},
         'fluency':{'status':'BLOCKED_HUMAN_REVIEW','minimumMean':4.0},
         'terminology':{'status':'FAIL_OBSERVED_AND_HUMAN_REVIEW_PENDING','minimumAcceptableFraction':0.95,'note':'No human denominator score is fabricated.'},
         'falseWarningRate':{'status':'BLOCKED_HUMAN_ADJUDICATION','maximum':0.1,'note':'Raw warning counts are not a false-warning rate.'}},
        'limitations':['All160 remain in the denominator; failed or source-degraded rows were not removed.',
                       'Reference extraction has known missing mathematics/OCR fragments and two adjacent-article segments in JOURNAL-05. These require source-page review, not invented source corrections.',
                       'Source fragments and captions are retained exactly; no claim of ideal corpus representativeness.',
                       'Row-level AI observations are screening evidence, not independent human ratings or a certified accuracy percentage.',
                       'Latency is Node wall-clock per segment; not browser CPU, heap, peak memory or device performance.',
                       'If any output is used to tune the model or code, retain this evaluation and reclassify this corpus development-exposed; reserve a new unseen holdout.'],
        'rows':rows}
(BASE/'G7_REAL_JOURNAL_COMPARISON_AI_NOT_HUMAN.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
def csvwrite(name,rs):
 with (BASE/name).open('w',newline='',encoding='utf-8-sig') as f:
  w=csv.DictWriter(f,fieldnames=list(rs[0]));w.writeheader();w.writerows({k:json.dumps(v,ensure_ascii=False) if isinstance(v,(list,dict)) else v for k,v in row.items()} for row in rs)
csvwrite('REAL_JOURNAL_HUMAN_REVIEW_ACTUAL_OUTPUTS.csv',rows)
csvwrite('REAL_JOURNAL_BLINDED_REVIEWER_A.csv',blinded)
csvwrite('REAL_JOURNAL_BLINDED_REVIEWER_B.csv',blinded)
(BASE/'REAL_JOURNAL_BLINDING_KEY_OWNER_ONLY.json').write_text(json.dumps(keys,indent=2))
(BASE/'REAL_JOURNAL_REVIEW_INSTRUCTIONS.txt').write_text('''CP18 independent bilingual scientific review — all approvals pending\n\nUse the two blinded reviewer CSV files independently. Do not show AI findings, output identities, or the owner-only blinding key to either reviewer before initial decisions. Both reviewers must be human, bilingual and domain-competent. Record identity, qualification and date. An independent adjudicator resolves disagreements without deleting either original decision.\n\n1. Confirm source text against the cited PDF page. Reference extraction includes OCR/missing mathematical glyphs and truncated fragments; preserve original evidence and record corrected transcription separately.\n2. Evaluate every frozen ID. Do not remove errors from the denominator. Review scientific terms, entity identity, quantities attached to claims, polarity, modality, omitted/added content, formulas/operators, IDs and fluency.\n3. Score output A and B independently. Record exact evidence, severity, a corrected reference and the predeclared rubric. A source fallback is a safe refusal, not a translated success.\n4. After independent review, adjudicate disagreements and join the output identity key. Human-adjudicated faithful pairs are required to calculate false-warning rate.\n5. Use G7_PREDECLARED_RUBRIC.json thresholds. Its historical corpus-availability note is superseded by actual materials in G7_CORPUS_READINESS.json; thresholds are unchanged.\n6. Actual inference here is Node/WASM over extracted source text. Review fresh browser/PDF exports separately; these CSVs do not establish full extraction coverage or deployment behavior.\n7. Current AI screening found critical scientific errors. No row is human-approved, and no 100% production claim is justified.\n\nThe historical worksheet PDF remains unavailable. Labeled synthetic fixtures are not the user PDF. The real journal PDFs are separately attributed in JOURNAL_ATTRIBUTION_AND_LICENSES.txt.\n''')
print(json.dumps(report['summary'],ensure_ascii=False,indent=2))
