/**
 * SJCCC Build & Bundle Inspection Tool
 * Analyzes compiled assets in dist/ for bundle sizes, gzip compression, and manifest integrity.
 * Run via: npm run inspect
 */

import { existsSync, readdirSync, statSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';
import { gzipSync } from 'zlib';

interface AssetDetail {
    path: string;
    sizeKb: number;
    gzipKb: number;
    type: 'js' | 'css' | 'html' | 'sw' | 'json' | 'other';
}

interface InspectionReport {
    timestamp: string;
    distExists: boolean;
    totalSizeKb: number;
    totalGzipKb: number;
    assetCount: number;
    artifacts: {
        homepage: boolean;
        prospectus: boolean;
        serviceWorker: boolean;
        manifest: boolean;
    };
    assets: AssetDetail[];
    warnings: string[];
    passed: boolean;
}

const root = process.cwd();
const distDir = resolve(root, 'dist');

console.log('\n\x1b[1m\x1b[34m========================================================================\x1b[0m');
console.log('\x1b[1m\x1b[33m  SJCCC PRODUCTION BUILD & BUNDLE INSPECTOR\x1b[0m');
console.log('\x1b[1m\x1b[34m========================================================================\x1b[0m\n');

if (!existsSync(distDir)) {
    console.error('\x1b[31m✖ Error: dist/ directory not found. Run "npm run build" first.\x1b[0m\n');
    process.exit(1);
}

function scanDir(dir: string, baseDir: string): AssetDetail[] {
    const results: AssetDetail[] = [];
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...scanDir(fullPath, baseDir));
        } else if (entry.isFile()) {
            const relPath = fullPath.replace(`${baseDir}/`, '');
            const content = readFileSync(fullPath);
            const sizeKb = Number((content.length / 1024).toFixed(2));
            const gzipKb = Number((gzipSync(content).length / 1024).toFixed(2));

            let type: AssetDetail['type'] = 'other';
            if (relPath.endsWith('.js')) type = relPath.includes('sw') ? 'sw' : 'js';
            else if (relPath.endsWith('.css')) type = 'css';
            else if (relPath.endsWith('.html')) type = 'html';
            else if (relPath.endsWith('.json')) type = 'json';

            results.push({ path: relPath, sizeKb, gzipKb, type });
        }
    }
    return results;
}

const allAssets = scanDir(distDir, distDir);
const warnings: string[] = [];

// Check required statutory artifacts
const hasHomepage = existsSync(resolve(distDir, 'index.html'));
const hasProspectus = existsSync(resolve(distDir, 'prospectus.html'));
const hasSw = existsSync(resolve(distDir, 'sw.js'));
const hasManifest = existsSync(resolve(distDir, '.vite/manifest.json')) || existsSync(resolve(distDir, 'manifest.json'));

if (!hasHomepage) warnings.push('Missing dist/index.html');
if (!hasProspectus) warnings.push('Missing dist/prospectus.html');
if (!hasSw) warnings.push('Missing dist/sw.js (Service Worker build)');
if (!hasManifest) warnings.push('Missing dist manifest file');

let totalSize = 0;
let totalGzip = 0;

console.log('\x1b[1m📦 Compiled Distribution Assets:\x1b[0m');
for (const asset of allAssets.sort((a, b) => b.sizeKb - a.sizeKb)) {
    totalSize += asset.sizeKb;
    totalGzip += asset.gzipKb;
    const color = asset.sizeKb > 300 ? '\x1b[33m' : '\x1b[32m';
    console.log(`   ${color}${asset.path.padEnd(38)}\x1b[0m ${String(asset.sizeKb + ' kB').padStart(10)} (gzip: ${asset.gzipKb} kB)`);
}

totalSize = Number(totalSize.toFixed(2));
totalGzip = Number(totalGzip.toFixed(2));

console.log('\n\x1b[1m📊 Inspection Summary:\x1b[0m');
console.log(`   Total Assets:     ${allAssets.length}`);
console.log(`   Total Size:       ${totalSize} kB (gzip: ${totalGzip} kB)`);
console.log(`   Core Entrypoints: Homepage: ${hasHomepage ? '✔' : '✖'} | Prospectus: ${hasProspectus ? '✔' : '✖'} | SW: ${hasSw ? '✔' : '✖'}`);

if (warnings.length > 0) {
    console.log('\n\x1b[33m⚠️ Warnings:\x1b[0m');
    for (const w of warnings) {
        console.log(`   - ${w}`);
    }
}

const passed = warnings.length === 0;

// Write report
const reportsDir = resolve(root, 'reports/latest');
if (!existsSync(reportsDir)) {
    mkdirSync(reportsDir, { recursive: true });
}

const report: InspectionReport = {
    timestamp: new Date().toISOString(),
    distExists: true,
    totalSizeKb: totalSize,
    totalGzipKb: totalGzip,
    assetCount: allAssets.length,
    artifacts: {
        homepage: hasHomepage,
        prospectus: hasProspectus,
        serviceWorker: hasSw,
        manifest: hasManifest,
    },
    assets: allAssets,
    warnings,
    passed,
};

writeFileSync(resolve(reportsDir, 'bundle-inspection.json'), JSON.stringify(report, null, 2), 'utf-8');
console.log(`\n\x1b[90m📁 Bundle inspection report saved to reports/latest/bundle-inspection.json\x1b[0m\n`);

if (passed) {
    console.log('\x1b[32m\x1b[1m✔ BUNDLE INSPECTION PASSED: All production assets and entrypoints verified.\x1b[0m\n');
    process.exit(0);
} else {
    console.error('\x1b[31m\x1b[1m✖ BUNDLE INSPECTION FAILED: Critical build artifacts missing.\x1b[0m\n');
    process.exit(1);
}
