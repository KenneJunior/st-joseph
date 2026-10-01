/**
 * ============================================================================
 * SJCCC – Smooth Scroll Utility
 * Intercepts internal hash anchor links and performs smooth scroll with header offset
 * ============================================================================
 */

import { ScrollSpy } from '../navigation/ScrollSpy.ts';

export class SmoothScroll {
    private header: HTMLElement | null = null;

    constructor(headerId: string = 'mainHeader', linkSelector: string = 'a[href^="#"]') {
        this.header = document.getElementById(headerId);
        this.init(linkSelector);
    }

    private init(selector: string): void {
        document.querySelectorAll<HTMLAnchorElement>(selector).forEach((anchor) => {
            anchor.addEventListener('click', (e: MouseEvent) => this.handleClick(e, anchor));
        });
    }

    private handleClick(e: MouseEvent, anchor: HTMLAnchorElement): void {
        const targetId = anchor.getAttribute('href');
        if (!targetId || targetId === '#') return;

        const target = document.querySelector(targetId) as HTMLElement | null;
        if (!target) return;

        e.preventDefault();
        const headerHeight = this.header ? this.header.offsetHeight + 16 : 80;
        const top = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;

        // Prevent highlight jitter while scrolling smoothly to target
        ScrollSpy.instance?.lockActiveTarget(targetId.replace(/^#/, ''));

        window.scrollTo({ top, behavior: 'smooth' });
    }
}
