import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    root: './',
    build: {
        rolldownOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                prospectus: resolve(__dirname, 'prospectus.html')
            }
        },
        outDir: 'dist',
        emptyOutDir: true,
        target: 'esnext',
        cssMinify: false
    },
});