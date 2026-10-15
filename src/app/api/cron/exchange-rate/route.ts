import { NextResponse } from "next/server";
import { recordExchangeRate } from "@/lib/exchangeRate";

/**
 * Daily EUR/PEN rate refresh (spec §5, §11). Triggered by the Vercel Cron
 * job configured in vercel.json (`0 8 * * *` — 08:00 UTC / ~03:00 Lima
 * time, well before any buyer would be checking out).
 *
 * Source: BCRP's (Banco Central de Reserva del Perú) own public statistics
 * API — confirmed directly against https://estadisticas.bcrp.gob.pe (not
 * guessed):
 *   - Series PD04648PD = "Tipo de cambio - TC Euro
 *     (S/ por €) - Venta" (daily EUR-to-PEN selling rate).
 *   - URL shape: .../series/api/{code}/json/{start}/{end}/{lang}, dates as
 *     YYYY-M-D for daily series.
 *   - Response has gaps ("n.d.") on weekends/holidays/not-yet-published
 *     days, so this queries the last 10 days and takes the most recent
 *     entry that actually has a value, rather than assuming "yesterday"
 *     is always populated.
 *
 * If the fetch fails or returns no usable value, the previous rate stays
 * in effect (see src/lib/exchangeRate.ts — "current" is just "latest row"
 * and this route simply doesn't insert a new one) — checkout must never
 * break because BCRP or this cron job had a bad day. Staleness is
 * surfaced in the admin panel (isExchangeRateStale), not hidden here.
 *
 * User-Agent quirk (found by actually running this against the live API,
 * not documented anywhere): BCRP's backend appears to call PHP's
 * `get_browser()` on the request, which throws a warning that gets
 * appended as raw HTML onto the JSON body when the User-Agent isn't
 * recognizable — which Node's default `fetch()` User-Agent isn't, but
 * curl's is. Without an explicit browser-like User-Agent below, the
 * "JSON" response is actually `<valid JSON><PHP warning HTML>` and fails
 * to parse. Reproduced directly against estadisticas.bcrp.gob.pe.
 */

const BCRP_SERIES_CODE = "PD04648PD";

function bcrpDateParam(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

interface BcrpResponse {
  periods?: Array<{ name: string; values: string[] }>;
}

async function fetchLatestBcrpRate(): Promise<number | null> {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 10);

  const url = `https://estadisticas.bcrp.gob.pe/estadisticas/series/api/${BCRP_SERIES_CODE}/json/${bcrpDateParam(start)}/${bcrpDateParam(end)}/ing`;

  const res = await fetch(url, {
    // BCRP has no documented rate limit, but this only runs once a day —
    // no caching needed, and a fresh fetch avoids ever serving stale data
    // from an intermediate cache.
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
    headers: {
      // See the User-Agent quirk note above — required for BCRP to return
      // clean JSON instead of JSON-plus-a-PHP-warning.
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  if (!res.ok) {
    throw new Error(`BCRP API returned ${res.status}`);
  }

  // Parsed from text (not res.json()) so a malformed/flaky response from
  // BCRP's side — this is a small government statistics API with no
  // uptime SLA, occasional hiccups are expected — logs the actual raw
  // body instead of an opaque "Unexpected token" error, and a stray
  // trailing newline/whitespace doesn't trip JSON.parse.
  const rawText = await res.text();
  let data: BcrpResponse;
  try {
    data = JSON.parse(rawText.trim()) as BcrpResponse;
  } catch (err) {
    console.error(
      "[cron/exchange-rate] BCRP returned non-JSON or malformed JSON. length=%d\nFULL BODY:\n%s",
      rawText.length,
      rawText
    );
    throw err;
  }

  const periods = data.periods ?? [];

  for (let i = periods.length - 1; i >= 0; i--) {
    const raw = periods[i]?.values?.[0];
    if (!raw || raw === "n.d.") continue;
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  return null;
}

export async function GET(request: Request) {
  // Vercel automatically sends this header (Bearer + your CRON_SECRET env
  // var) when it invokes a scheduled Cron Job — see vercel.json. Skips the
  // check entirely if CRON_SECRET isn't set (local dev), but production
  // should always have it configured.
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const rate = await fetchLatestBcrpRate();
    if (rate == null) {
      console.warn("[cron/exchange-rate] BCRP returned no usable value in the last 10 days — keeping previous rate.");
      return NextResponse.json({ ok: false, reason: "no-data" }, { status: 200 });
    }

    const result = await recordExchangeRate(rate, "bcrp_auto");
    if (!result.ok) {
      return NextResponse.json({ ok: false, reason: result.error }, { status: 200 });
    }

    return NextResponse.json({ ok: true, rate });
  } catch (err) {
    console.error("[cron/exchange-rate] failed — previous rate stays in effect", err);
    return NextResponse.json({ ok: false, reason: "fetch-failed" }, { status: 200 });
  }
}
