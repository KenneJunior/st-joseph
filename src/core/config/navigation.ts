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
        id: 'results',
        targetId: 'results',
        href: '#results',
        label: 'Results',
        iconClass: 'bi-award-fill',
        dockOrder: 5,
        inDock: true,
        dockClass: 'mobile-bottom-item--results',
        relatedSections: ['news-events', 'results'],
    },
    {
        id: 'map',
        targetId: 'campusMapSection',
        href: '#campusMapSection',
        label: 'Map',
        iconClass: 'bi-map-fill',
        dockOrder: 6,
        inDock: true,
        dockClass: 'mobile-bottom-item--map',
        relatedSections: ['campus', 'campusMapSection'],
    },
] as const;

/**
 * Maps any page section ID to its canonical navigation target.
 * Guarantees that sections outside the primary dock (e.g. #about, #news-events, #campus)
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
 * Theme (1) -> Home (2) -> Academics (3) -> Dates (4) -> Results (5) -> Map (6) -> Menu (7)
 */
export const DOCK_CANONICAL_ORDER: readonly string[] = [
    'bottomThemeToggle',
    'heroSection',
    'academics',
    'schoolDatesSection',
    'results',
    'campusMapSection',
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
