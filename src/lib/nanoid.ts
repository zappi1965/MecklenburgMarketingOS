import { customAlphabet } from "nanoid";

/**
 * URL-safe token generators. We avoid look-alike characters so tokens are
 * safe to print on QR codes and read aloud at a counter.
 */
const SAFE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";

const nano = customAlphabet(SAFE_ALPHABET, 21);

/** Long opaque token for QR codes and invitation links. */
export function generateToken(size = 21): string {
  return nano(size);
}

/** Short human-readable code (e.g. reward redemption at the counter). */
export function generateShortCode(size = 8): string {
  return customAlphabet(SAFE_ALPHABET, size)();
}
