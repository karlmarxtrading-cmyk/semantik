"""Freeze deterministic real-journal excerpts with page provenance before model inference.

Reference extraction uses PyMuPDF/native OCR, not the CP18 parser. It is a source
preparation route and is not counted as browser/PDF-to-export acceptance.
"""
from pathlib import Path
import json,re,hashlib,datetime,csv,shutil
import fitz
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'evidence/acceptance'
target=BASE/'G7_REAL_JOURNAL_CORPUS.json'
if target.exists():raise SystemExit('Already frozen; do not regenerate after outputs.')
metadata=json.loads((BASE/'journal-source-metadata.json').read_text())
receipts=json.loads((BASE/'JOURNAL_DOWNLOAD_RECEIPT.json').read_text())
replacements={x['id']:x for x in json.loads((BASE/'journal-replacement-metadata.json').read_text()) if isinstance(x.get('id'),str)}
domains=['mathematics','statistics','biomedical','environment','statistics','mathematics','environment','biomedical']
docs=[]
for index in range(8):
    did=f'JOURNAL-{index+1:02d}';orig=metadata[index];receipt=receipts[index]
    if did in replacements:
        replacement=replacements[did];orig={'url':replacement['url'],'metadata':replacement['metadata'],'licenseLinks':replacement['licenseLinks']};receipt=replacement
    path=BASE/receipt['file'];d=fitz.open(path);language='en' if index<4 else 'id';candidates=[]
    for page_num,page in enumerate(d,1):
        if page_num==1:continue # avoid title/authors/duplicate bilingual abstracts
        if did=='JOURNAL-05':
            paragraphs=[{'raw':p,'bbox':None,'method':'native Tesseract5 OCR with pinned CP17 tessdata_fast'} for p in (BASE/'journals/scan-ocr'/f'page-{page_num:02d}.txt').read_text().split('\n\n')]
        else:
            paragraphs=[{'raw':b[4],'bbox':list(b[:4]),'method':'PyMuPDF independent reference extraction'} for b in page.get_text('blocks') if b[6]==0]
        stop=False
        for block_no,block in enumerate(paragraphs):
            raw=block['raw'];s=re.sub(r'([A-Za-z])-\s*\n\s*([a-z])',r'\1\2',raw);s=re.sub(r'\s+',' ',s).strip()
            if re.fullmatch(r'(References|Daftar\s+Pustaka|Kepustakaan)',s,re.I):stop=True;break
            if len(s)<100 or re.search(r'(Copyright|Creative Commons|PLOS ONE \||https?://|ISSN|Received:|Accepted:|Funding:|Competing)',s):continue
            if language=='id' and len(re.findall(r'\b(dan|yang|dengan|untuk|dari|pada|dalam|adalah|dapat|ini|tersebut)\b',s,re.I))<2:continue
            sentences=re.split(r'(?<=[.!?])\s+(?=[A-ZÀ-Ý])',s)
            for sent_no,sent in enumerate(sentences):
                if 90<=len(sent)<=550 and len(re.findall(r'[A-Za-z]',sent))/len(sent)>.55:
                    candidates.append({'source':sent,'page':page_num,'paragraphIndex':block_no,'sentenceIndex':sent_no,'bbox':block['bbox'],
                                       'rawParagraph':raw,'extractionMethod':block['method']})
        if stop:break
    if len(candidates)<20:raise ValueError((did,'insufficient eligible candidate count',len(candidates)))
    indexes=[round(i*(len(candidates)-1)/19) for i in range(20)]
    selected=[{'id':f'{did}-S{i+1:02d}',**candidates[j],'candidateIndex':j,'humanReference':None,'humanReview':'UNREVIEWED'} for i,j in enumerate(indexes)]
    m=orig['metadata'];license_url='https://creativecommons.org/licenses/by/4.0/' if index<4 else 'https://creativecommons.org/licenses/by-sa/4.0/'
    assert any(license_url.rstrip('/').split('://')[-1] in x for x in orig['licenseLinks']),orig
    docs.append({'documentId':did,'direction':'en-id' if language=='en' else 'id-en','domain':domains[index],
                 'title':m['citation_title'][0],'authors':m.get('citation_author',[]),'journal':m.get('citation_journal_title',[None])[0],
                 'publicationDate':m.get('citation_date',[None])[0],'doi':m.get('citation_doi',[None])[0],
                 'sourceUrl':orig['url'],'pdfUrl':m['citation_pdf_url'][0],'pdfPath':receipt['file'],
                 'pdfSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'pdfBytes':path.stat().st_size,'pages':len(d),
                 'license':license_url,'licenseEvidence':'Current primary journal page metadata; CC-BY PLOS or CC-BY-SA university journal. Attribution retained.',
                 'sourceKind':'REAL_PUBLISHED_JOURNAL','structure':'scanned two-column body' if did=='JOURNAL-05' else 'digital journal with text, tables/figures or mathematical notation',
                 'candidateCount':len(candidates),'segments':selected})
report={'schemaVersion':1,'frozenAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'selection':'Exactly20 sentences/document, evenly spaced over eligible pre-reference body candidates; selected BEFORE any baseline or CP18 output was examined. Sentence normalization joins physical newlines and line-end hyphenation only; raw paragraph and page/bbox retained.',
        'documents':docs,'counts':{'documents':8,'segments':160,'perDirection':{'en-id':80,'id-en':80},'perDomain':{d:40 for d in set(domains)}},
        'humanReview':'UNREVIEWED','humanReferenceAvailable':False,
        'referenceExtractionWarning':'PyMuPDF/native OCR is independent source preparation. It can contain extraction errors. Reviewer must compare source PDF and approve source transcription before judging translation. No CP18 extraction/browser success is claimed.',
        'licenseNotice':'Original PDFs unchanged. Extracted excerpts retain original article license and attribution; CC-BY-SA excerpts/translation adaptations distributed under CC-BY-SA4.0. Corpus evaluation files are separate from deploy; do not embed journal content in app assets.',
        'scope':'Small fixed multi-domain evaluation corpus, not a guarantee for all journals. Same predeclared critical-error/literal/fluency criteria apply.'}
target.write_text(json.dumps(report,ensure_ascii=False,indent=2));digest=hashlib.sha256(target.read_bytes()).hexdigest();(BASE/'G7_REAL_JOURNAL_CORPUS.sha256').write_text(digest+'  G7_REAL_JOURNAL_CORPUS.json\n')
with (BASE/'REAL_JOURNAL_HUMAN_REVIEW_TEMPLATE.csv').open('w',encoding='utf-8-sig',newline='') as f:
    fields=['id','documentId','direction','domain','page','source','humanTranscriptionApproved','humanReference','baselineOutput','cp18Output','reviewerA','reviewerB','adjudicator','criticalError','decision','reason'];w=csv.DictWriter(f,fieldnames=fields);w.writeheader()
    for doc in docs:
        for s in doc['segments']:w.writerow({k:v for k,v in {**s,**{k:doc[k] for k in ['documentId','direction','domain']}}.items() if k in fields})
credits=['REAL JOURNAL CORPUS — attribution and licensing','Original PDFs unchanged. Excerpts preserve raw page provenance. AI/native OCR extraction is not human-approved.','CC-BY-SA excerpts and adaptations retain CC-BY-SA4.0. Not included in deploy assets.','']
for d in docs:credits.extend([d['documentId']+': '+d['title'],', '.join(d['authors']),str(d['journal'])+'; '+str(d['publicationDate'])+'; DOI '+str(d['doi']),d['sourceUrl'],d['license'],'PDF SHA256 '+d['pdfSha256'],''])
(BASE/'JOURNAL_ATTRIBUTION_AND_LICENSES.txt').write_text('\n'.join(credits))
print(json.dumps({'sha256':digest,**report['counts'],'candidateCounts':{d['documentId']:d['candidateCount'] for d in docs}}))
