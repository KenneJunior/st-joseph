/**
 * ============================================================================
 * SJCCC – Pure Calendar Serializer & Provider URL Builder
 * ============================================================================
 * Pure, DOM-free serialization adhering strictly to RFC 5545:
 *  - Octet-safe line folding at 75 bytes (UTF-8 safe, not slice(0, 75)).
 *  - Line endings: CRLF (\r\n).
 *  - Escaping: \, ;, ,, \n.
 *  - Deterministic UIDs.
 *  - Provider URL builders for Google Calendar and Microsoft Outlook Web.
 * ============================================================================
 */

import type { AcademicMilestone } from '../../data/academicCalendar';
import { normalizeMilestoneDates, SJCCC_TIMEZONE } from './CalendarTimezone';

/**
 * Folds a single content line according to RFC 5545 §3.1:
 * "Lines of text SHOULD NOT be longer than 75 octets, excluding the line
 *  break. Long content lines SHOULD be split into a higher-level syntactically
 *  meaningful line plus one or more continuation lines using a line-folding
 *  technique... each continuation line MUST begin with a whitespace character."
 *
 * Implemented using UTF-8 byte counting via TextEncoder.
 */
export function foldIcsLine(line: string, maxOctets = 75): string {
    const encoder = new TextEncoder();
    if (encoder.encode(line).length <= maxOctets) {
        return line;
    }

    const characters = Array.from(line);
    const foldedLines: string[] = [];
    let currentLine = '';
    let currentOctets = 0;
    const continuationPrefixOctets = 1; // ' ' continuation space

    for (let i = 0; i < characters.length; i++) {
        const char = characters[i];
        const charOctets = encoder.encode(char).length;
        const limit = foldedLines.length === 0 ? maxOctets : maxOctets - continuationPrefixOctets;

        if (currentOctets + charOctets > limit) {
            if (currentLine.length > 0) {
                foldedLines.push(currentLine);
            }
            currentLine = char;
            currentOctets = charOctets;
        } else {
            currentLine += char;
            currentOctets += charOctets;
        }
    }

    if (currentLine.length > 0) {
        foldedLines.push(currentLine);
    }

    // First line normal, subsequent lines prefixed with a single space
    return foldedLines.reduce((acc, curr, index) => {
        if (index === 0) return curr;
        return `${acc}\r\n ${curr}`;
    }, '');
}

/**
 * Escapes text according to RFC 5545 text value formatting rules:
 * Backslash, semicolon, comma, and newline.
 */
export function escapeIcsText(str: string): string {
    return str
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\r\n/g, '\\n')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\n');
}

/**
 * Serializes an AcademicMilestone into a standard RFC 5545 VCALENDAR string.
 */
export function generateIcs(milestone: AcademicMilestone, now = new Date()): string {
    const dates = normalizeMilestoneDates(
        milestone.localStartDate,
        milestone.localEndDate,
        milestone.localStartTime,
        milestone.localEndTime,
        milestone.temporalType
    );

    const nowCompact = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const summary = `SJCCC: ${escapeIcsText(milestone.title)}`;
    const description = `${escapeIcsText(milestone.description)} | Academic Year 2026/2027 | St. Joseph Catholic Comprehensive College, Mbengwi`;
    const location = escapeIcsText(milestone.location);
    const uid = `${milestone.id}-sjccc-2026-2027@sjccc.edu.cm`;

    const rawLines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//SJCCC Mbengwi//Academic Calendar 2026-2027//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${nowCompact}`,
        `DTSTART${dates.icsStart}`,
        `DTEND${dates.icsEnd}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        `LOCATION:${location}`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR',
    ];

    return rawLines.map((line) => foldIcsLine(line, 75)).join('\r\n') + '\r\n';
}

/**
 * Generates a pre-filled Google Calendar web composition URL.
 * https://calendar.google.com/calendar/render?action=TEMPLATE
 */
export function buildGoogleCalendarUrl(milestone: AcademicMilestone): string {
    const dates = normalizeMilestoneDates(
        milestone.localStartDate,
        milestone.localEndDate,
        milestone.localStartTime,
        milestone.localEndTime,
        milestone.temporalType
    );

    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: `SJCCC: ${milestone.title}`,
        dates: dates.googleDates,
        details: `${milestone.description}\n\nAcademic Year 2026/2027\nSt. Joseph Catholic Comprehensive College, Mbengwi, Cameroon`,
        location: milestone.location,
        ctz: SJCCC_TIMEZONE,
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generates a pre-filled Outlook / Microsoft 365 web composition URL.
 * https://outlook.live.com/calendar/0/deeplink/compose
 */
export function buildOutlookUrl(milestone: AcademicMilestone): string {
    const dates = normalizeMilestoneDates(
        milestone.localStartDate,
        milestone.localEndDate,
        milestone.localStartTime,
        milestone.localEndTime,
        milestone.temporalType
    );

    const isAllDay = milestone.temporalType === 'all-day' || milestone.temporalType === 'multi-day-all-day';

    const params = new URLSearchParams({
        path: '/calendar/action/compose',
        rru: 'addevent',
        subject: `SJCCC: ${milestone.title}`,
        startdt: dates.outlookStartISO,
        enddt: dates.outlookEndISO,
        body: `${milestone.description}\n\nAcademic Year 2026/2027\nSt. Joseph Catholic Comprehensive College, Mbengwi, Cameroon`,
        location: milestone.location,
        allday: isAllDay ? 'true' : 'false',
    });

    return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}
