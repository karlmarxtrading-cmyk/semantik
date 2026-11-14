export type ExportFileHandle={createWritable:()=>Promise<{write:(chunk:Uint8Array)=>Promise<void>;close:()=>Promise<void>;abort:()=>Promise<void>}>};
export type ExportPicker=(options:{suggestedName:string;types:{description:string;accept:Record<string,string[]>}[]})=>Promise<ExportFileHandle>;
export async function chooseExportFile(picker:ExportPicker,suggestedName:string){
 try{return await picker({suggestedName,types:[{description:'ZIP',accept:{'application/zip':['.zip']}}]});}
 catch(error){if(error instanceof DOMException&&error.name==='AbortError')return null;if(error instanceof DOMException&&['NotAllowedError','SecurityError'].includes(error.name))throw new Error('Pemilih berkas tidak tersedia dalam lingkungan browser ini. Gunakan tombol Unduh ZIP lengkap; workspace dan hasil sebelumnya tetap tersedia.');throw error;}
}
/** Artifact has already passed ZIP reread. A failed/aborted write never yields a saved receipt. */
export async function writeExportFile(handle:ExportFileHandle,bytes:Uint8Array){
 const stream=await handle.createWritable();let closed=false;
 try{for(let offset=0;offset<bytes.length;offset+=1024*1024)await stream.write(bytes.subarray(offset,Math.min(bytes.length,offset+1024*1024)));await stream.close();closed=true;return {delivery:'FILE_WRITER_CLOSED' as const,bytes:bytes.length};}
 catch(error){if(!closed)try{await stream.abort();}catch{}throw new Error('Penyimpanan berkas belum berhasil. Workspace tetap tersedia; coba ekspor kembali. '+String(error));}
}
