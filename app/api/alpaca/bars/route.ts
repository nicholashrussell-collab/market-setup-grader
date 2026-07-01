import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type AlpacaBar = {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number;
};

function cleanSymbol(value: string | null): string {
  return (value || "SPY").trim().toUpperCase().replace(/[^A-Z0-9.]/g, "");
}

function validTimeframe(value: string | null): string {
  const allowed = new Set(["1Min", "5Min", "15Min", "30Min", "1Hour"]);
  return allowed.has(value || "") ? (value as string) : "15Min";
}

function validAdjustment(value: string | null, mode: string): string {
  const allowed = new Set(["raw", "split", "dividend", "all"]);
  if (value && allowed.has(value)) return value;
  // Historical backtests should default to split-adjusted candles so split-heavy
  // names like NVDA/TSLA/AAPL do not make buy-and-hold or indicators look broken.
  // Latest/live-style fetches default to raw because they are only using recent candles.
  return mode === "range" ? "split" : "raw";
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

function toCsv(bars: AlpacaBar[]): string {
  const header = "time,open,high,low,close,volume";
  const lines = bars.map((b) => [b.t, b.o, b.h, b.l, b.c, b.v ?? 0].join(","));
  return [header, ...lines].join("\n");
}

async function fetchPage(url: URL, key: string, secret: string) {
  const res = await fetch(url.toString(), {
    cache: "no-store",
    headers: {
      "APCA-API-KEY-ID": key,
      "APCA-API-SECRET-KEY": secret,
    },
  });

  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    return { ok: false, status: res.status, json };
  }

  return { ok: true, status: res.status, json };
}

export async function GET(req: NextRequest) {
  const key = process.env.APCA_API_KEY_ID;
  const secret = process.env.APCA_API_SECRET_KEY;
  const feed = process.env.ALPACA_DATA_FEED || "iex";

  if (!key || !secret) {
    return NextResponse.json(
      { error: "Missing Alpaca keys. Add APCA_API_KEY_ID and APCA_API_SECRET_KEY to .env.local, then restart npm run dev." },
      { status: 400 }
    );
  }

  const params = req.nextUrl.searchParams;
  const symbol = cleanSymbol(params.get("symbol"));
  const timeframe = validTimeframe(params.get("timeframe"));
  const mode = params.get("mode") || "latest";
  const adjustment = validAdjustment(params.get("adjustment"), mode);
  const limit = Math.min(Number(params.get("limit") || (mode === "range" ? 10000 : 250)), 10000);
  const start = params.get("start") || defaultStartForTimeframe(timeframe);
  const end = params.get("end") || defaultEnd();
  const includeCsv = params.get("includeCsv") === "1" || params.get("includeCsv") === "true";

  const allBars: AlpacaBar[] = [];
  let pageToken: string | null = null;
  let pages = 0;
  const maxPages = mode === "range" ? 60 : 1;

  do {
    const url = new URL("https://data.alpaca.markets/v2/stocks/bars");
    url.searchParams.set("symbols", symbol);
    url.searchParams.set("timeframe", timeframe);
    url.searchParams.set("start", start);
    url.searchParams.set("end", end);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("adjustment", adjustment);
    url.searchParams.set("feed", feed);
    url.searchParams.set("sort", mode === "latest" ? "desc" : "asc");
    if (pageToken) url.searchParams.set("page_token", pageToken);

    const result = await fetchPage(url, key, secret);
    if (!result.ok) {
      return NextResponse.json(
        {
          error: "Alpaca request failed.",
          status: result.status,
          details: result.json,
        },
        { status: result.status }
      );
    }

    const bars = result.json?.bars?.[symbol] || [];
    allBars.push(...bars);
    pageToken = result.json?.next_page_token || null;
    pages += 1;
  } while (pageToken && pages < maxPages && allBars.length < limit * maxPages);

  const normalized = allBars
    .filter((b) => b?.t && Number.isFinite(b.o) && Number.isFinite(b.h) && Number.isFinite(b.l) && Number.isFinite(b.c))
    .sort((a, b) => new Date(a.t).getTime() - new Date(b.t).getTime());

  const sliced = mode === "latest" ? normalized.slice(-limit) : normalized;
  const latest = sliced[sliced.length - 1] || null;

  return NextResponse.json({
    symbol,
    timeframe,
    feed,
    adjustment,
    start,
    end,
    count: sliced.length,
    totalFetched: allBars.length,
    pagesFetched: pages,
    truncated: Boolean(pageToken),
    firstTime: sliced[0]?.t || null,
    latestTime: latest?.t || null,
    bars: sliced.map((b) => ({
      time: b.t,
      open: b.o,
      high: b.h,
      low: b.l,
      close: b.c,
      volume: b.v ?? 0,
    })),
    ...(includeCsv || mode === "latest" ? { csv: toCsv(sliced) } : {}),
  });
}
