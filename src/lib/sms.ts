import "server-only";

/**
 * Minimal SMS sender via seven.io's REST gateway (no SDK dependency). When
 * SEVEN_API_KEY is not configured the call is a graceful no-op so the flow
 * still works in development.
 */
export async function sendSms(params: {
  to: string;
  text: string;
}): Promise<{ sent: boolean }> {
  const apiKey = process.env.SEVEN_API_KEY;
  const from = process.env.SMS_SENDER ?? "MMOS";
  if (!apiKey) {
    return { sent: false };
  }

  const res = await fetch("https://gateway.seven.io/api/sms", {
    method: "POST",
    headers: {
      "X-Api-Key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ to: params.to, text: params.text, from }),
  });

  return { sent: res.ok };
}
