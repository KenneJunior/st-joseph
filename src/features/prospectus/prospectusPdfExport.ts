/**
 * ============================================================================
 * SJCCC – Client-Side Prospectus PDF Generator & Downloader
 * (src/features/prospectus/prospectusPdfExport.ts)
 *
 * Generates a standards-compliant, multi-page A4 PDF (PDF 1.4) directly from
 * SJCCC's canonical datasets without external dependencies or network roundtrips.
 * Works seamlessly offline, on mobile, desktop, and inside embedded previews
 * where browser window.print() dialogs may be restricted.
 * ============================================================================
 */

import { COLLEGE_PROFILE } from '../../data/collegeProfile.ts';
import { TUITION_FEES } from '../../data/tuitionFees.ts';
import { TECHNICAL_DEPARTMENTS } from '../../data/academicPrograms.ts';
import { ADMISSION_REQUIREMENTS } from '../../data/admissionRequirements.ts';
import { ACADEMIC_MILESTONES_2026_2027 } from '../../data/academicCalendar.ts';

export const PROSPECTUS_PDF_FILENAME = 'SJCCC-Official-Prospectus-2026-2027.pdf';

interface RgbColor {
    readonly r: number;
    readonly g: number;
    readonly b: number;
}

const NAVY: RgbColor = { r: 7 / 255, g: 24 / 255, b: 46 / 255 };
const GOLD: RgbColor = { r: 201 / 255, g: 162 / 255, b: 41 / 255 };
const SLATE: RgbColor = { r: 51 / 255, g: 65 / 255, b: 85 / 255 };
const MUTED: RgbColor = { r: 100 / 255, g: 116 / 255, b: 139 / 255 };
const LIGHT_BG: RgbColor = { r: 244 / 255, g: 241 / 255, b: 234 / 255 };
const WHITE: RgbColor = { r: 1, g: 1, b: 1 };
const BORDER: RgbColor = { r: 215 / 255, g: 208 / 255, b: 192 / 255 };

const PAGE_WIDTH = 595.28; // A4 width in points
const PAGE_HEIGHT = 841.89; // A4 height in points
const MARGIN_X = 42;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const TOP_Y = PAGE_HEIGHT - 46;
const BOTTOM_Y = 54;

/**
 * Sanitizes Unicode punctuation into clean single-byte ASCII for Type1 WinAnsi PDF fonts,
 * guaranteeing exact byte-length matching in PDF content streams and xref tables.
 */
function sanitizePdfText(input: string): string {
    return input
        .replace(/[\u2018\u2019\u201A]/g, "'")
        .replace(/[\u201C\u201D\u201E]/g, '"')
        .replace(/[\u2013\u2014]/g, '-')
        .replace(/\u2022/g, '*')
        .replace(/\u2026/g, '...')
        .replace(/\u00A0/g, ' ')
        .replace(/[\u00E7\u00C7]/g, (m) => (m === '\u00E7' ? 'c' : 'C'))
        .replace(/[^\x20-\x7E]/g, '');
}

function escapePdfLiteral(input: string): string {
    return sanitizePdfText(input)
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)');
}

function wrapText(text: string, maxChars: number): string[] {
    const clean = sanitizePdfText(text).trim();
    if (!clean) return [''];
    const words = clean.split(/\s+/);
    const lines: string[] = [];
    let current = '';

    for (const word of words) {
        if (!current) {
            current = word;
        } else if (current.length + 1 + word.length <= maxChars) {
            current += ` ${word}`;
        } else {
            lines.push(current);
            current = word;
        }
    }
    if (current) {
        lines.push(current);
    }
    return lines;
}

class PdfPageBuilder {
    private pages: string[][] = [];
    private currentOps: string[] = [];
    private cursorY: number = TOP_Y;

    constructor() {
        this.startFirstPage();
    }

    private startFirstPage(): void {
        this.currentOps = [];
        this.pages.push(this.currentOps);

        // Institutional Navy Masthead Banner
        const bannerHeight = 84;
        const bannerBottom = PAGE_HEIGHT - bannerHeight;
        this.rectFill(0, bannerBottom, PAGE_WIDTH, bannerHeight, NAVY);
        this.rectFill(0, bannerBottom, PAGE_WIDTH, 3.5, GOLD);

        this.textCentered("SAINT JOSEPH'S CATHOLIC COMPREHENSIVE COLLEGE", PAGE_HEIGHT - 28, 13.5, 'F2', WHITE);
        this.textCentered(`(S.J.C.C.C) MBENGWI  |  ${COLLEGE_PROFILE.diocese.toUpperCase()}`, PAGE_HEIGHT - 46, 9.5, 'F2', GOLD);
        this.textCentered(
            `"${COLLEGE_PROFILE.mottoLatin} - ${COLLEGE_PROFILE.mottoEnglish}"`,
            PAGE_HEIGHT - 62,
            9,
            'F4',
            WHITE
        );
        this.textCentered(
            `OFFICIAL STUDENT PROSPECTUS  *  ${COLLEGE_PROFILE.currentAcademicYear} ACADEMIC YEAR`,
            PAGE_HEIGHT - 76,
            8,
            'F2',
            GOLD
        );

        this.cursorY = bannerBottom - 20;
    }

    private startContinuationPage(): void {
        this.currentOps = [];
        this.pages.push(this.currentOps);

        // Compact running header
        this.rectFill(0, PAGE_HEIGHT - 36, PAGE_WIDTH, 36, NAVY);
        this.rectFill(0, PAGE_HEIGHT - 36, PAGE_WIDTH, 2, GOLD);
        this.textLeft(
            `SJCCC MBENGWI  -  OFFICIAL PROSPECTUS (${COLLEGE_PROFILE.currentAcademicYear})`,
            MARGIN_X,
            PAGE_HEIGHT - 23,
            9,
            'F2',
            GOLD
        );
        this.cursorY = PAGE_HEIGHT - 56;
    }

    private ensureSpace(neededHeight: number): void {
        if (this.cursorY - neededHeight < BOTTOM_Y) {
            this.startContinuationPage();
        }
    }

    private setFill(c: RgbColor): string {
        return `${c.r.toFixed(3)} ${c.g.toFixed(3)} ${c.b.toFixed(3)} rg`;
    }

    private setStroke(c: RgbColor): string {
        return `${c.r.toFixed(3)} ${c.g.toFixed(3)} ${c.b.toFixed(3)} RG`;
    }

    private rectFill(x: number, y: number, w: number, h: number, color: RgbColor): void {
        this.currentOps.push(`${this.setFill(color)} ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
    }

    private lineStroke(x1: number, y1: number, x2: number, y2: number, width: number, color: RgbColor): void {
        this.currentOps.push(
            `${width.toFixed(2)} w ${this.setStroke(color)} ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`
        );
    }

    private textLeft(text: string, x: number, y: number, size: number, font: 'F1' | 'F2' | 'F3' | 'F4', color: RgbColor): void {
        this.currentOps.push(
            `BT /${font} ${size.toFixed(1)} Tf ${this.setFill(color)} 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${escapePdfLiteral(text)}) Tj ET`
        );
    }

    private textRight(text: string, rightX: number, y: number, size: number, font: 'F1' | 'F2', color: RgbColor): void {
        const clean = sanitizePdfText(text);
        const approxWidth = clean.length * size * 0.53;
        this.textLeft(clean, Math.max(MARGIN_X, rightX - approxWidth), y, size, font, color);
    }

    private textCentered(text: string, y: number, size: number, font: 'F1' | 'F2' | 'F3' | 'F4', color: RgbColor): void {
        const clean = sanitizePdfText(text);
        const approxWidth = clean.length * size * (font === 'F2' || font === 'F3' ? 0.54 : 0.49);
        const x = Math.max(MARGIN_X, (PAGE_WIDTH - approxWidth) / 2);
        this.textLeft(clean, x, y, size, font, color);
    }

    public addSectionHeading(title: string): void {
        this.ensureSpace(34);
        this.cursorY -= 6;
        const barH = 20;
        const barY = this.cursorY - barH + 5;
        this.rectFill(MARGIN_X, barY, CONTENT_WIDTH, barH, LIGHT_BG);
        this.rectFill(MARGIN_X, barY, 4, barH, GOLD);
        this.textLeft(title.toUpperCase(), MARGIN_X + 12, barY + 6, 10, 'F2', NAVY);
        this.cursorY = barY - 12;
    }

    public addSubheading(title: string): void {
        this.ensureSpace(20);
        this.textLeft(title, MARGIN_X, this.cursorY, 9.5, 'F2', NAVY);
        this.cursorY -= 14;
    }

    public addParagraph(text: string, fontSize: number = 9, indent: number = 0): void {
        const maxChars = Math.floor((CONTENT_WIDTH - indent) / (fontSize * 0.51));
        const lines = wrapText(text, maxChars);
        const lineHeight = fontSize + 3.5;

        for (const line of lines) {
            this.ensureSpace(lineHeight + 2);
            this.textLeft(line, MARGIN_X + indent, this.cursorY, fontSize, 'F1', SLATE);
            this.cursorY -= lineHeight;
        }
        this.cursorY -= 3;
    }

    public addBullet(text: string, label?: string): void {
        const fontSize = 8.8;
        const lineHeight = fontSize + 3.5;
        const full = label ? `${label}: ${text}` : text;
        const maxChars = Math.floor((CONTENT_WIDTH - 16) / (fontSize * 0.51));
        const lines = wrapText(full, maxChars);

        this.ensureSpace(lines.length * lineHeight + 2);
        lines.forEach((line, idx) => {
            if (idx === 0) {
                this.textLeft('*', MARGIN_X + 4, this.cursorY, fontSize, 'F2', GOLD);
            }
            this.textLeft(line, MARGIN_X + 15, this.cursorY, fontSize, 'F1', SLATE);
            this.cursorY -= lineHeight;
        });
        this.cursorY -= 1.5;
    }

    public addFeeTable(): void {
        const rowH = 16;
        const headerH = 18;
        const totalRows = TUITION_FEES.items.length + 2;
        this.ensureSpace(headerH + totalRows * rowH + 14);

        // Table Header
        const headerY = this.cursorY - headerH + 4;
        this.rectFill(MARGIN_X, headerY, CONTENT_WIDTH, headerH, NAVY);
        this.textLeft('FEE ITEM', MARGIN_X + 8, headerY + 5, 8.5, 'F2', WHITE);
        this.textRight('AMOUNT (FCFA)', MARGIN_X + CONTENT_WIDTH - 8, headerY + 5, 8.5, 'F2', GOLD);
        this.cursorY = headerY - 2;

        // Fee Rows
        TUITION_FEES.items.forEach((item, idx) => {
            const rowY = this.cursorY - rowH + 4;
            if (idx % 2 === 0) {
                this.rectFill(MARGIN_X, rowY, CONTENT_WIDTH, rowH, LIGHT_BG);
            }
            const label =
                item.id === 'tuition-1st-cycle'
                    ? 'Tuition 1st Cycle (Forms 1-5)*'
                    : item.id === 'tuition-2nd-cycle'
                      ? 'Tuition 2nd Cycle (Lower/Upper Sixth)*'
                      : item.label;
            this.textLeft(label, MARGIN_X + 8, rowY + 4.5, 8.5, 'F1', SLATE);
            this.textRight(item.amountFormatted, MARGIN_X + CONTENT_WIDTH - 8, rowY + 4.5, 8.5, 'F2', NAVY);
            this.lineStroke(MARGIN_X, rowY, MARGIN_X + CONTENT_WIDTH, rowY, 0.4, BORDER);
            this.cursorY = rowY;
        });

        // Total Baseline Row
        const totalY = this.cursorY - 19;
        this.rectFill(MARGIN_X, totalY, CONTENT_WIDTH, 19, NAVY);
        this.textLeft('TOTAL BASELINE (1ST CYCLE BOARDING)', MARGIN_X + 8, totalY + 6, 8.8, 'F2', WHITE);
        this.textRight(`${TUITION_FEES.baselineTotalFormatted} FCFA`, MARGIN_X + CONTENT_WIDTH - 8, totalY + 6, 9, 'F2', GOLD);
        this.cursorY = totalY - 12;
    }

    public finalizePageStreams(): string[] {
        const total = this.pages.length;
        return this.pages.map((ops, index) => {
            const footerOps: string[] = [];
            const lineY = 34;
            footerOps.push(`0.60 w ${BORDER.r.toFixed(3)} ${BORDER.g.toFixed(3)} ${BORDER.b.toFixed(3)} RG ${MARGIN_X.toFixed(2)} ${lineY.toFixed(2)} m ${(PAGE_WIDTH - MARGIN_X).toFixed(2)} ${lineY.toFixed(2)} l S`);

            const leftFooter = escapePdfLiteral(`${COLLEGE_PROFILE.legalName}  |  ${COLLEGE_PROFILE.contact.phoneFormatted}`);
            const rightFooter = escapePdfLiteral(`Page ${index + 1} of ${total}`);
            footerOps.push(`BT /F1 7.8 Tf ${MUTED.r.toFixed(3)} ${MUTED.g.toFixed(3)} ${MUTED.b.toFixed(3)} rg 1 0 0 1 ${MARGIN_X.toFixed(2)} 21.00 Tm (${leftFooter}) Tj ET`);
            const rightX = PAGE_WIDTH - MARGIN_X - rightFooter.length * 4.2;
            footerOps.push(`BT /F2 7.8 Tf ${NAVY.r.toFixed(3)} ${NAVY.g.toFixed(3)} ${NAVY.b.toFixed(3)} rg 1 0 0 1 ${rightX.toFixed(2)} 21.00 Tm (${rightFooter}) Tj ET`);

            return [...ops, ...footerOps].join('\n');
        });
    }
}

/**
 * Generates the official SJCCC 2026/2027 Prospectus PDF as raw PDF 1.4 bytes.
 */
export function buildProspectusPdfBytes(): Uint8Array {
    const doc = new PdfPageBuilder();

    // 1. About SJCCC
    doc.addSectionHeading('1. About SJCCC & Institutional Mission');
    doc.addParagraph(
        `${COLLEGE_PROFILE.legalName} is a ${COLLEGE_PROFILE.schoolType.toLowerCase()} situated in a serene academic environment free from urban distractions, dedicated to Christian values and holistic excellence. Established on ${COLLEGE_PROFILE.establishedDate}, the college operates under the ${COLLEGE_PROFILE.diocese}.`
    );
    doc.addSubheading('We Admit Students Ready To:');
    for (const criterion of ADMISSION_REQUIREMENTS.expectations.readinessCriteria) {
        doc.addBullet(criterion);
    }

    // 2. Entry Requirements & Academic Departments
    doc.addSectionHeading('2. Departments & Admission Entry Requirements');
    doc.addBullet(
        `${ADMISSION_REQUIREMENTS.firstCycle.primaryRequirement} Required: ${ADMISSION_REQUIREMENTS.firstCycle.requiredDocuments.join(', ')}.`,
        ADMISSION_REQUIREMENTS.firstCycle.name
    );
    doc.addBullet(
        `${ADMISSION_REQUIREMENTS.secondCycle.primaryRequirement} Required: ${ADMISSION_REQUIREMENTS.secondCycle.requiredDocuments.join(', ')}.`,
        ADMISSION_REQUIREMENTS.secondCycle.name
    );
    doc.addSubheading('Academic & Technical Pathways');
    doc.addBullet('GCE Ordinary Level & Advanced Level Grammar (Arts, Science & Commercial streams)');
    for (const dept of TECHNICAL_DEPARTMENTS) {
        doc.addBullet(dept.description, `${dept.fullName} [Forms 1-3]`);
    }

    // 3. Books, Uniform & Official Shoes
    doc.addSectionHeading('3. Books, Uniform & Official Apparel');
    doc.addBullet('Pens (blue, black, red), pencils, sharpeners, erasers, and rulers; Form 1-2 use 80-leaf exercise books; Form 3-Upper Sixth use 600-type ledgers (at least 2 per subject).', 'Stationery');
    doc.addBullet('2 pairs daily trousers, 2 white short-sleeve shirts, blue pullover (1st Cycle) or white pullover (2nd Cycle).', 'Boys Uniform');
    doc.addBullet('2 navy blue pleated skirts, 2 white square-neck blouses, blue pullover (1st Cycle) or white pullover (2nd Cycle).', 'Girls Uniform');
    doc.addBullet('Brown sandals worn daily during classes; black shoes with white socks for Sundays and feast days. Sportswear obtained on campus by House (Peter: White, Francois: Yellow, Chanel: Red, Champagnat: Green).', 'Footwear & Sports');

    // 4. Boarding & Toiletry Equipments
    doc.addSectionHeading('4. Boarding & Toiletry Requirements');
    doc.addBullet('Thick blanket, mattress (1.90m x 70cm; Form 1 mattress must have plastic cover), 2 bed sheets (blue/green), pillow & 2 pillowcases, 2 towels, big laundry bucket, umbrella/raincoat, torchlight, padlock & keys.');
    doc.addBullet('Cutlery: 2 silver plates, 2 spoons, table knife, fork, teacup, teaspoons, and 2 cups with handles.');
    doc.addBullet('Hygiene: 2 pyjamas sets, 6 handkerchiefs, 10 toilet tissue rolls, 6 bars laundry/bathing soap, water flask, comb, hair oil & non-bleaching skin lotion, toothbrush, toothpaste, shoe brush/polish.');

    // 5. School Rules & Parents' Guide
    doc.addSectionHeading("5. School Rules & Parents' Guide");
    doc.addBullet('Strictly Prohibited (confiscated without return): cell phones, electrical appliances (irons, cameras, radios), non-uniform clothing, cooked food/garri, jewelry, nail-hardener/make-up, and unauthorized visitors.');
    doc.addBullet('Visiting Days occur once per term (Holy Mass 9:00 AM to 4:30 PM), strictly for parents and immediate guardians.');
    doc.addBullet('Students whose parents reside outside Bamenda must have a registered responsible guardian in Mbengwi or Bamenda.');

    // 6. Fee Schedule & Banking
    doc.addSectionHeading(`6. Official Fee Schedule (${TUITION_FEES.session} - All in ${TUITION_FEES.currency})`);
    doc.addFeeTable();
    doc.addParagraph(
        '*Note: Tuition is charged once per enrolled student for their applicable cycle (1st Cycle OR 2nd Cycle at 63,000 FCFA), not combined. GCE practical subjects may incur small additional laboratory/field fees.'
    );
    doc.addBullet(
        `${TUITION_FEES.banking.institution}, Account No: ${TUITION_FEES.banking.accountNumber} (${TUITION_FEES.banking.accountName}) at ${TUITION_FEES.banking.prospectusBranchText}. NO CASH is accepted in the college.`,
        'Mandatory Bank Deposit'
    );
    doc.addBullet(TUITION_FEES.banking.examClassesPolicy, 'Candidate Classes');

    // 7. Health, Pocket Money & Important Dates
    doc.addSectionHeading('7. Health, Finance & Important Calendar Dates');
    doc.addBullet('On-campus infirmary with school nurse and BEPHA mutual Catholic health insurance. Note: Students requiring special diets cannot be admitted.', 'Health');
    doc.addBullet('All pocket money must be deposited with the College Bursar (maximum 25,000 FCFA per term); 1,500 FCFA manual labour equipment fee applies to new students.', 'Finance');
    doc.addBullet(
        `Form 1 Entrance Interview: ${ADMISSION_REQUIREMENTS.expectations.interviewDate} at ${ADMISSION_REQUIREMENTS.expectations.interviewTime} (${ADMISSION_REQUIREMENTS.expectations.interviewLocation}).`,
        'Admissions'
    );

    const keyDates = ACADEMIC_MILESTONES_2026_2027.slice(0, 8)
        .map((m) => `${m.title}: ${m.dateText}`)
        .join(' | ');
    doc.addBullet(keyDates, '2026/2027 Key Milestones');

    // 8. Official Contact & Signature
    doc.addSectionHeading('8. Contact & Administration');
    doc.addBullet(`Phone & WhatsApp: ${COLLEGE_PROFILE.contact.phoneFormatted}`);
    doc.addBullet(`Email: ${COLLEGE_PROFILE.contact.email}  |  Web: ${COLLEGE_PROFILE.contact.website}`);
    doc.addBullet(`Postal Address: ${COLLEGE_PROFILE.contact.postalAddress}`);
    doc.addParagraph(
        `Signed: ${COLLEGE_PROFILE.principalName}, ${COLLEGE_PROFILE.principalTitle}`,
        9.2
    );

    const pageStreams = doc.finalizePageStreams();

    // Assemble PDF objects with exact UTF-8/ASCII byte offsets
    const objects: string[] = [];
    // 1: Catalog
    objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

    const pageObjectStartId = 7;
    const pageIds: number[] = [];
    for (let i = 0; i < pageStreams.length; i++) {
        pageIds.push(pageObjectStartId + i * 2);
    }

    // 2: Pages tree
    objects.push(`2 0 obj\n<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>\nendobj\n`);

    // 3-6: Standard Type1 Fonts
    objects.push('3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n');
    objects.push('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n');
    objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding >>\nendobj\n');
    objects.push('6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Times-Italic /Encoding /WinAnsiEncoding >>\nendobj\n');

    const encoder = new TextEncoder();

    pageStreams.forEach((stream, i) => {
        const pageObjId = pageObjectStartId + i * 2;
        const contentObjId = pageObjId + 1;
        const streamBytes = encoder.encode(stream);

        objects.push(
            `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH.toFixed(2)} ${PAGE_HEIGHT.toFixed(2)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R /F4 6 0 R >> >> /Contents ${contentObjId} 0 R >>\nendobj\n`
        );
        objects.push(
            `${contentObjId} 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n${stream}\nendstream\nendobj\n`
        );
    });

    const headerBytes = new Uint8Array([
        0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, // %PDF-1.4\n
        0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a, // binary comment marker
    ]);

    const chunks: Uint8Array[] = [headerBytes];
    const offsets: number[] = [0];
    let currentOffset = headerBytes.length;

    for (const objStr of objects) {
        offsets.push(currentOffset);
        const bytes = encoder.encode(objStr);
        chunks.push(bytes);
        currentOffset += bytes.length;
    }

    const xrefOffset = currentOffset;
    const xrefLines: string[] = [
        'xref',
        `0 ${objects.length + 1}`,
        '0000000000 65535 f ',
    ];
    for (let i = 1; i < offsets.length; i++) {
        xrefLines.push(`${String(offsets[i]).padStart(10, '0')} 00000 n `);
    }

    const trailer = [
        ...xrefLines,
        'trailer',
        `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
        'startxref',
        String(xrefOffset),
        '%%EOF\n',
    ].join('\n');

    chunks.push(encoder.encode(trailer));

    const totalBytes = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalBytes);
    let pos = 0;
    for (const chunk of chunks) {
        result.set(chunk, pos);
        pos += chunk.length;
    }

    return result;
}

export function createProspectusPdfBlob(): Blob {
    const bytes = buildProspectusPdfBytes();
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    return new Blob([buffer], { type: 'application/pdf' });
}

/**
 * Triggers an immediate browser download of the official SJCCC Prospectus PDF.
 * Returns true if the download anchor was successfully dispatched.
 */
export function downloadProspectusPdf(filename: string = PROSPECTUS_PDF_FILENAME): boolean {
    if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
        return false;
    }

    try {
        const blob = createProspectusPdfBlob();
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        link.rel = 'noopener';
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();
        link.remove();

        window.setTimeout(() => {
            try {
                URL.revokeObjectURL(blobUrl);
            } catch {
                // Ignore revoke cleanup failure
            }
        }, 15000);

        return true;
    } catch {
        return false;
    }
}
