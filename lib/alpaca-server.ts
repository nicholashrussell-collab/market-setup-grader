import { Candle, Timeframe } from "@/lib/trading";

export type AlpacaAdjustment = "raw" | "split" | "dividend" | "all";

type AlpacaBar = { t: string; o: number; h: number; l: number; c: number; v?: number };

function defaultStartForTimeframe(timeframe: Timeframe): string {
  const now = new Date();
  const days = timeframe === "1Min" ? 5 : timeframe === "5Min" ? 14 : timeframe === "15Min" ? 35 : 70;
  now.setDate(now.getDate() - days);
  return now.toISOString();
}

export async function fetchAlpacaBars(input: {
  symbol: string;
  timeframe: Timeframe;
  limit?: number;
  mode?: "latest" | "range";
  start?: string;
  end?: string;
  adjustment?: AlpacaAdjustment;
}): Promise<Candle[]> {
  const key = process.env.APCA_API_KEY_ID;
  const secret = process.env.APCA_API_SECRET_KEY;
  const feed = process.env.ALPACA_DATA_FEED || "iex";
  if (!key || !secret) throw new Error("Missing Alpaca environment variables.");

  const symbol = input.symbol.trim().toUpperCase();
  const mode = input.mode || "latest";
  const limit = Math.min(input.limit || 250, 10000);
  const adjustment = input.adjustment || (mode === "range" ? "split" : "raw");
  const start = input.start || defaultStartForTimeframe(input.timeframe);
  const end = input.end || new Date().toISOString();
  const allBars: AlpacaBar[] = [];
  let pageToken: string | null = null;
  let pages = 0;
  const maxPages = mode === "range" ? 60 : 1;

  do {
    const url = new URL("https://data.alpaca.markets/v2/stocks/bars");
    url.searchParams.set("symbols", symbol);
    url.searchParams.set("timeframe", input.timeframe);
    url.searchParams.set("start", start);
    url.searchParams.set("end", end);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("adjustment", adjustment);
    url.searchParams.set("feed", feed);
    url.searchParams.set("sort", mode === "latest" ? "desc" : "asc");
    if (pageToken) url.searchParams.set("page_token", pageToken);

    const res = await fetch(url.toString(), {
      cache: "no-store",
      headers: {
        "APCA-API-KEY-ID": key,
        "APCA-API-SECRET-KEY": secret,
      },
    });
    const text = await res.text();
    let json: any;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }
    if (!res.ok) throw new Error(`Alpaca request failed for ${symbol} (${res.status}): ${JSON.stringify(json).slice(0, 300)}`);
    allBars.push(...(json?.bars?.[symbol] || []));
    pageToken = json?.next_page_token || null;
    pages += 1;
  } while (pageToken && pages < maxPages && allBars.length < limit * maxPages);

  return allBars
    .filter((b) => b?.t && Number.isFinite(b.o) && Number.isFinite(b.h) && Number.isFinite(b.l) && Number.isFinite(b.c))
    .sort((a, b) => new Date(a.t).getTime() - new Date(b.t).getTime())
    .slice(mode === "latest" ? -limit : 0)
    .map((b) => ({ time: b.t, open: b.o, high: b.h, low: b.l, close: b.c, volume: b.v ?? 0 }));
}
