/**
 * ============================================================================
 * SJCCC – Quick Actions Floating Menu Controller
 * (src/features/quick-actions/QuickActionsMenu.ts)
 *
 * Responsibilities:
 * - Provides a floating quick-access menu anchored to the Unified Assistance Dock.
 * - Allows instant execution of high-frequency tasks:
 *     1. Download Prospectus (Direct view & print/PDF export)
 *     2. Call School (Direct telephonic connection with administration)
 *     3. WhatsApp Admin (Instant WhatsApp chat with admissions desk)
 *     4. Campus Location & Directions (Quick jump to campus coordinates)
 * - Complete keyboard accessibility (Arrow keys, Escape key, tab order, focus restoration).
 * - Full light/dark mode and reduced motion support.
 * ============================================================================
 */

import { COLLEGE_PROFILE } from '../../data/collegeProfile.ts';

export interface QuickActionsOptions {
    triggerSelector?: string;
    dockSelector?: string;
    onActionTriggered?: (actionKey: string) => void;
}

export class QuickActionsMenu {
    private triggerBtn: HTMLButtonElement | null = null;
    private dockEl: HTMLElement | null = null;
    private menuEl: HTMLElement | null = null;
    private _isOpen: boolean = false;
    private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
    private documentClickHandler: ((e: MouseEvent) => void) | null = null;
    private onActionTriggered?: (actionKey: string) => void;

    constructor(options: QuickActionsOptions = {}) {
        this.onActionTriggered = options.onActionTriggered;
        const triggerSelector = options.triggerSelector || '#quickActionsFab';
        const dockSelector = options.dockSelector || '#unifiedAssistanceDock';

        this.dockEl = document.querySelector<HTMLElement>(dockSelector);
        this.triggerBtn = document.querySelector<HTMLButtonElement>(triggerSelector);

        this.init();
    }

    private init(): void {
        // If trigger does not exist yet inside dock, create it dynamically
        if (!this.triggerBtn && this.dockEl) {
            this.createTriggerButton();
        }

        if (!this.triggerBtn) return;

        // Ensure ARIA attributes are cleanly set on existing trigger
        this.triggerBtn.setAttribute('aria-expanded', 'false');
        this.triggerBtn.setAttribute('aria-haspopup', 'true');
        this.triggerBtn.setAttribute('aria-controls', 'quickActionsMenu');

        // Render floating menu DOM if not already present
        this.renderMenu();

        // Bind events
        this.bindEvents();
    }

    /**
     * Creates and inserts the Quick Actions button into the unified assistance dock
     */
    private createTriggerButton(): void {
        if (!this.dockEl) return;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'quickActionsFab';
        btn.className = 'unified-dock-btn unified-dock-btn--quick';
        btn.setAttribute('aria-label', 'Open Quick Actions menu');
        btn.setAttribute('title', 'Quick Actions (Prospectus, Call, WhatsApp)');
        btn.setAttribute('aria-haspopup', 'true');
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-controls', 'quickActionsMenu');
        btn.innerHTML = `<i class="bi bi-lightning-charge-fill" aria-hidden="true"></i><span class="dock-btn-label">Quick Actions</span>`;

        const divider = document.createElement('span');
        divider.className = 'unified-dock-divider';
        divider.setAttribute('aria-hidden', 'true');

        // Insert before the enquiry button if present, or append
        const enquiryBtn = this.dockEl.querySelector('#enquiryFab, .unified-dock-btn--enquiry');
        if (enquiryBtn) {
            this.dockEl.insertBefore(divider, enquiryBtn);
            this.dockEl.insertBefore(btn, enquiryBtn);
        } else {
            this.dockEl.appendChild(divider);
            this.dockEl.appendChild(btn);
        }

        this.triggerBtn = btn;
    }

    /**
     * Renders or binds the floating menu element
     */
    private renderMenu(): void {
        let menu = document.getElementById('quickActionsMenu');
        if (!menu) {
            menu = document.createElement('div');
            menu.id = 'quickActionsMenu';
            menu.className = 'quick-actions-menu';
            menu.setAttribute('role', 'menu');
            menu.setAttribute('aria-label', 'Quick Actions');

            const phone = COLLEGE_PROFILE.contact.phoneFormatted;
            const telHref = COLLEGE_PROFILE.contact.telHref;
            const whatsAppUrl = COLLEGE_PROFILE.contact.whatsAppUrl;

            menu.innerHTML = `
                <div class="quick-actions-header">
                    <div class="quick-actions-title-wrap">
                        <span class="quick-actions-badge"><i class="bi bi-lightning-charge-fill" aria-hidden="true"></i></span>
                        <h3 class="quick-actions-title">Quick Actions</h3>
                    </div>
                    <button type="button" class="quick-actions-close-btn" id="quickActionsCloseBtn" aria-label="Close Quick Actions menu">
                        <i class="bi bi-x-lg" aria-hidden="true"></i>
                    </button>
                </div>
                <ul class="quick-actions-list" role="presentation">
                    <li class="quick-action-item" role="none">
                        <a href="#enquiryModal" class="quick-action-link" id="qaEnquireAction" role="menuitem"
                           title="Send official admissions & bursar inquiry form">
                            <span class="quick-action-icon-wrap quick-action-icon-wrap--enquiry">
                                <i class="bi bi-chat-dots-fill" aria-hidden="true"></i>
                            </span>
                            <div class="quick-action-info">
                                <span class="quick-action-label">
                                    Send Enquiry
                                    <i class="bi bi-arrow-right-short quick-action-arrow" aria-hidden="true"></i>
                                </span>
                                <span class="quick-action-desc">Admissions &amp; general inquiry form</span>
                            </div>
                        </a>
                    </li>
                    <li class="quick-action-item" role="none">
                        <a href="/prospectus.html?action=download" class="quick-action-link" id="qaDownloadProspectus" role="menuitem"
                           title="Download official prospectus and academic calendar">
                            <span class="quick-action-icon-wrap quick-action-icon-wrap--pdf">
                                <i class="bi bi-file-earmark-pdf-fill" aria-hidden="true"></i>
                            </span>
                            <div class="quick-action-info">
                                <span class="quick-action-label">
                                    Download Prospectus
                                    <i class="bi bi-arrow-right-short quick-action-arrow" aria-hidden="true"></i>
                                </span>
                                <span class="quick-action-desc">Official 2025/2026 Academic handbook</span>
                            </div>
                        </a>
                    </li>
                    <li class="quick-action-item" role="none">
                        <a href="${telHref}" class="quick-action-link" id="qaCallSchool" role="menuitem"
                           title="Call college administration office">
                            <span class="quick-action-icon-wrap quick-action-icon-wrap--call">
                                <i class="bi bi-telephone-fill" aria-hidden="true"></i>
                            </span>
                            <div class="quick-action-info">
                                <span class="quick-action-label">
                                    Call School
                                    <i class="bi bi-arrow-right-short quick-action-arrow" aria-hidden="true"></i>
                                </span>
                                <span class="quick-action-desc">${phone} · Direct Admin</span>
                            </div>
                        </a>
                    </li>
                    <li class="quick-action-item" role="none">
                        <a href="${whatsAppUrl}" target="_blank" rel="noopener noreferrer" class="quick-action-link" id="qaWhatsAppAdmin" role="menuitem"
                           title="Chat with SJCCC Admissions desk on WhatsApp">
                            <span class="quick-action-icon-wrap quick-action-icon-wrap--whatsapp">
                                <i class="bi bi-whatsapp" aria-hidden="true"></i>
                            </span>
                            <div class="quick-action-info">
                                <span class="quick-action-label">
                                    WhatsApp Admin
                                    <i class="bi bi-arrow-right-short quick-action-arrow" aria-hidden="true"></i>
                                </span>
                                <span class="quick-action-desc">Instant chat with Admissions Desk</span>
                            </div>
                        </a>
                    </li>
                    <li class="quick-action-item" role="none">
                        <a href="#location" class="quick-action-link" id="qaLocationJump" role="menuitem"
                           title="View campus location in Mbengwi">
                            <span class="quick-action-icon-wrap quick-action-icon-wrap--location">
                                <i class="bi bi-geo-alt-fill" aria-hidden="true"></i>
                            </span>
                            <div class="quick-action-info">
                                <span class="quick-action-label">
                                    Campus Location
                                    <i class="bi bi-arrow-right-short quick-action-arrow" aria-hidden="true"></i>
                                </span>
                                <span class="quick-action-desc">Mbengwi, Momo Division</span>
                            </div>
                        </a>
                    </li>
                </ul>
            `;

            document.body.appendChild(menu);
        }

        this.menuEl = menu;
    }

    /**
     * Binds click, keyboard, and click-outside listeners
     */
    private bindEvents(): void {
        if (!this.triggerBtn || !this.menuEl) return;

        // Toggle on trigger button click
        this.triggerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        // Close button inside menu header
        const closeBtn = this.menuEl.querySelector('#quickActionsCloseBtn');
        closeBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.close();
            this.triggerBtn?.focus();
        });

        // Track clicks on links inside menu
        this.menuEl.querySelectorAll<HTMLAnchorElement>('.quick-action-link').forEach((link) => {
            link.addEventListener('click', (e) => {
                const actionId = link.id;
                const href = link.getAttribute('href');
                this.onActionTriggered?.(actionId);

                // Dedicated handler for Enquire action modal trigger
                if (actionId === 'qaEnquireAction' || href === '#enquiryModal') {
                    e.preventDefault();
                    this.close();
                    const enquiryModal = document.getElementById('enquiryModal');
                    if (enquiryModal) {
                        enquiryModal.removeAttribute('hidden');
                        enquiryModal.setAttribute('aria-modal', 'true');
                        const firstInput = enquiryModal.querySelector<HTMLElement>('input:not([disabled]), textarea:not([disabled]), button:not([disabled])');
                        firstInput?.focus();
                    }
                    const fab = document.getElementById('enquiryFab');
                    if (fab) {
                        fab.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                    }
                    return;
                }

                // For in-page anchor links (e.g. #location), smooth scroll and close
                if (href && href.startsWith('#')) {
                    e.preventDefault();
                    this.close();
                    const targetEl = document.querySelector<HTMLElement>(href);
                    if (targetEl) {
                        targetEl.scrollIntoView({ behavior: 'smooth' });
                    }
                } else if (href && href.startsWith('/prospectus.html')) {
                    // Allow navigation, close menu immediately
                    this.close();
                } else {
                    // External / tel link, close menu after trigger
                    setTimeout(() => this.close(), 100);
                }
            });
        });

        // Outside click to close
        this.documentClickHandler = (e: MouseEvent) => {
            if (!this._isOpen) return;
            const target = e.target as Node | null;
            if (this.menuEl && !this.menuEl.contains(target) && this.triggerBtn && !this.triggerBtn.contains(target)) {
                this.close();
            }
        };
        document.addEventListener('click', this.documentClickHandler);

        // Keyboard navigation (Escape to close, Up/Down arrow navigation)
        this.keydownHandler = (e: KeyboardEvent) => {
            if (!this._isOpen) return;

            if (e.key === 'Escape') {
                e.preventDefault();
                this.close();
                this.triggerBtn?.focus();
                return;
            }

            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                this.handleArrowNavigation(e.key === 'ArrowDown' ? 1 : -1);
            }
        };
        document.addEventListener('keydown', this.keydownHandler);
    }

    private handleArrowNavigation(direction: number): void {
        if (!this.menuEl) return;
        const items = Array.from(this.menuEl.querySelectorAll<HTMLAnchorElement>('.quick-action-link'));
        if (items.length === 0) return;

        const activeIndex = items.indexOf(document.activeElement as HTMLAnchorElement);
        let nextIndex = activeIndex + direction;

        if (nextIndex < 0) nextIndex = items.length - 1;
        if (nextIndex >= items.length) nextIndex = 0;

        items[nextIndex]?.focus();
    }

    public open(): void {
        if (this._isOpen || !this.menuEl || !this.triggerBtn) return;

        this._isOpen = true;
        this.menuEl.classList.remove('is-closing');
        this.menuEl.classList.add('is-open');
        this.triggerBtn.setAttribute('aria-expanded', 'true');
        this.triggerBtn.classList.add('is-active');

        // Optional Apple/Android tactile micro-feedback
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            try { navigator.vibrate(8); } catch { }
        }

        // Focus first menu item for keyboard accessibility
        requestAnimationFrame(() => {
            const firstLink = this.menuEl?.querySelector<HTMLAnchorElement>('.quick-action-link');
            firstLink?.focus();
        });
    }

    public close(): void {
        if (!this._isOpen || !this.menuEl || !this.triggerBtn) return;

        this._isOpen = false;
        this.menuEl.classList.remove('is-open');
        this.menuEl.classList.add('is-closing');
        this.triggerBtn.setAttribute('aria-expanded', 'false');
        this.triggerBtn.classList.remove('is-active');

        // Optional subtle tactile micro-feedback
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            try { navigator.vibrate(4); } catch { }
        }

        setTimeout(() => {
            if (!this._isOpen && this.menuEl) {
                this.menuEl.classList.remove('is-closing');
            }
        }, 220);
    }

    public toggle(): void {
        if (this._isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    public isOpen(): boolean {
        return this._isOpen;
    }

    public destroy(): void {
        this.close();
        if (this.documentClickHandler) {
            document.removeEventListener('click', this.documentClickHandler);
        }
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
        }
        this.menuEl?.remove();
        this.menuEl = null;
    }
}
