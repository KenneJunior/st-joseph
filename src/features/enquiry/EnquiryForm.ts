/**
 * ============================================================================
 * SJCCC – Enquiry Form Controller
 * Dispatches enquiries via WhatsApp URL redirection or Formspree AJAX
 * ============================================================================
 */

import { EnquiryService } from '../../services/enquiryService.ts';
import { STORAGE_KEYS } from '../../core/storage/storageKeys.ts';

export type EnquiryFieldName = 'enqName' | 'enqEmail' | 'enqMessage';

export interface SavedEnquiryDetails {
    remember: boolean;
    name: string;
    email: string;
}

export interface FieldValidationResult {
    valid: boolean;
    message: string;
}

interface FieldContext {
    key: EnquiryFieldName;
    input: HTMLInputElement | HTMLTextAreaElement;
    formGroup: HTMLElement | null;
    wrapper: HTMLElement | null;
    iconEl: HTMLElement | null;
    tooltipEl: HTMLElement | null;
    tooltipTextEl: HTMLElement | null;
    baseDescribedByIds: string[];
    focused: boolean;
    dirty: boolean;
    touched: boolean;
}

const FIELD_GUIDANCE: Record<EnquiryFieldName, string> = {
    enqName: 'Enter your full name (at least 2 letters)',
    enqEmail: 'Valid email format required (e.g., name@example.com)',
    enqMessage: 'Write your enquiry (10–500 characters)',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LETTER_REGEX = /\p{L}/gu;

export function validateEnquiryField(field: EnquiryFieldName, rawValue: string): FieldValidationResult {
    const trimmed = rawValue.trim();

    switch (field) {
        case 'enqName': {
            if (trimmed.length === 0) {
                return { valid: false, message: 'Full name required (at least 2 letters)' };
            }
            const letterCount = (trimmed.match(LETTER_REGEX) || []).length;
            if (trimmed.length < 2 || letterCount < 2) {
                return { valid: false, message: 'At least 2 letters required (e.g., Jane Doe)' };
            }
            if (trimmed.length > 100) {
                return { valid: false, message: 'Name must be 100 characters or fewer' };
            }
            return { valid: true, message: 'Full name looks good' };
        }

        case 'enqEmail': {
            if (trimmed.length === 0) {
                return { valid: false, message: 'Valid email format required (e.g., name@example.com)' };
            }
            if (!EMAIL_REGEX.test(trimmed)) {
                return { valid: false, message: 'Valid email format required (e.g., name@example.com)' };
            }
            return { valid: true, message: 'Valid email format' };
        }

        case 'enqMessage': {
            if (trimmed.length === 0) {
                return { valid: false, message: 'Message required (at least 10 characters)' };
            }
            if (trimmed.length < 10) {
                return { valid: false, message: `At least 10 characters required (${trimmed.length}/10)` };
            }
            if (rawValue.length > 500) {
                return { valid: false, message: 'Message cannot exceed 500 characters' };
            }
            return { valid: true, message: 'Message ready to send' };
        }
    }
}

export class EnquiryForm {
    private readonly form: HTMLFormElement | null;
    private readonly status: HTMLElement | null;
    private readonly submitBtn: HTMLButtonElement | null;
    private whatsappToggle: HTMLInputElement | null;
    private rememberToggle: HTMLInputElement | null;
    private fields: Map<EnquiryFieldName, FieldContext> = new Map();
    private abortController: AbortController = new AbortController();
    private static readonly SUCCESS_BUTTON_DURATION_MS = 2200;
    private submitBtnLabel: HTMLElement | null = null;
    private submitBtnStatusEl: HTMLElement | null = null;
    private activeToast: HTMLElement | null = null;
    private toastTimeoutId: ReturnType<typeof setTimeout> | null = null;
    private submitSuccessTimeoutId: ReturnType<typeof setTimeout> | null = null;
    private wasSubmitting: boolean = false;
    private preserveRememberedOnReset: boolean = false;

    constructor(
        formId: string = 'enquiryForm',
        statusId: string = 'formStatus',
        submitBtnId: string = 'submitBtn',
        whatsappToggleId: string = 'whatsappRoutingToggle',
        rememberToggleId: string = 'rememberDetailsToggle'
    ) {
        this.form = document.getElementById(formId) as HTMLFormElement | null;
        this.status = document.getElementById(statusId);
        this.submitBtn = document.getElementById(submitBtnId) as HTMLButtonElement | null;
        this.whatsappToggle = document.getElementById(whatsappToggleId) as HTMLInputElement | null;
        this.rememberToggle = (
            (this.form?.querySelector<HTMLInputElement>(`#${rememberToggleId}, [name="rememberDetails"]`)) ||
            (document.getElementById(rememberToggleId) as HTMLInputElement | null)
        );
        this.init();
    }

    private init(): void {
        if (!this.form) return;

        const { signal } = this.abortController;
        this.ensureSubmitButtonStructure();
        this.setupFieldValidation(signal);
        this.setupRememberDetails(signal);

        this.form.addEventListener('submit', (e: SubmitEvent) => this.handleSubmit(e), { signal });
        this.form.addEventListener('reset', () => {
            const keepRemembered = this.preserveRememberedOnReset;
            this.preserveRememberedOnReset = false;
            queueMicrotask(() => {
                if (keepRemembered) {
                    this.resetMessageFieldOnly();
                } else {
                    this.resetValidationStates();
                }
            });
        }, { signal });
    }

    private ensureSubmitButtonStructure(): void {
        if (!this.submitBtn) return;

        let spinner = this.submitBtn.querySelector<HTMLElement>('.btn-spinner');
        let successCheck = this.submitBtn.querySelector<HTMLElement>('.btn-success-check');
        let label = this.submitBtn.querySelector<HTMLElement>('.btn-label');

        if (!spinner || !successCheck || !label) {
            const existingLabelText = label?.textContent?.trim();
            const initialText = existingLabelText || (this.submitBtn.textContent || 'Send Message').trim() || 'Send Message';
            this.submitBtn.textContent = '';

            if (!spinner) {
                spinner = document.createElement('span');
                spinner.className = 'btn-spinner';
                spinner.setAttribute('aria-hidden', 'true');
            }

            if (!successCheck) {
                successCheck = document.createElement('span');
                successCheck.className = 'btn-success-check';
                successCheck.setAttribute('aria-hidden', 'true');
                successCheck.innerHTML =
                    '<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">' +
                    '<path d="M4.5 10.4L8.3 14.2L15.6 6.4" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"></path>' +
                    '</svg>';
            }

            if (!label) {
                label = document.createElement('span');
                label.className = 'btn-label';
                label.textContent = initialText;
            }

            this.submitBtn.appendChild(spinner);
            this.submitBtn.appendChild(successCheck);
            this.submitBtn.appendChild(label);
        }

        this.submitBtnLabel = label;

        const statusId = 'submitBtnStatus';
        let statusEl = (
            this.form?.querySelector<HTMLElement>(`#${statusId}`) ||
            document.getElementById(statusId)
        );
        if (!statusEl) {
            statusEl = document.createElement('span');
            statusEl.id = statusId;
            statusEl.className = 'sr-only';
            statusEl.setAttribute('role', 'status');
            statusEl.setAttribute('aria-live', 'polite');
            statusEl.setAttribute('aria-atomic', 'true');
            this.submitBtn.insertAdjacentElement('afterend', statusEl);
        }
        this.submitBtnStatusEl = statusEl;

        const existingDescribedBy = (this.submitBtn.getAttribute('aria-describedby') || '')
            .split(/\s+/)
            .filter(Boolean);
        if (!existingDescribedBy.includes(statusEl.id)) {
            existingDescribedBy.push(statusEl.id);
            this.submitBtn.setAttribute('aria-describedby', existingDescribedBy.join(' '));
        }
    }

    private announceSubmitButtonState(message: string): void {
        if (!this.submitBtnStatusEl) return;
        this.submitBtnStatusEl.textContent = message;
    }

    private setSubmittingState(isLoading: boolean): void {
        if (!this.submitBtn) return;
        this.ensureSubmitButtonStructure();

        if (isLoading) {
            this.clearSubmitSuccessState();
            this.wasSubmitting = true;
            this.submitBtn.disabled = true;
            this.submitBtn.classList.add('is-loading');
            this.submitBtn.setAttribute('aria-busy', 'true');
            this.submitBtn.setAttribute('aria-label', 'Sending enquiry, please wait');
            if (this.submitBtnLabel) {
                this.submitBtnLabel.textContent = 'Sending…';
            }
            this.announceSubmitButtonState('Sending enquiry, please wait.');
        } else {
            this.submitBtn.classList.remove('is-loading');
            this.submitBtn.removeAttribute('aria-busy');

            if (!this.submitBtn.classList.contains('is-success')) {
                this.submitBtn.disabled = false;
                this.submitBtn.removeAttribute('aria-label');
                if (this.submitBtnLabel) {
                    this.submitBtnLabel.textContent = 'Send Message';
                }
                if (this.wasSubmitting) {
                    this.wasSubmitting = false;
                    this.announceSubmitButtonState('Submission failed. Send Message button is ready to retry.');
                }
            }
        }
    }

    private triggerSubmitSuccessState(durationMs: number = EnquiryForm.SUCCESS_BUTTON_DURATION_MS): void {
        if (!this.submitBtn) return;
        this.ensureSubmitButtonStructure();

        if (this.submitSuccessTimeoutId !== null) {
            clearTimeout(this.submitSuccessTimeoutId);
            this.submitSuccessTimeoutId = null;
        }

        this.wasSubmitting = false;
        this.submitBtn.classList.remove('is-loading');
        this.submitBtn.removeAttribute('aria-busy');
        this.submitBtn.classList.add('is-success');
        this.submitBtn.disabled = true;
        this.submitBtn.setAttribute('aria-label', 'Message sent');
        this.announceSubmitButtonState('Message sent successfully.');

        this.submitSuccessTimeoutId = setTimeout(() => {
            this.clearSubmitSuccessState();
        }, durationMs);
    }

    private clearSubmitSuccessState(): void {
        if (this.submitSuccessTimeoutId !== null) {
            clearTimeout(this.submitSuccessTimeoutId);
            this.submitSuccessTimeoutId = null;
        }
        if (!this.submitBtn) return;

        const wasSuccess = this.submitBtn.classList.contains('is-success');
        this.submitBtn.classList.remove('is-success');
        this.submitBtn.removeAttribute('aria-label');

        if (!this.submitBtn.classList.contains('is-loading')) {
            this.submitBtn.disabled = false;
            if (this.submitBtnLabel) {
                this.submitBtnLabel.textContent = 'Send Message';
            }
            if (wasSuccess) {
                this.announceSubmitButtonState('');
            }
        }
    }

    private setupFieldValidation(signal: AbortSignal): void {
        if (!this.form) return;

        const fieldKeys: EnquiryFieldName[] = ['enqName', 'enqEmail', 'enqMessage'];

        for (const key of fieldKeys) {
            const input = (
                this.form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${key}, [name="${key}"]`)
            );
            if (!input) continue;

            const formGroup = input.closest('.form-group') as HTMLElement | null;
            const wrapper = (
                input.closest('.field-wrapper, .message-field-wrapper') as HTMLElement | null
            ) || formGroup;

            const iconEl = this.ensureValidationIcon(wrapper);
            const { tooltipEl, tooltipTextEl } = this.ensurePopoverTooltip(key, input, wrapper);
            const baseDescribedByIds = this.collectBaseDescribedByIds(key, input, wrapper, tooltipEl);

            const ctx: FieldContext = {
                key,
                input,
                formGroup,
                wrapper,
                iconEl,
                tooltipEl,
                tooltipTextEl,
                baseDescribedByIds,
                focused: false,
                dirty: input.value.trim().length > 0,
                touched: false,
            };

            this.syncFieldAriaDescribedBy(ctx, false);
            this.fields.set(key, ctx);

            input.addEventListener('focus', () => this.handleFieldFocus(ctx), { signal });
            input.addEventListener('input', () => this.handleFieldInput(ctx), { signal });
            input.addEventListener('change', () => this.handleAutofillOrChange(ctx), { signal });
            input.addEventListener('animationstart', (e: Event) => {
                if ((e as AnimationEvent).animationName === 'sjcccAutofillStart') {
                    this.handleAutofillOrChange(ctx);
                }
            }, { signal });
            input.addEventListener('blur', () => this.handleFieldBlur(ctx), { signal });
        }
    }

    private setupRememberDetails(signal: AbortSignal): void {
        this.restoreRememberedDetails();

        this.rememberToggle?.addEventListener('change', () => {
            if (this.rememberToggle?.checked) {
                this.persistRememberedDetails();
            } else {
                this.clearRememberedDetails();
            }
        }, { signal });
    }

    private restoreRememberedDetails(): void {
        const saved = this.readSavedDetails();
        if (!saved || !saved.remember) return;

        if (this.rememberToggle) {
            this.rememberToggle.checked = true;
        }

        const nameCtx = this.fields.get('enqName');
        if (nameCtx && saved.name) {
            this.applyPrefilledValue(nameCtx, saved.name);
        }

        const emailCtx = this.fields.get('enqEmail');
        if (emailCtx && saved.email) {
            this.applyPrefilledValue(emailCtx, saved.email);
        }
    }

    private applyPrefilledValue(ctx: FieldContext, value: string): void {
        ctx.input.value = value;
        ctx.dirty = true;
        ctx.formGroup?.classList.toggle('has-value', value.length > 0);
        this.validateAndRender(ctx);
    }

    private readSavedDetails(): SavedEnquiryDetails | null {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.ENQUIRY_SAVED_DETAILS);
            if (!raw) return null;
            const parsed = JSON.parse(raw) as Partial<SavedEnquiryDetails> | null;
            if (!parsed || typeof parsed.remember !== 'boolean') return null;
            return {
                remember: parsed.remember,
                name: typeof parsed.name === 'string' ? parsed.name : '',
                email: typeof parsed.email === 'string' ? parsed.email : '',
            };
        } catch {
            return null;
        }
    }

    private persistRememberedDetails(overrideName?: string, overrideEmail?: string): void {
        try {
            const nameVal = (overrideName ?? this.fields.get('enqName')?.input.value ?? '').trim();
            const emailVal = (overrideEmail ?? this.fields.get('enqEmail')?.input.value ?? '').trim();
            const payload: SavedEnquiryDetails = {
                remember: true,
                name: nameVal,
                email: emailVal,
            };
            localStorage.setItem(STORAGE_KEYS.ENQUIRY_SAVED_DETAILS, JSON.stringify(payload));
        } catch {
            // Storage unavailable (e.g., private browsing)
        }
    }

    private clearRememberedDetails(): void {
        try {
            localStorage.removeItem(STORAGE_KEYS.ENQUIRY_SAVED_DETAILS);
        } catch {
            // Storage unavailable
        }
    }

    private handleAutofillOrChange(ctx: FieldContext): void {
        const hasValue = ctx.input.value.length > 0;
        ctx.formGroup?.classList.toggle('has-value', hasValue);

        if (hasValue || ctx.dirty || ctx.touched) {
            ctx.dirty = hasValue || ctx.dirty;
            this.validateAndRender(ctx);
        }

        if (this.rememberToggle?.checked && (ctx.key === 'enqName' || ctx.key === 'enqEmail')) {
            this.persistRememberedDetails();
        }
    }

    private ensureValidationIcon(wrapper: HTMLElement | null): HTMLElement | null {
        if (!wrapper) return null;
        const existing = wrapper.querySelector<HTMLElement>('.field-validation-icon');
        if (existing) return existing;

        const span = document.createElement('span');
        span.className = 'field-validation-icon';
        span.setAttribute('aria-hidden', 'true');
        span.innerHTML =
            '<svg class="validation-icon-valid" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">' +
            '<circle cx="10" cy="10" r="8.5" stroke="currentColor" stroke-width="1.75"></circle>' +
            '<path d="M6.4 10.2L8.9 12.7L13.7 7.6" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"></path>' +
            '</svg>' +
            '<svg class="validation-icon-invalid" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">' +
            '<circle cx="10" cy="10" r="8.5" stroke="currentColor" stroke-width="1.75"></circle>' +
            '<path d="M10 6.1V10.6" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"></path>' +
            '<circle cx="10" cy="13.5" r="1.05" fill="currentColor"></circle>' +
            '</svg>';
        wrapper.appendChild(span);
        return span;
    }

    private ensurePopoverTooltip(
        key: EnquiryFieldName,
        input: HTMLInputElement | HTMLTextAreaElement,
        wrapper: HTMLElement | null
    ): { tooltipEl: HTMLElement | null; tooltipTextEl: HTMLElement | null } {
        if (!wrapper) return { tooltipEl: null, tooltipTextEl: null };

        const existing = wrapper.querySelector<HTMLElement>('.field-popover-tooltip');
        if (existing) {
            if (!existing.id) {
                existing.id = `${key}Hint`;
            }
            this.appendDescribedByToken(input, existing.id);
            return {
                tooltipEl: existing,
                tooltipTextEl: existing.querySelector<HTMLElement>('.field-popover-text'),
            };
        }

        const tooltipId = `${key}Hint`;
        this.appendDescribedByToken(input, tooltipId);

        const tooltipEl = document.createElement('div');
        tooltipEl.className = 'field-popover-tooltip';
        tooltipEl.id = tooltipId;
        tooltipEl.setAttribute('role', 'tooltip');
        tooltipEl.setAttribute('aria-hidden', 'true');
        tooltipEl.setAttribute('data-state', 'info');

        const dot = document.createElement('span');
        dot.className = 'field-popover-dot';
        dot.setAttribute('aria-hidden', 'true');

        const textEl = document.createElement('span');
        textEl.className = 'field-popover-text';
        textEl.textContent = FIELD_GUIDANCE[key];

        tooltipEl.appendChild(dot);
        tooltipEl.appendChild(textEl);
        wrapper.appendChild(tooltipEl);

        return { tooltipEl, tooltipTextEl: textEl };
    }

    private collectBaseDescribedByIds(
        key: EnquiryFieldName,
        input: HTMLInputElement | HTMLTextAreaElement,
        wrapper: HTMLElement | null,
        tooltipEl: HTMLElement | null
    ): string[] {
        const tokens = (input.getAttribute('aria-describedby') || '')
            .split(/\s+/)
            .filter(Boolean);

        const tooltipId = tooltipEl?.id || `${key}Hint`;
        if (!tokens.includes(tooltipId)) {
            tokens.unshift(tooltipId);
        }

        if (key === 'enqMessage' && wrapper) {
            const charCount = wrapper.querySelector<HTMLElement>('.char-count');
            if (charCount) {
                if (!charCount.id) {
                    charCount.id = 'enqMessageCharCount';
                }
                if (!tokens.includes(charCount.id)) {
                    tokens.push(charCount.id);
                }
            }
        }

        return Array.from(new Set(tokens));
    }

    private appendDescribedByToken(el: Element, token: string): void {
        if (!token) return;
        const tokens = (el.getAttribute('aria-describedby') || '')
            .split(/\s+/)
            .filter(Boolean);
        if (!tokens.includes(token)) {
            tokens.push(token);
            el.setAttribute('aria-describedby', tokens.join(' '));
        }
    }

    private syncFieldAriaDescribedBy(ctx: FieldContext, includeFormStatus: boolean): void {
        const tokens = [...ctx.baseDescribedByIds];
        if (includeFormStatus && this.status?.id && !tokens.includes(this.status.id)) {
            tokens.push(this.status.id);
        }
        if (tokens.length > 0) {
            ctx.input.setAttribute('aria-describedby', tokens.join(' '));
        }
    }

    private handleFieldFocus(ctx: FieldContext): void {
        ctx.focused = true;
        ctx.formGroup?.classList.add('is-focused');

        if (!ctx.dirty && !ctx.touched && ctx.input.value.trim().length === 0) {
            this.setTooltipState(ctx, 'info', FIELD_GUIDANCE[ctx.key], true);
            return;
        }

        this.validateAndRender(ctx);
    }

    private handleFieldInput(ctx: FieldContext): void {
        if (this.submitBtn?.classList.contains('is-success')) {
            this.clearSubmitSuccessState();
        }

        ctx.dirty = true;
        ctx.formGroup?.classList.toggle('has-value', ctx.input.value.length > 0);
        const result = this.validateAndRender(ctx);

        if (this.rememberToggle?.checked && (ctx.key === 'enqName' || ctx.key === 'enqEmail')) {
            this.persistRememberedDetails();
        }

        if (result.valid && this.status?.classList.contains('error')) {
            const allCurrentlyValid = Array.from(this.fields.values()).every(
                (field) => validateEnquiryField(field.key, field.input.value).valid
            );
            if (allCurrentlyValid) {
                this.clearStatusNote();
            }
        }
    }

    private handleFieldBlur(ctx: FieldContext): void {
        ctx.focused = false;
        ctx.touched = true;
        ctx.formGroup?.classList.remove('is-focused');
        this.validateAndRender(ctx);
    }

    private validateAndRender(ctx: FieldContext): FieldValidationResult {
        const result = validateEnquiryField(ctx.key, ctx.input.value);

        if (ctx.formGroup) {
            ctx.formGroup.classList.toggle('is-valid', result.valid);
            ctx.formGroup.classList.toggle('is-invalid', !result.valid);
        }

        ctx.input.setAttribute('aria-invalid', result.valid ? 'false' : 'true');

        if (!result.valid && ctx.tooltipEl?.id) {
            ctx.input.setAttribute('aria-errormessage', ctx.tooltipEl.id);
        } else {
            ctx.input.removeAttribute('aria-errormessage');
        }

        const hasFormError = Boolean(this.status?.classList.contains('error'));
        this.syncFieldAriaDescribedBy(ctx, !result.valid && hasFormError);

        if (ctx.iconEl) {
            ctx.iconEl.setAttribute('data-valid', result.valid ? 'true' : 'false');
        }

        // Show popover tooltip on focus OR when field has an error
        const shouldShowTooltip = ctx.focused || !result.valid;
        const tooltipState = result.valid ? 'valid' : 'error';
        this.setTooltipState(ctx, tooltipState, result.message, shouldShowTooltip);

        return result;
    }

    private setTooltipState(
        ctx: FieldContext,
        state: 'info' | 'valid' | 'error',
        message: string,
        visible: boolean
    ): void {
        if (!ctx.tooltipEl) return;

        ctx.tooltipEl.setAttribute('data-state', state);
        if (ctx.tooltipTextEl) {
            ctx.tooltipTextEl.textContent = message;
        } else {
            ctx.tooltipEl.textContent = message;
        }

        ctx.tooltipEl.classList.toggle('is-visible', visible);
        ctx.tooltipEl.setAttribute('aria-hidden', visible ? 'false' : 'true');
    }

    private validateAllFields(): { valid: boolean; firstInvalid: FieldContext | null } {
        let valid = true;
        let firstInvalid: FieldContext | null = null;

        for (const ctx of this.fields.values()) {
            ctx.touched = true;
            const result = this.validateAndRender(ctx);
            if (!result.valid) {
                valid = false;
                if (!firstInvalid) {
                    firstInvalid = ctx;
                }
            }
        }

        return { valid, firstInvalid };
    }

    public resetValidationStates(): void {
        for (const ctx of this.fields.values()) {
            ctx.focused = false;
            ctx.dirty = false;
            ctx.touched = false;
            ctx.formGroup?.classList.remove('is-valid', 'is-invalid', 'is-focused', 'has-value');
            ctx.input.removeAttribute('aria-invalid');
            ctx.input.removeAttribute('aria-errormessage');
            this.syncFieldAriaDescribedBy(ctx, false);
            ctx.iconEl?.removeAttribute('data-valid');
            this.setTooltipState(ctx, 'info', FIELD_GUIDANCE[ctx.key], false);
        }
    }

    private resetMessageFieldOnly(): void {
        const msgCtx = this.fields.get('enqMessage');
        if (msgCtx) {
            msgCtx.focused = false;
            msgCtx.dirty = false;
            msgCtx.touched = false;
            msgCtx.formGroup?.classList.remove('is-valid', 'is-invalid', 'is-focused', 'has-value');
            msgCtx.input.removeAttribute('aria-invalid');
            msgCtx.input.removeAttribute('aria-errormessage');
            this.syncFieldAriaDescribedBy(msgCtx, false);
            msgCtx.iconEl?.removeAttribute('data-valid');
            this.setTooltipState(msgCtx, 'info', FIELD_GUIDANCE.enqMessage, false);
        }
    }

    private resetAfterSuccessfulSubmit(clientName: string, clientEmail: string): void {
        if (!this.form) return;

        const shouldRemember = Boolean(this.rememberToggle?.checked);
        if (shouldRemember) {
            this.persistRememberedDetails(clientName, clientEmail);
            this.preserveRememberedOnReset = true;
            this.form.reset();

            if (this.rememberToggle) {
                this.rememberToggle.checked = true;
            }
            const nameCtx = this.fields.get('enqName');
            const emailCtx = this.fields.get('enqEmail');
            if (nameCtx) this.applyPrefilledValue(nameCtx, clientName);
            if (emailCtx) this.applyPrefilledValue(emailCtx, clientEmail);
            this.resetMessageFieldOnly();
        } else {
            this.clearRememberedDetails();
            this.form.reset();
            this.resetValidationStates();
        }
    }

    private async handleSubmit(e: SubmitEvent): Promise<void> {
        e.preventDefault();
        if (!this.submitBtn || !this.form) return;

        const { valid, firstInvalid } = this.validateAllFields();
        if (!valid) {
            const invalidFields = Array.from(this.fields.values()).filter(
                (ctx) => ctx.input.getAttribute('aria-invalid') === 'true'
            );
            this.statusMessage('Please check the highlighted fields before sending.', 'error', invalidFields);
            firstInvalid?.input.focus();
            return;
        }

        this.clearStatusNote();
        this.setSubmittingState(true);

        const formData = new FormData(this.form);
        const clientName = ((formData.get('enqName') as string) || '').trim();
        const clientEmail = ((formData.get('enqEmail') as string) || '').trim();
        const clientMessage = ((formData.get('enqMessage') as string) || '').trim();

        // 1. ROUTE VIA WHATSAPP IF TOGGLE IS TRUE
        if (this.whatsappToggle?.checked) {
            try {
                const phoneNumber = this.form.getAttribute('data-whatsapp-phone') || '237670000000';
                const whatsappUrl = EnquiryService.createWhatsAppUrl({
                    name: clientName,
                    email: clientEmail,
                    message: clientMessage,
                    phoneNumber,
                });

                try {
                    const link = document.createElement('a');
                    link.href = whatsappUrl;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                } catch {
                    // Ignore pop-up block
                }

                this.clearStatusNote();
                this.showSuccessToast({
                    title: 'WhatsApp Message Ready',
                    message: 'Your enquiry has been prepared for WhatsApp.',
                    actionLabel: 'Open WhatsApp',
                    actionHref: whatsappUrl,
                });
                this.triggerSubmitSuccessState();
                this.resetAfterSuccessfulSubmit(clientName, clientEmail);
            } catch {
                this.statusMessage('⚠️ Could not generate WhatsApp link. Please try standard email.', 'error');
            } finally {
                this.setSubmittingState(false);
            }
            return;
        }

        // 2. FALLBACK TO FORMSPREE IF TOGGLE IS FALSE
        await this.sendEmail(clientName, clientEmail, formData);
    }

    private async sendEmail(clientName: string, clientEmail: string, formData: FormData): Promise<void> {
        if (!this.submitBtn || !this.form) return;

        try {
            if (!validateEnquiryField('enqEmail', clientEmail).valid) {
                const emailCtx = this.fields.get('enqEmail');
                if (emailCtx) {
                    this.validateAndRender(emailCtx);
                    this.statusMessage('Please make sure you entered a valid email', 'error', [emailCtx]);
                    emailCtx.input.focus();
                } else {
                    this.statusMessage('Please make sure you entered a valid email', 'error');
                }
                return;
            }

            const response = await EnquiryService.sendFormspreeEmail(this.form.action, formData);

            if (response.ok) {
                this.clearStatusNote();
                this.showSuccessToast({
                    title: 'Enquiry Sent Successfully',
                    message: 'Thank you! Your message has been received. We will reply within 48 hours.',
                });
                this.triggerSubmitSuccessState();
                this.resetAfterSuccessfulSubmit(clientName, clientEmail);
            } else {
                throw new Error(`Server responded with ${response.status}`);
            }
        } catch {
            this.statusMessage('⚠️ Sorry, something went wrong. Please email us directly at stjosephcollegembengwi@gmail.com', 'error');
        } finally {
            this.setSubmittingState(false);
        }
    }

    private showSuccessToast(options: {
        title: string;
        message: string;
        actionLabel?: string;
        actionHref?: string;
        durationMs?: number;
    }): void {
        const durationMs = options.durationMs ?? 6000;
        const container = this.ensureToastContainer();

        this.removeActiveToastImmediately();

        const toast = document.createElement('div');
        toast.id = 'enquirySuccessToast';
        toast.className = 'enquiry-success-toast is-visible';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        toast.setAttribute('aria-atomic', 'true');
        toast.style.setProperty('--toast-duration', `${durationMs}ms`);

        const iconWrap = document.createElement('div');
        iconWrap.className = 'enquiry-toast-icon';
        iconWrap.setAttribute('aria-hidden', 'true');
        iconWrap.innerHTML =
            '<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">' +
            '<circle cx="10" cy="10" r="8.5" stroke="currentColor" stroke-width="1.75"></circle>' +
            '<path d="M6.4 10.2L8.9 12.7L13.7 7.6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path>' +
            '</svg>';

        const body = document.createElement('div');
        body.className = 'enquiry-toast-body';

        const titleEl = document.createElement('strong');
        titleEl.className = 'enquiry-toast-title';
        titleEl.textContent = options.title;

        const msgEl = document.createElement('p');
        msgEl.className = 'enquiry-toast-message';
        msgEl.textContent = options.message;

        body.appendChild(titleEl);
        body.appendChild(msgEl);

        if (options.actionLabel && options.actionHref && options.actionHref.startsWith('https://wa.me/')) {
            const actionLink = document.createElement('a');
            actionLink.className = 'enquiry-toast-action';
            actionLink.href = options.actionHref;
            actionLink.target = '_blank';
            actionLink.rel = 'noopener noreferrer';
            actionLink.textContent = options.actionLabel;
            body.appendChild(actionLink);
        }

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'enquiry-toast-close';
        closeBtn.setAttribute('aria-label', 'Dismiss notification');
        closeBtn.innerHTML =
            '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
            '<path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>' +
            '</svg>';

        const progressWrap = document.createElement('div');
        progressWrap.className = 'enquiry-toast-progress';
        progressWrap.setAttribute('aria-hidden', 'true');

        const progressBar = document.createElement('div');
        progressBar.className = 'enquiry-toast-progress-bar';
        progressWrap.appendChild(progressBar);

        toast.appendChild(iconWrap);
        toast.appendChild(body);
        toast.appendChild(closeBtn);
        toast.appendChild(progressWrap);

        const scheduleDismiss = (delay: number): void => {
            if (this.toastTimeoutId !== null) {
                clearTimeout(this.toastTimeoutId);
            }
            this.toastTimeoutId = setTimeout(() => {
                this.dismissToast(toast);
            }, delay);
        };

        closeBtn.addEventListener('click', () => this.dismissToast(toast), {
            signal: this.abortController.signal,
        });

        toast.addEventListener('mouseenter', () => {
            if (this.toastTimeoutId !== null) {
                clearTimeout(this.toastTimeoutId);
                this.toastTimeoutId = null;
            }
        }, { signal: this.abortController.signal });

        toast.addEventListener('mouseleave', () => {
            scheduleDismiss(2500);
        }, { signal: this.abortController.signal });

        container.appendChild(toast);
        this.activeToast = toast;
        scheduleDismiss(durationMs);
    }

    private ensureToastContainer(): HTMLElement {
        let container = document.getElementById('enquiryToastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'enquiryToastContainer';
            container.className = 'enquiry-toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    private dismissToast(toast: HTMLElement): void {
        if (this.toastTimeoutId !== null) {
            clearTimeout(this.toastTimeoutId);
            this.toastTimeoutId = null;
        }
        toast.classList.remove('is-visible');
        toast.classList.add('is-leaving');
        setTimeout(() => {
            toast.remove();
            if (this.activeToast === toast) {
                this.activeToast = null;
            }
        }, 220);
    }

    private removeActiveToastImmediately(): void {
        if (this.toastTimeoutId !== null) {
            clearTimeout(this.toastTimeoutId);
            this.toastTimeoutId = null;
        }
        if (this.activeToast) {
            this.activeToast.remove();
            this.activeToast = null;
        }
    }

    private clearStatusNote(): void {
        if (!this.status) return;
        this.status.textContent = '';
        this.status.className = 'form-note';
        this.status.setAttribute('role', 'status');
        this.status.setAttribute('aria-live', 'polite');

        for (const ctx of this.fields.values()) {
            this.syncFieldAriaDescribedBy(ctx, false);
        }
    }

    private statusMessage(
        message: string,
        type: 'error' | 'success' = 'success',
        linkedFields?: FieldContext[]
    ): void {
        if (!this.status) return;
        this.status.textContent = message;
        this.status.className = `form-note ${type}`;

        if (type === 'error') {
            this.status.setAttribute('role', 'alert');
            this.status.setAttribute('aria-live', 'assertive');

            const targets = linkedFields && linkedFields.length > 0
                ? linkedFields
                : Array.from(this.fields.values());
            const targetSet = new Set(targets);

            for (const ctx of this.fields.values()) {
                this.syncFieldAriaDescribedBy(ctx, targetSet.has(ctx));
            }
        } else {
            this.status.setAttribute('role', 'status');
            this.status.setAttribute('aria-live', 'polite');
            for (const ctx of this.fields.values()) {
                this.syncFieldAriaDescribedBy(ctx, false);
            }
        }
    }

    public destroy(): void {
        this.abortController.abort();
        this.clearSubmitSuccessState();
        this.announceSubmitButtonState('');
        this.removeActiveToastImmediately();
        document.getElementById('enquiryToastContainer')?.remove();
        this.fields.clear();
    }
}
