import {protectedSpans} from './protection';
const opaque=(text:string)=>{for(const p of [...protectedSpans(text)].reverse())if(['formula','code','url','html','placeholder','link-destination'].includes(p.kind))text=text.slice(0,p.start)+' '.repeat(p.end-p.start)+text.slice(p.end);return text;};
const intent=/\?|(?:^|[.!?]\s+|\n)\s*(?:please\s+)?(?:find|calculate|determine|prove|show|explain|compare|evaluate|solve|identify|compute|count|state|select|choose|refer|tentukan|cari(?:lah)?|temukan|hitung(?:lah)?|buktikan|tunjukkan|jelaskan|bandingkan|evaluasi(?:lah)?|selesaikan|identifikasi|nyatakan|pilih(?:lah)?|rujuk)\b/iu;
const answer=/\b(?:the\s+(?:correct\s+)?answer\s+is|the\s+solution\s+is|jawabannya\s+(?:adalah|yaitu)|jawaban\s+(?:yang\s+)?benar\s+(?:adalah|yaitu)|hasilnya\s+(?:adalah|yaitu)|solusinya\s+(?:adalah|yaitu))\b/iu;
export function taskIntegrityFindings(source:string,target:string,role:string){
 const src=opaque(source),dst=opaque(target),findings:string[]=[];
 // Compare linguistic task form; never count protected formula/code punctuation as a question.
 const asks=intent.test(src),questionScope=role==='question'||role==='root'||role==='prose';
 if(asks&&questionScope&&!intent.test(dst))findings.push('Fungsi pertanyaan/perintah sumber hilang: target berubah menjadi pernyataan atau jawaban. Terjemahkan tugas, jangan menyelesaikannya.');
 const answerLabel=/(?:^|[.!?]\s+|\n)\s*(?:answer|solution|jawaban|solusi)\s*:/iu;
 if((answer.test(dst)||answerLabel.test(dst))&&!answer.test(src)&&!answerLabel.test(src))findings.push('Target menambahkan pernyataan jawaban/solusi yang tidak terdapat pada sumber.');
 const sourceQ=(src.match(/\?/g)||[]).length,targetQ=(dst.match(/\?/g)||[]).length;
 if(questionScope&&sourceQ&&targetQ<sourceQ)findings.push('Jumlah pertanyaan eksplisit berkurang; periksa apakah pertanyaan diganti dengan jawaban atau dihilangkan.');
 const sourceStatements=(src.match(/[.!](?=\s|$)/g)||[]).length,targetStatements=(dst.match(/[.!](?=\s|$)/g)||[]).length;
 if(questionScope&&sourceQ>0&&targetStatements>sourceStatements)findings.push('Target memuat kalimat pernyataan tambahan setelah/di samping pertanyaan. Periksa solusi atau konten baru yang tidak diminta.');
 const command=/(?:^|\n)\s*(?:curl|wget|sudo|powershell|rm\s+-[rf]+|Invoke-WebRequest)\b|\{\s*"(?:tool_calls|function_call)"\s*:/iu;
 if(command.test(dst)&&!command.test(src))findings.push('Target menambahkan perintah eksekusi atau tool call yang tidak terdapat pada sumber. Konten tetap diperlakukan sebagai data.');
 return findings;
}
