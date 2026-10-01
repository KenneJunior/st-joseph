import { defineConfig } from 'vite';
import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';

export default defineConfig({
    root: './',
    server: {
        host: '0.0.0.0',
        port: 3000,
        allowedHosts: true
    },
    plugins: [
        {
            name: 'dev-sw-server',
            configureServer(server) {
                server.middlewares.use((req, res, next) => {
                    if (req.url === '/sw.js') {
                        const distSwPath = resolve(import.meta.dirname, 'dist/sw.js');
                        if (existsSync(distSwPath)) {
                            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
                            res.end(readFileSync(distSwPath, 'utf-8'));
                            return;
                        }
                    }
                    next();
                });
            }
        }
    ],
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        target: 'esnext',
        manifest: true,
        cssMinify: false,
        rollupOptions: {
            input: {
                main: resolve(import.meta.dirname, 'index.html'),
                prospectus: resolve(import.meta.dirname, 'prospectus.html')
            }
        }
    },
});
