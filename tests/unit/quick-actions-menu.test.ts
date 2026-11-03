import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { QuickActionsMenu } from '../../src/features/quick-actions/QuickActionsMenu.ts';

describe('QuickActionsMenu Controller', () => {
    let dom: JSDOM;
    let menuInstance: QuickActionsMenu | null = null;

    beforeEach(() => {
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <head></head>
            <body>
                <div class="unified-action-dock" id="unifiedAssistanceDock">
                    <button type="button" id="sjcccAiFab" class="unified-dock-btn unified-dock-btn--ai">Ask AI</button>
                    <button type="button" id="quickActionsFab" class="unified-dock-btn unified-dock-btn--quick">Quick Actions</button>
                    <button type="button" id="enquiryFab" class="unified-dock-btn unified-dock-btn--enquiry">Enquire</button>
                </div>
                <section id="location">Location</section>
            </body>
            </html>
        `, {
            url: 'https://saintjosephcollege.vercel.app/',
            pretendToBeVisual: true
        });

        (globalThis as any).window = dom.window;
        (globalThis as any).document = dom.window.document;
        (globalThis as any).HTMLElement = dom.window.HTMLElement;
        (globalThis as any).HTMLButtonElement = dom.window.HTMLButtonElement;
        (globalThis as any).HTMLAnchorElement = dom.window.HTMLAnchorElement;
        (globalThis as any).KeyboardEvent = dom.window.KeyboardEvent;
        (globalThis as any).MouseEvent = dom.window.MouseEvent;
        (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
            cb(0);
            return 1;
        };
    });

    afterEach(() => {
        menuInstance?.destroy();
        menuInstance = null;
        dom.window.document.getElementById('quickActionsMenu')?.remove();
    });

    it('initializes and renders the floating menu element with canonical actions', () => {
        menuInstance = new QuickActionsMenu();

        const menuEl = dom.window.document.getElementById('quickActionsMenu');
        expect(menuEl).not.toBeNull();
        expect(menuEl?.getAttribute('role')).toBe('menu');

        // Check Send Enquiry action
        const enquireLink = menuEl?.querySelector<HTMLAnchorElement>('#qaEnquireAction');
        expect(enquireLink).not.toBeNull();
        expect(enquireLink?.getAttribute('href')).toBe('#enquiryModal');
        expect(enquireLink?.textContent).toContain('Send Enquiry');

        // Check Download Prospectus action
        const prospectusLink = menuEl?.querySelector<HTMLAnchorElement>('#qaDownloadProspectus');
        expect(prospectusLink).not.toBeNull();
        expect(prospectusLink?.getAttribute('href')).toContain('/prospectus.html');
        expect(prospectusLink?.textContent).toContain('Download Prospectus');

        // Check Call School action
        const callLink = menuEl?.querySelector<HTMLAnchorElement>('#qaCallSchool');
        expect(callLink).not.toBeNull();
        expect(callLink?.getAttribute('href')).toMatch(/^tel:\+?237/);
        expect(callLink?.textContent).toContain('Call School');

        // Check WhatsApp Admin action
        const whatsappLink = menuEl?.querySelector<HTMLAnchorElement>('#qaWhatsAppAdmin');
        expect(whatsappLink).not.toBeNull();
        expect(whatsappLink?.getAttribute('href')).toContain('https://wa.me/');
        expect(whatsappLink?.textContent).toContain('WhatsApp Admin');
    });

    it('triggers enquiry modal opening and closes menu when Send Enquiry is clicked', () => {
        // Setup mock enquiry modal in DOM
        const enquiryModal = dom.window.document.createElement('div');
        enquiryModal.id = 'enquiryModal';
        enquiryModal.setAttribute('hidden', '');
        const input = dom.window.document.createElement('input');
        enquiryModal.appendChild(input);
        dom.window.document.body.appendChild(enquiryModal);

        menuInstance = new QuickActionsMenu();
        menuInstance.open();
        expect(menuInstance.isOpen()).toBe(true);

        const enquireLink = dom.window.document.getElementById('qaEnquireAction') as HTMLAnchorElement;
        expect(enquireLink).not.toBeNull();
        enquireLink.click();

        expect(menuInstance.isOpen()).toBe(false);
        expect(enquiryModal.hasAttribute('hidden')).toBe(false);
    });

    it('opens and closes via toggle() and manages aria-expanded', () => {
        menuInstance = new QuickActionsMenu();
        const trigger = dom.window.document.getElementById('quickActionsFab') as HTMLButtonElement;
        const menuEl = dom.window.document.getElementById('quickActionsMenu') as HTMLElement;

        expect(menuInstance.isOpen()).toBe(false);
        expect(trigger.getAttribute('aria-expanded')).toBe('false');
        expect(menuEl.classList.contains('is-open')).toBe(false);

        // Open
        menuInstance.open();
        expect(menuInstance.isOpen()).toBe(true);
        expect(trigger.getAttribute('aria-expanded')).toBe('true');
        expect(menuEl.classList.contains('is-open')).toBe(true);

        // Close
        menuInstance.close();
        expect(menuInstance.isOpen()).toBe(false);
        expect(trigger.getAttribute('aria-expanded')).toBe('false');
        expect(menuEl.classList.contains('is-open')).toBe(false);

        // Toggle
        menuInstance.toggle();
        expect(menuInstance.isOpen()).toBe(true);
    });

    it('closes when close button inside header is clicked', () => {
        menuInstance = new QuickActionsMenu();
        menuInstance.open();
        expect(menuInstance.isOpen()).toBe(true);

        const closeBtn = dom.window.document.getElementById('quickActionsCloseBtn') as HTMLButtonElement;
        closeBtn.click();

        expect(menuInstance.isOpen()).toBe(false);
    });

    it('closes on Escape key press and restores focus to trigger button', () => {
        menuInstance = new QuickActionsMenu();
        const trigger = dom.window.document.getElementById('quickActionsFab') as HTMLButtonElement;
        const focusSpy = vi.spyOn(trigger, 'focus');

        menuInstance.open();
        expect(menuInstance.isOpen()).toBe(true);

        const escapeEvent = new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
        dom.window.document.dispatchEvent(escapeEvent);

        expect(menuInstance.isOpen()).toBe(false);
        expect(focusSpy).toHaveBeenCalled();
    });

    it('closes on outside click', () => {
        menuInstance = new QuickActionsMenu();
        menuInstance.open();
        expect(menuInstance.isOpen()).toBe(true);

        // Click outside (on document body)
        const clickEvent = new dom.window.MouseEvent('click', { bubbles: true });
        dom.window.document.body.dispatchEvent(clickEvent);

        expect(menuInstance.isOpen()).toBe(false);
    });

    it('dynamically creates trigger button if dock exists without trigger', () => {
        // Remove existing trigger from DOM
        dom.window.document.getElementById('quickActionsFab')?.remove();

        menuInstance = new QuickActionsMenu();
        const newTrigger = dom.window.document.getElementById('quickActionsFab');
        expect(newTrigger).not.toBeNull();
        expect(newTrigger?.classList.contains('unified-dock-btn--quick')).toBe(true);
    });
});
