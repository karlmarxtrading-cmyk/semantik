import {defineConfig} from 'vite';
export default defineConfig({worker:{format:'es'},build:{target:'es2022',sourcemap:false,chunkSizeWarningLimit:1500},server:{host:'0.0.0.0'}});
