#!/usr/bin/env python3
"""Verify a SEMANTIK SETARA CP22 repository checkout against REPOSITORY_MANIFEST_CP22.json.

Checks (no network, no build, no inference):
  * every manifest file exists with the exact byte size and SHA-256 (models included);
  * no file is missing, and unexpected extra files are reported;
  * the release sourceHash recomputed from app/ + build scripts equals the frozen CP22 value;
  * no tracked file is >= 50 MiB (GitHub warns at 50 MiB, rejects at 100 MiB);
  * .gitattributes disables line-ending conversion (sourceHash covers CRLF license files).
Optional: --dist DIR compares a fresh build with evidence/cp22/build-final/BUILD_MANIFEST.json.

Usage: python3 scripts/verify-repository.py [--dist dist] [--report out.json]
Exit 0 only when every check passes.
"""
import argparse, hashlib, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IGNORE_DIRS = {'.git', 'dist', 'node_modules', '__pycache__'}
LOCAL_ONLY = {'evidence/reproduced'}  # outputs of local verification runs, ignored by .gitignore


def sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def source_hash(root):
    src = root / 'app'
    ignored = {'sw.js', 'offline-assets.json', 'README.md', 'app/build-info.js'}
    ident = [{'path': str(p.relative_to(src)), 'sha256': sha(p), 'bytes': p.stat().st_size}
             for p in sorted(src.rglob('*')) if p.is_file() and str(p.relative_to(src)) not in ignored]
    for p in [root / 'scripts/build.py', root / 'scripts/sw-template.js']:
        ident.append({'path': str(p.relative_to(root)), 'sha256': sha(p), 'bytes': p.stat().st_size})
    return hashlib.sha256(json.dumps(ident, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def tracked_files(root):
    for p in sorted(root.rglob('*')):
        rel = p.relative_to(root)
        if any(part in IGNORE_DIRS for part in rel.parts) or any(str(rel).startswith(x) for x in LOCAL_ONLY):
            continue
        if p.is_file():
            yield p, rel.as_posix()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dist')
    ap.add_argument('--report')
    a = ap.parse_args()
    man = json.loads((ROOT / 'REPOSITORY_MANIFEST_CP22.json').read_text())
    checks = []
    listed = {f['path']: f for f in man['files']}
    bad, missing = [], []
    for path, f in listed.items():
        p = ROOT / path
        if not p.is_file():
            missing.append(path)
        elif p.stat().st_size != f['bytes'] or sha(p) != f['sha256']:
            bad.append(path)
    present = {rel for _, rel in tracked_files(ROOT)}
    extra = sorted(present - set(listed) - {'REPOSITORY_MANIFEST_CP22.json'})
    checks.append({'name': 'manifest files present with exact size and SHA-256', 'pass': not bad and not missing,
                   'files': len(listed), 'mismatch': bad[:20], 'missing': missing[:20]})
    checks.append({'name': 'no unexpected extra files', 'pass': not extra, 'extra': extra[:20]})
    sh = source_hash(ROOT)
    checks.append({'name': 'sourceHash equals frozen CP22', 'pass': sh == man['release']['sourceHash'], 'computed': sh,
                   'expected': man['release']['sourceHash']})
    big = [(rel, p.stat().st_size) for p, rel in tracked_files(ROOT) if p.stat().st_size >= 50 * 1024 * 1024]
    checks.append({'name': 'no file >= 50 MiB (plain Git, no LFS needed)', 'pass': not big, 'big': big})
    ga = (ROOT / '.gitattributes').read_text() if (ROOT / '.gitattributes').exists() else ''
    checks.append({'name': '.gitattributes disables EOL conversion', 'pass': any(l.strip() == '* -text' for l in ga.splitlines())})
    models = [f for f in man['files'] if f['path'].startswith('app/models/')]
    checks.append({'name': 'model weights present (not pointers)', 'pass': all((ROOT / f['path']).stat().st_size == f['bytes'] for f in models) and len(models) > 0,
                   'modelFiles': len(models), 'modelBytes': sum(f['bytes'] for f in models)})
    if a.dist:
        frozen = json.loads((ROOT / 'evidence/cp22/build-final/BUILD_MANIFEST.json').read_text())
        d = Path(a.dist).resolve()
        built = {p.relative_to(d).as_posix(): p for p in d.rglob('*') if p.is_file()}
        diff = [f['path'] for f in frozen['files'] if f['path'] not in built or sha(built[f['path']]) != f['sha256']]
        extra_d = sorted(set(built) - {f['path'] for f in frozen['files']})
        checks.append({'name': 'fresh build byte-identical to frozen CP22 BUILD_MANIFEST', 'pass': not diff and not extra_d,
                       'frozenFiles': len(frozen['files']), 'builtFiles': len(built), 'different': diff[:20], 'extra': extra_d[:20],
                       'release': frozen['build']['release']})
    ok = all(c['pass'] for c in checks)
    report = {'repository': 'semantik-setara', 'release': man['release'], 'allPass': ok, 'checks': checks}
    print(json.dumps(report, indent=1))
    if a.report:
        Path(a.report).write_text(json.dumps(report, indent=1) + '\n')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
