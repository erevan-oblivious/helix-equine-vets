import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false; // Runs dynamically on Cloudflare Workers

export const POST: APIRoute = async (context) => {
  try {
    const formData = await context.request.formData();

    // 1. Dynamically capture EVERY submitted field
    const formFields: Record<string, string> = {};
    
    for (const [key, value] of formData.entries()) {
      // Exclude anti-spam honeypot fields, submit buttons, or routing fields
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

    // 4. Access Cloudflare Secrets
    const apiKey = env.RESEND_API_KEY || import.meta.env.RESEND_API_KEY;
    
    // Make routing variables dynamic for the template, with fallbacks
    const toEmail = env.CONTACT_EMAIL || import.meta.env.CONTACT_EMAIL || 'your-default@email.com'; 
    const siteName = env.SITE_NAME || import.meta.env.SITE_NAME || 'Website Form';

    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is missing.');
    }

    // Try to find a name/email to use in the subject/reply-to, falling back to generics
    const senderName = formFields.name || formFields.firstName || 'New Lead';
    const replyToEmail = formFields.email || 'no-reply@resend.dev';

    // 5. Send notification email via Resend HTTP API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${siteName} <onboarding@resend.dev>`, // Must be a verified domain or resend.dev for testing
        to: [toEmail],
        reply_to: replyToEmail,
        subject: `New Submission: ${senderName} — ${siteName}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; color: #111827;">
            <div style="border-bottom: 3px solid #005B60; padding-bottom: 12px; margin-bottom: 20px;">
              <h2 style="color: #0B2240; margin: 0 0 6px 0; font-size: 22px;">New Website Submission</h2>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Submitted via online form</p>
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

    // 6. Redirect to Thank You page (Ensure this page exists in your template!)
    return context.redirect('/thank-you/', 303);

  } catch (error) {
    console.error('Form API error:', error);
    
    return new Response(
      JSON.stringify({ error: 'Server error handling form submission.' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};