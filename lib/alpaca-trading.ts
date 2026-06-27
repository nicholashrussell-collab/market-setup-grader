export type AlpacaBrokerMode = "Supabase Simulation" | "Alpaca Paper" | "Alpaca Live" | "Real Locked";

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

function cleanUrl(value: string | undefined, fallback: string) {
  return (value || fallback).replace(/\/$/, "");
}

function boolEnv(name: string) {
  return ["true", "1", "yes", "on"].includes((process.env[name] || "").trim().toLowerCase());
}

export function isLiveTradingUnlocked() {
  return boolEnv("LIVE_TRADING_UNLOCKED") && process.env.LIVE_TRADING_CONFIRMATION === "I_UNDERSTAND_REAL_MONEY_RISK";
}

export function getAlpacaTradingCredentials(mode: AlpacaBrokerMode = "Alpaca Paper") {
  if (mode === "Alpaca Live") {
    return {
      mode,
      key: process.env.ALPACA_LIVE_API_KEY_ID || "",
      secret: process.env.ALPACA_LIVE_API_SECRET_KEY || "",
      baseUrl: cleanUrl(process.env.ALPACA_LIVE_BASE_URL, "https://api.alpaca.markets"),
      isPaper: false,
      isLive: true,
      liveUnlocked: isLiveTradingUnlocked(),
    };
  }

  return {
    mode: "Alpaca Paper" as AlpacaBrokerMode,
    key: process.env.ALPACA_PAPER_API_KEY_ID || process.env.APCA_API_KEY_ID || "",
    secret: process.env.ALPACA_PAPER_API_SECRET_KEY || process.env.APCA_API_SECRET_KEY || "",
    baseUrl: cleanUrl(process.env.ALPACA_PAPER_BASE_URL || process.env.APCA_API_BASE_URL, "https://paper-api.alpaca.markets"),
    isPaper: true,
    isLive: false,
    liveUnlocked: false,
  };
}

export function getAlpacaTradingBaseUrl(mode: AlpacaBrokerMode = "Alpaca Paper") {
  return getAlpacaTradingCredentials(mode).baseUrl;
}

export function getBrokerConfigStatus(mode: AlpacaBrokerMode = "Alpaca Paper") {
  if (mode === "Supabase Simulation") {
    return {
      configured: true,
      mode,
      baseUrl: "Supabase only",
      isPaper: false,
      isLive: false,
      liveUnlocked: false,
      realTradingLocked: true,
      message: "Supabase simulation mode. No external broker orders are submitted.",
    };
  }
  if (mode === "Real Locked") {
    return {
      configured: false,
      mode,
      baseUrl: "Locked",
      isPaper: false,
      isLive: false,
      liveUnlocked: false,
      realTradingLocked: true,
      message: "Real broker execution is locked.",
    };
  }

  const cfg = getAlpacaTradingCredentials(mode);
  const configured = Boolean(cfg.key && cfg.secret);
  const paperEndpointOk = cfg.isPaper && cfg.baseUrl.includes("paper-api.alpaca.markets");
  const liveEndpointLooksReal = cfg.isLive && !cfg.baseUrl.includes("paper-api.alpaca.markets");
  const liveAllowed = cfg.isLive && configured && cfg.liveUnlocked && liveEndpointLooksReal;
  const paperAllowed = cfg.isPaper && configured && paperEndpointOk;

  return {
    configured,
    mode,
    baseUrl: cfg.baseUrl,
    isPaper: cfg.isPaper,
    isLive: cfg.isLive,
    liveUnlocked: cfg.liveUnlocked,
    realTradingLocked: cfg.isLive ? !liveAllowed : true,
    canSubmitOrders: cfg.isPaper ? paperAllowed : liveAllowed,
    message: !configured
      ? `Missing ${cfg.isLive ? "Alpaca live" : "Alpaca paper"} API credentials.`
      : cfg.isPaper && !paperEndpointOk
        ? "Paper mode is selected but the Alpaca paper endpoint is not configured."
        : cfg.isPaper
          ? "Alpaca paper broker endpoint configured."
          : !cfg.liveUnlocked
            ? "Alpaca live credentials may be present, but live trading is locked until LIVE_TRADING_UNLOCKED and LIVE_TRADING_CONFIRMATION are set."
            : !liveEndpointLooksReal
              ? "Live mode is selected but the configured live endpoint still looks like paper."
              : "Alpaca live broker endpoint configured and explicitly unlocked.",
  };
}

async function alpacaTradingFetch<T>(mode: AlpacaBrokerMode, path: string, init: RequestInit = {}): Promise<T> {
  const cfg = getAlpacaTradingCredentials(mode);
  const status = getBrokerConfigStatus(mode);
  if (!cfg.key || !cfg.secret) throw new Error(status.message);
  if (mode === "Alpaca Paper" && !status.canSubmitOrders && init.method && init.method !== "GET") throw new Error(status.message);
  if (mode === "Alpaca Live" && !status.canSubmitOrders) throw new Error(status.message);
  if (mode === "Alpaca Paper" && !cfg.baseUrl.includes("paper-api.alpaca.markets")) throw new Error("Paper mode refused: Alpaca paper endpoint is required.");

  const res = await fetch(`${cfg.baseUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "APCA-API-KEY-ID": cfg.key,
      "APCA-API-SECRET-KEY": cfg.secret,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json: any;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`Alpaca ${mode} API failed (${res.status}): ${JSON.stringify(json).slice(0, 500)}`);
  return json as T;
}

export async function getAlpacaBrokerAccount(mode: AlpacaBrokerMode) {
  return alpacaTradingFetch<AlpacaAccount>(mode, "/v2/account", { method: "GET" });
}

export async function getAlpacaBrokerOrders(mode: AlpacaBrokerMode, status: "open" | "closed" | "all" = "open", limit = 50) {
  const params = new URLSearchParams({ status, limit: String(limit), nested: "true", direction: "desc" });
  return alpacaTradingFetch<AlpacaOrder[]>(mode, `/v2/orders?${params.toString()}`, { method: "GET" });
}

export async function getAlpacaBrokerPositions(mode: AlpacaBrokerMode) {
  return alpacaTradingFetch<AlpacaPosition[]>(mode, "/v2/positions", { method: "GET" });
}

export async function getAlpacaPaperAccount() {
  return getAlpacaBrokerAccount("Alpaca Paper");
}

export async function getAlpacaPaperOrders(status: "open" | "closed" | "all" = "open", limit = 50) {
  return getAlpacaBrokerOrders("Alpaca Paper", status, limit);
}

export async function getAlpacaPaperPositions() {
  return getAlpacaBrokerPositions("Alpaca Paper");
}

function decimals(value: number, places = 2) {
  return Number(value).toFixed(places);
}

export async function submitAlpacaBrokerBracketOrder(mode: AlpacaBrokerMode, input: {
  symbol: string;
  side: "buy" | "sell";
  qty: number;
  takeProfit: number;
  stopLoss: number;
  clientOrderId: string;
}) {
  if (mode !== "Alpaca Paper" && mode !== "Alpaca Live") throw new Error("Broker order skipped: selected execution mode does not submit broker orders.");
  const status = getBrokerConfigStatus(mode);
  if (!status.canSubmitOrders) throw new Error(status.message);
  const wholeQty = Math.floor(input.qty);
  if (!Number.isFinite(wholeQty) || wholeQty < 1) throw new Error("Broker order skipped: calculated quantity is below 1 whole share.");
  return alpacaTradingFetch<AlpacaOrder>(mode, "/v2/orders", {
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

export async function submitAlpacaPaperBracketOrder(input: {
  symbol: string;
  side: "buy" | "sell";
  qty: number;
  takeProfit: number;
  stopLoss: number;
  clientOrderId: string;
}) {
  return submitAlpacaBrokerBracketOrder("Alpaca Paper", input);
}
