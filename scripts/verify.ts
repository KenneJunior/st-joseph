/**
 * SJCCC Master Automated Verification Pipeline
 * Orchestrates:
 * 1. Typecheck (tsc --noEmit)
 * 2. Static Content & A11y Audit (scripts/audit/auditor.ts)
 * 3. Unit & Integration Tests (vitest run)
 * 4. Production Application & SW Build (npm run build)
 * 5. Production Bundle & Manifest Inspection (scripts/inspect/inspectBundle.ts)
 * 
 * Run via: npm run verify
 */

import { execSync } from 'child_process';
import { ContentAuditor } from './audit/auditor.ts';

interface Step {
    name: string;
    action: () => void;
}

console.log('\n\x1b[1m\x1b[34m========================================================================\x1b[0m');
console.log('\x1b[1m\x1b[33m  SJCCC REPOSITORY VERIFICATION & QA PIPELINE\x1b[0m');
console.log('\x1b[1m\x1b[34m========================================================================\x1b[0m\n');

const steps: Step[] = [
    {
        name: 'Step 1: TypeScript Type Checking (tsc --noEmit)',
        action: () => {
            execSync('npm run lint', { stdio: 'inherit' });
        },
    },
    {
        name: 'Step 2: Static Content, Link Integrity & A11y Audit',
        action: () => {
            const auditor = new ContentAuditor(process.cwd());
            const report = auditor.auditAll();
            if (!report.summary.passed) {
                throw new Error(`Audit failed with ${report.summary.totalErrors} errors.`);
            }
            console.log(`   \x1b[32m✔ Audited ${report.summary.totalPages} pages with 0 errors.\x1b[0m`);
        },
    },
    {
        name: 'Step 3: Automated Test Suite (vitest run)',
        action: () => {
            execSync('npx vitest run', { stdio: 'inherit' });
        },
    },
    {
        name: 'Step 4: Dual-Entrypoint Production Build & Precache Generation',
        action: () => {
            execSync('npm run build', { stdio: 'inherit' });
        },
    },
    {
        name: 'Step 5: Production Bundle & Asset Inspection',
        action: () => {
            execSync('npx tsx scripts/inspect/inspectBundle.ts', { stdio: 'inherit' });
        },
    },
];

let currentStep = 0;
const totalSteps = steps.length;
const startTime = Date.now();

try {
    for (const step of steps) {
        currentStep++;
        console.log(`\x1b[1m\x1b[36m[${currentStep}/${totalSteps}] ${step.name}...\x1b[0m`);
        step.action();
        console.log(`\x1b[32m✔ Passed ${step.name}\x1b[0m\n`);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\x1b[1m\x1b[32m========================================================================\x1b[0m`);
    console.log(`\x1b[1m\x1b[32m  ✔ FULL PIPELINE VERIFICATION PASSED in ${duration}s\x1b[0m`);
    console.log(`\x1b[1m\x1b[32m========================================================================\x1b[0m\n`);
    process.exit(0);
} catch (err) {
    console.error(`\n\x1b[1m\x1b[31m========================================================================\x1b[0m`);
    console.error(`\x1b[1m\x1b[31m  ✖ VERIFICATION FAILED at Step ${currentStep}/${totalSteps}\x1b[0m`);
    console.error(`\x1b[1m\x1b[31m========================================================================\x1b[0m\n`);
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
}
