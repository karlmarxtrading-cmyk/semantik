import {sha256} from './types';
export async function decodeModelPart(bytes:Uint8Array,part:{encoding:string;decodedSize:number;decodedSha256:string}){
 let decoded=bytes;
 if(part.encoding==='gzip'){
  if(typeof DecompressionStream==='undefined')throw new Error('Browser tidak mendukung dekompresi model gzip. Gunakan browser modern dengan DecompressionStream.');
  const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
  const chunks:Uint8Array[]=[];let count=0;
  try{while(true){const r=await reader.read();if(r.done)break;count+=r.value.length;if(count>part.decodedSize){await reader.cancel();throw new Error('Hasil dekompresi model melebihi manifest');}chunks.push(r.value);}}finally{reader.releaseLock();}
  decoded=new Uint8Array(count);let offset=0;for(const c of chunks){decoded.set(c,offset);offset+=c.length;}
 }else if(part.encoding!=='identity')throw new Error('Encoding model tidak didukung');
 if(decoded.length!==part.decodedSize||await sha256(decoded)!==part.decodedSha256)throw new Error('Hash model setelah dekompresi tidak cocok');
 return decoded;
}
