export type AlpacaBrokerMode = "Supabase Simulation" | "Alpaca Paper" | "Real Locked";

export type AlpacaAccount = {
  id?: string;
  status?: string;
  currency?: string;
  cash?: string;
  portfolio_value?: string;
  buying_power?: string;
  equity?: string;
  trading_blocked?: boolean;
  transfers_blocked?: boolean;
  account_blocked?: boolean;
};

export type AlpacaOrder = {
  id: string;
  client_order_id?: string;
  symbol: string;
  side: "buy" | "sell";
  type?: string;
  qty?: string;
  filled_qty?: string;
  order_class?: string;
  status?: string;
  created_at?: string;
  submitted_at?: string;
  filled_at?: string | null;
  limit_price?: string | null;
  stop_price?: string | null;
  take_profit?: unknown;
  stop_loss?: unknown;
};

export type AlpacaPosition = {
  asset_id?: string;
  symbol: string;
  qty: string;
  side?: "long" | "short";
  market_value?: string;
  cost_basis?: string;
  unrealized_pl?: string;
  unrealized_plpc?: string;
  current_price?: string;
};

export function getAlpacaTradingBaseUrl() {
  return (process.env.APCA_API_BASE_URL || "https://paper-api.alpaca.markets").replace(/\/$/, "");
}

export function getBrokerConfigStatus() {
  const key = process.env.APCA_API_KEY_ID;
  const secret = process.env.APCA_API_SECRET_KEY;
  const baseUrl = getAlpacaTradingBaseUrl();
  const isPaper = baseUrl.includes("paper-api.alpaca.markets");
  const configured = Boolean(key && secret);
  return {
    configured,
    baseUrl,
    isPaper,
    realTradingLocked: !isPaper,
    message: !configured
      ? "Missing Alpaca API credentials."
      : isPaper
        ? "Alpaca paper broker endpoint configured."
        : "Alpaca base URL is not the paper endpoint. Real broker execution is locked by this app.",
  };
}

async function alpacaTradingFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const key = process.env.APCA_API_KEY_ID;
  const secret = process.env.APCA_API_SECRET_KEY;
  const status = getBrokerConfigStatus();
  if (!key || !secret) throw new Error("Missing Alpaca API credentials.");
  if (!status.isPaper) throw new Error("Broker orders are locked unless APCA_API_BASE_URL is https://paper-api.alpaca.markets.");

  const res = await fetch(`${status.baseUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "APCA-API-KEY-ID": key,
      "APCA-API-SECRET-KEY": secret,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json: any;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`Alpaca trading API failed (${res.status}): ${JSON.stringify(json).slice(0, 500)}`);
  return json as T;
}

export async function getAlpacaPaperAccount() {
  return alpacaTradingFetch<AlpacaAccount>("/v2/account");
}

export async function getAlpacaPaperOrders(status: "open" | "closed" | "all" = "open", limit = 50) {
  const params = new URLSearchParams({ status, limit: String(limit), nested: "true", direction: "desc" });
  return alpacaTradingFetch<AlpacaOrder[]>(`/v2/orders?${params.toString()}`);
}

export async function getAlpacaPaperPositions() {
  return alpacaTradingFetch<AlpacaPosition[]>("/v2/positions");
}

function decimals(value: number, places = 2) {
  return Number(value).toFixed(places);
}

export async function submitAlpacaPaperBracketOrder(input: {
  symbol: string;
  side: "buy" | "sell";
  qty: number;
  takeProfit: number;
  stopLoss: number;
  clientOrderId: string;
}) {
  const wholeQty = Math.floor(input.qty);
  if (!Number.isFinite(wholeQty) || wholeQty < 1) throw new Error("Alpaca paper order skipped: calculated quantity is below 1 whole share.");
  return alpacaTradingFetch<AlpacaOrder>("/v2/orders", {
    method: "POST",
    body: JSON.stringify({
      symbol: input.symbol,
      side: input.side,
      type: "market",
      qty: String(wholeQty),
      time_in_force: "day",
      order_class: "bracket",
      client_order_id: input.clientOrderId,
      take_profit: { limit_price: decimals(input.takeProfit, 2) },
      stop_loss: { stop_price: decimals(input.stopLoss, 2) },
    }),
  });
}
