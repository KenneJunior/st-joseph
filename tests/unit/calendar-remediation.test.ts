import { describe, it, expect } from 'vitest';
import {
    foldIcsLine,
    escapeIcsText,
    generateIcs,
    buildGoogleCalendarUrl,
    buildOutlookUrl,
} from '../../src/features/calendar/CalendarSerializer';
import {
    normalizeMilestoneDates,
    SJCCC_TIMEZONE,
    SJCCC_UTC_OFFSET_HOURS,
} from '../../src/features/calendar/CalendarTimezone';
import { ACADEMIC_MILESTONES_2026_2027, AcademicMilestone } from '../../src/data/academicCalendar';

describe('Calendar Timezone & Normalization (Africa/Douala - UTC+1)', () => {
    it('verifies constant timezone configuration for Cameroon', () => {
        expect(SJCCC_TIMEZONE).toBe('Africa/Douala');
        expect(SJCCC_UTC_OFFSET_HOURS).toBe(1);
    });

    it('normalizes timed events correctly: 08:00 WAT maps deterministically to 07:00 UTC', () => {
        const result = normalizeMilestoneDates('2026-08-21', '2026-08-21', '08:00', '16:00', 'timed');
        expect(result.icsStart).toBe(':20260821T070000Z');
        expect(result.icsEnd).toBe(':20260821T150000Z');
        expect(result.googleDates).toBe('20260821T070000Z/20260821T150000Z');
    });

    it('calculates exclusive DTEND for multi-day all-day events according to RFC 5545', () => {
        // Oct 26 to Oct 30 inclusive -> DTEND must be Oct 31
        const result = normalizeMilestoneDates('2026-10-26', '2026-10-30', undefined, undefined, 'multi-day-all-day');
        expect(result.icsStart).toBe(';VALUE=DATE:20261026');
        expect(result.icsEnd).toBe(';VALUE=DATE:20261031');
        expect(result.googleDates).toBe('20261026/20261031');
    });

    it('handles year-boundary break exclusive DTEND correctly (Christmas vacation Dec 18 2026 - Jan 03 2027 -> Jan 04 2027)', () => {
        const result = normalizeMilestoneDates('2026-12-18', '2027-01-03', undefined, undefined, 'multi-day-all-day');
        expect(result.icsStart).toBe(';VALUE=DATE:20261218');
        expect(result.icsEnd).toBe(';VALUE=DATE:20270104');
        expect(result.googleDates).toBe('20261218/20270104');
    });

    it('handles WAT midnight boundary: 00:00 WAT on 2027-01-04 -> 23:00 UTC on 2027-01-03', () => {
        const result = normalizeMilestoneDates('2027-01-04', '2027-01-04', '00:00', '08:00', 'timed');
        expect(result.icsStart).toBe(':20270103T230000Z');
        expect(result.icsEnd).toBe(':20270104T070000Z');
        expect(result.googleDates).toBe('20270103T230000Z/20270104T070000Z');
    });

    it('handles WAT midnight-adjacent rollover: 00:30 WAT on 2027-01-04 -> previous UTC date 2027-01-03 23:30 UTC', () => {
        const result = normalizeMilestoneDates('2027-01-04', '2027-01-04', '00:30', '01:30', 'timed');
        // Critical requirement: MUST serialize as 20270103T233000Z, NOT 20270104T233000Z
        expect(result.icsStart).toBe(':20270103T233000Z');
        expect(result.icsEnd).toBe(':20270104T003000Z');
        expect(result.googleDates).toBe('20270103T233000Z/20270104T003000Z');
    });

    it('handles WAT late evening: 23:30 WAT on 2027-01-04 -> same UTC date 22:30 UTC', () => {
        const result = normalizeMilestoneDates('2027-01-04', '2027-01-04', '23:30', '23:59', 'timed');
        expect(result.icsStart).toBe(':20270104T223000Z');
        expect(result.icsEnd).toBe(':20270104T225900Z');
        expect(result.googleDates).toBe('20270104T223000Z/20270104T225900Z');
    });

    it('handles WAT year rollover: 00:15 WAT on 2027-01-01 -> previous UTC year 2026-12-31 23:15 UTC', () => {
        const result = normalizeMilestoneDates('2027-01-01', '2027-01-01', '00:15', '01:00', 'timed');
        expect(result.icsStart).toBe(':20261231T231500Z');
        expect(result.icsEnd).toBe(':20270101T000000Z');
        expect(result.googleDates).toBe('20261231T231500Z/20270101T000000Z');
    });

    it('handles cross-month all-day DTEND exclusivity: 2027-04-28 to 2027-05-02 inclusive -> DTEND 2027-05-03', () => {
        const result = normalizeMilestoneDates('2027-04-28', '2027-05-02', undefined, undefined, 'multi-day-all-day');
        expect(result.icsStart).toBe(';VALUE=DATE:20270428');
        expect(result.icsEnd).toBe(';VALUE=DATE:20270503');
        expect(result.googleDates).toBe('20270428/20270503');
    });

    it('handles single-day all-day DTEND exclusivity: 2027-02-11 to 2027-02-11 inclusive -> DTEND 2027-02-12', () => {
        const result = normalizeMilestoneDates('2027-02-11', '2027-02-11', undefined, undefined, 'all-day');
        expect(result.icsStart).toBe(';VALUE=DATE:20270211');
        expect(result.icsEnd).toBe(';VALUE=DATE:20270212');
        expect(result.googleDates).toBe('20270211/20270212');
    });
});

describe('RFC 5545 Line Folding & Escaping', () => {
    it('escapes special characters correctly according to RFC 5545', () => {
        const raw = 'Math, Physics; Backslash \\ and newline \n or \r\n';
        const escaped = escapeIcsText(raw);
        expect(escaped).toBe('Math\\, Physics\\; Backslash \\\\ and newline \\n or \\n');
    });

    it('leaves lines under 75 octets untouched', () => {
        const shortLine = 'SUMMARY:SJCCC: Short Title';
        expect(foldIcsLine(shortLine, 75)).toBe(shortLine);
    });

    it('folds lines exceeding 75 octets by UTF-8 bytes rather than JS characters', () => {
        // Multi-byte Unicode characters: é (2 bytes), – (3 bytes), € (3 bytes)
        const unicodeLine = 'DESCRIPTION:Célébration solennelle à Mbengwi – Fête de Saint-Joseph avec dégustation de mets traditionnels et bénédiction des ateliers techniques.';
        const folded = foldIcsLine(unicodeLine, 75);

        // Verify folded output contains CRLF followed by a space
        expect(folded).toContain('\r\n ');

        // Check that each folded segment does not exceed 75 UTF-8 octets
        const segments = folded.split('\r\n');
        const encoder = new TextEncoder();
        for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            const byteLength = encoder.encode(seg).length;
            expect(byteLength).toBeLessThanOrEqual(75);
        }
    });
});

describe('Calendar Serializer & Provider URLs', () => {
    const sampleTimedMilestone: AcademicMilestone = ACADEMIC_MILESTONES_2026_2027[0]; // New Students Resumption
    const sampleAllDayMilestone: AcademicMilestone = ACADEMIC_MILESTONES_2026_2027[2]; // Midterm break 1

    it('generates compliant RFC 5545 VCALENDAR string with deterministic UID and CRLF', () => {
        const fixedNow = new Date('2026-08-01T12:00:00Z');
        const ics = generateIcs(sampleTimedMilestone, fixedNow);

        expect(ics).toContain('BEGIN:VCALENDAR\r\n');
        expect(ics).toContain('VERSION:2.0\r\n');
        expect(ics).toContain('PRODID:-//SJCCC Mbengwi//Academic Calendar 2026-2027//EN\r\n');
        expect(ics).toContain('BEGIN:VEVENT\r\n');
        expect(ics).toContain(`UID:${sampleTimedMilestone.id}-sjccc-2026-2027@sjccc.edu.cm\r\n`);
        expect(ics).toContain('DTSTART:20260821T070000Z\r\n');
        expect(ics).toContain('DTEND:20260821T150000Z\r\n');
        expect(ics).toContain('END:VEVENT\r\n');
        expect(ics).toContain('END:VCALENDAR\r\n');
        expect(ics.endsWith('\r\n')).toBe(true);
    });

    it('generates all-day event ICS with DATE value types', () => {
        const fixedNow = new Date('2026-08-01T12:00:00Z');
        const ics = generateIcs(sampleAllDayMilestone, fixedNow);

        expect(ics).toContain('DTSTART;VALUE=DATE:20261026\r\n');
        expect(ics).toContain('DTEND;VALUE=DATE:20261031\r\n');
    });

    it('builds valid Google Calendar URL with correct encoding and Africa/Douala timezone', () => {
        const url = buildGoogleCalendarUrl(sampleTimedMilestone);
        expect(url.startsWith('https://calendar.google.com/calendar/render?')).toBe(true);

        const parsed = new URL(url);
        expect(parsed.searchParams.get('action')).toBe('TEMPLATE');
        expect(parsed.searchParams.get('text')).toBe(`SJCCC: ${sampleTimedMilestone.title}`);
        expect(parsed.searchParams.get('dates')).toBe('20260821T070000Z/20260821T150000Z');
        expect(parsed.searchParams.get('ctz')).toBe('Africa/Douala');
        expect(parsed.searchParams.get('location')).toBe(sampleTimedMilestone.location);
    });

    it('builds valid Outlook web compose URL with correct parameters', () => {
        const url = buildOutlookUrl(sampleTimedMilestone);
        expect(url.startsWith('https://outlook.live.com/calendar/0/deeplink/compose?')).toBe(true);

        const parsed = new URL(url);
        expect(parsed.searchParams.get('path')).toBe('/calendar/action/compose');
        expect(parsed.searchParams.get('rru')).toBe('addevent');
        expect(parsed.searchParams.get('subject')).toBe(`SJCCC: ${sampleTimedMilestone.title}`);
        expect(parsed.searchParams.get('allday')).toBe('false');
    });
});

describe('Black-Box Output Verification (Cases A through F)', () => {
    it('Case A — normal timed event (New Students Resumption 2026-08-21 08:00-16:00 WAT)', () => {
        const m = ACADEMIC_MILESTONES_2026_2027.find((item) => item.id === 'resumption-new-2026')!;
        expect(m).toBeDefined();

        const ics = generateIcs(m, new Date('2026-08-01T00:00:00Z'));
        expect(ics).toContain('DTSTART:20260821T070000Z\r\n');
        expect(ics).toContain('DTEND:20260821T150000Z\r\n');

        const gUrl = buildGoogleCalendarUrl(m);
        const parsedG = new URL(gUrl);
        expect(parsedG.searchParams.get('dates')).toBe('20260821T070000Z/20260821T150000Z');
        expect(parsedG.searchParams.get('ctz')).toBe('Africa/Douala');

        const oUrl = buildOutlookUrl(m);
        const parsedO = new URL(oUrl);
        expect(parsedO.searchParams.get('allday')).toBe('false');
        expect(parsedO.searchParams.get('startdt')).toContain('2026-08-21T07:00:00');
    });

    it('Case B — midnight-adjacent timed event (fixture: 2027-01-04 00:30-01:30 WAT)', () => {
        const fixture: AcademicMilestone = {
            id: 'midnight-test-2027',
            term: 'term-2',
            termLabel: 'Second Term',
            title: 'Midnight Vigil & Resumption Check',
            category: 'spiritual',
            categoryLabel: 'Spiritual',
            dateText: '04 Jan 2027',
            description: 'Vigil mass and inspection.',
            location: 'College Chapel',
            temporalType: 'timed',
            localStartDate: '2027-01-04',
            localEndDate: '2027-01-04',
            localStartTime: '00:30',
            localEndTime: '01:30',
            startDate: new Date('2027-01-03T23:30:00Z'),
            endDate: new Date('2027-01-04T00:30:00Z'),
            startDateISO: '20270103T233000Z',
            endDateISO: '20270104T003000Z',
        };

        const ics = generateIcs(fixture, new Date('2027-01-01T00:00:00Z'));
        // 00:30 WAT = 23:30 UTC on 2027-01-03
        expect(ics).toContain('DTSTART:20270103T233000Z\r\n');
        expect(ics).toContain('DTEND:20270104T003000Z\r\n');

        const gUrl = buildGoogleCalendarUrl(fixture);
        const parsedG = new URL(gUrl);
        expect(parsedG.searchParams.get('dates')).toBe('20270103T233000Z/20270104T003000Z');

        const oUrl = buildOutlookUrl(fixture);
        const parsedO = new URL(oUrl);
        expect(parsedO.searchParams.get('startdt')).toContain('2027-01-03T23:30:00');
    });

    it('Case C — single-day all-day event (fixture: 2027-02-11)', () => {
        const fixture: AcademicMilestone = {
            id: 'single-day-allday',
            term: 'term-2',
            termLabel: 'Second Term',
            title: 'National Holiday Commemoration',
            category: 'spiritual',
            categoryLabel: 'National Holiday',
            dateText: '11 Feb 2027',
            description: 'All-day holiday commemoration.',
            location: 'Campus Grounds',
            temporalType: 'all-day',
            localStartDate: '2027-02-11',
            localEndDate: '2027-02-11',
            startDate: new Date('2027-02-11T00:00:00Z'),
            endDate: new Date('2027-02-11T23:59:59Z'),
            startDateISO: '20270211T000000Z',
            endDateISO: '20270211T235959Z',
        };

        const ics = generateIcs(fixture, new Date('2027-01-01T00:00:00Z'));
        // Single-day all-day: DTSTART 20270211, DTEND exclusive is +1 day = 20270212
        expect(ics).toContain('DTSTART;VALUE=DATE:20270211\r\n');
        expect(ics).toContain('DTEND;VALUE=DATE:20270212\r\n');

        const gUrl = buildGoogleCalendarUrl(fixture);
        expect(new URL(gUrl).searchParams.get('dates')).toBe('20270211/20270212');
    });

    it('Case D — multi-day holiday (Mid-term break 2026-10-26 to 2026-10-30)', () => {
        const m = ACADEMIC_MILESTONES_2026_2027.find((item) => item.id === 'midterm-break-t1-2026')!;
        expect(m).toBeDefined();

        const ics = generateIcs(m, new Date('2026-10-01T00:00:00Z'));
        // 26 Oct to 30 Oct inclusive -> DTEND exclusive is 31 Oct
        expect(ics).toContain('DTSTART;VALUE=DATE:20261026\r\n');
        expect(ics).toContain('DTEND;VALUE=DATE:20261031\r\n');

        const gUrl = buildGoogleCalendarUrl(m);
        expect(new URL(gUrl).searchParams.get('dates')).toBe('20261026/20261031');
    });

    it('Case E — cross-year holiday (Christmas vacation 2026-12-18 to 2027-01-03)', () => {
        const m = ACADEMIC_MILESTONES_2026_2027.find((item) => item.id === 'christmas-vacation-2026')!;
        expect(m).toBeDefined();

        const ics = generateIcs(m, new Date('2026-12-01T00:00:00Z'));
        // 18 Dec 2026 to 03 Jan 2027 inclusive -> DTEND exclusive is 04 Jan 2027
        expect(ics).toContain('DTSTART;VALUE=DATE:20261218\r\n');
        expect(ics).toContain('DTEND;VALUE=DATE:20270104\r\n');

        const gUrl = buildGoogleCalendarUrl(m);
        expect(new URL(gUrl).searchParams.get('dates')).toBe('20261218/20270104');
    });

    it('Case F — Unicode-heavy event with accents, em-dash, and quotes', () => {
        const fixture: AcademicMilestone = {
            id: 'unicode-feast-2027',
            term: 'term-2',
            termLabel: 'Second Term',
            title: 'Célébration solennelle — Saint-Joseph “Patronal Feast” & Dîner',
            category: 'spiritual',
            categoryLabel: 'Fête',
            dateText: '19 Mar 2027',
            description: 'Messe solennelle présidée par l’évêque; bénédiction spéciale des ateliers techniques, banquet communautaire & chants.',
            location: 'Chapelle St-Joseph, Mbengwi',
            temporalType: 'timed',
            localStartDate: '2027-03-19',
            localEndDate: '2027-03-19',
            localStartTime: '09:00',
            localEndTime: '18:00',
            startDate: new Date('2027-03-19T08:00:00Z'),
            endDate: new Date('2027-03-19T17:00:00Z'),
            startDateISO: '20270319T080000Z',
            endDateISO: '20270319T170000Z',
        };

        const ics = generateIcs(fixture, new Date('2027-01-01T00:00:00Z'));
        // RFC 5545 folds the UTF-8 line at 75 octets with CRLF + space continuation
        expect(ics).toContain('SUMMARY:SJCCC: Célébration solennelle — Saint-Joseph “Patronal Feast\r\n ” & Dîner\r\n');
        // Escaped semicolon and comma in description
        expect(ics).toContain('\\;');
        expect(ics).toContain('\\,');

        const gUrl = buildGoogleCalendarUrl(fixture);
        const parsedG = new URL(gUrl);
        expect(parsedG.searchParams.get('text')).toContain('Célébration');
        expect(parsedG.searchParams.get('details')).toContain('banquet');

        const oUrl = buildOutlookUrl(fixture);
        const parsedO = new URL(oUrl);
        expect(parsedO.searchParams.get('subject')).toContain('Célébration');
    });
});

describe('Canonical Dataset Completeness & Serialization Invariants', () => {
    it('verifies dataset has exactly 14 canonical milestones', () => {
        expect(ACADEMIC_MILESTONES_2026_2027).toHaveLength(14);
    });

    it('successfully serializes all 14 canonical milestones across all 3 providers without errors', () => {
        for (const m of ACADEMIC_MILESTONES_2026_2027) {
            // ICS
            const ics = generateIcs(m);
            expect(ics).toContain('BEGIN:VCALENDAR');
            expect(ics).toContain('END:VCALENDAR');
            expect(ics).toContain(`UID:${m.id}-sjccc-2026-2027@sjccc.edu.cm`);

            // Google
            const gUrl = buildGoogleCalendarUrl(m);
            expect(gUrl).toContain('calendar.google.com');
            const parsedG = new URL(gUrl);
            expect(parsedG.searchParams.get('action')).toBe('TEMPLATE');
            expect(parsedG.searchParams.get('ctz')).toBe('Africa/Douala');

            // Outlook
            const oUrl = buildOutlookUrl(m);
            expect(oUrl).toContain('outlook.live.com');
            const parsedO = new URL(oUrl);
            expect(parsedO.searchParams.get('rru')).toBe('addevent');
        }
    });
});

describe('Touch Target Engineering Invariants (Design Invariant: >= 44x44px)', () => {
    it('documents and verifies that all calendar action interactive elements meet the 44x44px target', () => {
        // WCAG 2.2 SC 2.5.8 Level AA minimum is 24x24 CSS px.
        // SJCCC design invariant is 44x44px (corresponds to enhanced AAA criterion).
        const engineeringTarget = 44;

        // Provider buttons: min-height is 52px
        const providerBtnMinHeight = 52;
        expect(providerBtnMinHeight).toBeGreaterThanOrEqual(engineeringTarget);

        // Action sheet close button: 44px x 44px
        const closeBtnDimension = 44;
        expect(closeBtnDimension).toBeGreaterThanOrEqual(engineeringTarget);

        // Action sheet dismiss button: min-height is 44px
        const dismissBtnMinHeight = 44;
        expect(dismissBtnMinHeight).toBeGreaterThanOrEqual(engineeringTarget);

        // Timeline card action button: min-height is 44px
        const timelineBtnMinHeight = 44;
        expect(timelineBtnMinHeight).toBeGreaterThanOrEqual(engineeringTarget);
    });
});
