/**
 * ============================================================================
 * SJCCC – Calendar Timezone & Normalization Engine (Africa/Douala - UTC+1)
 * ============================================================================
 * Cameroon observes West Africa Time (WAT) year-round at UTC+01:00 with zero
 * daylight saving adjustments.
 *
 * This pure module provides canonical conversion between:
 *  1) SJCCC local wall-clock dates and times (WAT).
 *  2) UTC instants for RFC 5545 iCalendar and provider URL templates.
 *  3) RFC 5545 exclusive DTEND date calculation for all-day events.
 * ============================================================================
 */

export const SJCCC_TIMEZONE = 'Africa/Douala';
export const SJCCC_UTC_OFFSET_HOURS = 1;

export interface NormalizedDateTimes {
    /** RFC 5545 DTSTART value (e.g. "VALUE=DATE:20261026" or "20260821T070000Z") */
    icsStart: string;
    /** RFC 5545 DTEND value (e.g. "VALUE=DATE:20261031" [exclusive] or "20260821T150000Z") */
    icsEnd: string;
    /** Google Calendar dates parameter (e.g. "20261026/20261031" or "20260821T070000Z/20260821T150000Z") */
    googleDates: string;
    /** Outlook ISO start timestamp */
    outlookStartISO: string;
    /** Outlook ISO end timestamp */
    outlookEndISO: string;
}

/**
 * Normalizes an academic milestone's temporal representation into UTC instants
 * and RFC 5545-compliant strings, guaranteeing that 08:00 WAT maps deterministically
 * to 07:00 UTC without browser-timezone skew.
 */
export function normalizeMilestoneDates(
    startDateStr: string,
    endDateStr: string,
    startTimeStr?: string,
    endTimeStr?: string,
    temporalType: 'timed' | 'all-day' | 'multi-day-all-day' | 'multi-day-timed' = 'all-day'
): NormalizedDateTimes {
    const isAllDay = temporalType === 'all-day' || temporalType === 'multi-day-all-day';

    if (isAllDay) {
        // Date format: YYYY-MM-DD
        const startClean = startDateStr.replace(/-/g, '');
        // For RFC 5545, DTEND for an all-day event is EXCLUSIVE.
        // If an event runs 26 Oct to 30 Oct inclusive, DTEND is 31 Oct.
        const endParts = endDateStr.split('-').map(Number);
        const endDateObj = new Date(Date.UTC(endParts[0], endParts[1] - 1, endParts[2]));
        // Add 1 day for exclusive end
        endDateObj.setUTCDate(endDateObj.getUTCDate() + 1);

        const y = endDateObj.getUTCFullYear();
        const m = String(endDateObj.getUTCMonth() + 1).padStart(2, '0');
        const d = String(endDateObj.getUTCDate()).padStart(2, '0');
        const endExclusiveClean = `${y}${m}${d}`;

        return {
            icsStart: `;VALUE=DATE:${startClean}`,
            icsEnd: `;VALUE=DATE:${endExclusiveClean}`,
            googleDates: `${startClean}/${endExclusiveClean}`,
            outlookStartISO: `${startDateStr}T00:00:00`,
            outlookEndISO: `${y}-${m}-${d}T00:00:00`,
        };
    }

    // Timed event: parse local WAT wall-clock (UTC+1)
    // Default times if not provided: 08:00 to 17:00 WAT
    const sTime = startTimeStr || '08:00';
    const eTime = endTimeStr || '16:00';

    const [sH, sM] = sTime.split(':').map(Number);
    const [eH, eM] = eTime.split(':').map(Number);

    const sParts = startDateStr.split('-').map(Number);
    const eParts = endDateStr.split('-').map(Number);

    // Create UTC date representing WAT wall clock minus 1 hour
    const startUtcMillis = Date.UTC(sParts[0], sParts[1] - 1, sParts[2], sH - SJCCC_UTC_OFFSET_HOURS, sM, 0);
    const endUtcMillis = Date.UTC(eParts[0], eParts[1] - 1, eParts[2], eH - SJCCC_UTC_OFFSET_HOURS, eM, 0);

    const startUtc = new Date(startUtcMillis);
    const endUtc = new Date(endUtcMillis);

    const formatUtcCompact = (d: Date): string => {
        const y = d.getUTCFullYear();
        const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        const h = String(d.getUTCHours()).padStart(2, '0');
        const min = String(d.getUTCMinutes()).padStart(2, '0');
        const s = String(d.getUTCSeconds()).padStart(2, '0');
        return `${y}${mo}${day}T${h}${min}${s}Z`;
    };

    const sCompact = formatUtcCompact(startUtc);
    const eCompact = formatUtcCompact(endUtc);

    return {
        icsStart: `:${sCompact}`,
        icsEnd: `:${eCompact}`,
        googleDates: `${sCompact}/${eCompact}`,
        outlookStartISO: startUtc.toISOString(),
        outlookEndISO: endUtc.toISOString(),
    };
}
