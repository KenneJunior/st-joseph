/**
 * ============================================================================
 * SJCCC – Canonical Navigation Architecture Model
 * Defines the canonical navigation items, targets, icons, labels, and
 * visual ordering hierarchy shared across Desktop Menu, Mobile Drawer,
 * and Mobile Bottom Dock.
 * ============================================================================
 */

export interface NavItemDefinition {
    id: string;
    targetId: string;
    href: string;
    label: string;
    iconClass: string;
    dockOrder: number;
    inDock: boolean;
    dockClass?: string;
    relatedSections?: string[];
}

/**
 * Canonical Navigation Hierarchy
 * Information Architecture order:
 * 1. Theme (Toggle)
 * 2. Home (#heroSection, #about)
 * 3. Academics (#academics)
 * 4. Dates (#schoolDatesSection)
 * 5. Results (#news-events, #results)
 * 6. Campus Map (#campus, #campusMapSection)
 * 7. Menu (Drawer Toggle)
 */
export const CANONICAL_NAV_ITEMS: readonly NavItemDefinition[] = [
    {
        id: 'home',
        targetId: 'heroSection',
        href: '#heroSection',
        label: 'Home',
        iconClass: 'bi-house-door-fill',
        dockOrder: 2,
        inDock: true,
        dockClass: 'mobile-bottom-item--home',
        relatedSections: ['heroSection', 'about'],
    },
    {
        id: 'academics',
        targetId: 'academics',
        href: '#academics',
        label: 'Academics',
        iconClass: 'bi-mortarboard-fill',
        dockOrder: 3,
        inDock: true,
        dockClass: 'mobile-bottom-item--academics',
        relatedSections: ['academics'],
    },
    {
        id: 'dates',
        targetId: 'schoolDatesSection',
        href: '#schoolDatesSection',
        label: 'Dates',
        iconClass: 'bi-calendar-check-fill',
        dockOrder: 4,
        inDock: true,
        dockClass: 'mobile-bottom-item--dates',
        relatedSections: ['schoolDatesSection'],
    },
    {
        id: 'news',
        targetId: 'news-events',
        href: '#news-events',
        label: 'News',
        iconClass: 'bi-newspaper',
        dockOrder: 5,
        inDock: true,
        dockClass: 'mobile-bottom-item--news',
        relatedSections: ['news-events'],
    },
    {
        id: 'results',
        targetId: 'results',
        href: '#results',
        label: 'Results',
        iconClass: 'bi-award-fill',
        dockOrder: 6,
        inDock: true,
        dockClass: 'mobile-bottom-item--results',
        relatedSections: ['results'],
    },
    {
        id: 'map',
        targetId: 'campusMapSection',
        href: '#campusMapSection',
        label: 'Map',
        iconClass: 'bi-map-fill',
        dockOrder: 7,
        inDock: true,
        dockClass: 'mobile-bottom-item--map',
        relatedSections: ['campus', 'campusMapSection', 'testimonials'],
    },
    {
        id: 'location',
        targetId: 'location',
        href: '#location',
        label: 'Location',
        iconClass: 'bi-geo-alt-fill',
        dockOrder: 8,
        inDock: true,
        dockClass: 'mobile-bottom-item--location',
        relatedSections: ['location', 'faq', 'contact'],
    },
    {
        id: 'reminders',
        targetId: 'bottomMyRemindersBtn',
        href: '#myReminders',
        label: 'Reminders',
        iconClass: 'bi-bell-fill',
        dockOrder: 9,
        inDock: true,
        dockClass: 'mobile-bottom-item--reminders',
    },
    {
        id: 'prospectus',
        targetId: 'prospectus',
        href: '/prospectus.html',
        label: 'Prospectus',
        iconClass: 'bi-file-earmark-pdf-fill',
        dockOrder: 99,
        inDock: false,
        dockClass: 'mobile-bottom-item--prospectus',
    },
] as const;

/**
 * Maps any page section ID to its canonical navigation target.
 * Guarantees that sections outside the primary dock (e.g. #about, #campus, #faq, #contact)
 * map logically to their parent section without leaving the dock unhighlighted.
 */
export function getCanonicalTargetForSection(sectionId: string): string | null {
    const cleanId = sectionId.replace(/^#/, '');
    for (const item of CANONICAL_NAV_ITEMS) {
        if (item.targetId === cleanId || item.relatedSections?.includes(cleanId)) {
            return item.targetId;
        }
    }
    return null;
}

/**
 * Canonical visual order of all mobile bottom bar items:
 * Theme (1) -> Home (2) -> Academics (3) -> Dates (4) -> News (5) -> Results (6) -> Map (7) -> Location (8) -> Reminders (9) -> Menu (10)
 */
export const DOCK_CANONICAL_ORDER: readonly string[] = [
    'mobileBottomProgressTrack',
    'mobileBottomGlider',
    'bottomThemeToggle',
    'heroSection',
    'academics',
    'schoolDatesSection',
    'news-events',
    'results',
    'campusMapSection',
    'location',
    'bottomMyRemindersBtn',
    'bottomNavMenuToggle',
] as const;

/**
 * Enforces the canonical visual order on the mobile bottom bar in the DOM.
 * Guarantees that even if items are dynamically added or registered,
 * they appear in the deliberate information-architecture order rather than insertion order.
 */
export function enforceDockOrder(dockElement: HTMLElement): void {
    const children = Array.from(dockElement.children) as HTMLElement[];
    if (children.length <= 1) return;

    const getItemKey = (el: HTMLElement): string => {
        if (el.id) return el.id;
        const target = el.getAttribute('data-nav-target');
        if (target) return target;
        const href = el.getAttribute('href');
        if (href?.startsWith('#')) return href.slice(1);
        if (href?.includes('prospectus')) return 'prospectus';
        return '';
    };

    const getOrderIndex = (key: string): number => {
        const index = DOCK_CANONICAL_ORDER.indexOf(key);
        return index !== -1 ? index : 999;
    };

    // Sort children based on canonical order
    children.sort((a, b) => {
        const keyA = getItemKey(a);
        const keyB = getItemKey(b);
        return getOrderIndex(keyA) - getOrderIndex(keyB);
    });

    // Re-append in sorted order (preserves existing event listeners)
    children.forEach((child) => dockElement.appendChild(child));
}
