"""Freeze a small synthetic holdout before scoring. It cannot replace human journal QA."""
from pathlib import Path
import json, hashlib, datetime, csv

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'evidence/acceptance'
OUT.mkdir(parents=True, exist_ok=True)
if (OUT/'G7_HOLDOUT_CORPUS.json').exists():
    raise SystemExit('Corpus is frozen. Reuse the existing corpus and hash; do not regenerate after scoring.')
DATA = [
('MATH-EN','en-id','mathematics','formula',[
('For this example, the solution set contains two disjoint intervals.', 'Dalam contoh ini, himpunan penyelesaian terdiri atas dua interval yang saling lepas.'),
('Let A = ∅ and B = ℝ. Their union equals B.', 'Misalkan A = ∅ dan B = ℝ. Gabungan keduanya sama dengan B.'),
('If |x| < 3, then x lies in (−3, 3).', 'Jika |x| < 3, maka x berada dalam (−3, 3).'),
('Record the identifier sample-alpha~run-7~trial-2 exactly.', 'Catat identifier sample-alpha~run-7~trial-2 secara persis.')]),
('MATH-ID','id-en','mathematics','two-column',[
('Himpunan penyelesaian tidak mencakup kedua titik batas.', 'The solution set does not include either boundary point.'),
('Untuk setiap n ∈ ℕ, berlaku n ≥ 0 menurut konvensi yang digunakan di sini.', 'For every n ∈ ℕ, n ≥ 0 holds under the convention used here.'),
('Gabungan kedua interval ditulis sebagai (−5, −2) ∪ (4, 8).', 'The union of the two intervals is written as (−5, −2) ∪ (4, 8).'),
('Pernyataan ini merupakan asumsi, bukan kesimpulan dari data.', 'This statement is an assumption, not a conclusion from the data.')]),
('STAT-EN','en-id','statistics','table',[
('Group C included 12 participants, whereas group D included 18 participants.', 'Kelompok C mencakup 12 peserta, sedangkan kelompok D mencakup 18 peserta.'),
('The confidence interval includes zero; the estimated effect is therefore uncertain.', 'Interval kepercayaan mencakup nol; karena itu, efek yang diestimasi masih belum pasti.'),
('The median is reported because the distribution is asymmetric.', 'Median dilaporkan karena distribusinya tidak simetris.'),
('The table reports observations rather than causal effects.', 'Tabel tersebut melaporkan pengamatan, bukan efek kausal.')]),
('STAT-ID','id-en','statistics','digital',[
('Kelompok C memiliki 14 pengamatan dan kelompok D memiliki 21 pengamatan.', 'Group C has 14 observations and group D has 21 observations.'),
('Simpangan baku menggambarkan sebaran data, bukan ketidakpastian rata-rata sampel.', 'The standard deviation describes the dispersion of the data, not the uncertainty of the sample mean.'),
('Model ini mungkin menjelaskan sebagian variasi, tetapi tidak membuktikan hubungan sebab akibat.', 'This model may explain some of the variation, but it does not prove causation.'),
('Parameter diestimasi dari data pelatihan dan dievaluasi pada data terpisah.', 'The parameters were estimated from training data and evaluated on separate data.')]),
('BIO-EN','en-id','biomedical','mixed',[
('The reagent concentration was 7 μM and the incubation time was 15 min.', 'Konsentrasi reagen adalah 7 μM dan waktu inkubasi adalah 15 min.'),
('The Ca2+ signal did not increase after treatment.', 'Sinyal Ca2+ tidak meningkat setelah perlakuan.'),
('This small experiment cannot establish clinical effectiveness.', 'Eksperimen kecil ini tidak dapat membuktikan efektivitas klinis.'),
('A solution containing sodium chloride was prepared before the assay.', 'Larutan yang mengandung natrium klorida disiapkan sebelum pengujian.')]),
('BIO-ID','id-en','biomedical','scan',[
('Larutan mengandung 8 nM reagen dan disimpan pada 4 °C.', 'The solution contains 8 nM reagent and is stored at 4 °C.'),
('Konsentrasi Ca2+ diukur sebelum dan sesudah perlakuan.', 'The Ca2+ concentration was measured before and after treatment.'),
('Tidak ada bukti yang cukup untuk menyatakan bahwa terapi ini aman bagi semua pasien.', 'There is insufficient evidence to state that this therapy is safe for all patients.'),
('Hasil awal menunjukkan kemungkinan manfaat, tetapi penelitian lanjutan masih diperlukan.', 'The preliminary results suggest possible benefit, but further research is still needed.')]),
('ENV-EN','en-id','environment','two-column',[
('Rainfall increased at station P but decreased at station Q.', 'Curah hujan meningkat di stasiun P tetapi menurun di stasiun Q.'),
('The model predicts a possible change, not a certain outcome.', 'Model memprediksi kemungkinan perubahan, bukan hasil yang pasti.'),
('Measurements were collected at 6 m and 9 m above ground.', 'Pengukuran dilakukan pada ketinggian 6 m dan 9 m di atas tanah.'),
('The dataset identifier climate-observations~site-P~2026 must remain unchanged.', 'Identifier dataset climate-observations~site-P~2026 harus tetap tidak berubah.')]),
('ENV-ID','id-en','environment','digital',[
('Suhu rata-rata meningkat di lokasi P dan menurun di lokasi Q.', 'The average temperature increased at site P and decreased at site Q.'),
('Hubungan yang diamati tidak selalu menunjukkan mekanisme sebab akibat.', 'The observed association does not necessarily indicate a causal mechanism.'),
('Sensor ditempatkan pada kedalaman 3 m selama 24 h.', 'The sensor was placed at a depth of 3 m for 24 h.'),
('Ketidakpastian pengukuran harus dilaporkan bersama estimasi.', 'Measurement uncertainty must be reported alongside the estimate.')]),
]
docs=[]
for doc_id, direction, domain, structure, pairs in DATA:
    docs.append({'documentId': 'HOLDOUT-'+doc_id, 'direction': direction, 'domain': domain,
                 'structure': structure, 'sourceKind': 'AI_AUTHORED_SYNTHETIC_FIXTURE',
                 'sourceOrigin': 'New original test sentences authored for CP18 acceptance on 2026-11-12; not a real journal or historic user PDF.',
                 'distributionPermission': 'Task-created original fixture; no third-party copied passage.',
                 'humanReferenceStatus': 'UNREVIEWED',
                 'segments': [{'id':f'HOLDOUT-{doc_id}-{i:02d}', 'source':s, 'aiReference':t,
                               'referenceOrigin':'AI_AUTHORED_NOT_HUMAN_APPROVED', 'humanReference':None,
                               'reviewerA':None, 'reviewerB':None, 'adjudication':None}
                              for i,(s,t) in enumerate(pairs,1)]})
corpus={'schemaVersion':1,'frozenAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'purpose':'Synthetic holdout pilot only. Freeze before baseline/CP18 inference. No optimization to these samples.',
        'documents':docs,
        'counts':{'documents':8,'segments':32,'perDirection':{'en-id':{'documents':4,'segments':16},'id-en':{'documents':4,'segments':16}},
                  'perDomain':{d:{'documents':2,'segments':8} for d in ['mathematics','statistics','biomedical','environment']},
                  'pdfStructures':{'digital':2,'two-column':2,'table':1,'formula':1,'mixed':1,'scan':1}},
        'limitations':['All references and source sentences are AI-authored. No human approval has occurred.',
                       'This 32-segment set is not representative of unrestricted scientific translation.',
                       'The historical worksheet PDF is absent. These fixtures never replace it.']}
path=OUT/'G7_HOLDOUT_CORPUS.json';path.write_text(json.dumps(corpus,ensure_ascii=False,indent=2))
digest=hashlib.sha256(path.read_bytes()).hexdigest()
rubric={'schemaVersion':1,'frozenAt':corpus['frozenAt'],'corpusSha256':digest,
        'decision':'G7 BLOCKED until independent human assessment and legitimate target-domain journal corpus exist.',
        'criteria':{
           'criticalMeaningErrors':{'maximum':0,'definition':'Changed polarity, modality/conclusion strength, entity, number-to-claim assignment, units, formula operator/variable, omitted critical content, or invented claim.'},
           'literalIntegrity':{'minimum':1.0,'definition':'All required source scientific literals/opaque IDs preserved exactly except explicitly approved equivalent notation.'},
           'extractionCoverage':{'minimumTextItemCoverage':0.99,'criticalRegionsRequired':1.0,'definition':'Every critical region extracted or flagged unresolved; unresolved critical region blocks acceptance, not counted as fully covered.'},
           'fluency':{'minimumMeanHumanScore':4.0,'scale':[1,5]},
           'terminology':{'minimumHumanAcceptableFraction':0.95,'criticalMismeaningMaximum':0},
           'falseWarningRate':{'maximum':0.1,'requires':'Human-adjudicated faithful pairs; mutation tests tracked separately.'},
           'knownRegressionFixtures':{'criticalFailuresMaximum':0}},
        'humanProcedure':{'reviewers':2,'independent':True,'adjudicatorForDisagreements':True,'status':'UNREVIEWED',
                          'instructions':'Review blinded baseline/CP18 outputs against source PDF and text. Record exact segment ID, severity, reason, corrected reference, reviewer identity/qualification/date. Adjudicate disagreements. AI ratings do not satisfy human approval.'},
        'realJournalExtension':{'minimumDocuments':8,'minimumSegments':160,'documentsPerDirection':4,'segmentsPerDirection':80,
                                'domains':['mathematics','statistics','biomedical','environment'],
                                'minimumDocumentsPerDomain':2,'requiredStructures':['digital','scan','mixed','two-column','table','formula','references'],
                                'status':'BLOCKED_EXTERNAL','action':'Owner supplies lawful redistributable target journals with source/license and two independent bilingual scientific reviewers plus adjudicator.'},
        'rules':['Never change thresholds after observing failures.','Never remove failed holdout cases from denominator.','Do not tune on holdout. Any tuning invalidates its held-out status and requires a fresh set.','Report inference, validator mutations, PDF extraction, browser tests, and human judgments separately.']}
(OUT/'G7_PREDECLARED_RUBRIC.json').write_text(json.dumps(rubric,ensure_ascii=False,indent=2))
with (OUT/'HUMAN_REVIEW_TEMPLATE.csv').open('w',encoding='utf-8-sig',newline='') as f:
    cols=['id','documentId','direction','domain','source','aiReference','humanReference','baselineOutput','cp18Output','reviewerA','reviewerB','adjudicator','criticalMeaningError','terminologyScore','fluencyScore','falseWarning','decision','reason','date']
    w=csv.DictWriter(f,fieldnames=cols);w.writeheader()
    for d in docs:
        for s in d['segments']:
            w.writerow({k:v for k,v in {**s,**{k:d[k] for k in ['documentId','direction','domain']}}.items() if k in cols})
(OUT/'G7_HOLDOUT_CORPUS.sha256').write_text(digest+'  G7_HOLDOUT_CORPUS.json\n')
print(json.dumps({'sha256':digest,'documents':8,'segments':32,'humanStatus':'UNREVIEWED'}))
