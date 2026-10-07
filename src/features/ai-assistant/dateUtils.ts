/**
 * ============================================================================
 * SJCCC – Cameroon Date & Time Semantics Utilities (dateUtils.ts)
 * 
 * Provides runtime date evaluation strictly pinned to the official Cameroon
 * timezone (`Africa/Douala`, UTC+1).
 * 
 * Accurately determines whether institutional calendar milestones are:
 * - 'past': already occurred relative to current Cameroon date
 * - 'today': occurring on the current Cameroon calendar day
 * - 'upcoming': scheduled for a future Cameroon calendar date
 * 
 * Allows injecting a reference date for 100% deterministic testing.
 * ============================================================================
 */

export const CAMEROON_TIMEZONE = 'Africa/Douala';

export type DateRelation = 'past' | 'today' | 'upcoming';

/**
 * Returns the current date in Cameroon as a standard `YYYY-MM-DD` ISO string.
 * @param referenceDate Optional Date object (defaults to current system time)
 */
export function getCameroonDate(referenceDate: Date = new Date()): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: CAMEROON_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(referenceDate);
}

/**
 * Compares an ISO target date (e.g. '2026-08-04') against current Cameroon date
 * and returns its chronological relation ('past' | 'today' | 'upcoming').
 * 
 * @param targetIsoDate ISO date string formatted as 'YYYY-MM-DD'
 * @param referenceToday Optional current date 'YYYY-MM-DD' (defaults to Cameroon runtime date)
 */
export function getDateRelation(targetIsoDate: string, referenceToday?: string): DateRelation {
    const today = referenceToday || getCameroonDate();
    const cleanTarget = targetIsoDate.split('T')[0];

    if (cleanTarget < today) {
        return 'past';
    }
    if (cleanTarget === today) {
        return 'today';
    }
    return 'upcoming';
}

/**
 * Checks if a target date has already passed in Cameroon time.
 */
export function isPastDate(targetIsoDate: string, referenceToday?: string): boolean {
    return getDateRelation(targetIsoDate, referenceToday) === 'past';
}

/**
 * Checks if a target date is today in Cameroon time.
 */
export function isTodayDate(targetIsoDate: string, referenceToday?: string): boolean {
    return getDateRelation(targetIsoDate, referenceToday) === 'today';
}

/**
 * Checks if a target date is in the future in Cameroon time.
 */
export function isUpcomingDate(targetIsoDate: string, referenceToday?: string): boolean {
    return getDateRelation(targetIsoDate, referenceToday) === 'upcoming';
}

/**
 * Generates an institutionally accurate, non-misleading natural language
 * phrasing for an institutional event date based on its chronological status.
 * 
 * Ensures past dates are NEVER described as upcoming future events.
 */
export function describeDateStatus(
    targetIsoDate: string,
    displayLabel: string,
    referenceToday?: string
): {
    relation: DateRelation;
    phrase: string;
    isPast: boolean;
} {
    const relation = getDateRelation(targetIsoDate, referenceToday);

    if (relation === 'past') {
        return {
            relation,
            phrase: `was scheduled for ${displayLabel} (this date has passed)`,
            isPast: true,
        };
    }

    if (relation === 'today') {
        return {
            relation,
            phrase: `is taking place today, ${displayLabel}`,
            isPast: false,
        };
    }

    return {
        relation,
        phrase: `is scheduled for ${displayLabel}`,
        isPast: false,
    };
}
