import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false; // Runs dynamically on Cloudflare Workers

export const POST: APIRoute = async (context) => {
  try {
    const formData = await context.request.formData();

    // 1. Dynamically capture EVERY submitted field
    const formFields: Record<string, string> = {};
    
    for (const [key, value] of formData.entries()) {
      // Exclude anti-spam honeypot fields or submit buttons
      if (key !== 'botcheck' && key !== 'submit' && typeof value === 'string') {
        const trimmedVal = value.trim();
        if (trimmedVal.length > 0) {
          formFields[key] = trimmedVal;
        }
      }
    }

    // 2. Helper to turn camelCase or hyphenated field names into readable labels
    const formatLabel = (str: string) => {
      return str
        .replace(/([A-Z])/g, ' $1')
        .replace(/[-_]/g, ' ')
        .replace(/^./, (s) => s.toUpperCase())
        .trim();
    };

    // 3. Build HTML table rows for all captured form inputs
    const emailTableRows = Object.entries(formFields)
      .map(([key, value]) => `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #0B2240; width: 35%; background-color: #f9fafb;">
            ${formatLabel(key)}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #374151;">
            ${value.replace(/\n/g, '<br />')}
          </td>
        </tr>
      `)
      .join('');

    // 4. Access Cloudflare Secret via 'cloudflare:workers' virtual module
    const apiKey = env.RESEND_API_KEY || import.meta.env.RESEND_API_KEY;

    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is missing.');
    }

    // Derive display names for email subject
    const ownerName = `${formFields.firstName || ''} ${formFields.lastName || ''}`.trim() || 'New Client';
    const horseName = formFields.horseName || formFields.registeredName || 'Horse';

    // 5. Send notification email via Resend HTTP API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Helix Equine Vets <onboarding@resend.dev>',
        to: ['max-ling@outlook.com'],
        reply_to: 'rcorbett92@gmail.com',
        subject: `New Registration: ${horseName} — ${ownerName}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; color: #111827;">
            <div style="border-bottom: 3px solid #005B60; padding-bottom: 12px; margin-bottom: 20px;">
              <h2 style="color: #0B2240; margin: 0 0 6px 0; font-size: 22px;">New Client & Horse Registration</h2>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Submitted via online registration form</p>
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 14px; text-align: left; border: 1px solid #e5e7eb;">
              <tbody>
                ${emailTableRows}
              </tbody>
            </table>
          </div>
        `,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error('Resend delivery failed:', errorText);
      throw new Error(`Failed to dispatch notification email: ${resendResponse.statusText}`);
    }

    // 6. Redirect to Thank You page
    return context.redirect('/register/thank-you/', 303);

  } catch (error) {
    console.error('Registration API error:', error);
    
    return new Response(
      JSON.stringify({ error: 'Server error handling form submission.' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};