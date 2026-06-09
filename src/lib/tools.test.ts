import { describe, it, expect } from "vitest";
import {
  TOOLS,
  TOOL_KEYS,
  TOOL_ROUTES,
  getTool,
  getToolRoute,
  formatPrice,
} from "./tools";

describe("tool catalogue", () => {
  it("has unique keys", () => {
    expect(new Set(TOOL_KEYS).size).toBe(TOOL_KEYS.length);
  });

  it("every tool has a dashboard route", () => {
    for (const tool of TOOLS) {
      expect(TOOL_ROUTES[tool.key], `route for ${tool.key}`).toBeDefined();
    }
  });

  it("every tool declares a Stripe price env var", () => {
    for (const tool of TOOLS) {
      expect(tool.stripePriceEnv).toMatch(/^STRIPE_PRICE_/);
    }
  });

  it("getTool resolves a known key and rejects unknown", () => {
    expect(getTool("loyalty")?.name).toBeTruthy();
    expect(getTool("does-not-exist")).toBeUndefined();
  });

  it("getToolRoute falls back to /dashboard", () => {
    expect(getToolRoute("nope")).toBe("/dashboard");
    expect(getToolRoute("seo")).toBe("/dashboard/seo");
  });

  it("formatPrice renders EUR from cents", () => {
    expect(formatPrice(4900)).toContain("49");
    expect(formatPrice(4900)).toContain("€");
  });
});
