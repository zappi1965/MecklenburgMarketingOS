import "server-only";

/**
 * Minimal SumUp Online Payments client via fetch (no SDK dependency). Creates a
 * hosted checkout the customer can pay by card. Returns `{ configured: false }`
 * when SUMUP_API_KEY / SUMUP_MERCHANT_CODE are not set, so the rest of the tool
 * (manual revenue tracking) still works without credentials.
 */
export interface SumUpCheckoutResult {
  configured: boolean;
  ok: boolean;
  checkoutId?: string;
  payUrl?: string;
  error?: string;
}

export async function createSumUpCheckout(params: {
  reference: string;
  amountCents: number;
  currency: string;
  description?: string;
  returnUrl?: string;
}): Promise<SumUpCheckoutResult> {
  const apiKey = process.env.SUMUP_API_KEY;
  const merchantCode = process.env.SUMUP_MERCHANT_CODE;
  if (!apiKey || !merchantCode) {
    return { configured: false, ok: false };
  }

  try {
    const res = await fetch("https://api.sumup.com/v0.1/checkouts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        checkout_reference: params.reference,
        amount: params.amountCents / 100,
        currency: params.currency,
        merchant_code: merchantCode,
        description: params.description,
        hosted_checkout: { enabled: true },
        redirect_url: params.returnUrl,
      }),
    });

    if (!res.ok) {
      return { configured: true, ok: false, error: `SumUp HTTP ${res.status}` };
    }

    const data: {
      id?: string;
      hosted_checkout?: { url?: string };
    } = await res.json();

    return {
      configured: true,
      ok: true,
      checkoutId: data.id,
      payUrl: data.hosted_checkout?.url,
    };
  } catch (e) {
    return {
      configured: true,
      ok: false,
      error: e instanceof Error ? e.message : "SumUp request failed.",
    };
  }
}
