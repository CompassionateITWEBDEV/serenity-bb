export type ZoomTokens = {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  scope?: string;
  expires_at: number; // epoch ms
};
const CLIENT_ID = process.env.ZOOM_CLIENT_ID!;
const CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET!;
const REDIRECT_URI = process.env.ZOOM_REDIRECT_URI!;
const COOKIE_NAME = "zoom_session";

function authHeaderBasic() {
  const raw = `${CLIENT_ID}:${CLIENT_SECRET}`;
  return `Basic ${Buffer.from(raw).toString("base64")}`;
}
export function buildZoomAuthUrl(state: string) {
  const p = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    state,
  }).toString();
  return `https://zoom.us/oauth/authorize?${p}`;
}
export function createStateCookie(state: string) {
  const v = encodeURIComponent(JSON.stringify({ state }));
  return `${COOKIE_NAME}=${v}; Max-Age=600; Path=/; HttpOnly; Secure; SameSite=Lax`;
}
export function parseCookieSession(cookieHeader: string): Partial<ZoomTokens> & { state?: string } {
  const m = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!m) return {};
  try { return JSON.parse(decodeURIComponent(m[1])); } catch { return {}; }
}
export function setSessionCookie(tokens: ZoomTokens) {
  const v = encodeURIComponent(JSON.stringify(tokens));
  const maxAge = Math.max(60, Math.floor((tokens.expires_at - Date.now()) / 1000));
  return `${COOKIE_NAME}=${v}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}
export function isExpired(tokens: ZoomTokens) {
  return Date.now() >= tokens.expires_at - 30_000;
}
export async function exchangeCodeForTokens(code: string): Promise<ZoomTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code, redirect_uri: REDIRECT_URI,
  }).toString();
  const r = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: authHeaderBasic() },
    body, cache: "no-store",
  });
  if (!r.ok) throw new Error(await r.text());
  const j: any = await r.json();
  return {
    access_token: j.access_token, refresh_token: j.refresh_token, token_type: j.token_type, scope: j.scope,
    expires_at: Date.now() + (Number(j.expires_in) * 1000 || 3600_000),
  };
}
export async function refreshTokens(refresh_token: string): Promise<ZoomTokens> {
  const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token }).toString();
  const r = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: authHeaderBasic() },
    body, cache: "no-store",
  });
  if (!r.ok) throw new Error(await r.text());
  const j: any = await r.json();
  return {
    access_token: j.access_token, refresh_token: j.refresh_token || refresh_token, token_type: j.token_type, scope: j.scope,
    expires_at: Date.now() + (Number(j.expires_in) * 1000 || 3600_000),
  };
}
export async function refreshTokensIfNeeded(sess: Partial<ZoomTokens>) {
  if (!sess.access_token) throw new Error("no session");
  if (!isExpired(sess as ZoomTokens)) return { tokens: sess as ZoomTokens, changed: false };
  if (!sess.refresh_token) throw new Error("no refresh token");
  const updated = await refreshTokens(sess.refresh_token);
  return { tokens: updated, changed: true };
}
