import { Resend } from "resend";

/**
 * Notification email is best-effort: a send failure must never surface to the
 * user or roll back the mutation that triggered it. Everything here swallows
 * errors after logging them.
 */

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM ?? "Task Portal <notifications@bestcorporaterealestate-tasks.com>";

export const APP_URL =
  process.env.APP_URL ?? "https://bestcorporaterealestate-tasks.com";

const resend = apiKey ? new Resend(apiKey) : null;

export type EmailLink = { label: string; path: string };

export type EmailContent = {
  subject: string;
  heading: string;
  /** Rendered as one paragraph each, in order. */
  body: string[];
  /** Verbatim text from a user (a note or help message), shown as a quote. */
  quote?: string | null;
  link: EmailLink;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderHtml(c: EmailContent): string {
  const url = `${APP_URL}${c.link.path}`;
  const paragraphs = c.body
    .map(
      (p) =>
        `<p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#374151">${escapeHtml(p)}</p>`,
    )
    .join("");
  const quote = c.quote?.trim()
    ? `<blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #4f46e5;background:#f5f5ff;font-size:15px;line-height:1.5;color:#374151;white-space:pre-wrap">${escapeHtml(
        c.quote.trim(),
      )}</blockquote>`
    : "";

  return `<!doctype html>
<html>
<body style="margin:0;padding:24px;background:#f3f4f6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;border:1px solid #e5e7eb">
<tr><td style="padding:24px">
<h1 style="margin:0 0 16px;font-size:18px;color:#111827">${escapeHtml(c.heading)}</h1>
${paragraphs}
${quote}
<p style="margin:24px 0 0">
<a href="${url}" style="display:inline-block;padding:10px 18px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px">${escapeHtml(c.link.label)}</a>
</p>
<p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280">
Best Corporate Real Estate task portal. You are receiving this because of your role in the portal.
</p>
</td></tr>
</table>
</body>
</html>`;
}

function renderText(c: EmailContent): string {
  const parts = [c.heading, "", ...c.body];
  if (c.quote?.trim()) parts.push("", `"${c.quote.trim()}"`);
  parts.push("", `${c.link.label}: ${APP_URL}${c.link.path}`);
  return parts.join("\n");
}

/** Send to each recipient separately so addresses aren't shared across the To line. */
export async function sendEmail(
  to: string[],
  content: EmailContent,
): Promise<void> {
  const recipients = to.filter((address) => address.trim().length > 0);
  if (recipients.length === 0) return;

  if (!resend) {
    console.warn(
      `[email] RESEND_API_KEY unset — skipping "${content.subject}" to ${recipients.join(", ")} (link: ${APP_URL}${content.link.path})`,
    );
    return;
  }

  const html = renderHtml(content);
  const text = renderText(content);

  await Promise.all(
    recipients.map(async (address) => {
      try {
        const { error } = await resend.emails.send({
          from,
          to: address,
          subject: content.subject,
          html,
          text,
        });
        // Resend reports API failures on the result rather than throwing.
        if (error) {
          console.error(`[email] send failed to ${address}:`, error);
        }
      } catch (err) {
        console.error(`[email] send threw for ${address}:`, err);
      }
    }),
  );
}
