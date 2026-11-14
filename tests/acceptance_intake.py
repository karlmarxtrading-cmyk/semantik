"""CP18 intake verification; never treats historical evidence as new-build acceptance."""
from pathlib import Path
import csv, gzip, hashlib, json, platform

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'evidence/acceptance'
OUT.mkdir(parents=True, exist_ok=True)
sha = lambda b: hashlib.sha256(b).hexdigest()

receipts = []
for name in ['audit_produk', 'audit_hasil']:
    base = ROOT / name
    receipt = json.loads((base / 'BUKTI_SHA256.json').read_text())
    rows = []
    for item in receipt['files']:
        data = (base / item['path']).read_bytes()
        rows.append({'path': item['path'], 'bytes': len(data), 'sha256': sha(data),
                     'pass': len(data) == item['bytes'] and sha(data) == item['sha256']})
    receipts.append({'archive': name, 'payloads': len(rows), 'pass': all(x['pass'] for x in rows), 'checks': rows})

models = []
for direction in ['en-id', 'id-en']:
    manifest_path = ROOT / 'baseline/models' / direction / 'manifest.json'
    manifest = json.loads(manifest_path.read_text())
    rows = []
    for item in manifest['files']:
        combined = hashlib.sha256()
        size = 0
        parts = []
        for part in item['parts']:
            path = ROOT / 'baseline' / part['path'].lstrip('/')
            data = path.read_bytes()
            decoded = gzip.decompress(data) if part.get('encoding') == 'gzip' else data
            parts.append({'path': part['path'], 'transportBytes': len(data), 'transportSha256': sha(data),
                          'decodedBytes': len(decoded), 'decodedSha256': sha(decoded),
                          'pass': len(data) == part['size'] and sha(data) == part['sha256'] and
                          len(decoded) == part['decodedSize'] and sha(decoded) == part['decodedSha256']})
            combined.update(decoded)
            size += len(decoded)
        rows.append({'logicalFile': item['name'], 'bytes': size, 'sha256': combined.hexdigest(),
                     'pass': all(p['pass'] for p in parts) and size == item['size'] and combined.hexdigest() == item['sha256'],
                     'parts': parts})
    models.append({'direction': direction, 'manifestSha256': sha(manifest_path.read_bytes()), 'modelId': manifest['id'],
                   'metadataTokenLimits': [manifest['maxInputTokens'], manifest['maxOutputTokens']],
                   'parityReport': manifest.get('parityReport'),
                   'parityReportPresentInBaseline': (manifest_path.parent / manifest.get('parityReport', 'missing')).is_file(),
                   'files': rows, 'pass': all(x['pass'] for x in rows)})

original = ROOT / 'audit_hasil/input/JURNAL_TERJEMAHAN.md'
md = original.read_text()
blocks = json.loads((ROOT / 'audit_hasil/markdown-blocks.json').read_text())
ledger = list(csv.DictReader((ROOT / 'audit_hasil/LEDGER_AUDIT_291_BLOK.csv').open(encoding='utf-8-sig')))
math = json.loads((OUT / 'baseline/semantic_math_check.json').read_text())
report = {'method': 'Actual byte hashes and decompression; exact historical Markdown arithmetic rerun in separate output directory.',
          'environment': {'python': platform.python_version(), 'platform': platform.platform()},
          'receipts': receipts, 'models': models,
          'historicalOutput': {'bytes': original.stat().st_size, 'sha256': sha(original.read_bytes()),
                               'parsedBlocks': len(blocks), 'csvRows': len(ledger), 'lines': len(md.splitlines()),
                               'exactMathRerun': math['summary'], 'freshCP18Export': False},
          'allIntegrityChecksPass': all(r['pass'] for r in receipts + models),
          'scopeLimit': 'Hash validation and old-output arithmetic do not establish CP18 correctness or human semantic approval.'}
(OUT / 'INTAKE_INTEGRITY.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
assert report['allIntegrityChecksPass']
assert len(blocks) == len(ledger) == 291
assert math['summary']['totalPartitionChecks'] == 496
assert all(c['pass'] for r in math['results'] for c in r['partitionChecks'])
assert sha(original.read_bytes()) == '9042964f73f3877df7bc5c84e980e37753d6294f3dfb2d08efaafee3b24b2c8f'
print(json.dumps({'integrity': 'PASS', 'receipts': sum(r['payloads'] for r in receipts),
                  'logicalModelFiles': sum(len(m['files']) for m in models), 'historicalMath': math['summary']}, ensure_ascii=False))
