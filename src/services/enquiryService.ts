/**
 * ============================================================================
 * SJCCC – Enquiry Service
 * Handles formatting & dispatching enquiries via WhatsApp and Formspree Email API
 * ============================================================================
 */

export interface EnquiryData {
    name: string;
    email: string;
    message: string;
    phoneNumber?: string;
}

export class EnquiryService {
    /**
     * Formats WhatsApp message and returns the web/app direct dispatch URL.
     */
    static createWhatsAppUrl(data: EnquiryData): string {
        let textMessage = "✨ *SJCCC Mbengwi - New Website Enquiry* ✨\n\n";
        textMessage += `👤 *Name:* ${data.name || 'Not provided'}\n`;
        textMessage += `✉️ *Email:* ${data.email || 'Not provided'}\n\n`;
        textMessage += `📝 *Message:*\n${data.message || ''}`;

        const phone = data.phoneNumber || '237670000000';
        return `https://wa.me/${phone}?text=${encodeURIComponent(textMessage)}`;
    }

    /**
     * Dispatches enquiry to Formspree endpoint.
     */
    static async sendFormspreeEmail(actionUrl: string, formData: FormData): Promise<Response> {
        return fetch(actionUrl, {
            method: 'POST',
            headers: { Accept: 'application/json' },
            body: formData,
        });
    }
}
