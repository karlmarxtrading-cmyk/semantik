from pathlib import Path
root=Path(__file__).resolve().parent.parent
src=(root/'baseline/assets/engine.worker-4c3dcfee.js').read_text()
start=src.index('async function ir(');end=src.index('async function ar()',start)
src=src[:start]+(root/'scripts/engine-cache-fragment.js').read_text()+'\n'+src[end:]
needle='for(let e of i)s.set(e.name,await ir(e,t,o,a))'
assert src.count(needle)==1
src=src.replace(needle,'await cp18StoragePreflight(a);for(let e of i)s.set(e.name,await ir(e,t,o,a))')
needle='supportsAbort:`worker termination`'
assert src.count(needle)==1
src=src.replace(needle,'offlineReady:cp18OfflineReady,storageMode:cp18OfflineReady?`persistent`:`session`,storageWarning:cp18StorageWarning,'+needle)
src=src.replace('/assets/ort-wasm-simd-threaded-CxTQ5xH-.wasm','/runtime/ort-wasm-simd-threaded.wasm')
(root/'app/assets/engine.worker-4c3dcfee.js').write_text(src)
