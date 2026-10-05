/**
 * SJCCC Static Content & Accessibility Auditor Engine
 * Performs forensic quality checks on HTML documents without running a browser.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import * as cheerio from 'cheerio';
import type { PageAuditResult, AuditIssue, FullAuditReport } from './types.ts';

export class ContentAuditor {
    private projectRoot: string;

    constructor(projectRoot = process.cwd()) {
        this.projectRoot = projectRoot;
    }

    /**
     * Audits a single HTML document
     */
    public auditFile(relativeHtmlPath: string, pageName: string): PageAuditResult {
        const fullPath = resolve(this.projectRoot, relativeHtmlPath);
        if (!existsSync(fullPath)) {
            return {
                pageName,
                filePath: relativeHtmlPath,
                metadata: {},
                stats: {
                    headings: { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 },
                    totalLinks: 0,
                    internalAnchors: 0,
                    externalLinks: 0,
                    contactLinks: { tel: 0, mailto: 0, whatsapp: 0 },
                    images: 0,
                    buttons: 0,
                    forms: 0,
                },
                issues: [{
                    code: 'FILE_NOT_FOUND',
                    severity: 'error',
                    message: `File does not exist: ${relativeHtmlPath}`
                }],
                errorCount: 1,
                warningCount: 0,
                passed: false
            };
        }

        const html = readFileSync(fullPath, 'utf-8');
        const $ = cheerio.load(html);
        const issues: AuditIssue[] = [];

        // 1. Metadata Inspection
        const title = $('title').first().text().trim();
        const description = $('meta[name="description"]').attr('content')?.trim();
        const canonical = $('link[rel="canonical"]').attr('href')?.trim();
        const ogTitle = $('meta[property="og:title"]').attr('content')?.trim();
        const ogDescription = $('meta[property="og:description"]').attr('content')?.trim();
        const ogImage = $('meta[property="og:image"]').attr('content')?.trim();
        const ogUrl = $('meta[property="og:url"]').attr('content')?.trim();
        const twitterCard = $('meta[name="twitter:card"]').attr('content')?.trim();
        const themeColor = $('meta[name="theme-color"]').attr('content')?.trim();
        const manifest = $('link[rel="manifest"]').attr('href')?.trim();

        if (!title) {
            issues.push({ code: 'META_TITLE_MISSING', severity: 'error', message: 'Page lacks a <title> tag.' });
        } else if (title.length < 15) {
            issues.push({ code: 'META_TITLE_SHORT', severity: 'warn', message: `Title is very short (${title.length} chars): "${title}"` });
        }

        if (!description) {
            issues.push({ code: 'META_DESC_MISSING', severity: 'error', message: 'Missing meta name="description" tag.' });
        } else if (description.length < 40) {
            issues.push({ code: 'META_DESC_SHORT', severity: 'warn', message: `Meta description is very short (${description.length} chars).` });
        }

        if (!canonical) {
            issues.push({ code: 'META_CANONICAL_MISSING', severity: 'warn', message: 'Missing link rel="canonical".' });
        }

        if (!ogTitle || !ogDescription || !ogImage) {
            issues.push({ code: 'META_OG_INCOMPLETE', severity: 'warn', message: 'Incomplete Open Graph tags (og:title, og:description, og:image).' });
        }

        // 2. Heading Hierarchy & Structure
        const headings = {
            h1: $('h1').length,
            h2: $('h2').length,
            h3: $('h3').length,
            h4: $('h4').length,
            h5: $('h5').length,
            h6: $('h6').length,
        };

        if (headings.h1 === 0) {
            issues.push({ code: 'HEADING_NO_H1', severity: 'error', message: 'Page has no <h1> element.' });
        } else if (headings.h1 > 1) {
            issues.push({ code: 'HEADING_MULTIPLE_H1', severity: 'warn', message: `Page has ${headings.h1} <h1> elements (expected exactly 1).` });
        }

        // 3. Duplicate ID Detection
        const seenIds = new Map<string, number>();
        $('[id]').each((_, el) => {
            const id = $(el).attr('id')?.trim();
            if (id) {
                seenIds.set(id, (seenIds.get(id) || 0) + 1);
            }
        });

        for (const [id, count] of seenIds.entries()) {
            if (count > 1) {
                issues.push({
                    code: 'DOM_DUPLICATE_ID',
                    severity: 'error',
                    message: `Duplicate id="${id}" detected ${count} times in DOM.`,
                    selector: `#${id}`,
                });
            }
        }

        // 4. Links & Anchors Integrity
        let totalLinks = 0;
        let internalAnchors = 0;
        let externalLinks = 0;
        const contactLinks = { tel: 0, mailto: 0, whatsapp: 0 };

        $('a[href]').each((_, el) => {
            totalLinks++;
            const href = $(el).attr('href')?.trim() || '';

            if (href.startsWith('#')) {
                internalAnchors++;
                if (href.length > 1) {
                    const targetId = href.substring(1);
                    if (!seenIds.has(targetId)) {
                        issues.push({
                            code: 'LINK_BROKEN_ANCHOR',
                            severity: 'error',
                            message: `Internal anchor "${href}" points to nonexistent id="${targetId}".`,
                            context: $(el).text().trim().substring(0, 40) || $(el).attr('aria-label') || href,
                        });
                    }
                }
            } else if (href.startsWith('tel:')) {
                contactLinks.tel++;
                // Verify Cameroon international format: tel:+237...
                if (!href.startsWith('tel:+237') && !href.startsWith('tel:237')) {
                    issues.push({
                        code: 'LINK_TEL_FORMAT',
                        severity: 'warn',
                        message: `Telephone link "${href}" does not use Cameroon +237 international prefix.`,
                    });
                }
            } else if (href.startsWith('mailto:')) {
                contactLinks.mailto++;
                if (!href.includes('@')) {
                    issues.push({
                        code: 'LINK_MAILTO_INVALID',
                        severity: 'error',
                        message: `Invalid mailto link format: "${href}".`,
                    });
                }
            } else if (href.includes('wa.me') || href.includes('whatsapp.com')) {
                contactLinks.whatsapp++;
                if (!href.includes('237')) {
                    issues.push({
                        code: 'LINK_WHATSAPP_FORMAT',
                        severity: 'warn',
                        message: `WhatsApp link "${href}" does not include Cameroon country code 237.`,
                    });
                }
            } else if (href.startsWith('http://') || href.startsWith('https://')) {
                externalLinks++;
            }
        });

        // 5. Image Verification & Alt Texts
        const imgElements = $('img');
        const imagesCount = imgElements.length;

        imgElements.each((_, el) => {
            const src = $(el).attr('src')?.trim();
            const alt = $(el).attr('alt');

            if (alt === undefined) {
                issues.push({
                    code: 'IMG_ALT_MISSING',
                    severity: 'error',
                    message: `Image missing alt attribute: src="${src || 'unknown'}"`,
                });
            }

            // Verify local asset exists on disk
            if (src && !src.startsWith('http') && !src.startsWith('data:')) {
                // If path starts with public or /, check public/
                let cleanSrc = src.replace(/^\//, '');
                if (!cleanSrc.startsWith('public/')) {
                    cleanSrc = `public/${cleanSrc}`;
                }
                const imgPath = resolve(this.projectRoot, cleanSrc);
                if (!existsSync(imgPath)) {
                    issues.push({
                        code: 'IMG_SRC_404',
                        severity: 'error',
                        message: `Referenced local image does not exist on disk: "${src}" (checked: ${cleanSrc})`,
                    });
                }
            }
        });

        // 6. Buttons & Interactive Elements Accessibility
        const buttons = $('button');
        buttons.each((_, el) => {
            const text = $(el).text().trim();
            const ariaLabel = $(el).attr('aria-label')?.trim();
            const title = $(el).attr('title')?.trim();

            if (!text && !ariaLabel && !title) {
                issues.push({
                    code: 'A11Y_BUTTON_NAMELESS',
                    severity: 'error',
                    message: 'Button element has no accessible text, aria-label, or title.',
                    selector: $(el).attr('id') ? `#${$(el).attr('id')}` : $(el).attr('class') || '<button>',
                });
            }
        });

        // 7. Form Controls Accessibility
        const forms = $('form');
        $('input, select, textarea').each((_, el) => {
            const type = $(el).attr('type');
            if (type === 'hidden') return;

            const id = $(el).attr('id');
            const ariaLabel = $(el).attr('aria-label');
            const ariaLabelledby = $(el).attr('aria-labelledby');
            const hasAssociatedLabel = id ? $(`label[for="${id}"]`).length > 0 : false;
            const hasParentLabel = $(el).closest('label').length > 0;

            if (!ariaLabel && !ariaLabelledby && !hasAssociatedLabel && !hasParentLabel) {
                issues.push({
                    code: 'A11Y_INPUT_UNLABELLED',
                    severity: 'warn',
                    message: `Form control has no associated label or aria-label: name="${$(el).attr('name') || id || type}"`,
                });
            }
        });

        // 8. Prospectus-Specific Semantic Checks
        if (pageName.toLowerCase().includes('prospectus')) {
            const requiredSections = [
                'about-sjccc',
                'departments-entry',
                'books-stationery',
                'uniform-apparel',
                'boarding-toiletry',
                'school-rules',
                'fees-structure',
                'health-finance',
                'important-dates'
            ];

            for (const secId of requiredSections) {
                if (!seenIds.has(secId)) {
                    issues.push({
                        code: 'PROSPECTUS_SECTION_MISSING',
                        severity: 'error',
                        message: `Statutory prospectus section missing: id="${secId}"`,
                    });
                }
            }

            // Verify fee table structure
            const feeTable = $('#fees-structure table.data-table');
            if (feeTable.length === 0) {
                issues.push({
                    code: 'PROSPECTUS_TABLE_MISSING',
                    severity: 'error',
                    message: 'Official fee schedule table (table.data-table) not found in #fees-structure.',
                });
            }

            // Verify bank payment info
            const bodyText = $.text();
            if (!bodyText.includes('OPUS SECURITATIS') && !bodyText.includes('100117')) {
                issues.push({
                    code: 'PROSPECTUS_BANK_INFO_MISSING',
                    severity: 'warn',
                    message: 'Official OPUS SECURITATIS bank account details (100117) not found in page text.',
                });
            }
        }

        const errorCount = issues.filter(i => i.severity === 'error').length;
        const warningCount = issues.filter(i => i.severity === 'warn').length;

        return {
            pageName,
            filePath: relativeHtmlPath,
            metadata: {
                title,
                description,
                canonical,
                ogTitle,
                ogDescription,
                ogImage,
                ogUrl,
                twitterCard,
                themeColor,
                manifest,
            },
            stats: {
                headings,
                totalLinks,
                internalAnchors,
                externalLinks,
                contactLinks,
                images: imagesCount,
                buttons: buttons.length,
                forms: forms.length,
            },
            issues,
            errorCount,
            warningCount,
            passed: errorCount === 0,
        };
    }

    /**
     * Audits all known application entrypoints
     */
    public auditAll(): FullAuditReport {
        const pages = [
            this.auditFile('index.html', 'Homepage (Digital Campus)'),
            this.auditFile('prospectus.html', 'Prospectus (Student Handbook)'),
        ];

        const totalErrors = pages.reduce((acc, p) => acc + p.errorCount, 0);
        const totalWarnings = pages.reduce((acc, p) => acc + p.warningCount, 0);

        return {
            timestamp: new Date().toISOString(),
            summary: {
                totalPages: pages.length,
                totalErrors,
                totalWarnings,
                passed: totalErrors === 0,
            },
            pages,
        };
    }
}
