/**
 * ============================================================================
 * SJCCC – Client Page Context Resolver (pageContext.ts)
 * 
 * Accurately extracts the active webpage title and current section in view
 * to ground AI Assistant guidance with contextual awareness.
 * ============================================================================
 */

import { ScrollSpy } from '../../ui/navigation/ScrollSpy.ts';

export interface ClientPageContext {
    pageTitle?: string;
    pageSection?: string;
}

/**
 * Resolves the user's current browsing context (page title and active section).
 */
export function getCurrentPageContext(): ClientPageContext {
    const pageTitle = (typeof document !== 'undefined' && document.title)
        ? document.title.trim()
        : "St. Joseph's Catholic Comprehensive College Mbengwi";

    let pageSection = 'General Campus';

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        let activeEl: HTMLElement | null = null;

        // 1. Check ScrollSpy singleton if active
        const scrollSpyId = ScrollSpy.instance?.getActiveSectionId();
        if (scrollSpyId) {
            activeEl = document.getElementById(scrollSpyId);
        }

        // 2. Check window hash
        const locationHash = typeof window.location?.hash === 'string' ? window.location.hash : '';
        if (!activeEl && locationHash.length > 1 && typeof document.getElementById === 'function') {
            const hashId = locationHash.replace(/^#/, '');
            activeEl = document.getElementById(hashId);
        }

        // 3. Viewport intersection fallback: find section spanning or closest to top
        if (!activeEl && typeof document.querySelectorAll === 'function') {
            const scrollY = typeof window.scrollY === 'number'
                ? window.scrollY
                : (typeof window.pageYOffset === 'number' ? window.pageYOffset : 0);

            if (scrollY <= 80 && typeof document.getElementById === 'function') {
                activeEl = document.getElementById('heroSection');
            } else {
                const candidateSections = Array.from(
                    document.querySelectorAll<HTMLElement>('section[id], div.section-card[id]')
                );
                for (const section of candidateSections) {
                    if (typeof section.getBoundingClientRect !== 'function') continue;
                    const rect = section.getBoundingClientRect();
                    if (rect.top <= 200 && rect.bottom >= 100) {
                        activeEl = section;
                        break;
                    }
                }
            }
        }

        // Extract human-friendly section name and anchor ID
        if (activeEl) {
            const heading = typeof activeEl.querySelector === 'function'
                ? activeEl.querySelector('h1, h2, h3, .section-header, .section-title')
                : null;
            const headingText = heading?.textContent?.replace(/\s+/g, ' ').trim();
            const id = activeEl.id;

            if (headingText && id) {
                pageSection = `${headingText} (#${id})`;
            } else if (headingText) {
                pageSection = headingText;
            } else if (id) {
                pageSection = `#${id}`;
            }
        }
    }

    return {
        pageTitle,
        pageSection,
    };
}
