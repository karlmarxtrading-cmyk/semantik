"""Reproduce CP18 deployed-archive integrity checks; does not modify source."""
from pathlib import Path
import collections
import gzip
import hashlib
import json
import re

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent / 'source'
RELEASE = ROOT / 'r' / '7a8e787a497535f5'
sha = lambda blob: hashlib.sha256(blob).hexdigest()
results = {}
documents = {
    'offline': json.loads((RELEASE / 'offline-assets.json').read_text()),
    'sw': json.loads(re.search(r'const CONFIG=(\{.+\});', (ROOT / 'sw.js').read_text()).group(1)),
}
for label, doc in documents.items():
    rows = []
    for item in doc['files']:
        target = ROOT / item['path'].lstrip('/')
        blob = target.read_bytes() if target.exists() else b''
        rows.append({'path': item['path'], 'exists': target.exists(), 'sizeMatch': len(blob) == item['size'], 'hashMatch': sha(blob) == item['sha256']})
    results[label] = {'total': len(rows), 'passed': sum(all(x[k] for k in ['exists', 'sizeMatch', 'hashMatch']) for x in rows), 'bytes': sum(x['size'] for x in doc['files']), 'rows': rows}
models = []
for manifest in sorted(RELEASE.glob('models/*/manifest.json')):
    doc = json.loads(manifest.read_text())
    parts, logical = [], []
    for item in doc['files']:
        combined = []
        for part in item['parts']:
            blob = (ROOT / part['path'].lstrip('/')).read_bytes()
            decoded = gzip.decompress(blob) if part.get('encoding') == 'gzip' else blob
            combined.append(decoded)
            parts.append({'path': part['path'], 'transportValid': len(blob) == part['size'] and sha(blob) == part['sha256'], 'decodedValid': len(decoded) == part['decodedSize'] and sha(decoded) == part['decodedSha256']})
        blob = b''.join(combined)
        logical.append({'name': item['name'], 'valid': len(blob) == item['size'] and sha(blob) == item['sha256']})
    models.append({'direction': doc['direction'], 'parts': parts, 'logical': logical, 'parityReport': doc['parityReport'], 'parityReportExists': (manifest.parent / doc['parityReport']).exists()})
ocr = []
for item in json.loads((RELEASE / 'licenses/tessdata_fast/SOURCE.json').read_text()):
    blob = (RELEASE / 'vendor/ocr' / (item['language'] + '.traineddata.gz')).read_bytes()
    decoded = gzip.decompress(blob)
    ocr.append({'language': item['language'], 'transportValid': len(blob) == item['transport_bytes'] and sha(blob) == item['transport_sha256'], 'decodedValid': len(decoded) == item['uncompressed_bytes'] and sha(decoded) == item['sha256']})
files = [p for p in ROOT.rglob('*') if p.is_file()]
categories = collections.defaultdict(lambda: {'count': 0, 'bytes': 0})
for p in files:
    parts = p.relative_to(ROOT).parts
    category = 'root' if len(parts) == 1 else 'release-root' if len(parts) == 3 else parts[2]
    categories[category]['count'] += 1
    categories[category]['bytes'] += p.stat().st_size
summary = {'fileCount': len(files), 'categories': categories, 'manifests': results, 'models': models, 'ocr': ocr}
(HERE / 'file_verification_reproduced.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2))
assert len(files) == 297
assert all(r['total'] == r['passed'] for r in results.values())
assert all(p['transportValid'] and p['decodedValid'] for model in models for p in model['parts'])
assert all(p['valid'] for model in models for p in model['logical'])
assert all(p['transportValid'] and p['decodedValid'] for p in ocr)
print(json.dumps({'fileCount': len(files), 'manifestChecks': {k: {'total': v['total'], 'passed': v['passed']} for k, v in results.items()}, 'modelParts': sum(len(m['parts']) for m in models), 'logicalModels': sum(len(m['logical']) for m in models), 'ocr': ocr}, indent=2))
