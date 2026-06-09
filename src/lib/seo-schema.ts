/**
 * Builds a schema.org LocalBusiness JSON-LD object from a store's SEO profile.
 * Stores embed the output in a <script type="application/ld+json"> tag for
 * rich results — the core value proposition of a local-SEO tool.
 */

export interface SeoProfileInput {
  businessName: string;
  description?: string | null;
  street?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  website?: string | null;
  category?: string | null;
  openingHours?: string | null;
}

export function buildLocalBusinessJsonLd(
  p: SeoProfileInput,
): Record<string, unknown> {
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": p.category?.trim() || "LocalBusiness",
    name: p.businessName,
  };

  if (p.description) jsonLd.description = p.description;
  if (p.website) jsonLd.url = p.website;
  if (p.phone) jsonLd.telephone = p.phone;

  if (p.street || p.postalCode || p.city) {
    jsonLd.address = {
      "@type": "PostalAddress",
      ...(p.street ? { streetAddress: p.street } : {}),
      ...(p.postalCode ? { postalCode: p.postalCode } : {}),
      ...(p.city ? { addressLocality: p.city } : {}),
      addressCountry: p.country || "DE",
    };
  }

  // openingHours: one specification per non-empty line (free text, e.g.
  // "Mo-Fr 09:00-18:00").
  const hours = (p.openingHours ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (hours.length) {
    jsonLd.openingHours = hours;
  }

  return jsonLd;
}

export function jsonLdScriptTag(jsonLd: Record<string, unknown>): string {
  return `<script type="application/ld+json">\n${JSON.stringify(
    jsonLd,
    null,
    2,
  )}\n</script>`;
}
