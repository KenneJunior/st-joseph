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
