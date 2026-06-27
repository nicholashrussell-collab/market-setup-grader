export type SupabaseConfigStatus = {
  configured: boolean;
  hasUrl: boolean;
  hasServiceRoleKey: boolean;
  urlHost: string | null;
  message: string;
};

export function getSupabaseConfig() {
  const rawUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const url = rawUrl.replace(/\/$/, "");
  return { url, serviceRoleKey };
}

export function getSupabaseConfigStatus(): SupabaseConfigStatus {
  const { url, serviceRoleKey } = getSupabaseConfig();
  let urlHost: string | null = null;
  try {
    urlHost = url ? new URL(url).host : null;
  } catch {
    urlHost = null;
  }
  const hasUrl = Boolean(url && urlHost);
  const hasServiceRoleKey = Boolean(serviceRoleKey);
  const configured = hasUrl && hasServiceRoleKey;
  return {
    configured,
    hasUrl,
    hasServiceRoleKey,
    urlHost,
    message: configured
      ? "Supabase server credentials are configured."
      : "Missing Supabase environment variables. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.",
  };
}

export async function supabaseRest<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const status = getSupabaseConfigStatus();
  if (!status.configured) {
    throw new Error(status.message);
  }

  const cleanPath = path.replace(/^\/+/, "");
  const res = await fetch(`${url}/rest/v1/${cleanPath}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const detail = typeof data === "string" ? data : JSON.stringify(data);
    throw new Error(`Supabase request failed (${res.status}): ${detail}`);
  }

  return data as T;
}
