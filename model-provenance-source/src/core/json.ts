import {encodePointer} from './types';
export type JSONToken={start:number;end:number;value:string;pointer:string;key:boolean;type:string};
export type JSONNode={type:string;pointer:string;start:number;end:number;value?:string;children:JSONNode[]};
export function validUnicode(s:string){for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);if(c>=0xd800&&c<=0xdbff){const d=s.charCodeAt(++i);if(!(d>=0xdc00&&d<=0xdfff))return false;}else if(c>=0xdc00&&c<=0xdfff)return false;}return true;}
export function parseLossless(text:string,maxDepth=128):{tokens:JSONToken[];root:JSONNode}{
 let i=0;const tokens:JSONToken[]=[];const fail=(s:string):never=>{throw new Error(`JSON ${s} pada karakter ${i+1}`)};
 const ws=()=>{while(/[\t\r\n ]/.test(text[i]||'!'))i++;};
 const str=(pointer:string,key=false):JSONNode=>{const start=i++;while(i<text.length){if(text[i]==='"'){i++;let v:string;try{v=JSON.parse(text.slice(start,i));}catch{fail('string/escape tidak valid');}if(!validUnicode(v!))fail('surrogate Unicode tidak berpasangan');tokens.push({start,end:i,value:v!,pointer,key,type:'string'});return{type:'string',pointer,start,end:i,value:v!,children:[]};}if(text[i]==='\\'){i+=2;}else {if(text.charCodeAt(i)<32)fail('karakter kontrol pada string');i++;}}return fail('string belum ditutup');};
 const value=(pointer:string,depth:number):JSONNode=>{if(depth>maxDepth)fail('kedalaman melampaui batas');ws();const start=i,c=text[i];if(c==='"')return str(pointer);
  if(c==='{'||c==='['){const obj=c==='{',end=obj?'}':']',children:JSONNode[]=[],keys=new Set<string>();i++;ws();if(text[i]===end){i++;return{type:obj?'object':'array',pointer,start,end:i,children};}let ix=0;
   while(i<text.length){let p=pointer+'/'+ix;if(obj){if(text[i]!=='"')fail('key harus string');const k=str(pointer,true).value!;if(keys.has(k))fail(`duplicate key ${k}`);keys.add(k);ws();if(text[i++]!==':')fail('pemisah titik dua hilang');p=pointer+'/'+encodePointer(k);}
    children.push(value(p,depth+1));ix++;ws();if(text[i]===end){i++;return{type:obj?'object':'array',pointer,start,end:i,children};}if(text[i++]!==',')fail('pemisah koma hilang');ws();}
   return fail('object/array belum ditutup');
  }
  const m=/^(?:-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/.exec(text.slice(i));if(!m)fail('nilai tidak valid');i+=m![0].length;return{type:m![0]==='null'?'null':['true','false'].includes(m![0])?'boolean':'number',pointer,start,end:i,children:[]};
 };const root=value('',0);ws();if(i!==text.length)fail('konten tambahan');return{tokens,root};
}
export function structureSignature(text:string):string {const p=parseLossless(text);let cursor=0,out='';for(const t of p.tokens.filter(t=>!t.key)){out+=text.slice(cursor,t.start)+'"#"';cursor=t.end;}return out+text.slice(cursor);}
