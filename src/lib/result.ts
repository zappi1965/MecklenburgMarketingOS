/**
 * Typed Result for Server Actions. Every action returns either
 * `{ ok: true, data }` or `{ ok: false, error }` — never throws to the client.
 */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function err(
  error: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

import type { ZodError } from "zod";

/** Convert a Zod validation error into a typed failure result. */
export function fromZodError(error: ZodError): ActionResult<never> {
  const flat = error.flatten();
  return {
    ok: false,
    error: "Bitte überprüfe deine Eingaben.",
    fieldErrors: flat.fieldErrors as Record<string, string[]>,
  };
}
