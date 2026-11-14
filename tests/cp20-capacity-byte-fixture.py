"""One valid page + an unreferenced inert stream, exactly 100MiB.
Isolates file byte preflight; does NOT test 100MiB rendered images or scanned books.
"""
from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[1];d=r/'evidence/cp20/qa/byte-fixture';d.mkdir(parents=True,exist_ok=True)
p=d/'exact-100MiB-inert.pdf';size=100*1024*1024
objects=[b'<< /Type /Catalog /Pages 2 0 R >>',b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',b'<< /Length 68 >>\nstream\nBT /F1 12 Tf 40 790 Td (CP20 input byte boundary scientific test.) Tj ET\nendstream',b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>']
# Recompute text-stream length exactly.
content=b'BT /F1 12 Tf 40 790 Td (CP20 input byte boundary scientific test.) Tj ET\n';objects[3]=b'<< /Length '+str(len(content)).encode()+b' >>\nstream\n'+content+b'endstream'
prefix=b'%PDF-1.7\n';offsets=[0]
for n,obj in enumerate(objects,1):offsets.append(len(prefix));prefix+=f'{n} 0 obj\n'.encode()+obj+b'\nendobj\n'
offsets.append(len(prefix));prefix+=b'6 0 obj\n<< /Length 0000000000 >>\nstream\n'
streamtail=b'\nendstream\nendobj\n'
def ending(xref):return b'xref\n0 7\n0000000000 65535 f \n'+b''.join(f'{v:010d} 00000 n \n'.encode() for v in offsets[1:])+f'trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode()
filler=size-len(prefix)-len(streamtail)-len(ending(size-230))
for _ in range(3):filler=size-len(prefix)-len(streamtail)-len(ending(len(prefix)+filler+len(streamtail)))
prefix=prefix.replace(b'/Length 0000000000',f'/Length {filler:010d}'.encode())
with p.open('wb') as f:
 f.write(prefix);chunk=b'\0'*(1024*1024);remain=filler
 while remain:f.write(chunk[:min(len(chunk),remain)]);remain-=min(len(chunk),remain)
 f.write(streamtail);f.write(ending(f.tell()))
assert p.stat().st_size==size
m={'file':p.name,'bytes':size,'sha256':hashlib.file_digest(p.open('rb'),'sha256').hexdigest(),'scope':'Synthetic 1-page PDF with unreferenced inert stream to isolate input-byte ceiling; no large-asset/scan claim'}
(d/'MANIFEST.json').write_text(json.dumps(m,indent=2)+'\n');print(json.dumps(m))
