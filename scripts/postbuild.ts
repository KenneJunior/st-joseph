import { cpSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const root = process.cwd();
const distDir = resolve(root, 'dist');
const buildDir = resolve(root, 'build');

if (existsSync(distDir)) {
    if (!existsSync(buildDir)) {
        mkdirSync(buildDir, { recursive: true });
    }
    cpSync(distDir, buildDir, { recursive: true });
    console.log('[postbuild] Synchronized build artifacts from dist/ to build/');
}
