import { describe, it, expect } from "vitest";
import { buildLocalBusinessJsonLd, jsonLdScriptTag } from "./seo-schema";

describe("buildLocalBusinessJsonLd", () => {
  it("uses LocalBusiness as the default type", () => {
    const jsonLd = buildLocalBusinessJsonLd({ businessName: "Café Test" });
    expect(jsonLd["@type"]).toBe("LocalBusiness");
    expect(jsonLd.name).toBe("Café Test");
    expect(jsonLd["@context"]).toBe("https://schema.org");
  });

  it("honours a custom schema.org category", () => {
    const jsonLd = buildLocalBusinessJsonLd({
      businessName: "X",
      category: "Restaurant",
    });
    expect(jsonLd["@type"]).toBe("Restaurant");
  });

  it("builds a PostalAddress only when address parts are present", () => {
    const without = buildLocalBusinessJsonLd({ businessName: "X" });
    expect(without.address).toBeUndefined();

    const withAddr = buildLocalBusinessJsonLd({
      businessName: "X",
      street: "Hauptstr. 1",
      postalCode: "18055",
      city: "Rostock",
    });
    expect(withAddr.address).toMatchObject({
      "@type": "PostalAddress",
      streetAddress: "Hauptstr. 1",
      postalCode: "18055",
      addressLocality: "Rostock",
      addressCountry: "DE",
    });
  });

  it("splits opening hours into an array, ignoring blank lines", () => {
    const jsonLd = buildLocalBusinessJsonLd({
      businessName: "X",
      openingHours: "Mo-Fr 09:00-18:00\n\nSa 09:00-14:00\n",
    });
    expect(jsonLd.openingHours).toEqual([
      "Mo-Fr 09:00-18:00",
      "Sa 09:00-14:00",
    ]);
  });

  it("omits optional fields that are not set", () => {
    const jsonLd = buildLocalBusinessJsonLd({ businessName: "X" });
    expect(jsonLd.telephone).toBeUndefined();
    expect(jsonLd.url).toBeUndefined();
    expect(jsonLd.openingHours).toBeUndefined();
  });

  it("wraps output in a script tag with valid JSON", () => {
    const tag = jsonLdScriptTag(
      buildLocalBusinessJsonLd({ businessName: "X" }),
    );
    expect(tag).toContain('<script type="application/ld+json">');
    const json = tag
      .replace('<script type="application/ld+json">', "")
      .replace("</script>", "")
      .trim();
    expect(() => JSON.parse(json)).not.toThrow();
  });
});
