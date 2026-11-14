import type {Direction} from './types';
export function exampleFiles(direction:Direction){
 const content=direction==='id-en'?'title:\nSelamat pagi\n\nquestion:\nSaya membaca buku di perpustakaan.\n\nanswer:\nTerima kasih atas bantuan Anda.\n\nexplanation:\nHari ini cuaca sangat cerah.\n':JSON.stringify({schemaVersion:'1.0',type:'mcq',id:'sample-001',title:'Good morning',questions:[{id:'q001',question:'I read a book in the library.',answer:'A',explanation:'Thank you for your help.',options:[{label:'A',text:'Good morning'},{label:'B',text:'Good evening'}]}]},null,2)+'\n';
 return [{path:direction==='id-en'?'materi/contoh.txt':'materi/contoh.json',bytes:new TextEncoder().encode(content)}];
}
