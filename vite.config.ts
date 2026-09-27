import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    root: './',
    server: {
        host: '0.0.0.0',
        port: 3000,
        allowedHosts: true
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        target: 'esnext',
        cssMinify: false,
        rollupOptions: {
            input: {
                main: resolve(import.meta.dirname, 'index.html'),
                prospectus: resolve(import.meta.dirname, 'prospectus.html')
            }
        }
    },
});
