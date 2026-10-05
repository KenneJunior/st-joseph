/**
 * SJCCC Static Content & Quality Assurance Audit Types
 */

export type IssueSeverity = 'error' | 'warn' | 'info';

export interface AuditIssue {
    code: string;
    severity: IssueSeverity;
    message: string;
    selector?: string;
    context?: string;
}

export interface PageMetadata {
    title?: string;
    description?: string;
    canonical?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    ogUrl?: string;
    twitterCard?: string;
    themeColor?: string;
    manifest?: string;
}

export interface PageStats {
    headings: { h1: number; h2: number; h3: number; h4: number; h5: number; h6: number };
    totalLinks: number;
    internalAnchors: number;
    externalLinks: number;
    contactLinks: { tel: number; mailto: number; whatsapp: number };
    images: number;
    buttons: number;
    forms: number;
}

export interface PageAuditResult {
    pageName: string;
    filePath: string;
    metadata: PageMetadata;
    stats: PageStats;
    issues: AuditIssue[];
    errorCount: number;
    warningCount: number;
    passed: boolean;
}

export interface FullAuditReport {
    timestamp: string;
    summary: {
        totalPages: number;
        totalErrors: number;
        totalWarnings: number;
        passed: boolean;
    };
    pages: PageAuditResult[];
}
