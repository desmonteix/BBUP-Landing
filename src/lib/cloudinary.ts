import "server-only";
import { createHash, randomUUID } from "node:crypto";

function config() {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) throw new Error("Receipt storage is not configured.");
  return { cloud, key, secret };
}
export function receiptsConfigured() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}
function signature(params: Record<string, string>, secret: string) {
  return createHash("sha256").update(Object.keys(params).sort().map(k => `${k}=${params[k]}`).join("&") + secret).digest("hex");
}
export async function uploadReceipt(bytes: Uint8Array, format: "jpg" | "png") {
  const { cloud, key, secret } = config();
  const params = { public_id: `bbup-receipts/${randomUUID()}`, timestamp: String(Math.floor(Date.now() / 1000)), type: "authenticated" };
  const body = new FormData();
  for (const [k, v] of Object.entries(params)) body.set(k, v);
  body.set("api_key", key);
  body.set("signature", signature(params, secret));
  body.set("file", new Blob([new Uint8Array(bytes)], { type: format === "jpg" ? "image/jpeg" : "image/png" }), `receipt.${format}`);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/image/upload`, { method: "POST", body, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error("Receipt upload failed.");
  const asset = await response.json();
  if (asset.public_id !== params.public_id || asset.type !== "authenticated") throw new Error("Invalid receipt storage response.");
  return params.public_id;
}
export async function deleteReceipt(publicId: string) {
  const { cloud, key, secret } = config();
  const params = { public_id: publicId, timestamp: String(Math.floor(Date.now() / 1000)), type: "authenticated", invalidate: "true" };
  const body = new URLSearchParams({ ...params, api_key: key, signature: signature(params, secret) });
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/image/destroy`, { method: "POST", body, signal: AbortSignal.timeout(15000) });
  if (!response.ok) console.error("[receipts] could not clean up unused upload");
}
export function receiptDownloadUrl(publicId: string, format: string) {
  const { cloud, key, secret } = config();
  const params = { public_id: publicId, format, timestamp: String(Math.floor(Date.now() / 1000)), type: "authenticated", expires_at: String(Math.floor(Date.now() / 1000) + 60), attachment: "false" };
  return `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/image/download?${new URLSearchParams({ ...params, api_key: key, signature: signature(params, secret) })}`;
}
