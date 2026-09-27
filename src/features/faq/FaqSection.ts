/**
 * ============================================================================
 * SJCCC – Frequently Asked Questions (FAQ) Controller
 * ============================================================================
 */

export interface FaqItemElements {
    item: HTMLElement;
    trigger: HTMLButtonElement;
    content: HTMLElement;
    titleEl: HTMLElement | null;
    answerInnerEl: HTMLElement | null;
    category: string;
    questionText: string;
    answerText: string;
    originalTitleHtml: string;
    originalAnswerHtml: string;
}

// Utility: Type-safe debounce function to prevent memory leaks & rate-limit rapid inputs
function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: number | null = null;
    return (...args: Parameters<T>) => {
        if (timeout !== null) window.clearTimeout(timeout);
        timeout = window.setTimeout(() => func(...args), wait);
    };
}

export class FaqSection {
    private container: HTMLElement | null;
    private accordionEl: HTMLElement | null;
    private items: FaqItemElements[] = [];
    private filterButtons: NodeListOf<HTMLButtonElement>;
    private searchInput: HTMLInputElement | null;
    private searchClearBtn: HTMLButtonElement | null;
    private expandAllBtn: HTMLButtonElement | null;
    private collapseAllBtn: HTMLButtonElement | null;
    private toolsSeparator: HTMLElement | null;
    private resultCountEl: HTMLElement | null;
    private emptyStateEl: HTMLElement | null;
    private emptyResetBtn: HTMLButtonElement | null;
    
    private currentCategory: string = 'all';
    private currentSearchQuery: string = '';
    
    // Using our encapsulated debounce utility
    private debouncedFilterItems = debounce((animate: boolean) => this.filterItems(animate), 120);
    private debouncedCategoryFilter = debounce(() => this.executeCategoryFilter(), 110);

    constructor() {
        this.container = document.getElementById('faq');
        this.accordionEl = document.getElementById('faqAccordion');
        this.filterButtons = document.querySelectorAll<HTMLButtonElement>('[data-faq-filter]');
        this.searchInput = document.getElementById('faqSearchInput') as HTMLInputElement | null;
        this.searchClearBtn = document.getElementById('faqSearchClear') as HTMLButtonElement | null;
        this.expandAllBtn = document.getElementById('faqExpandAllBtn') as HTMLButtonElement | null;
        this.collapseAllBtn = document.getElementById('faqCollapseAllBtn') as HTMLButtonElement | null;
        this.toolsSeparator = document.getElementById('faqToolsSeparator');
        this.resultCountEl = document.getElementById('faqResultCount');
        this.emptyStateEl = document.getElementById('faqEmptyState');
        this.emptyResetBtn = document.getElementById('faqEmptyResetBtn') as HTMLButtonElement | null;

        if (this.container) {
            this.init();
        }
    }

    private init(): void {
        this.collectItems();
        this.bindAccordionEvents();
        this.bindFilterEvents();
        this.bindSearchEvents();
        this.bindExpandCollapseEvents();
        this.bindKeyboardNav();
        this.updateCounts();
        this.updateExpandCollapseState();
        this.checkInitialHash();
    }

    private collectItems(): void {
        const itemNodes = this.container?.querySelectorAll<HTMLElement>('.faq-item') || [];
        
        this.items = Array.from(itemNodes).reduce<FaqItemElements[]>((acc, item) => {
            const trigger = item.querySelector<HTMLButtonElement>('.faq-question-btn');
            const content = item.querySelector<HTMLElement>('.faq-answer-content');
            
            if (trigger && content) {
                const titleEl = trigger.querySelector<HTMLElement>('.faq-question-title');
                const answerInnerEl = content.querySelector<HTMLElement>('.faq-answer-inner');

                acc.push({
                    item,
                    trigger,
                    content,
                    titleEl,
                    answerInnerEl,
                    category: item.dataset.category || 'all',
                    questionText: trigger.textContent?.toLowerCase() || '',
                    answerText: content.textContent?.toLowerCase() || '',
                    originalTitleHtml: titleEl ? titleEl.innerHTML : '',
                    originalAnswerHtml: answerInnerEl ? answerInnerEl.innerHTML : '',
                });
            }
            return acc;
        }, []);
    }

    private bindAccordionEvents(): void {
        this.items.forEach(({ trigger, content, item }) => {
            trigger.addEventListener('click', () => {
                delete item.dataset.searchAutoOpened;
                const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
                isExpanded ? this.collapseItem(trigger, content, item) : this.expandItem(trigger, content, item);
            });
        });
    }

    private expandItem(trigger: HTMLButtonElement, content: HTMLElement, item: HTMLElement): void {
        trigger.setAttribute('aria-expanded', 'true');
        item.classList.add('is-open');
        content.hidden = false;

        content.style.maxHeight = `${content.scrollHeight + 40}px`;

        content.addEventListener('transitionend', (e) => {
            // Prevent child transitions from triggering this
            if (e.target !== content) return; 
            // Race-condition check: Ensure it wasn't collapsed during the animation
            if (trigger.getAttribute('aria-expanded') === 'true') {
                content.style.maxHeight = 'none';
            }
        }, { once: true });
        
        this.updateExpandCollapseState();
    }

    private collapseItem(trigger: HTMLButtonElement, content: HTMLElement, item: HTMLElement): void {
        trigger.setAttribute('aria-expanded', 'false');
        item.classList.remove('is-open');

        // If it was fully open, it has max-height: none. We must set it to a pixel value before animating to 0.
        if (content.style.maxHeight === 'none') {
            content.style.maxHeight = `${content.scrollHeight}px`;
            void content.offsetHeight; // Force reflow
        }
        
        content.style.maxHeight = '0px';

        content.addEventListener('transitionend', (e) => {
            if (e.target !== content) return;
            // Race-condition check: Ensure it wasn't expanded again during the animation
            if (trigger.getAttribute('aria-expanded') === 'false') {
                content.hidden = true;
            }
        }, { once: true });
        
        this.updateExpandCollapseState();
    }

    private isReducedMotion(): boolean {
        return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    private bindFilterEvents(): void {
        this.filterButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                const filter = btn.dataset.faqFilter || 'all';
                this.setCategory(filter, true);
            });
        });
    }

    public setCategory(category: string, animate: boolean = true): void {
        if (this.currentCategory === category) return;
        this.currentCategory = category;

        this.filterButtons.forEach((btn) => {
            const isActive = btn.dataset.faqFilter === category;
            btn.classList.toggle('is-active', isActive);
            btn.setAttribute('aria-selected', String(isActive));
        });

        if (!animate || this.isReducedMotion() || !this.accordionEl) {
            this.accordionEl?.classList.remove('is-filtering');
            this.filterItems(false);
            return;
        }

        this.accordionEl.classList.add('is-filtering');
        this.debouncedCategoryFilter();
    }
    
    private executeCategoryFilter(): void {
        this.filterItems(true);
        requestAnimationFrame(() => {
            this.accordionEl?.classList.remove('is-filtering');
        });
    }

    private bindSearchEvents(): void {
        if (!this.searchInput) return;

        this.searchInput.addEventListener('input', () => {
            this.currentSearchQuery = this.searchInput?.value.trim().toLowerCase() || '';
            if (this.searchClearBtn) {
                this.searchClearBtn.hidden = this.currentSearchQuery.length === 0;
            }
            this.debouncedFilterItems(true);
        });

        this.searchInput.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Escape' && this.currentSearchQuery.length > 0) {
                e.preventDefault();
                this.resetSearch();
            }
        });

        this.searchInput.addEventListener('search', () => {
            if (!this.searchInput?.value) {
                this.resetSearch();
            }
        });

        this.searchClearBtn?.addEventListener('click', () => this.resetSearch());
        this.emptyResetBtn?.addEventListener('click', () => {
            this.resetSearch();
            this.setCategory('all', true);
        });
    }

    private resetSearch(): void {
        if (this.searchInput) {
            this.searchInput.value = '';
            this.currentSearchQuery = '';
            this.searchInput.focus();
        }
        if (this.searchClearBtn) this.searchClearBtn.hidden = true;
        this.clearHighlights();
        this.filterItems(true);
    }

    private clearHighlights(): void {
        this.items.forEach(({ titleEl, answerInnerEl, originalTitleHtml, originalAnswerHtml }) => {
            if (titleEl && originalTitleHtml) {
                titleEl.innerHTML = originalTitleHtml;
            }
            if (answerInnerEl && originalAnswerHtml) {
                answerInnerEl.innerHTML = originalAnswerHtml;
            }
        });
    }

    private highlightTerms(terms: string[]): void {
        if (!terms.length) return;

        const validTerms = terms
            .map((t) => t.trim())
            .filter((t) => t.length > 0);
        if (!validTerms.length) return;

        // Sort descending by length so longer phrases are matched first
        const sortedTerms = [...validTerms].sort((a, b) => b.length - a.length);
        const escaped = sortedTerms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const regex = new RegExp(`(${escaped.join('|')})`, 'gi');

        this.items.forEach(({ item, titleEl, answerInnerEl }) => {
            if (item.hidden) return;

            if (titleEl) {
                this.highlightNode(titleEl, regex);
            }
            if (answerInnerEl) {
                this.highlightNode(answerInnerEl, regex);
            }
        });
    }

    private highlightNode(rootNode: Node, regex: RegExp): void {
        const walker = document.createTreeWalker(
            rootNode,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode(node) {
                    const parent = node.parentElement;
                    if (!parent) return NodeFilter.FILTER_REJECT;
                    const tag = parent.tagName.toLowerCase();
                    if (tag === 'mark' || tag === 'script' || tag === 'style') {
                        return NodeFilter.FILTER_REJECT;
                    }
                    regex.lastIndex = 0;
                    return node.nodeValue && regex.test(node.nodeValue)
                        ? NodeFilter.FILTER_ACCEPT
                        : NodeFilter.FILTER_SKIP;
                }
            }
        );

        const textNodes: Text[] = [];
        while (walker.nextNode()) {
            textNodes.push(walker.currentNode as Text);
        }

        textNodes.forEach((textNode) => {
            const text = textNode.nodeValue || '';
            regex.lastIndex = 0;
            const parts = text.split(regex);
            if (parts.length <= 1) return;

            const fragment = document.createDocumentFragment();
            parts.forEach((part) => {
                if (!part) return;
                regex.lastIndex = 0;
                if (regex.test(part)) {
                    const mark = document.createElement('mark');
                    mark.className = 'faq-highlight';
                    mark.textContent = part;
                    fragment.appendChild(mark);
                } else {
                    fragment.appendChild(document.createTextNode(part));
                }
            });

            textNode.parentNode?.replaceChild(fragment, textNode);
        });
    }

    private clearItemAnimations(): void {
        this.items.forEach(({ item }) => {
            item.classList.remove('faq-item-entering');
            item.style.removeProperty('--faq-item-index');
        });
    }

    private filterItems(animateItems: boolean = false): void {
        this.clearItemAnimations();
        this.clearHighlights();
        
        let visibleCount = 0;
        const query = this.currentSearchQuery;
        const category = this.currentCategory;
        const shouldAnimate = animateItems && !this.isReducedMotion();
        
        // Tokenize search query for multi-word fuzzy matching (e.g., "fee admission" matches "admission fee")
        const searchTerms = query.split(/\s+/).filter(Boolean);
        const hasSearch = searchTerms.length > 0;

        this.items.forEach(({ item, trigger, content, category: itemCat, questionText, answerText }) => {
            const matchesCategory = category === 'all' || itemCat === category;
            
            const matchesSearch = searchTerms.length === 0 || searchTerms.every(term => 
                questionText.includes(term) || 
                answerText.includes(term) || 
                itemCat.includes(term)
            );

            if (matchesCategory && matchesSearch) {
                item.hidden = false;
                item.classList.remove('is-filtered-out');
                item.classList.add('revealed');

                if (shouldAnimate) {
                    item.style.setProperty('--faq-item-index', String(Math.min(visibleCount, 6)));
                    item.classList.add('faq-item-entering');
                    item.addEventListener('animationend', () => {
                        item.classList.remove('faq-item-entering');
                        item.style.removeProperty('--faq-item-index');
                    }, { once: true });
                }

                // If searching and query matched inside the answer, auto-expand the item so matches are instantly visible
                if (hasSearch && query.length >= 2) {
                    const matchInAnswer = searchTerms.some((term) => answerText.includes(term));
                    if (matchInAnswer && !item.classList.contains('is-open')) {
                        item.dataset.searchAutoOpened = 'true';
                        this.expandItem(trigger, content, item);
                    }
                }

                visibleCount++;
            } else {
                item.hidden = true;
                item.classList.add('is-filtered-out');

                // If it was auto-opened by search, collapse it when it no longer matches
                if (item.dataset.searchAutoOpened === 'true' && item.classList.contains('is-open')) {
                    delete item.dataset.searchAutoOpened;
                    this.collapseItem(trigger, content, item);
                }
            }
        });

        // When search is cleared, collapse any items that were auto-opened by search
        if (!hasSearch) {
            this.items.forEach(({ item, trigger, content }) => {
                if (item.dataset.searchAutoOpened === 'true') {
                    delete item.dataset.searchAutoOpened;
                    if (item.classList.contains('is-open')) {
                        this.collapseItem(trigger, content, item);
                    }
                }
            });
        }

        // Apply text highlighting to all visible matching items
        if (hasSearch) {
            this.highlightTerms(searchTerms);
        }

        this.updateUIFeedback(visibleCount, query, category);
        this.updateExpandCollapseState();
    }

    private updateUIFeedback(visibleCount: number, query: string, category: string): void {
        // Update Result Count
        if (this.resultCountEl) {
            const total = this.items.length;
            const newText = (query || category !== 'all')
                ? `Showing ${visibleCount} of ${total} questions`
                : `All ${total} questions`;

            if (this.resultCountEl.textContent !== newText) {
                this.resultCountEl.textContent = newText;
                if (!this.isReducedMotion()) {
                    this.resultCountEl.classList.remove('is-updated');
                    void this.resultCountEl.offsetWidth; // Trigger reflow
                    this.resultCountEl.classList.add('is-updated');
                }
            }
        }

        // Update Empty State
        if (this.emptyStateEl) {
            const isEmpty = visibleCount === 0;
            this.emptyStateEl.hidden = !isEmpty;
            if (isEmpty) {
                const querySpan = this.emptyStateEl.querySelector<HTMLElement>('.faq-empty-query');
                if (querySpan) querySpan.textContent = query ? `"${query}"` : 'the selected category';
            }
        }
    }

    private updateExpandCollapseState(): void {
        const visibleItems = this.items.filter(({ item }) => !item.hidden);
        const totalVisible = visibleItems.length;
        const expandedCount = visibleItems.filter(({ item }) => item.classList.contains('is-open')).length;

        const hasVisible = totalVisible > 0;
        const allExpanded = hasVisible && expandedCount === totalVisible;
        const allCollapsed = hasVisible && expandedCount === 0;

        // Unified toggler function to prevent DRY violations
        this.toggleControlState(this.expandAllBtn, hasVisible && !allExpanded);
        this.toggleControlState(this.collapseAllBtn, hasVisible && !allCollapsed);
        this.toggleControlState(this.toolsSeparator, hasVisible && !allExpanded && !allCollapsed);
    }

    private toggleControlState(el: HTMLElement | HTMLButtonElement | null, isVisible: boolean): void {
        if (!el) return;
        el.hidden = !isVisible;
        if (el instanceof HTMLButtonElement) {
            el.disabled = !isVisible;
        }
    }

    private bindExpandCollapseEvents(): void {
        this.expandAllBtn?.addEventListener('click', () => {
            this.items.forEach(({ trigger, content, item }) => {
                if (!item.hidden && !item.classList.contains('is-open')) this.expandItem(trigger, content, item);
            });
        });

        this.collapseAllBtn?.addEventListener('click', () => {
            this.items.forEach(({ trigger, content, item }) => {
                if (!item.hidden && item.classList.contains('is-open')) this.collapseItem(trigger, content, item);
            });
        });
    }

    private bindKeyboardNav(): void {
        this.container?.addEventListener('keydown', (e: KeyboardEvent) => {
            // Early return if not relevant key
            if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;

            const activeEl = document.activeElement as HTMLElement | null;
            if (!activeEl?.classList.contains('faq-question-btn')) return;

            // Optimization: Only query DOM for visible triggers rather than filtering the entire array on every keystroke
            const visibleTriggers = Array.from(this.container!.querySelectorAll<HTMLButtonElement>('.faq-item:not([hidden]) .faq-question-btn'));
            const currentIndex = visibleTriggers.indexOf(activeEl as HTMLButtonElement);
            
            if (currentIndex === -1) return;

            e.preventDefault();
            let nextIndex = currentIndex;

            switch (e.key) {
                case 'ArrowDown':
                    nextIndex = (currentIndex + 1) % visibleTriggers.length;
                    break;
                case 'ArrowUp':
                    nextIndex = (currentIndex - 1 + visibleTriggers.length) % visibleTriggers.length;
                    break;
                case 'Home':
                    nextIndex = 0;
                    break;
                case 'End':
                    nextIndex = visibleTriggers.length - 1;
                    break;
            }

            visibleTriggers[nextIndex]?.focus();
        });
    }

    private updateCounts(): void {
        const counts = this.items.reduce<Record<string, number>>((acc, { category }) => {
            acc[category] = (acc[category] || 0) + 1;
            return acc;
        }, { all: this.items.length });

        this.filterButtons.forEach((btn) => {
            const filter = btn.dataset.faqFilter;
            if (!filter) return;
            const badge = btn.querySelector<HTMLElement>('.faq-filter-count');
            if (badge) badge.textContent = String(counts[filter] || 0);
        });
    }

    private checkInitialHash(): void {
        const hash = window.location.hash;
        if (!hash) return;

        const categoryMatches: Record<string, string> = {
            '#faq-admissions': 'admissions',
            '#faq-boarding': 'boarding',
            '#faq-fees': 'fees'
        };

        if (categoryMatches[hash]) {
            this.setCategory(categoryMatches[hash], false);
            this.scrollToFaq();
        } else if (hash.startsWith('#faq-q-')) {
            const targetItem = document.querySelector<HTMLElement>(hash);
            const match = this.items.find((i) => i.item === targetItem);
            
            if (targetItem && match) {
                if (match.category !== 'all') {
                    this.setCategory('all', false); // Optional: or switch to the item's category
                }
                this.expandItem(match.trigger, match.content, match.item);
                
                // Allow DOM to settle before scrolling
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        targetItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        match.trigger.focus();
                    }, 150);
                });
            }
        }
    }

    private scrollToFaq(): void {
        this.container?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}