import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    root: './',
    server:{
      allowedHosts: ['sjccc.loca.lt']
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        target: 'esnext',
        cssMinify: false,
        rolldownOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                prospectus: resolve(__dirname, 'prospectus.html')
            }
        }
    },
});