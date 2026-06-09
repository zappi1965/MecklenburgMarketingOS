import QRCode from "qrcode";

/** Absolute scan URL for a QR token. */
export function scanUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/scan/${token}`;
}

/** Renders the scan URL for a token as an SVG string (crisp for print). */
export async function qrSvg(token: string): Promise<string> {
  return QRCode.toString(scanUrl(token), {
    type: "svg",
    margin: 1,
    width: 256,
  });
}

/** Renders the scan URL for a token as a PNG data URL (for <img> / download). */
export async function qrDataUrl(token: string): Promise<string> {
  return QRCode.toDataURL(scanUrl(token), {
    margin: 1,
    width: 512,
  });
}
