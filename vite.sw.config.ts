import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync, existsSync } from 'fs';

export default defineConfig(() => {
    // Read generated production manifest if it exists
    const manifestPath = resolve(import.meta.dirname, 'dist/.vite/manifest.json');
    const precacheAssets: string[] = [];

    if (existsSync(manifestPath)) {
        try {
            const manifestContent = JSON.parse(readFileSync(manifestPath, 'utf-8'));
            for (const key of Object.keys(manifestContent)) {
                const item = manifestContent[key];
                if (item.file) {
                    precacheAssets.push('/' + item.file);
                }
                if (Array.isArray(item.css)) {
                    for (const cssFile of item.css) {
                        precacheAssets.push('/' + cssFile);
                    }
                }
            }
        } catch (e) {
            console.warn('[vite.sw.config] Could not read manifest.json:', e);
        }
    }

    return {
        define: {
            __SW_MANIFEST_ASSETS__: JSON.stringify(precacheAssets),
        },
        build: {
            outDir: 'dist',
            emptyOutDir: false,
            target: 'esnext',
            minify: true,
            lib: {
                entry: resolve(import.meta.dirname, 'src/sw.ts'),
                formats: ['iife'],
                name: 'SJCCCServiceWorker',
                fileName: () => 'sw.js',
            },
            rollupOptions: {
                output: {
                    inlineDynamicImports: true,
                    entryFileNames: 'sw.js',
                },
            },
        },
    };
});
