/**
 * ============================================================================
 * SJCCC – AI Guidance Assistant Widget (AiAssistantWidget.ts)
 * Interactive School Q&A Widget powered by Google Gemini (gemini-3.8-flash).
 * Lightweight, zero-dependency, glassmorphic floating modal with motion suspension.
 * ============================================================================
 */

import { geminiService, type ChatMessage } from './geminiService.ts';
import { motionSuspension } from '../../core/physics/MotionSuspension.ts';
import { AiChatHistoryStore } from '../../core/storage/AiChatHistoryStore.ts';
import { getCurrentPageContext } from './pageContext.ts';

export interface AiWidgetConfig {
    container?: HTMLElement;
    fabLabel?: string;
    starterPrompts?: string[];
    historyStore?: AiChatHistoryStore;
}

export class AiAssistantWidget {
    private isOpen: boolean = false;
    private isLoading: boolean = false;
    private history: ChatMessage[] = [];
    private readonly chatHistoryStore: AiChatHistoryStore;

    // DOM Elements
    private fabEl: HTMLButtonElement | null = null;
    private overlayEl: HTMLElement | null = null;
    private windowEl: HTMLElement | null = null;
    private messageContainerEl: HTMLElement | null = null;
    private typingIndicatorEl: HTMLElement | null = null;
    private inputEl: HTMLTextAreaElement | null = null;
    private sendBtnEl: HTMLButtonElement | null = null;
    private closeBtnEl: HTMLButtonElement | null = null;
    private resetBtnEl: HTMLButtonElement | null = null;

    private readonly starterPrompts: string[] = [
        'How do I apply for admission?',
        'What academic programs are offered?',
        'What are the school fees & payment terms?',
        'How do I send an official enquiry or message?'
    ];

    constructor(config: AiWidgetConfig = {}) {
        if (config.starterPrompts && config.starterPrompts.length > 0) {
            this.starterPrompts = config.starterPrompts;
        }
        this.chatHistoryStore = config.historyStore || new AiChatHistoryStore();
    }

    /**
     * Initializes the widget into the DOM and binds event listeners
     */
    public init(): this {
        // Prevent duplicate drawer initialization
        if (document.getElementById('sjcccAiDrawer')) {
            return this;
        }

        this.renderFab();
        this.renderDrawer();
        this.loadPersistedHistory();
        this.bindEvents();
        return this;
    }

    /**
     * Renders or attaches to the Floating Action Button (FAB)
     * Handles unified action dock or standalone trigger cleanly.
     */
    private renderFab(): void {
        const existingFab = document.getElementById('sjcccAiFab') as HTMLButtonElement | null;
        if (existingFab) {
            this.fabEl = existingFab;
            this.fabEl.setAttribute('aria-haspopup', 'dialog');
            this.fabEl.setAttribute('aria-expanded', 'false');
            return;
        }

        // Check if an existing #enquiryFab is on page to combine into a unified capsule
        const enquiryFab = document.getElementById('enquiryFab');
        if (enquiryFab && enquiryFab.parentElement) {
            const dock = document.createElement('div');
            dock.id = 'unifiedAssistanceDock';
            dock.className = 'unified-action-dock';
            dock.setAttribute('role', 'region');
            dock.setAttribute('aria-label', 'Assistance and Enquiry Actions');

            const aiFab = document.createElement('button');
            aiFab.id = 'sjcccAiFab';
            aiFab.type = 'button';
            aiFab.className = 'unified-dock-btn unified-dock-btn--ai';
            aiFab.setAttribute('aria-label', 'Open SJCCC AI Guidance Assistant');
            aiFab.setAttribute('title', 'Ask AI Assistant (Gemini 2.5 Flash)');
            aiFab.setAttribute('aria-haspopup', 'dialog');
            aiFab.setAttribute('aria-expanded', 'false');
            aiFab.innerHTML = `<i class="bi bi-stars" aria-hidden="true"></i><span class="dock-btn-label">Ask AI</span>`;

            const divider = document.createElement('span');
            divider.className = 'unified-dock-divider';
            divider.setAttribute('aria-hidden', 'true');

            enquiryFab.classList.add('unified-dock-btn', 'unified-dock-btn--enquiry');
            enquiryFab.classList.remove('enquiry-fab');

            enquiryFab.parentElement.insertBefore(dock, enquiryFab);
            dock.appendChild(aiFab);
            dock.appendChild(divider);
            dock.appendChild(enquiryFab);

            this.fabEl = aiFab;
            return;
        }

        // Standalone fallback
        const fab = document.createElement('button');
        fab.id = 'sjcccAiFab';
        fab.className = 'sjccc-ai-fab';
        fab.setAttribute('type', 'button');
        fab.setAttribute('aria-label', 'Open SJCCC AI Guidance Assistant');
        fab.setAttribute('title', 'Ask SJCCC AI Guidance Assistant');
        fab.setAttribute('aria-haspopup', 'dialog');
        fab.setAttribute('aria-expanded', 'false');

        fab.innerHTML = `
            <span class="sjccc-ai-fab__icon-wrap">
                <i class="bi bi-stars sjccc-ai-fab__icon" aria-hidden="true"></i>
                <span class="sjccc-ai-fab__pulse" aria-hidden="true"></span>
            </span>
            <span class="sjccc-ai-fab__label">Ask AI</span>
            <span class="sjccc-ai-fab__badge">Gemini</span>
        `;

        document.body.appendChild(fab);
        this.fabEl = fab;
    }

    /**
     * Renders the Drawer Window & Overlay
     */
    private renderDrawer(): void {
        // Overlay
        const overlay = document.createElement('div');
        overlay.id = 'sjcccAiOverlay';
        overlay.className = 'sjccc-ai-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        document.body.appendChild(overlay);
        this.overlayEl = overlay;

        // Modal Window
        const modal = document.createElement('div');
        modal.id = 'sjcccAiDrawer';
        modal.className = 'sjccc-ai-window';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'sjcccAiTitle');
        modal.setAttribute('aria-describedby', 'sjcccAiDesc');
        modal.setAttribute('hidden', '');

        modal.innerHTML = `
            <!-- Header -->
            <header class="sjccc-ai-header">
                <div class="sjccc-ai-header__left">
                    <div class="sjccc-ai-avatar">
                        <i class="bi bi-robot" aria-hidden="true"></i>
                        <span class="sjccc-ai-avatar__status" title="Assistant is active"></span>
                    </div>
                    <div class="sjccc-ai-header__info">
                        <h2 id="sjcccAiTitle" class="sjccc-ai-header__title" title="SJCCC Guidance Assistant">
                            <span class="sjccc-ai-header__title-text">SJCCC Guidance Assistant</span>
                        </h2>
                        <span class="sjccc-ai-header__subtitle">
                            <span class="sjccc-ai-header__badge">gemini-3.8</span>
                            <span class="sjccc-ai-header__subtitle-text">Official Q&amp;A</span>
                        </span>
                    </div>
                </div>
                <div class="sjccc-ai-header__actions">
                    <button type="button" id="sjcccAiSwitchToEnquiry" class="sjccc-ai-btn-text" aria-label="Open official enquiry form" title="Send official message via enquiry form">
                        <i class="bi bi-envelope-fill" aria-hidden="true"></i>
                        <span>Enquiry</span>
                    </button>
                    <button type="button" id="sjcccAiResetBtn" class="sjccc-ai-btn-icon" aria-label="Reset chat history" title="Start a fresh conversation">
                        <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
                    </button>
                    <button type="button" id="sjcccAiCloseBtn" class="sjccc-ai-btn-icon" aria-label="Close guidance assistant" title="Close assistant">
                        <i class="bi bi-x-lg" aria-hidden="true"></i>
                    </button>
                </div>
            </header>

            <!-- Conversation Area -->
            <div id="sjcccAiBody" class="sjccc-ai-body" role="log" aria-live="polite">
                <!-- Welcome Card -->
                <div class="sjccc-ai-welcome">
                    <h3 class="sjccc-ai-welcome__heading">
                        <i class="bi bi-shield-check" aria-hidden="true"></i> Welcome to SJCCC Guidance
                    </h3>
                    <p id="sjcccAiDesc" class="sjccc-ai-welcome__text">
                        Peace and blessings! I am your interactive assistant for <strong>St. Joseph's Catholic Comprehensive College Mbengwi</strong>. Ask me anything regarding admissions, tuition fees, academic curricula, technical trades, and campus policies.
                    </p>

                    <!-- Quick Starter Chips -->
                    <div class="sjccc-ai-chips-wrap">
                        <p class="sjccc-ai-chips-title"><i class="bi bi-lightbulb" aria-hidden="true"></i> Suggested Questions</p>
                        <div class="sjccc-ai-chips" id="sjcccAiChips"></div>
                    </div>
                </div>

                <!-- Messages container -->
                <div id="sjcccAiMessageList" class="sjccc-ai-messages-list"></div>

                <!-- Typing Indicator (hidden initially) -->
                <div id="sjcccAiTyping" class="sjccc-ai-typing" style="display: none;" aria-live="assertive">
                    <div class="sjccc-ai-typing__dots" aria-hidden="true">
                        <span class="sjccc-ai-typing__dot"></span>
                        <span class="sjccc-ai-typing__dot"></span>
                        <span class="sjccc-ai-typing__dot"></span>
                    </div>
                    <span>SJCCC Assistant is drafting guidance...</span>
                </div>
            </div>

            <!-- Footer & Input Bar -->
            <footer class="sjccc-ai-footer">
                <form id="sjcccAiForm" class="sjccc-ai-input-form" onsubmit="return false;">
                    <textarea 
                        id="sjcccAiInput" 
                        class="sjccc-ai-input" 
                        placeholder="Ask about admissions, programs, fees..." 
                        rows="1" 
                        maxlength="600"
                        aria-label="Your question about SJCCC"></textarea>
                    <button 
                        type="submit" 
                        id="sjcccAiSendBtn" 
                        class="sjccc-ai-send-btn" 
                        aria-label="Send message" 
                        disabled>
                        <i class="bi bi-send-fill" aria-hidden="true"></i>
                    </button>
                </form>
                <p id="sjcccAiFooterHint" class="sjccc-ai-footer__hint">Press Enter to send • Verified Catholic College Guidance</p>
            </footer>
        `;

        document.body.appendChild(modal);
        this.windowEl = modal;

        // Query DOM references
        this.messageContainerEl = modal.querySelector('#sjcccAiMessageList');
        this.typingIndicatorEl = modal.querySelector('#sjcccAiTyping');
        this.inputEl = modal.querySelector('#sjcccAiInput');
        this.sendBtnEl = modal.querySelector('#sjcccAiSendBtn');
        this.closeBtnEl = modal.querySelector('#sjcccAiCloseBtn');
        this.resetBtnEl = modal.querySelector('#sjcccAiResetBtn');

        // Populate Starter Chips
        const chipsContainer = modal.querySelector('#sjcccAiChips');
        if (chipsContainer) {
            this.starterPrompts.forEach((prompt) => {
                const chip = document.createElement('button');
                chip.type = 'button';
                chip.className = 'sjccc-ai-chip';
                chip.innerHTML = `<i class="bi bi-arrow-right-short" aria-hidden="true"></i><span>${this.escapeHtml(prompt)}</span>`;
                chip.addEventListener('click', () => {
                    this.handleUserPrompt(prompt);
                });
                chipsContainer.appendChild(chip);
            });
        }
    }

    /**
     * Restores saved chat history from persistent storage and populates the conversation DOM.
     */
    private loadPersistedHistory(): void {
        const saved = this.chatHistoryStore.getHistory();
        if (!saved || saved.length === 0) return;

        this.history = saved.map((item) => ({
            role: item.role,
            text: item.text,
            timestamp: item.timestamp,
        }));

        if (!this.messageContainerEl) return;
        this.messageContainerEl.innerHTML = '';

        const divider = document.createElement('div');
        divider.className = 'sjccc-msg-divider';
        divider.innerHTML = `<span><i class="bi bi-clock-history" aria-hidden="true"></i> Saved Conversation</span>`;
        this.messageContainerEl.appendChild(divider);

        for (const msg of this.history) {
            this.appendMessage(msg.role, msg.text, msg.timestamp);
        }
    }

    /**
     * Binds all UI interactions, keyboard shortcuts, and form events
     */
    private bindEvents(): void {
        // Toggle from FAB
        this.fabEl?.addEventListener('click', () => this.toggle());

        // Close triggers
        this.closeBtnEl?.addEventListener('click', () => this.close());
        this.overlayEl?.addEventListener('click', () => this.close());

        // Reset chat
        this.resetBtnEl?.addEventListener('click', () => this.resetConversation());

        // Keyboard navigation
        document.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        // Auto-expand input and enable/disable send button
        this.inputEl?.addEventListener('input', () => {
            this.adjustInputHeight();
            this.updateSendButtonState();
        });

        // Keydown handling for Enter (send) vs Shift+Enter (newline)
        this.inputEl?.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.submitCurrentInput();
            }
        });

        // Submit button
        this.sendBtnEl?.addEventListener('click', (e: MouseEvent) => {
            e.preventDefault();
            this.submitCurrentInput();
        });

        // Switch to Enquiry Form from AI Assistant
        const switchToEnquiryBtn = this.windowEl?.querySelector('#sjcccAiSwitchToEnquiry');
        switchToEnquiryBtn?.addEventListener('click', () => {
            this.close();
            const enquiryBtn = document.getElementById('enquiryFab') || document.querySelector('#enquire-btn');
            if (enquiryBtn instanceof HTMLElement) {
                enquiryBtn.click();
            }
        });

        // Switch to AI Assistant from Enquiry Modal
        const switchToAiBtn = document.getElementById('enquirySwitchToAiBtn');
        switchToAiBtn?.addEventListener('click', () => {
            const modalClose = document.getElementById('modalClose') as HTMLButtonElement | null;
            modalClose?.click();
            this.open();
        });

        // Quick triggers across document (e.g., links with data-open-ai-assistant)
        document.querySelectorAll('[data-open-ai-assistant]').forEach((trigger) => {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                const initialPrompt = trigger.getAttribute('data-ai-prompt');
                this.open();
                if (initialPrompt) {
                    this.handleUserPrompt(initialPrompt);
                }
            });
        });
    }

    /**
     * Opens the Assistant Modal
     */
    public open(): void {
        if (!this.windowEl || this.isOpen) return;

        this.isOpen = true;
        this.windowEl.removeAttribute('hidden');

        // Animation frame class addition
        requestAnimationFrame(() => {
            this.overlayEl?.classList.add('is-open');
            this.windowEl?.classList.add('is-open');
            this.fabEl?.setAttribute('aria-expanded', 'true');
        });

        // Suspend background hero and canvas physics loops
        motionSuspension.suspendAll('ai-assistant-modal');

        // Lock scroll on mobile
        if (window.innerWidth <= 480) {
            document.body.style.overflow = 'hidden';
        }

        // Update footer hint with current page section context
        const pageContext = getCurrentPageContext();
        const hintEl = this.windowEl?.querySelector('#sjcccAiFooterHint');
        if (hintEl && pageContext.pageSection && pageContext.pageSection !== 'General Campus') {
            hintEl.innerHTML = `Viewing: <strong>${this.escapeHtml(pageContext.pageSection)}</strong> • Press Enter to send`;
        }

        setTimeout(() => {
            this.inputEl?.focus();
            if (this.history.length > 0) {
                this.scrollToBottom();
            } else {
                const bodyEl = this.windowEl?.querySelector('#sjcccAiBody');
                if (bodyEl) {
                    bodyEl.scrollTop = 0;
                }
            }
        }, 150);
    }

    /**
     * Closes the Assistant Modal
     */
    public close(): void {
        if (!this.windowEl || !this.isOpen) return;

        this.isOpen = false;
        this.overlayEl?.classList.remove('is-open');
        this.windowEl?.classList.remove('is-open');
        this.fabEl?.setAttribute('aria-expanded', 'false');

        // Resume background animation loops
        motionSuspension.resumeAll('ai-assistant-modal');

        if (window.innerWidth <= 480) {
            document.body.style.overflow = '';
        }

        setTimeout(() => {
            if (!this.isOpen) {
                this.windowEl?.setAttribute('hidden', '');
                this.fabEl?.focus();
            }
        }, 350);
    }

    /**
     * Toggles assistant visibility
     */
    public toggle(): void {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * Submits current content from textarea
     */
    private submitCurrentInput(): void {
        if (this.isLoading || !this.inputEl) return;
        const text = this.inputEl.value.trim();
        if (!text) return;

        this.inputEl.value = '';
        this.adjustInputHeight();
        this.updateSendButtonState();
        this.handleUserPrompt(text);
    }

    /**
     * Processes a user question: updates UI, calls Gemini, and renders response
     */
    public async handleUserPrompt(promptText: string): Promise<void> {
        const text = promptText.trim();
        if (!text || this.isLoading) return;

        // 1. Render User Message & persist to history store
        const userTimestamp = Date.now();
        this.appendMessage('user', text, userTimestamp);
        this.history.push({ role: 'user', text, timestamp: userTimestamp });
        this.chatHistoryStore.addMessage('user', text, userTimestamp);

        // 2. Set loading state
        this.setLoading(true);
        this.scrollToBottom();

        // 3. Resolve active page context (title and section)
        const pageContext = getCurrentPageContext();

        try {
            // 4. Call Gemini Service with prior conversation turns and page context
            const priorHistory = this.history.slice(0, -1);
            const response = await geminiService.sendMessage(text, priorHistory, {
                context: pageContext,
            });

            // 5. Render Assistant Response & persist to history store
            const modelTimestamp = Date.now();
            this.appendMessage('model', response.text, modelTimestamp);
            this.history.push({ role: 'model', text: response.text, timestamp: modelTimestamp });
            this.chatHistoryStore.addMessage('model', response.text, modelTimestamp);

        } catch (error) {
            console.error('[AiAssistantWidget] Error:', error);
            const fallback = geminiService.generateOfflineFallback(
                text,
                'Notice: Reconnecting to Gemini service. Serving verified local guidance:',
                'NETWORK',
                pageContext
            );
            const fallbackTimestamp = Date.now();
            this.appendMessage('model', fallback.text, fallbackTimestamp);
            this.history.push({ role: 'model', text: fallback.text, timestamp: fallbackTimestamp });
            this.chatHistoryStore.addMessage('model', fallback.text, fallbackTimestamp);
        } finally {
            this.setLoading(false);
            this.scrollToBottom();
            this.inputEl?.focus();
        }
    }

    /**
     * Formats message timestamps gracefully (today, yesterday, or short date)
     */
    private formatMessageTime(timestamp?: number): string {
        const date = typeof timestamp === 'number' && Number.isFinite(timestamp)
            ? new Date(timestamp)
            : new Date();

        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();

        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();

        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (isToday) {
            return timeStr;
        }
        if (isYesterday) {
            return `Yesterday, ${timeStr}`;
        }
        return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
    }

    /**
     * Appends a message bubble to the conversation area
     */
    private appendMessage(role: 'user' | 'model', contentText: string, timestamp?: number): void {
        if (!this.messageContainerEl) return;

        const row = document.createElement('div');
        row.className = `sjccc-msg-row sjccc-msg-row--${role === 'user' ? 'user' : 'assistant'}`;

        const isUser = role === 'user';
        const formattedHtml = isUser 
            ? this.escapeHtml(contentText).replace(/\n/g, '<br>')
            : this.renderMarkdown(contentText);

        const timeStr = this.formatMessageTime(timestamp);

        if (isUser) {
            row.innerHTML = `
                <div class="sjccc-msg-avatar sjccc-msg-avatar--user" aria-hidden="true">
                    <i class="bi bi-person-fill"></i>
                </div>
                <div class="sjccc-msg-bubble sjccc-msg-bubble--user">
                    <div class="sjccc-msg-header">
                        <span class="sjccc-msg-sender"><i class="bi bi-person-circle"></i> You</span>
                        <span class="sjccc-msg-time">${timeStr}</span>
                    </div>
                    <div class="sjccc-msg-content">${formattedHtml}</div>
                </div>
            `;
        } else {
            row.innerHTML = `
                <div class="sjccc-msg-avatar sjccc-msg-avatar--assistant" aria-hidden="true">
                    <i class="bi bi-stars"></i>
                </div>
                <div class="sjccc-msg-bubble sjccc-msg-bubble--assistant">
                    <div class="sjccc-msg-header">
                        <span class="sjccc-msg-sender"><i class="bi bi-shield-check"></i> SJCCC Assistant</span>
                        <span class="sjccc-msg-time">${timeStr}</span>
                    </div>
                    <div class="sjccc-msg-content">${formattedHtml}</div>
                </div>
            `;
        }

        this.messageContainerEl.appendChild(row);
    }

    /**
     * Sets loading and typing indicator state
     */
    private setLoading(loading: boolean): void {
        this.isLoading = loading;
        if (this.typingIndicatorEl) {
            this.typingIndicatorEl.style.display = loading ? 'flex' : 'none';
        }
        if (this.sendBtnEl) {
            this.sendBtnEl.disabled = loading || !this.inputEl?.value.trim();
        }
    }

    /**
     * Resets the conversation history across DOM and persistent storage
     */
    public resetConversation(): void {
        this.history = [];
        this.chatHistoryStore.clearHistory();
        if (this.messageContainerEl) {
            this.messageContainerEl.innerHTML = '';
        }
        this.setLoading(false);
        if (this.inputEl) {
            this.inputEl.value = '';
            this.adjustInputHeight();
            this.updateSendButtonState();
        }
    }

    /**
     * Returns the underlying persistent history store
     */
    public getHistoryStore(): AiChatHistoryStore {
        return this.chatHistoryStore;
    }

    /**
     * Adjusts the textarea height based on content
     */
    private adjustInputHeight(): void {
        if (!this.inputEl) return;
        this.inputEl.style.height = 'auto';
        const newHeight = Math.min(this.inputEl.scrollHeight, 100);
        this.inputEl.style.height = `${newHeight}px`;
    }

    /**
     * Updates send button enabled state
     */
    private updateSendButtonState(): void {
        if (!this.sendBtnEl || !this.inputEl) return;
        const hasContent = Boolean(this.inputEl.value.trim().length > 0);
        this.sendBtnEl.disabled = this.isLoading || !hasContent;
    }

    /**
     * Smoothly scrolls conversation to bottom
     */
    private scrollToBottom(): void {
        const bodyEl = this.windowEl?.querySelector('#sjcccAiBody');
        if (bodyEl) {
            bodyEl.scrollTop = bodyEl.scrollHeight;
        }
    }

    /**
     * Escapes raw HTML strings for safe rendering
     */
    private escapeHtml(str: string): string {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Lightweight markdown parser for bold, italics, headers, lists, code, and links
     */
    private renderMarkdown(raw: string): string {
        if (!raw) return '';

        // Safe token preservation
        const escaped = this.escapeHtml(raw);

        // 1. Process Bold (**text** or __text__)
        let html = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // 2. Process Italics (*text* or _text_)
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // 3. Process Inline Code (`code`)
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // 4. Process Markdown Links [text](url)
        html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

        // 5. Split into lines to parse lists and headings
        const lines = html.split('\n');
        const outputLines: string[] = [];
        let inList = false;
        let listType: 'ul' | 'ol' = 'ul';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (!line) {
                if (inList) {
                    outputLines.push(`</${listType}>`);
                    inList = false;
                }
                outputLines.push('');
                continue;
            }

            // Headings (### or ## or #)
            if (line.startsWith('### ')) {
                if (inList) { outputLines.push(`</${listType}>`); inList = false; }
                outputLines.push(`<h4>${line.slice(4)}</h4>`);
                continue;
            } else if (line.startsWith('## ')) {
                if (inList) { outputLines.push(`</${listType}>`); inList = false; }
                outputLines.push(`<h4>${line.slice(3)}</h4>`);
                continue;
            }

            // Bullet points (- or • or *)
            if (line.startsWith('- ') || line.startsWith('• ') || line.startsWith('* ')) {
                const itemContent = line.replace(/^[-•*]\s+/, '');
                if (!inList) {
                    inList = true;
                    listType = 'ul';
                    outputLines.push('<ul>');
                } else if (listType !== 'ul') {
                    outputLines.push(`</${listType}>`);
                    listType = 'ul';
                    outputLines.push('<ul>');
                }
                outputLines.push(`<li>${itemContent}</li>`);
                continue;
            }

            // Numbered items (1. item)
            const numMatch = line.match(/^(\d+)\.\s+(.*)/);
            if (numMatch) {
                const itemContent = numMatch[2];
                if (!inList) {
                    inList = true;
                    listType = 'ol';
                    outputLines.push('<ol>');
                } else if (listType !== 'ol') {
                    outputLines.push(`</${listType}>`);
                    listType = 'ol';
                    outputLines.push('<ol>');
                }
                outputLines.push(`<li>${itemContent}</li>`);
                continue;
            }

            // Regular paragraph
            if (inList) {
                outputLines.push(`</${listType}>`);
                inList = false;
            }

            outputLines.push(`<p>${line}</p>`);
        }

        if (inList) {
            outputLines.push(`</${listType}>`);
        }

        return outputLines.join('\n');
    }

    /**
     * Destroys widget elements and unregisters event listeners
     */
    public destroy(): void {
        this.close();
        this.fabEl?.remove();
        this.overlayEl?.remove();
        this.windowEl?.remove();
        this.fabEl = null;
        this.overlayEl = null;
        this.windowEl = null;
    }
}
