import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';
import { EnquiryForm, validateEnquiryField } from '../../src/features/enquiry/EnquiryForm.ts';
import { EnquiryService } from '../../src/services/enquiryService.ts';
import { STORAGE_KEYS } from '../../src/core/storage/storageKeys.ts';

const FORM_FIXTURE = `
<!DOCTYPE html>
<html>
<body>
  <form action="https://formspree.io/f/test" data-whatsapp-phone="237672829014" id="enquiryForm" method="POST" novalidate>
    <div class="form-group form-group--floating">
      <div class="field-wrapper">
        <input type="text" id="enqName" name="enqName" placeholder="Enter your full name" aria-describedby="enqNameHint" required>
        <label for="enqName">Your Name</label>
        <div class="typing-indicator" aria-hidden="true"></div>
        <span class="field-validation-icon" aria-hidden="true">
          <svg class="validation-icon-valid"></svg>
          <svg class="validation-icon-invalid"></svg>
        </span>
        <div class="field-popover-tooltip" id="enqNameHint" role="tooltip" aria-hidden="true" data-state="info">
          <span class="field-popover-dot" aria-hidden="true"></span>
          <span class="field-popover-text">Enter your full name (at least 2 letters)</span>
        </div>
      </div>
    </div>

    <div class="form-group form-group--floating">
      <div class="field-wrapper">
        <input type="email" id="enqEmail" name="enqEmail" placeholder="your@email.com" aria-describedby="enqEmailHint" required>
        <label for="enqEmail">Email Address</label>
        <div class="typing-indicator" aria-hidden="true"></div>
        <span class="field-validation-icon" aria-hidden="true">
          <svg class="validation-icon-valid"></svg>
          <svg class="validation-icon-invalid"></svg>
        </span>
        <div class="field-popover-tooltip" id="enqEmailHint" role="tooltip" aria-hidden="true" data-state="info">
          <span class="field-popover-dot" aria-hidden="true"></span>
          <span class="field-popover-text">Valid email format required (e.g., name@example.com)</span>
        </div>
      </div>
    </div>

    <div class="form-group form-group--floating form-group--textarea">
      <div class="message-field-wrapper">
        <textarea id="enqMessage" name="enqMessage" rows="4" placeholder="Type your message here..." maxlength="500" aria-describedby="enqMessageHint enqMessageCharCount" required></textarea>
        <label for="enqMessage">Your Message</label>
        <span class="char-count" id="enqMessageCharCount" aria-live="polite">0/500</span>
        <div class="typing-indicator" aria-hidden="true"></div>
        <span class="field-validation-icon" aria-hidden="true">
          <svg class="validation-icon-valid"></svg>
          <svg class="validation-icon-invalid"></svg>
        </span>
        <div class="field-popover-tooltip" id="enqMessageHint" role="tooltip" aria-hidden="true" data-state="info">
          <span class="field-popover-dot" aria-hidden="true"></span>
          <span class="field-popover-text">Write your enquiry (10–500 characters)</span>
        </div>
      </div>
    </div>

    <div class="form-group form-remember">
      <label class="remember-label" for="rememberDetailsToggle">
        <input id="rememberDetailsToggle" name="rememberDetails" type="checkbox">
        <span class="remember-checkbox-box" aria-hidden="true"></span>
        <span class="remember-text">Remember my details</span>
      </label>
    </div>

    <div class="form-group form-toggle">
      <label class="switch-label" for="whatsappRoutingToggle">
        <input id="whatsappRoutingToggle" name="sendViaWhatsApp" checked type="checkbox">
        <span class="toggle-text">Send instantly via WhatsApp instead of Email</span>
      </label>
    </div>

    <button class="btn btn-primary" id="submitBtn" type="submit" aria-describedby="submitBtnStatus">Send Message</button>
    <span class="sr-only" id="submitBtnStatus" role="status" aria-live="polite" aria-atomic="true"></span>
    <p class="form-note" id="formStatus" role="status" aria-live="polite" aria-atomic="true"></p>
  </form>
</body>
</html>
`;

describe('EnquiryForm Real-Time Validation, Popover Tooltips & Validation Icons', () => {
    let dom: JSDOM;
    let doc: Document;
    let enquiryForm: EnquiryForm;

    beforeEach(() => {
        dom = new JSDOM(FORM_FIXTURE, { url: 'http://localhost:3000/' });
        doc = dom.window.document;
        (globalThis as any).window = dom.window;
        (globalThis as any).document = doc;
        (globalThis as any).FormData = dom.window.FormData;
        (globalThis as any).SubmitEvent = dom.window.Event;
        (globalThis as any).Event = dom.window.Event;
        (globalThis as any).AbortController = dom.window.AbortController;
        (globalThis as any).localStorage = dom.window.localStorage;
        dom.window.localStorage.clear();

        enquiryForm = new EnquiryForm('enquiryForm', 'formStatus', 'submitBtn', 'whatsappRoutingToggle');
    });

    afterEach(() => {
        enquiryForm.destroy();
        vi.restoreAllMocks();
        dom.window.close();
    });

    it('validates pure field rules accurately for name, email, and message', () => {
        expect(validateEnquiryField('enqName', '').valid).toBe(false);
        expect(validateEnquiryField('enqName', 'A').valid).toBe(false);
        expect(validateEnquiryField('enqName', '12345').valid).toBe(false);
        expect(validateEnquiryField('enqName', 'Fr. Jean-Paul').valid).toBe(true);

        expect(validateEnquiryField('enqEmail', '').valid).toBe(false);
        expect(validateEnquiryField('enqEmail', 'invalid-email').valid).toBe(false);
        expect(validateEnquiryField('enqEmail', 'parent@domain').valid).toBe(false);
        expect(validateEnquiryField('enqEmail', 'parent@example.com').valid).toBe(true);

        expect(validateEnquiryField('enqMessage', '').valid).toBe(false);
        expect(validateEnquiryField('enqMessage', 'Hello').valid).toBe(false);
        expect(validateEnquiryField('enqMessage', 'I would like admissions information.').valid).toBe(true);
    });

    it('shows guidance popover tooltip on initial focus without marking untouched field as invalid', () => {
        const nameInput = doc.getElementById('enqName') as HTMLInputElement;
        const nameGroup = nameInput.closest('.form-group') as HTMLElement;
        const nameTooltip = doc.getElementById('enqNameHint') as HTMLElement;

        nameInput.dispatchEvent(new dom.window.Event('focus'));

        expect(nameGroup.classList.contains('is-focused')).toBe(true);
        expect(nameGroup.classList.contains('is-invalid')).toBe(false);
        expect(nameGroup.classList.contains('is-valid')).toBe(false);
        expect(nameTooltip.classList.contains('is-visible')).toBe(true);
        expect(nameTooltip.getAttribute('aria-hidden')).toBe('false');
        expect(nameTooltip.getAttribute('data-state')).toBe('info');
        expect(nameTooltip.textContent).toContain('at least 2 letters');
    });

    it('provides real-time validation state, icons, and tooltips as the user types', () => {
        const emailInput = doc.getElementById('enqEmail') as HTMLInputElement;
        const emailGroup = emailInput.closest('.form-group') as HTMLElement;
        const emailIcon = emailGroup.querySelector('.field-validation-icon') as HTMLElement;
        const emailTooltip = doc.getElementById('enqEmailHint') as HTMLElement;

        emailInput.dispatchEvent(new dom.window.Event('focus'));

        // Type invalid email
        emailInput.value = 'bad-email';
        emailInput.dispatchEvent(new dom.window.Event('input'));

        expect(emailGroup.classList.contains('is-invalid')).toBe(true);
        expect(emailGroup.classList.contains('is-valid')).toBe(false);
        expect(emailInput.getAttribute('aria-invalid')).toBe('true');
        expect(emailIcon.getAttribute('data-valid')).toBe('false');
        expect(emailTooltip.classList.contains('is-visible')).toBe(true);
        expect(emailTooltip.getAttribute('data-state')).toBe('error');
        expect(emailTooltip.textContent).toContain('Valid email format required');

        // Fix email in real time
        emailInput.value = 'student@sjccc.org';
        emailInput.dispatchEvent(new dom.window.Event('input'));

        expect(emailGroup.classList.contains('is-valid')).toBe(true);
        expect(emailGroup.classList.contains('is-invalid')).toBe(false);
        expect(emailInput.getAttribute('aria-invalid')).toBe('false');
        expect(emailIcon.getAttribute('data-valid')).toBe('true');
        expect(emailTooltip.getAttribute('data-state')).toBe('valid');

        // On blur when valid: tooltip hides, valid icon & class remain
        emailInput.dispatchEvent(new dom.window.Event('blur'));
        expect(emailTooltip.classList.contains('is-visible')).toBe(false);
        expect(emailTooltip.getAttribute('aria-hidden')).toBe('true');
        expect(emailGroup.classList.contains('is-valid')).toBe(true);
    });

    it('keeps error popover tooltip visible on blur when a field is invalid', () => {
        const msgInput = doc.getElementById('enqMessage') as HTMLTextAreaElement;
        const msgGroup = msgInput.closest('.form-group') as HTMLElement;
        const msgTooltip = doc.getElementById('enqMessageHint') as HTMLElement;

        msgInput.dispatchEvent(new dom.window.Event('focus'));
        msgInput.value = 'Too short';
        msgInput.dispatchEvent(new dom.window.Event('input'));
        msgInput.dispatchEvent(new dom.window.Event('blur'));

        expect(msgGroup.classList.contains('is-invalid')).toBe(true);
        expect(msgTooltip.classList.contains('is-visible')).toBe(true);
        expect(msgTooltip.getAttribute('aria-hidden')).toBe('false');
        expect(msgTooltip.getAttribute('data-state')).toBe('error');
        expect(msgTooltip.textContent).toContain('At least 10 characters required');
    });

    it('blocks submission when fields are invalid, focuses first invalid field, and resets cleanly on valid submit', async () => {
        const form = doc.getElementById('enquiryForm') as HTMLFormElement;
        const nameInput = doc.getElementById('enqName') as HTMLInputElement;
        const emailInput = doc.getElementById('enqEmail') as HTMLInputElement;
        const msgInput = doc.getElementById('enqMessage') as HTMLTextAreaElement;
        const statusEl = doc.getElementById('formStatus') as HTMLElement;

        const focusSpy = vi.spyOn(nameInput, 'focus');
        const waSpy = vi.spyOn(EnquiryService, 'createWhatsAppUrl');

        // Submit empty form
        form.dispatchEvent(new dom.window.Event('submit', { cancelable: true }));

        expect(waSpy).not.toHaveBeenCalled();
        expect(focusSpy).toHaveBeenCalledTimes(1);
        expect(statusEl.className).toContain('error');
        expect(statusEl.getAttribute('role')).toBe('alert');
        expect(statusEl.getAttribute('aria-live')).toBe('assertive');
        expect(nameInput.closest('.form-group')?.classList.contains('is-invalid')).toBe(true);
        expect(emailInput.closest('.form-group')?.classList.contains('is-invalid')).toBe(true);
        expect(msgInput.closest('.form-group')?.classList.contains('is-invalid')).toBe(true);

        // Verify all error messages are programmatically linked via aria-describedby & aria-errormessage
        expect(nameInput.getAttribute('aria-describedby')).toBe('enqNameHint formStatus');
        expect(nameInput.getAttribute('aria-errormessage')).toBe('enqNameHint');
        expect(emailInput.getAttribute('aria-describedby')).toBe('enqEmailHint formStatus');
        expect(emailInput.getAttribute('aria-errormessage')).toBe('enqEmailHint');
        expect(msgInput.getAttribute('aria-describedby')).toBe('enqMessageHint enqMessageCharCount formStatus');
        expect(msgInput.getAttribute('aria-errormessage')).toBe('enqMessageHint');

        // Fill valid values and submit
        nameInput.value = 'Grace Ngwa';
        emailInput.value = 'grace@example.com';
        msgInput.value = 'Can you share Form 1 admission interview dates?';

        form.dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
        await Promise.resolve();

        expect(waSpy).toHaveBeenCalledTimes(1);
        expect(statusEl.textContent).toBe('');
        expect(statusEl.className).toBe('form-note');
        expect(statusEl.getAttribute('role')).toBe('status');

        const toast = doc.getElementById('enquirySuccessToast') as HTMLElement;
        expect(toast).not.toBeNull();
        expect(toast.classList.contains('is-visible')).toBe(true);
        expect(toast.textContent).toContain('WhatsApp Message Ready');
        expect(toast.querySelector('.enquiry-toast-action')?.getAttribute('href')).toContain('https://wa.me/');

        expect(nameInput.closest('.form-group')?.classList.contains('is-valid')).toBe(false);
        expect(nameInput.closest('.form-group')?.classList.contains('is-invalid')).toBe(false);
        expect(nameInput.hasAttribute('aria-errormessage')).toBe(false);
        expect(nameInput.getAttribute('aria-describedby')).toBe('enqNameHint');
        expect(doc.getElementById('enqNameHint')?.classList.contains('is-visible')).toBe(false);
    });

    it('shows loading spinner inside submit button during async Formspree submission, morphs into checkmark success state on completion, and displays top success toast', async () => {
        vi.useFakeTimers();

        const form = doc.getElementById('enquiryForm') as HTMLFormElement;
        const nameInput = doc.getElementById('enqName') as HTMLInputElement;
        const emailInput = doc.getElementById('enqEmail') as HTMLInputElement;
        const msgInput = doc.getElementById('enqMessage') as HTMLTextAreaElement;
        const waToggle = doc.getElementById('whatsappRoutingToggle') as HTMLInputElement;
        const submitBtn = doc.getElementById('submitBtn') as HTMLButtonElement;
        const statusEl = doc.getElementById('formStatus') as HTMLElement;

        waToggle.checked = false;
        nameInput.value = 'Pauline Fon';
        emailInput.value = 'pauline@example.com';
        msgInput.value = 'Requesting details on boarding facilities for Form 1.';

        let resolveFetch!: (value: Response) => void;
        const pendingPromise = new Promise<Response>((resolve) => {
            resolveFetch = resolve;
        });
        const emailSpy = vi.spyOn(EnquiryService, 'sendFormspreeEmail').mockReturnValue(pendingPromise);

        form.dispatchEvent(new dom.window.Event('submit', { cancelable: true }));

        const submitBtnStatus = doc.getElementById('submitBtnStatus') as HTMLElement;

        // While request is in flight: spinner active, button disabled, aria-busy & live announcement
        expect(emailSpy).toHaveBeenCalledTimes(1);
        expect(submitBtn.disabled).toBe(true);
        expect(submitBtn.classList.contains('is-loading')).toBe(true);
        expect(submitBtn.classList.contains('is-success')).toBe(false);
        expect(submitBtn.getAttribute('aria-busy')).toBe('true');
        expect(submitBtn.getAttribute('aria-describedby')).toContain('submitBtnStatus');
        expect(submitBtn.getAttribute('aria-label')).toBe('Sending enquiry, please wait');
        expect(submitBtnStatus.textContent).toBe('Sending enquiry, please wait.');
        expect(submitBtn.querySelector('.btn-spinner')).not.toBeNull();
        expect(submitBtn.querySelector('.btn-label')?.textContent).toBe('Sending…');

        // Resolve response
        resolveFetch({ ok: true, status: 200 } as Response);
        await pendingPromise;
        await Promise.resolve();

        // Button transforms into checkmark success state and announces success
        expect(submitBtn.classList.contains('is-loading')).toBe(false);
        expect(submitBtn.hasAttribute('aria-busy')).toBe(false);
        expect(submitBtn.classList.contains('is-success')).toBe(true);
        expect(submitBtn.disabled).toBe(true);
        expect(submitBtn.getAttribute('aria-label')).toBe('Message sent');
        expect(submitBtnStatus.textContent).toBe('Message sent successfully.');
        expect(submitBtn.querySelector('.btn-success-check svg')).not.toBeNull();

        // Form note remains empty; custom top toast is displayed
        expect(statusEl.textContent).toBe('');
        const toast = doc.getElementById('enquirySuccessToast') as HTMLElement;
        expect(toast).not.toBeNull();
        expect(toast.classList.contains('is-visible')).toBe(true);
        expect(toast.textContent).toContain('Enquiry Sent Successfully');

        // After success animation window, button restores to default interactive state
        vi.advanceTimersByTime(2250);
        expect(submitBtn.classList.contains('is-success')).toBe(false);
        expect(submitBtn.disabled).toBe(false);
        expect(submitBtn.hasAttribute('aria-label')).toBe(false);
        expect(submitBtnStatus.textContent).toBe('');
        expect(submitBtn.querySelector('.btn-label')?.textContent).toBe('Send Message');

        // Dismiss via close button
        const closeBtn = toast.querySelector('.enquiry-toast-close') as HTMLButtonElement;
        closeBtn.click();
        expect(toast.classList.contains('is-visible')).toBe(false);
        expect(toast.classList.contains('is-leaving')).toBe(true);

        vi.useRealTimers();
    });

    it('clears button success checkmark early if user starts typing again, and skips success state on failed response', async () => {
        const form = doc.getElementById('enquiryForm') as HTMLFormElement;
        const nameInput = doc.getElementById('enqName') as HTMLInputElement;
        const emailInput = doc.getElementById('enqEmail') as HTMLInputElement;
        const msgInput = doc.getElementById('enqMessage') as HTMLTextAreaElement;
        const waToggle = doc.getElementById('whatsappRoutingToggle') as HTMLInputElement;
        const submitBtn = doc.getElementById('submitBtn') as HTMLButtonElement;

        // WhatsApp submission triggers success checkmark; typing restores immediately
        nameInput.value = 'Grace Ngwa';
        emailInput.value = 'grace@example.com';
        msgInput.value = 'Checking fee structure for Form 2 boarding.';
        form.dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
        await Promise.resolve();

        expect(submitBtn.classList.contains('is-success')).toBe(true);
        msgInput.value = 'N';
        msgInput.dispatchEvent(new dom.window.Event('input'));
        expect(submitBtn.classList.contains('is-success')).toBe(false);
        expect(submitBtn.disabled).toBe(false);

        // Failed Formspree response restores button without entering .is-success
        waToggle.checked = false;
        nameInput.value = 'Pauline Fon';
        emailInput.value = 'pauline@example.com';
        msgInput.value = 'Requesting prospectus download details.';
        vi.spyOn(EnquiryService, 'sendFormspreeEmail').mockResolvedValue({ ok: false, status: 500 } as Response);

        form.dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
        await Promise.resolve();
        await Promise.resolve();

        expect(submitBtn.classList.contains('is-loading')).toBe(false);
        expect(submitBtn.classList.contains('is-success')).toBe(false);
        expect(submitBtn.disabled).toBe(false);
        expect(submitBtn.hasAttribute('aria-label')).toBe(false);
        expect(submitBtn.querySelector('.btn-label')?.textContent).toBe('Send Message');
        expect(doc.getElementById('submitBtnStatus')?.textContent).toBe('Submission failed. Send Message button is ready to retry.');
        expect(nameInput.getAttribute('aria-describedby')).toContain('formStatus');
        expect(emailInput.getAttribute('aria-describedby')).toContain('formStatus');
        expect(msgInput.getAttribute('aria-describedby')).toContain('formStatus');
    });

    it('handles browser autofill change events by syncing floating labels and real-time validation', () => {
        const nameInput = doc.getElementById('enqName') as HTMLInputElement;
        const emailInput = doc.getElementById('enqEmail') as HTMLInputElement;

        // Simulate browser autofill populating values and firing 'change'
        nameInput.value = 'Samuel Mbah';
        nameInput.dispatchEvent(new dom.window.Event('change'));

        emailInput.value = 'samuel.mbah@example.com';
        emailInput.dispatchEvent(new dom.window.Event('change'));

        expect(nameInput.closest('.form-group')?.classList.contains('has-value')).toBe(true);
        expect(nameInput.closest('.form-group')?.classList.contains('is-valid')).toBe(true);
        expect(emailInput.closest('.form-group')?.classList.contains('has-value')).toBe(true);
        expect(emailInput.closest('.form-group')?.classList.contains('is-valid')).toBe(true);
    });

    it('persists name and email in localStorage when Remember My Details is checked and pre-fills for repeat visits', async () => {
        const form = doc.getElementById('enquiryForm') as HTMLFormElement;
        const nameInput = doc.getElementById('enqName') as HTMLInputElement;
        const emailInput = doc.getElementById('enqEmail') as HTMLInputElement;
        const msgInput = doc.getElementById('enqMessage') as HTMLTextAreaElement;
        const rememberToggle = doc.getElementById('rememberDetailsToggle') as HTMLInputElement;

        vi.spyOn(EnquiryService, 'createWhatsAppUrl').mockReturnValue('https://wa.me/237672829014?text=ok');

        nameInput.value = 'Beatrice Ndi';
        emailInput.value = 'beatrice@example.com';
        msgInput.value = 'Inquiring about Lower Sixth Science admission requirements.';
        rememberToggle.checked = true;
        rememberToggle.dispatchEvent(new dom.window.Event('change'));

        const savedRaw = dom.window.localStorage.getItem(STORAGE_KEYS.ENQUIRY_SAVED_DETAILS);
        expect(savedRaw).not.toBeNull();
        expect(JSON.parse(savedRaw!)).toEqual({
            remember: true,
            name: 'Beatrice Ndi',
            email: 'beatrice@example.com',
        });

        // Submitting with Remember checked clears message but retains name, email & checkbox state
        form.dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
        await Promise.resolve();
        await Promise.resolve();

        expect(rememberToggle.checked).toBe(true);
        expect(nameInput.value).toBe('Beatrice Ndi');
        expect(emailInput.value).toBe('beatrice@example.com');
        expect(msgInput.value).toBe('');
        expect(nameInput.closest('.form-group')?.classList.contains('is-valid')).toBe(true);

        // Simulate repeat visit (fresh EnquiryForm instance on clean inputs)
        enquiryForm.destroy();
        nameInput.value = '';
        emailInput.value = '';
        rememberToggle.checked = false;
        nameInput.closest('.form-group')?.classList.remove('is-valid', 'has-value');
        emailInput.closest('.form-group')?.classList.remove('is-valid', 'has-value');

        enquiryForm = new EnquiryForm('enquiryForm', 'formStatus', 'submitBtn', 'whatsappRoutingToggle');

        expect(rememberToggle.checked).toBe(true);
        expect(nameInput.value).toBe('Beatrice Ndi');
        expect(emailInput.value).toBe('beatrice@example.com');
        expect(nameInput.closest('.form-group')?.classList.contains('has-value')).toBe(true);
        expect(nameInput.closest('.form-group')?.classList.contains('is-valid')).toBe(true);
        expect(doc.getElementById('enqNameHint')?.classList.contains('is-visible')).toBe(false);

        // Unchecking clears localStorage immediately
        rememberToggle.checked = false;
        rememberToggle.dispatchEvent(new dom.window.Event('change'));
        expect(dom.window.localStorage.getItem(STORAGE_KEYS.ENQUIRY_SAVED_DETAILS)).toBeNull();
    });

    it('verifies index.html, enquiry-typing.css, buttons.css, forms.css, and enquiry.css contain validation, pop animation, autofill, remember checkbox, spinner, and toast markup/styles', () => {
        const rootDir = process.cwd();
        const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');
        const typingCss = fs.readFileSync(path.join(rootDir, 'src/css/features/enquiry-typing.css'), 'utf-8');
        const buttonsCss = fs.readFileSync(path.join(rootDir, 'src/css/components/buttons.css'), 'utf-8');
        const formsCss = fs.readFileSync(path.join(rootDir, 'src/css/components/forms.css'), 'utf-8');
        const enquiryCss = fs.readFileSync(path.join(rootDir, 'src/css/features/enquiry.css'), 'utf-8');
        const a11yCss = fs.readFileSync(path.join(rootDir, 'src/css/core/accessibility.css'), 'utf-8');

        expect(indexHtml).toContain('id="enqNameHint"');
        expect(indexHtml).toContain('id="enqEmailHint"');
        expect(indexHtml).toContain('id="enqMessageHint"');
        expect(indexHtml).toContain('id="enqMessageCharCount"');
        expect(indexHtml).toContain('aria-describedby="enqMessageHint enqMessageCharCount"');
        expect(indexHtml).toContain('aria-required="true"');
        expect(indexHtml).toContain('id="submitBtnStatus"');
        expect(indexHtml).toContain('aria-describedby="submitBtnStatus"');
        expect(indexHtml).toContain('class="field-validation-icon"');
        expect(indexHtml).toContain('class="validation-icon-valid"');
        expect(indexHtml).toContain('class="validation-icon-invalid"');
        expect(indexHtml).toContain('class="btn-spinner"');
        expect(indexHtml).toContain('class="btn-success-check"');
        expect(indexHtml).toContain('class="btn-label"');
        expect(indexHtml).toContain('autocomplete="on"');
        expect(indexHtml).toContain('autocomplete="name"');
        expect(indexHtml).toContain('autocomplete="email"');
        expect(indexHtml).toContain('id="rememberDetailsToggle"');

        expect(a11yCss).toContain('.sr-only');
        expect(typingCss).toContain('.field-validation-icon');
        expect(typingCss).toContain('@keyframes validationIconPop');
        expect(typingCss).toContain('@keyframes sjcccAutofillStart');
        expect(typingCss).toContain('.field-popover-tooltip');
        expect(typingCss).toContain('.form-group.form-group--floating.is-valid');
        expect(typingCss).toContain('.form-group.form-group--floating.is-invalid');
        expect(formsCss).toContain('.form-group.form-remember');
        expect(buttonsCss).toContain('.btn.is-loading .btn-spinner');
        expect(buttonsCss).toContain('.btn.is-success .btn-success-check');
        expect(buttonsCss).toContain('@keyframes btnSuccessCheckPop');
        expect(buttonsCss).toContain('@keyframes btnSuccessCheckDraw');
        expect(enquiryCss).toContain('.modal-content button[type="submit"].is-success');
        expect(enquiryCss).toContain('.enquiry-toast-container');
        expect(enquiryCss).toContain('.enquiry-success-toast');
    });
});
