import { describe, it, expect } from "vitest";
import { z } from "zod";
import { ok, err, fromZodError } from "./result";

describe("ActionResult helpers", () => {
  it("ok wraps data", () => {
    const r = ok({ id: "1" });
    expect(r).toEqual({ ok: true, data: { id: "1" } });
  });

  it("err carries the message and optional field errors", () => {
    const r = err("nope", { email: ["invalid"] });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe("nope");
      expect(r.fieldErrors).toEqual({ email: ["invalid"] });
    }
  });

  it("fromZodError flattens field errors", () => {
    const schema = z.object({ email: z.string().email() });
    const parsed = schema.safeParse({ email: "x" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const r = fromZodError(parsed.error);
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.fieldErrors?.email?.length).toBeGreaterThan(0);
      }
    }
  });
});
