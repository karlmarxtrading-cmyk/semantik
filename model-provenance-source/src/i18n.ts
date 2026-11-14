import english from './ui-en.json';
export type UiLanguage='id'|'en';
const catalog:Record<string,string>=english;
let language:UiLanguage='id';
try{const saved=globalThis.localStorage?.getItem('semantik-ui-language');if(saved==='id'||saved==='en')language=saved;}catch{}
export const getUiLanguage=()=>language;
export function setUiLanguage(value:string){
 if(value!=='id'&&value!=='en')throw new Error('Unsupported interface language');
 language=value;try{globalThis.localStorage?.setItem('semantik-ui-language',value);}catch{}
}
export function t(key:string,...values:unknown[]){
 const template=language==='en'?(catalog[key]??key):key;
 return template.replace(/\{(\d+)\}/g,(all,index)=>Number(index)<values.length?String(values[Number(index)]):all);
}
export function tr(parts:TemplateStringsArray,...values:unknown[]){return t(parts.reduce((key,part,i)=>key+(i?`{${i-1}}`:'')+part,''),...values);}
const escape=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const patterns=Object.entries(catalog).filter(([key])=>/\{\d+\}/.test(key)).map(([id,en])=>{
 const compile=(template:string)=>{const ids:number[]=[];let cursor=0,pattern='^';for(const m of template.matchAll(/\{(\d+)\}/g)){pattern+=escape(template.slice(cursor,m.index))+'([\\s\\S]*?)';ids.push(Number(m[1]));cursor=m.index!+m[0].length;}return{regex:new RegExp(pattern+escape(template.slice(cursor))+'$'),ids};};
 return{id,en,idPattern:compile(id),enPattern:compile(en)};
});
/** Only authored UI/status/error text is passed here; never document or editor content. */
export function translateMessage(text:string):string {
 if(text.startsWith('Error: '))return 'Error: '+translateMessage(text.slice(7));
 for(const [id,en] of Object.entries(catalog))if(text===id||text===en)return language==='en'?en:id;
 for(const p of patterns){for(const pattern of [p.idPattern,p.enPattern]){const match=pattern.regex.exec(text);if(match){const args:unknown[]=[];pattern.ids.forEach((id,i)=>args[id]=match[i+1]);
  // Only these slots contain authored parser/QA labels. Other slots can contain user data.
  if(p.id==='JSON {0} pada karakter {1}'||p.id.startsWith('Periksa {0}:'))args[0]=translateMessage(String(args[0]));
  if(p.id==='{0}: {1}. Target tersimpan tetap aman. Pulihkan literal sumber lalu simpan ulang.')args[1]=String(args[1]).split('; ').map(translateMessage).join('; ');
  return t(p.id,...args);}}}
 // Prefix messages append filenames or runtime details; preserve that payload exactly.
 for(const [id,en] of Object.entries(catalog).sort((a,b)=>b[0].length-a[0].length)){
  if(!id.endsWith(' ')||id.includes('{'))continue;
  if(text.startsWith(id))return (language==='en'?en:id)+text.slice(id.length);
  if(text.startsWith(en))return (language==='en'?en:id)+text.slice(en.length);
 }
 return text;
}
