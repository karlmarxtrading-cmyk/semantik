// Test-only transport fault: model fetches are unavailable, runtime stays local.
// This verifies cache reuse, not a complete browser offline session.
const nativeFetch=globalThis.fetch;
globalThis.fetch=(input,options)=>{
  const url=new URL(typeof input==='string'?input:input.url||input.href,self.location.href);
  if(url.pathname.startsWith('/models/'))return Promise.reject(new TypeError('QA: model network intentionally unavailable'));
  return nativeFetch(input,options);
};
await import('../assets/engine.worker-4c3dcfee.js');
postMessage({ready:true});
