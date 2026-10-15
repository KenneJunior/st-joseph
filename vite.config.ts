/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

function isPlaceholderApiKey(val?: string): boolean {
    if (!val) return true;
    const lower = val.trim().toLowerCase();
    return (
        lower === 'my_gemini_api_key' ||
        lower.includes('my_gemini_api_key') ||
        lower.includes('your_') ||
        lower.includes('placeholder') ||
        lower.includes('example') ||
        lower === 'null' ||
        lower === 'undefined'
    );
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    if (env.GEMINI_API_KEY && !isPlaceholderApiKey(env.GEMINI_API_KEY)) {
        process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
    }

    return {
        test: {
            environmentMatchGlobs: [
                ['tests/unit/school-dates-timeline.test.ts', 'jsdom'],
                ['tests/unit/faq-accordion.test.ts', 'jsdom'],
            ],
        },
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
                            const distSwPath = resolve(rootDir, 'dist/sw.js');
                            if (existsSync(distSwPath)) {
                                res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
                                res.end(readFileSync(distSwPath, 'utf-8'));
                                return;
                            }
                        }
                        if (req.url === '/api/gemini' || req.url?.startsWith('/api/gemini?')) {
                            import('./api/gemini.ts').then(({ default: handler }) => {
                                handler(req, res);
                            }).catch((err) => {
                                res.statusCode = 500;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ error: 'SERVER', message: String(err) }));
                            });
                            return;
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
            cssMinify: true,
            copyPublicDir: true,
            rollupOptions: {
                input: {
                    main: resolve(rootDir, 'index.html'),
                    prospectus: resolve(rootDir, 'prospectus.html')
                }
            }
        }
    };
});
