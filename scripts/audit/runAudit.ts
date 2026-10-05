/**
 * SJCCC Static Content & Accessibility Audit CLI
 * Run via: npm run audit
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import { ContentAuditor } from './auditor.ts';

const root = process.cwd();
const auditor = new ContentAuditor(root);

console.log('\n\x1b[1m\x1b[34m========================================================================\x1b[0m');
console.log('\x1b[1m\x1b[33m  SJCCC CONTENT, ANCHOR & ACCESSIBILITY AUDIT ENGINE\x1b[0m');
console.log('\x1b[1m\x1b[34m========================================================================\x1b[0m\n');

const report = auditor.auditAll();

// Print Page Summaries
for (const page of report.pages) {
    const statusBadge = page.passed
        ? '\x1b[32m[PASS]\x1b[0m'
        : `\x1b[31m[FAIL (${page.errorCount} errors)]\x1b[0m`;

    console.log(`\x1b[1m📄 ${page.pageName}\x1b[0m ${statusBadge}`);
    console.log(`   Location: ${page.filePath}`);
    console.log(`   Title:    "${page.metadata.title || 'NONE'}"`);
    console.log(`   Headings: H1: ${page.stats.headings.h1} | H2: ${page.stats.headings.h2} | H3: ${page.stats.headings.h3} | H4: ${page.stats.headings.h4}`);
    console.log(`   Elements: Links: ${page.stats.totalLinks} (Anchors: ${page.stats.internalAnchors}, Tel: ${page.stats.contactLinks.tel}, WhatsApp: ${page.stats.contactLinks.whatsapp}) | Images: ${page.stats.images} | Buttons: ${page.stats.buttons}`);

    if (page.issues.length > 0) {
        console.log('   Issues:');
        for (const issue of page.issues) {
            const icon = issue.severity === 'error' ? '\x1b[31m✖ [ERROR]\x1b[0m' : issue.severity === 'warn' ? '\x1b[33m▲ [WARN]\x1b[0m' : '\x1b[36mℹ [INFO]\x1b[0m';
            console.log(`     ${icon} \x1b[1m${issue.code}\x1b[0m: ${issue.message}`);
            if (issue.context) {
                console.log(`        Context: "${issue.context}"`);
            }
            if (issue.selector) {
                console.log(`        Selector: ${issue.selector}`);
            }
        }
    } else {
        console.log('   \x1b[32m✔ No structural or link issues detected.\x1b[0m');
    }
    console.log('');
}

// Write machine-readable reports
const reportsDir = resolve(root, 'reports/latest');
if (!existsSync(reportsDir)) {
    mkdirSync(reportsDir, { recursive: true });
}

writeFileSync(resolve(reportsDir, 'audit-summary.json'), JSON.stringify(report, null, 2), 'utf-8');
writeFileSync(resolve(reportsDir, 'homepage-audit.json'), JSON.stringify(report.pages[0], null, 2), 'utf-8');
writeFileSync(resolve(reportsDir, 'prospectus-audit.json'), JSON.stringify(report.pages[1], null, 2), 'utf-8');

console.log(`\x1b[90m📁 Reports generated in reports/latest/ (audit-summary.json, homepage-audit.json, prospectus-audit.json)\x1b[0m\n`);

if (report.summary.passed) {
    console.log(`\x1b[32m\x1b[1m✔ AUDIT PASSED: 0 errors across ${report.summary.totalPages} pages (${report.summary.totalWarnings} warnings)\x1b[0m\n`);
    process.exit(0);
} else {
    console.error(`\x1b[31m\x1b[1m✖ AUDIT FAILED: ${report.summary.totalErrors} errors detected.\x1b[0m\n`);
    process.exit(1);
}
