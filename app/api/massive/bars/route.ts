import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type MassiveAgg = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number;
};

function cleanSymbol(value: string | null): string {
  return (value || "SPY").trim().toUpperCase().replace(/[^A-Z0-9.]/g, "");
}

function timeframeParts(value: string | null): { multiplier: string; timespan: string; label: string } {
  switch (value) {
    case "1Min": return { multiplier: "1", timespan: "minute", label: "1Min" };
    case "5Min": return { multiplier: "5", timespan: "minute", label: "5Min" };
    case "15Min": return { multiplier: "15", timespan: "minute", label: "15Min" };
    case "30Min": return { multiplier: "30", timespan: "minute", label: "30Min" };
    case "1Hour": return { multiplier: "1", timespan: "hour", label: "1Hour" };
    default: return { multiplier: "15", timespan: "minute", label: "15Min" };
  }
}

function defaultStartForTimeframe(timeframe: string): string {
  const now = new Date();
  const days = timeframe === "1Min" ? 5 : timeframe === "5Min" ? 14 : timeframe === "15Min" ? 35 : 70;
  now.setDate(now.getDate() - days);
  return now.toISOString();
}

function defaultEnd(): string {
  return new Date().toISOString();
}

function isoToMassiveDate(value: string): string {
  const d = new Date(value);
  if (Number.isFinite(d.getTime())) return d.toISOString().slice(0, 10);
  return value.slice(0, 10);
}

function toCsv(bars: MassiveAgg[]): string {
  const header = "time,open,high,low,close,volume";
  const lines = bars.map((b) => [new Date(b.t).toISOString(), b.o, b.h, b.l, b.c, b.v ?? 0].join(","));
  return [header, ...lines].join("\n");
}

async function fetchJson(url: URL) {
  const res = await fetch(url.toString(), { cache: "no-store" });
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) return { ok: false, status: res.status, json };
  return { ok: true, status: res.status, json };
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.MASSIVE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing Massive key. Add MASSIVE_API_KEY to .env.local, then restart npm run dev." },
      { status: 400 }
    );
  }

  const params = req.nextUrl.searchParams;
  const symbol = cleanSymbol(params.get("symbol"));
  const tf = timeframeParts(params.get("timeframe"));
  const mode = params.get("mode") || "latest";
  const rawLimit = Number(params.get("limit") || (mode === "range" ? 50000 : 250));
  const limit = Math.min(Math.max(rawLimit, 1), 50000);
  const start = params.get("start") || defaultStartForTimeframe(tf.label);
  const end = params.get("end") || defaultEnd();
  const from = isoToMassiveDate(start);
  const to = isoToMassiveDate(end);

  const allBars: MassiveAgg[] = [];
  let pages = 0;
  let nextUrl: string | null = null;
  const maxPages = mode === "range" ? 60 : 1;

  do {
    const url = nextUrl
      ? new URL(nextUrl)
      : new URL(`https://api.massive.com/v2/aggs/ticker/${symbol}/range/${tf.multiplier}/${tf.timespan}/${from}/${to}`);
    url.searchParams.set("adjusted", "true");
    url.searchParams.set("sort", mode === "latest" ? "desc" : "asc");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("apiKey", apiKey);

    const result = await fetchJson(url);
    if (!result.ok) {
      return NextResponse.json({ error: "Massive request failed.", status: result.status, details: result.json }, { status: result.status });
    }

    const results = Array.isArray(result.json?.results) ? result.json.results : [];
    allBars.push(...results);
    nextUrl = result.json?.next_url || null;
    pages += 1;
  } while (nextUrl && pages < maxPages && allBars.length < limit * maxPages);

  const normalized = allBars
    .filter((b) => Number.isFinite(b?.t) && Number.isFinite(b.o) && Number.isFinite(b.h) && Number.isFinite(b.l) && Number.isFinite(b.c))
    .sort((a, b) => a.t - b.t);

  const sliced = mode === "latest" ? normalized.slice(-limit) : normalized;
  const latest = sliced[sliced.length - 1] || null;

  return NextResponse.json({
    symbol,
    timeframe: tf.label,
    provider: "Massive",
    start,
    end,
    from,
    to,
    count: sliced.length,
    totalFetched: allBars.length,
    pagesFetched: pages,
    truncated: Boolean(nextUrl),
    firstTime: sliced[0] ? new Date(sliced[0].t).toISOString() : null,
    latestTime: latest ? new Date(latest.t).toISOString() : null,
    bars: sliced.map((b) => ({
      time: new Date(b.t).toISOString(),
      open: b.o,
      high: b.h,
      low: b.l,
      close: b.c,
      volume: b.v ?? 0,
    })),
    csv: toCsv(sliced),
  });
}
