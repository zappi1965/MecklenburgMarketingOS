import "server-only";

/**
 * Minimal transactional email sender.
 *
 * Uses Resend's REST API via fetch (no SDK dependency). When RESEND_API_KEY is
 * not configured the call is a graceful no-op so the rest of the flow still
 * works in development — the booking is created either way.
 */
export async function sendMail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ sent: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM ?? "MMOS <noreply@mmos.local>";
  if (!apiKey) {
    return { sent: false };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    }),
  });

  return { sent: res.ok };
}
