import "server-only";
import { createHash } from "node:crypto";

/** Identifies the exact text and link the buyer was shown. */
export function termsVersion(text: string, url: string): string {
  return createHash("sha256").update(JSON.stringify([text, url])).digest("hex");
}
