/**
 * ============================================================================
 * SJCCC – Accessible Local Search History Dropdown UI Controller
 * Renders and manages a compact "Recent searches" popover associated with a
 * search input field. Supports keyboard navigation, individual item removal,
 * full history clearing, and intentional search commit detection.
 * ============================================================================
 */

import { SearchHistoryStore, normalizeSearchQuery } from '../../core/storage/SearchHistoryStore.ts';

export interface SearchHistoryDropdownOptions {
    /** Target search <input> element */
    inputEl: HTMLInputElement | null;
    /** Wrapper element with `position: relative` where the dropdown will be mounted */
    wrapperEl: HTMLElement | null;
    /** Storage key for this specific search feature */
    storageKey: string;
    /** Unique ID prefix for ARIA attributes (e.g. 'timeline-search-history' or 'faq-search-history') */
    idPrefix: string;
    /** Accessible label for the recent searches region */
    regionLabel: string;
    /** Callback invoked when the user selects a recent search item */
    onSelectQuery: (query: string) => void;
    /** Optional predicate to verify whether a query should be saved (e.g. non-empty or valid) */
    shouldSaveQuery?: (query: string) => boolean;
    /** Idle pause in ms before committing an intentional typed search (default: 1100ms) */
    commitIdleMs?: number;
}

export class SearchHistoryDropdown {
    private readonly inputEl: HTMLInputElement | null;
    private readonly wrapperEl: HTMLElement | null;
    private readonly store: SearchHistoryStore;
    private readonly idPrefix: string;
    private readonly regionLabel: string;
    private readonly onSelectQuery: (query: string) => void;
    private readonly shouldSaveQuery?: (query: string) => boolean;
    private readonly commitIdleMs: number;

    private panelEl: HTMLElement | null = null;
    private listEl: HTMLUListElement | null = null;
    private clearBtnEl: HTMLButtonElement | null = null;
    private liveStatusEl: HTMLElement | null = null;

    private isOpen: boolean = false;
    private activeIndex: number = -1;
    private commitTimer: number | null = null;
    private lastCommittedQuery: string = '';

    private readonly boundHandleFocus = () => this.handleInputFocus();
    private readonly boundHandleInput = () => this.handleInputChange();
    private readonly boundHandleKeydown = (e: KeyboardEvent) => this.handleInputKeydown(e);
    private readonly boundHandleBlur = () => this.handleInputBlur();
    private readonly boundHandleDocumentPointerDown = (e: PointerEvent) => this.handleDocumentPointerDown(e);

    constructor(options: SearchHistoryDropdownOptions) {
        this.inputEl = options.inputEl;
        this.wrapperEl = options.wrapperEl;
        this.store = new SearchHistoryStore(options.storageKey);
        this.idPrefix = options.idPrefix;
        this.regionLabel = options.regionLabel;
        this.onSelectQuery = options.onSelectQuery;
        this.shouldSaveQuery = options.shouldSaveQuery;
        this.commitIdleMs = options.commitIdleMs ?? 1100;

        if (!this.inputEl || !this.wrapperEl) return;

        this.init();
    }

    private init(): void {
        this.buildDOM();
        this.bindEvents();
    }

    private buildDOM(): void {
        if (!this.wrapperEl || !this.inputEl) return;

        const panelId = `${this.idPrefix}-panel`;
        const titleId = `${this.idPrefix}-title`;
        const listId = `${this.idPrefix}-list`;

        this.inputEl.setAttribute('aria-controls', panelId);
        this.inputEl.setAttribute('aria-expanded', 'false');
        this.inputEl.setAttribute('autocomplete', 'off');

        const panel = document.createElement('div');
        panel.id = panelId;
        panel.className = 'search-history-dropdown';
        panel.setAttribute('role', 'region');
        panel.setAttribute('aria-labelledby', titleId);
        panel.hidden = true;

        const header = document.createElement('div');
        header.className = 'search-history-header';

        const title = document.createElement('span');
        title.id = titleId;
        title.className = 'search-history-title';
        title.innerHTML = `<i class="bi bi-clock-history" aria-hidden="true"></i> <span>${this.regionLabel}</span>`;

        const clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.className = 'search-history-clear-btn';
        clearBtn.setAttribute('aria-label', `Clear ${this.regionLabel.toLowerCase()}`);
        clearBtn.innerHTML = `<i class="bi bi-trash3" aria-hidden="true"></i> <span>Clear history</span>`;

        header.appendChild(title);
        header.appendChild(clearBtn);

        const list = document.createElement('ul');
        list.id = listId;
        list.className = 'search-history-list';
        list.setAttribute('role', 'list');

        const liveStatus = document.createElement('span');
        liveStatus.className = 'sr-only';
        liveStatus.setAttribute('aria-live', 'polite');

        panel.appendChild(header);
        panel.appendChild(list);
        panel.appendChild(liveStatus);

        this.wrapperEl.appendChild(panel);

        this.panelEl = panel;
        this.listEl = list;
        this.clearBtnEl = clearBtn;
        this.liveStatusEl = liveStatus;
    }

    private bindEvents(): void {
        if (!this.inputEl || !this.panelEl) return;

        this.inputEl.addEventListener('focus', this.boundHandleFocus);
        this.inputEl.addEventListener('click', this.boundHandleFocus);
        this.inputEl.addEventListener('input', this.boundHandleInput);
        this.inputEl.addEventListener('keydown', this.boundHandleKeydown);
        this.inputEl.addEventListener('blur', this.boundHandleBlur);

        this.clearBtnEl?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.clearAllHistory();
        });

        this.panelEl.addEventListener('keydown', (e: KeyboardEvent) => {
            this.handlePanelKeydown(e);
        });

        document.addEventListener('pointerdown', this.boundHandleDocumentPointerDown);
    }

    /**
     * Saves the current input query if it passes normalization and validation rules.
     */
    public commitQuery(rawQuery?: string): void {
        if (this.commitTimer !== null) {
            window.clearTimeout(this.commitTimer);
            this.commitTimer = null;
        }

        const source = rawQuery !== undefined ? rawQuery : (this.inputEl?.value ?? '');
        const clean = normalizeSearchQuery(source);
        if (clean.length < 2) return;

        if (this.shouldSaveQuery && !this.shouldSaveQuery(clean)) {
            return;
        }

        this.store.addQuery(clean);
        this.lastCommittedQuery = clean.toLowerCase();
    }

    /**
     * Opens the recent searches dropdown if the input is empty and history exists.
     */
    public syncVisibility(): void {
        if (!this.inputEl || !this.panelEl) return;

        const currentVal = normalizeSearchQuery(this.inputEl.value);
        const isFocused = document.activeElement === this.inputEl || (this.panelEl && this.panelEl.contains(document.activeElement));
        const entries = this.store.getHistory();

        if (isFocused && currentVal.length === 0 && entries.length > 0) {
            this.renderEntries(entries);
            this.open();
        } else {
            this.close();
        }
    }

    public open(): void {
        if (!this.panelEl || !this.inputEl) return;
        const entries = this.store.getHistory();
        if (entries.length === 0) {
            this.close();
            return;
        }

        this.renderEntries(entries);
        this.panelEl.hidden = false;
        this.isOpen = true;
        this.activeIndex = -1;
        this.inputEl.setAttribute('aria-expanded', 'true');
    }

    public close(): void {
        if (!this.panelEl || !this.inputEl) return;
        this.panelEl.hidden = true;
        this.isOpen = false;
        this.activeIndex = -1;
        this.inputEl.setAttribute('aria-expanded', 'false');
    }

    public getHistory(): string[] {
        return this.store.getHistory();
    }

    public clearAllHistory(): void {
        this.store.clearHistory();
        this.lastCommittedQuery = '';
        if (this.liveStatusEl) {
            this.liveStatusEl.textContent = 'Search history cleared.';
        }
        this.close();
        this.inputEl?.focus();
    }

    private renderEntries(entries: string[]): void {
        if (!this.listEl) return;
        this.listEl.innerHTML = '';

        entries.forEach((query, index) => {
            const li = document.createElement('li');
            li.className = 'search-history-item';

            const selectBtn = document.createElement('button');
            selectBtn.type = 'button';
            selectBtn.className = 'search-history-select-btn';
            selectBtn.dataset.historyIndex = String(index);
            selectBtn.setAttribute('aria-label', `Search again for "${query}"`);

            const icon = document.createElement('i');
            icon.className = 'bi bi-arrow-counterclockwise search-history-item-icon';
            icon.setAttribute('aria-hidden', 'true');

            const textSpan = document.createElement('span');
            textSpan.className = 'search-history-item-text';
            textSpan.textContent = query; // Safe textContent prevents XSS

            selectBtn.appendChild(icon);
            selectBtn.appendChild(textSpan);

            selectBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.selectEntry(query);
            });

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'search-history-remove-btn';
            removeBtn.setAttribute('aria-label', `Remove "${query}" from recent searches`);
            removeBtn.setAttribute('title', `Remove "${query}"`);
            removeBtn.innerHTML = '<i class="bi bi-x-lg" aria-hidden="true"></i>';

            removeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.removeSingleEntry(query);
            });

            li.appendChild(selectBtn);
            li.appendChild(removeBtn);
            this.listEl!.appendChild(li);
        });
    }

    private selectEntry(query: string): void {
        if (!this.inputEl) return;
        this.inputEl.value = query;
        this.commitQuery(query);
        this.close();
        this.onSelectQuery(query);
    }

    private removeSingleEntry(query: string): void {
        const updated = this.store.removeQuery(query);
        if (updated.length === 0) {
            this.close();
            this.inputEl?.focus();
        } else {
            this.renderEntries(updated);
            const buttons = this.getItemButtons();
            if (buttons.length > 0) {
                const targetIdx = Math.min(Math.max(0, this.activeIndex), buttons.length - 1);
                this.activeIndex = targetIdx;
                buttons[targetIdx]?.focus();
            } else {
                this.inputEl?.focus();
            }
        }
    }

    private handleInputFocus(): void {
        this.syncVisibility();
    }

    private handleInputChange(): void {
        if (!this.inputEl) return;
        const clean = normalizeSearchQuery(this.inputEl.value);

        if (this.commitTimer !== null) {
            window.clearTimeout(this.commitTimer);
            this.commitTimer = null;
        }

        if (clean.length === 0) {
            this.syncVisibility();
            return;
        }

        // Transition naturally from Recent searches to actual search results
        this.close();

        // Schedule intentional search commit only after user finishes typing
        if (clean.length >= 2 && clean.toLowerCase() !== this.lastCommittedQuery) {
            this.commitTimer = window.setTimeout(() => {
                this.commitQuery(this.inputEl?.value ?? '');
            }, this.commitIdleMs);
        }
    }

    private handleInputBlur(): void {
        // If the user typed a valid search and leaves the input, commit that final query
        if (this.inputEl) {
            const clean = normalizeSearchQuery(this.inputEl.value);
            if (clean.length >= 2) {
                this.commitQuery(clean);
            }
        }

        // Delay closing slightly so clicks or focus moves into the dropdown panel succeed
        window.setTimeout(() => {
            if (!this.wrapperEl) return;
            const active = document.activeElement;
            if (!active || !this.wrapperEl.contains(active)) {
                this.close();
            }
        }, 140);
    }

    private handleInputKeydown(e: KeyboardEvent): void {
        if (!this.inputEl) return;

        if (e.key === 'Enter') {
            const clean = normalizeSearchQuery(this.inputEl.value);
            if (clean.length >= 2) {
                this.commitQuery(clean);
                this.close();
            }
            return;
        }

        if (e.key === 'Escape') {
            if (this.isOpen) {
                e.preventDefault();
                e.stopPropagation();
                this.close();
            }
            return;
        }

        if (e.key === 'ArrowDown' && this.isOpen) {
            const buttons = this.getItemButtons();
            if (buttons.length > 0) {
                e.preventDefault();
                this.activeIndex = 0;
                buttons[0]?.focus();
            }
        }
    }

    private handlePanelKeydown(e: KeyboardEvent): void {
        if (!this.isOpen) return;

        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            this.close();
            this.inputEl?.focus();
            return;
        }

        const buttons = this.getItemButtons();
        if (buttons.length === 0) return;

        const currentEl = document.activeElement as HTMLElement | null;
        const currentIdx = buttons.findIndex((b) => b === currentEl);

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIdx = currentIdx < buttons.length - 1 ? currentIdx + 1 : 0;
            this.activeIndex = nextIdx;
            buttons[nextIdx]?.focus();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (currentIdx <= 0) {
                this.activeIndex = -1;
                this.inputEl?.focus();
            } else {
                const prevIdx = currentIdx - 1;
                this.activeIndex = prevIdx;
                buttons[prevIdx]?.focus();
            }
        }
    }

    private handleDocumentPointerDown(e: PointerEvent): void {
        if (!this.isOpen || !this.wrapperEl) return;
        const target = e.target as Node | null;
        if (target && !this.wrapperEl.contains(target)) {
            this.close();
        }
    }

    private getItemButtons(): HTMLButtonElement[] {
        if (!this.listEl) return [];
        return Array.from(this.listEl.querySelectorAll<HTMLButtonElement>('.search-history-select-btn'));
    }

    public destroy(): void {
        if (this.commitTimer !== null) {
            window.clearTimeout(this.commitTimer);
            this.commitTimer = null;
        }
        this.inputEl?.removeEventListener('focus', this.boundHandleFocus);
        this.inputEl?.removeEventListener('click', this.boundHandleFocus);
        this.inputEl?.removeEventListener('input', this.boundHandleInput);
        this.inputEl?.removeEventListener('keydown', this.boundHandleKeydown);
        this.inputEl?.removeEventListener('blur', this.boundHandleBlur);
        document.removeEventListener('pointerdown', this.boundHandleDocumentPointerDown);
        this.panelEl?.remove();
    }
}
