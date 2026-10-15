const FALLBACK_URL = "https://gsvnshhisqsqjyhugmldp.supabase.co";
const FALLBACK_PUBLISHABLE_KEY = "sb_publishable_vsgceztoofukgD8xvFyw3A_5FjPJhmz";

function getConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    FALLBACK_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase no esta configurado en este despliegue.");
  }
  return { url: url.replace(/\/$/, ""), key };
}

export async function supabaseRest(path, options = {}) {
  const { url, key } = getConfig();
  const headers = {
    apikey: key,
    accept: "application/json",
    ...options.headers
  };
  if (!key.startsWith("sb_")) headers.authorization = `Bearer ${key}`;
  if (options.body !== undefined) headers["content-type"] = "application/json";

  const response = await fetch(`${url}/rest/v1/${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store"
  });

  if (!response.ok) {
    const details = await response.text();
    const error = new Error("Supabase respondio con un error.");
    error.status = response.status;
    error.details = details;
    throw error;
  }

  if (response.status === 204) return null;
  return response.json();
}
