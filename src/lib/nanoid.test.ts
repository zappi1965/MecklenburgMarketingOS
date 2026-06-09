import { describe, it, expect } from "vitest";
import { generateToken, generateShortCode } from "./nanoid";

const ALPHANUM = /^[0-9A-Za-z]+$/;

describe("token generators", () => {
  it("generateToken has the requested length and an alphanumeric alphabet", () => {
    const t = generateToken();
    expect(t).toHaveLength(21);
    expect(t).toMatch(ALPHANUM);
  });

  it("generateToken respects a custom size", () => {
    expect(generateToken(10)).toHaveLength(10);
  });

  it("generateShortCode defaults to length 8", () => {
    expect(generateShortCode()).toHaveLength(8);
    expect(generateShortCode(6)).toHaveLength(6);
  });

  it("produces unique values across many calls", () => {
    const set = new Set(Array.from({ length: 1000 }, () => generateToken()));
    expect(set.size).toBe(1000);
  });
});
