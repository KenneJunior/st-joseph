/**
 * ============================================================================
 * SJCCC – Enquiry Form Controller
 * Dispatches enquiries via WhatsApp URL redirection or Formspree AJAX
 * ============================================================================
 */

import { EnquiryService } from '../../services/enquiryService.ts';

export class EnquiryForm {
    private readonly form: HTMLFormElement | null;
    private readonly status: HTMLElement | null;
    private readonly submitBtn: HTMLButtonElement | null;
    private whatsappToggle: HTMLInputElement | null;

    constructor(
        formId: string = 'enquiryForm',
        statusId: string = 'formStatus',
        submitBtnId: string = 'submitBtn',
        whatsappToggleId: string = 'whatsappRoutingToggle'
    ) {
        this.form = document.getElementById(formId) as HTMLFormElement | null;
        this.status = document.getElementById(statusId);
        this.submitBtn = document.getElementById(submitBtnId) as HTMLButtonElement | null;
        this.whatsappToggle = document.getElementById(whatsappToggleId) as HTMLInputElement | null;
        this.init();
    }

    private init(): void {
        this.form?.addEventListener('submit', (e: SubmitEvent) => this.handleSubmit(e));
    }

    private async handleSubmit(e: SubmitEvent): Promise<void> {
        e.preventDefault();
        if (!this.status || !this.submitBtn || !this.form) return;

        this.status.textContent = '';
        this.status.className = 'form-note';
        this.submitBtn.disabled = true;
        this.submitBtn.textContent = 'Processing…';
        const formData = new FormData(this.form);
        const clientEmail = (formData.get('enqEmail') as string) || 'Not provided';

        // 1. ROUTE VIA WHATSAPP IF TOGGLE IS TRUE
        if (this.whatsappToggle?.checked) {
            try {
                const clientName = (formData.get('enqName') as string) || 'Not provided';
                const clientMessage = (formData.get('enqMessage') as string) || '';

                if (!clientName || !clientMessage) {
                    this.statusMessage('Please  Enter Your name and the message you want to send', 'error');
                    return;
                }

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

                if (this.status) {
                    this.status.innerHTML = `✅ Message prepared! <a href="${whatsappUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration:underline;font-weight:600;color:var(--gold,#C9A229)">Click here to send via WhatsApp</a>`;
                    this.status.className = 'form-note success';
                }
                this.form.reset();
            } catch (err) {
                this.statusMessage('⚠️ Could not generate WhatsApp link. Please try standard email.', 'error');
            } finally {
                this.submitBtn.disabled = false;
                this.submitBtn.textContent = 'Send Message';
            }
            return;
        }

        // 2. FALLBACK TO FORMSPREE IF TOGGLE IS FALSE
        await this.sendEmail(clientEmail, formData);
    }

    private async sendEmail(clientEmail: string, formData: FormData): Promise<void> {
        if (!this.status || !this.submitBtn || !this.form) return;

        try {
            if (!clientEmail || !clientEmail.includes('@')) {
                this.statusMessage('Please make sure you entered a valid email', 'error');
                return;
            }

            const response = await EnquiryService.sendFormspreeEmail(this.form.action, formData);

            if (response.ok) {
                this.statusMessage('✅ Thank you! Your message has been sent. We will reply within 48 hours.', 'success');
                this.form.reset();
            } else {
                throw new Error(`Server responded with ${response.status}`);
            }
        } catch {
            this.statusMessage('⚠️ Sorry, something went wrong. Please email us directly at stjosephcollegembengwi@gmail.com', 'error');
        } finally {
            this.submitBtn.disabled = false;
            this.submitBtn.textContent = 'Send Message';
        }
    }

    private statusMessage(message: string, type: 'error' | 'success' = 'success'): void {
        if (!this.status) return;
        this.status.textContent = message;
        this.status.className = `form-note ${type}`;
    }
}
