"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReceiptUpload({ registrationId, euroAvailable, uploadsEnabled = true }: { registrationId: string; euroAvailable: boolean; uploadsEnabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  return <form className="space-y-4 rounded-md border border-border bg-white p-5" onSubmit={async e => {
    e.preventDefault();
    if (busy || !uploadsEnabled || !euroAvailable) return;
    const data = new FormData(e.currentTarget);
    data.set("registrationId", registrationId);
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/transfers/receipts", { method: "POST", body: data });
      const result = await response.json();
      setMessage(result.message ?? "Could not upload receipt. Please try again.");
      if (response.ok) router.refresh();
    } catch { setMessage("Could not upload receipt. Please try again."); }
    finally { setBusy(false); }
  }}>
    <h2 className="font-display text-lg font-semibold">Upload payment receipt / Adjuntar comprobante</h2>
    <input type="hidden" name="currency" value="EUR" />
    <p className="text-sm">Currency transferred / Moneda: EUR — Santander</p>
    <label className="block text-sm">Receipt / Comprobante (JPG, PNG; máximo 4 MB)
      <input className="mt-2 block w-full text-sm file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-3 file:font-semibold file:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink" type="file" name="receipt" accept="image/jpeg,image/png" required disabled={busy} />
    </label>
    <p className="text-sm text-ink/70">Uploading a receipt does not confirm payment. We will check the bank deposit before approving your tickets. / Revisaremos el ingreso antes de aprobar tus entradas.</p>
    {!uploadsEnabled && <p role="status" className="rounded border border-border bg-paper-sunk p-3 text-sm">Receipt sending is temporarily unavailable. Please contact the organizer before transferring. / El envío de comprobantes aún no está habilitado. Contacta al organizador antes de transferir.</p>}
    <button className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" disabled={busy || !uploadsEnabled || !euroAvailable}>{busy ? "Uploading…" : "Send for review / Enviar a revisión"}</button>
    {message && <p role="status" className="text-sm">{message}</p>}
  </form>;
}
