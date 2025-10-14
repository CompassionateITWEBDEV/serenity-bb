import { cookies as nextCookies } from "next/headers";

type Service = "crm" | "meeting";

type Tokens = {
  access_token: string;
  refresh_token?: string;
  expires_at: number; // epoch ms
  api_domain?: string;
  token_type?: string;
  scope?: string;
};

const CLIENT_ID = process.env.ZOHO_CLIENT_ID!;
const CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET!;
const REDIRECT_URI = process.env.ZOHO_REDIRECT_URI!;
const REGION = (process.env.ZOHO_REGION || "com").trim(); // com, eu, in, com.au, jp, ca, sa

// Why: service-specific scopes kept tight
const SCOPES: Record<Service, string> = {
  crm: [
    "ZohoCRM.users.ALL",
    "ZohoCRM.modules.ALL", // narrow to exact modules you need
  ].join(","),
  meeting: [
    "ZohoMeeting.meeting.ALL",
    "ZohoMeeting.webinar.ALL",
  ].join(","),
};

export function getRegionBase() {
  // accounts base and token endpoints vary by region
  return {
    accounts: `https://accounts.zoho.${REGION}`,
  };
}

export function buildZohoAuthUrl(opts: { service: Service; state: string }) {
  const { accounts } = getRegionBase();
  const params = new URLSearchParams({
    scope: SCOPES[opts.service],
    client_id: CLIENT_ID,
    response_type: "code",
    access_type: "offline", // why: get refresh_token
    redirect_uri: REDIRECT_URI,
    state: opts.state,
    prompt: "consent", // why: ensure refresh_token on first connect
  });
  return `${accounts}/oauth/v2/auth?${params.toString()}`;
}

// --- Cookie helpers (HttpOnly) ---
type SessionCookie = Tokens & { state?: string };
const COOKIE_NAME = "zoho_session";

export function createStateCookie(state: string) {
  // keep state in the same cookie for simplicity
  const value = encodeURIComponent(
    JSON.stringify({ state })
  );
  // short lived
  return `${COOKIE_NAME}=${value}; Max-Age=600; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

export function parseCookieSession(cookieHeader: string): SessionCookie {
  const m = cookieHeader.match(
    new RegExp(`${COOKIE_NAME}=([^;]+)`)
  );
  if (!m) return {} as SessionCookie;
  try {
    return JSON.parse(decodeURIComponent(m[1]));
  } catch {
    return {} as SessionCookie;
  }
}

export function setSessionCookie(tokens: Tokens) {
  // NOTE: For production, encrypt the value at rest.
  const value = encodeURIComponent(JSON.stringify(tokens));
  // expiry aligned with access token; refresh_token stored if provided
  const maxAge = Math.max(60, Math.floor((tokens.expires_at - Date.now()) / 1000));
  return `${COOKIE_NAME}=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

// --- OAuth exchanges ---
export async function exchangeCodeForTokens(code: string): Promise<Tokens> {
  const { accounts } = getRegionBase();
  const data = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    code,
  });

  const res = await fetch(`${accounts}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: data.toString(),
    cache: "no-store",
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Token exchange failed: ${t}`);
  }
  const json = (await res.json()) as any;
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token, // may be undefined on subsequent consents
    token_type: json.token_type,
    scope: json.scope,
    api_domain: json.api_domain,
    // Zoho gives expires_in_sec
    expires_at: Date.now() + (Number(json.expires_in_sec || json.expires_in) * 1000 || 3600_000),
  };
}

export function isExpired(tokens: Tokens) {
  return Date.now() >= tokens.expires_at - 30_000; // 30s skew
}

export async function refreshTokens(refresh_token: string): Promise<Tokens> {
  const { accounts } = getRegionBase();
  const data = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token,
  });
  const res = await fetch(`${accounts}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: data.toString(),
    cache: "no-store",
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Refresh failed: ${t}`);
  }
  const json = (await res.json()) as any;
  return {
    access_token: json.access_token,
    refresh_token, // Zoho typically doesn't resend it on refresh
    token_type: json.token_type,
    scope: json.scope,
    api_domain: json.api_domain,
    expires_at: Date.now() + (Number(json.expires_in_sec || json.expires_in) * 1000 || 3600_000),
  };
}

export async function refreshTokensIfNeeded(sess: SessionCookie): Promise<{ tokens: Tokens; changed: boolean }> {
  if (!sess.access_token) throw new Error("No session");
  if (!isExpired(sess)) return { tokens: sess as Tokens, changed: false };
  if (!sess.refresh_token) throw new Error("No refresh token");
  const updated = await refreshTokens(sess.refresh_token);
  return { tokens: updated, changed: true };
}

// --- Example: server-side Zoho call (use in your API routes) ---
export async function callZohoCRM<T>(path: string, tokens: Tokens): Promise<T> {
  const domain = tokens.api_domain || `https://www.zohoapis.${REGION}`;
  const res = await fetch(`${domain}${path}`, {
    headers: {
      Authorization: `Zoho-oauthtoken ${tokens.access_token}`,
    },
    cache: "no-store",
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) throw new Error(`Zoho API error: ${res.status}`);
  return (await res.json()) as T;
}
